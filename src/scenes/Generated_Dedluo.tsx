import React from 'react';
import {
	useCurrentFrame,
	useVideoConfig,
	AbsoluteFill,
	spring,
	interpolate,
} from 'remotion';
import {CHESNA, useFonts} from '../loadFonts';
import {AshleyHouseIcon, AshleyWordmark} from '../components/logo';

export type DedluoProps = {
	locations: Array<{
		address: string;
		city: string;
		phone: string;
	}>;
};

export const Dedluo: React.FC<DedluoProps> = ({locations}) => {
	useFonts();
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	// Animations
	const logoFadeIn = spring({
		frame: frame - 3,
		fps,
		config: {damping: 12, mass: 0.5},
	});
	const throbProgress = spring({
		frame: frame - (3 + 20),
		fps,
		config: {damping: 8, mass: 0.6},
	});
	const throbScale = interpolate(throbProgress, [0, 0.5, 1], [1.0, 1.45, 1.0]);

	const locationsSlideUp = spring({
		frame: frame - 9,
		fps,
		config: {damping: 14},
	});
	const slideY = interpolate(locationsSlideUp, [0, 1], [40, 0]);

	const locationTextStyle: React.CSSProperties = {
		fontFamily: CHESNA,
		fontSize: 64,
		fontWeight: 600,
		color: '#333333',
		letterSpacing: 1,
		textAlign: 'left',
		lineHeight: 1.1,
		margin: 0,
	};

	return (
		<AbsoluteFill style={{backgroundColor: '#FFFFFF'}}>
			<div
				style={{
					position: 'absolute',
					top: '30%',
					left: 0,
					right: 0,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
				}}
			>
				{/* LOGO GROUP */}
				<div
					style={{
						opacity: logoFadeIn,
						transform: `scale(${throbScale})`,
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						gap: 59,
					}}
				>
					<AshleyHouseIcon color="#E87722" height={235} />
					<AshleyWordmark color="#333333" height={250} />
				</div>

				{/* LOCATIONS */}
				<div
					style={{
						marginTop: 60,
						opacity: locationsSlideUp,
						transform: `translateY(${slideY}px)`,
						display: 'flex',
						flexDirection: 'row',
						gap: 60,
						alignItems: 'flex-start',
					}}
				>
					{locations.map((location, index) => (
						<div
							key={index}
							style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'flex-start',
							}}
						>
							<p style={locationTextStyle}>{location.address}</p>
							<p style={locationTextStyle}>{location.city}</p>
							<p style={locationTextStyle}>{location.phone}</p>
						</div>
					))}
				</div>
			</div>
		</AbsoluteFill>
	);
};