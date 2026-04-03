import React from 'react';
import {AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig, Img, staticFile} from 'remotion';
import {AshleyHouseIcon, AshleyWordmark} from '../components/logo';
import {CHESNA, useFonts} from '../loadFonts';

export type TestHorixontalProps = {
  locations: {
    address: string;
    city: string;
    phone: string;
  }[];
};

export const TestHorixontal: React.FC<TestHorixontalProps> = ({locations}) => {
  useFonts();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const logoFade = spring({
    frame: frame - 3,
    fps,
    config: {damping: 12, mass: 0.5},
  });

  const locationsFade = spring({
    frame: frame - 9,
    fps,
    config: {damping: 12, mass: 0.5},
  });

  return (
    <AbsoluteFill>
        <Img src={staticFile('bg-1775139887461.png')} style={{width:'100%',height:'100%',objectFit:'cover',position:'absolute'}} />
      <div
        style={{
          position: 'absolute',
          top: '25.185185185185187%',
          left: 1060,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 52,
        }}
      >
        {/* Logo Group */}
        <div
          style={{
            opacity: logoFade,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 20,
          }}
        >
          <AshleyHouseIcon color="#E87722" height={151} />
          <AshleyWordmark color="#333333" height={110} />
        </div>

        {/* Locations Group */}
        <div
          style={{
            opacity: locationsFade,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 60,
          }}
        >
          {locations.map((loc, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 15,
              }}
            >
              <p
                style={{
                  fontFamily: CHESNA,
                  fontSize: 64,
                  fontWeight: 600,
                  color: '#333333',
                  letterSpacing: 0,
                  textAlign: 'left',
                  margin: 0,
                }}
              >
                {loc.address}
              </p>
              <p
                style={{
                  fontFamily: CHESNA,
                  fontSize: 64,
                  fontWeight: 600,
                  color: '#333333',
                  letterSpacing: 0,
                  textAlign: 'left',
                  margin: 0,
                }}
              >
                {loc.city}
              </p>
              <p
                style={{
                  fontFamily: CHESNA,
                  fontSize: 64,
                  fontWeight: 600,
                  color: '#333333',
                  letterSpacing: 0,
                  textAlign: 'left',
                  margin: 0,
                }}
              >
                {loc.phone}
              </p>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};