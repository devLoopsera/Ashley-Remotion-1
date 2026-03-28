import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

export const ScaleWrapper: React.FC<{
  children: React.ReactNode;
  background?: string;
  cropX?: number; // 0-100, percentage of horizontal travel (50 = center)
  cropY?: number; // 0-100, percentage of vertical travel (50 = center)
}> = ({children, background = '#000000', cropX = 50, cropY = 50}) => {
  const {width, height} = useVideoConfig();

  // Native 16:9 — render children directly with no overhead
  if (width === DESIGN_WIDTH && height === DESIGN_HEIGHT) {
    return <>{children}</>;
  }

  // Scale the 1920x1080 design to cover the target canvas (crop mode)
  const scale = Math.max(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);
  const scaledW = DESIGN_WIDTH * scale;
  const scaledH = DESIGN_HEIGHT * scale;

  // Calculate offset based on crop position (0-100%)
  const maxOffsetX = scaledW - width;
  const maxOffsetY = scaledH - height;
  const offsetX = -(maxOffsetX * (cropX / 100));
  const offsetY = -(maxOffsetY * (cropY / 100));

  return (
    <AbsoluteFill style={{backgroundColor: background, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          left: offsetX,
          top: offsetY,
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};
