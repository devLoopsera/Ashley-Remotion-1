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

export type Q2AGRNATPRTempurBreezeEVGTVYTMattress30sENG1080x1080Nzlmn9Props = {
	tagline: string;
	disclaimer: string;
};

export const Q2AGRNATPRTempurBreezeEVGTVYTMattress30sENG1080x1080Nzlmn9: React.FC<
	Q2AGRNATPRTempurBreezeEVGTVYTMattress30sENG1080x1080Nzlmn9Props
> = ({tagline, disclaimer}) => {
	useFonts();
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	// Animation for disclaimer (fade-in at frame 0)
	const disclaimerFade = spring({
		frame: frame - 0,
		fps,
		config: {damping: 12, mass: 0.5},
	});

	// Animation for logo-group (fade-in at frame 6)
	const logoFade = spring({
		frame: frame - 6,
		fps,
		config: {damping: 12, mass: 0.5},
	});

	// Post-effect for logo-group (scale-throb starting after entrance)
	const throbProgress = spring({
		frame: frame - (6 + 20),
		fps,
		config: {damping: 8, mass: 0.6},
	});
	const throbScale = interpolate(throbProgress, [0, 0.5, 1], [1.0, 1.45, 1.0]);

	// Animation for tagline (fade-in at frame 30)
	const taglineFade = spring({
		frame: frame - 30,
		fps,
		config: {damping: 12, mass: 0.5},
	});

	return (
		<AbsoluteFill style={{backgroundColor: 'transparent'}}>
			{/* Container for top-right aligned content */}
			<div
				style={{
					position: 'absolute',
					top: 200,
					right: 70,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'flex-end',
				}}
			>
				{/* Logo Group */}
				<div
					style={{
						opacity: logoFade,
						transform: `scale(${throbScale})`,
					}}
				>
					{/* 
						NOTE: Per spec, both logo-icon and logo-wordmark were provided.
						The anti-duplication rule requires rendering ONLY the combined logo file.
					*/}
					<Img
						src={staticFile('Ashley-Logo-Horizontal_PNG_et54ya.png')}
						style={{height: 150, width: 'auto'}}
					/>
				</div>

				{/* Tagline */}
				<div style={{opacity: taglineFade, marginTop: 30}}>
					<p
						style={{
							fontFamily: CHESNA,
							fontSize: 72,
							fontWeight: 600,
							color: '#282828',
							letterSpacing: '0.02em',
							textAlign: 'right',
							margin: 0,
						}}
					>
						{tagline}
					</p>
				</div>
			</div>

			{/* Disclaimer */}
			<div
				style={{
					position: 'absolute',
					bottom: 40,
					right: 70,
					opacity: disclaimerFade,
				}}
			>
				<p
					style={{
						fontFamily: CHESNA,
						fontSize: 36,
						fontWeight: 400,
						color: '#282828',
						letterSpacing: '0.01em',
						textAlign: 'right',
						margin: 0,
					}}
				>
					{disclaimer}
				</p>
			</div>
		</AbsoluteFill>
	);
};