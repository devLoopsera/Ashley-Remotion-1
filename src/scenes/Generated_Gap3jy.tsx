import {
  AbsoluteFill,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {AshleyHouseIcon, AshleyWordmark} from '../components/logo';
import {CHESNA, useFonts} from '../loadFonts';

export type Gap3jyProps = {
  tagline: string;
  locations: {
    city: string;
    address: string;
  }[];
  disclaimer: string;
};

export const Gap3jy: React.FC<Gap3jyProps> = ({
  tagline,
  locations,
  disclaimer,
}) => {
  useFonts();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const fadeIn = spring({
    frame,
    fps,
    config: {damping: 12, mass: 0.5},
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#4A2C1A'}}>
      {/* ─── Logo & Tagline ─── */}
      <div
        style={{
          position: 'absolute',
          top: '29%',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: fadeIn,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 21.15,
          }}
        >
          <AshleyHouseIcon color="#FFFFFF" height={84.6} />
          <AshleyWordmark color="#FFFFFF" height={90} />
        </div>

        <p
          style={{
            marginTop: 26,
            marginBottom: 0,
            fontFamily: CHESNA,
            fontSize: 32,
            fontWeight: 600,
            color: '#FFFFFF',
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}
        >
          {tagline}
        </p>
      </div>

      {/* ─── Locations ─── */}
      <div
        style={{
          position: 'absolute',
          bottom: 200,
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: fadeIn,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 180,
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
                  fontSize: 54,
                  fontWeight: 600,
                  color: '#FFFFFF',
                  letterSpacing: '4px',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                  margin: 0,
                }}
              >
                {location.city}
              </p>
              <p
                style={{
                  marginTop: 10,
                  marginBottom: 0,
                  fontFamily: CHESNA,
                  fontSize: 44,
                  fontWeight: 400,
                  color: '#FFFFFF',
                  letterSpacing: '1px',
                  textAlign: 'center',
                }}
              >
                {location.address}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Disclaimer ─── */}
      <div
        style={{
          position: 'absolute',
          bottom: 90,
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: fadeIn,
          width: '90%',
        }}
      >
        <p
          style={{
            fontFamily: CHESNA,
            fontSize: 22,
            fontWeight: 400,
            color: '#FFFFFF',
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