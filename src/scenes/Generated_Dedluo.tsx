import React from 'react';
import {
	useCurrentFrame,
	useVideoConfig,
	AbsoluteFill,
	staticFile,
	spring,
	interpolate,
	Img,
} from 'remotion';
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
		frame: frame - 9,
		fps,
		config: {damping: 12, mass: 0.5},
	});

	// Throb animation for the house icon, starting after it fades in
	const throbProgress = spring({
		frame: frame - 29, // Starts 20 frames after the fadeIn
		fps,
		config: {damping: 8, mass: 0.6},
	});
	const throbScale = interpolate(throbProgress, [0, 0.5, 1], [1.0, 1.45, 1.0]);

	return (
		<AbsoluteFill style={{backgroundColor: '#40291C'}}>
			{/* Logo and Tagline Container */}
			<div
				style={{
					position: 'absolute',
					top: '30.5%',
					left: '50%',
					transform: 'translateX(-50%)',
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
						gap: 22,
					}}
				>
					<div style={{transform: `scale(${throbScale})`}}>
						<Img
							src={staticFile('HouseIcon_white.png')}
							style={{height: 86, width: 'auto'}}
						/>
					</div>
					<Img
						src={staticFile('Ashley-Wordmark-White_PNG_u7iaxp.png')}
						style={{height: 100, width: 'auto'}}
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
						margin: 0,
						marginTop: 45,
					}}
				>
					{tagline}
				</p>
			</div>

			{/* Locations Group */}
			<div
				style={{
					position: 'absolute',
					bottom: 292,
					left: '50%',
					transform: 'translateX(-50%)',
					display: 'flex',
					flexDirection: 'row',
					alignItems: 'flex-start',
					gap: 160,
					opacity: fadeIn,
				}}
			>
				{locations.map((loc, index) => (
					<div
						key={index}
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: 26,
						}}
					>
						<p
							style={{
								fontFamily: CHESNA,
								fontSize: 46,
								fontWeight: 600,
								color: '#FFFFFF',
								letterSpacing: 2,
								textTransform: 'uppercase',
								margin: 0,
								textAlign: 'center',
							}}
						>
							{loc.city}
						</p>
						<p
							style={{
								fontFamily: CHESNA,
								fontSize: 36,
								fontWeight: 400,
								color: '#FFFFFF',
								letterSpacing: 0.5,
								margin: 0,
								textAlign: 'center',
							}}
						>
							{loc.address}
						</p>
					</div>
				))}
			</div>

			{/* Disclaimer */}
			<div
				style={{
					position: 'absolute',
					bottom: 172,
					left: '50%',
					transform: 'translateX(-50%)',
					width: '90%',
					opacity: fadeIn,
				}}
			>
				<p
					style={{
						fontFamily: CHESNA,
						fontSize: 16,
						fontWeight: 400,
						color: '#FFFFFF',
						letterSpacing: 0.5,
						textAlign: 'center',
						margin: 0,
						whiteSpace: 'pre-wrap',
					}}
				>
					{disclaimer}
				</p>
			</div>
		</AbsoluteFill>
	);
};