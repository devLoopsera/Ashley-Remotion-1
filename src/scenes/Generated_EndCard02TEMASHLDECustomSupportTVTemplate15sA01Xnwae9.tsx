import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {CHESNA, useFonts} from '../loadFonts';

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
        {/* Logo Group */}
        <div>
          <Img
            src={staticFile(
              'Ashley-Logo-Vertical-OrgHouse-WhiteType_PNG_wjh3mt.png'
            )}
            style={{
              height: 280,
              width: 'auto',
            }}
          />
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