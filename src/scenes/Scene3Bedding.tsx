import React from "react";
import {
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import {COLORS} from "../constants";
import {headlineFont, bodyFont} from "../fonts";

// Hotspot ripple component
const HotspotRipple: React.FC<{
  cx: number;
  cy: number;
  delay: number;
}> = ({cx, cy, delay}) => {
  const frame = useCurrentFrame();

  const maxRadius = 40;
  const cycleDuration = 50;
  const localFrame = Math.max(0, frame - delay);

  // Repeating ripple
  const cycleFrame = localFrame % cycleDuration;

  const radius = interpolate(cycleFrame, [0, cycleDuration], [8, maxRadius], {
    extrapolateRight: "clamp",
  });

  const strokeOpacity = interpolate(cycleFrame, [0, cycleDuration], [0.8, 0], {
    extrapolateRight: "clamp",
  });

  const dashArray = 2 * Math.PI * radius;
  const dashOffset = interpolate(cycleFrame, [0, cycleDuration * 0.6], [dashArray, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Entry fade
  const entryOpacity = interpolate(frame, [delay, delay + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Inner dot
  const dotScale = interpolate(frame, [delay, delay + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(2)),
  });

  return (
    <g opacity={entryOpacity}>
      {/* Central dot */}
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={COLORS.taupe}
        opacity={0.9}
        transform={`translate(${cx * (1 - dotScale) }, ${cy * (1 - dotScale)}) scale(${dotScale})`}
        style={{transformOrigin: `${cx}px ${cy}px`}}
      />

      {/* Ripple ring */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={COLORS.taupe}
        strokeWidth="1.5"
        opacity={strokeOpacity}
        strokeDasharray={dashArray}
        strokeDashoffset={dashOffset}
      />

      {/* Second ripple (delayed) */}
      {localFrame > 20 && (
        <circle
          cx={cx}
          cy={cy}
          r={interpolate((localFrame - 20) % cycleDuration, [0, cycleDuration], [8, maxRadius], {
            extrapolateRight: "clamp",
          })}
          fill="none"
          stroke={COLORS.offWhite}
          strokeWidth="1"
          opacity={interpolate((localFrame - 20) % cycleDuration, [0, cycleDuration], [0.4, 0], {
            extrapolateRight: "clamp",
          })}
        />
      )}
    </g>
  );
};

export const Scene3Bedding: React.FC = () => {
  const frame = useCurrentFrame();

  // Text: "Designed for the Modern Home"
  const textOpacity = interpolate(frame, [10, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const textY = interpolate(frame, [10, 30], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Sub-text features
  const subDelay = 30;
  const subOpacity = interpolate(frame, [subDelay, subDelay + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
      }}
    >
      {/* Overlay for legibility */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.15) 100%)",
          zIndex: 1,
        }}
      />

      {/* Hotspot SVG overlay */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 10,
        }}
        viewBox="0 0 1920 1080"
      >
        {/* Hotspots positioned over furniture areas */}
        <HotspotRipple cx={600} cy={480} delay={15} />
        <HotspotRipple cx={950} cy={520} delay={30} />
        <HotspotRipple cx={1300} cy={460} delay={45} />
      </svg>

      {/* Text content - bottom area */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: 0,
          right: 0,
          zIndex: 15,
          textAlign: "center",
        }}
      >
        <div
          style={{
            opacity: textOpacity,
            transform: `translateY(${textY}px)`,
          }}
        >
          <h2
            style={{
              fontFamily: headlineFont,
              fontSize: 54,
              fontWeight: 600,
              color: COLORS.offWhite,
              letterSpacing: "2px",
              margin: 0,
              textShadow: "0 2px 30px rgba(0,0,0,0.9), 0 1px 6px rgba(0,0,0,0.7)",
            }}
          >
            Designed for the Modern Home
          </h2>
        </div>

        {/* Feature tags */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 40,
            marginTop: 20,
            opacity: subOpacity,
          }}
        >
          {["Integrated Nightstands", "Performance Fabrics", "Timeless Design"].map(
            (text, i) => (
              <span
                key={text}
                style={{
                  fontFamily: bodyFont,
                  fontSize: 18,
                  fontWeight: 400,
                  color: COLORS.taupe,
                  letterSpacing: "3px",
                  textTransform: "uppercase",
                  textShadow: "0 2px 16px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.6)",
                  opacity: interpolate(
                    frame,
                    [subDelay + i * 8, subDelay + i * 8 + 12],
                    [0, 1],
                    {extrapolateLeft: "clamp", extrapolateRight: "clamp"}
                  ),
                }}
              >
                {text}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
};
