#!/usr/bin/env node
/**
 * Ashley Design Analyzer — two-pass pipeline
 *
 * Pass 1 (screenshot → layout): positions, sizes, colors, text content
 * Pass 2 (video → animations): what moves, when, how
 *
 * Usage:
 *   node scripts/analyze-design.js --image=public/screenshot.png --video=public/video.mp4
 *   node scripts/analyze-design.js --image=public/screenshot.png   (layout only, no animations)
 *   node scripts/analyze-design.js --video=public/video.mp4        (single-source fallback)
 */

const path = require("path");
const fs = require("fs");
const {spawnSync} = require("child_process");

// ffmpeg may be installed but not yet in PATH (e.g. winget installs require new shell).
// Resolve the binary once at startup, checking PATH then known install locations.
function resolveFfmpeg() {
  const result = spawnSync("ffmpeg", ["-version"], {stdio: "pipe"});
  if (!result.error) return "ffmpeg";
  const candidates = [
    process.env.FFMPEG_PATH,
    path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Packages",
      "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe",
      "ffmpeg-8.0.1-full_build", "bin", "ffmpeg.exe"),
    "C:\\ffmpeg\\bin\\ffmpeg.exe",
    "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
  ].filter(Boolean);
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c;
  }
  return "ffmpeg"; // fall back; will fail gracefully at call site
}
const FFMPEG_BIN = resolveFfmpeg();

require("dotenv").config();
const PROJECT_ROOT = path.resolve(__dirname, "..");
const IS_VERCEL = Boolean(process.env.VERCEL);
const RUNTIME_TMP_ROOT = IS_VERCEL ? path.join("/tmp", "ashley-preview") : PROJECT_ROOT;
const TMP_DIR = path.join(RUNTIME_TMP_ROOT, "tmp");
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.warn("Warning: GEMINI_API_KEY is not set. Analysis endpoints will fail until configured.");
}

function requireApiKey() {
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY is not set. Configure it in environment variables.");
  }
  return API_KEY;
}

// ── Pass 1: Layout prompt (screenshot only) ──────────────────────────────
const LAYOUT_PROMPT = `You are analyzing a screenshot of an Ashley Furniture commercial end screen.
Your job is to extract the STATIC LAYOUT — element positions, sizes, colors, and text content.
Do NOT describe any animations. Leave the animations array empty.

## STRICT: Only include elements you can DIRECTLY SEE in this screenshot
- If the logo is NOT visible → do NOT include logo-group, logo-icon, or logo-wordmark
- If there is NO tagline text → do NOT include the tagline element
- If there are NO store locations → do NOT include the locations element
- If there is NO disclaimer text → do NOT include the disclaimer element
- Do NOT add elements from memory, from other Ashley ads, or from "typical" end cards
- Do NOT guess or invent elements. Only describe what is unmistakably visible.
- Only measure values you can actually see — do not copy values from memory or examples
- Extract all text EXACTLY as it appears — verbatim, including capitalization

## BACKGROUND — MANDATORY RULE
- ALWAYS set background.type to "solid" and background.color to the dominant/overlay hex color
- NEVER set background.type to "image" — background photos are NOT available as files
- NEVER add a background.asset, background.imageFile, or any filename to the background object
- If the background is a room scene with NO solid overlay panel, extract the DARKEST dominant area color (not the scene average) — this ensures contrast with white/light text overlays
- The background color MUST have sufficient contrast with text element colors:
  - If text elements use white/light colors → background MUST be dark (e.g. #382A22, #1A1A1A, #2B1810)
  - If text elements use dark colors → background MUST be light
  - NEVER extract a mid-tone background (like #A59D96 or #8B6645) when text is white — that creates unreadable text

## IMAGE ELEMENTS — MANDATORY RULE
- ONLY include image elements for Ashley BRAND LOGO assets from the list below
- NEVER add image elements for: product photos, room scenes, partner logos (Sealy, Tempur-Pedic, etc.), or any non-Ashley-brand imagery — these files do not exist and will cause a crash

## LOGO — DEFAULT: SVG component house icon + ASHLEY wordmark
ALWAYS render the Ashley logo as TWO separate elements inside a logo-group.
NEVER add a text element with content "ASHLEY" — the wordmark is an SVG component, not typed text.

1. House icon element — type "svg-component", component "AshleyHouseIcon":
   - color "#E87722" — orange outlined house. DEFAULT — use unless clearly otherwise.
   - color "#FFFFFF" — white outlined house. Use only if the house is definitively all white.
   - color "#333333" — dark charcoal outlined house. Use only if definitively dark/black.

2. ASHLEY wordmark element — type "svg-component", component "AshleyWordmark":
   - color "#FFFFFF" — white wordmark. Use on DARK backgrounds.
   - color "#333333" — dark wordmark. Use on LIGHT backgrounds.

Layout direction — match what you see:
- House icon LEFT of wordmark → layout direction "row"
- House icon ABOVE wordmark → layout direction "column"

## LOCATIONS — MANDATORY RULE
Any group element that shows store location information (address, city, state, zip, phone) MUST always use the dynamic array structure below — even if the on-screen text is a static placeholder like "Street Address" or "City, State Zip":
- Set "isArrayProp": true and "propName": "locations" on the group
- Use an "itemTemplate" with children using "propPath" (NOT static "content")
- NEVER write the locations group as static children with hardcoded "content" strings
- The propPath for the street/address line MUST always be exactly "address" — never "address1", "streetAddress", "addressLine1", or any other name
- The propPath for the city/state line MUST always be exactly "city" — never "cityStateZip", "cityState", "location", or any other name
- ALSO populate textContent.locations with the ACTUAL text you can read from the image. For each store location visible, add: { "city": "EXACT CITY TEXT AS SHOWN", "address": "EXACT STREET ADDRESS AS SHOWN" }. If text is unreadable use [] — but NEVER use generic placeholders like "City Name" or "Street Address" in textContent.locations.

## HORIZONTAL POSITIONING — CRITICAL
Measure where the content sits horizontally on the 1920px-wide canvas:
- If ALL visible content (logo, text, locations) is centered on the full canvas width → use "centerHorizontal": true
- If content is offset to the RIGHT side (left edge of content block > ~900px) → use "leftPx": <measured left pixel position> instead of "centerHorizontal". Common for end cards with a product photo on the left and text on the right.
- If content is offset to the LEFT side → use "leftPx": <measured left pixel position>
- NEVER use "centerHorizontal": true when content clearly occupies only one side of the frame
- Apply the same horizontal positioning to ALL elements in the same content block (logo-group AND locations should share the same leftPx if they're aligned)

## Return ONLY valid JSON. No markdown, no explanation.

The schema below is a TEMPLATE showing possible elements — only include the ones actually visible:

{
  "durationFrames": 150,
  "fps": 30,
  "width": 1920,
  "height": 1080,
  "background": {
    "type": "solid",
    "color": "<measure the actual background hex color>"
  },
  "elements": [
    {
      "id": "logo-group",
      "type": "group",
      "position": { "topPercent": <0-100, measure where the logo sits vertically>, "centerHorizontal": true OR "leftPx": <measured pixel position if not centered> },
      "children": [
        {
          "id": "logo-icon",
          "type": "svg-component",
          "component": "AshleyHouseIcon",
          "props": { "color": "#E87722", "height": "<measure the house icon pixel height>" }
        },
        {
          "id": "logo-wordmark",
          "type": "svg-component",
          "component": "AshleyWordmark",
          "props": { "color": "#FFFFFF", "height": "<measure the ASHLEY wordmark pixel height>" }
        }
      ],
      "layout": { "direction": "<row if icon left of wordmark, column if icon above wordmark>", "gap": <measured gap between icon and wordmark>, "alignItems": "center" }
    },
    {
      "id": "tagline",
      "type": "text",
      "content": "<exact tagline text as shown>",
      "isTextProp": true,
      "propName": "tagline",
      "style": {
        "fontFamily": "Chesna Grotesk",
        "fontSize": <measure actual size>,
        "fontWeight": <400 or 600>,
        "color": "<exact hex or rgba>",
        "letterSpacing": "<measured value>",
        "textTransform": "uppercase"
      },
      "position": { "belowElement": "logo-group", "marginTop": <measured gap> }
    },
    {
      "id": "locations",
      "type": "group",
      "isArrayProp": true,
      "propName": "locations",
      "position": { "belowElement": "logo-group" OR "bottomPx": <measure distance from bottom edge>, "marginTop": <gap below previous element>, "centerHorizontal": true OR "leftPx": <measured pixel position if not centered> },
      "layout": { "direction": "row", "gap": <measure actual gap between locations>, "alignItems": "flex-start" },
      "itemTemplate": {
        "children": [
          {
            "id": "city",
            "type": "text",
            "propPath": "city",
            "style": {
              "fontFamily": "Chesna Grotesk",
              "fontSize": <measure>,
              "fontWeight": <400 or 600>,
              "color": "<hex>",
              "letterSpacing": "<measured>",
              "textTransform": "uppercase"
            }
          },
          {
            "id": "address",
            "type": "text",
            "propPath": "address",
            "style": {
              "fontFamily": "Chesna Grotesk",
              "fontSize": <measure>,
              "fontWeight": <400 or 600>,
              "color": "<hex>",
              "letterSpacing": "<measured>"
            }
          }
        ]
      }
    },
    {
      "id": "disclaimer",
      "type": "text",
      "content": null,
      "isTextProp": true,
      "propName": "disclaimer",
      "position": { "bottomPx": <measure>, "centerHorizontal": true },
      "style": {
        "fontFamily": "Chesna Grotesk",
        "fontSize": <measure>,
        "fontWeight": 400,
        "color": "<measured — usually semi-transparent white>",
        "letterSpacing": "<measured>",
        "textAlign": "center"
      }
    }
  ],
  "animations": [],
  "textContent": {
    "tagline": "<exact tagline text, or null if no tagline>",
    "disclaimer": "<full disclaimer text verbatim, or null if not visible>",
    "locations": []
  },
  "notes": "<any observations that don't fit the schema above>"
}

FINAL CHECK before returning: For every element in your "elements" array, confirm you can point to it in the screenshot. If you cannot see it, remove it.

Return ONLY the JSON. No other text.`;

// ── Pass 2: Animation prompt (inline frames at 5fps) ─────────────────────
function buildAnimationPrompt(layoutSpec, frameCount, fps = 10) {
  const elementIds = (layoutSpec.elements || []).map((e) => e.id);

  return `You are a motion graphics analyst helping build a Remotion (30fps React video) animation component for an Ashley Furniture commercial end screen.

You are looking at ${frameCount} sequential frames extracted at ${fps}fps from the LAST few seconds of a commercial video.
Each frame is labeled "Frame N = T s" where N is the frame index and T is the timestamp in seconds.

The clip may start with promotional content BEFORE the end screen. Your job is to:
1. Identify the EXACT frame/second where the end screen transition happens (background changes, elements start appearing)
2. Report when each element appears relative to the clip timestamps

Study the frames carefully to identify when each element first becomes visible.

## Elements present in the end screen
${elementIds.map((id) => `  - "${id}"`).join("\n")}

## IMPORTANT: Look carefully for the house icon scale-throb
Ashley end screens very commonly have the house icon ("logo-icon") scale up larger then shrink back to normal size right after it appears — this is called a "scale-throb" or "pulse". This happens QUICKLY, typically within 0.5–1.5 seconds of the logo first appearing. Compare consecutive frames closely: look for 2–5 frames where the house icon is noticeably LARGER than in the final resting state (even a 10–15% size increase counts), then returns to its resting size. Do NOT dismiss this as "fade-in" — if the icon gets bigger then smaller, that is a scale-throb. If you see this pattern, you MUST report it as postEffect: "scale-throb" on the logo-icon target.

## IMPORTANT: Look for logo stroke-draw / reveal animation
Some Ashley end screens show the house icon being drawn as a stroke outline (lines appear progressively, tracing the roof and walls), and the "ASHLEY" letters flying in from dispersed positions outward before settling. This is a "logo-reveal" animation — completely different from a fade-in or throb. Signs to look for:
- The house appears as an outline being drawn, not a filled icon fading in
- Letters appear to come from outside their resting positions, converging inward
- The animation takes 2–4 seconds and covers most of the screen
If you see this pattern on the logo or logo-group element, report it as type: "logo-reveal" (not "fade-in") and set postEffect: null.
The logo-reveal animation has 8 internal phases over ~5 seconds: (1) horizontal line extends, (2) left wall draws up, (3) roof draws across, (4) right wall draws down, (5) line retracts, (6) ASHLEY letters rise and disperse inward, (7) tagline bar expands, (8) house icon pulses. It is handled entirely by the AshleyLogoReveal component — no per-element spring/interpolate needed.

---

## STEP 1 — Describe what you observe
Write your observations inside <description> tags. For each element, state:
- At which frame/second it first appears
- How it enters (fading in, sliding up, scaling, etc.)
- Any post-entrance effects (throb, pulse)
Be specific. 3–6 sentences is fine.

---

## STEP 2 — Return a JSON array
After the </description> tag, return a JSON array. For each element (or group of simultaneous elements), provide:

\`\`\`json
{
  "targets": ["element-id-1", "element-id-2"],
  "appearsSec": 0.4,
  "entrance": "<one of the supported entrance types below>",
  "postEffect": null
}
\`\`\`

### Supported entrance types — CHOOSE CAREFULLY based on what you observe
- "fade-in" — element fades from invisible to visible WITHOUT changing position. Use ONLY if the element appears in the same spot where it ends up, with no movement at all.
- "slide-up" — element moves UPWARD into its final position while fading in. Look for the element appearing LOWER in one frame and HIGHER in the next. This is very common for text elements like taglines, locations, and disclaimers.
- "slide-in-left" — element moves from LEFT to RIGHT into its final position while fading in. Look for horizontal position shifting between frames.
- "slide-in-right" — element moves from RIGHT to LEFT into its final position while fading in. Look for horizontal position shifting between frames.
- "scale-in" — element grows from small/invisible to full size.
- "logo-reveal" — full choreographed logo draw animation (house stroke draw + letter disperse + tagline expand + icon pulse). ONLY for the logo or logo-group element. When this type is used, the code generator will replace the logo with AshleyLogoReveal component. Reference template: LogoValidation (150 frames, 8-phase animation).

### How to distinguish fade-in from slide animations
Compare the element's position across consecutive frames where it first appears:
- If the element's position is IDENTICAL across frames (only opacity changes) → "fade-in"
- If the element is slightly LOWER in earlier frames and moves UP → "slide-up"
- If the element shifts horizontally between frames → "slide-in-left" or "slide-in-right"
Slide animations are VERY COMMON in Ashley end screens, especially for location text and taglines. Do not default to "fade-in" unless you are confident there is zero positional movement.

### Supported postEffect types (optional, null if none)
- "scale-throb" — element scales up then back down (logo pulse)

### Rules
- \`appearsSec\` = the second when the element first starts to become visible
- Group elements into the same object ONLY if they appear in the exact same frame
- If elements appear at different times (even 0.2s apart) → separate objects
- targets must only contain IDs from the elements list above
- Return [] if no animations are clearly visible

Return the <description> block first, then the JSON array starting with [. Nothing else.`;
}

// ── Shared: upload video to Gemini File API ──────────────────────────────
async function uploadVideo(videoPath, fileManager, FileState) {
  const absPath = path.resolve(videoPath);
  console.log(`Uploading ${path.basename(absPath)} to Gemini File API...`);

  const uploadResult = await fileManager.uploadFile(absPath, {
    mimeType: "video/mp4",
    displayName: path.basename(absPath),
  });

  process.stdout.write("Processing");
  let file = await fileManager.getFile(uploadResult.file.name);
  while (file.state === FileState.PROCESSING) {
    await new Promise((r) => setTimeout(r, 5000));
    file = await fileManager.getFile(uploadResult.file.name);
    process.stdout.write(".");
  }
  console.log(" done.");

  if (file.state === FileState.FAILED) {
    throw new Error("Gemini failed to process the video.");
  }

  return {uri: uploadResult.file.uri, name: uploadResult.file.name};
}

// ── Extract frames at a given FPS using ffmpeg ───────────────────────────
// Returns array of {path, timeSec} or null if ffmpeg unavailable
function extractFramesAtFps(videoPath, fps = 5) {
  const tmpDir = path.join(TMP_DIR, `frames-${Date.now()}`);
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, {recursive: true});

  const result = spawnSync(
    FFMPEG_BIN,
    ["-i", path.resolve(videoPath), "-vf", `fps=${fps},scale=960:-2`, "-q:v", "2", path.join(tmpDir, "frame_%04d.png")],
    {stdio: "pipe", timeout: 60000}
  );

  if (result.status !== 0 || result.error) return null;

  const files = fs.readdirSync(tmpDir).filter(f => f.endsWith(".png")).sort();
  if (files.length === 0) return null;

  return files.map((f, i) => ({
    path: path.join(tmpDir, f),
    timeSec: parseFloat((i / fps).toFixed(2)),
  }));
}

// ── Focused throb detection: programmatic pixel-difference analysis ────────
// Crops the logo-icon region from frames, computes raw pixel differences
// between consecutive frames, and looks for a spike-then-settle pattern
// that indicates a scale-throb (icon grows then shrinks back).
// No AI needed — purely pixel math.
function detectLogoThrob(videoPath, layoutSpec, clipStartSec = null, clipEndSec = null) {
  // Only run if there's a logo-icon in the layout
  const hasLogoIcon = (layoutSpec.elements || []).some(
    el => el.id === "logo-icon" || (el.children || []).some(c => c.id === "logo-icon")
  );
  if (!hasLogoIcon) return false;

  console.log(`\n── Pass 2b: Pixel-based throb detection for logo-icon ───────`);

  // Determine a tight crop around the logo-icon area from layout spec
  const logoGroup = (layoutSpec.elements || []).find(el => el.id === "logo-group");
  const w = layoutSpec.width || 1920;
  const h = layoutSpec.height || 1080;

  let cropY, cropH, cropX, cropW;
  if (logoGroup && logoGroup.position && logoGroup.position.topPercent != null) {
    const topPx = Math.round((logoGroup.position.topPercent / 100) * h);
    // Tight crop around the icon area (icon is on the left side of the logo group)
    cropY = Math.max(0, topPx - 40);
    cropH = 200;
    // Icon is on the left side of a centered row layout — estimate position
    cropX = Math.max(0, Math.round(w / 2) - 350);
    cropW = 300;
  } else {
    cropY = Math.round(h * 0.25);
    cropH = Math.round(h * 0.25);
    cropX = Math.round(w * 0.3);
    cropW = Math.round(w * 0.4);
  }

  // Clip to the marker-defined range, or fall back to last 7s
  const clippedPath = clipToEndScreen(videoPath, 7, clipStartSec, clipEndSec);
  const analysisPath = clippedPath || videoPath;

  // Use ffmpeg to extract cropped frames as raw RGB data at 15fps
  // Output is a continuous byte stream: each frame = cropW * cropH * 3 bytes
  const cropFilter = `fps=15,crop=${cropW}:${cropH}:${cropX}:${cropY}`;
  const result = spawnSync(
    FFMPEG_BIN,
    ["-i", path.resolve(analysisPath), "-vf", cropFilter,
     "-pix_fmt", "rgb24", "-f", "rawvideo", "pipe:1"],
    {stdio: ["pipe", "pipe", "pipe"], timeout: 60000, maxBuffer: 100 * 1024 * 1024}
  );

  if (clippedPath) { try { fs.unlinkSync(clippedPath); } catch {} }

  if (result.status !== 0 || result.error || !result.stdout || result.stdout.length === 0) {
    console.log(`   ffmpeg raw extraction failed — skipping throb detection`);
    return false;
  }

  const frameSize = cropW * cropH * 3; // RGB24
  const totalFrames = Math.floor(result.stdout.length / frameSize);
  if (totalFrames < 20) {
    console.log(`   Only ${totalFrames} frames extracted — skipping`);
    return false;
  }

  console.log(`   Extracted ${totalFrames} cropped frames (${cropW}x${cropH}) at 15fps`);

  // Compute mean absolute pixel difference between consecutive frames
  const diffs = [];
  for (let i = 1; i < totalFrames; i++) {
    const prev = result.stdout.subarray((i - 1) * frameSize, i * frameSize);
    const curr = result.stdout.subarray(i * frameSize, (i + 1) * frameSize);
    let sum = 0;
    for (let p = 0; p < frameSize; p++) {
      sum += Math.abs(curr[p] - prev[p]);
    }
    diffs.push(sum / frameSize); // mean absolute diff per pixel
  }

  // Strategy: find the end screen transition (biggest spike), skip past it
  // until things settle, then look for a SECONDARY spike cluster = throb.

  // 1. Find the peak transition frame (biggest diff in second half of clip)
  const secondHalfStart = Math.floor(diffs.length / 2);
  let peakIdx = secondHalfStart;
  for (let i = secondHalfStart; i < diffs.length; i++) {
    if (diffs[i] > diffs[peakIdx]) peakIdx = i;
  }
  console.log(`   Transition peak at frame ${peakIdx} (diff=${diffs[peakIdx].toFixed(2)})`);

  // 2. Compute baseline from the LAST 20% of frames (should be fully settled)
  const tailStart = Math.floor(diffs.length * 0.85);
  const tailDiffs = diffs.slice(tailStart);
  const baseline = tailDiffs.reduce((s, d) => s + d, 0) / tailDiffs.length;
  const settleThreshold = Math.max(baseline * 3, 1.0);

  // 3. Skip forward from peak until diffs settle below threshold for 3+ frames
  let settledAt = -1;
  let consecutiveQuiet = 0;
  for (let i = peakIdx + 1; i < diffs.length; i++) {
    if (diffs[i] < settleThreshold) {
      consecutiveQuiet++;
      if (consecutiveQuiet >= 3) {
        settledAt = i - 2; // first quiet frame
        break;
      }
    } else {
      consecutiveQuiet = 0;
    }
  }

  if (settledAt < 0) {
    console.log(`   ✗ Never settled after transition — no throb detectable`);
    return false;
  }

  // 4. After settling, look for a secondary spike (the throb).
  // A throb at 15fps may appear as just 1-2 high-diff frames because the
  // scale change is fast (~0.3s). We accept even a single strong spike.
  const throbThreshold = Math.max(baseline * 5, 8.0);
  let postSettlePeak = 0;
  let postSettlePeakIdx = -1;
  const spikeFrames = [];
  for (let i = settledAt; i < diffs.length; i++) {
    if (diffs[i] > throbThreshold) {
      spikeFrames.push(i);
    }
    if (diffs[i] > postSettlePeak) {
      postSettlePeak = diffs[i];
      postSettlePeakIdx = i;
    }
  }

  console.log(`   Post-settle: settledAt=f${settledAt}, baseline=${baseline.toFixed(2)}, threshold=${throbThreshold.toFixed(2)}, spikes=${spikeFrames.length}, peak=f${postSettlePeakIdx}(${postSettlePeak.toFixed(2)})`);

  // Accept if: at least 1 spike that's much larger than baseline (>8x or >20 absolute)
  // AND the peak is clearly distinct from the transition (must be after settle + 3 frames)
  if (spikeFrames.length >= 1 && spikeFrames.length <= 15) {
    const strongThreshold = Math.max(baseline * 8, 20.0);
    const hasStrongSpike = spikeFrames.some(i => diffs[i] > strongThreshold);
    // Ensure the spikes form a tight cluster (not scattered noise)
    const span = spikeFrames.length > 1
      ? spikeFrames[spikeFrames.length - 1] - spikeFrames[0]
      : 0;
    if (hasStrongSpike && span <= 15) {
      const throbTimeSec = (spikeFrames[0] / 15).toFixed(2);
      console.log(`   ✓ Throb DETECTED at ~${throbTimeSec}s in clip (${spikeFrames.length} spike frame(s), peak=${postSettlePeak.toFixed(2)})`);
      return true;
    }
  }

  // 4b. Early-window search: throb often happens DURING/right after appearance
  // (before the full settle). Check the 2s window immediately after the peak.
  const earlyWindowEnd = Math.min(diffs.length, peakIdx + 1 + Math.round(2 * 15));
  const earlyThreshold  = Math.max(baseline * 4, 6.0);
  const earlyStrong     = Math.max(baseline * 6, 15.0);
  const earlySpikes = [];
  for (let i = peakIdx + 1; i < earlyWindowEnd; i++) {
    if (diffs[i] > earlyThreshold) earlySpikes.push(i);
  }
  if (earlySpikes.length >= 1 && earlySpikes.length <= 12) {
    const hasEarlyStrong = earlySpikes.some(i => diffs[i] > earlyStrong);
    const earlySpan = earlySpikes.length > 1 ? earlySpikes[earlySpikes.length - 1] - earlySpikes[0] : 0;
    if (hasEarlyStrong && earlySpan <= 12) {
      const throbTimeSec = (earlySpikes[0] / 15).toFixed(2);
      console.log(`   ✓ Throb DETECTED (early window) at ~${throbTimeSec}s in clip (${earlySpikes.length} spike frame(s))`);
      return true;
    }
  }

  console.log(`   ✗ No throb pattern found after end screen settled`);
  return false;
}

// ── Pass 1: Analyze layout from screenshot ───────────────────────────────
async function analyzeLayout(imagePath, {GoogleGenerativeAI}) {
  const absPath = path.resolve(imagePath);
  if (!fs.existsSync(absPath)) throw new Error(`File not found: ${absPath}`);

  const ext = path.extname(absPath).toLowerCase();
  const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

  console.log(`\n── Pass 1: Analyzing layout from screenshot ─────────────────`);
  console.log(`   ${path.basename(absPath)}`);

  const genAI = new GoogleGenerativeAI(requireApiKey());
  const model = genAI.getGenerativeModel({model: "gemini-2.5-pro"});

  const imageData = fs.readFileSync(absPath).toString("base64");
  const result = await model.generateContent([
    {inlineData: {mimeType, data: imageData}},
    {text: LAYOUT_PROMPT},
  ]);

  const raw = result.response.text().trim();
  const clean = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  let spec;
  try {
    spec = JSON.parse(clean);
  } catch {
    throw new Error(`Gemini returned invalid JSON for layout:\n${raw}`);
  }

  if (!spec.elements) throw new Error(`Layout spec missing elements:\n${JSON.stringify(spec, null, 2)}`);
  if (!spec.animations) spec.animations = [];

  console.log(`   ✓ Layout extracted (${spec.elements.length} elements)`);
  return spec;
}

// ── Pass 2: Analyze animations from video ────────────────────────────────
async function analyzeAnimations(videoPath, layoutSpec, {GoogleGenerativeAI, GoogleAIFileManager, FileState}, clipStartSec = null, clipEndSec = null) {
  console.log(`\n── Pass 2: Analyzing animations from video ──────────────────`);

  const genAI = new GoogleGenerativeAI(requireApiKey());
  const model = genAI.getGenerativeModel({model: "gemini-2.5-pro"});

  // Clip to marker range, or fall back to last 7s
  const clippedPath = clipToEndScreen(videoPath, 7, clipStartSec, clipEndSec);
  const analysisPath = clippedPath || videoPath;
  if (clippedPath) {
    const startLabel = clipStartSec != null ? clipStartSec.toFixed(1) + 's' : (clipEndSec != null ? '0s' : null);
    const endLabel   = clipEndSec   != null ? clipEndSec.toFixed(1)   + 's' : 'end';
    const rangeLabel = startLabel != null ? `${startLabel} → ${endLabel}` : `last 7s`;
    console.log(`   Clipped video to ${rangeLabel} for focused animation analysis`);
  } else {
    console.log(`   ffmpeg clip unavailable — using full video`);
  }

  // Extract at 10fps for high temporal resolution (70 frames for 7s clip).
  // This captures fast animations like the house icon throb (~0.3s).
  const frames = extractFramesAtFps(analysisPath, 10);

  let result;
  if (frames && frames.length > 0) {
    console.log(`   Extracted ${frames.length} frames at 10fps (${(frames.length / 10).toFixed(1)}s) — sending as inline images`);

    // Build inline image parts with timestamp labels
    const parts = [];
    for (const f of frames) {
      const imgData = fs.readFileSync(f.path).toString("base64");
      parts.push({inlineData: {mimeType: "image/png", data: imgData}});
      parts.push({text: `Frame ${frames.indexOf(f)} = ${f.timeSec}s`});
    }

    const prompt = buildAnimationPrompt(layoutSpec, frames.length, 10);
    parts.push({text: prompt});

    result = await model.generateContent(parts);

    // Clean up extracted frames
    for (const f of frames) { try { fs.unlinkSync(f.path); } catch {} }
    try { fs.rmdirSync(path.dirname(frames[0].path)); } catch {}
  } else {
    // Fallback: upload video to File API (1fps, less precise)
    console.log(`   Frame extraction unavailable — falling back to video upload (1fps)`);
    const fileManager = new GoogleAIFileManager(requireApiKey());
    const {uri, name} = await uploadVideo(analysisPath, fileManager, FileState);
    const prompt = buildAnimationPrompt(layoutSpec, 7, 1);
    result = await model.generateContent([
      {fileData: {mimeType: "video/mp4", fileUri: uri}},
      {text: prompt},
    ]);
    await fileManager.deleteFile(name).catch(() => {});
  }

  // Clean up the clip
  if (clippedPath) { try { fs.unlinkSync(clippedPath); } catch {} }

  const raw = result.response.text().trim();

  // Log the description block if present (helps with debugging)
  const descMatch = raw.match(/<description>([\s\S]*?)<\/description>/i);
  if (descMatch) {
    console.log(`\n   Animation observations:\n${descMatch[1].trim().split("\n").map(l => "   " + l).join("\n")}`);
  }

  // Extract JSON array from the response (the last [...] block)
  let jsonStr = null;
  const jsonMatch = raw.match(/(\[[\s\S]*\])/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  } else {
    // Fallback: strip markdown fences
    jsonStr = raw.replace(/<description>[\s\S]*?<\/description>/i, "").trim();
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  }

  let animations;
  try {
    animations = JSON.parse(jsonStr);
  } catch {
    console.log(`   Warning: Could not parse animation JSON, using empty animations.`);
    return [];
  }

  if (!Array.isArray(animations)) {
    console.log(`   Warning: Expected array, got ${typeof animations}. Using empty animations.`);
    return [];
  }

  // Normalize: shift all animations so the earliest one starts near frame 0.
  // The clip may include pre-end-screen content, so Gemini reports absolute times
  // within the clip. We want animations relative to when the end screen begins.
  if (animations.length > 0) {
    const minAppears = Math.min(...animations.map(a => a.appearsSec || 0));
    if (minAppears > 0.5) {
      console.log(`   Shifting animations by -${minAppears.toFixed(1)}s (end screen starts at ${minAppears.toFixed(1)}s in clip)`);
      for (const a of animations) {
        a.appearsSec = Math.max(0, (a.appearsSec || 0) - minAppears);
      }
    }
  }

  // If Gemini didn't detect a scale-throb on any logo element, run focused detection
  const hasThrobAlready = animations.some(
    a => a.postEffect === "scale-throb" && (a.targets || []).some(t => /logo/i.test(t))
  );
  if (!hasThrobAlready) {
    const throbDetected = detectLogoThrob(videoPath, layoutSpec, clipStartSec, clipEndSec);
    if (throbDetected) {
      const logoAnim = animations.find(a => (a.targets || []).some(t => /logo/i.test(t)));
      const logoAppearsSec = logoAnim ? (logoAnim.appearsSec || 0) : 0;
      animations.push({
        targets: ["logo-icon"],
        appearsSec: logoAppearsSec,
        entrance: "fade-in",
        postEffect: "scale-throb",
      });
    }
  }

  // Convert new simplified format to spring-based spec format
  const fps = layoutSpec.fps || 30;
  animations = animations.map(anim => convertToSpringSpec(anim, fps));

  console.log(`   ✓ Animations extracted (${animations.length} animation(s))`);
  return animations;
}

// ── Convert seconds fields to frame fields (legacy format) ─────────────────
function convertSecsToFrames(anim, fps) {
  const r = {...anim};
  const f = (s) => Math.round(s * fps);

  if (r.fromSec !== undefined)        { r.fromFrame = f(r.fromSec);        delete r.fromSec; }
  if (r.toSec   !== undefined)        { r.toFrame   = f(r.toSec);          delete r.toSec; }
  if (r.riseFromSec !== undefined)    { r.riseFromFrame = f(r.riseFromSec); delete r.riseFromSec; }
  if (r.peakSec     !== undefined)    { r.peakFrame     = f(r.peakSec);     delete r.peakSec; }
  if (r.fallToSec   !== undefined)    { r.fallToFrame   = f(r.fallToSec);   delete r.fallToSec; }
  if (r.firstStartSec   !== undefined) { r.firstStartFrame = f(r.firstStartSec);  delete r.firstStartSec; }
  if (r.fadeDurationSec !== undefined) { r.fadeDurationFrames = f(r.fadeDurationSec); delete r.fadeDurationSec; }
  if (r.delaySec        !== undefined) { r.delayFrames = f(r.delaySec);             delete r.delaySec; }

  return r;
}

// ── Convert new simplified animation format to spring-based spec ─────────
// Input:  { targets, appearsSec, entrance, postEffect }
// Output: { targets, type, startFrame, entrance, postEffect }
function convertToSpringSpec(anim, fps) {
  const startFrame = Math.round((anim.appearsSec || 0) * fps);
  return {
    targets: anim.targets || [],
    type: anim.entrance || "fade-in",
    startFrame,
    postEffect: anim.postEffect || null,
  };
}

// ── Post-processing: clamp animation frames to [0, durationFrames-1] ────
function normalizeAnimationFrames(spec) {
  const duration = spec.durationFrames || 150;
  const last = duration - 1;

  for (const anim of spec.animations || []) {
    // New spring-based format: just clamp startFrame
    if (anim.startFrame !== undefined) {
      anim.startFrame = Math.max(0, Math.min(anim.startFrame, last));
    }
    // Legacy: fade-in / slide-up / slide-in-left style
    if (anim.fromFrame !== undefined && anim.toFrame !== undefined) {
      if (anim.fromFrame > last || anim.toFrame > last) {
        const span = anim.toFrame - anim.fromFrame;
        anim.toFrame = last;
        anim.fromFrame = Math.max(0, last - span);
      }
    }
    // Legacy: scale-throb style
    if (anim.riseFromFrame !== undefined && anim.fallToFrame !== undefined) {
      if (anim.fallToFrame > last || anim.peakFrame > last) {
        const totalSpan = anim.fallToFrame - anim.riseFromFrame;
        const riseSpan = anim.peakFrame - anim.riseFromFrame;
        anim.fallToFrame = last;
        anim.riseFromFrame = Math.max(0, last - totalSpan);
        anim.peakFrame = anim.riseFromFrame + riseSpan;
      }
    }
  }
  return spec;
}

// ── Post-processing: deduplicate logo elements ────────────────────────────
// Horizontal/Vertical logo PNGs already contain the house icon + "ASHLEY" text.
// If the spec has BOTH a standalone HouseIcon AND a combined logo, drop the
// standalone HouseIcon to prevent rendering two house icons.
const COMBINED_LOGO_RE = /^Ashley-Logo-(Horizontal|Vertical)/i;
const STANDALONE_ICON_RE = /^HouseIcon_/i;

function deduplicateLogos(spec) {
  function dedup(elements) {
    if (!elements || elements.length === 0) return elements;

    // Check children of groups first (recurse)
    for (const el of elements) {
      if (el.children) el.children = dedup(el.children);
    }

    // Within this array, look for both a standalone icon and a combined logo
    const hasCombined = elements.some(el => el.type === "image" && el.asset && COMBINED_LOGO_RE.test(el.asset));
    if (!hasCombined) return elements;

    const before = elements.length;
    const filtered = elements.filter(el => {
      if (el.type === "image" && el.asset && STANDALONE_ICON_RE.test(el.asset)) {
        console.log(`   ⚠ Removed duplicate standalone "${el.asset}" — combined logo already includes the house icon`);
        return false;
      }
      return true;
    });

    // Also clean animation targets if we removed anything
    if (filtered.length < before) {
      const removedIds = new Set(
        elements.filter(el => !filtered.includes(el)).map(el => el.id)
      );
      for (const anim of spec.animations || []) {
        anim.targets = (anim.targets || []).filter(t => !removedIds.has(t));
      }
      spec.animations = (spec.animations || []).filter(a => a.targets.length > 0);
    }

    return filtered;
  }

  spec.elements = dedup(spec.elements);
  return spec;
}

// ── Post-processing: enforce split logo + contrast ──────────────────────────
function hexBrightness(hex) {
  const h = (hex || "#000000").replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return (r + g + b) / 3 / 255;
}

function flattenElements(elements) {
  const result = [];
  for (const el of elements || []) {
    result.push(el);
    if (el.children) result.push(...flattenElements(el.children));
    if (el.itemTemplate?.children) result.push(...flattenElements(el.itemTemplate.children));
  }
  return result;
}

function enforceLogoSplit(spec) {
  const bgColor = spec.background?.color || "#000000";
  const brightness = hexBrightness(bgColor);
  const isDark = brightness <= 0.50;

  // Walk spec.elements — find any combined logo assets and split them into SVG component refs
  function processElements(elements) {
    for (let i = 0; i < (elements || []).length; i++) {
      const el = elements[i];
      if (el.children) processElements(el.children);

      // If this is a combined logo image (Ashley-Logo-Horizontal-* or Ashley-Logo-Vertical-*), replace with preset SVG component
      if (el.type === "image" && el.asset && /Ashley-Logo-(Horizontal|Vertical)/.test(el.asset)) {
        const isVertical = /Vertical/.test(el.asset);
        const wordmarkHeight = el.size?.height || 60;
        const wordmarkColor = isDark ? "#FFFFFF" : "#333333";
        const preset = isVertical ? "AshleyVerticalLogo" : "AshleyHorizontalLogo";
        console.log(`   \u2713 Replaced combined logo "${el.asset}" \u2192 ${preset} SVG preset`);

        el.id = isVertical ? "logo-vertical" : "logo-horizontal";
        el.type = "svg-component";
        el.component = preset;
        el.props = {height: wordmarkHeight, iconColor: "#E87722", wordmarkColor};
        delete el.asset;
        el.size = {height: wordmarkHeight};
      }

      // If this is a PNG house icon or wordmark image, convert to SVG component ref
      if (el.type === "image" && el.asset && /^HouseIcon_/.test(el.asset)) {
        const iconColor = /white/i.test(el.asset) ? "#FFFFFF" : /black/i.test(el.asset) ? "#333333" : "#E87722";
        console.log(`   \u2713 Converted PNG "${el.asset}" \u2192 AshleyHouseIcon SVG component`);
        el.type = "svg-component";
        el.component = "AshleyHouseIcon";
        el.props = {color: iconColor, height: el.size?.height || 60};
        delete el.asset;
      }
      if (el.type === "image" && el.asset && /^Ashley-Wordmark-/.test(el.asset)) {
        const wordmarkColor = /White/i.test(el.asset) ? "#FFFFFF" : "#333333";
        console.log(`   \u2713 Converted PNG "${el.asset}" \u2192 AshleyWordmark SVG component`);
        el.type = "svg-component";
        el.component = "AshleyWordmark";
        el.props = {color: wordmarkColor, height: el.size?.height || 33};
        delete el.asset;
      }

      // Convert any ASHLEY text elements → SVG wordmark component (Gemini sometimes ignores the prompt)
      if (el.type === "text" && /^ashley$/i.test((el.content || "").trim())) {
        const wordmarkColor = isDark ? "#FFFFFF" : "#333333";
        console.log(`   \u2713 Converted ASHLEY text element "${el.id}" \u2192 AshleyWordmark SVG component`);
        el.id = el.id || "logo-wordmark";
        el.type = "svg-component";
        el.component = "AshleyWordmark";
        el.props = {color: wordmarkColor, height: 33};
        delete el.content;
        delete el.style;
        delete el.fontFamily;
        delete el.fontSize;
        delete el.color;
        delete el.letterSpacing;
        delete el.isTextProp;
        delete el.propName;
        delete el.asset;
      }
    }
  }

  processElements(spec.elements);

  // Contrast check — ensure text colors contrast with background
  for (const el of flattenElements(spec.elements)) {
    if (el.type === "text" && el.style?.color) {
      const textBr = hexBrightness(el.style.color);
      const contrast = Math.abs(brightness - textBr);
      if (contrast < 0.3) {
        const fixedColor = isDark ? "#FFFFFF" : "#333333";
        console.log(`   \u26A0 Low contrast: text "${el.id}" color ${el.style.color} on bg ${bgColor} \u2014 fixing to ${fixedColor}`);
        el.style.color = fixedColor;
      }
    }
  }

  return spec;
}

// ── Post-processing: strip non-brand image elements ───────────────────────
// Background photos (bedroom scenes, product shots) are not available as
// static assets — omit them so the generator doesn't reference missing files.
const KNOWN_BRAND_ASSETS = new Set([
  "HouseIcon_white.png",
  "HouseIcon_primary.png",
  "Ashley-Wordmark-White_PNG_u7iaxp.png",
  "Ashley-Wordmark-Black_PNG_u7iaxp.png",
  "Ashley-Logo-Horizontal-OneColor-White_PNG_xyxx3x.png",
  "Ashley-Logo-Horizontal_PNG_et54ya.png",
  "Ashley-Logo-Vertical-OneColor-White_PNG_ekcys6.png",
  "Ashley-Logo-Vertical-OrgHouse-WhiteType_PNG_wjh3mt.png",
]);

function stripUnknownImageElements(spec) {
  const removedIds = new Set();

  function filterElements(elements) {
    return (elements || []).filter((el) => {
      // Recurse into children first (groups, logo containers, etc.)
      if (el.children) {
        el.children = filterElements(el.children);
      }
      if (el.type === "image" && el.asset && !KNOWN_BRAND_ASSETS.has(el.asset)) {
        console.log(`   ⚠ Removed non-brand image element "${el.id}" (asset: ${el.asset}) — file not available`);
        removedIds.add(el.id);
        return false;
      }
      return true;
    });
  }

  spec.elements = filterElements(spec.elements);

  // Strip any invented background image reference (handles both .imageFile and .asset)
  if (spec.background) {
    const bgRef = spec.background.imageFile || spec.background.asset;
    if (spec.background.type === "image" && bgRef) {
      const bgPath = path.join(PUBLIC_DIR, bgRef);
      if (!fs.existsSync(bgPath)) {
        console.log(`   ⚠ Clearing non-existent background image "${bgRef}" — falling back to solid color`);
        delete spec.background.imageFile;
        delete spec.background.asset;
        spec.background.type = "solid";
        if (!spec.background.color) spec.background.color = "#000000";
      }
    }
  }

  if (removedIds.size > 0) {
    for (const anim of spec.animations || []) {
      anim.targets = (anim.targets || []).filter((t) => !removedIds.has(t));
    }
    spec.animations = (spec.animations || []).filter((a) => a.targets.length > 0);
  }
  return spec;
}

// ── Clip video to a specific range (or last N seconds) via ffmpeg ─────────
// clipStartSec / clipEndSec: explicit in/out points (takes priority over durationSecs)
// Returns path to clipped file, or null if ffmpeg unavailable
function clipToEndScreen(videoPath, durationSecs = 6, clipStartSec = null, clipEndSec = null) {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, {recursive: true});
  const ext = path.extname(videoPath) || ".mp4";
  const outPath = path.join(TMP_DIR, `end-clip-${Date.now()}${ext}`);

  let args;
  if (clipStartSec != null || clipEndSec != null) {
    // Explicit range from markers — treat missing start as 0
    const start = clipStartSec ?? 0;
    args = ["-ss", String(start)];
    if (clipEndSec != null) args.push("-to", String(clipEndSec));
    args.push("-i", path.resolve(videoPath), "-c", "copy", "-y", outPath);
  } else {
    // Legacy: last N seconds
    args = ["-sseof", `-${durationSecs}`, "-i", path.resolve(videoPath), "-c", "copy", "-y", outPath];
  }

  const result = spawnSync(FFMPEG_BIN, args, {stdio: "pipe"});

  if (result.status !== 0 || result.error || !fs.existsSync(outPath)) return null;
  return outPath;
}

// ── Extract last video frame via ffmpeg ───────────────────────────────────
// timeSec: absolute seek position in seconds (e.g. 12.5). When null, grabs 2s before end.
function extractLastFrame(videoPath, timeSec = null) {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, {recursive: true});
  const outPath = path.join(TMP_DIR, `last-frame-${Date.now()}.png`);

  const seekArgs = timeSec != null
    ? ["-ss", String(timeSec), "-i", path.resolve(videoPath)]
    : ["-sseof", "-0.5", "-i", path.resolve(videoPath)];

  const result = spawnSync(
    FFMPEG_BIN,
    [...seekArgs, "-frames:v", "1", "-q:v", "2", "-y", outPath],
    {stdio: "pipe"}
  );

  if (result.status !== 0 || result.error || !fs.existsSync(outPath)) return null;
  return outPath;
}

// ── Transcode video to H.264 MP4 for browser preview ─────────────────────
// Returns path to transcoded file, or null if ffmpeg fails.
function transcodeForBrowser(videoPath) {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, {recursive: true});
  const outPath = path.join(TMP_DIR, `browser-${Date.now()}.mp4`);
  const result = spawnSync(
    FFMPEG_BIN,
    ["-i", path.resolve(videoPath),
     "-c:v", "libx264", "-preset", "fast", "-crf", "28",
     "-c:a", "aac", "-movflags", "+faststart",
     "-y", outPath],
    {stdio: "pipe"}
  );
  if (result.status !== 0 || result.error || !fs.existsSync(outPath)) return null;
  return outPath;
}

// ── Combined: layout + animations ────────────────────────────────────────
async function analyzeDesign(imagePath, videoPath, clipStartSec = null, clipEndSec = null) {
  let GoogleGenerativeAI, GoogleAIFileManager, FileState;
  try {
    ({GoogleGenerativeAI} = require("@google/generative-ai"));
    ({GoogleAIFileManager, FileState} = require("@google/generative-ai/server"));
  } catch {
    console.error("Missing dependency. Run: npm install @google/generative-ai");
    process.exit(1);
  }

  const libs = {GoogleGenerativeAI, GoogleAIFileManager, FileState};

  if (imagePath && videoPath) {
    // ── Two-pass: screenshot → layout, video → animations ──
    const layoutSpec = await analyzeLayout(imagePath, libs);
    stripUnknownImageElements(layoutSpec);
    deduplicateLogos(layoutSpec);
    enforceLogoSplit(layoutSpec);
    const animations = await analyzeAnimations(videoPath, layoutSpec, libs, clipStartSec, clipEndSec);
    const spec = normalizeAnimationFrames({...layoutSpec, animations});
    return spec;
  } else if (imagePath) {
    // ── Layout from screenshot, no animation data ──
    const layoutSpec = await analyzeLayout(imagePath, libs);
    stripUnknownImageElements(layoutSpec);
    deduplicateLogos(layoutSpec);
    enforceLogoSplit(layoutSpec);
    // Default: simple fade-in for all elements
    const allIds = (layoutSpec.elements || []).map((e) => e.id);
    layoutSpec.animations = allIds.length
      ? [{targets: allIds, type: "fade-in", fromFrame: 0, toFrame: 20, easing: "easeOut"}]
      : [];
    return layoutSpec;
  } else if (videoPath) {
    // ── Video only: extract last frame with ffmpeg, then two-pass ──
    console.log(`\n── Video only — extracting last frame with ffmpeg ────────────`);
    const lastFrame = extractLastFrame(videoPath);
    if (lastFrame) {
      console.log(`   ✓ Last frame extracted → running two-pass analysis`);
      try {
        const layoutSpec = await analyzeLayout(lastFrame, libs);
        stripUnknownImageElements(layoutSpec);
        deduplicateLogos(layoutSpec);
        enforceLogoSplit(layoutSpec);
        const animations = await analyzeAnimations(videoPath, layoutSpec, libs, clipStartSec, clipEndSec);
        const spec = normalizeAnimationFrames({...layoutSpec, animations});
        return spec;
      } finally {
        try { fs.unlinkSync(lastFrame); } catch {}
      }
    } else {
      console.log(`   ℹ ffmpeg not found — falling back to single-source video analysis`);
      console.log(`   Tip: install ffmpeg for better layout accuracy (https://ffmpeg.org)`);
      return await analyzeFromVideo(videoPath, libs);
    }
  } else {
    throw new Error("analyzeDesign requires at least one of: imagePath, videoPath");
  }
}

// ── Single-source video analysis (fallback) ──────────────────────────────
const COMBINED_PROMPT = `You are analyzing an Ashley Furniture commercial end screen video.
Extract both the static layout AND the animations. Focus on the end screen (last few seconds).

## CRITICAL: Only describe what you can directly observe
- Only include elements that are visibly present
- Only include animations you can clearly see happening
- Extract all text EXACTLY as it appears verbatim
- Measure positions from what you see

## BACKGROUND — MANDATORY RULE
- ALWAYS set background.type to "solid" and background.color to the dominant/overlay hex color
- NEVER set background.type to "image" — background photos are NOT available as files
- NEVER add a background.asset, background.imageFile, or any filename to the background object
- If the background is a room scene or product photo, use the dominant color of any overlay as the solid color

## IMAGE ELEMENTS — MANDATORY RULE
- ONLY include image elements for Ashley BRAND LOGO assets from the list below
- NEVER add image elements for: product photos, room scenes, partner logos (Sealy, Tempur-Pedic, etc.), bedroom backgrounds, or any non-Ashley-brand imagery
- These files do not exist in the project and will cause a crash

## ANIMATION TIMING — use SECONDS
- Use seconds (not frame numbers) for all animation timing; the code will convert to frames
- All times are relative to the START of the end screen (time 0 = first frame of end screen)
- If elements all appear simultaneously → use "fade-in" with all targets
- If elements appear in sequence with noticeable delays → use "stagger-fade-in" (targets in ORDER of appearance)

## Supported animation types
Use seconds for all time fields (fromSec, toSec, riseFromSec, peakSec, fallToSec, firstStartSec, fadeDurationSec, delaySec):
- "fade-in": { targets, type, fromSec, toSec, easing }
- "stagger-fade-in": { targets (ordered), type, firstStartSec, fadeDurationSec, delaySec, easing }
- "scale-throb": { targets, type, riseFromSec, peakSec, peakScale, fallToSec, baseScale, easing }
- "slide-up": { targets, type, fromSec, toSec, startOffsetPx, easing }
- "slide-in-left": { targets, type, fromSec, toSec, startOffsetPx, easing }
- "slide-in-right": { targets, type, fromSec, toSec, startOffsetPx, easing }
- "scale-in": { targets, type, fromSec, toSec, easing }
- "fade-out": { targets, type, fromSec, toSec, easing }
Easing values: "easeOut", "easeIn", "easeInOut", "linear"

Return ONLY valid JSON with this structure (no markdown, no explanation):
{
  "durationFrames": <integer — end screen length only>,
  "fps": 30,
  "width": 1920,
  "height": 1080,
  "background": { "type": "solid", "color": "<dominant overlay hex color>" },
  "elements": [ ... ],
  "animations": [ ... ],
  "textContent": { "tagline": "<exact text>", "disclaimer": "<exact text or null>" },
  "notes": "<observations>"
}

## LOGO — DEFAULT: SVG component house icon + ASHLEY wordmark
Render the logo as TWO svg-component elements in a logo-group.
NEVER add a text element with content "ASHLEY" — the wordmark is an SVG component, not typed text.

1. House icon: type "svg-component", component "AshleyHouseIcon", props: { color: "#E87722" } (DEFAULT) or "#FFFFFF" / "#333333" if clearly that color
2. ASHLEY wordmark: type "svg-component", component "AshleyWordmark", props: { color: "#FFFFFF" } on DARK backgrounds, { color: "#333333" } on LIGHT backgrounds

Layout: "row" if icon is left of wordmark, "column" if icon is above wordmark.
Font: "Chesna Grotesk" (weights 400 and 600)
Return ONLY the JSON. No other text.`;

async function analyzeFromVideo(videoPath, {GoogleGenerativeAI, GoogleAIFileManager, FileState}) {
  const genAI = new GoogleGenerativeAI(requireApiKey());
  const model = genAI.getGenerativeModel({model: "gemini-2.5-pro"});
  const fileManager = new GoogleAIFileManager(requireApiKey());

  const {uri, name} = await uploadVideo(videoPath, fileManager, FileState);

  const result = await model.generateContent([
    {fileData: {mimeType: "video/mp4", fileUri: uri}},
    {text: COMBINED_PROMPT},
  ]);

  await fileManager.deleteFile(name).catch(() => {});

  const raw = result.response.text().trim();
  const clean = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  let spec;
  try {
    spec = JSON.parse(clean);
  } catch {
    throw new Error(`Gemini returned invalid JSON:\n${raw}`);
  }

  if (!spec.elements) throw new Error(`Spec missing elements:\n${JSON.stringify(spec, null, 2)}`);
  if (!spec.animations) spec.animations = [];
  stripUnknownImageElements(spec);
  deduplicateLogos(spec);
  enforceLogoSplit(spec);
  const fps = spec.fps || 30;
  spec.animations = spec.animations.map(a => convertSecsToFrames(a, fps));
  normalizeAnimationFrames(spec);
  return spec;
}

// ── CLI entry point ──────────────────────────────────────────────────────
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

  if (!args.image && !args.video) {
    console.error(
      "Usage:\n" +
        "  node scripts/analyze-design.js --image=screenshot.png --video=video.mp4\n" +
        "  node scripts/analyze-design.js --image=screenshot.png\n" +
        "  node scripts/analyze-design.js --video=video.mp4"
    );
    process.exit(1);
  }

  analyzeDesign(args.image || null, args.video || null)
    .then((spec) => {
      console.log("\n── Final Spec ───────────────────────────────────────────────");
      console.log(JSON.stringify(spec, null, 2));
      console.log("─────────────────────────────────────────────────────────────\n");
    })
    .catch((err) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
}

module.exports = {analyzeDesign, analyzeLayout, analyzeAnimations, extractLastFrame, transcodeForBrowser, enforceLogoSplit, clipToEndScreen};
