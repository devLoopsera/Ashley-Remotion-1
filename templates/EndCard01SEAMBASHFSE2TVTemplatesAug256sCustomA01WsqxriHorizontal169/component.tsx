import React from 'react';
import {
	useCurrentFrame,
	useVideoConfig,
	AbsoluteFill,
	staticFile,
	spring,
	Img,
} from 'remotion';
import {CHESNA, useFonts} from '../loadFonts';

export type EndCard01SEAMBASHFSE2TVTemplatesAug256sCustomA01WsqxriHorizontal169Props =
	{
		locations: Array<{
			address: string;
			city: string;
			phone: string;
		}>;
	};

export const EndCard01SEAMBASHFSE2TVTemplatesAug256sCustomA01WsqxriHorizontal169: React.FC<
	EndCard01SEAMBASHFSE2TVTemplatesAug256sCustomA01WsqxriHorizontal169Props
> = ({locations}) => {
	useFonts();
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	// Animations
	const logoFadeIn = spring({
		frame: frame - 6,
		fps,
		config: {damping: 12, mass: 0.5},
	});
	const locationsFadeIn = spring({
		frame: frame - 12,
		fps,
		config: {damping: 12, mass: 0.5},
	});

	return (
		<AbsoluteFill style={{backgroundColor: '#F8F8F8'}}>
			{/* Logo Group */}
			<div
				style={{
					position: 'absolute',
					top: 285,
					left: 1188,
					width: 375,
					display: 'flex',
					flexDirection: 'column',
					gap: 15,
					alignItems: 'center',
					opacity: logoFadeIn,
				}}
			>
				<Img
					src={staticFile('HouseIcon_primary.png')}
					style={{height: 135, width: 'auto'}}
				/>
				<Img
					src={staticFile('Ashley-Wordmark-Black_PNG_u7iaxp.png')}
					style={{height: 110, width: 'auto'}}
				/>
			</div>

			{/* Locations */}
			<div
				style={{
					position: 'absolute',
					top: 590,
					left: 1050,
					width: 650,
					opacity: locationsFadeIn,
				}}
			>
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						gap: 150,
						justifyContent: 'center',
					}}
				>
					{locations.map((location, index) => (
						<div
							key={index}
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: 10,
								alignItems: 'center',
							}}
						>
							<p
								style={{
									fontFamily: CHESNA,
									fontSize: 55,
									fontWeight: 600,
									color: '#333333',
									letterSpacing: 0,
									textAlign: 'center',
									margin: 0,
								}}
							>
								{location.address}
							</p>
							<p
								style={{
									fontFamily: CHESNA,
									fontSize: 55,
									fontWeight: 600,
									color: '#333333',
									letterSpacing: 0,
									textAlign: 'center',
									margin: 0,
								}}
							>
								{location.city}
							</p>
							<p
								style={{
									fontFamily: CHESNA,
									fontSize: 55,
									fontWeight: 600,
									color: '#333333',
									letterSpacing: 0,
									textAlign: 'center',
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