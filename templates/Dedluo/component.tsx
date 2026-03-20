import React from 'react';
import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {AshleyHouseIcon, AshleyWordmark} from '../components/logo';
import {CHESNA, useFonts} from '../loadFonts';

export type DedluoProps = {
  tagline: string;
  locations: {
    city: string;
    address: string;
  }[];
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

  const fadeIn = spring({
    frame: frame - 12,
    fps,
    config: {damping: 12, mass: 0.5},
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#382A22'}}>
      <div
        style={{
          position: 'absolute',
          top: '31%',
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: fadeIn,
        }}
      >
        {/* LOGO GROUP */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 23,
          }}
        >
          <AshleyHouseIcon color="#FFFFFF" height={90.24} />
          <AshleyWordmark color="#FFFFFF" height={96} />
        </div>

        {/* TAGLINE */}
        <p
          style={{
            fontFamily: CHESNA,
            fontSize: 28,
            fontWeight: 400,
            color: '#FFFFFF',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            textAlign: 'center',
            marginTop: 20,
            marginBottom: 0,
            marginLeft: 0,
            marginRight: 0,
          }}
        >
          {tagline}
        </p>

        {/* LOCATIONS */}
        <div
          style={{
            marginTop: 120,
            display: 'flex',
            flexDirection: 'row',
            gap: 240,
            alignItems: 'flex-start',
          }}
        >
          {locations.map((location, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <p
                style={{
                  fontFamily: CHESNA,
                  fontSize: 48,
                  fontWeight: 600,
                  color: '#FFFFFF',
                  letterSpacing: '1px',
                  margin: 0,
                  textAlign: 'center',
                }}
              >
                {location.city}
              </p>
              <p
                style={{
                  fontFamily: CHESNA,
                  fontSize: 40,
                  fontWeight: 400,
                  color: '#FFFFFF',
                  letterSpacing: '0.5px',
                  lineHeight: 1.2,
                  margin: 0,
                  textAlign: 'center',
                  whiteSpace: 'pre-line',
                }}
              >
                {location.address}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* DISCLAIMER */}
      <div
        style={{
          position: 'absolute',
          bottom: 50,
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
            color: '#E0E0E0',
            letterSpacing: '0.5px',
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