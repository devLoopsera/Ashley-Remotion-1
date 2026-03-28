#!/usr/bin/env node
/**
 * Ashley End Screen Templatizer
 * Full pipeline: screenshot/video → Gemini design spec → Claude Remotion component
 *
 * Usage:
 *   node scripts/templatize.js --image=public/screenshot.png --name=MyEndCard
 *   node scripts/templatize.js --video=public/24682_dedluo.mp4 --name=MyEndCard
 *
 * Options:
 *   --image=<path>      Path to a screenshot (PNG/JPG/WebP)
 *   --video=<path>      Path to a video file (MP4/MOV)
 *   --name=<name>       Component name (e.g. "SpringSaleCard") — will generate Generated_<name>.tsx
 *   --spec=<path>       Skip Gemini step, use an existing spec JSON file
 *   --logo=<path>       Custom logo image to use (copies to public/, overrides any logo in spec)
 *   --bg-image=<path>   Force a background image (copies to public/, overrides solid color)
 *   --bg-color=#hex     Override background with a solid hex color (e.g. --bg-color=#1a2841)
 *   --skip-write        Print the generated code but do NOT write files (dry run)
 */

const path = require("path");
const fs = require("fs");
const {analyzeDesign, extractLastFrame, enforceLogoSplit} = require("./analyze-design");
const {generateComponent} = require("./generate-component");
const {validateCode, runQACheck, findSavedReference, fixHandTypedLogo} = require("./qa-check");

require("dotenv").config();

const PROJECT_ROOT = path.resolve(__dirname, "..");
const IS_VERCEL = Boolean(process.env.VERCEL);
const RUNTIME_TMP_ROOT = IS_VERCEL ? path.join("/tmp", "ashley-preview") : PROJECT_ROOT;
const TMP_DIR = path.join(RUNTIME_TMP_ROOT, "tmp");
const SCENES_DIR = path.join(PROJECT_ROOT, "src", "scenes");
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");
const ROOT_TSX = path.join(PROJECT_ROOT, "src", "Root.tsx");

// ── Find font files recursively in a public/ subdirectory ─────────────────
// Returns paths relative to public/ (suitable for staticFile()).
const FONT_FILE_EXTS = new Set([".woff2", ".woff", ".ttf", ".otf"]);
function findFontFiles(fontFamilyDir) {
  const dirPath = path.join(PUBLIC_DIR, fontFamilyDir);
  if (!fs.existsSync(dirPath)) return [];
  const results = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (fs.statSync(full).isDirectory()) {
        walk(full);
      } else if (FONT_FILE_EXTS.has(path.extname(entry).toLowerCase())) {
        // Return path relative to PUBLIC_DIR, using forward slashes for staticFile()
        results.push(path.relative(PUBLIC_DIR, full).replace(/\\/g, "/"));
      }
    }
  }
  walk(dirPath);
  // Prefer woff2, then woff, then ttf/otf; prefer "roman"/"regular" over italic
  const priority = (f) => {
    const lower = f.toLowerCase();
    const extScore = lower.endsWith(".woff2") ? 0 : lower.endsWith(".woff") ? 1 : 2;
    const styleScore = (lower.includes("italic") || lower.includes("oblique")) ? 1 : 0;
    return extScore * 10 + styleScore;
  };
  return results.sort((a, b) => priority(a) - priority(b));
}

// ── Apply user overrides to spec ───────────────────────────────────────────
// Returns { customLogoFile, customBgFile, customFontFamily, customFontFiles }
function applyOverrides(spec, {componentName, logoPath, bgImagePath, bgColor, fontFamily}) {
  let customLogoFile = null;
  let customBgFile = null;

  // ── Background image override ─────────────────────────────────
  if (bgImagePath) {
    const src = path.resolve(bgImagePath);
    if (!fs.existsSync(src)) throw new Error(`--bg-image file not found: ${bgImagePath}`);
    const ext = path.extname(src).toLowerCase() || ".png";
    customBgFile = `bg-${componentName}${ext}`;
    fs.copyFileSync(src, path.join(PUBLIC_DIR, customBgFile));
    spec.background = {type: "image", imageFile: customBgFile};
    console.log(`   ✓ Background image: public/${customBgFile}`);
  }

  // ── Background solid color override ──────────────────────────
  if (bgColor && !bgImagePath) {
    spec.background = {type: "solid", color: bgColor};
    console.log(`   ✓ Background color: ${bgColor}`);
  }

  // ── Custom logo override ──────────────────────────────────────
  if (logoPath) {
    const src = path.resolve(logoPath);
    if (!fs.existsSync(src)) throw new Error(`--logo file not found: ${logoPath}`);
    const ext = path.extname(src).toLowerCase() || ".png";
    customLogoFile = `logo-${componentName}${ext}`;
    fs.copyFileSync(src, path.join(PUBLIC_DIR, customLogoFile));
    console.log(`   ✓ Custom logo: public/${customLogoFile}`);

    // Update any Ashley brand logo assets in spec.elements to the custom file,
    // so validateCode's logo-asset check stays in sync with what the generator will produce.
    function patchLogoAssets(elements) {
      for (const el of elements || []) {
        if (el.type === "image" && el.asset && /Ashley-Logo|HouseIcon/i.test(el.asset)) {
          el.asset = customLogoFile;
        }
        if (el.children) patchLogoAssets(el.children);
      }
    }
    patchLogoAssets(spec.elements);
  }

  // ── Font family override ──────────────────────────────────────
  let customFontFamily = null;
  let customFontFiles = [];
  if (fontFamily) {
    function patchFonts(elements) {
      for (const el of elements || []) {
        if (el.style && el.style.fontFamily) el.style.fontFamily = fontFamily;
        if (el.children) patchFonts(el.children);
      }
    }
    patchFonts(spec.elements);
    customFontFamily = fontFamily;
    customFontFiles = findFontFiles(fontFamily);
    console.log(`   ✓ Font family: ${fontFamily}${customFontFiles.length ? ` (${customFontFiles.length} file(s) found)` : " (no font files found in public/)"}`);
  }

  return {customLogoFile, customBgFile, customFontFamily, customFontFiles};
}

async function templatize({imagePath, videoPath, componentName, specPath, skipWrite, logoPath, bgImagePath, bgColor, fontFamily, initialInstructions, overrideDurationFrames, clipStartSec = null, clipEndSec = null}) {
  // ── Step 1: Analyze design with Gemini ─────────────────────────
  let spec;

  if (specPath) {
    console.log(`\nUsing existing spec: ${specPath}\n`);
    spec = JSON.parse(fs.readFileSync(path.resolve(specPath), "utf8"));
    enforceLogoSplit(spec); // Ensure split logo + contrast even for pre-existing specs
  } else {
    console.log(`\n── Step 1: Analyzing design with Gemini ─────────────────────`);
    console.log(`   Clip range: ${clipStartSec != null ? clipStartSec.toFixed(2) + 's' : 'not set'} → ${clipEndSec != null ? clipEndSec.toFixed(2) + 's' : 'not set'}`);
    spec = await analyzeDesign(imagePath || null, videoPath || null, clipStartSec, clipEndSec);
    // enforceLogoSplit already called inside analyzeDesign
  }

  // Apply user-specified duration override (from video player in-point selection)
  if (overrideDurationFrames && overrideDurationFrames > 0) {
    spec.durationFrames = overrideDurationFrames;
    console.log(`   ✓ Duration override: ${overrideDurationFrames} frames (${(overrideDurationFrames / 30).toFixed(1)}s @ 30fps)`);
  }

  // Apply user overrides (logo, background image, background color, font)
  const {customLogoFile, customBgFile, customFontFamily, customFontFiles} = applyOverrides(spec, {
    componentName,
    logoPath,
    bgImagePath,
    bgColor,
    fontFamily,
  });

  // Print spec for user review
  console.log("\n── Extracted Design Spec ────────────────────────────────────");
  console.log(JSON.stringify(spec, null, 2));
  console.log("─────────────────────────────────────────────────────────────\n");

  // Save spec alongside the component so it can be used for regeneration
  const specFile = path.join(SCENES_DIR, `.spec-${componentName}.json`);
  if (!skipWrite) {
    fs.writeFileSync(specFile, JSON.stringify(spec, null, 2));
    console.log(`Spec saved to: src/scenes/.spec-${componentName}.json`);
  } else {
    console.log("Skipping spec write (dry run mode)");
  }

  // Collect custom asset filenames so validateCode knows they're legitimate
  const extraValidAssets = [customLogoFile, customBgFile].filter(Boolean);

  // ── Step 2: Generate + statically validate code ─────────────────
  console.log("── Step 2: Generating Remotion component with Gemini ─────────");

  const MAX_CODE_ATTEMPTS = 3;
  let code = await generateComponent(spec, componentName, {customLogoFile, customFontFamily, customFontFiles, initialInstructions});

  for (let codeAttempt = 1; codeAttempt <= MAX_CODE_ATTEMPTS; codeAttempt++) {
    const codeIssues = validateCode(code, spec, extraValidAssets);
    if (codeIssues.length === 0) {
      console.log(`   ✓ Code validation passed`);
      break;
    }

    console.log(`   ✗ Code validation (attempt ${codeAttempt}) — ${codeIssues.length} issue(s):`);
    codeIssues.forEach((issue) => console.log(`   • ${issue}`));

    if (codeAttempt === MAX_CODE_ATTEMPTS) {
      console.log(`   ⚠ Proceeding with remaining issues`);
      break;
    }

    const feedback =
      `The generated code has these problems that MUST be fixed:\n` +
      codeIssues.map((issue, i) => `${i + 1}. ${issue}`).join("\n") +
      `\n\nFix ALL of these issues. Do not introduce any new ones.`;
    code = await generateComponent(spec, componentName, {feedback, existingCode: code, customLogoFile, customFontFamily, customFontFiles});
  }

  // Final safety net: auto-fix any ASHLEY text that slipped through
  const {code: fixedCode, changed: logoFixed} = fixHandTypedLogo(code);
  if (logoFixed) {
    console.log("   ✓ Auto-fixed ASHLEY text → wordmark image");
    code = fixedCode;
  }

  // ── Step 3: Write files ─────────────────────────────────────────
  const outputFile = path.join(SCENES_DIR, `Generated_${componentName}.tsx`);

  if (skipWrite) {
    console.log("\n── Generated Code (dry run — not written) ────────────────────");
    console.log(code);
    console.log("─────────────────────────────────────────────────────────────\n");
    return {code, spec, componentName, dryRun: true};
  }

  // Write component file
  fs.writeFileSync(outputFile, code);
  console.log(`\n✓ Component written to: src/scenes/Generated_${componentName}.tsx`);

  // Register in Root.tsx
  registerInRoot(componentName, spec);

  // Save a copy of the reference screenshot for future regeneration QA
  if (imagePath && !specPath) {
    const ext = path.extname(imagePath).toLowerCase();
    const refFile = path.join(SCENES_DIR, `.ref-${componentName}${ext}`);
    try { fs.copyFileSync(imagePath, refFile); } catch {}
  }


  // ── Step 4: QA — render last frame and compare with reference ────
  const lastFrame = (spec.durationFrames || 150) - 1;

  // For spec-only runs, try to use a previously saved reference
  let qaScreenshot = imagePath || null;
  let qaVideo = videoPath || null;
  if (!qaScreenshot && !qaVideo) {
    const saved = findSavedReference(componentName, SCENES_DIR);
    qaScreenshot = saved.screenshotPath;
    qaVideo = saved.videoPath;
  }

  const MAX_QA_ATTEMPTS = 3;
  let qaResult = {pass: true, score: 100, issues: [], feedback: ""};

  for (let attempt = 1; attempt <= MAX_QA_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      console.log(`\n── QA Attempt ${attempt}: Regenerating with feedback ──────────`);
      const existingCode = fs.readFileSync(outputFile, "utf8");
      let fixedCode = await generateComponent(spec, componentName, {
        feedback: qaResult.feedback,
        existingCode,
        customLogoFile,
        customFontFamily,
        customFontFiles,
      });
      // Quick static check on the regenerated code too
      const fixIssues = validateCode(fixedCode, spec, extraValidAssets);
      if (fixIssues.length > 0) {
        console.log(`   ✗ Code validation after QA regen — ${fixIssues.length} issue(s):`);
        fixIssues.forEach((issue) => console.log(`   • ${issue}`));
        const fb2 =
          `Fix these additional code issues:\n` +
          fixIssues.map((i, n) => `${n + 1}. ${i}`).join("\n");
        fixedCode = await generateComponent(spec, componentName, {
          feedback: fb2,
          existingCode: fixedCode,
          customLogoFile,
          customFontFamily,
          customFontFiles,
        });
      }
      const {code: sanitizedCode, changed: logoFixed2} = fixHandTypedLogo(fixedCode);
      if (logoFixed2) console.log("   ✓ Auto-fixed ASHLEY text → wordmark image");
      fs.writeFileSync(outputFile, sanitizedCode);
      console.log(`   ✓ Component updated`);
    }

    qaResult = await runQACheck({
      compositionId: componentName,
      lastFrame,
      screenshotPath: qaScreenshot,
      videoPath: qaVideo,
      onLog: console.log,
    });

    if (qaResult.pass) break;
    if (attempt === MAX_QA_ATTEMPTS) {
      console.log(`\n   ⚠ QA did not pass after ${MAX_QA_ATTEMPTS} attempts — keeping last version`);
    }
  }

  console.log(`\n── Done! ─────────────────────────────────────────────────────`);
  console.log(`  Component:    src/scenes/Generated_${componentName}.tsx`);
  console.log(`  Composition:  ${componentName} (registered in Root.tsx)`);
  console.log(`\n  Run "npm run dev" to open Remotion Studio and preview it.\n`);
}

function registerInRoot(componentName, spec) {
  const rootContent = fs.readFileSync(ROOT_TSX, "utf8");
  const alreadyRegistered = rootContent.includes(`id="${componentName}"`);

  // Build import line
  const importLine = `import {${componentName}} from "./scenes/Generated_${componentName}";`;

  // Build composition block
  const durationFrames = spec.durationFrames || 150;
  const fps = spec.fps || 30;
  const textContent = spec.textContent || {};
  const DEFAULT_DISCLAIMER =
    "Ashley stores are independently owned and operated. ©2024 Rogers Furniture, DBA Ashley. All rights reserved. Furniture since 1945.";

  // Dynamically build defaultProps from whatever isTextProp/isArrayProp elements the spec defines
  const defaultPropsLines = [];
  for (const el of (spec.elements || [])) {
    if (el.isTextProp && el.propName) {
      const tc = textContent[el.propName];
      if (tc === null) continue; // null means this prop doesn't exist
      const value = (tc != null)
        ? tc
        : (el.content || (el.propName === "disclaimer" ? DEFAULT_DISCLAIMER : `${el.propName} text`));
      defaultPropsLines.push(`\n          ${el.propName}: ${JSON.stringify(value)},`);
    } else if (el.isArrayProp && el.propName === "locations") {
      // Build fallback from itemTemplate propPaths so all fields are represented
      const fallbackLoc = {city: "City Name", address: "Street Address"};
      if (el.itemTemplate && Array.isArray(el.itemTemplate.children)) {
        for (const child of el.itemTemplate.children) {
          if (child.propPath && !(child.propPath in fallbackLoc)) {
            fallbackLoc[child.propPath] = child.propPath === "phone" ? "(000) 000-0000" : `${child.propPath}`;
          }
        }
      }
      let locs = [fallbackLoc];
      if (Array.isArray(textContent.locations) && textContent.locations.length > 0) locs = textContent.locations;
      const locsJson = JSON.stringify(locs, null, 2).replace(/\n/g, "\n          ");
      defaultPropsLines.push(`\n          locations: ${locsJson},`);
    }
  }
  const defaultPropsStr = defaultPropsLines.join("");

  // If already registered, update the defaultProps block in place
  if (alreadyRegistered) {
    const newDefaultProps = `defaultProps={{${defaultPropsStr}\n        }}`;
    const compStart = rootContent.indexOf(`id="${componentName}"`);
    const dpStart = rootContent.indexOf("defaultProps={{", compStart);
    const dpEnd = rootContent.indexOf("}}", dpStart) + 2;
    const updated = rootContent.slice(0, dpStart) + newDefaultProps + rootContent.slice(dpEnd);
    fs.writeFileSync(ROOT_TSX, updated);
    console.log(`  ✓ Updated defaultProps for "${componentName}" in Root.tsx`);
    return;
  }

  const compositionBlock = `      <Composition
        id="${componentName}"
        component={${componentName}}
        durationInFrames={${durationFrames}}
        fps={${fps}}
        width={1920}
        height={1080}
        defaultProps={{${defaultPropsStr}
        }}
      />`;

  // Insert import after last existing import (preserve file's line endings, skip if already present)
  const eol = rootContent.includes("\r\n") ? "\r\n" : "\n";
  const alreadyImported = rootContent.includes(importLine);
  let newContent = rootContent;
  if (!alreadyImported) {
    const lastImportIdx = rootContent.lastIndexOf("import ");
    const endOfLastImport = rootContent.indexOf("\n", lastImportIdx) + 1;
    newContent = rootContent.slice(0, endOfLastImport) + importLine + eol + rootContent.slice(endOfLastImport);
  }

  // Insert composition before closing </> tag (handle both \r\n and \n line endings)
  const closingPattern = /    <\/>\r?\n  \);/;
  newContent = newContent.replace(closingPattern, `${compositionBlock}${eol}    </>${eol}  );`);

  fs.writeFileSync(ROOT_TSX, newContent);
  console.log(`  ✓ Registered "${componentName}" in Root.tsx`);
}

// ── Asset browser — lists available files in public/ by category ─────────
const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
const VIDEO_EXTS = new Set([".mp4", ".mov", ".webm"]);
const BRAND_LOGO_RE = /^(Ashley-Logo|HouseIcon)/i;

function listAssets() {
  const files = fs.readdirSync(PUBLIC_DIR).sort();

  const logos = [];
  const customLogos = [];
  const customBgs = [];
  const videos = [];
  const screenshots = [];
  const other = [];

  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    if (BRAND_LOGO_RE.test(f) && IMAGE_EXTS.has(ext)) {
      logos.push(f);
    } else if (/^logo-/i.test(f) && IMAGE_EXTS.has(ext)) {
      customLogos.push(f);
    } else if (/^bg-/i.test(f) && IMAGE_EXTS.has(ext)) {
      customBgs.push(f);
    } else if (VIDEO_EXTS.has(ext)) {
      videos.push(f);
    } else if (IMAGE_EXTS.has(ext)) {
      screenshots.push(f);
    }
  }

  console.log("\n── Assets available in public/ ─────────────────────────────\n");

  if (videos.length) {
    console.log("📹 Videos (use with --video=):");
    videos.forEach((f) => console.log(`   public/${f}`));
  }
  if (screenshots.length) {
    console.log("\n🖼  Screenshots / images (use with --image= or --bg-image=):");
    screenshots.forEach((f) => console.log(`   public/${f}`));
  }
  if (customBgs.length) {
    console.log("\n🏞  Background images (use with --bg-image=):");
    customBgs.forEach((f) => console.log(`   public/${f}`));
  }
  if (logos.length) {
    console.log("\n🏷  Ashley brand logos (built-in, no flag needed):");
    logos.forEach((f) => console.log(`   public/${f}`));
  }
  if (customLogos.length) {
    console.log("\n✏️  Custom logos (use with --logo=):");
    customLogos.forEach((f) => console.log(`   public/${f}`));
  }

  console.log("\n────────────────────────────────────────────────────────────\n");
  return {logos, customLogos, customBgs, videos, screenshots};
}

// ── CLI entry point ──────────────────────────────────────────────
if (require.main === module) {
  const args = Object.fromEntries(
    process.argv
      .slice(2)
      .filter((a) => a.startsWith("--"))
      .map((a) => {
        const eq = a.indexOf("=");
        return [a.slice(2, eq), a.slice(eq + 1)];
      })
  );

  // ── Asset browser shortcut ──────────────────────────────────────
  if ("list-assets" in args) {
    listAssets();
    process.exit(0);
  }

  // ── Extract last frame for preview before full analysis ─────────
  if ("extract-frame" in args) {
    if (!args.video) {
      console.error("Error: --extract-frame requires --video=<path>");
      process.exit(1);
    }
    const timeSec = args["frame-time"] != null ? parseFloat(args["frame-time"]) : null;
    const framePath = extractLastFrame(args.video, timeSec);
    if (!framePath) {
      console.error("Error: Could not extract frame — check that ffmpeg is installed and the video path is correct.");
      process.exit(1);
    }
    // Copy to a fixed, predictable path so the skill can display it
    if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, {recursive: true});
    const previewPath = path.join(TMP_DIR, "preview-endcard.png");
    fs.copyFileSync(framePath, previewPath);
    console.log(`PREVIEW_FRAME:${previewPath}`);
    process.exit(0);
  }

  if ((!args.image && !args.video && !args.spec) || !args.name) {
    console.error(
      "Usage:\n" +
        "  node scripts/templatize.js --image=screenshot.png --name=MyEndCard\n" +
        "  node scripts/templatize.js --video=video.mp4 --name=MyEndCard\n" +
        "  node scripts/templatize.js --image=screenshot.png --video=video.mp4 --name=MyEndCard\n" +
        "  node scripts/templatize.js --spec=.spec-MyEndCard.json --name=MyEndCard\n" +
        "\nOverride options (can combine with any of the above):\n" +
        "  --logo=<path>        Custom logo image (PNG/JPG) — overrides Ashley brand logo\n" +
        "  --bg-image=<path>    Force this image as the background\n" +
        "  --bg-color=#hex      Force a solid background color\n" +
        "  --skip-write         Print generated code without writing files"
    );
    process.exit(1);
  }

  // Validate component name (must be valid TypeScript identifier)
  if (!/^[A-Z][A-Za-z0-9]*$/.test(args.name)) {
    console.error(
      `Error: --name must be a valid PascalCase identifier (e.g. "MyEndCard"), got: "${args.name}"`
    );
    process.exit(1);
  }

  // Validate bg-color format
  if (args["bg-color"] && !/^#[0-9a-fA-F]{3,8}$/.test(args["bg-color"])) {
    console.error(`Error: --bg-color must be a hex color (e.g. #1a2841), got: "${args["bg-color"]}"`);
    process.exit(1);
  }

  templatize({
    imagePath: args.image || null,
    videoPath: args.video || null,
    componentName: args.name,
    specPath: args.spec || null,
    skipWrite: "skip-write" in args,
    logoPath: args.logo || null,
    bgImagePath: args["bg-image"] || null,
    bgColor: args["bg-color"] || null,
  }).catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
}

module.exports = {templatize, listAssets, applyOverrides, findFontFiles, registerInRoot};
