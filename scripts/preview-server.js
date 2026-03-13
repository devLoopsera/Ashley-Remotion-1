#!/usr/bin/env node
/**
 * Ashley End Screen Preview Server
 * Serves the upload UI and drives the templatize pipeline with SSE progress streaming.
 *
 * Usage: node scripts/preview-server.js
 *   (or: npm run preview)
 *
 * Then open http://localhost:3001 in your browser.
 * Run `npm run dev` in a separate terminal to start Remotion Studio on port 3000.
 */

const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");

require("dotenv").config();

const {templatize, applyOverrides, findFontFiles} = require("./templatize");
const {generateComponent} = require("./generate-component");
const {runQACheck, findSavedReference, fixHandTypedLogo} = require("./qa-check");
const {extractLastFrame, transcodeForBrowser, enforceLogoSplit} = require("./analyze-design");

const PORT = 3001;
const IS_VERCEL = Boolean(process.env.VERCEL);
const RUNTIME_TMP_ROOT = IS_VERCEL ? path.join("/tmp", "ashley-preview") : path.join(__dirname, "..");
const TMP_DIR = path.join(RUNTIME_TMP_ROOT, "tmp");
const UI_DIR = path.join(__dirname, "preview-ui");
const SCENES_DIR = path.join(__dirname, "..", "src", "scenes");
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const TEMPLATES_DIR = path.join(RUNTIME_TMP_ROOT, "templates");

const BRAND_LOGO_RE = /Ashley-Logo|HouseIcon/i;
const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const FONT_EXTS = new Set([".ttf", ".otf", ".woff", ".woff2"]);

// Ensure tmp & templates dirs exist
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, {recursive: true});
if (!fs.existsSync(TEMPLATES_DIR)) fs.mkdirSync(TEMPLATES_DIR, {recursive: true});

const app = express();

// Multer: store uploads in tmp/ with original extension preserved
const storage = multer.diskStorage({
  destination: TMP_DIR,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".bin";
    const tag = file.fieldname === "screenshot" ? "img" : "vid";
    cb(null, `upload-${tag}-${Date.now()}${ext}`);
  },
});

const uploadMiddleware = multer({storage}).fields([
  {name: "screenshot", maxCount: 1},
  {name: "video", maxCount: 1},
  {name: "logo", maxCount: 1},
  {name: "bgImage", maxCount: 1},
]);

// Separate multer for font uploads (stored directly under public/)
const fontStorage = multer.diskStorage({
  destination: TMP_DIR,
  filename: (req, file, cb) => {
    cb(null, `upload-font-${Date.now()}${path.extname(file.originalname).toLowerCase()}`);
  },
});
const fontUploadMiddleware = multer({storage: fontStorage}).single("font");

// Promise wrapper so we control all multer errors inside async handlers
function parseUpload(req, res) {
  return new Promise((resolve, reject) => {
    uploadMiddleware(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Serve static UI and public assets
app.use(express.static(UI_DIR));
app.use("/public", express.static(PUBLIC_DIR));
app.use("/tmp-preview", express.static(TMP_DIR));
app.use(express.json());

// ── Assets endpoint ────────────────────────────────────────────────────────
app.get("/api/assets", (_req, res) => {
  const logos = [];
  const bgImages = [];
  const fonts = new Set();

  // Scan flat files in public/
  for (const f of fs.readdirSync(PUBLIC_DIR)) {
    const ext = path.extname(f).toLowerCase();
    const fullPath = path.join(PUBLIC_DIR, f);
    if (!fs.statSync(fullPath).isFile()) continue;
    if (IMAGE_EXTS.has(ext)) {
      if (BRAND_LOGO_RE.test(f) || /^logo-/i.test(f)) logos.push(f);
      else if (/^bg-/i.test(f)) bgImages.push(f);
    }
  }

  // Detect font families from subdirectories
  for (const entry of fs.readdirSync(PUBLIC_DIR)) {
    const fullPath = path.join(PUBLIC_DIR, entry);
    if (!fs.statSync(fullPath).isDirectory()) continue;
    // Check if any font files exist (recursively one level)
    const hasFonts = fs.readdirSync(fullPath).some((f) => FONT_EXTS.has(path.extname(f).toLowerCase()));
    if (hasFonts) {
      // Normalize directory name to a font family name
      const name = entry.replace(/_[a-z0-9]+$/i, "").trim(); // strip Cloudinary hash suffix
      fonts.add(name);
    }
  }

  res.json({logos, bgImages, fonts: [...fonts].sort()});
});

// ── Font upload endpoint ───────────────────────────────────────────────────
app.post("/api/upload-font", (req, res) => {
  fontUploadMiddleware(req, res, (err) => {
    if (err) return res.status(400).json({error: err.message});

    const fontFile = req.file;
    if (!fontFile) return res.status(400).json({error: "No font file provided"});

    const ext = path.extname(fontFile.originalname).toLowerCase();
    if (!FONT_EXTS.has(ext)) {
      fs.unlinkSync(fontFile.path);
      return res.status(400).json({error: `Font must be .ttf, .otf, .woff, or .woff2. Got: "${ext}"`});
    }

    // Use provided name or derive from filename stem
    const stem = (req.body && req.body.name && req.body.name.trim())
      || path.basename(fontFile.originalname, ext).trim();
    const fontDir = path.join(PUBLIC_DIR, stem);

    try {
      if (!fs.existsSync(fontDir)) fs.mkdirSync(fontDir, {recursive: true});
      const dest = path.join(fontDir, fontFile.originalname);
      fs.renameSync(fontFile.path, dest);
      console.log(`Font uploaded: public/${stem}/${fontFile.originalname}`);
      res.json({fontName: stem, file: `${stem}/${fontFile.originalname}`});
    } catch (e) {
      try { fs.unlinkSync(fontFile.path); } catch {}
      res.status(500).json({error: e.message});
    }
  });
});

// ── Extract last frame for preview ────────────────────────────────────────
app.post("/api/extract-frame", async (req, res) => {
  try {
    await parseUpload(req, res);
  } catch (err) {
    return res.status(400).json({error: err.message});
  }

  const videoFile = req.files?.video?.[0] || null;
  if (!videoFile) return res.status(400).json({error: "No video file provided"});

  const framePath = extractLastFrame(videoFile.path);
  if (!framePath) {
    try { fs.unlinkSync(videoFile.path); } catch {}
    return res.status(500).json({error: "Could not extract frame — check that ffmpeg is installed"});
  }

  res.json({
    videoId: path.basename(videoFile.path),
    frameUrl: `/tmp-preview/${path.basename(framePath)}`,
  });
});

// ── Transcode video to H.264 MP4 for browser preview ─────────────────────
app.post("/api/transcode-preview", (req, res) => {
  const {videoId} = req.body || {};
  if (!videoId || videoId.includes("..") || videoId.includes("/") || videoId.includes("\\"))
    return res.status(400).json({error: "Invalid videoId"});
  const videoPath = path.join(TMP_DIR, videoId);
  if (!fs.existsSync(videoPath)) return res.status(404).json({error: "Video not found"});
  const outPath = transcodeForBrowser(videoPath);
  if (!outPath) return res.status(500).json({error: "Transcode failed"});
  res.json({previewUrl: `/tmp-preview/${path.basename(outPath)}`});
});

// ── Capture frame at specific timestamp ───────────────────────────────────
app.post("/api/capture-frame", (req, res) => {
  const {videoId, timeSec} = req.body || {};
  if (!videoId || videoId.includes("..") || videoId.includes("/") || videoId.includes("\\"))
    return res.status(400).json({error: "Invalid videoId"});
  if (typeof timeSec !== "number")
    return res.status(400).json({error: "timeSec required"});
  const videoPath = path.join(TMP_DIR, videoId);
  if (!fs.existsSync(videoPath)) return res.status(404).json({error: "Video not found"});
  const framePath = extractLastFrame(videoPath, timeSec);
  if (!framePath) return res.status(500).json({error: "Frame extraction failed"});
  res.json({
    frameUrl: `/tmp-preview/${path.basename(framePath)}`,
    frameId: path.basename(framePath),
  });
});

// ── Generate endpoint ──────────────────────────────────────────────────────
app.post("/api/generate", async (req, res) => {
  // Parse multipart upload first — errors become JSON 400s, not 500s
  try {
    await parseUpload(req, res);
  } catch (err) {
    console.error("Upload error:", err.message);
    return res.status(400).json({error: err.message});
  }

  const componentName = ((req.body && req.body.name) || "").trim();
  const screenshotFile = req.files?.screenshot?.[0] || null;
  const videoFile = req.files?.video?.[0] || null;
  const stagedVideoId = (req.body?.videoId || "").trim();
  const capturedFrameId = (req.body?.capturedFrameId || "").trim();
  const overrideDurationFrames = parseInt(req.body?.durationFrames) || null;
  const _inRaw  = req.body?.inPointSec;
  const _outRaw = req.body?.outPointSec;
  const clipStartSec = _inRaw  != null && _inRaw  !== '' ? parseFloat(_inRaw)  : null;
  const clipEndSec   = _outRaw != null && _outRaw !== '' ? parseFloat(_outRaw) : null;
  console.log(`[generate] clip markers received: inPointSec=${JSON.stringify(_inRaw)} outPointSec=${JSON.stringify(_outRaw)} → clipStartSec=${clipStartSec} clipEndSec=${clipEndSec}`);
  const logoFile = req.files?.logo?.[0] || null;
  const bgImageFile = req.files?.bgImage?.[0] || null;

  // Resolve actual video path — either a freshly uploaded file or an already-staged one
  const resolvedVideoPath = videoFile?.path
    || (stagedVideoId ? path.join(TMP_DIR, stagedVideoId) : null);

  // Resolve screenshot path — uploaded file takes priority, then captured frame
  const resolvedImagePath = screenshotFile?.path
    || (capturedFrameId && !capturedFrameId.includes("..") && !capturedFrameId.includes("/") && !capturedFrameId.includes("\\")
        ? path.join(TMP_DIR, capturedFrameId)
        : null);

  // Non-file overrides
  const logoChoices = [req.body?.logoChoice].flat().filter(Boolean).map(f => f.trim()); // array (one or many)
  const bgChoice    = (req.body?.bgChoice   || "").trim();   // existing filename in public/
  const bgColor     = (req.body?.bgColor    || "").trim();   // hex color
  const fontFamily  = (req.body?.fontFamily || "").trim();   // font family name
  const initialInstructions = (req.body?.initialInstructions || "").trim();

  // Resolve paths for overrides (first selected logo = primary)
  const logoPath    = logoFile          ? logoFile.path
                    : logoChoices[0]    ? path.join(PUBLIC_DIR, logoChoices[0])
                    : null;
  const bgImagePath = bgImageFile   ? bgImageFile.path
                    : bgChoice      ? path.join(PUBLIC_DIR, bgChoice)
                    : null;

  function cleanup() {
    if (screenshotFile) try { fs.unlinkSync(screenshotFile.path); } catch {}
    if (videoFile) try { fs.unlinkSync(videoFile.path); } catch {}
    if (stagedVideoId) try { fs.unlinkSync(path.join(TMP_DIR, stagedVideoId)); } catch {}
    if (capturedFrameId) try { fs.unlinkSync(path.join(TMP_DIR, capturedFrameId)); } catch {}
    if (logoFile) try { fs.unlinkSync(logoFile.path); } catch {}
    if (bgImageFile) try { fs.unlinkSync(bgImageFile.path); } catch {}
  }

  if (!resolvedVideoPath) {
    return res.status(400).json({error: "A video file is required"});
  }

  // Validate file types after upload (fileFilter causes stream-level errors that bypass try-catch)
  const IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp"];
  const VIDEO_EXTS = [".mp4", ".mov"];
  if (screenshotFile) {
    const ext = path.extname(screenshotFile.originalname).toLowerCase();
    if (!IMAGE_EXTS.includes(ext)) {
      cleanup();
      return res.status(400).json({error: `Screenshot must be PNG, JPG, or WebP. Got: "${ext}"`});
    }
  }
  if (videoFile) {
    const ext = path.extname(videoFile.originalname).toLowerCase();
    if (!VIDEO_EXTS.includes(ext)) {
      cleanup();
      return res.status(400).json({error: `Video must be MP4 or MOV. Got: "${ext}"`});
    }
  }

  if (!componentName || !/^[A-Z][A-Za-z0-9]*$/.test(componentName)) {
    cleanup();
    return res.status(400).json({
      error: `Component name must be PascalCase (e.g. "SpringSaleCard"), got: "${componentName}"`,
    });
  }

  // ── Set up SSE ────────────────────────────────────────────────
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });
  res.flushHeaders(); // send HTTP 200 + headers immediately before awaiting Gemini

  const send = (msg) => {
    try { res.write(`data: ${JSON.stringify(msg)}\n\n`); } catch {}
  };

  // Intercept console output to stream progress to browser
  const origLog = console.log;
  const origErr = console.error;
  const origStdoutWrite = process.stdout.write.bind(process.stdout);

  console.log = (...args) => {
    const text = args.join(" ");
    send({type: "log", text});
    origLog(...args);
  };
  console.error = (...args) => {
    origErr(...args); // don't stream errors to browser — let the catch handle it
  };
  process.stdout.write = (chunk, ...rest) => {
    send({type: "log", text: String(chunk)});
    return origStdoutWrite(chunk, ...rest);
  };

  try {
    await templatize({
      imagePath: resolvedImagePath || null,
      videoPath: resolvedVideoPath || null,
      componentName,
      skipWrite: false,
      logoPath: logoPath || null,
      bgImagePath: bgImagePath || null,
      bgColor: bgColor || null,
      fontFamily: fontFamily || null,
      initialInstructions: initialInstructions || null,
      overrideDurationFrames: overrideDurationFrames || null,
      clipStartSec: clipStartSec || null,
      clipEndSec: clipEndSec || null,
    });
    send({type: "success", componentName});
  } catch (err) {
    send({type: "error", message: err.message});
  } finally {
    console.log = origLog;
    console.error = origErr;
    process.stdout.write = origStdoutWrite;
    cleanup();
    res.end();
  }
});

// ── Regenerate endpoint (re-run code gen from saved spec, with optional overrides) ──
app.post("/api/regenerate", async (req, res) => {
  const body = req.body || {};
  const {componentName} = body;

  if (!componentName || !/^[A-Z][A-Za-z0-9]*$/.test(componentName)) {
    return res.status(400).json({error: "Missing or invalid componentName"});
  }

  const specFile = path.join(SCENES_DIR, `.spec-${componentName}.json`);
  if (!fs.existsSync(specFile)) {
    return res.status(404).json({error: `Spec not found for "${componentName}". Generate it first.`});
  }

  // Optional overrides from the request body
  const regenInstructions = (body.instructions || "").trim();
  const logoChoices = [body.logoChoice].flat().filter(Boolean).map(f => f.trim());
  const bgChoice    = (body.bgChoice  || "").trim();
  const bgColor     = (body.bgColor   || "").trim();
  const fontFamily  = (body.fontFamily || "").trim();

  // Load a fresh copy of the spec so overrides don't mutate the saved file
  const spec = JSON.parse(fs.readFileSync(specFile, "utf8"));
  enforceLogoSplit(spec); // Sanitize any ASHLEY text elements → wordmark images
  const outputFile = path.join(SCENES_DIR, `Generated_${componentName}.tsx`);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });
  res.flushHeaders();

  const send = (msg) => {
    try { res.write(`data: ${JSON.stringify(msg)}\n\n`); } catch {}
  };

  const origLog = console.log;
  const origErr = console.error;
  console.log = (...args) => { send({type: "log", text: args.join(" ")}); origLog(...args); };
  console.error = (...args) => { origErr(...args); };

  try {
    send({type: "log", text: "── Regenerating component from saved spec ────────────────"});

    // Apply any asset overrides (mutates spec in-place, copies files if needed)
    const logoPath    = logoChoices[0] ? path.join(PUBLIC_DIR, logoChoices[0]) : null;
    const bgImagePath = bgChoice       ? path.join(PUBLIC_DIR, bgChoice)       : null;

    const {customLogoFile, customFontFamily, customFontFiles} = applyOverrides(spec, {
      componentName,
      logoPath,
      bgImagePath,
      bgColor: bgColor || null,
      fontFamily: fontFamily || null,
    });

    // Find saved reference image for QA
    const {screenshotPath: qaScreenshot, videoPath: qaVideo} = findSavedReference(componentName, SCENES_DIR);
    const lastFrame = (spec.durationFrames || 150) - 1;
    const MAX_QA_ATTEMPTS = 2;
    let qaResult = {pass: true, score: 100, issues: [], feedback: ""};

    for (let attempt = 1; attempt <= MAX_QA_ATTEMPTS; attempt++) {
      if (attempt > 1) {
        send({type: "log", text: `── QA Attempt ${attempt}: Regenerating with feedback ──────────`});
      }
      const existingCode = attempt === 1 ? null : fs.readFileSync(outputFile, "utf8");
      const rawCode = await generateComponent(
        spec,
        componentName,
        attempt === 1
          ? {customLogoFile, customFontFamily, customFontFiles, initialInstructions: regenInstructions || null}
          : {feedback: qaResult.feedback, existingCode, customLogoFile, customFontFamily, customFontFiles}
      );
      const {code: sanitizedCode, changed: logoFixed} = fixHandTypedLogo(rawCode);
      if (logoFixed) send({type: "log", text: "   \u2713 Auto-fixed ASHLEY text \u2192 wordmark image"});
      fs.writeFileSync(outputFile, sanitizedCode);
      if (attempt === 1) send({type: "log", text: "✓ Component regenerated"});

      qaResult = await runQACheck({
        compositionId: componentName,
        lastFrame,
        screenshotPath: qaScreenshot,
        videoPath: qaVideo,
        onLog: console.log,
      });

      if (qaResult.pass) break;
      if (attempt === MAX_QA_ATTEMPTS) {
        send({type: "log", text: "   ⚠ QA did not pass — keeping last version"});
      }
    }

    send({type: "success", componentName});
  } catch (err) {
    send({type: "error", message: err.message});
  } finally {
    console.log = origLog;
    console.error = origErr;
    res.end();
  }
});

// ── Feedback / regenerate endpoint ────────────────────────────────────────
app.post("/api/feedback", async (req, res) => {
  const {componentName, feedback, history} = req.body || {};

  if (!componentName || !/^[A-Z][A-Za-z0-9]*$/.test(componentName)) {
    return res.status(400).json({error: "Missing or invalid componentName"});
  }
  if (!feedback || !feedback.trim()) {
    return res.status(400).json({error: "Feedback text is required"});
  }

  const outputFile = path.join(SCENES_DIR, `Generated_${componentName}.tsx`);
  if (!fs.existsSync(outputFile)) {
    return res.status(404).json({error: `Component file not found: Generated_${componentName}.tsx`});
  }

  const existingCode = fs.readFileSync(outputFile, "utf8");

  // ── SSE ──────────────────────────────────────────────────────
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });
  res.flushHeaders();

  const send = (msg) => {
    try { res.write(`data: ${JSON.stringify(msg)}\n\n`); } catch {}
  };

  const origLog = console.log;
  const origErr = console.error;
  console.log = (...args) => { send({type: "log", text: args.join(" ")}); origLog(...args); };
  console.error = (...args) => { origErr(...args); };

  try {
    const pastFeedback = Array.isArray(history) ? history.filter(h => typeof h === "string") : [];
    const rawCode = await generateComponent(null, componentName, {feedback: feedback.trim(), existingCode, history: pastFeedback});
    const {code: fixedCode, changed: logoFixed} = fixHandTypedLogo(rawCode);
    if (logoFixed) console.log("   \u2713 Auto-fixed ASHLEY text \u2192 wordmark image");
    const changed = fixedCode !== existingCode;
    if (changed) {
      console.log(`✓ Code updated (${fixedCode.length - existingCode.length >= 0 ? "+" : ""}${fixedCode.length - existingCode.length} chars)`);
      fs.writeFileSync(outputFile, fixedCode);
      send({type: "success", componentName});
    } else {
      console.log(`⚠ No changes detected — Gemini may have ignored the feedback`);
      send({type: "warning", message: "No changes were made — try rephrasing your feedback", componentName});
    }
  } catch (err) {
    send({type: "error", message: err.message});
  } finally {
    console.log = origLog;
    console.error = origErr;
    res.end();
  }
});

// ── Extract customizable fields from a spec ────────────────────────────────
function extractCustomizableFields(spec) {
  const fields = [];

  // Background
  if (spec.background) {
    fields.push({
      id: "background",
      category: "design",
      label: "Background",
      type: spec.background.type === "solid" ? "color" : "image",
      defaultValue: spec.background.type === "solid" ? spec.background.color : spec.background.imageFile,
    });
  }

  // Walk elements for props, logos, and text colors
  function walk(elements) {
    for (const el of elements || []) {
      // Text props (tagline, disclaimer, etc.)
      if (el.isTextProp && el.propName) {
        fields.push({
          id: `prop:${el.propName}`,
          category: "content",
          label: el.propName.charAt(0).toUpperCase() + el.propName.slice(1),
          type: "text",
          defaultValue: (spec.textContent && spec.textContent[el.propName]) || el.content || "",
        });
      }

      // Locations array prop
      if (el.isArrayProp && el.propName === "locations") {
        fields.push({
          id: "prop:locations",
          category: "content",
          label: "Store Locations",
          type: "locations",
          defaultValue: (spec.textContent && spec.textContent.locations) || [{city: "City Name", address: "Street Address"}],
        });
      }

      // Logo images
      if (el.type === "image" && el.asset && /Ashley-Logo|HouseIcon|^logo-/i.test(el.asset)) {
        if (!fields.some(f => f.id === "logo")) {
          fields.push({
            id: "logo",
            category: "design",
            label: "Logo",
            type: "image",
            defaultValue: el.asset,
          });
        }
      }

      // Text color
      if (el.style && el.style.color && el.type === "text" && !el.isTextProp) {
        const colorId = `color:${el.id}`;
        if (!fields.some(f => f.id === colorId)) {
          fields.push({
            id: colorId,
            category: "design",
            label: `${el.id} color`,
            type: "color",
            defaultValue: el.style.color,
          });
        }
      }

      // Font family
      if (el.style && el.style.fontFamily) {
        if (!fields.some(f => f.id === "fontFamily")) {
          fields.push({
            id: "fontFamily",
            category: "design",
            label: "Font Family",
            type: "font",
            defaultValue: el.style.fontFamily,
          });
        }
      }

      if (el.children) walk(el.children);
      if (el.itemTemplate && el.itemTemplate.children) walk(el.itemTemplate.children);
    }
  }

  walk(spec.elements);
  return fields;
}

// ── Get customizable fields for a component ──────────────────────────────
app.get("/api/template-fields/:componentName", (req, res) => {
  const {componentName} = req.params;
  if (!componentName || !/^[A-Z][A-Za-z0-9]*$/.test(componentName)) {
    return res.status(400).json({error: "Invalid component name"});
  }

  const specFile = path.join(SCENES_DIR, `.spec-${componentName}.json`);
  if (!fs.existsSync(specFile)) {
    return res.status(404).json({error: `Spec not found for "${componentName}"`});
  }

  const spec = JSON.parse(fs.readFileSync(specFile, "utf8"));
  const fields = extractCustomizableFields(spec);
  res.json({fields});
});

// ── Save as template ────────────────────────────────────────────────────
app.post("/api/save-template", (req, res) => {
  const {componentName, templateName, customizableFields} = req.body || {};

  if (!componentName || !/^[A-Z][A-Za-z0-9]*$/.test(componentName)) {
    return res.status(400).json({error: "Invalid component name"});
  }

  const safeName = (templateName || componentName).replace(/[^A-Za-z0-9_-]/g, "_");

  const specFile = path.join(SCENES_DIR, `.spec-${componentName}.json`);
  const componentFile = path.join(SCENES_DIR, `Generated_${componentName}.tsx`);

  if (!fs.existsSync(specFile)) {
    return res.status(404).json({error: `Spec not found for "${componentName}"`});
  }
  if (!fs.existsSync(componentFile)) {
    return res.status(404).json({error: `Component not found for "${componentName}"`});
  }

  const spec = JSON.parse(fs.readFileSync(specFile, "utf8"));
  const allFields = extractCustomizableFields(spec);

  // If customizableFields provided, filter; otherwise all are customizable
  const enabledFieldIds = Array.isArray(customizableFields)
    ? new Set(customizableFields)
    : new Set(allFields.map(f => f.id));

  const templateFields = allFields.map(f => ({
    ...f,
    customizable: enabledFieldIds.has(f.id),
  }));

  // Create template directory
  const templateDir = path.join(TEMPLATES_DIR, safeName);
  if (!fs.existsSync(templateDir)) fs.mkdirSync(templateDir, {recursive: true});

  // Copy component and spec
  fs.copyFileSync(componentFile, path.join(templateDir, "component.tsx"));
  fs.copyFileSync(specFile, path.join(templateDir, "spec.json"));

  // Copy reference screenshot if it exists
  for (const ext of [".png", ".jpg", ".jpeg", ".webp"]) {
    const refFile = path.join(SCENES_DIR, `.ref-${componentName}${ext}`);
    if (fs.existsSync(refFile)) {
      fs.copyFileSync(refFile, path.join(templateDir, `reference${ext}`));
      break;
    }
  }

  // Write template manifest
  const manifest = {
    name: safeName,
    sourceComponent: componentName,
    fields: templateFields,
    spec,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(templateDir, "template.json"), JSON.stringify(manifest, null, 2));

  console.log(`Template saved: templates/${safeName}/`);
  res.json({success: true, templateName: safeName, templateDir: `templates/${safeName}`});
});

// ── List templates ──────────────────────────────────────────────────────
app.get("/api/templates", (_req, res) => {
  if (!fs.existsSync(TEMPLATES_DIR)) return res.json({templates: []});

  const templates = [];
  for (const entry of fs.readdirSync(TEMPLATES_DIR)) {
    const manifestPath = path.join(TEMPLATES_DIR, entry, "template.json");
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      const customizableCount = manifest.fields.filter(f => f.customizable).length;
      templates.push({
        name: manifest.name,
        sourceComponent: manifest.sourceComponent,
        fieldCount: manifest.fields.length,
        customizableCount,
        createdAt: manifest.createdAt,
      });
    } catch {}
  }

  templates.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  res.json({templates});
});

// ── List generated scenes ────────────────────────────────────────────────
app.get("/api/scenes", (_req, res) => {
  const scenes = [];
  for (const f of fs.readdirSync(SCENES_DIR)) {
    const match = f.match(/^Generated_(.+)\.tsx$/);
    if (!match) continue;
    const componentName = match[1];
    const fullPath = path.join(SCENES_DIR, f);
    const stat = fs.statSync(fullPath);
    const hasSpec = fs.existsSync(path.join(SCENES_DIR, `.spec-${componentName}.json`));
    scenes.push({filename: f, componentName, hasSpec, modifiedAt: stat.mtimeMs});
  }
  scenes.sort((a, b) => b.modifiedAt - a.modifiedAt);
  res.json({scenes});
});

// ── Catch-all error handler (logs to terminal, never sends raw 500 HTML) ──
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err.message);
  if (!res.headersSent) {
    res.status(500).json({error: err.message});
  }
});

// ── Startup: sanitize all saved specs (fix ASHLEY text → wordmark image) ───
const specFiles = fs.readdirSync(SCENES_DIR).filter(f => f.startsWith(".spec-") && f.endsWith(".json"));
for (const f of specFiles) {
  const specPath = path.join(SCENES_DIR, f);
  try {
    const raw = fs.readFileSync(specPath, "utf8");
    const spec = JSON.parse(raw);
    enforceLogoSplit(spec);
    const patched = JSON.stringify(spec, null, 2);
    if (patched !== raw) {
      fs.writeFileSync(specPath, patched);
      console.log(`  ✓ Patched spec: ${f}`);
    }
  } catch {}
}

// ── Component code viewer ───────────────────────────────────────────────────
app.get("/api/component-code/:name", (req, res) => {
  const name = req.params.name;
  if (!/^[A-Za-z0-9_]+$/.test(name)) return res.status(400).json({error: "Invalid name"});
  const file = path.join(SCENES_DIR, `Generated_${name}.tsx`);
  if (!fs.existsSync(file)) return res.status(404).json({error: "Not found"});
  res.type("text/plain").send(fs.readFileSync(file, "utf8"));
});

// ── Start / Export ─────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  Ashley Preview Server  →  http://localhost:${PORT}`);
    console.log(`  Remotion Studio        →  http://localhost:3000  (run: npm run dev)\n`);
  });
} else {
  module.exports = app;
}
