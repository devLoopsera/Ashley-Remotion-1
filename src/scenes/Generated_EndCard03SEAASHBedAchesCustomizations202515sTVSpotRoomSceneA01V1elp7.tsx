import React from 'react';
import {
	AbsoluteFill,
	Img,
	interpolate,
	spring,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {CHESNA, useFonts} from '../loadFonts';

export type EndCard03SEAASHBedAchesCustomizations202515sTVSpotRoomSceneA01V1elp7Props =
	{
		tagline: string;
		disclaimer: string;
	};

export const EndCard03SEAASHBedAchesCustomizations202515sTVSpotRoomSceneA01V1elp7: React.FC<EndCard03SEAASHBedAchesCustomizations202515sTVSpotRoomSceneA01V1elp7Props> =
	({tagline, disclaimer}) => {
		useFonts();
		const frame = useCurrentFrame();
		const {fps} = useVideoConfig();

		// Animation for Disclaimer: slide-up, starts at frame 0
		const disclaimerProgress = spring({
			frame: frame - 0,
			fps,
			config: {damping: 14},
		});
		const disclaimerSlideY = interpolate(disclaimerProgress, [0, 1], [40, 0]);

		// Animation for Logo Group: fade-in, starts at frame 6
		const logoFadeIn = spring({
			frame: frame - 6,
			fps,
			config: {damping: 12, mass: 0.5},
		});
		// PostEffect for Logo Group: scale-throb, starts ~20 frames after entrance
		const logoThrobProgress = spring({
			frame: frame - (6 + 20),
			fps,
			config: {damping: 8, mass: 0.6},
		});
		const logoThrobScale = interpolate(
			logoThrobProgress,
			[0, 0.5, 1],
			[1.0, 1.45, 1.0]
		);

		// Animation for Tagline: slide-up, starts at frame 30
		const taglineProgress = spring({
			frame: frame - 30,
			fps,
			config: {damping: 14},
		});
		const taglineSlideY = interpolate(taglineProgress, [0, 1], [40, 0]);

		return (
			<AbsoluteFill style={{backgroundColor: '#F8F8F8'}}>
				{/* Logo & Tagline Container */}
				<div
					style={{
						position: 'absolute',
						top: '15.6%',
						left: '53.3%',
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
							gap: 22,
							alignItems: 'center',
							opacity: logoFadeIn,
							transform: `scale(${logoThrobScale})`,
						}}
					>
						<Img
							src={staticFile('HouseIcon_primary.png')}
							style={{height: 104, width: 'auto'}}
						/>
						<Img
							src={staticFile('Ashley-Wordmark-Black_PNG_u7iaxp.png')}
							style={{height: 125, width: 'auto'}}
						/>
					</div>

					{/* Tagline */}
					<div
						style={{
							marginTop: 7,
							opacity: taglineProgress,
							transform: `translateY(${taglineSlideY}px)`,
						}}
					>
						<p
							style={{
								fontFamily: CHESNA,
								fontSize: 60,
								fontWeight: 400,
								color: '#333333',
								letterSpacing: 1,
								textAlign: 'center',
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
						bottom: 48,
						right: 50,
						opacity: disclaimerProgress,
						transform: `translateY(${disclaimerSlideY}px)`,
					}}
				>
					<p
						style={{
							fontFamily: CHESNA,
							fontSize: 28,
							fontWeight: 400,
							color: '#585858',
							letterSpacing: 0.5,
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