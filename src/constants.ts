export const COLORS = {
  offWhite: "#FFFFFF",
  taupe: "#D4B9A0",
  overlay: "rgba(0, 0, 0, 0.45)",
  overlayDark: "rgba(0, 0, 0, 0.6)",
  white: "#FFFFFF",
  black: "#000000",
} as const;

export const FPS = 30;
export const TOTAL_FRAMES = 300; // 10 seconds

// Scene timing in frames (30fps)
export const SCENE_TIMING = {
  scene1: {from: 0, duration: 75},      // 0.0s - 2.5s
  scene2: {from: 75, duration: 90},     // 2.5s - 5.5s
  scene3: {from: 165, duration: 90},    // 5.5s - 8.5s
  scene4: {from: 255, duration: 45},    // 8.5s - 10.0s
} as const;
