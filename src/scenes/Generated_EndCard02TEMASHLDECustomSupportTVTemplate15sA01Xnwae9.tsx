import React from 'react';
import {
	AbsoluteFill,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {AshleyHouseIcon, AshleyWordmark} from '../components/logo';
import {CHESNA, useFonts} from '../loadFonts';

export type EndCard02TEMASHLDECustomSupportTVTemplate15sA01Xnwae9Props = {
	locations: {
		address: string;
		cityStateZip: string;
		phone: string;
	}[];
};

export const EndCard02TEMASHLDECustomSupportTVTemplate15sA01Xnwae9: React.FC<
	EndCard02TEMASHLDECustomSupportTVTemplate15sA01Xnwae9Props
> = ({locations}) => {
	useFonts();
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();

	const logoGroupFadeIn = spring({
		frame: frame - 3,
		fps,
		config: {damping: 12, mass: 0.5},
	});

	const locationsFadeIn = spring({
		frame: frame - 9,
		fps,
		config: {damping: 12, mass: 0.5},
	});

	return (
		<AbsoluteFill style={{backgroundColor: 'rgba(255, 255, 255, 0.9)'}}>
			<div
				style={{
					position: 'absolute',
					top: '50%',
					left: '50%',
					transform: 'translate(-50%, -50%)',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
				}}
			>
				<div
					id="logo-group"
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 25,
						alignItems: 'center',
						opacity: logoGroupFadeIn,
					}}
				>
					<AshleyHouseIcon color="#E87722" height={140} />
					<AshleyWordmark color="#333333" height={95} />
				</div>

				<div
					id="locations"
					style={{
						marginTop: 59,
						display: 'flex',
						flexDirection: 'row',
						gap: 50,
						alignItems: 'flex-start',
						opacity: locationsFadeIn,
					}}
				>
					{locations.map((loc, i) => (
						<div
							key={i}
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
									margin: 0,
									textAlign: 'center',
								}}
							>
								{loc.address}
							</p>
							<p
								style={{
									fontFamily: CHESNA,
									fontSize: 55,
									fontWeight: 600,
									color: '#333333',
									letterSpacing: 0,
									margin: 0,
									textAlign: 'center',
								}}
							>
								{loc.cityStateZip}
							</p>
							<p
								style={{
									fontFamily: CHESNA,
									fontSize: 55,
									fontWeight: 600,
									color: '#333333',
									letterSpacing: 0,
									margin: 0,
									textAlign: 'center',
								}}
							>
								{loc.phone}
							</p>
						</div>
					))}
				</div>
			</div>
		</AbsoluteFill>
	);
};