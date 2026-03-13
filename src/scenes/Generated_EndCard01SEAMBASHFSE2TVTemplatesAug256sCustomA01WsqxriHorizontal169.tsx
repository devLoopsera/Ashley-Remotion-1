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

export type EndCard01SEAMBASHFSE2TVTemplatesAug256sCustomA01WsqxriHorizontal169Props =
	{
		tagline: string;
		locations: {
			city: string;
			address: string;
		}[];
		disclaimer: string;
	};

export const EndCard01SEAMBASHFSE2TVTemplatesAug256sCustomA01WsqxriHorizontal169: React.FC<
	EndCard01SEAMBASHFSE2TVTemplatesAug256sCustomA01WsqxriHorizontal169Props
> = ({tagline, locations, disclaimer}) => {
	useFonts();
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const fadeIn = spring({frame: frame - 0, fps, config: {damping: 12, mass: 0.5}});

	const throbProgress = spring({
		frame: frame - 20,
		fps,
		config: {damping: 8, mass: 0.6},
	});
	const throbScale = interpolate(throbProgress, [0, 0.5, 1], [1.0, 1.45, 1.0]);

	return (
		<AbsoluteFill style={{backgroundColor: '#714C34'}}>
			{/* Logo and Tagline Group */}
			<div
				style={{
					position: 'absolute',
					top: '38%',
					left: '50%',
					transform: 'translate(-50%, -50%)',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					opacity: fadeIn,
				}}
			>
				{/* Logo Group — animated white icon overlaid on combined logo */}
				<div style={{position: 'relative', display: 'inline-block'}}>
					{/* Combined logo — full size, no cropping, provides ASHLEY wordmark */}
					<Img
						src={staticFile('Ashley-Logo-Vertical-OneColor-White_PNG_ekcys6.png')}
						style={{width: 250, height: 'auto'}}
					/>
					{/* Animated white HouseIcon — absolutely positioned over the icon portion */}
					<div
						style={{
							position: 'absolute',
							top: 0,
							left: '50%',
							transform: `translateX(-50%) scale(${throbScale})`,
						}}
					>
						<Img
							src={staticFile('HouseIcon_white.png')}
							style={{width: 80, height: 'auto'}}
						/>
					</div>
				</div>

				{/* Tagline */}
				<div style={{marginTop: 25}}>
					<p
						style={{
							fontFamily: CHESNA,
							fontSize: 24,
							fontWeight: 400,
							color: '#FFFFFF',
							letterSpacing: 2,
							textTransform: 'uppercase',
							margin: 0,
						}}
					>
						{tagline}
					</p>
				</div>
			</div>

			{/* Locations Group */}
			<div
				style={{
					position: 'absolute',
					bottom: 150,
					left: '50%',
					transform: 'translateX(-50%)',
					opacity: fadeIn,
				}}
			>
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						gap: 250,
						alignItems: 'flex-start',
					}}
				>
					{locations.map((location, index) => (
						<div
							key={index}
							style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								gap: 10,
							}}
						>
							<p
								style={{
									fontFamily: CHESNA,
									fontSize: 50,
									fontWeight: 600,
									color: '#FFFFFF',
									letterSpacing: 5,
									textTransform: 'uppercase',
									margin: 0,
								}}
							>
								{location.city}
							</p>
							<p
								style={{
									fontFamily: CHESNA,
									fontSize: 36,
									fontWeight: 400,
									color: '#FFFFFF',
									letterSpacing: 1,
									margin: 0,
								}}
							>
								{location.address}
							</p>
						</div>
					))}
				</div>
			</div>

			{/* Disclaimer */}
			<div
				style={{
					position: 'absolute',
					bottom: 40,
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
						whiteSpace: 'pre-wrap',
					}}
				>
					{disclaimer}
				</p>
			</div>
		</AbsoluteFill>
	);
};
