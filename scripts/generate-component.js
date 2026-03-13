#!/usr/bin/env node
/**
 * Ashley Component Generator
 * Takes a design spec JSON (from analyze-design.js) and uses Gemini API
 * to generate a complete, working Remotion TypeScript component.
 *
 * Usage:
 *   node scripts/generate-component.js --spec=.tmp-spec.json --name=MyEndCard
 */

const path = require("path");
const fs = require("fs");

require("dotenv").config();

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.warn("Warning: GEMINI_API_KEY is not set. Generation endpoints will fail until configured.");
}

function requireApiKey() {
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY is not set. Configure it in environment variables.");
  }
  return API_KEY;
}

// ── Few-shot example: EndCard24682 (the reference implementation) ──────────
const REFERENCE_COMPONENT = `
// REFERENCE EXAMPLE — EndCard24682.tsx
// This is a working, production-quality Ashley end card component.
// Generate code in the same style — using spring() for animations.

import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  AbsoluteFill,
  staticFile,
  spring,
  interpolate,
  Img,
} from "remotion";
import {CHESNA, useFonts} from "../loadFonts";

// Single combined logo — already contains both house icon + "ASHLEY" text
const ASHLEY_LOGO = "Ashley-Logo-Horizontal-OneColor-White_PNG_xyxx3x.png";

export const EndCard24682: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  useFonts();

  // All elements fade in with a spring starting at frame 0
  const fadeIn = spring({frame, fps, config: {damping: 12, mass: 0.5}});

  // Logo throbs after fade — spring starts at frame 20
  const throbProgress = spring({frame: frame - 20, fps, config: {damping: 8, mass: 0.6}});
  const logoThrob = interpolate(throbProgress, [0, 0.5, 1], [1.0, 1.45, 1.0]);

  return (
    <AbsoluteFill style={{backgroundColor: "#1a1008"}}>

      {/* ── LOGO + TAGLINE ── */}
      <div
        style={{
          position: "absolute",
          top: "44%",
          left: 0,
          right: 0,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: "translateY(-50%)",
        }}
      >
        {/* Logo — single combined image (house icon + ASHLEY text), throbs */}
        <div style={{opacity: fadeIn, transform: \`scale(\${logoThrob})\`}}>
          <Img
            src={staticFile(ASHLEY_LOGO)}
            style={{height: 120, width: "auto", display: "block"}}
          />
        </div>

        {/* Tagline */}
        <div
          style={{
            opacity: fadeIn,
            marginTop: 40,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <p
            style={{
              fontFamily: CHESNA,
              fontSize: 28,
              fontWeight: 400,
              color: "#FFFFFF",
              letterSpacing: "3px",
              textTransform: "uppercase",
              margin: 0,
              textAlign: "center",
            }}
          >
            Shop More Deals In-Store
          </p>
        </div>
      </div>

      {/* ── LOCATION COLUMNS ── */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: 0,
          right: 0,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: fadeIn,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 120,
          }}
        >
          {/* MARQUETTE */}
          <div style={{display: "flex", flexDirection: "column", alignItems: "center"}}>
            <p
              style={{
                fontFamily: CHESNA,
                fontSize: 52,
                fontWeight: 600,
                color: "#FFFFFF",
                letterSpacing: "2px",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              Marquette
            </p>
            <p
              style={{
                fontFamily: CHESNA,
                fontSize: 38,
                fontWeight: 400,
                color: "#FFFFFF",
                letterSpacing: "1px",
                margin: 0,
              }}
            >
              2152 US Hwy 41 W
            </p>
          </div>

          {/* ESCANABA */}
          <div style={{display: "flex", flexDirection: "column", alignItems: "center"}}>
            <p
              style={{
                fontFamily: CHESNA,
                fontSize: 52,
                fontWeight: 600,
                color: "#FFFFFF",
                letterSpacing: "2px",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              Escanaba
            </p>
            <p
              style={{
                fontFamily: CHESNA,
                fontSize: 38,
                fontWeight: 400,
                color: "#FFFFFF",
                letterSpacing: "1px",
                margin: 0,
              }}
            >
              2222 North Lincoln Road
            </p>
          </div>
        </div>

        {/* DISCLAIMER */}
        <div style={{marginTop: 60}}>
          <p
            style={{
              fontFamily: CHESNA,
              fontSize: 20,
              fontWeight: 400,
              color: "rgba(255,255,255,0.45)",
              letterSpacing: "0.3px",
              margin: 0,
              textAlign: "center",
            }}
          >
            Ashley stores are independently owned and operated. ©2024 Rogers Furniture, DBA Ashley. All rights reserved. Furniture since 1945.
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};
`.trim();

const SYSTEM_PROMPT = `You are an expert React/TypeScript developer specializing in Remotion (a React-based video framework).

You will receive a structured design spec JSON for an Ashley Furniture end screen and must generate a complete, working Remotion TypeScript component (.tsx file).

## Remotion Patterns You MUST Use

\`\`\`tsx
import {useCurrentFrame, useVideoConfig, AbsoluteFill, staticFile, spring, interpolate, Img} from "remotion";
import {CHESNA, useFonts} from "../loadFonts";

// Spring-based animations (preferred — natural motion, forgiving of timing):
const frame = useCurrentFrame();
const {fps} = useVideoConfig();

// Fade in starting at frame 12:
const fadeProgress = spring({frame: frame - 12, fps, config: {damping: 12, mass: 0.5}});
// Apply: style={{ opacity: fadeProgress }}

// Slide up starting at frame 24:
const slideProgress = spring({frame: frame - 24, fps, config: {damping: 14}});
const slideY = interpolate(slideProgress, [0, 1], [40, 0]);
// Apply: style={{ opacity: slideProgress, transform: \`translateY(\${slideY}px)\` }}

// Scale throb (postEffect) starting at frame 20:
const throbProgress = spring({frame: frame - 20, fps, config: {damping: 8, mass: 0.6}});
const throbScale = interpolate(throbProgress, [0, 0.5, 1], [1.0, 1.45, 1.0]);
// Apply: style={{ transform: \`scale(\${throbScale})\` }}

// Static assets:
<Img src={staticFile("filename.png")} style={{height: 120, width: "auto"}} />

// Font:
useFonts(); // call at top of component
// Use CHESNA constant for fontFamily
\`\`\`

## Implementing Animations from the Spec

The spec's \`animations\` array uses a spring-based format. Each animation has:
- \`targets\` — array of element IDs this animation applies to
- \`type\` — entrance type: "fade-in", "slide-up", "slide-in-left", "slide-in-right", "scale-in"
- \`startFrame\` — the frame number when the animation begins
- \`postEffect\` — optional post-entrance effect: "scale-throb" or null

### Animation type patterns (all use spring())

**"fade-in"** — element fades in
\`\`\`tsx
const fadeIn = spring({frame: frame - startFrame, fps, config: {damping: 12, mass: 0.5}});
// Apply: style={{ opacity: fadeIn }}
\`\`\`

**"slide-up"** — element slides up while fading in
\`\`\`tsx
const slideProgress = spring({frame: frame - startFrame, fps, config: {damping: 14}});
const slideY = interpolate(slideProgress, [0, 1], [40, 0]);
// Apply: style={{ opacity: slideProgress, transform: \`translateY(\${slideY}px)\` }}
\`\`\`

**"slide-in-left"** — element slides in from the left
\`\`\`tsx
const slideProgress = spring({frame: frame - startFrame, fps, config: {damping: 14}});
const slideX = interpolate(slideProgress, [0, 1], [-100, 0]);
// Apply: style={{ opacity: slideProgress, transform: \`translateX(\${slideX}px)\` }}
\`\`\`

**"slide-in-right"** — element slides in from the right
\`\`\`tsx
const slideProgress = spring({frame: frame - startFrame, fps, config: {damping: 14}});
const slideX = interpolate(slideProgress, [0, 1], [100, 0]);
// Apply: style={{ opacity: slideProgress, transform: \`translateX(\${slideX}px)\` }}
\`\`\`

**"scale-in"** — element scales from 0 to 1
\`\`\`tsx
const scaleProgress = spring({frame: frame - startFrame, fps, config: {damping: 12}});
// Apply: style={{ opacity: scaleProgress, transform: \`scale(\${scaleProgress})\` }}
\`\`\`

**postEffect: "scale-throb"** — add AFTER the entrance spring, on the same element
\`\`\`tsx
// Start throb ~20 frames after entrance begins
const throbProgress = spring({frame: frame - (startFrame + 20), fps, config: {damping: 8, mass: 0.6}});
const throbScale = interpolate(throbProgress, [0, 0.5, 1], [1.0, 1.45, 1.0]);
// Apply to the element's wrapper: style={{ transform: \`scale(\${throbScale})\` }}
\`\`\`

### Important animation rules
- EVERY animation in spec.animations MUST be implemented — do NOT skip any
- USE THE EXACT \`type\` FROM THE SPEC: if the spec says "slide-up", implement slide-up (translateY + opacity). If it says "slide-in-left", implement slide-in-left (translateX + opacity). Do NOT downgrade slide animations to plain fade-in.
- Each animation with a different startFrame MUST have its own spring() variable
- Read startFrame directly from spec.animations — do NOT invent new timings
- If the spec has no animations array or it is empty, default to a simple spring fade-in for all elements starting at frame 0
- ALWAYS import \`spring\` and \`useVideoConfig\` from "remotion" and call \`const {fps} = useVideoConfig()\`
- Use \`interpolate()\` only for mapping spring progress to transform values (translateY, translateX, scale ranges) — NOT for opacity (spring output 0→1 is already correct for opacity)
- For multiple elements with different start times, each MUST have its own spring() call
- When user feedback asks to add slide-in or slide-up animations, implement the correct pattern from the animation types above — do not ignore the request

## Available Brand Assets

### Font — default pattern (use UNLESS a CUSTOM FONT OVERRIDE is given)
\`\`\`tsx
import {CHESNA, useFonts} from "../loadFonts"; // default source of fonts
// Inside component:
useFonts(); // MUST be first line inside the component function
// In styles:
fontFamily: CHESNA
\`\`\`

### Custom Font Override (ONLY use when a CUSTOM FONT OVERRIDE instruction appears in the message)
When CUSTOM FONT OVERRIDE is provided, do NOT use CHESNA or useFonts(). Instead:
\`\`\`tsx
// Top of file (after remotion imports):
const CUSTOM_FONT = "Font Family Name"; // replaced with the override name
const _loadFont = async (): Promise<void> => {
  const font = new FontFace(CUSTOM_FONT, \`url(\${staticFile("path/to/font.woff2")})\`, {weight: "400", style: "normal"});
  await font.load();
  (document.fonts as unknown as {add: (f: FontFace) => void}).add(font);
};
// Inside component (first statements):
const [_fontHandle] = useState(() => delayRender("Loading font"));
useEffect(() => {
  _loadFont().then(() => continueRender(_fontHandle)).catch(() => continueRender(_fontHandle));
}, [_fontHandle]);
// In styles:
fontFamily: CUSTOM_FONT
\`\`\`
When CUSTOM FONT OVERRIDE is active: import useState and useEffect from "react"; import delayRender, continueRender from "remotion"; do NOT import CHESNA or useFonts.

### Logo — Split house icon + ASHLEY wordmark image (DEFAULT)

The spec will have a "logo-group" with TWO children, BOTH image elements:
1. "logo-icon" — HouseIcon_*.png (the house shape)
2. "logo-wordmark" — Ashley-Wordmark-*_PNG_u7iaxp.png (the standalone "ASHLEY" wordmark PNG)

STRICT RULE: Do NOT render "ASHLEY" as typed text in JSX. No <p>, <span>, <div>, or any element
whose text content is "ASHLEY" or "Ashley". Both parts of the logo are <Img> elements.

Render as a flex container matching the logo-group's layout direction:
- direction "row": house icon LEFT, wordmark RIGHT (side by side)
- direction "column": house icon on TOP, wordmark BELOW (stacked)

Example JSX for split logo:
  <div style={{display: "flex", flexDirection: "row", alignItems: "center", gap: 12}}>
    <Img src={staticFile("HouseIcon_primary.png")} style={{height: 60, width: "auto"}} />
    <Img src={staticFile("Ashley-Wordmark-White_PNG_u7iaxp.png")} style={{height: 33, width: "auto"}} />
  </div>

Available house icon files (NO text, outline only):
- "HouseIcon_primary.png" — orange (#E87722) outlined house. Most common.
- "HouseIcon_white.png"   — white outlined house on transparent bg
- "HouseIcon_black.png"   — dark charcoal (#333333) outlined house on transparent bg

Available wordmark files (the "ASHLEY" text as a PNG image):
- "Ashley-Wordmark-White_PNG_u7iaxp.png"  — white wordmark. Use on DARK backgrounds.
- "Ashley-Wordmark-Black_PNG_u7iaxp.png"  — dark wordmark. Use on LIGHT backgrounds.

LEGACY: If the spec still uses a combined logo file (Ashley-Logo-Horizontal-* or Ashley-Logo-Vertical-*), render it as a single <Img> only — these already contain both icon + wordmark in one image.

## Text Color — Readability Rule
If any text element in the spec has a very light color (e.g. #CFCFCF, #C1C1C1, #BEBEBE, #D0D0D0 or similar near-white grays) and the background is also light (e.g. #F7F7F7, #FFFFFF, #EEEEEE), that color was likely extracted from placeholder/watermark text in the reference video and will be nearly invisible. In this case, substitute a legible color: use #333333 on light backgrounds, #FFFFFF on dark backgrounds. Apply this rule to ALL text elements (address, city, tagline, disclaimer, etc.) — not just location text.

## Rules
1. ALL text content (tagline, city names, addresses, disclaimer) MUST be TypeScript props — never hardcoded
2. The component must export a named TypeScript type \`[ComponentName]Props\`
3. The component must export a named React component
4. Use AbsoluteFill ONLY as the root element or for true full-screen layers (background image, full-screen overlay). For individual positioned elements (logo, text, buttons) use a plain \`<div style={{position:"absolute", top:N, left:N, width:N}}>\` — NEVER AbsoluteFill for individual elements. AbsoluteFill always stretches to the canvas bottom-right corner which distorts non-full-screen content.
5. Use only inline styles (no CSS modules, no styled-components)
6. Never use \`position: "fixed"\` — use \`position: "absolute"\`
7. ALWAYS call \`useFonts()\` as the very first statement inside the component function body
8. For locations array, always render them dynamically from props using .map()
9. DISCLAIMER RULE — read carefully:
   - Only include a \`disclaimer\` prop IF the spec's elements array contains an element with id "disclaimer" or propName "disclaimer"
   - If the spec has NO disclaimer element → do NOT add a disclaimer prop, do NOT render any disclaimer JSX, do NOT add any footer text
   - If the spec HAS a disclaimer element → include the prop and render it in JSX
10. Output ONLY the .tsx file content — no explanation, no markdown fences
11. LOGO RENDERING — READ CAREFULLY:
   - DEFAULT (split logo): If the spec has "logo-icon" (HouseIcon_*.png) AND "logo-wordmark" (Ashley-Wordmark-*_PNG_u7iaxp.png) as siblings in a logo-group, render BOTH as <Img> elements. NEVER render the wordmark as a <p>, <span>, or any text node.
   - LEGACY (combined logo): If the spec has a single image with Ashley-Logo-Horizontal-* or Ashley-Logo-Vertical-*, render ONE <Img> only — these already contain both icon + wordmark.
   - NEVER render a HouseIcon ALONGSIDE a combined Ashley-Logo file — that creates a duplicate.
   - NEVER render the Ashley logo as SVG or hand-drawn shapes. Use ONLY staticFile() + <Img>.
   - NEVER type "ASHLEY" or "Ashley" as JSX text characters. The wordmark is always a PNG image.
12. SPEC-ONLY ELEMENTS: Only render elements that exist in the spec. Do NOT add elements from the reference example or from memory (no extra taglines, disclaimers, location blocks, or decorative text unless the spec lists them).
13. RENDER ALL ELEMENTS: Every element in the spec MUST appear in the JSX. Do not skip any.
14. EVERY PROP MUST BE RENDERED: If a prop is declared it MUST appear in the JSX. Never declare a prop and leave it unused.
15. TEXT CASE: Preserve the exact text-transform/capitalization from the spec. If the spec shows \`textTransform: "uppercase"\`, use it. If it shows no transform, render as-is. Never add uppercase transforms that aren't in the spec.
16. CSS MARGIN BUG — NEVER use shorthand \`margin: 0\` on an element that also needs \`marginTop\`, \`marginBottom\`, etc. The shorthand resets ALL sides to 0, killing directional margins. Instead use \`marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0\` individually, or just set the ones you need.
17. SELF-CHECK before outputting: (a) useFonts() called, (b) every spec element has JSX, (c) no elements added beyond the spec, (d) every prop is rendered, (e) correct logo variant for background brightness, (f) disclaimer only present if spec includes it, (g) if background.type is "image" and background.imageFile is set, a full-screen Img renders it, (h) no \`margin: 0\` that kills a needed marginTop/marginBottom
17. BACKGROUND — CRITICAL, read carefully:
   - If spec.background.type is "solid": use EXACTLY spec.background.color as the backgroundColor on the root AbsoluteFill. NEVER substitute '#000000' or any other value. If spec.background.color is '#382A22', write backgroundColor: '#382A22'. No exceptions.
   - If spec.background.type is "image" and spec.background.imageFile is set (e.g. "bg-MyCard.png"), render it as a full-screen background:
     \`\`\`tsx
     <AbsoluteFill>
       <Img src={staticFile("bg-MyCard.png")} style={{width:"100%",height:"100%",objectFit:"cover"}} />
     </AbsoluteFill>
     \`\`\`
   - Use the EXACT imageFile string from the spec as the staticFile() argument — it is a known asset
   - Do NOT create a prop for the background image filename
   - If spec.background.type is "image" but imageFile is NOT set, fall back to backgroundColor using spec.background.color (same rule as solid — use the exact color value)
18. staticFile() ONLY ACCEPTS KNOWN BRAND ASSET STRING LITERALS — nothing else:
   - CORRECT: \`staticFile("HouseIcon_white.png")\`, \`staticFile("Ashley-Logo-Horizontal-OneColor-White_PNG_xyxx3x.png")\`
   - WRONG: \`staticFile(backgroundImage)\`, \`staticFile(imageFile)\`, \`staticFile("Bedroom-Background_l8g4m8.jpg")\`, \`staticFile("Sealy-Posturepedic-Logo.png")\`
   - ONLY these filenames are valid in staticFile(): HouseIcon_white.png, HouseIcon_black.png, HouseIcon_primary.png, Ashley-Logo-Horizontal-OneColor-White_PNG_xyxx3x.png, Ashley-Logo-Horizontal-OneColor-Black_PNG_xjkrnw.png, Ashley-Logo-Horizontal-OrgHouse-WhiteType_PNG_rmwwsy.png, Ashley-Logo-Horizontal_PNG_et54ya.png, Ashley-Logo-Vertical-OneColor-White_PNG_ekcys6.png, Ashley-Logo-Vertical-OneColor-Black_PNG_u7iaxp.png, Ashley-Logo-Vertical-OrgHouse-WhiteType_PNG_wjh3mt.png, Ashley-Logo-Vertical_PNG_gztzfy.png, any bg-*.png/jpg listed under spec.background.imageFile, and any logo-*.png/jpg provided in a CUSTOM LOGO OVERRIDE instruction
   - Any other filename in staticFile() will crash at runtime — DO NOT use it
   - NEVER create any prop whose value gets passed directly into staticFile()
   - If the spec shows a partner logo (Sealy, Tempur-Pedic, etc.) or background photo — render a colored div instead, do NOT use staticFile()

## Reference Implementation
Here is a complete working example to match in style:

${REFERENCE_COMPONENT}`;

async function generateComponent(spec, componentName, options = {}) {
  const {feedback, existingCode, history, customLogoFile, customFontFamily, customFontFiles, initialInstructions} = options;

  let GoogleGenerativeAI;
  try {
    ({GoogleGenerativeAI} = require("@google/generative-ai"));
  } catch {
    console.error("Missing dependency. Run: npm install @google/generative-ai");
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(requireApiKey());
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-pro",
    systemInstruction: SYSTEM_PROMPT,
  });

  let userMessage;

  // Custom logo instruction injected into every message type
  const customLogoInstruction = customLogoFile
    ? `\n\nCUSTOM LOGO OVERRIDE: Use staticFile("${customLogoFile}") for ALL logo images. ` +
      `This file exists in public/. Replace every Ashley brand logo asset (HouseIcon_*.png, Ashley-Logo-*.png) with staticFile("${customLogoFile}"). ` +
      `Do NOT use any other logo filenames.`
    : "";

  // Custom font instruction injected into every message type
  const customFontInstruction = (customFontFamily && customFontFiles && customFontFiles.length > 0)
    ? `\n\nCUSTOM FONT OVERRIDE: Do NOT use CHESNA or useFonts(). Use "${customFontFamily}" as the font family.\n` +
      `Load it inline at the top of the component file:\n` +
      `  const CUSTOM_FONT = "${customFontFamily}";\n` +
      `  const _loadFont = async (): Promise<void> => {\n` +
      `    const font = new FontFace(CUSTOM_FONT, \`url(\${staticFile("${customFontFiles[0]}")})\`, {weight: "400", style: "normal"});\n` +
      `    await font.load(); (document.fonts as unknown as {add: (f: FontFace) => void}).add(font);\n` +
      `  };\n` +
      `In the component body (first statements):\n` +
      `  const [_fontHandle] = useState(() => delayRender("Loading font"));\n` +
      `  useEffect(() => { _loadFont().then(() => continueRender(_fontHandle)).catch(() => continueRender(_fontHandle)); }, [_fontHandle]);\n` +
      `Add imports: useState, useEffect from "react"; delayRender, continueRender from "remotion".\n` +
      `Use fontFamily: CUSTOM_FONT for all text styles. Do NOT import CHESNA or call useFonts().`
    : "";

  if (feedback && existingCode) {
    // ── Regeneration with user feedback ──────────────────────────
    console.log("Applying feedback with Gemini API...");
    const historyBlock = (history && history.length > 0)
      ? `\nPrevious changes already applied (for context — do NOT revert them):\n` +
        history.map((h, i) => `  ${i + 1}. "${h}"`).join("\n") + "\n"
      : "";
    userMessage = `Here is the current Remotion component "${componentName}":

\`\`\`tsx
${existingCode}
\`\`\`
${historyBlock}
Now apply this new change: "${feedback}"${customLogoInstruction}${customFontInstruction}

Update the component to incorporate the new change while preserving all previously applied changes. You MAY and SHOULD change position values (top, left, right, bottom), sizes (width, height, fontSize), spacing (margin, padding, gap), colors, and any other visual properties when the user requests it. Only keep the props interface and component name unchanged.

Do NOT change any staticFile() asset filenames unless the user explicitly asks to change the logo or background.

LOGO SPLITTING RULE: If the user asks to animate ONLY the house icon (e.g. "only the house icon should throb/scale/pulse"), and the component currently uses a combined Ashley logo image (Ashley-Logo-Vertical_*.png or Ashley-Logo-Horizontal_*.png), implement EXACTLY as follows — no exceptions:

STEP 1 — Choose the correct standalone icon based on the combined logo FILENAME already in the component (NOT based on background color):
- Filename contains "White" or "WhiteType" → use HouseIcon_white.png
- Filename contains "Black" or "OneColor-Black" → use HouseIcon_black.png
- Filename is Ashley-Logo-Vertical_PNG_gztzfy.png or Ashley-Logo-Horizontal_PNG_et54ya.png → use HouseIcon_primary.png

STEP 2 — Use position:absolute overlay, NOT cropping. Wrap the combined logo in a position:relative container. Place the animated standalone HouseIcon as position:absolute on top of the icon portion of the combined logo. The combined logo stays FULL SIZE and UNCHANGED — it provides the ASHLEY wordmark. The animated HouseIcon visually covers the static icon in the combined logo.

Example for a VERTICAL combined logo (icon at top, ASHLEY text at bottom):
  <div style={{position: 'relative', display: 'inline-block'}}>
    <Img src={staticFile('Ashley-Logo-Vertical-OneColor-White_PNG_ekcys6.png')} style={{width: 250, height: 'auto'}} />
    <div style={{position: 'absolute', top: 0, left: '50%', transform: \`translateX(-50%) scale(\${throbScale})\`}}>
      <Img src={staticFile('HouseIcon_white.png')} style={{width: 80, height: 'auto'}} />
    </div>
  </div>

Example for a HORIZONTAL combined logo (icon on left, ASHLEY text on right):
  <div style={{position: 'relative', display: 'inline-block'}}>
    <Img src={staticFile('Ashley-Logo-Horizontal-OneColor-White_PNG_xyxx3x.png')} style={{height: 55, width: 'auto'}} />
    <div style={{position: 'absolute', top: '50%', left: 0, transform: \`translateY(-50%) scale(\${throbScale})\`}}>
      <Img src={staticFile('HouseIcon_white.png')} style={{height: 55, width: 'auto'}} />
    </div>
  </div>

Adjust the HouseIcon size to visually match the icon portion of the specific combined logo used.

ALREADY-SPLIT CORRECTION RULE: If the component already has a standalone HouseIcon (HouseIcon_*.png) but it is using the WRONG color or using objectFit/objectPosition/clipPath on any logo image, you MUST fix it:
- Re-derive the correct HouseIcon filename from STEP 1 (use the combined logo filename still present in the component)
- Replace any objectFit, objectPosition, clipPath, or overflow:hidden on logo images with the position:absolute overlay structure shown above
- This correction applies even if the user's feedback is about something else entirely

SPLIT WORDMARK CORRECTION: If the component uses a split logo (HouseIcon_*.png alongside ASHLEY text), and "ASHLEY" appears as typed text (<p>, <span>, <div>, or any text element), REPLACE the text element with: <Img src={staticFile("Ashley-Wordmark-White_PNG_u7iaxp.png")} style={{height: 33, width: "auto"}} /> (use Ashley-Wordmark-Black_PNG_u7iaxp.png on light backgrounds instead). This correction applies even if the user's feedback is about something else entirely.

ABSOLUTELY FORBIDDEN:
- Do NOT type "ASHLEY" or any logo text as JSX characters. No <p>, <div>, <span>, or any element with literal text "ASHLEY" or "Ashley". ALL logo text must come from image assets only.
- Do NOT change the combined logo to a different filename.
- Do NOT use objectFit, objectPosition, clipPath, or overflow:hidden on any logo image.
- Do NOT choose the HouseIcon color based on background color — always derive from the logo filename per STEP 1.

Output ONLY the complete updated .tsx file content.`;
  } else {
    // ── Initial generation from spec ─────────────────────────────
    console.log("Generating Remotion component with Gemini API...");
    userMessage = `Generate a Remotion TypeScript component named "${componentName}" from this design spec:

${JSON.stringify(spec, null, 2)}

Component name: ${componentName}
Export type name: ${componentName}Props

Requirements:
- Match the visual design from the spec (colors, font sizes, spacing, positions)
- Implement all animations from the spec (timing, easing, scale values)
- All text content becomes typed props
- locations should be typed as Array<{city: string; address: string}>
- DISCLAIMER: only include a disclaimer prop if the spec elements array contains an element with id "disclaimer" or propName "disclaimer" — otherwise omit it entirely
- Only render elements present in the spec — do not add elements not in the spec
- staticFile() must ONLY use string literals, never prop variables
- If spec.background.type is "image" and spec.background.imageFile is set, render it as a full-screen background Img using staticFile(imageFile) where imageFile is the exact string from the spec${customLogoInstruction}${customFontInstruction}${initialInstructions ? `\n\nAdditional instructions: "${initialInstructions}"` : ""}

Output ONLY the complete .tsx file content.`;
  }

  const result = await model.generateContent(userMessage);
  let code = result.response.text().trim();

  // Strip accidental markdown fences
  code = code.replace(/^```(?:tsx?|typescript|jsx?)?\n?/, "").replace(/\n?```$/, "").trim();

  return code;
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

  if (!args.spec || !args.name) {
    console.error(
      "Usage: node scripts/generate-component.js --spec=.tmp-spec.json --name=MyEndCard"
    );
    process.exit(1);
  }

  const spec = JSON.parse(fs.readFileSync(path.resolve(args.spec), "utf8"));

  generateComponent(spec, args.name)
    .then((code) => {
      console.log("\n── Generated Component (Gemini) ─────────────────────────");
      console.log(code);
      console.log("─────────────────────────────────────────────────────────\n");
    })
    .catch((err) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
}

module.exports = {generateComponent};
