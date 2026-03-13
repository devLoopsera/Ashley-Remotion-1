import React from "react";
import {
  useCurrentFrame,
  AbsoluteFill,
  Video,
  Sequence,
  staticFile,
  interpolate,
} from "remotion";
import {COLORS, SCENE_TIMING, VIDEO_SRC, TOTAL_FRAMES} from "./constants";
import {Scene1Establishing} from "./scenes/Scene1Establishing";
import {Scene2Nightstand} from "./scenes/Scene2Nightstand";
import {Scene3Bedding} from "./scenes/Scene3Bedding";
import {Scene4CTA} from "./scenes/Scene4CTA";

export const AshleyBedroom: React.FC = () => {
  const frame = useCurrentFrame();

  // Ken Burns effect: continuous slow zoom from 1.0 to 1.08 across entire duration
  const kenBurnsScale = interpolate(frame, [0, TOTAL_FRAMES], [1.0, 1.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle slow pan (slight drift right and up)
  const panX = interpolate(frame, [0, TOTAL_FRAMES], [0, -15], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const panY = interpolate(frame, [0, TOTAL_FRAMES], [0, -8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.black}}>
      {/* === BASE LAYER: Video Asset (z-index: 1) === */}
      <AbsoluteFill
        style={{
          zIndex: 1,
          transform: `scale(${kenBurnsScale}) translate(${panX}px, ${panY}px)`,
          willChange: "transform",
        }}
      >
        <Video
          src={staticFile(VIDEO_SRC)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </AbsoluteFill>

      {/* === MID LAYER: Motion Graphics / Highlights (z-index: 10) === */}
      {/* (Stroke lines and hotspot ripples are rendered within their scenes) */}

      {/* === TOP LAYER: Typography and Brand (z-index: 20) === */}

      {/* Scene 1: 0.0s - 2.5s (frames 0-74) — Establishing shot */}
      <Sequence
        from={SCENE_TIMING.scene1.from}
        durationInFrames={SCENE_TIMING.scene1.duration}
      >
        <Scene1Establishing />
      </Sequence>

      {/* Scene 2: 2.5s - 5.5s (frames 75-164) — Nightstand highlight */}
      <Sequence
        from={SCENE_TIMING.scene2.from}
        durationInFrames={SCENE_TIMING.scene2.duration}
      >
        <Scene2Nightstand />
      </Sequence>

      {/* Scene 3: 5.5s - 8.5s (frames 165-254) — Bedding textures */}
      <Sequence
        from={SCENE_TIMING.scene3.from}
        durationInFrames={SCENE_TIMING.scene3.duration}
      >
        <Scene3Bedding />
      </Sequence>

      {/* Scene 4: 8.5s - 10.0s (frames 255-299) — Logo + CTA */}
      <Sequence
        from={SCENE_TIMING.scene4.from}
        durationInFrames={SCENE_TIMING.scene4.duration}
      >
        <Scene4CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
