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

const {templatize, applyOverrides, findFontFiles, registerInRoot} = require("./templatize");
const {execSync, exec} = require("child_process");
const {generateComponent} = require("./generate-component");
const {runQACheck, findSavedReference, fixHandTypedLogo} = require("./qa-check");
const {extractLastFrame, transcodeForBrowser, enforceLogoSplit, clipToEndScreen} = require("./analyze-design");

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
const VIDEO_EXTS = new Set([".mp4", ".mov", ".webm"]);
const FONT_EXTS = new Set([".ttf", ".otf", ".woff", ".woff2"]);

// Ensure tmp & templates dirs exist
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, {recursive: true});
if (!fs.existsSync(TEMPLATES_DIR)) fs.mkdirSync(TEMPLATES_DIR, {recursive: true});

// On startup: remove transient tmp files left over from previous sessions.
// We keep video-ref-*.mp4 because they may be waiting for a template save.
try {
  for (const f of fs.readdirSync(TMP_DIR)) {
    if (/^(upload-|last-frame-|browser-)/.test(f)) {
      try { fs.unlinkSync(path.join(TMP_DIR, f)); } catch {}
    }
  }
} catch {}

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
app.use(express.static(UI_DIR, {
  setHeaders: (res) => res.set('Cache-Control', 'no-cache, no-store')
}));
app.use("/public", express.static(PUBLIC_DIR));
app.use("/tmp-preview", express.static(TMP_DIR));
app.use("/templates", express.static(TEMPLATES_DIR));
app.use("/out", express.static(path.join(__dirname, "..", "out")));
app.use(express.json());

// ── Assets endpoint ────────────────────────────────────────────────────────
app.get("/api/assets", (_req, res) => {
  const logos = [];
  const bgImages = [];
  const bgVideos = [];
  const fonts = new Set();

  // Scan flat files in public/
  for (const f of fs.readdirSync(PUBLIC_DIR)) {
    const ext = path.extname(f).toLowerCase();
    const fullPath = path.join(PUBLIC_DIR, f);
    if (!fs.statSync(fullPath).isFile()) continue;
    if (IMAGE_EXTS.has(ext)) {
      if (BRAND_LOGO_RE.test(f) || /^logo-/i.test(f)) logos.push(f);
      else if (/^bg-/i.test(f)) bgImages.push(f);
    } else if (VIDEO_EXTS.has(ext) && /^bg-/i.test(f)) {
      bgVideos.push(f);
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

  res.json({logos, bgImages, bgVideos, fonts: [...fonts].sort()});
});

// ── Background file upload endpoint ───────────────────────────────────────
const bgUploadMiddleware = multer({
  storage: multer.diskStorage({
    destination: PUBLIC_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".png";
      cb(null, `bg-${Date.now()}${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (IMAGE_EXTS.has(ext) || VIDEO_EXTS.has(ext)) cb(null, true);
    else cb(new Error("Only image (.png/.jpg/.webp) and video (.mp4/.mov/.webm) files are allowed"));
  },
}).single("file");

app.post("/api/upload-bg", (req, res) => {
  bgUploadMiddleware(req, res, (err) => {
    if (err) return res.status(400).json({error: err.message});
    if (!req.file) return res.status(400).json({error: "No file uploaded"});
    res.json({filename: req.file.filename});
  });
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

  // Save a browser-compatible H.264 MP4 reference for template preview.
  // Prefer the already-transcoded browser-*.mp4 if the client sent its ID;
  // otherwise transcode the raw upload now (adds ~5s but only done once).
  const previewVideoId = (req.body?.previewVideoId || "").trim();
  const videoRefPath = path.join(TMP_DIR, `video-ref-${componentName}.mp4`);
  // Remove stale ref from a previous generate for this component name
  if (fs.existsSync(videoRefPath)) { try { fs.unlinkSync(videoRefPath); } catch {} }
  if (previewVideoId && !previewVideoId.includes("..") && !previewVideoId.includes("/") && !previewVideoId.includes("\\")) {
    const previewPath = path.join(TMP_DIR, previewVideoId);
    if (fs.existsSync(previewPath)) {
      try {
        fs.copyFileSync(previewPath, videoRefPath);
        console.log(`[generate] Saved browser-compatible video ref from ${previewVideoId}`);
      } catch (e) {
        console.log(`[generate] Failed to copy preview video: ${e.message}`);
      }
    } else {
      console.log(`[generate] previewVideoId not found in tmp: ${previewVideoId}`);
    }
  } else if (resolvedVideoPath && fs.existsSync(resolvedVideoPath)) {
    console.log(`[generate] No previewVideoId — transcoding original for video ref…`);
    try {
      const transcoded = transcodeForBrowser(resolvedVideoPath);
      if (transcoded) {
        fs.renameSync(transcoded, videoRefPath);
        console.log(`[generate] Transcoded and saved video ref: video-ref-${componentName}.mp4`);
      } else {
        console.log(`[generate] Transcode returned null — no video ref saved`);
      }
    } catch (e) {
      console.log(`[generate] Failed to transcode video: ${e.message}`);
    }
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
      skipWrite: IS_VERCEL,
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
    // Clean up the transcoded browser preview and frame files from this session
    if (previewVideoId && !previewVideoId.includes("..") && !previewVideoId.includes("/") && !previewVideoId.includes("\\")) {
      try { fs.unlinkSync(path.join(TMP_DIR, previewVideoId)); } catch {}
    }
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
      if (logoFixed) send({type: "log", text: "   \u2713 Auto-fixed logo \u2192 SVG components"});
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
    if (logoFixed) console.log("   \u2713 Auto-fixed logo \u2192 SVG components");
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

// ── Generate template metadata on demand ─────────────────────────────────
app.get("/api/template-metadata/:componentName", async (req, res) => {
  const {componentName} = req.params;
  const specFile = path.join(SCENES_DIR, `.spec-${componentName}.json`);
  if (!fs.existsSync(specFile)) {
    return res.status(404).json({error: `Spec not found for "${componentName}"`});
  }
  const spec = JSON.parse(fs.readFileSync(specFile, "utf8"));
  const meta = await generateTemplateMetadata(spec);
  if (meta) {
    res.json(meta);
  } else {
    res.json({title: componentName, description: ""});
  }
});

// ── Template categories ──────────────────────────────────────────────────
const TEMPLATE_CATEGORIES = ["promo", "tutorial", "vlog", "brand", "event", "seasonal", "other"];

// ── Auto-generate template title & description via Gemini ───────────────
async function generateTemplateMetadata(spec) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const {GoogleGenerativeAI} = require("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({model: "gemini-2.0-flash"});
    const prompt = `Given this design spec for an Ashley Furniture end card, generate a short human-readable title and description.

Spec summary:
- Background: ${spec.background?.type === "image" ? "image" : spec.background?.color || "unknown"}
- Elements: ${(spec.elements || []).map(e => e.id).join(", ")}
- Animations: ${(spec.animations || []).map(a => `${a.targets.join("+")}:${a.type}`).join(", ") || "none"}
- Text content: ${JSON.stringify(spec.textContent || {})}
- Dimensions: ${spec.width}x${spec.height}

Rules:
- Title: 3-8 words, descriptive of the visual style/layout (e.g. "Dark Bedroom End Card with Slide-Up Locations", "Orange Logo Reveal on White Background"). Do NOT include "Ashley" in the title.
- Description: 1-2 sentences describing the template's visual style, animation, and use case.
- Return ONLY a JSON object: {"title": "...", "description": "..."}
- No markdown fences, no explanation.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    return JSON.parse(text);
  } catch (e) {
    console.warn("Auto-generate template metadata failed:", e.message);
    return null;
  }
}

// ── Save as template ────────────────────────────────────────────────────
app.post("/api/save-template", async (req, res) => {
  const {componentName, templateName, customizableFields, displayName, category, description} = req.body || {};

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

  // Split into variables (prop:* fields) and designFields (everything else)
  const variables = [];
  const designFields = [];
  for (const f of allFields) {
    const enriched = {...f, customizable: enabledFieldIds.has(f.id)};
    if (f.id.startsWith("prop:")) {
      variables.push({
        ...enriched,
        name: f.id.replace("prop:", ""),
        placeholder: `e.g. ${typeof f.defaultValue === "string" ? f.defaultValue : JSON.stringify(f.defaultValue)}`.slice(0, 80),
        required: f.id === "prop:locations" || f.id === "prop:tagline",
      });
    } else {
      designFields.push(enriched);
    }
  }

  // Create template directory
  const templateDir = path.join(TEMPLATES_DIR, safeName);
  if (!fs.existsSync(templateDir)) fs.mkdirSync(templateDir, {recursive: true});

  // Copy component and spec
  fs.copyFileSync(componentFile, path.join(templateDir, "component.tsx"));
  fs.copyFileSync(specFile, path.join(templateDir, "spec.json"));

  // Copy reference screenshot if it exists
  let hasPreview = false;
  for (const ext of [".png", ".jpg", ".jpeg", ".webp"]) {
    const refFile = path.join(SCENES_DIR, `.ref-${componentName}${ext}`);
    if (fs.existsSync(refFile)) {
      fs.copyFileSync(refFile, path.join(templateDir, `reference${ext}`));
      hasPreview = true;
      break;
    }
  }

  // Move reference video from tmp into the template folder and remove from tmp
  const videoRefPath = path.join(TMP_DIR, `video-ref-${componentName}.mp4`);
  if (fs.existsSync(videoRefPath)) {
    const destVideo = path.join(templateDir, "reference.mp4");
    try {
      fs.renameSync(videoRefPath, destVideo); // atomic move (same drive)
    } catch {
      // Cross-drive fallback: copy then delete
      try { fs.copyFileSync(videoRefPath, destVideo); } catch {}
      try { fs.unlinkSync(videoRefPath); } catch {}
    }
  }

  // Copy the latest Remotion-rendered video to the template folder as the preview
  if (fs.existsSync(OUT_DIR)) {
    const renderedFiles = fs.readdirSync(OUT_DIR)
      .filter(f => f.startsWith(componentName) && (f.endsWith(".mp4") || f.endsWith(".webm")))
      .map(f => ({name: f, mtime: fs.statSync(path.join(OUT_DIR, f)).mtimeMs}))
      .sort((a, b) => b.mtime - a.mtime);
    if (renderedFiles.length > 0) {
      const latest = renderedFiles[0];
      const ext = path.extname(latest.name);
      try {
        fs.copyFileSync(path.join(OUT_DIR, latest.name), path.join(templateDir, `rendered${ext}`));
        console.log(`[save-template] Saved rendered preview: rendered${ext}`);
      } catch (err) {
        console.error(`[save-template] Failed to copy rendered video: ${err.message}`);
      }
    }
  }

  // Auto-generate title & description if not provided by user
  let finalDisplayName = displayName;
  let finalDescription = description;
  if (!finalDisplayName || !finalDescription) {
    const autoMeta = await generateTemplateMetadata(spec);
    if (autoMeta) {
      if (!finalDisplayName) finalDisplayName = autoMeta.title;
      if (!finalDescription) finalDescription = autoMeta.description;
      console.log(`[save-template] Auto-generated metadata: "${autoMeta.title}"`);
    }
  }

  // Write template manifest
  const manifest = {
    name: safeName,
    displayName: finalDisplayName || safeName,
    category: TEMPLATE_CATEGORIES.includes(category) ? category : "other",
    description: finalDescription || "",
    sourceComponent: componentName,
    variables,
    designFields,
    spec,
    hasPreview,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(templateDir, "template.json"), JSON.stringify(manifest, null, 2));

  console.log(`Template saved: templates/${safeName}/`);
  res.json({success: true, templateName: safeName, templateDir: `templates/${safeName}`});
});

// ── List templates ──────────────────────────────────────────────────────
app.get("/api/templates", (_req, res) => {
  if (!fs.existsSync(TEMPLATES_DIR)) return res.json({templates: [], categories: TEMPLATE_CATEGORIES});

  const templates = [];
  for (const entry of fs.readdirSync(TEMPLATES_DIR)) {
    const manifestPath = path.join(TEMPLATES_DIR, entry, "template.json");
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      // Find preview image
      let previewExt = null;
      for (const ext of [".png", ".jpg", ".jpeg", ".webp"]) {
        if (fs.existsSync(path.join(TEMPLATES_DIR, entry, `reference${ext}`))) { previewExt = ext; break; }
      }
      // Find preview video — prefer rendered output over reference
      let videoFile = null;
      for (const prefix of ["rendered", "reference"]) {
        for (const ext of [".mp4", ".webm", ".mov"]) {
          if (fs.existsSync(path.join(TEMPLATES_DIR, entry, `${prefix}${ext}`))) { videoFile = `${prefix}${ext}`; break; }
        }
        if (videoFile) break;
      }
      templates.push({
        name: manifest.name,
        displayName: manifest.displayName || manifest.name,
        category: manifest.category || "other",
        description: manifest.description || "",
        sourceComponent: manifest.sourceComponent,
        variableCount: (manifest.variables || manifest.fields || []).length,
        hasPreview: !!previewExt,
        previewUrl: previewExt ? `/templates/${entry}/reference${previewExt}` : null,
        videoUrl: videoFile ? `/templates/${entry}/${videoFile}` : null,
        createdAt: manifest.createdAt,
      });
    } catch {}
  }

  templates.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  res.json({templates, categories: TEMPLATE_CATEGORIES});
});

// ── Delete background asset (image or video) ────────────────────────────────
app.delete("/api/assets/bg/:filename", (req, res) => {
  const filename = req.params.filename;
  // Only allow files that start with bg- (never allow arbitrary deletes)
  if (!filename || !/^bg-/i.test(filename) || filename.includes("..") || filename.includes("/")) {
    return res.status(400).json({error: "Invalid filename"});
  }
  const filePath = path.join(PUBLIC_DIR, filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({error: "File not found"});
  try {
    fs.unlinkSync(filePath);
    res.json({ok: true});
  } catch (e) {
    res.status(500).json({error: e.message});
  }
});

// ── Delete font directory ────────────────────────────────────────────────────
app.delete("/api/assets/font/:name", (req, res) => {
  const name = req.params.name;
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
    return res.status(400).json({error: "Invalid font name"});
  }
  const fontDir = path.join(PUBLIC_DIR, name);
  if (!fs.existsSync(fontDir) || !fs.statSync(fontDir).isDirectory()) {
    return res.status(404).json({error: "Font not found"});
  }
  try {
    fs.rmSync(fontDir, {recursive: true, force: true});
    res.json({ok: true});
  } catch (e) {
    res.status(500).json({error: e.message});
  }
});

// ── Get template detail ─────────────────────────────────────────────────
// ── Delete template ──────────────────────────────────────────────────────────
app.delete("/api/templates/:name", (req, res) => {
  const {name} = req.params;
  if (!name || !/^[A-Za-z0-9_-]+$/.test(name)) {
    return res.status(400).json({error: "Invalid template name"});
  }

  const templateDir = path.join(TEMPLATES_DIR, name);
  if (!fs.existsSync(templateDir)) {
    return res.status(404).json({error: `Template "${name}" not found`});
  }

  // Read manifest to find the source component name
  let sourceComponent = null;
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(templateDir, "template.json"), "utf8"));
    sourceComponent = manifest.sourceComponent || null;
  } catch {}

  // 1. Remove template folder
  fs.rmSync(templateDir, {recursive: true, force: true});

  // 2. Remove generated component file from src/scenes/
  if (sourceComponent) {
    const componentFile = path.join(SCENES_DIR, `Generated_${sourceComponent}.tsx`);
    if (fs.existsSync(componentFile)) fs.rmSync(componentFile);

    // 3. Remove spec and ref files
    for (const ext of [".json", ".png", ".jpg", ".jpeg", ".webp", ".mp4"]) {
      const specFile = path.join(SCENES_DIR, `.spec-${sourceComponent}${ext}`);
      if (fs.existsSync(specFile)) fs.rmSync(specFile);
      const refFile = path.join(SCENES_DIR, `.ref-${sourceComponent}${ext}`);
      if (fs.existsSync(refFile)) fs.rmSync(refFile);
    }

    // 4. Remove from Root.tsx — import line and <Composition> block
    const rootPath = path.join(__dirname, "..", "src", "Root.tsx");
    let rootContent = fs.readFileSync(rootPath, "utf8");

    // Remove import line
    rootContent = rootContent.replace(
      new RegExp(`\\nimport \\{${sourceComponent}\\} from "\\..*Generated_${sourceComponent}";`),
      ""
    );

    // Remove <Composition ... /> block for this component
    const compRegex = new RegExp(
      `\\s*<Composition[^>]*id="${sourceComponent}"[\\s\\S]*?(?:\\/?>|\\/>)(?:[\\s\\S]*?<\\/Composition>)?`,
      "g"
    );
    rootContent = rootContent.replace(compRegex, "");

    fs.writeFileSync(rootPath, rootContent, "utf8");
  }

  console.log(`Deleted template "${name}"${sourceComponent ? ` (component: ${sourceComponent})` : ""}`);
  res.json({ok: true});
});

app.get("/api/templates/:name", (req, res) => {
  const {name} = req.params;
  const manifestPath = path.join(TEMPLATES_DIR, name, "template.json");
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({error: `Template "${name}" not found`});
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  // Migrate old format: if manifest has fields but no variables, split them
  if (!manifest.variables && manifest.fields) {
    manifest.variables = manifest.fields.filter(f => f.id.startsWith("prop:")).map(f => ({
      ...f,
      name: f.id.replace("prop:", ""),
      placeholder: `e.g. ${typeof f.defaultValue === "string" ? f.defaultValue : JSON.stringify(f.defaultValue)}`.slice(0, 80),
      required: f.id === "prop:locations" || f.id === "prop:tagline",
    }));
    manifest.designFields = manifest.fields.filter(f => !f.id.startsWith("prop:"));
  }

  // Find preview image
  let previewUrl = null;
  for (const ext of [".png", ".jpg", ".jpeg", ".webp"]) {
    if (fs.existsSync(path.join(TEMPLATES_DIR, name, `reference${ext}`))) {
      previewUrl = `/templates/${name}/reference${ext}`;
      break;
    }
  }

  // Find preview video — prefer rendered output over reference
  let videoUrl = null;
  for (const prefix of ["rendered", "reference"]) {
    for (const ext of [".mp4", ".webm", ".mov"]) {
      if (fs.existsSync(path.join(TEMPLATES_DIR, name, `${prefix}${ext}`))) {
        videoUrl = `/templates/${name}/${prefix}${ext}`;
        break;
      }
    }
    if (videoUrl) break;
  }

  res.json({...manifest, previewUrl, videoUrl});
});

// ── Update template metadata ─────────────────────────────────────────
app.patch("/api/templates/:name", express.json(), (req, res) => {
  const {name} = req.params;
  const manifestPath = path.join(TEMPLATES_DIR, name, "template.json");
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({error: `Template "${name}" not found`});
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const {displayName, description} = req.body;
  if (typeof displayName === "string") manifest.displayName = displayName;
  if (typeof description === "string") manifest.description = description;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  res.json({ok: true});
});

// ── Fork template (customize & save as new, with preview render) ─────────
app.post("/api/templates/:name/fork", express.json(), (req, res) => {
  const {name} = req.params;
  const {newName, displayName, designOverrides, width, height, aspectRatio, cropX, cropY} = req.body || {};
  if (!newName) return res.status(400).json({error: "newName required"});

  const safeName = newName.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/^_+|_+$/g, "") || "ForkedTemplate";
  const srcDir = path.join(TEMPLATES_DIR, name);
  const destDir = path.join(TEMPLATES_DIR, safeName);

  if (!fs.existsSync(path.join(srcDir, "template.json"))) {
    return res.status(400).json({error: `Template "${name}" not found`});
  }
  if (fs.existsSync(destDir)) {
    return res.status(409).json({error: `Template "${safeName}" already exists. Choose a different name.`});
  }

  // SSE setup
  res.writeHead(200, {"Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive"});
  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  (async () => {
    try {
      // ── 1. Copy template directory (excluding component — handled separately) ─
      send({type: "log", text: "Creating forked template..."});
      fs.mkdirSync(destDir, {recursive: true});
      for (const file of fs.readdirSync(srcDir)) {
        fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
      }

      const manifest = JSON.parse(fs.readFileSync(path.join(destDir, "template.json"), "utf8"));
      manifest.name = safeName;
      if (displayName) manifest.displayName = displayName;
      manifest.forkedFrom = name;
      manifest.createdAt = new Date().toISOString();

      // Update designFields defaults in manifest to reflect overrides
      if (designOverrides && Object.keys(designOverrides).length > 0) {
        const dfs = manifest.designFields || [];
        const bgType = designOverrides.backgroundType || "solid";
        if (designOverrides.background) {
          const f = dfs.find(f => f.id === "background");
          if (f) f.defaultValue = designOverrides.background;
          if (manifest.spec?.background && bgType === "solid") manifest.spec.background.color = designOverrides.background;
        }
        if (designOverrides.fontFamily) {
          const f = dfs.find(f => f.id === "fontFamily");
          if (f) f.defaultValue = designOverrides.fontFamily;
        }
        if (designOverrides.logo) {
          const f = dfs.find(f => f.id === "logo");
          if (f) f.defaultValue = designOverrides.logo;
        }
        if (manifest.spec) {
          fs.writeFileSync(path.join(destDir, "spec.json"), JSON.stringify(manifest.spec, null, 2));
        }
      }

      fs.writeFileSync(path.join(destDir, "template.json"), JSON.stringify(manifest, null, 2));

      // ── 2. Set up scenes component — same order as render-from-template ──────
      // Copy CLEAN original component to scenes first, then apply overrides
      send({type: "log", text: "Setting up component..."});
      ensureTemplateComponent(safeName, manifest);
      const scenesComponentPath = path.join(SCENES_DIR, `Generated_${manifest.sourceComponent}.tsx`);

      // ── 3. Apply design overrides to scenes file (mirrors render-from-template) ─
      if (designOverrides && Object.keys(designOverrides).length > 0) {
        send({type: "log", text: "Applying design overrides..."});
        applyDesignOverrides(scenesComponentPath, manifest, designOverrides);
      }

      // ── 4. Inject ScaleWrapper for non-default aspect ratios ────────────────
      const needsScale = width && height && (width !== 1920 || height !== 1080);
      if (needsScale) {
        send({type: "log", text: `Applying ${aspectRatio || width + "x" + height} aspect ratio...`});
        injectScaleWrapper(scenesComponentPath, cropX ?? 50, cropY ?? 50);
      }

      // ── 5. Save the fully-patched scenes file back as the template's component ─
      // This ensures the template's component.tsx reflects all overrides + scale
      fs.copyFileSync(scenesComponentPath, path.join(destDir, "component.tsx"));

      // ── 6. Render preview video ─────────────────────────────────
      send({type: "log", text: "Rendering preview video..."});
      const vars = manifest.variables || [];
      const props = buildPropsFromVariables(vars, {});
      if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, {recursive: true});

      const timestamp = Date.now();
      const isTransparent = designOverrides && designOverrides.backgroundType === "transparent";
      const outputExt = isTransparent ? ".webm" : ".mp4";
      const arLabel = aspectRatio && aspectRatio !== "16:9" ? `_${aspectRatio.replace(":", "x")}` : "";
      const outputFile = `${manifest.sourceComponent}_fork_${timestamp}${outputExt}`;
      const outputPath = path.join(OUT_DIR, outputFile);
      const propsFile = path.join(TMP_DIR, `.fork-props-${timestamp}.json`);
      fs.writeFileSync(propsFile, JSON.stringify(props));

      const codecFlags = isTransparent ? " --codec=vp8 --image-format=png" : "";
      const dimFlags = needsScale ? ` --width=${width} --height=${height}` : "";
      const cmd = `node node_modules/@remotion/cli/remotion-cli.js render src/index.ts ${manifest.sourceComponent} "${outputPath.replace(/\\/g, "/")}" --props="${propsFile.replace(/\\/g, "/")}"${codecFlags}${dimFlags}`;

      await new Promise((resolve, reject) => {
        const child = exec(cmd, {cwd: path.resolve(__dirname, "..")});
        child.stdout.on("data", (d) => send({type: "log", text: d.toString().trim()}));
        child.stderr.on("data", (d) => send({type: "log", text: d.toString().trim()}));
        child.on("close", (code) => {
          try { fs.unlinkSync(propsFile); } catch {}
          if (code === 0) resolve();
          else reject(new Error(`Render failed with exit code ${code}`));
        });
      });

      // ── 7. Copy rendered video into template dir as preview ─────
      const previewDest = path.join(destDir, `rendered${outputExt}`);
      fs.copyFileSync(outputPath, previewDest);
      // Remove old reference and any conflicting rendered files so the new one is used
      for (const old of ["reference.mp4", "reference.mov", "reference.webm"]) {
        try { fs.unlinkSync(path.join(destDir, old)); } catch {}
      }
      // Remove any previously rendered file with a different extension
      for (const ext of [".mp4", ".webm", ".mov"]) {
        if (ext !== outputExt) {
          try { fs.unlinkSync(path.join(destDir, `rendered${ext}`)); } catch {}
        }
      }
      // Clean up out/ file
      try { fs.unlinkSync(outputPath); } catch {}

      // ── 8. Extract a still frame for the card thumbnail ─────────
      // For transparent renders, composite against white so the thumbnail isn't black
      send({type: "log", text: "Extracting thumbnail..."});
      try {
        const ffmpegBin = path.join(__dirname, "..", "node_modules", "@remotion", "compositor-win32-x64-msvc", "ffmpeg.exe");
        const thumbPath = path.join(TMP_DIR, `fork-thumb-${Date.now()}.png`);
        // Remotion's bundled ffmpeg has limited filters — use simple extraction for all cases
        // PNG output preserves alpha channel; browser renders transparent areas with page background
        const ffmpegCmd = `"${ffmpegBin}" -ss 1 -i "${previewDest.replace(/\\/g, "/")}" -frames:v 1 -q:v 2 -y "${thumbPath.replace(/\\/g, "/")}"`;
        void isTransparent; // handled via PNG alpha
        execSync(ffmpegCmd, {stdio: "pipe"});
        if (fs.existsSync(thumbPath)) {
          for (const old of ["reference.png", "reference.jpg", "reference.jpeg", "reference.webp"]) {
            try { fs.unlinkSync(path.join(destDir, old)); } catch {}
          }
          fs.copyFileSync(thumbPath, path.join(destDir, "reference.png"));
          try { fs.unlinkSync(thumbPath); } catch {}
        }
      } catch (thumbErr) {
        console.warn("[fork] Thumbnail extraction failed:", thumbErr.message);
      }

      send({type: "done", name: safeName, displayName: manifest.displayName});
    } catch (err) {
      try { fs.rmSync(destDir, {recursive: true, force: true}); } catch {}
      send({type: "error", message: err.message});
    }
    res.end();
  })();
});

// ── Render from template (single) ───────────────────────────────────────
const OUT_DIR = path.join(__dirname, "..", "out");

function buildPropsFromVariables(variables, values) {
  const props = {};
  for (const v of variables) {
    const key = v.name || v.id.replace("prop:", "");
    if (values[key] !== undefined) {
      props[key] = values[key];
    } else if (v.defaultValue !== undefined) {
      props[key] = v.defaultValue;
    }
  }
  return props;
}

function ensureTemplateComponent(templateName, manifest) {
  const componentDest = path.join(SCENES_DIR, `Generated_${manifest.sourceComponent}.tsx`);
  const componentSrc = path.join(TEMPLATES_DIR, templateName, "component.tsx");

  // Always copy from template source to ensure clean baseline
  fs.copyFileSync(componentSrc, componentDest);

  // Ensure registered in Root.tsx
  const rootContent = fs.readFileSync(path.join(__dirname, "..", "src", "Root.tsx"), "utf8");
  if (!rootContent.includes(`id="${manifest.sourceComponent}"`)) {
    registerInRoot(manifest.sourceComponent, manifest.spec);
    console.log(`Registered ${manifest.sourceComponent} in Root.tsx`);
  }
}

/** Inject ScaleWrapper around the component's return for non-16:9 aspect ratios */
function injectScaleWrapper(componentPath, cropX = 50, cropY = 50) {
  let code = fs.readFileSync(componentPath, "utf8");

  // Skip if already injected
  if (code.includes("ScaleWrapper")) return;

  // Add import for ScaleWrapper
  const importLine = "import {ScaleWrapper} from '../components/ScaleWrapper';\n";
  // Insert after the last import statement
  const lastImportIdx = code.lastIndexOf("\nimport ");
  if (lastImportIdx !== -1) {
    const lineEnd = code.indexOf("\n", lastImportIdx + 1);
    code = code.slice(0, lineEnd + 1) + importLine + code.slice(lineEnd + 1);
  } else {
    code = importLine + code;
  }

  // Extract background color from the component (look for backgroundColor in AbsoluteFill)
  const bgMatch = code.match(/backgroundColor:\s*['"]([^'"]+)['"]/);
  const bgColor = bgMatch ? bgMatch[1] : '#000000';

  // Wrap: replace the outermost <AbsoluteFill with <ScaleWrapper ...><AbsoluteFill
  const wrapperProps = `background="${bgColor}" cropX={${cropX}} cropY={${cropY}}`;
  code = code.replace(
    /(\breturn\s*\(\s*)<AbsoluteFill/,
    `$1<ScaleWrapper ${wrapperProps}><AbsoluteFill`
  );
  // Find the last </AbsoluteFill> before the closing of the return
  const closingPattern = /<\/AbsoluteFill>\s*\)/g;
  let match, lastMatch;
  while ((match = closingPattern.exec(code)) !== null) lastMatch = match;
  if (lastMatch) {
    code = code.slice(0, lastMatch.index) + '</AbsoluteFill></ScaleWrapper>' + code.slice(lastMatch.index + lastMatch[0].length - 1);
  }

  fs.writeFileSync(componentPath, code);
}

/** Apply design overrides (background, logo, font) by patching the component TSX code */
function applyDesignOverrides(componentPath, manifest, designOverrides) {
  if (!designOverrides || Object.keys(designOverrides).length === 0) return;

  let code = fs.readFileSync(componentPath, "utf8");
  const spec = manifest.spec || {};

  // Background override — supports solid color, image, video, transparent
  const bgType = designOverrides.backgroundType || "solid";

  // Transparent can run without a background value — handle it first
  if (bgType === "transparent") {
    code = code.replace(/backgroundColor:\s*['"][^'"]+['"]/gi, `backgroundColor: 'transparent'`);
    code = code.replace(/(<ScaleWrapper[^>]*)\bbackground=["'][^"']*["']/g, '$1background="transparent"');
    // Remove any previously injected background Img/Video media elements
    code = code.replace(/<(?:Img|Video)\s+src=\{staticFile\('[^']*'\)\}\s+style=\{\{width:'100%',height:'100%',objectFit:'cover',position:'absolute'\}\}\s*\/>/g, '');
  } else if (designOverrides.background) {
    if (bgType === "solid") {
      // Remove any previously injected background media elements
      code = code.replace(/<(?:Img|Video)\s+src=\{staticFile\('[^']*'\)\}\s+style=\{\{width:'100%',height:'100%',objectFit:'cover',position:'absolute'\}\}\s*\/>/g, '');
      // Replace any existing backgroundColor generically (don't depend on old color matching spec)
      code = code.replace(/backgroundColor:\s*['"][^'"]*['"]/gi, `backgroundColor: '${designOverrides.background}'`);
      // Also update ScaleWrapper background prop if present
      code = code.replace(/(<ScaleWrapper[^>]*)\bbackground=["'][^"']*["']/g, `$1background="${designOverrides.background}"`);
    } else if (bgType === "image" || bgType === "video") {
      const asset = designOverrides.background;
      const isVideo = bgType === "video";
      const remotionTag = isVideo ? "Video" : "Img";
      const importName = isVideo ? "Video" : "Img";

      // Add Img/Video and staticFile imports if not already present
      const importsNeeded = [importName, 'staticFile'];
      for (const imp of importsNeeded) {
        if (!code.includes(imp)) {
          code = code.replace(
            /import\s*\{([^}]+)\}\s*from\s*['"]remotion['"]/,
            (match, imports) => {
              if (imports.includes(imp)) return match;
              const cleaned = imports.replace(/,\s*$/, '').trim();
              return match.replace(imports, `${cleaned}, ${imp}`);
            }
          );
        }
      }

      const mediaElement = `<${remotionTag} src={staticFile('${asset}')} style={{width:'100%',height:'100%',objectFit:'cover',position:'absolute'}} />`;
      // Replace <AbsoluteFill style={{backgroundColor: '...'}}>  with plain <AbsoluteFill> + media element
      const bgAbsFillRegex = /<AbsoluteFill\s+style=\{\{\s*backgroundColor:\s*['"][^'"]*['"]\s*\}\}>/i;
      if (bgAbsFillRegex.test(code)) {
        code = code.replace(bgAbsFillRegex, `<AbsoluteFill>\n        ${mediaElement}`);
      } else {
        // Fallback: make backgroundColor transparent and inject media element after <AbsoluteFill>
        code = code.replace(/backgroundColor:\s*['"][^'"]*['"]/gi, `backgroundColor: 'transparent'`);
        code = code.replace(/<AbsoluteFill>/i, `<AbsoluteFill>\n        ${mediaElement}`);
      }
      // Update ScaleWrapper background prop if present
      code = code.replace(/(<ScaleWrapper[^>]*)\bbackground=["'][^"']*["']/g, `$1background="transparent"`);
    }
  }

  // Logo override — replace all logo staticFile references
  if (designOverrides.logo) {
    const allDesignFields = manifest.designFields || manifest.fields || [];
    const logoField = allDesignFields.find(f => f.id === "logo");
    const oldLogo = logoField ? logoField.defaultValue : null;
    if (oldLogo && designOverrides.logo !== oldLogo) {
      code = code.replace(
        new RegExp(`staticFile\\(['"]${oldLogo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]\\)`, "g"),
        `staticFile('${designOverrides.logo}')`
      );
    }
    // Also handle wordmark swap based on logo variant
    if (designOverrides.logo.includes("white") || designOverrides.logo.includes("White")) {
      code = code.replace(/staticFile\(['"]Ashley-Wordmark-Black[^'"]*['"]\)/g, `staticFile('Ashley-Wordmark-White_PNG_u7iaxp.png')`);
    } else if (designOverrides.logo.includes("black") || designOverrides.logo.includes("Black")) {
      code = code.replace(/staticFile\(['"]Ashley-Wordmark-White[^'"]*['"]\)/g, `staticFile('Ashley-Wordmark-Black_PNG_u7iaxp.png')`);
    }
  }

  // Font family override
  if (designOverrides.fontFamily) {
    const allDesignFields = manifest.designFields || manifest.fields || [];
    const fontField = allDesignFields.find(f => f.id === "fontFamily");
    const oldFont = fontField ? fontField.defaultValue : null;
    if (oldFont && designOverrides.fontFamily !== oldFont) {
      // Replace literal font name strings in style objects
      code = code.replace(
        new RegExp(`fontFamily:\\s*['"]${oldFont.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, "g"),
        `fontFamily: '${designOverrides.fontFamily}'`
      );
      // Also replace CHESNA constant usage if the old font was Chesna Grotesk
      if (oldFont === "Chesna Grotesk" || oldFont.toLowerCase().includes("chesna")) {
        code = code.replace(/fontFamily:\s*CHESNA/g, `fontFamily: '${designOverrides.fontFamily}'`);
      }
    }
  }

  fs.writeFileSync(componentPath, code);
}

app.post("/api/render-from-template", (req, res) => {
  const {templateName, variables: values, designOverrides, width, height, aspectRatio, cropX, cropY} = req.body || {};
  if (!templateName) return res.status(400).json({error: "templateName required"});

  const manifestPath = path.join(TEMPLATES_DIR, templateName, "template.json");
  if (!fs.existsSync(manifestPath)) return res.status(404).json({error: "Template not found"});

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const vars = manifest.variables || (manifest.fields || []).filter(f => f.id.startsWith("prop:"));

  // SSE setup
  res.writeHead(200, {"Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive"});
  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  (async () => {
    try {
      send({type: "log", text: "Setting up template component..."});
      ensureTemplateComponent(templateName, manifest);

      // Apply design overrides (background, logo, font) to the component code
      const componentPath = path.join(SCENES_DIR, `Generated_${manifest.sourceComponent}.tsx`);
      if (designOverrides) {
        send({type: "log", text: "Applying design overrides..."});
        applyDesignOverrides(componentPath, manifest, designOverrides);
      }

      // Inject ScaleWrapper for non-default aspect ratios
      const needsScale = width && height && (width !== 1920 || height !== 1080);
      if (needsScale) {
        send({type: "log", text: `Cropping to ${aspectRatio || width+'x'+height}...`});
        injectScaleWrapper(componentPath, cropX ?? 50, cropY ?? 50);
      }

      const props = buildPropsFromVariables(vars, values || {});
      if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, {recursive: true});

      const timestamp = Date.now();
      const isTransparent = designOverrides && designOverrides.backgroundType === "transparent";
      const outputExt = isTransparent ? ".webm" : ".mp4";
      const arLabel = aspectRatio && aspectRatio !== '16:9' ? `_${aspectRatio.replace(':', 'x')}` : '';
      const outputFile = `${manifest.sourceComponent}${arLabel}_${timestamp}${outputExt}`;
      const outputPath = path.join(OUT_DIR, outputFile);
      const propsFile = path.join(TMP_DIR, `.props-${timestamp}.json`);
      fs.writeFileSync(propsFile, JSON.stringify(props));

      const codecFlags = isTransparent ? ' --codec=vp8 --image-format=png' : '';
      const dimFlags = needsScale ? ` --width=${width} --height=${height}` : '';
      const cmd = `npx remotion render src/index.ts ${manifest.sourceComponent} "${outputPath.replace(/\\/g, "/")}" --props="${propsFile.replace(/\\/g, "/")}"${codecFlags}${dimFlags}`;
      send({type: "log", text: `Rendering ${isTransparent ? 'transparent WebM' : 'video'} with Remotion...`});

      await new Promise((resolve, reject) => {
        const child = exec(cmd, {cwd: path.resolve(__dirname, "..")});
        child.stdout.on("data", (d) => send({type: "log", text: d.toString().trim()}));
        child.stderr.on("data", (d) => send({type: "log", text: d.toString().trim()}));
        child.on("close", (code) => {
          try { fs.unlinkSync(propsFile); } catch {}
          if (code === 0) resolve();
          else reject(new Error(`Render failed with exit code ${code}`));
        });
      });

      send({type: "done", file: outputFile, downloadUrl: `/out/${outputFile}`});
    } catch (err) {
      send({type: "error", message: err.message});
    }
    res.end();
  })();
});

// ── Bulk render from template ───────────────────────────────────────────
let bulkCancelFlag = false;

app.post("/api/bulk-cancel", (_req, res) => {
  bulkCancelFlag = true;
  res.json({cancelled: true});
});

app.post("/api/bulk-render", (req, res) => {
  const {templateName, rows, designOverrides, width, height, aspectRatio, cropX, cropY} = req.body || {};
  if (!templateName) return res.status(400).json({error: "templateName required"});
  if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({error: "rows array required"});

  const manifestPath = path.join(TEMPLATES_DIR, templateName, "template.json");
  if (!fs.existsSync(manifestPath)) return res.status(404).json({error: "Template not found"});

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const vars = manifest.variables || (manifest.fields || []).filter(f => f.id.startsWith("prop:"));

  // SSE setup
  res.writeHead(200, {"Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive"});
  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  bulkCancelFlag = false;
  const bulkNeedsScale = width && height && (width !== 1920 || height !== 1080);

  (async () => {
    try {
      send({type: "log", text: "Setting up template component..."});
      ensureTemplateComponent(templateName, manifest);

      // Apply design overrides once for all rows
      const componentPath = path.join(SCENES_DIR, `Generated_${manifest.sourceComponent}.tsx`);
      if (designOverrides && Object.keys(designOverrides).length > 0) {
        send({type: "log", text: "Applying design overrides..."});
        applyDesignOverrides(componentPath, manifest, designOverrides);
      }

      // Inject ScaleWrapper for non-default aspect ratios
      if (bulkNeedsScale) {
        send({type: "log", text: `Cropping to ${aspectRatio || width+'x'+height}...`});
        injectScaleWrapper(componentPath, cropX ?? 50, cropY ?? 50);
      }

      if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, {recursive: true});

      const files = [];
      const total = rows.length;
      const bulkDimFlags = bulkNeedsScale ? ` --width=${width} --height=${height}` : '';
      const bulkArLabel = aspectRatio && aspectRatio !== '16:9' ? `_${aspectRatio.replace(':', 'x')}` : '';

      for (let i = 0; i < total; i++) {
        if (bulkCancelFlag) {
          send({type: "cancelled", completedCount: files.length, totalCount: total});
          break;
        }

        send({type: "row-start", index: i, total});
        const props = buildPropsFromVariables(vars, rows[i]);
        const timestamp = Date.now();
        const bulkIsTransparent = designOverrides && designOverrides.backgroundType === "transparent";
        const bulkExt = bulkIsTransparent ? ".webm" : ".mp4";
        const outputFile = `${manifest.sourceComponent}${bulkArLabel}_batch_${i + 1}_${timestamp}${bulkExt}`;
        const outputPath = path.join(OUT_DIR, outputFile);
        const propsFile = path.join(TMP_DIR, `.props-bulk-${timestamp}.json`);
        fs.writeFileSync(propsFile, JSON.stringify(props));

        const bulkCodecFlags = bulkIsTransparent ? ' --codec=vp8 --image-format=png' : '';
        const cmd = `npx remotion render src/index.ts ${manifest.sourceComponent} "${outputPath.replace(/\\/g, "/")}" --props="${propsFile.replace(/\\/g, "/")}"${bulkCodecFlags}${bulkDimFlags}`;

        try {
          await new Promise((resolve, reject) => {
            const child = exec(cmd, {cwd: path.resolve(__dirname, "..")});
            child.stdout.on("data", (d) => send({type: "log", text: `[${i + 1}/${total}] ${d.toString().trim()}`}));
            child.stderr.on("data", (d) => send({type: "log", text: `[${i + 1}/${total}] ${d.toString().trim()}`}));
            child.on("close", (code) => {
              try { fs.unlinkSync(propsFile); } catch {}
              if (code === 0) resolve();
              else reject(new Error(`Render ${i + 1} failed with exit code ${code}`));
            });
          });
          files.push({index: i, file: outputFile, downloadUrl: `/out/${outputFile}`});
          send({type: "row-done", index: i, file: outputFile, downloadUrl: `/out/${outputFile}`});
        } catch (err) {
          send({type: "row-error", index: i, error: err.message});
        }
      }

      if (!bulkCancelFlag) {
        send({type: "bulk-done", files, successCount: files.length, errorCount: total - files.length});
      }
    } catch (err) {
      send({type: "error", message: err.message});
    }
    res.end();
  })();
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
