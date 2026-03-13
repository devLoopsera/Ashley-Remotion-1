import React from "react";
import {
  useCurrentFrame,
  AbsoluteFill,
  staticFile,
  interpolate,
  Easing,
  Img,
} from "remotion";
import {CHESNA, useFonts} from "../loadFonts";

const ASHLEY_ICON = "HouseIcon_white.png";
const ASHLEY_WORDMARK = "Ashley-Logo-Horizontal-OneColor-White_PNG_xyxx3x.png";

export type TestCardProps = {
  tagline: string;
  locations: Array<{
    city: string;
    address: string;
  }>;
  disclaimer?: string;
};

const DEFAULT_DISCLAIMER =
  "Ashley stores are independently owned and operated. ©2024 Ashley. All rights reserved.";

export const TestCard: React.FC<TestCardProps> = ({
  tagline,
  locations,
  disclaimer = DEFAULT_DISCLAIMER,
}) => {
  const frame = useCurrentFrame();
  useFonts();

  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  const logoThrob =
    frame <= 30
      ? interpolate(frame, [20, 30], [1.0, 1.45], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.quad),
        })
      : interpolate(frame, [30, 44], [1.45, 1.0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.in(Easing.quad),
        });

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
        {/* Logo row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 40,
            opacity: fadeIn,
          }}
        >
          {/* House icon — only this throbs */}
          <div style={{transform: `scale(${logoThrob})`}}>
            <Img
              src={staticFile(ASHLEY_ICON)}
              style={{height: 120, width: "auto", display: "block"}}
            />
          </div>

          {/* Full ASHLEY wordmark */}
          <Img
            src={staticFile(ASHLEY_WORDMARK)}
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
            {tagline}
          </p>
        </div>
      </div>

      {/* ── LOCATIONS + DISCLAIMER ── */}
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
        {/* Location columns container */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 120,
          }}
        >
          {locations.map((location) => (
            <div
              key={location.city}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
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
                {location.city}
              </p>
              <p
                style={{
                  fontFamily: CHESNA,
                  fontSize: 38,
                  fontWeight: 400,
                  color: "#FFFFFF",
                  letterSpacing: "1px",
                  margin: 0,
                  marginTop: 8,
                }}
              >
                {location.address}
              </p>
            </div>
          ))}
        </div>

        {/* DISCLAIMER */}
        <div style={{marginTop: 60, maxWidth: 1000}}>
          <p
            style={{
              fontFamily: CHESNA,
              fontSize: 20,
              fontWeight: 400,
              color: "rgba(255,255,255,0.45)",
              letterSpacing: "0.3px",
              margin: 0,
              textAlign: "center",
              lineHeight: 1.4,
            }}
          >
            {disclaimer}
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};