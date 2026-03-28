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

**type: "logo-reveal"** — the entire logo group should be replaced with <AshleyLogoReveal>.
Do NOT write spring() or interpolate() for this — AshleyLogoReveal handles all animation internally.
Pass tagline and disclaimer from props. Match backgroundColor to spec.background.color.

### REFERENCE: AshleyLogoReveal internal animation breakdown (150 frames @ 30fps = 5s)
This is the choreography inside AshleyLogoReveal — use it to understand timing when composing other elements around the logo reveal:

| Phase | Frames | Description | Technique |
|-------|--------|-------------|-----------|
| 1 | 0–12 | Horizontal line extends right from house base | interpolate + strokeDashoffset |
| 2 | 8–22 | Left wall draws UP | pathLength strokeDashoffset on continuous house path |
| 3 | 18–35 | Roof draws across (left → peak → right) | pathLength strokeDashoffset |
| 4 | 30–42 | Right wall draws DOWN | pathLength strokeDashoffset |
| 5 | 40–58 | Extended line retracts back to house corner | interpolate x2 position |
| 6 | 12–40 | "ASHLEY" letters rise + disperse outward then settle | per-letter translateX offsets (A:320, S:170, H:35, L:-95, E:-215, Y:-340) converging to 0, with translateY 40→0 and opacity fade |
| 7 | 30–50 | Tagline bar scaleX expands, text fades in 40–52 | interpolate scaleX 0→1, opacity |
| 8 | 95–119 | House icon single pulse (sin curve, scale 1.0→1.25→1.0) | Math.sin over interpolated progress |
| — | 20–38 | Disclaimer fades in | interpolate opacity 0→1 |

Key techniques used:
- SVG \`pathLength=1\` + \`strokeDasharray=1\` + \`strokeDashoffset={1 - progress}\` for stroke draw
- Single continuous house path for clean miter joins at corners
- House vertices scaled from center for pulse (not CSS transform — path coordinates recalculated)
- Letter dispersion uses AshleyWordmark's \`letterStyles\` prop for per-letter transforms
- Phases overlap intentionally for fluid, organic motion

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

## Spec Schema Reference

The design spec JSON uses a custom schema. You MUST understand and follow these properties exactly — they define the layout.

### Position properties (on any element)
- \`topPercent\` — percentage from top of the 1080p canvas. Convert to CSS: \`top: "\${topPercent}%"\` with \`position: "absolute"\`
- \`leftPx\` — absolute left position in pixels on 1920×1080 canvas. Convert to CSS: \`left: \${leftPx}\` with \`position: "absolute"\`
- \`rightPx\` — absolute right position in pixels. Convert to CSS: \`right: \${rightPx}\`
- \`bottomPx\` — absolute bottom position in pixels. Convert to CSS: \`bottom: \${bottomPx}\`
- \`centerHorizontal: true\` — center the element horizontally on the canvas. Use \`left: 0, right: 0, display: "flex", justifyContent: "center"\` or \`left: "50%", transform: "translateX(-50%)"\`
- \`belowElement: "element-id"\` — position this element below the referenced element. Use a shared parent column flex container, or calculate absolute top from the above element's position + height + marginTop
- \`marginTop\` — pixel gap when using \`belowElement\`. Apply as CSS \`marginTop\`

### Element types
- \`type: "group"\` — a container \`<div>\` that holds \`children\` elements. Apply its \`layout\` and \`position\` properties
- \`type: "text"\` — a \`<p>\` element. If it has \`propPath\`, render the dynamic value from the mapped array item (e.g. \`propPath: "address"\` → \`{loc.address}\`). If it has \`isTextProp: true\` and \`propName\`, render from component props (e.g. \`{tagline}\`)
- \`type: "svg-component"\` — render the named React component from \`"../components/logo"\` with the given \`props\`. Example: \`"component": "AshleyHouseIcon", "props": {"color": "#E87722", "height": 140}\` → \`<AshleyHouseIcon color="#E87722" height={140} />\`

### Layout properties (on group elements)
- \`layout.direction\` → CSS \`flexDirection\` ("column" or "row")
- \`layout.gap\` → CSS \`gap\` in pixels
- \`layout.alignItems\` → CSS \`alignItems\`
- \`layout.justifyContent\` → CSS \`justifyContent\`

### Array prop elements
- \`isArrayProp: true\` + \`propName: "locations"\` — this element renders by mapping over the \`locations\` prop array
- \`itemTemplate\` — the JSX structure to render for EACH item in the array using \`.map()\`
- \`itemTemplate.children[].propPath\` — the key to read from each array item (e.g. \`"address"\` → \`{loc.address}\`, \`"city"\` → \`{loc.city}\`)
- The locations prop type should include ALL propPath keys found in the itemTemplate children

### Background
- \`background.type: "solid"\` + \`background.color\` — use this EXACT hex color as \`backgroundColor\` on the root AbsoluteFill. NEVER substitute a different color.
- \`background.type: "image"\` + \`background.imageFile\` — render as full-screen \`<Img src={staticFile(imageFile)} style={{width:"100%",height:"100%",objectFit:"cover"}} />\`
- \`background.type: "transparent"\` — use \`backgroundColor: "transparent"\` on the root AbsoluteFill

### Spec-to-Code Example

Given this spec snippet:
\`\`\`json
{
  "background": {"type": "solid", "color": "#F7F7F7"},
  "elements": [
    {
      "id": "logo-group",
      "type": "group",
      "position": {"topPercent": 28, "leftPx": 1060},
      "children": [
        {"id": "logo-icon", "type": "svg-component", "component": "AshleyHouseIcon", "props": {"color": "#E87722", "height": 140}},
        {"id": "logo-wordmark", "type": "svg-component", "component": "AshleyWordmark", "props": {"color": "#333333", "height": 100}}
      ],
      "layout": {"direction": "column", "gap": 20, "alignItems": "center"}
    },
    {
      "id": "locations",
      "type": "group",
      "isArrayProp": true,
      "propName": "locations",
      "position": {"belowElement": "logo-group", "marginTop": 40, "leftPx": 1060},
      "layout": {"direction": "row", "gap": 100, "alignItems": "flex-start"},
      "itemTemplate": {
        "type": "group",
        "layout": {"direction": "column", "gap": 10, "alignItems": "center"},
        "children": [
          {"id": "address", "type": "text", "propPath": "address", "style": {"fontFamily": "Chesna Grotesk", "fontSize": 56, "fontWeight": 600, "color": "#333333"}},
          {"id": "city", "type": "text", "propPath": "city", "style": {"fontFamily": "Chesna Grotesk", "fontSize": 56, "fontWeight": 600, "color": "#333333"}}
        ]
      }
    }
  ]
}
\`\`\`

The generated JSX should be:
\`\`\`tsx
<AbsoluteFill style={{backgroundColor: "#F7F7F7"}}>
  {/* logo-group: positioned at top 28%, left 1060px */}
  <div style={{position: "absolute", top: "28%", left: 1060, display: "flex", flexDirection: "column", gap: 20, alignItems: "center", opacity: logoFadeIn}}>
    <AshleyHouseIcon color="#E87722" height={140} />
    <AshleyWordmark color="#333333" height={100} />
  </div>

  {/* locations: below logo-group, left 1060px, maps over locations prop */}
  <div style={{position: "absolute", top: "28%", left: 1060, marginTop: 340, display: "flex", flexDirection: "row", gap: 100, alignItems: "flex-start", opacity: locationsFadeIn}}>
    {locations.map((loc, i) => (
      <div key={i} style={{display: "flex", flexDirection: "column", gap: 10, alignItems: "center"}}>
        <p style={{fontFamily: CHESNA, fontSize: 56, fontWeight: 600, color: "#333333", margin: 0}}>{loc.address}</p>
        <p style={{fontFamily: CHESNA, fontSize: 56, fontWeight: 600, color: "#333333", margin: 0}}>{loc.city}</p>
      </div>
    ))}
  </div>
</AbsoluteFill>
\`\`\`

Key points: positions use EXACT values from the spec. svg-component elements become React components. isArrayProp elements use .map(). Layout properties map directly to CSS flex properties.

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

### Logo — SVG Components (DEFAULT)

The Ashley logo is rendered using inline SVG React components — NOT PNG images. This allows full animation control (stroke draws, per-letter dispersion, vertex-based pulse).

STRICT RULE: Do NOT render "ASHLEY" as typed text in JSX. No <p>, <span>, <div>, or any element
whose text content is "ASHLEY" or "Ashley". Use the AshleyWordmark SVG component.

STRICT RULE: NEVER USE PNG FOR THE LOGO. All logo files (Ashley-Logo-Horizontal-*, Ashley-Logo-Vertical-*, HouseIcon_*.png, Ashley-Wordmark-*.png) are DELETED and do not exist. Any staticFile() call referencing these will crash at runtime.

### Pre-built logo presets (USE THESE — do not manually compose icon + wordmark)

Import:
\`\`\`tsx
import {AshleyHorizontalLogo, AshleyVerticalLogo, AshleyHouseIcon, AshleyWordmark} from "../components/logo";
\`\`\`

**AshleyHorizontalLogo** — house icon LEFT, wordmark RIGHT (side by side)
- Ratios locked from official brand: iconHeight = wordmarkHeight × 0.94, gap = iconHeight × 0.25
- Props: height (wordmark height), iconColor (default "#E87722"), wordmarkColor (default "#FFFFFF")
- Example: \`<AshleyHorizontalLogo height={100} iconColor="#E87722" wordmarkColor="#FFFFFF" />\`

**AshleyVerticalLogo** — house icon centered on TOP, wordmark BELOW (stacked)
- Ratios locked from official brand: iconHeight = wordmarkHeight × 1.55, gap = wordmarkHeight × 0.15
- Props: height (wordmark height), iconColor (default "#E87722"), wordmarkColor (default "#FFFFFF")
- Example: \`<AshleyVerticalLogo height={60} iconColor="#E87722" wordmarkColor="#FFFFFF" />\`

Use \`AshleyHorizontalLogo\` when the spec shows a horizontal logo layout.
Use \`AshleyVerticalLogo\` when the spec shows a vertical/stacked logo layout.
Use \`AshleyHouseIcon\` + \`AshleyWordmark\` individually ONLY when you need to animate them separately (e.g. only the icon throbs, or per-letter wordmark animation).

**AshleyLogoReveal** — full choreographed logo reveal (stroke draw → letter rise → tagline → pulse)
- USE THIS when any animation in the spec has type: "logo-reveal" targeting the logo or logo-group
- This is a FULL-SCREEN component — it renders its own AbsoluteFill background. Do NOT nest it in a positioned div.
- It internally handles all logo animation — do NOT also render AshleyHorizontalLogo or AshleyVerticalLogo
- 8-phase animation over 150 frames (5s): line extend → wall draw → roof draw → wall draw → line retract → letter disperse → tagline expand → house pulse
- All 8 props are optional (sensible defaults exist):
  tagline, disclaimer, houseColor, wordmarkColor, taglineBarColor, taglineTextColor, disclaimerColor, backgroundColor
- Extract tagline/disclaimer from spec.textContent; extract colors from spec.background
- When composing other elements around logo-reveal, note that the logo animation settles by ~frame 58 and the pulse happens at frames 95–119, so stagger surrounding elements accordingly
- Example:
  \`<AshleyLogoReveal
    tagline={tagline}
    disclaimer={disclaimer}
    houseColor="#E87722"
    wordmarkColor="#FFFFFF"
    backgroundColor="#1a1a1a"
  />\`
- Import: import {AshleyLogoReveal} from "../components/logo";

**Individual components** (only when separate animation is needed):
1. **AshleyHouseIcon** — inline SVG house icon. Props: color ("#E87722" orange / "#FFFFFF" white / "#333333" dark), height, innerColor
2. **AshleyWordmark** — inline SVG "ASHLEY". Props: color ("#FFFFFF" dark bg / "#333333" light bg), height, letterStyles (per-letter animation)

### Logo Pulse Animation
Wrap the preset (or just the icon) in an animated div:
\`\`\`tsx
const pulseProgress = spring({frame: frame - 60, fps, config: {damping: 8, mass: 0.6}});
const pulseScale = interpolate(pulseProgress, [0, 0.5, 1], [1.0, 1.15, 1.0]);
// Whole logo throbs:
<div style={{transform: \`scale(\${pulseScale})\`}}>
  <AshleyVerticalLogo height={60} iconColor="#E87722" wordmarkColor="#FFFFFF" />
</div>
// Only house icon throbs (use individual components):
<div style={{display:"flex", flexDirection:"column", alignItems:"center"}}>
  <div style={{transform: \`scale(\${pulseScale})\`}}>
    <AshleyHouseIcon color="#E87722" height={93} />
  </div>
  <AshleyWordmark color="#FFFFFF" height={60} />
</div>
\`\`\`

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
   - DEFAULT (SVG components): Import {AshleyHouseIcon, AshleyWordmark} from "../components/logo" and render as React components. AshleyHouseIcon for the house icon, AshleyWordmark for the "ASHLEY" text. Choose color props based on background brightness.
   - NEVER use <Img> or staticFile() for any logo. All Ashley PNG logo files are deleted and will crash at runtime.
   - NEVER render a HouseIcon ALONGSIDE an AshleyWordmark unless they are the two halves of the same logo group.
   - NEVER type "ASHLEY" or "Ashley" as JSX text characters. Use the AshleyWordmark component.
   - NEVER hand-draw SVG paths for the logo. Use ONLY the imported components from "../components/logo".
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
   - ONLY these filenames are valid in staticFile(): HouseIcon_white.png, HouseIcon_primary.png, Ashley-Wordmark-White_PNG_u7iaxp.png, Ashley-Wordmark-Black_PNG_u7iaxp.png, Ashley-Logo-Horizontal-OneColor-White_PNG_xyxx3x.png, Ashley-Logo-Horizontal_PNG_et54ya.png, Ashley-Logo-Vertical-OneColor-White_PNG_ekcys6.png, Ashley-Logo-Vertical-OrgHouse-WhiteType_PNG_wjh3mt.png, any bg-*.png/jpg listed under spec.background.imageFile, and any logo-*.png/jpg provided in a CUSTOM LOGO OVERRIDE instruction. NOTE: For new end cards, prefer SVG components (AshleyHouseIcon, AshleyWordmark) over staticFile() PNG logos
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

LOGO ANIMATION RULE: If the user asks to animate the house icon (e.g. "only the house icon should throb/scale/pulse"):
- If the component uses SVG logo components (AshleyHouseIcon + AshleyWordmark), wrap ONLY the AshleyHouseIcon in a div with the animated transform. The AshleyWordmark stays static.
- If the component uses a legacy combined PNG logo, convert it to SVG components first: replace the <Img> with AshleyHouseIcon + AshleyWordmark imports, then animate the icon.

SVG LOGO CONVERSION: If the component currently uses PNG logo images (HouseIcon_*.png, Ashley-Wordmark-*.png), convert to SVG components:
- Replace <Img src={staticFile("HouseIcon_primary.png")} style={{height: H}} /> → <AshleyHouseIcon color="#E87722" height={H} />
- Replace <Img src={staticFile("HouseIcon_white.png")} style={{height: H}} /> → <AshleyHouseIcon color="#FFFFFF" height={H} />
- Replace <Img src={staticFile("HouseIcon_black.png")} style={{height: H}} /> → <AshleyHouseIcon color="#333333" height={H} />
- Replace <Img src={staticFile("Ashley-Wordmark-White_PNG_u7iaxp.png")} style={{height: H}} /> → <AshleyWordmark color="#FFFFFF" height={H} />
- Replace <Img src={staticFile("Ashley-Wordmark-Black_PNG_u7iaxp.png")} style={{height: H}} /> → <AshleyWordmark color="#333333" height={H} />
- Add import: import {AshleyHouseIcon, AshleyWordmark} from "../components/logo";
This conversion applies even if the user's feedback is about something else entirely — always prefer SVG components.

SPLIT WORDMARK CORRECTION: If "ASHLEY" appears as typed text (<p>, <span>, <div>, or any text element), REPLACE it with <AshleyWordmark color="#FFFFFF" height={H} /> where H matches the adjacent AshleyHouseIcon height ÷ 0.94 (use color="#333333" on light backgrounds). If no icon is present, use height={100}. This correction applies even if the user's feedback is about something else entirely.

ABSOLUTELY FORBIDDEN:
- Do NOT type "ASHLEY" or any logo text as JSX characters. No <p>, <div>, <span>, or any element with literal text "ASHLEY" or "Ashley". Use AshleyWordmark component.
- Do NOT use objectFit, objectPosition, clipPath, or overflow:hidden on any logo element.
- Do NOT hand-draw SVG paths for the logo — only use imported components from "../components/logo".

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
- Follow the spec's position properties EXACTLY as documented in the Spec Schema Reference: topPercent → CSS top percentage, leftPx → CSS left pixels, centerHorizontal → horizontally centered, belowElement → positioned below the referenced element
- Render svg-component elements as the named React component from "../components/logo" with the exact props from the spec
- For isArrayProp elements, use .map() over the prop array and render the itemTemplate children for each item
- PROP NAMES — CRITICAL: The TypeScript prop interface MUST use the EXACT propPath strings from the spec as property names. If the spec says propPath: "city", the prop must be named "city", NOT "cityState", "cityStateZip", or any renamed variant. If propPath is "phone", the prop must be "phone". Do NOT rename, merge, or restructure propPaths.
- locations should be typed as Array with keys matching ALL propPath values EXACTLY as they appear in the spec's itemTemplate children
- Use the spec's background.color as the EXACT backgroundColor — never substitute a different color
- BACKGROUND — CRITICAL: If spec.background.type is "solid", use ONLY backgroundColor on the root AbsoluteFill. Do NOT add any <Img> elements or staticFile() calls for backgrounds. No background images unless spec.background.type is "image".
- Implement all animations from the spec (timing, easing, scale values)
- All text content becomes typed props
- DISCLAIMER: only include a disclaimer prop if the spec elements array contains an element with id "disclaimer" or propName "disclaimer" — otherwise omit it entirely
- Only render elements present in the spec — do not add elements not in the spec
- Do NOT add decorative containers, cards, rounded rectangles, wrapper divs with padding/borderRadius/boxShadow, or any visual elements that are not explicitly in the spec
- POSITIONING — CRITICAL: Use EXACT pixel values from the spec. If leftPx is 1020, use CSS left: 1020. Do NOT convert to right-based positioning or approximate values. If topPercent is 37, use top: "37%".
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
