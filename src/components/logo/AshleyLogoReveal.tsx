import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { AshleyWordmark } from "./AshleyWordmark";

interface AshleyLogoRevealProps {
  tagline?: string;
  disclaimer?: string;
  houseColor?: string;
  wordmarkColor?: string;
  taglineBarColor?: string;
  taglineTextColor?: string;
  disclaimerColor?: string;
  backgroundColor?: string;
}

/*──────────────────────────────────────────────────────────────────────────────
  HOUSE SEGMENTS — drawn sequentially:
    1. Base (horizontal line, extends right)
    2. Left wall (up from base-left)
    3. Roof (left-wall-top → peak → right-wall-top)
    4. Right wall (down from right-wall-top to base-right)
──────────────────────────────────────────────────────────────────────────────*/

// Single continuous house outline path (used during draw animation)
// Left wall UP → roof across → right wall DOWN — one path = clean miter joins at corners
const HOUSE_DRAW_PATH = "M 93 562 L 93 364 L 325 134 L 557 364 L 557 562";

// Segment length proportions within the draw path (pathLength=1):
//   Left wall (198u) ≈ 0.189, Roof (653u) ≈ 0.622, Right wall (198u) ≈ 0.189
const SEG_LEFT = 0.189;
const SEG_ROOF = 0.622;

// House vertices and center — used for both the static closed path and the throb animation
const HOUSE_VERTS: [number, number][] = [[93,562],[93,364],[325,134],[557,364],[557,562]];
const HOUSE_CX = 325;
const HOUSE_CY = 348; // midpoint of bounding box y: (134+562)/2

/** Build a closed house path with vertices scaled outward from center by `scale`.
 *  At scale=1 this is the normal house. At scale=1.06 vertices move 6% further from center.
 *  Stroke width is NOT affected — only the path coordinates change. */
function housePath(scale: number): string {
  const pts = HOUSE_VERTS.map(([x, y]) => [
    HOUSE_CX + (x - HOUSE_CX) * scale,
    HOUSE_CY + (y - HOUSE_CY) * scale,
  ]);
  return `M ${pts[0][0]} ${pts[0][1]} ` +
    pts.slice(1).map(([x, y]) => `L ${x} ${y}`).join(" ") + " Z";
}

const LINE_WIDTH = 72;

// Letter dispersion offsets (SVG coordinate units in the 1633-wide wordmark viewBox)
const LETTER_OFFSETS: Record<string, number> = {
  A: 320,
  S: 170,
  H: 35,
  L: -95,
  E: -215,
  Y: -340,
};

/**
 * Full Ashley logo reveal animation:
 *
 * 1. Extended horizontal line extends right from house base
 * 2. Left wall draws UP
 * 3. Roof draws across (left → peak → right)
 * 4. Right wall draws DOWN
 * 5. Extended line retracts
 * 6. ASHLEY letters rise + disperse outward
 * 7. Tagline bar expands
 * 8. House icon pulses (only after everything settled)
 */
export const AshleyLogoReveal: React.FC<AshleyLogoRevealProps> = ({
  tagline = "SHOP IN-STORE & ONLINE",
  disclaimer = "© 2026 Ashley Global Retail, LLC. All rights reserved.",
  houseColor = "#E87722",
  wordmarkColor = "#FFFFFF",
  taglineBarColor = "#E87722",
  taglineTextColor = "#FFFFFF",
  disclaimerColor = "rgba(255,255,255,0.5)",
  backgroundColor = "#1a1a1a",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ─── Phase 1: Extended horizontal line appears (frames 0–12) ───
  // Line extends rightward from house base-right corner
  const lineExtend = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // ─── Phase 2: Left wall draws UP (frames 8–22) ───
  const leftWallProgress = interpolate(frame, [8, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // ─── Phase 3: Roof draws across (frames 18–35) ───
  const roofProgress = interpolate(frame, [18, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // ─── Phase 4: Right wall draws DOWN (frames 30–42) ───
  const rightWallProgress = interpolate(frame, [30, 42], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // ─── Phase 5: Extended line retracts (frames 40–58) ───
  const lineRetract = interpolate(frame, [40, 58], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const rightExtendX = interpolate(lineRetract, [0, 1], [950, 557]);

  // ─── Phase 6: ASHLEY rises + disperses (frames 12–40, overlaps house draw) ───
  const letterProgress = interpolate(frame, [12, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const wordmarkOpacity = interpolate(frame, [12, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const wordmarkY = interpolate(frame, [12, 40], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const letterStyles = Object.fromEntries(
    Object.entries(LETTER_OFFSETS).map(([letter, offset]) => {
      const tx = interpolate(letterProgress, [0, 1], [offset, 0]);
      return [letter, {
        transform: `translateX(${tx}px)`,
        opacity: wordmarkOpacity,
      }];
    })
  ) as Record<"A" | "S" | "H" | "L" | "E" | "Y", React.CSSProperties>;

  // ─── Phase 7: Tagline bar expands (frames 30–50, overlaps house draw) ───
  const taglineBarScale = interpolate(frame, [30, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const taglineTextOpacity = interpolate(frame, [40, 52], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ─── Disclaimer fade-in (frames 20–38, overlaps house draw) ───
  const disclaimerOpacity = interpolate(frame, [20, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ─── Phase 8: Single pulse (frames 95–119, 24 frames = ~0.8s) ───
  const pulseProgress = interpolate(frame, [95, 119], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // sin curve: 0 → 1 → 0 over the single pulse
  const pulse = Math.sin(pulseProgress * Math.PI);
  const throbScale = 1 + pulse * 0.25;

  // Combined draw progress: map three overlapping phases onto one continuous path
  const drawProgress = Math.max(
    leftWallProgress * SEG_LEFT,
    roofProgress > 0 ? SEG_LEFT + roofProgress * SEG_ROOF : 0,
    rightWallProgress > 0 ? SEG_LEFT + SEG_ROOF + rightWallProgress * (1 - SEG_LEFT - SEG_ROOF) : 0,
  );
  const houseComplete = rightWallProgress >= 1;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* ─── Main logo lockup ─── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* House icon SVG */}
        <div style={{ padding: 20 }}>
          <svg
            viewBox="0 80 650 530"
            style={{ height: 120, width: "auto", display: "block", overflow: "visible" }}
          >
            {/* Extended horizontal line — extends right, then retracts; hidden once house is closed */}
            {!houseComplete && (
              <line
                x1={93}
                y1={562}
                x2={rightExtendX}
                y2={562}
                stroke={houseColor}
                strokeWidth={LINE_WIDTH}
                strokeLinecap="square"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - lineExtend}
              />
            )}

            {/* House outline — single path for clean miter joins */}
            {houseComplete ? (
              <path
                d={housePath(throbScale)}
                stroke={houseColor}
                strokeWidth={LINE_WIDTH}
                strokeLinecap="butt"
                strokeLinejoin="miter"
                fill="none"
              />
            ) : (
              <path
                d={HOUSE_DRAW_PATH}
                stroke={houseColor}
                strokeWidth={LINE_WIDTH}
                strokeLinecap="butt"
                strokeLinejoin="miter"
                fill="none"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - drawProgress}
              />
            )}
          </svg>
        </div>

        {/* ASHLEY wordmark — rises + disperses */}
        <div
          style={{
            marginTop: 8,
            transform: `translateY(${wordmarkY}px)`,
          }}
        >
          <AshleyWordmark
            color={wordmarkColor}
            height={55}
            letterStyles={letterStyles}
          />
        </div>

        {/* Tagline bar */}
        <div
          style={{
            marginTop: 18,
            transform: `scaleX(${taglineBarScale})`,
            transformOrigin: "center",
            backgroundColor: taglineBarColor,
            padding: "10px 36px",
            borderRadius: 3,
          }}
        >
          <div
            style={{
              opacity: taglineTextOpacity,
              color: taglineTextColor,
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 3,
              whiteSpace: "nowrap",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            {tagline}
          </div>
        </div>
      </div>

      {/* Disclaimer footer */}
      <div
        style={{
          position: "absolute",
          bottom: 30,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: disclaimerOpacity,
          color: disclaimerColor,
          fontSize: 13,
          fontFamily: "Arial, Helvetica, sans-serif",
          letterSpacing: 0.5,
        }}
      >
        {disclaimer}
      </div>
    </div>
  );
};
