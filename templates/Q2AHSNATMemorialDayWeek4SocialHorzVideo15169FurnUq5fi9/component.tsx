import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  AbsoluteFill,
  spring,
} from 'remotion';
import {CHESNA, useFonts} from '../loadFonts';
import {AshleyHouseIcon, AshleyWordmark} from '../components/logo';

export type Q2AHSNATMemorialDayWeek4SocialHorzVideo15169FurnUq5fi9Props = {
  disclaimer: string;
  locations: Array<{city: string; address: string}>;
};

export const Q2AHSNATMemorialDayWeek4SocialHorzVideo15169FurnUq5fi9: React.FC<
  Q2AHSNATMemorialDayWeek4SocialHorzVideo15169FurnUq5fi9Props
> = ({disclaimer, locations}) => {
  useFonts();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Animation for logo group and CTA
  const mainFadeIn = spring({
    frame,
    fps,
    config: {damping: 12, mass: 0.5},
  });

  // Animation for locations
  const locationsFadeIn = spring({
    frame: frame - 2,
    fps,
    config: {damping: 12, mass: 0.5},
  });

  // Animation for disclaimer
  const disclaimerFadeIn = spring({
    frame: frame - 3,
    fps,
    config: {damping: 12, mass: 0.5},
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#FFFFFF'}}>
      {/* Main Content: Logo + CTA */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          opacity: mainFadeIn,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Logo Group */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 5,
            alignItems: 'flex-end',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: 30,
              alignItems: 'center',
            }}
          >
            <AshleyHouseIcon color="#E87722" height={118} />
            <AshleyWordmark color="#333333" height={125} />
          </div>
          <p
            style={{
              fontFamily: CHESNA,
              fontSize: 90,
              fontWeight: 600,
              color: '#E87722',
              margin: 0,
              paddingBottom: 10,
            }}
          >
            .com
          </p>
        </div>

        {/* CTA */}
        <div style={{marginTop: 50}}>
          <p
            style={{
              fontFamily: CHESNA,
              fontSize: 54,
              fontWeight: 400,
              color: '#333333',
              letterSpacing: '0.5px',
              textAlign: 'center',
              border: '2px solid #333333',
              borderRadius: 8,
              padding: '15px 80px',
              margin: 0,
            }}
          >
            shop now!
          </p>
        </div>
      </div>

      {/* Locations */}
      <div
        style={{
          position: 'absolute',
          bottom: 150,
          left: 0,
          right: 0,
          opacity: locationsFadeIn,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 100,
          }}
        >
          {locations.map((loc, index) => (
            <div
              key={index}
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
                  color: '#333333',
                  textTransform: 'uppercase',
                  margin: 0,
                }}
              >
                {loc.city}
              </p>
              <p
                style={{
                  fontFamily: CHESNA,
                  fontSize: 32,
                  fontWeight: 400,
                  color: '#595959',
                  marginTop: 8,
                  marginBottom: 0,
                  marginLeft: 0,
                  marginRight: 0,
                }}
              >
                {loc.address}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div
        style={{
          position: 'absolute',
          bottom: 45,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          opacity: disclaimerFadeIn,
        }}
      >
        <p
          style={{
            fontFamily: CHESNA,
            fontSize: 18,
            fontWeight: 400,
            color: '#595959',
            letterSpacing: '0.2px',
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