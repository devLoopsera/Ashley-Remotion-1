import React from "react";
import {
  useCurrentFrame,
  AbsoluteFill,
  interpolate,
  Easing,
} from "remotion";
import {CHESNA, useFonts} from "../loadFonts";
import {AshleyHouseIcon, AshleyWordmark} from "../components/logo";

export type DelRioCardProps = {
  tagline: string;
  locations: Array<{city: string; address: string}>;
  disclaimer?: string;
};

const DEFAULT_DISCLAIMER =
  "Ashley stores are independently owned and operated. ©2026 PLR FURNITURE, INC., DBA Ashley. All rights reserved. Expiration date 3/31/2026.";

export const DelRioCard: React.FC<DelRioCardProps> = ({
  tagline,
  locations,
  disclaimer = DEFAULT_DISCLAIMER,
}) => {
  const frame = useCurrentFrame();
  useFonts();

  // All elements fade in together
  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // House icon throbs after fade completes
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
          opacity: fadeIn,
        }}
      >
        {/* Logo row */}
        <div style={{display: "flex", alignItems: "center", gap: 40}}>
          {/* House icon — only this throbs */}
          <div style={{transform: `scale(${logoThrob})`}}>
            <AshleyHouseIcon color="#FFFFFF" height={120} />
          </div>

          {/* Full ASHLEY wordmark */}
          <AshleyWordmark color="#FFFFFF" height={120} />
        </div>

        {/* Tagline */}
        <div
          style={{
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

      {/* ── LOCATIONS ── */}
      <div
        style={{
          position: "absolute",
          bottom: 180,
          left: 0,
          right: 0,
          zIndex: 10,
          display: "flex",
          justifyContent: "center",
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
      </div>

      {/* ── DISCLAIMER ── */}
      <div
        style={{
          position: "absolute",
          bottom: 50,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingLeft: 40,
          paddingRight: 40,
          opacity: fadeIn,
        }}
      >
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
          {disclaimer}
        </p>
      </div>
    </AbsoluteFill>
  );
};