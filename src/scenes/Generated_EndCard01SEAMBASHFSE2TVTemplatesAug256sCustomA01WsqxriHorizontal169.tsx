import React from 'react';
import {
  useCurrentFrame,
  useVideoConfig,
  AbsoluteFill,
  spring,
  Img,
  staticFile,
} from 'remotion';
import {CHESNA, useFonts} from '../loadFonts';
import {AshleyHouseIcon, AshleyWordmark} from '../components/logo';

export type EndCard01SEAMBASHFSE2TVTemplatesAug256sCustomA01WsqxriHorizontal169Props =
  {
    street: string;
    cityStateZip: string;
    phone: string;
  };

export const EndCard01SEAMBASHFSE2TVTemplatesAug256sCustomA01WsqxriHorizontal169: React.FC<EndCard01SEAMBASHFSE2TVTemplatesAug256sCustomA01WsqxriHorizontal169Props> =
  ({street, cityStateZip, phone}) => {
    useFonts();
    const frame = useCurrentFrame();
    const {fps} = useVideoConfig();

    const logoFadeIn = spring({
      frame: frame - 3,
      fps,
      config: {damping: 12, mass: 0.5},
    });
    const locationFadeIn = spring({
      frame: frame - 9,
      fps,
      config: {damping: 12, mass: 0.5},
    });

    return (
      <AbsoluteFill>
        <AbsoluteFill>
          <Img
            src={staticFile('bg-default.jpg')}
            style={{width: '100%', height: '100%', objectFit: 'cover'}}
          />
        </AbsoluteFill>

        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: '50%',
            right: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingLeft: '8%',
          }}
        >
          {/* Logo Group */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: 18,
              alignItems: 'center',
              opacity: logoFadeIn,
            }}
          >
            <AshleyHouseIcon color="#E87722" height={144} />
            <AshleyWordmark color="#333333" height={115} />
          </div>

          {/* Location Group */}
          <div
            style={{
              marginTop: 56,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              alignItems: 'flex-start',
              opacity: locationFadeIn,
            }}
          >
            <p
              style={{
                fontFamily: CHESNA,
                fontSize: 58,
                fontWeight: 600,
                color: '#333333',
                letterSpacing: 0,
                textAlign: 'left',
                margin: 0,
              }}
            >
              {street}
            </p>
            <p
              style={{
                fontFamily: CHESNA,
                fontSize: 58,
                fontWeight: 600,
                color: '#333333',
                letterSpacing: 0,
                textAlign: 'left',
                margin: 0,
              }}
            >
              {cityStateZip}
            </p>
            <p
              style={{
                fontFamily: CHESNA,
                fontSize: 58,
                fontWeight: 600,
                color: '#333333',
                letterSpacing: 0,
                textAlign: 'left',
                margin: 0,
              }}
            >
              {phone}
            </p>
          </div>
        </div>
      </AbsoluteFill>
    );
  };