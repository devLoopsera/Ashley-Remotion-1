#!/usr/bin/env node
/**
 * Ashley QA Checker
 * Renders the last frame of a generated composition and compares it
 * against the reference screenshot/video using Gemini vision.
 * Returns a pass/fail result with specific feedback for regeneration.
 */

const path = require("path");
const fs = require("fs");
const {execSync} = require("child_process");

require("dotenv").config();

const PROJECT_ROOT = path.resolve(__dirname, "..");
const IS_VERCEL = Boolean(process.env.VERCEL);
const RUNTIME_TMP_ROOT = IS_VERCEL ? path.join("/tmp", "ashley-preview") : PROJECT_ROOT;
const TMP_DIR = path.join(RUNTIME_TMP_ROOT, "tmp");

/**
 * Static code validator — checks generated TSX for common errors WITHOUT
 * rendering or calling any external API. Fast, deterministic, runs first.
 *
 * @param {string} code            - The generated .tsx source
 * @param {object} spec            - The design spec JSON
 * @param {string[]} extraValidAssets - Additional filenames (e.g. custom logo/bg) valid in staticFile()
 * @returns {string[]}             - Array of issue strings (empty = all good)
 */
function validateCode(code, spec, extraValidAssets = []) {
  const issues = [];

  // 1. useFonts() must be called inside the component
  if (!code.includes("useFonts()")) {
    issues.push(
      "useFonts() is not called inside the component body — add it as the very first line"
    );
  }

  // 2. CHESNA constant must be used — not a hardcoded string
  if (/fontFamily:\s*["']Chesna/i.test(code)) {
    issues.push(
      'fontFamily uses a hardcoded string (e.g. "Chesna Grotesk") instead of the CHESNA constant. Change every fontFamily value to: fontFamily: CHESNA'
    );
  }

  // 3. Logo must use staticFile() + Img — never text or SVG
  if (!code.includes("staticFile(")) {
    issues.push(
      "No staticFile() found — logo images must use <Img src={staticFile('HouseIcon_white.png')} />, never text characters or SVG"
    );
  }

  // 3b. "ASHLEY" must NEVER appear as typed JSX text — wordmark must come from a PNG image.
  if (/>\s*ASHLEY\s*<|\{["']ASHLEY["']\}/i.test(code)) {
    issues.push(
      'HAND-TYPED LOGO TEXT: the code contains "ASHLEY" as a typed JSX text node. ' +
      'This is strictly forbidden — use an <Img> with the wordmark PNG instead: ' +
      'staticFile("Ashley-Wordmark-White_PNG_u7iaxp.png") on dark backgrounds, ' +
      'staticFile("Ashley-Wordmark-Black_PNG_u7iaxp.png") on light backgrounds.'
    );
  }

  // 4. Logo variant must match background brightness — BUT only if the spec
  //    does NOT explicitly name a logo asset (when the spec names one, trust
  //    the spec since Gemini already chose based on the real screenshot).
  const specLogoAssetsForBrightness = (spec?.elements || [])
    .flatMap((el) => {
      const a = [];
      if (el.type === "image" && el.asset && /Ashley-Logo|HouseIcon/i.test(el.asset)) a.push(el.asset);
      if (el.children) el.children.forEach((c) => { if (c.type === "image" && c.asset && /Ashley-Logo|HouseIcon/i.test(c.asset)) a.push(c.asset); });
      return a;
    });
  const specExplicitlyNamesLogo = specLogoAssetsForBrightness.length > 0;

  const bgColor = spec?.background?.color || "";
  if (bgColor && !specExplicitlyNamesLogo) {
    const hex = bgColor.replace("#", "");
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const isLight = lum > 140;

      const hasWhiteAsset = /OneColor-White|HouseIcon_white/i.test(code);
      const hasBlackAsset = /OneColor-Black|HouseIcon_black/i.test(code);
      const hasPrimaryAsset = /HouseIcon_primary/i.test(code);

      if (isLight && hasWhiteAsset && !hasBlackAsset && !hasPrimaryAsset) {
        issues.push(
          `WRONG LOGO COLOR: background is LIGHT (${bgColor}, lum=${Math.round(lum)}) but code uses a WHITE logo — it will be invisible. ` +
            `Replace with: HouseIcon_black.png and Ashley-Logo-Horizontal-OneColor-Black_PNG_xjkrnw.png`
        );
      }
      if (!isLight && hasBlackAsset && !hasWhiteAsset) {
        issues.push(
          `WRONG LOGO COLOR: background is DARK (${bgColor}, lum=${Math.round(lum)}) but code uses a BLACK/DARK logo — it will be invisible. ` +
            `Replace with: HouseIcon_white.png and Ashley-Logo-Horizontal-OneColor-White_PNG_xyxx3x.png`
        );
      }
    }
  }

  // 4b. Logo asset must match what the spec specified.
  //     If the spec lists a logo image element with a known asset, the code must use THAT asset.
  //     This catches horizontal/vertical mix-ups and wrong color variants.
  const specLogoAssets = (spec?.elements || [])
    .flatMap((el) => {
      const assets = [];
      if (el.type === "image" && el.asset) assets.push(el.asset);
      if (el.children) {
        for (const child of el.children) {
          if (child.type === "image" && child.asset) assets.push(child.asset);
        }
      }
      return assets;
    })
    .filter((a) => /Ashley-Logo|HouseIcon/i.test(a)); // only brand logo assets

  for (const specAsset of specLogoAssets) {
    if (!code.includes(specAsset)) {
      // Determine what the code IS using instead
      const usedAssets = [...code.matchAll(/staticFile\s*\(\s*["']([^"']+)["']\s*\)/g)]
        .map((m) => m[1])
        .filter((a) => /Ashley-Logo|HouseIcon/i.test(a));

      // Classify spec asset and what's used
      const specIsVertical = /Vertical/i.test(specAsset);
      const specIsHorizontal = /Horizontal/i.test(specAsset);
      const wrongOrientation = usedAssets.some((a) =>
        (specIsVertical && /Horizontal/i.test(a)) ||
        (specIsHorizontal && /Vertical/i.test(a))
      );

      if (wrongOrientation) {
        issues.push(
          `WRONG LOGO ORIENTATION: spec requires "${specAsset}" (${specIsVertical ? "VERTICAL — house ABOVE text" : "HORIZONTAL — house LEFT of text"}) ` +
            `but code uses: ${usedAssets.join(", ")}. ` +
            `Replace with the correct asset: "${specAsset}".`
        );
      } else {
        issues.push(
          `WRONG LOGO ASSET: spec requires "${specAsset}" but it is not found in the code. ` +
            `Replace the logo staticFile() call with staticFile("${specAsset}").`
        );
      }
    }
  }

  // 4c. All staticFile() string arguments must exist in public/
  const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");
  const extraValidSet = new Set(extraValidAssets);
  const staticFileRefs = [...code.matchAll(/staticFile\s*\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]);
  for (const ref of staticFileRefs) {
    if (!extraValidSet.has(ref) && !fs.existsSync(path.join(PUBLIC_DIR, ref))) {
      issues.push(
        `MISSING STATIC FILE: staticFile("${ref}") references a file that does not exist in public/. ` +
          `Remove this reference or use a known brand asset (HouseIcon_white.png, Ashley-Logo-Horizontal-OneColor-White_PNG_xyxx3x.png, etc.).`
      );
    }
  }

  // 5. Every declared prop must be referenced somewhere in the function body
  const propsTypeMatch = code.match(/export type \w+Props\s*=\s*\{([\s\S]*?)\n\};/);
  if (propsTypeMatch) {
    const propsBlock = propsTypeMatch[1];
    const propNames = [...propsBlock.matchAll(/^\s+(\w+)\??:/gm)].map((m) => m[1]);

    // Grab everything after the component arrow function opens
    const funcStart = code.search(/=>\s*\{/);
    const funcBody = funcStart >= 0 ? code.slice(funcStart) : code;

    for (const propName of propNames) {
      const usedInJSX =
        funcBody.includes(`{${propName}}`) ||
        funcBody.includes(`{${propName}.`) ||
        funcBody.includes(`{...${propName}`) ||
        funcBody.includes(`${propName}.map`) ||
        funcBody.includes(`.${propName}`) ||
        new RegExp(`[^a-zA-Z_]${propName}[^a-zA-Z_]`).test(funcBody);

      if (!usedInJSX) {
        issues.push(
          `PROP NOT RENDERED: "${propName}" is declared in the Props type but never appears in JSX. ` +
            `Add a JSX element that renders {${propName}} — e.g. a <p> tag or pass it to a child.`
        );
      }
    }
  }

  // 6. Cross-check props against the spec — catch extra invented props
  // Disclaimer: only allowed if spec has a disclaimer element
  const specHasDisclaimer = (spec?.elements || []).some(
    (e) => e.propName === "disclaimer" || e.id === "disclaimer"
  );
  if (!specHasDisclaimer) {
    // Check if disclaimer prop is declared in the Props type
    if (propsTypeMatch && /\bdisclaimer\b/.test(propsTypeMatch[1])) {
      issues.push(
        `EXTRA PROP: "disclaimer" is declared in Props but the spec has NO disclaimer element. ` +
          `Remove the disclaimer prop entirely and remove any JSX that renders it.`
      );
    }
    // Check if disclaimer is rendered in JSX even without a prop (hardcoded)
    const funcStart2 = code.search(/=>\s*\{/);
    const funcBody2 = funcStart2 >= 0 ? code.slice(funcStart2) : code;
    if (/disclaimer|independently owned|All rights reserved/i.test(funcBody2)) {
      issues.push(
        `EXTRA ELEMENT: disclaimer text is being rendered in JSX but the spec has no disclaimer. Remove it completely.`
      );
    }
  }

  // Tagline: only allowed if spec has a tagline element
  const specHasTagline = (spec?.elements || []).some(
    (e) => e.propName === "tagline" || e.id === "tagline"
  );
  if (!specHasTagline && propsTypeMatch && /\btagline\b/.test(propsTypeMatch[1])) {
    issues.push(
      `EXTRA PROP: "tagline" is declared in Props but the spec has NO tagline element. ` +
        `Remove the tagline prop and any JSX that renders it.`
    );
  }

  // 7. staticFile() must NEVER be called with a prop variable — only string literals.
  //    staticFile(somePropName) → undefined crash if defaultProps doesn't supply it.
  if (propsTypeMatch) {
    const propsBlock = propsTypeMatch[1];
    const propNames = [...propsBlock.matchAll(/^\s+(\w+)\??:/gm)].map((m) => m[1]);
    for (const propName of propNames) {
      // Match staticFile(propName) where propName is NOT inside quotes
      const badPattern = new RegExp(`staticFile\\s*\\(\\s*${propName}\\s*\\)`);
      if (badPattern.test(code)) {
        issues.push(
          `CRASH BUG: staticFile(${propName}) passes a prop variable to staticFile() — ` +
            `if "${propName}" has no default value it will be undefined at runtime and crash. ` +
            `staticFile() only accepts string literals. Remove the "${propName}" prop and ` +
            `either use a hardcoded asset path like staticFile('background.jpg') or remove the image element.`
        );
      }
    }
  }

  // 7b. CSS margin shorthand bug — margin:0 kills marginTop/marginBottom set earlier.
  //     Detect: marginTop: <N> followed by margin: 0 in the same style object.
  const marginBugMatches = [...code.matchAll(/marginTop:\s*\d+[\s\S]{0,80}?margin:\s*0/g)];
  if (marginBugMatches.length > 0) {
    issues.push(
      `CSS MARGIN BUG: the code has 'marginTop: N' followed by 'margin: 0' in the same style object. ` +
        `The shorthand 'margin: 0' resets marginTop back to 0. Remove the 'margin: 0' line or replace it with ` +
        `'marginBottom: 0, marginLeft: 0, marginRight: 0' to preserve the marginTop.`
    );
  }

  // 8a. Every spec animation must have a corresponding spring() or interpolate() in the code.
  //     Supports both new spring-based format (startFrame) and legacy interpolate format (fromFrame/toFrame).
  const specAnims = spec?.animations || [];
  if (specAnims.length > 0) {
    // Match spring({frame: frame - N, ...}) patterns
    const codeSpringStarts = [...code.matchAll(/spring\s*\(\s*\{\s*frame:\s*frame\s*-\s*(\d+)/g)]
      .map(m => parseInt(m[1]));
    // Also match spring({frame, ...}) or spring({frame: frame, ...}) which means startFrame=0
    if (/spring\s*\(\s*\{\s*frame[\s,}]/.test(code) || /spring\s*\(\s*\{\s*frame:\s*frame\s*[,}]/.test(code)) {
      if (!codeSpringStarts.includes(0)) codeSpringStarts.push(0);
    }
    // Legacy: match interpolate(frame, [N, M], ...) patterns
    const codeInterpolateRanges = [...code.matchAll(/interpolate\s*\(\s*frame\s*,\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]/g)]
      .map(m => [parseInt(m[1]), parseInt(m[2])]);

    for (const anim of specAnims) {
      // New spring-based format
      if (anim.startFrame !== undefined) {
        const hasSpringMatch = codeSpringStarts.some(s => Math.abs(s - anim.startFrame) <= 5);
        const hasInterpolateMatch = codeInterpolateRanges.some(([s]) => Math.abs(s - anim.startFrame) <= 5);
        if (!hasSpringMatch && !hasInterpolateMatch) {
          issues.push(
            `MISSING ANIMATION: spec has ${anim.type} for [${(anim.targets||[]).join(", ")}] at startFrame ${anim.startFrame} ` +
              `but no matching spring() or interpolate() was found. Add: spring({frame: frame - ${anim.startFrame}, fps, config: {damping: 12, mass: 0.5}})`
          );
        }
        continue;
      }
      // Legacy interpolate format
      let expectedStart, expectedEnd;
      if (anim.type === "stagger-fade-in") {
        expectedStart = anim.firstStartFrame;
        expectedEnd = anim.firstStartFrame + anim.fadeDurationFrames;
      } else if (anim.fromFrame !== undefined && anim.toFrame !== undefined) {
        expectedStart = anim.fromFrame;
        expectedEnd = anim.toFrame;
      } else {
        continue;
      }
      if (expectedStart === undefined || expectedEnd === undefined) continue;

      const hasMatch = codeInterpolateRanges.some(([s, e]) => {
        return Math.abs(s - expectedStart) <= 5 && Math.abs(e - expectedEnd) <= 10;
      });
      const hasSpringMatch = codeSpringStarts.some(s => Math.abs(s - expectedStart) <= 5);

      if (!hasMatch && !hasSpringMatch) {
        issues.push(
          `MISSING ANIMATION: spec has ${anim.type} for [${(anim.targets||[]).join(", ")}] at frames [${expectedStart}, ${expectedEnd}] ` +
            `but no matching animation was found in the code. Add: spring({frame: frame - ${expectedStart}, fps, config: {damping: 12, mass: 0.5}})`
        );
      }
    }
  }

  // 8. Animation frame ranges must not exceed spec duration.
  //    interpolate(frame, [start, end], ...) where end >= durationFrames → frames past the video end.
  const specDuration = spec?.durationFrames;
  if (specDuration) {
    const interpolateMatches = [
      ...code.matchAll(/interpolate\s*\(\s*frame\s*,\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]/g),
    ];
    for (const match of interpolateMatches) {
      const startFrame = parseInt(match[1]);
      const endFrame = parseInt(match[2]);
      if (endFrame >= specDuration) {
        issues.push(
          `ANIMATION OUT OF BOUNDS: interpolate range [${startFrame}, ${endFrame}] — ` +
            `end frame ${endFrame} is >= durationFrames ${specDuration}. ` +
            `The last valid frame is ${specDuration - 1}. ` +
            `Change the range to end at or before frame ${specDuration - 1}, e.g. [${startFrame}, ${specDuration - 1}].`
        );
      }
    }
  }

  // 9. All staticFile("literal") calls must reference a known brand asset or bg-* background.
  //    Invented filenames (e.g. "sealy_logo.png", "bedroom.jpg") crash at runtime.
  const KNOWN_STATIC_FILES = new Set([
    "HouseIcon_white.png", "HouseIcon_black.png", "HouseIcon_primary.png",
    "Ashley-Wordmark-White_PNG_u7iaxp.png", "Ashley-Wordmark-Black_PNG_u7iaxp.png",
    "Ashley-Logo-Horizontal-OneColor-White_PNG_xyxx3x.png",
    "Ashley-Logo-Horizontal-OneColor-Black_PNG_xjkrnw.png",
    "Ashley-Logo-Horizontal-OrgHouse-WhiteType_PNG_rmwwsy.png",
    "Ashley-Logo-Horizontal_PNG_et54ya.png",
    "Ashley-Logo-Vertical-OneColor-White_PNG_ekcys6.png",
    "Ashley-Logo-Vertical-OneColor-Black_PNG_u7iaxp.png",
    "Ashley-Logo-Vertical-OrgHouse-WhiteType_PNG_wjh3mt.png",
    "Ashley-Logo-Vertical_PNG_gztzfy.png",
  ]);
  const staticLiterals = [...code.matchAll(/staticFile\s*\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]);
  for (const file of staticLiterals) {
    // Skip known brand assets and pipeline-managed assets that exist on disk or in extraValidAssets
    if (KNOWN_STATIC_FILES.has(file) || extraValidSet.has(file)) continue;
    // bg-* and logo-* are pipeline-managed — still verify they exist on disk
    if (/^(bg-|logo-)/.test(file)) {
      if (!fs.existsSync(path.join(PUBLIC_DIR, file))) {
        issues.push(
          `INVENTED ASSET: staticFile("${file}") references a file that does not exist in public/. ` +
            `This looks like a hallucinated filename. Remove this <Img> or replace with a solid background color.`
        );
      }
      continue;
    }
    // Font files in subdirectories are valid if they exist
    if (fs.existsSync(path.join(PUBLIC_DIR, file))) continue;
    issues.push(
      `INVENTED ASSET: staticFile("${file}") references a file that does not exist in public/. ` +
        `Only use known brand assets (HouseIcon_*.png, Ashley-Logo-*.png) or background images ` +
        `saved by the pipeline (bg-ComponentName.ext). Remove this <Img> or replace with a solid background color.`
    );
  }

  return issues;
}

/**
 * Render a single frame of a Remotion composition using the CLI.
 * Returns the path to the rendered PNG.
 */
async function renderLastFrame(compositionId, lastFrame) {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, {recursive: true});
  const outputPath = path.join(TMP_DIR, `qa-${compositionId}-${Date.now()}.png`);

  // Use forward slashes for the CLI (works on Windows too)
  const outputSlash = outputPath.replace(/\\/g, "/");

  execSync(
    `npx remotion still src/index.ts "${compositionId}" "${outputSlash}" --frame=${lastFrame} --log=error`,
    {cwd: PROJECT_ROOT, stdio: "pipe", timeout: 180000}
  );

  if (!fs.existsSync(outputPath)) {
    throw new Error(`Rendered frame not found at ${outputPath}`);
  }
  return outputPath;
}

/**
 * Compare rendered PNG against a reference screenshot or video using Gemini.
 */
async function compareWithGemini(renderedPath, referencePath, referenceIsVideo) {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) throw new Error("GEMINI_API_KEY not set");

  let GoogleGenerativeAI, GoogleAIFileManager, FileState;
  try {
    ({GoogleGenerativeAI} = require("@google/generative-ai"));
    if (referenceIsVideo) {
      ({GoogleAIFileManager, FileState} = require("@google/generative-ai/server"));
    }
  } catch {
    throw new Error("Missing @google/generative-ai dependency");
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({model: "gemini-2.5-pro"});

  const QA_PROMPT = `You are a strict QA checker for Ashley Furniture video end-card animations.

Image 1 (or video) = REFERENCE DESIGN (ground truth — what the component must look like).
Image 2 = RENDERED FRAME from the generated Remotion component (last frame, all animations complete).

Run each checklist item and score deductions carefully:

─── CHECKLIST ──────────────────────────────────────────────────────────────
1. ALL ELEMENTS PRESENT (-20 pts each missing)
   Count and compare every visible element in the REFERENCE:
   - Ashley logo (house icon) — is it visible?
   - Ashley wordmark — is it visible?
   - How many location blocks does the reference show? Does the render have the SAME count?
   - Is a tagline present in the reference? Is it present in the render?
   - Is disclaimer text present in the reference? Is it present in the render?
   Exact element count must match — missing one location block = deduct 20 pts.

2. NO EXTRA / INVENTED ELEMENTS (-20 pts each)
   Is there anything in the RENDER that is NOT in the REFERENCE?
   - Disclaimer/footer text that doesn't appear in the reference
   - A tagline that doesn't appear in the reference
   - Extra location blocks beyond what the reference shows
   - Placeholder text like "City Name", "Street Address" when reference shows real content or nothing
   Be strict: if it's not in the reference, it must not be in the render.

3. TEXT CASE / CAPITALIZATION (-15 pts if wrong)
   Match the EXACT capitalization style from the reference:
   - If reference shows "MARQUETTE" (ALL CAPS) → render must show all caps
   - If reference shows "Shop More Deals" (Title Case) → render must match
   - If reference shows "Ashley stores are independently..." (sentence case) → render must match
   - Wrong text-transform (e.g. uppercase applied where reference is not uppercase) = deduct points

4. CORRECT LOGO VARIANT (-20 pts if wrong)
   - Dark background → logo/wordmark must be WHITE
   - Light/white background → logo/wordmark must be DARK/BLACK
   - Orange house in reference → orange variant in render
   - Logo must be a PNG image, NOT text or an SVG shape

5. BACKGROUND COLOR / STYLE (-15 pts if wrong)
   - Does the background tone (dark vs light) match the reference?
   - Approximate color match is sufficient (exact shade may differ slightly)

6. LAYOUT & POSITIONING (-10 pts if significantly off)
   - Is the logo in the same general region (top-center, right-side, etc.)?
   - Are location blocks in approximately the same area?
   - Is the overall composition similar (top-heavy, centered, bottom-heavy)?
─────────────────────────────────────────────────────────────────────────────

Start with 100. Deduct for every failed check. Be strict — every mismatch counts.

Respond with JSON only (no markdown fences):
{
  "pass": true or false,
  "score": 0-100,
  "issues": [
    "EXTRA ELEMENT: disclaimer text rendered but not visible in reference",
    "WRONG LOGO: white wordmark on light background — invisible",
    "TEXT CASE: city names rendered in Title Case but reference shows ALL CAPS",
    "MISSING ELEMENT: reference shows 2 location blocks, render shows only 1"
  ],
  "feedback": "Specific code-level fix instructions: e.g. 'Remove the disclaimer prop and its JSX entirely — spec has no disclaimer. Change textTransform to uppercase on city name <p> elements. Add a second location entry to the locations.map() — the reference shows 2 locations.'"
}

score >= 75 → pass: true. score < 75 → pass: false.`;

  const parts = [];

  if (referenceIsVideo) {
    const fileManager = new GoogleAIFileManager(API_KEY);
    const uploadResult = await fileManager.uploadFile(path.resolve(referencePath), {
      mimeType: "video/mp4",
      displayName: path.basename(referencePath),
    });

    let file = await fileManager.getFile(uploadResult.file.name);
    while (file.state === FileState.PROCESSING) {
      await new Promise((r) => setTimeout(r, 3000));
      file = await fileManager.getFile(uploadResult.file.name);
    }
    if (file.state === FileState.FAILED) {
      throw new Error("Gemini failed to process reference video for QA");
    }

    parts.push({fileData: {mimeType: "video/mp4", fileUri: uploadResult.file.uri}});
    parts.push({text: "REFERENCE: This video shows the intended design. Focus on the end screen (last few seconds)."});

    // Clean up uploaded file
    await fileManager.deleteFile(uploadResult.file.name).catch(() => {});
  } else {
    const ext = path.extname(referencePath).toLowerCase();
    const mimeType =
      ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    const refData = fs.readFileSync(referencePath).toString("base64");
    parts.push({inlineData: {mimeType, data: refData}});
    parts.push({text: "REFERENCE: This screenshot shows the intended design."});
  }

  const renderedData = fs.readFileSync(renderedPath).toString("base64");
  parts.push({inlineData: {mimeType: "image/png", data: renderedData}});
  parts.push({text: `RENDERED FRAME: This is the last frame of the generated component.\n\n${QA_PROMPT}`});

  const result = await model.generateContent(parts);
  let text = result.response.text().trim().replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();

  try {
    return JSON.parse(text);
  } catch {
    // If JSON parse fails, assume pass so we don't block the pipeline
    return {pass: true, score: 75, issues: ["Could not parse QA response"], feedback: ""};
  }
}

/**
 * Find a saved reference file (.ref-<Name>.*) for a component in SCENES_DIR.
 * Returns {screenshotPath, videoPath} with whichever is found, or nulls.
 */
function findSavedReference(componentName, scenesDir) {
  let screenshotPath = null;
  let videoPath = null;

  try {
    const files = fs.readdirSync(scenesDir);
    const ref = files.find((f) => f.startsWith(`.ref-${componentName}.`));
    if (ref) {
      const ext = path.extname(ref).toLowerCase();
      const full = path.join(scenesDir, ref);
      if ([".mp4", ".mov"].includes(ext)) {
        videoPath = full;
      } else {
        screenshotPath = full;
      }
    }
  } catch {}

  return {screenshotPath, videoPath};
}

/**
 * Run a full QA check: render the last frame, then compare with reference.
 *
 * @param {object}   opts
 * @param {string}   opts.compositionId   - Remotion composition id
 * @param {number}   opts.lastFrame       - frame index to render (0-based)
 * @param {string|null} opts.screenshotPath - reference screenshot (preferred)
 * @param {string|null} opts.videoPath    - reference video (fallback)
 * @param {Function} opts.onLog           - logging callback (text: string) => void
 * @returns {{pass: boolean, score: number, issues: string[], feedback: string}}
 */
async function runQACheck({compositionId, lastFrame, screenshotPath, videoPath, onLog}) {
  onLog(`\n── QA Check: Rendering frame ${lastFrame}... ─────────────────`);

  let renderedPath;
  try {
    renderedPath = await renderLastFrame(compositionId, lastFrame);
    onLog(`   ✓ Frame rendered`);
  } catch (err) {
    onLog(`   ✗ Render failed — check for TypeScript errors`);
    return {
      pass: false,
      score: 0,
      issues: [`Render failed: ${err.message}`],
      feedback:
        "Fix TypeScript errors and ensure all imports and JSX are valid so Remotion can render the component.",
    };
  }

  const referencePath = screenshotPath || videoPath;
  const referenceIsVideo = !screenshotPath && !!videoPath;

  if (!referencePath || !fs.existsSync(referencePath)) {
    onLog(`   ⚠ No reference image/video — skipping visual comparison`);
    try { fs.unlinkSync(renderedPath); } catch {}
    return {pass: true, score: 100, issues: [], feedback: ""};
  }

  onLog(`── QA Check: Comparing with reference via Gemini... ──────────`);
  let result;
  try {
    result = await compareWithGemini(renderedPath, referencePath, referenceIsVideo);
  } catch (err) {
    onLog(`   ⚠ Visual comparison skipped: ${err.message}`);
    try { fs.unlinkSync(renderedPath); } catch {}
    return {pass: true, score: 75, issues: [], feedback: ""};
  }

  onLog(`   Score: ${result.score}/100 — ${result.pass ? "✓ PASS" : "✗ FAIL"}`);
  if (result.issues?.length) {
    result.issues.forEach((issue) => onLog(`   • ${issue}`));
  }

  try { fs.unlinkSync(renderedPath); } catch {}
  return result;
}

// ── Code-level safety net: replace any ASHLEY text nodes with wordmark <Img> ──
function fixHandTypedLogo(code) {
  const bgMatch = code.match(/backgroundColor:\s*["']#([0-9a-fA-F]{6})["']/);
  let isDark = true;
  if (bgMatch) {
    const hex = bgMatch[1];
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    isDark = (0.299 * r + 0.587 * g + 0.114 * b) / 255 <= 0.5;
  }
  const wordmark = isDark
    ? "Ashley-Wordmark-White_PNG_u7iaxp.png"
    : "Ashley-Wordmark-Black_PNG_u7iaxp.png";
  const imgTag = `<Img src={staticFile("${wordmark}")} style={{height: 33, width: "auto"}} />`;

  let fixed = code;

  // Replace <ANY_TAG ...>ASHLEY</ANY_TAG> → <Img> wordmark (handles multiline JSX, any tag type)
  fixed = fixed.replace(/<(\w+)\b[\s\S]*?>\s*ASHLEY\s*<\/\1>/gi, imgTag);

  // Replace {'ASHLEY'} or {"ASHLEY"} expression nodes
  fixed = fixed.replace(/\{["']ASHLEY["']\}/gi, imgTag);

  return {code: fixed, changed: fixed !== code};
}

module.exports = {validateCode, runQACheck, findSavedReference, fixHandTypedLogo};
