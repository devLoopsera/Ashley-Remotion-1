import React from 'react';
import {
	AbsoluteFill,
	interpolate,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {CHESNA, useFonts} from '../loadFonts';
import {AshleyHouseIcon, AshleyWordmark} from '../components/logo';

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

	const locationsFadeIn = spring({
		frame: frame - 6,
		fps,
		config: {damping: 12, mass: 0.5},
	});

	const elementsFadeIn = spring({
		frame: frame - 9,
		fps,
		config: {damping: 12, mass: 0.5},
	});

	const throbProgress = spring({
		frame: frame - 25,
		fps,
		config: {damping: 8, mass: 0.6},
	});
	const logoThrob = interpolate(throbProgress, [0, 0.5, 1], [1.0, 1.45, 1.0]);

	return (
		<AbsoluteFill style={{backgroundColor: '#432D1F'}}>
			{/* Top Section: Logo + Tagline */}
			<div
				style={{
					position: 'absolute',
					top: '34%',
					left: 0,
					right: 0,
					transform: 'translateY(-50%)',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: 15,
				}}
			>
				{/* Logo Group */}
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						gap: 20,
						opacity: elementsFadeIn,
					}}
				>
					<div style={{transform: `scale(${logoThrob})`}}>
						<AshleyHouseIcon color="#FFFFFF" height={108} />
					</div>
					<AshleyWordmark color="#FFFFFF" height={100} />
				</div>

				{/* Tagline */}
				<div style={{opacity: elementsFadeIn}}>
					<p
						style={{
							fontFamily: CHESNA,
							fontSize: 28,
							fontWeight: 400,
							color: '#FFFFFF',
							letterSpacing: '1.5px',
							textTransform: 'uppercase',
							textAlign: 'center',
							margin: 0,
						}}
					>
						{tagline}
					</p>
				</div>
			</div>

			{/* Locations */}
			<div
				style={{
					position: 'absolute',
					bottom: 250,
					left: '50%',
					transform: 'translateX(-50%)',
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'flex-start',
					gap: 450,
					opacity: locationsFadeIn,
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
								fontSize: 60,
								fontWeight: 600,
								color: '#FFFFFF',
								letterSpacing: '2px',
								textTransform: 'uppercase',
								textAlign: 'center',
								margin: 0,
							}}
						>
							{location.city}
						</p>
						<p
							style={{
								fontFamily: CHESNA,
								fontSize: 44,
								fontWeight: 400,
								color: '#FFFFFF',
								letterSpacing: '1px',
								textAlign: 'center',
								margin: 0,
								marginTop: 4,
							}}
						>
							{location.address}
						</p>
					</div>
				))}
			</div>

			{/* Disclaimer */}
			<div
				style={{
					position: 'absolute',
					bottom: 90,
					left: '50%',
					transform: 'translateX(-50%)',
					width: '80%',
					opacity: elementsFadeIn,
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