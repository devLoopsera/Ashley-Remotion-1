import React from "react";
import {
  useCurrentFrame,
  interpolate,
  spring,
  Easing,
  Img,
  staticFile,
} from "remotion";
import {COLORS, FPS} from "../constants";
import {bodyFont} from "../fonts";

const ASHLEY_LOGO = "Ashley-Logo-Horizontal_PNG_et54ya.png";

export const Scene4CTA: React.FC = () => {
  const frame = useCurrentFrame();

  // Background dims by 20%
  const dimOpacity = interpolate(frame, [0, 15], [0, 0.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Logo + CTA spring scale using spring(0, 200, 20) per spec
  const logoSpring = spring({
    frame,
    fps: FPS,
    config: {
      damping: 20,
      stiffness: 200,
      mass: 0.8,
    },
    durationInFrames: 30,
  });

  const logoScale = interpolate(logoSpring, [0, 1], [0.7, 1]);

  // Logo image fade in
  const logoOpacity = interpolate(frame, [3, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // "Feel at Home" tagline
  const taglineOpacity = interpolate(frame, [10, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const taglineY = interpolate(frame, [10, 25], [15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // CTA button
  const ctaOpacity = interpolate(frame, [18, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ctaY = interpolate(frame, [18, 32], [12, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

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
      {/* Light overlay for original logo colors */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: COLORS.white,
          opacity: dimOpacity + 0.75,
          zIndex: 1,
        }}
      />

      {/* Logo and CTA container */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `scale(${logoScale})`,
        }}
      >
        {/* Ashley Logo Image — original colors */}
        <div
          style={{
            opacity: logoOpacity,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Img
            src={staticFile(ASHLEY_LOGO)}
            style={{
              width: 420,
              height: "auto",
              objectFit: "contain",
            }}
          />

          {/* Taupe divider line */}
          <div
            style={{
              width: interpolate(frame, [5, 25], [0, 120], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic),
              }),
              height: 1.5,
              backgroundColor: "#E8912D",
              marginTop: 16,
              marginBottom: 16,
            }}
          />
        </div>

        {/* Tagline: "Feel at Home" */}
        <div
          style={{
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
          }}
        >
          <p
            style={{
              fontFamily: bodyFont,
              fontSize: 28,
              fontWeight: 400,
              color: "#6B5B4E",
              letterSpacing: "6px",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            Feel at Home
          </p>
        </div>

        {/* CTA Button */}
        <div
          style={{
            marginTop: 40,
            opacity: ctaOpacity,
            transform: `translateY(${ctaY}px)`,
          }}
        >
          <div
            style={{
              border: "1.5px solid #3C3C3C",
              borderRadius: 4,
              padding: "14px 48px",
              display: "inline-block",
            }}
          >
            <span
              style={{
                fontFamily: bodyFont,
                fontSize: 16,
                fontWeight: 600,
                color: "#3C3C3C",
                letterSpacing: "4px",
                textTransform: "uppercase",
              }}
            >
              Shop the Collection
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
