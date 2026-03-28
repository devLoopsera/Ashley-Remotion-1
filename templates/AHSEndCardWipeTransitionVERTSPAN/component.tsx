import React from 'react';
import {
	AbsoluteFill,
	spring,
	useCurrentFrame,
	useVideoConfig,
	interpolate,
} from 'remotion';
import {AshleyHouseIcon, AshleyWordmark} from '../components/logo';
import {CHESNA, useFonts} from '../loadFonts';

export type AHSEndCardWipeTransitionVERTSPANProps = {
	disclaimer: string;
};

export const AHSEndCardWipeTransitionVERTSPAN: React.FC<
	AHSEndCardWipeTransitionVERTSPANProps
> = ({disclaimer}) => {
	useFonts();
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	// Animation for the logo group (slide-up reveal starting at frame 15)
	const logoSlideProgress = spring({
		frame: frame - 15,
		fps,
		config: {damping: 14},
	});
	const logoSlideY = interpolate(logoSlideProgress, [0, 1], [40, 0]);

	// Animation for the disclaimer (fade-in starting at frame 15)
	const disclaimerFadeProgress = spring({
		frame: frame - 15,
		fps,
		config: {damping: 12, mass: 0.5},
	});

	return (
		<AbsoluteFill style={{backgroundColor: '#F2F2F2'}}>
			{/* Logo Group */}
			<div
				style={{
					position: 'absolute',
					top: '50%',
					left: '50%',
					transform: `translate(-50%, -50%) translateY(${logoSlideY}px)`,
					opacity: logoSlideProgress,
				}}
			>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						gap: 15,
					}}
				>
					<AshleyHouseIcon color="#E87722" height={155} />
					<AshleyWordmark color="#333333" height={100} />
				</div>
			</div>

			{/* Disclaimer */}
			<div
				style={{
					position: 'absolute',
					bottom: 40,
					left: 40,
					right: 40,
					opacity: disclaimerFadeProgress,
				}}
			>
				<p
					style={{
						fontFamily: CHESNA,
						fontSize: 22,
						fontWeight: 400,
						color: '#5A5A5A',
						textAlign: 'center',
						margin: 0,
						lineHeight: 1.2,
					}}
				>
					{disclaimer}
				</p>
			</div>
		</AbsoluteFill>
	);
};