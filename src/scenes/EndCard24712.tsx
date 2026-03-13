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
const ASHLEY_TEXT = "Ashley-Logo-Horizontal-OneColor-White_PNG_xyxx3x.png";

export const EndCard24712: React.FC = () => {
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
        }}
      >
        {/* Logo row */}
        <div style={{display: "flex", alignItems: "center", gap: 40, opacity: fadeIn}}>

          {/* House icon — only this throbs */}
          <div style={{transform: `scale(${logoThrob})`}}>
            <Img
              src={staticFile(ASHLEY_ICON)}
              style={{height: 120, width: "auto", display: "block"}}
            />
          </div>

          {/* Full ASHLEY wordmark — no clipping, full image */}
          <Img
            src={staticFile(ASHLEY_TEXT)}
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
            Shop More Deals In Store and Online
          </p>
        </div>
      </div>

      {/* ── LOCATION ── */}
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
        <div style={{display: "flex", flexDirection: "column", alignItems: "center"}}>
          <p
            style={{
              fontFamily: CHESNA,
              fontSize: 52,
              fontWeight: 600,
              color: "#FFFFFF",
              letterSpacing: "1px",
              margin: 0,
            }}
          >
            Kerrville
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
            1703 Sidney Baker
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
            Kerrville, TX 78028
          </p>
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
