import React from 'react';
import {
	AbsoluteFill,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';
import {CHESNA, useFonts} from '../loadFonts';
import {AshleyHouseIcon, AshleyWordmark} from '../components/logo';

export type Gap3jyProps = {
	tagline: string;
	locations: Array<{
		city: string;
		address: string;
	}>;
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

	const locationsFadeIn = spring({
		frame: frame - 12,
		fps,
		config: {damping: 12, mass: 0.5},
	});
	const otherElementsFadeIn = spring({
		frame: frame - 15,
		fps,
		config: {damping: 12, mass: 0.5},
	});

	return (
		<AbsoluteFill style={{backgroundColor: '#3A2A1E'}}>
			{/* Logo and Tagline Group */}
			<div
				style={{
					position: 'absolute',
					top: '30%',
					left: '50%',
					transform: 'translateX(-50%)',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					opacity: otherElementsFadeIn,
				}}
			>
				{/* Logo */}
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						gap: 24,
					}}
				>
					<AshleyHouseIcon color="#FFFFFF" height={94} />
					<AshleyWordmark color="#FFFFFF" height={100} />
				</div>

				{/* Tagline */}
				<p
					style={{
						marginTop: 20,
						fontFamily: CHESNA,
						fontSize: 28,
						fontWeight: 400,
						color: '#FFFFFF',
						letterSpacing: '2px',
						textTransform: 'uppercase',
						textAlign: 'center',
					}}
				>
					{tagline}
				</p>
			</div>

			{/* Locations Group */}
			<div
				style={{
					position: 'absolute',
					bottom: 250,
					left: '50%',
					transform: 'translateX(-50%)',
					opacity: locationsFadeIn,
				}}
			>
				<div
					style={{
						display: 'flex',
						flexDirection: 'row',
						gap: 190,
						alignItems: 'flex-start',
					}}
				>
					{locations.map((location, index) => (
						<div
							key={index}
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: 5,
								alignItems: 'flex-start',
							}}
						>
							<p
								style={{
									fontFamily: CHESNA,
									fontSize: 54,
									fontWeight: 600,
									color: '#FFFFFF',
									letterSpacing: '1px',
									textTransform: 'uppercase',
									margin: 0,
								}}
							>
								{location.city}
							</p>
							<p
								style={{
									fontFamily: CHESNA,
									fontSize: 42,
									fontWeight: 400,
									color: '#FFFFFF',
									letterSpacing: '0.5px',
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
					bottom: 80,
					left: '50%',
					transform: 'translateX(-50%)',
					width: '90%',
					opacity: otherElementsFadeIn,
				}}
			>
				<p
					style={{
						fontFamily: CHESNA,
						fontSize: 20,
						fontWeight: 400,
						color: '#FFFFFF',
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