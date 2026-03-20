import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  AbsoluteFill,
  spring,
} from 'remotion';
import {CHESNA, useFonts} from '../loadFonts';
import {AshleyHouseIcon, AshleyWordmark} from '../components/logo';

export type AHSEndCardWipeTransitionVERTSPAN1Props = {
  tagline: string;
  disclaimer: string;
  locations: Array<{city: string; address: string}>;
};

export const AHSEndCardWipeTransitionVERTSPAN1: React.FC<
  AHSEndCardWipeTransitionVERTSPAN1Props
> = ({tagline, disclaimer, locations}) => {
  useFonts();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Animations
  const logoProgress = spring({frame: frame - 15, fps, config: {damping: 12}});
  const disclaimerProgress = spring({
    frame: frame - 15,
    fps,
    config: {damping: 12, mass: 0.5},
  });
  const taglineProgress = spring({
    frame: frame - 18,
    fps,
    config: {damping: 12, mass: 0.5},
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#FFFFFF'}}>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '120px 40px',
          boxSizing: 'border-box',
          gap: 50,
        }}
      >
        {/* Logo */}
        <div
          style={{
            opacity: logoProgress,
            transform: `scale(${logoProgress})`,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 28.2,
            }}
          >
            <AshleyHouseIcon color="#E87722" height={112.8} />
            <AshleyWordmark color="#333333" height={120} />
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            opacity: taglineProgress,
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontFamily: CHESNA,
              fontSize: 48,
              fontWeight: 600,
              color: '#333333',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              margin: 0,
            }}
          >
            {tagline}
          </p>
        </div>

        {/* Locations */}
        <div
          style={{
            opacity: taglineProgress,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 40,
            marginTop: 20,
          }}
        >
          {locations.map((location, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <p
                style={{
                  fontFamily: CHESNA,
                  fontSize: 42,
                  fontWeight: 600,
                  color: '#333333',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  margin: 0,
                }}
              >
                {location.city}
              </p>
              <p
                style={{
                  fontFamily: CHESNA,
                  fontSize: 32,
                  fontWeight: 400,
                  color: '#555555',
                  letterSpacing: '1px',
                  marginTop: 8,
                  marginBottom: 0,
                  marginLeft: 0,
                  marginRight: 0,
                }}
              >
                {location.address}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          left: 40,
          right: 40,
          opacity: disclaimerProgress,
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: CHESNA,
            fontSize: 20,
            fontWeight: 400,
            color: '#666666',
            letterSpacing: '0.5px',
            margin: 0,
          }}
        >
          {disclaimer}
        </p>
      </div>
    </AbsoluteFill>
  );
};