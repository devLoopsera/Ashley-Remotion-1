import React from 'react';
import {
  AbsoluteFill,
  Img,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {CHESNA, useFonts} from '../loadFonts';

export type DedluoProps = {
  tagline: string;
  locations: Array<{
    city: string;
    address: string;
  }>;
  disclaimer: string;
};

export const Dedluo: React.FC<DedluoProps> = ({
  tagline,
  locations,
  disclaimer,
}) => {
  useFonts();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Animation: All elements fade in starting at frame 0
  const fadeIn = spring({
    frame,
    fps,
    config: {damping: 12, mass: 0.5},
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#4A2F1F'}}>
      {/* Main Content: Logo, Tagline, Locations */}
      <div
        style={{
          position: 'absolute',
          top: '32%',
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: fadeIn,
        }}
      >
        {/* Logo Group */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 25,
          }}
        >
          <Img
            src={staticFile('HouseIcon_white.png')}
            style={{height: 90, width: 'auto'}}
          />
          <Img
            src={staticFile('Ashley-Wordmark-White_PNG_u7iaxp.png')}
            style={{height: 50, width: 'auto'}}
          />
        </div>

        {/* Tagline */}
        <p
          style={{
            fontFamily: CHESNA,
            fontSize: 28,
            fontWeight: 600,
            color: '#FFFFFF',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            textAlign: 'center',
            marginTop: 20,
            marginBottom: 0,
          }}
        >
          {tagline}
        </p>

        {/* Locations */}
        <div
          style={{
            marginTop: 90,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'center',
            gap: 250,
          }}
        >
          {locations.map((location) => (
            <div
              key={location.city}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  fontFamily: CHESNA,
                  fontSize: 48,
                  fontWeight: 600,
                  color: '#FFFFFF',
                  letterSpacing: 0,
                  textTransform: 'none',
                  margin: 0,
                }}
              >
                {location.city}
              </p>
              <p
                style={{
                  fontFamily: CHESNA,
                  fontSize: 42,
                  fontWeight: 400,
                  color: '#FFFFFF',
                  letterSpacing: 0,
                  lineHeight: 1.2,
                  whiteSpace: 'pre-line',
                  margin: 0,
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
          left: 0,
          right: 0,
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
            color: '#FFFFFF',
            letterSpacing: 0.5,
            textAlign: 'center',
            whiteSpace: 'pre-line',
            margin: 0,
          }}
        >
          {disclaimer}
        </p>
      </div>
    </AbsoluteFill>
  );
};