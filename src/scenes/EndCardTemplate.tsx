import React from "react";
import {
  useCurrentFrame,
  AbsoluteFill,
  interpolate,
  Easing,
} from "remotion";
import {CHESNA, useFonts} from "../loadFonts";
import {AshleyHouseIcon, AshleyWordmark} from "../components/logo";
const DEFAULT_DISCLAIMER =
  "Ashley stores are independently owned and operated. ©2024 Rogers Furniture, DBA Ashley. All rights reserved. Furniture since 1945.";

export type Location = {city: string; address: string};

export type EndCardProps = {
  tagline: string;
  locations: Location[];
  disclaimer?: string;
};

export const EndCardTemplate: React.FC<EndCardProps> = ({
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

  const isSingle = locations.length === 1;

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
        <div style={{display: "flex", alignItems: "center", gap: 40, opacity: fadeIn}}>

          {/* House icon — only this throbs */}
          <div style={{transform: `scale(${logoThrob})`}}>
            <AshleyHouseIcon color="#FFFFFF" height={120} />
          </div>

          {/* Full ASHLEY wordmark */}
          <AshleyWordmark color="#FFFFFF" height={120} />
        </div>

        {/* Tagline */}
        <div style={{opacity: fadeIn, marginTop: 40}}>
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
        {/* 1 location → centred; 2 locations → side-by-side */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: isSingle ? 0 : 120,
          }}
        >
          {locations.map((loc, i) => (
            <div
              key={i}
              style={{display: "flex", flexDirection: "column", alignItems: "center"}}
            >
              <p
                style={{
                  fontFamily: CHESNA,
                  fontSize: 52,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  letterSpacing: isSingle ? "1px" : "2px",
                  textTransform: isSingle ? "none" : "uppercase",
                  margin: 0,
                }}
              >
                {loc.city}
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
                {loc.address}
              </p>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
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
            {disclaimer}
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};
