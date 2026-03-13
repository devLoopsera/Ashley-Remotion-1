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
		frame: frame - 0,
		fps,
		config: {damping: 12, mass: 0.5},
	});

	const throbProgress = spring({
		frame: frame - 20,
		fps,
		config: {damping: 8, mass: 0.6},
	});
	const throbScale = interpolate(throbProgress, [0, 0.5, 1], [1.0, 1.45, 1.0]);

	return (
		<AbsoluteFill style={{backgroundColor: '#432F24'}}>
			{/* Logo and Tagline Container */}
			<div
				style={{
					position: 'absolute',
					top: '31.4%',
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
						gap: 25,
						alignItems: 'center',
					}}
				>
					<div style={{transform: `scale(${throbScale})`}}>
						<Img
							src={staticFile('HouseIcon_white.png')}
							style={{height: 80, width: 'auto'}}
						/>
					</div>
					<Img
						src={staticFile('Ashley-Wordmark-White_PNG_u7iaxp.png')}
						style={{height: 70, width: 'auto'}}
					/>
				</div>

				{/* Tagline */}
				<p
					style={{
						fontFamily: CHESNA,
						fontSize: 28,
						fontWeight: 400,
						color: '#FFFFFF',
						letterSpacing: 1.4,
						textTransform: 'uppercase',
						marginTop: 15,
						marginBottom: 0,
						marginLeft: 0,
						marginRight: 0,
						paddingTop: 15,
					}}
				>
					{tagline}
				</p>
			</div>

			{/* Locations Container */}
			<div
				style={{
					position: 'absolute',
					top: '57%',
					left: '50%',
					transform: 'translateX(-50%)',
					display: 'flex',
					flexDirection: 'row',
					gap: 250,
					alignItems: 'flex-start',
					opacity: fadeIn,
				}}
			>
				{locations.map((location, index) => (
					<div
						key={index}
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: 5,
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
								fontSize: 48,
								fontWeight: 400,
								color: '#FFFFFF',
								letterSpacing: 0,
								lineHeight: 1.1,
								margin: 0,
								whiteSpace: 'pre-line',
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
					bottom: 50,
					left: '50%',
					transform: 'translateX(-50%)',
					width: '90%',
					opacity: fadeIn,
				}}
			>
				<p
					style={{
						fontFamily: CHESNA,
						fontSize: 18,
						fontWeight: 400,
						color: '#FFFFFF',
						letterSpacing: 0.5,
						textAlign: 'center',
						margin: 0,
						whiteSpace: 'pre-line',
					}}
				>
					{disclaimer}
				</p>
			</div>
		</AbsoluteFill>
	);
};