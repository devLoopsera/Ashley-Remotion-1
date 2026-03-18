import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {CHESNA, useFonts} from '../loadFonts';
import {AshleyHouseIcon, AshleyWordmark} from '../components/logo';

export type EndCard02TEMASHLDECustomSupportTVTemplate15sA01Xnwae9Props = {
  tagline: string;
};

export const EndCard02TEMASHLDECustomSupportTVTemplate15sA01Xnwae9: React.FC<
  EndCard02TEMASHLDECustomSupportTVTemplate15sA01Xnwae9Props
> = ({tagline}) => {
  useFonts();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Animation for logo and tagline: slide in from right starting at frame 0
  const slideProgress = spring({
    frame: frame - 0,
    fps,
    config: {damping: 14},
  });
  const slideX = interpolate(slideProgress, [0, 1], [100, 0]);

  const animatedStyle: React.CSSProperties = {
    opacity: slideProgress,
    transform: `translateX(${slideX}px)`,
  };

  return (
    <AbsoluteFill style={{backgroundColor: '#232d43'}}>
      <div
        style={{
          position: 'absolute',
          top: 350,
          left: 1150,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          ...animatedStyle,
        }}
      >
        {/* Logo Group — stacked */}
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20}}>
          <AshleyHouseIcon color="#E87722" height={160} />
          <AshleyWordmark color="#FFFFFF" height={100} />
        </div>

        {/* Tagline */}
        <div style={{marginTop: 40}}>
          <p
            style={{
              fontFamily: CHESNA,
              fontSize: 48,
              fontWeight: 600,
              color: '#FFFFFF',
              letterSpacing: 3,
              textAlign: 'center',
              margin: 0,
            }}
          >
            {tagline}
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};