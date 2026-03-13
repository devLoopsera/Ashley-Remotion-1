import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  AbsoluteFill,
  staticFile,
  spring,
  Img,
} from 'remotion';
import {CHESNA, useFonts} from '../loadFonts';

export type Q2AHSNATMemorialDayWeek4SocialHorzVideo15169FurnUq5fi9Props = {
  disclaimer: string;
};

export const Q2AHSNATMemorialDayWeek4SocialHorzVideo15169FurnUq5fi9: React.FC<Q2AHSNATMemorialDayWeek4SocialHorzVideo15169FurnUq5fi9Props> = ({
  disclaimer,
}) => {
  useFonts();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const fadeIn = spring({
    frame: frame - 0,
    fps,
    config: {damping: 12, mass: 0.5},
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#ffffff'}}>
      {/* Logo Group */}
      <div
        style={{
          position: 'absolute',
          top: '41.67%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: fadeIn,
          display: 'flex',
          flexDirection: 'row',
          gap: 5,
          alignItems: 'center',
        }}
      >
        <Img
          src={staticFile('Ashley-Logo-Horizontal_PNG_et54ya.png')}
          style={{height: 110, width: 'auto'}}
        />
        <p
          style={{
            fontFamily: CHESNA,
            fontSize: 110,
            fontWeight: 600,
            color: '#f58220',
            letterSpacing: 0,
            margin: 0,
          }}
        >
          .com
        </p>
      </div>

      {/* CTA */}
      <div
        style={{
          position: 'absolute',
          top: `calc(41.67% + ${110 / 2}px + 55px)`,
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: fadeIn,
          border: '2px solid #3c3c3b',
          padding: '5px 30px',
        }}
      >
        <p
          style={{
            fontFamily: CHESNA,
            fontSize: 60,
            fontWeight: 400,
            color: '#3c3c3b',
            letterSpacing: 0,
            textAlign: 'center',
            margin: 0,
          }}
        >
          shop now!
        </p>
      </div>

      {/* Disclaimer */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: 0,
          right: 0,
          opacity: fadeIn,
          paddingLeft: 40,
          paddingRight: 40,
        }}
      >
        <p
          style={{
            fontFamily: CHESNA,
            fontSize: 20,
            fontWeight: 400,
            color: '#6d6e71',
            letterSpacing: 0.5,
            textAlign: 'center',
            margin: 0,
          }}
        >
          {disclaimer}
        </p>
      </div>
    </AbsoluteFill>
  );
};