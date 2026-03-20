import React from 'react';
import {
	AbsoluteFill,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {AshleyHouseIcon, AshleyWordmark} from '../components/logo';
import {CHESNA, useFonts} from '../loadFonts';

export type EndCard01SEAMBASHFSE2TVTemplatesAug256sCustomA01WsqxriHorizontal169Props =
	{
		locations: {
			address: string;
			city: string;
			phone: string;
		}[];
	};

export const EndCard01SEAMBASHFSE2TVTemplatesAug256sCustomA01WsqxriHorizontal169: React.FC<
	EndCard01SEAMBASHFSE2TVTemplatesAug256sCustomA01WsqxriHorizontal169Props
> = ({locations}) => {
	useFonts();
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const logoFadeIn = spring({
		frame: frame - 12,
		fps,
		config: {damping: 12, mass: 0.5},
	});
	const locationsFadeIn = spring({
		frame: frame - 18,
		fps,
		config: {damping: 12, mass: 0.5},
	});

	// Per brand guidelines:
	const wordmarkHeight = 150;
	const iconHeight = wordmarkHeight * 0.94; // = 141
	const logoGap = iconHeight * 0.25; // = 35.25

	return (
		<AbsoluteFill style={{backgroundColor: '#F9F9F9'}}>
			{/* Logo Group */}
			<div
				style={{
					position: 'absolute',
					top: '38%',
					left: '71.875%',
					transform: 'translate(-50%, -50%)', // Center group on the coordinates
					display: 'flex',
					flexDirection: 'row',
					gap: logoGap,
					alignItems: 'center',
					opacity: logoFadeIn,
				}}
			>
				<AshleyHouseIcon color="#E87722" height={iconHeight} />
				<AshleyWordmark color="#333333" height={wordmarkHeight} />
			</div>

			{/* Locations Group */}
			<div
				style={{
					position: 'absolute',
					// This calculation correctly positions the locations group below the
					// vertically centered logo group.
					top: `calc(38% + ${wordmarkHeight / 2 + 40}px)`,
					left: '71.875%', // Horizontally aligned with the logo
					transform: 'translateX(-50%)', // Center group on the left coordinate
					opacity: locationsFadeIn,
				}}
			>
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'flex-start',
						gap: 60,
					}}
				>
					{locations.map((location, index) => (
						<div
							key={`location-${index}`}
							style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'flex-start',
								gap: 8,
							}}
						>
							<p
								style={{
									fontFamily: CHESNA,
									fontSize: 64,
									fontWeight: 600,
									color: '#333333',
									letterSpacing: 0,
									margin: 0,
								}}
							>
								{location.address}
							</p>
							<p
								style={{
									fontFamily: CHESNA,
									fontSize: 64,
									fontWeight: 600,
									color: '#333333',
									letterSpacing: 0,
									margin: 0,
								}}
							>
								{location.city}
							</p>
							<p
								style={{
									fontFamily: CHESNA,
									fontSize: 64,
									fontWeight: 600,
									color: '#333333',
									letterSpacing: 0,
									margin: 0,
								}}
							>
								{location.phone}
							</p>
						</div>
					))}
				</div>
			</div>
		</AbsoluteFill>
	);
};