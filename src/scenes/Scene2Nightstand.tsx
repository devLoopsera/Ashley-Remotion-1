import React from "react";
import {
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import {COLORS} from "../constants";
import {headlineFont, bodyFont} from "../fonts";

export const Scene2Nightstand: React.FC = () => {
  const frame = useCurrentFrame();

  // Line 1: "Seamless Style." appears first
  const line1Opacity = interpolate(frame, [5, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const line1Y = interpolate(frame, [5, 25], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Line 2: "Integrated Comfort." appears 1.5s (45 frames) later
  const line2Delay = 45;
  const line2Opacity = interpolate(frame, [line2Delay, line2Delay + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const line2Y = interpolate(frame, [line2Delay, line2Delay + 20], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Stroke-line graphic that traces along the right side (nightstand edge)
  const strokeLength = 400;
  const strokeDashOffset = interpolate(
    frame,
    [10, 60],
    [strokeLength, 0],
    {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic)}
  );

  const strokeOpacity = interpolate(frame, [10, 20], [0, 0.7], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        zIndex: 20,
      }}
    >
      {/* Subtle overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.15) 100%)",
          zIndex: 1,
        }}
      />

      {/* Stroke-line SVG on the right side */}
      <svg
        style={{
          position: "absolute",
          right: 280,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
          opacity: strokeOpacity,
        }}
        width="3"
        height={strokeLength}
        viewBox={`0 0 3 ${strokeLength}`}
      >
        <line
          x1="1.5"
          y1="0"
          x2="1.5"
          y2={strokeLength}
          stroke={COLORS.taupe}
          strokeWidth="2"
          strokeDasharray={strokeLength}
          strokeDashoffset={strokeDashOffset}
          strokeLinecap="round"
        />
      </svg>

      {/* Corner bracket accent - top */}
      <svg
        style={{
          position: "absolute",
          right: 260,
          top: "calc(50% - 210px)",
          zIndex: 10,
          opacity: strokeOpacity,
        }}
        width="30"
        height="30"
        viewBox="0 0 30 30"
      >
        <path
          d="M 0 30 L 0 0 L 30 0"
          fill="none"
          stroke={COLORS.taupe}
          strokeWidth="1.5"
          strokeDasharray="60"
          strokeDashoffset={interpolate(frame, [20, 55], [60, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        />
      </svg>

      {/* Corner bracket accent - bottom */}
      <svg
        style={{
          position: "absolute",
          right: 260,
          top: "calc(50% + 180px)",
          zIndex: 10,
          opacity: strokeOpacity,
        }}
        width="30"
        height="30"
        viewBox="0 0 30 30"
      >
        <path
          d="M 30 0 L 30 30 L 0 30"
          fill="none"
          stroke={COLORS.taupe}
          strokeWidth="1.5"
          strokeDasharray="60"
          strokeDashoffset={interpolate(frame, [20, 55], [60, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        />
      </svg>

      {/* Text content - left aligned */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          marginLeft: 120,
          maxWidth: 600,
        }}
      >
        <div
          style={{
            opacity: line1Opacity,
            transform: `translateY(${line1Y}px)`,
          }}
        >
          <h2
            style={{
              fontFamily: headlineFont,
              fontSize: 58,
              fontWeight: 600,
              color: COLORS.offWhite,
              letterSpacing: "2px",
              margin: 0,
              textShadow: "0 2px 30px rgba(0,0,0,0.8), 0 1px 6px rgba(0,0,0,0.6)",
            }}
          >
            Seamless Style
          </h2>
        </div>

        <div
          style={{
            opacity: line2Opacity,
            transform: `translateY(${line2Y}px)`,
            marginTop: 12,
          }}
        >
          <h2
            style={{
              fontFamily: bodyFont,
              fontSize: 36,
              fontWeight: 300,
              color: COLORS.taupe,
              letterSpacing: "4px",
              textTransform: "uppercase",
              margin: 0,
              textShadow: "0 2px 20px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.5)",
            }}
          >
            Integrated Comfort
          </h2>
        </div>
      </div>
    </div>
  );
};
