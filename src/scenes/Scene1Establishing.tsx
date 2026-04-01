import React from "react";
import {
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import {COLORS} from "../constants";
import {headlineFont} from "../fonts";

export const Scene1Establishing: React.FC = () => {
  const frame = useCurrentFrame();

  // Text: "Elevate Your Sanctuary"
  // Fade in with 20px upward slide over 15 frames, starting at frame 15
  const textDelay = 15;
  const textOpacity = interpolate(
    frame,
    [textDelay, textDelay + 15],
    [0, 1],
    {extrapolateLeft: "clamp", extrapolateRight: "clamp"}
  );
  const textTranslateY = interpolate(
    frame,
    [textDelay, textDelay + 20],
    [20, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    }
  );

  // Subtle underline accent that draws in
  const lineWidth = interpolate(
    frame,
    [textDelay + 10, textDelay + 35],
    [0, 180],
    {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)}
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20,
      }}
    >
      {/* Dark overlay for text legibility */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)",
          zIndex: 1,
        }}
      />

      {/* Main headline */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          opacity: textOpacity,
          transform: `translateY(${textTranslateY}px)`,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontFamily: headlineFont,
            fontSize: 72,
            fontWeight: 600,
            color: COLORS.offWhite,
            letterSpacing: "3px",
            textTransform: "uppercase",
            margin: 0,
            textShadow: "0 2px 30px rgba(0,0,0,0.8), 0 1px 6px rgba(0,0,0,0.6)",
          }}
        >
          Elevate Your Sanctuary
        </h1>

        {/* Taupe accent line */}
        <div
          style={{
            width: lineWidth,
            height: 2,
            backgroundColor: COLORS.taupe,
            margin: "16px auto 0",
          }}
        />
      </div>
    </div>
  );
};
