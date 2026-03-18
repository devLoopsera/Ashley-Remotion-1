import React from 'react';
import {
	AbsoluteFill,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {CHESNA, useFonts} from '../loadFonts';
import {AshleyHouseIcon, AshleyWordmark} from '../components/logo';

export type AHSEndCardWipeTransitionVERTSPANProps = {
	disclaimer: string;
};

export const AHSEndCardWipeTransitionVERTSPAN: React.FC<
	AHSEndCardWipeTransitionVERTSPANProps
> = ({disclaimer}) => {
	useFonts();
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	// Animations from spec
	const fadeInProgress = spring({
		frame: frame - 15,
		fps,
		config: {damping: 12, mass: 0.5},
	});

	return (
		<AbsoluteFill style={{backgroundColor: '#F2F2F2'}}>
			{/* Central Content Block (Logo) */}
			<div
				style={{
					position: 'absolute',
					top: '50%',
					left: '50%',
					transform: 'translate(-50%, -50%)',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					width: '100%',
				}}
			>
				{/* Logo Group */}
				<div
					style={{
						opacity: fadeInProgress,
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						gap: 30,
					}}
				>
					<AshleyHouseIcon color="#E87722" height={160} />
					<AshleyWordmark color="#333333" height={120} />
				</div>
			</div>

			{/* Disclaimer */}
			<div
				style={{
					position: 'absolute',
					bottom: 60,
					left: 0,
					right: 0,
					paddingLeft: 20,
					paddingRight: 20,
					opacity: fadeInProgress,
				}}
			>
				<p
					style={{
						fontFamily: CHESNA,
						fontSize: 24,
						fontWeight: 400,
						color: '#595959',
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