import React from 'react';
import {
	AbsoluteFill,
	interpolate,
	spring,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
	Img,
} from 'remotion';
import {CHESNA, useFonts} from '../loadFonts';

export type AHSEndCardWipeTransitionVERTSPAN1Props = {
	tagline: string;
	disclaimer: string;
};

export const AHSEndCardWipeTransitionVERTSPAN1: React.FC<
	AHSEndCardWipeTransitionVERTSPAN1Props
> = ({tagline, disclaimer}) => {
	useFonts();
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	// Animations from spec
	const fadeIn15 = spring({
		frame: frame - 15,
		fps,
		config: {damping: 12, mass: 0.5},
	});
	const taglineFadeIn = spring({
		frame: frame - 18,
		fps,
		config: {damping: 12, mass: 0.5},
	});

	// Post-effect: scale-throb for logo
	const throbProgress = spring({
		frame: frame - (15 + 20), // Starts 20 frames after entrance
		fps,
		config: {damping: 8, mass: 0.6},
	});
	const throbScale = interpolate(throbProgress, [0, 0.5, 1], [1.0, 1.45, 1.0]);

	return (
		<AbsoluteFill style={{backgroundColor: '#FFFFFF'}}>
			{/* --- Main Content Block (Logo + Tagline) --- */}
			<div
				style={{
					position: 'absolute',
					top: '37%',
					left: '50%',
					transform: 'translateX(-50%)',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					width: '100%',
				}}
			>
				{/* Logo Group */}
				<div
					style={{
						opacity: fadeIn15,
						transform: `scale(${throbScale})`,
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						gap: 15,
					}}
				>
					<Img
						src={staticFile('HouseIcon_primary.png')}
						style={{height: 165, width: 'auto'}}
					/>
					{/* Using black wordmark for legibility on white background */}
					<Img
						src={staticFile('Ashley-Wordmark-Black_PNG_u7iaxp.png')}
						style={{height: 150, width: 'auto'}}
					/>
				</div>

				{/* Tagline */}
				<div
					style={{
						opacity: taglineFadeIn,
						marginTop: 40,
						backgroundColor: '#E87722',
						paddingTop: 20,
						paddingBottom: 20,
						paddingLeft: 50,
						paddingRight: 50,
					}}
				>
					<p
						style={{
							fontFamily: CHESNA,
							fontSize: 48,
							fontWeight: 600,
							color: '#333333',
							letterSpacing: 4,
							textTransform: 'uppercase',
							textAlign: 'center',
							margin: 0,
						}}
					>
						{tagline}
					</p>
				</div>
			</div>

			{/* --- Disclaimer --- */}
			<div
				style={{
					position: 'absolute',
					bottom: 40,
					left: '50%',
					transform: 'translateX(-50%)',
					opacity: fadeIn15,
					width: '90%',
				}}
			>
				<p
					style={{
						fontFamily: CHESNA,
						fontSize: 20,
						fontWeight: 400,
						color: '#333333',
						letterSpacing: 0.5,
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