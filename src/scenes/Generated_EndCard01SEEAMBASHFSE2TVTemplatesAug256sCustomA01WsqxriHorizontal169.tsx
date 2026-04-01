import React from 'react';
import {
	useCurrentFrame,
	useVideoConfig,
	AbsoluteFill,
	spring,
} from 'remotion';
import {CHESNA, useFonts} from '../loadFonts';
import {AshleyHouseIcon, AshleyWordmark} from '../components/logo';

export type EndCard01SEEAMBASHFSE2TVTemplatesAug256sCustomA01WsqxriHorizontal169Props =
	{
		locations?: Array<{
			address: string;
			city: string;
		}>;
	};

export const EndCard01SEEAMBASHFSE2TVTemplatesAug256sCustomA01WsqxriHorizontal169: React.FC<EndCard01SEEAMBASHFSE2TVTemplatesAug256sCustomA01WsqxriHorizontal169Props> =
	({locations = []}) => {
		useFonts();
		const frame = useCurrentFrame();
		const {fps} = useVideoConfig();

		const logoFade = spring({
			frame: frame - 3,
			fps,
			config: {damping: 12, mass: 0.5},
		});

		const locationsFade = spring({
			frame: frame - 9,
			fps,
			config: {damping: 12, mass: 0.5},
		});

		return (
			<AbsoluteFill style={{backgroundColor: '#F3F3F3'}}>
				<div
					style={{
						position: 'absolute',
						top: '27%',
						left: 0,
						right: 0,
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
					}}
				>
					{/* Logo Group */}
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: 25,
							opacity: logoFade,
						}}
					>
						<AshleyHouseIcon color="#E87722" height={135} />
						<AshleyWordmark color="#333333" height={115} />
					</div>

					{/* Locations Group */}
					<div
						style={{
							marginTop: 45,
							display: 'flex',
							flexDirection: 'row',
							alignItems: 'flex-start',
							gap: 60,
							opacity: locationsFade,
						}}
					>
						{locations.map((location, index) => (
							<div
								key={`${location.city}-${index}`}
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
										fontSize: 68,
										fontWeight: 600,
										color: '#333333',
										textAlign: 'center',
										margin: 0,
									}}
								>
									{location.address}
								</p>
								<p
									style={{
										fontFamily: CHESNA,
										fontSize: 68,
										fontWeight: 600,
										color: '#333333',
										textAlign: 'center',
										lineHeight: 1.2,
										margin: 0,
										whiteSpace: 'pre-wrap',
									}}
								>
									{location.city}
								</p>
							</div>
						))}
					</div>
				</div>
			</AbsoluteFill>
		);
	};