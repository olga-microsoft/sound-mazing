/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import * as MRE from '@microsoft/mixed-reality-extension-sdk';
import Maze, { Hex } from './maze';

/**
 * The main class of this app. All the logic goes here.
 */
export default class HelloWorld {
	private text: MRE.Actor = null;
	private floorTile: MRE.Asset[];
	private assets: MRE.AssetContainer;
	private soundMaze: Maze = null;
	private hexWorldSize = 1.5;
	private musicSoundActiveInstance: MRE.MediaInstance;
	private playingTrackId: MRE.Guid;

	constructor(private context: MRE.Context, private baseUrl: string) {
		this.context.onStarted(() => this.started());
		this.soundMaze = new Maze();
	}

	/**
	 * Once the context is "started", initialize the app.
	 */
	private started() {

		this.assets = new MRE.AssetContainer(this.context);
		// Create a new actor with no mesh, but some text.
		this.text = MRE.Actor.Create(this.context, {
			actor: {
				name: 'Text',
				transform: {
					app: { position: { x: 0, y: 0.5, z: 0 } }
				},
				text: {
					contents: "Enjoy your sound mazing experience! \nPlease wait while we are fetching music..",
					anchor: MRE.TextAnchorLocation.MiddleCenter,
					color: { r: 30 / 255, g: 206 / 255, b: 213 / 255 },
					height: 0.3
				}
			}
		});

		// Here we create an animation for our text actor. First we create animation data, which can be used on any
		// actor. We'll reference that actor with the placeholder "text".
		const spinAnimData = this.assets.createAnimationData(
			// The name is a unique identifier for this data. You can use it to find the data in the asset container,
			// but it's merely descriptive in this sample.
			"Spin",
			{
				// Animation data is defined by a list of animation "tracks": a particular property you want to change,
				// and the values you want to change it to.
				tracks: [{
					// This animation targets the rotation of an actor named "text"
					target: MRE.ActorPath("text").transform.local.rotation,
					// And the rotation will be set to spin over 20 seconds
					keyframes: this.generateSpinKeyframes(20, MRE.Vector3.Up()),
					// And it will move smoothly from one frame to the next
					easing: MRE.AnimationEaseCurves.Linear
				}]
			});
		// Once the animation data is created, we can create a real animation from it.
		spinAnimData.bind(
			// We assign our text actor to the actor placeholder "text"
			{ text: this.text },
			// And set it to play immediately, and bounce back and forth from start to end
			{ isPlaying: true, wrapMode: MRE.AnimationWrapMode.PingPong });


		// const flipAnimData = this.assets.createAnimationData("DoAFlip", { tracks: [{
		// 	target: MRE.ActorPath("target").transform.local.rotation,
		// 	keyframes: this.generateSpinKeyframes(1.0, MRE.Vector3.Right()),
		// 	easing: MRE.AnimationEaseCurves.Linear
		// }]});

		this.addMaze();
	}

	private addMaze() {
		//async
		this.assets.loadGltf(`${this.baseUrl}/uxr_hexagon_tile/scene.gltf`, 'box')
		.then(gltf => {
			console.log('loaded floor tile model. building the maze visuals');
			this.floorTile = gltf;

			let seed1TrackId = '7ytR5pFWmSjzHJIeQkgog4';
			let seed2TrackId = '3kwgqoBqTwoAH4nT29TYrq';

			if (this.context.sessionId === 'metal') {
				seed1TrackId = '29muRA6aply0SHg0Z50slB';
				seed2TrackId = '5uunXHE4kIW6uS4HWAXaOQ';
			}

			return this.soundMaze.initialize(seed1TrackId, seed2TrackId);
		}).then((isSuccess) => {
			if (isSuccess) {
				this.soundMaze.getCells().then((hexes) => {
					if (hexes.length <= 6) {
						console.log('not enough cells');
						return;
					}

					hexes.forEach(hex => {
						this.addHex(hex);
					});

					this.text.appearance.enabled = false;
				});
			}
		})
		.catch(ex => {
			console.error('Add Maze ', ex);
		});
	}

	private addHex(hex: Hex) {
		if (hex.isWalkable) {
			this.addFloor(hex);
		} else {
			this.addTrack(hex);
		}
	}

	private calculateWorldHexPosition(x: number, y: number): MRE.Vector3 {
		let pos = new MRE.Vector3(0, 0, 0);

		//https://www.redblobgames.com/grids/hexagons/#hex-to-pixel
		pos.x = this.hexWorldSize * (3. / 2 * x);
		pos.y = 1.5;
		pos.z = this.hexWorldSize * (Math.sqrt(3) / 2 * x + Math.sqrt(3) * y)

		return pos;
	}

	private addTrack(hex: Hex) {

		let trackInfo = this.soundMaze.getHexTrackInfo(hex);
		if (!trackInfo) {
			console.log('NO TRACKINFO: ' + hex.trackId);
			return;
		}

		let hexPos = this.calculateWorldHexPosition(hex.q, hex.r);

		const trackActors: MRE.Actor[] = []; //this.buildActorsForTrack(hex, trackInfo);

		// Create a new actor with no mesh, but some text.
		let trackLabel = MRE.Actor.Create(this.context, {
			actor: {
				name: 'TrackHex_' + trackInfo.SpotifyId,
				transform: {
					app: { position: hexPos }
				},
				text: {
					contents: trackInfo.Name + '\nby ' + trackInfo.Artist,
					anchor: MRE.TextAnchorLocation.MiddleCenter,
					color: { r: 206 / 255, g: 206 / 255, b: 213 / 255 },
					height: 0.2
				}
			}
		});

		if (trackInfo.ImageUrl) {
			const tex = this.assets.createTexture(hex.getName(), {
				uri: trackInfo.ImageUrl
			});

			const mat = this.assets.createMaterial(hex.getName(), {
				color: MRE.Color3.Black(),
				emissiveColor: MRE.Color3.White(),
				emissiveTextureId: tex.id
			});

			const boxActor = MRE.Actor.Create(this.context, {
				actor: {
					name: 'Box' + trackInfo.SpotifyId,
					parentId: trackLabel.id,
					appearance: {
						meshId: this.assets.createBoxMesh(`mesh${trackInfo.SpotifyId}`, 1.4, 1.4, 1.4).id,
						materialId: mat.id
					},
					collider: { geometry: { shape: MRE.ColliderType.Auto } },
					transform: {
						local: {
							position: { x: 0, y: -1.5, z: -0.5 }
						}
					}
				}
			});

			if (trackInfo.AudioPreviewUrl) {
				const musicAsset = this.assets.createVideoStream('Stream_' + trackInfo.SpotifyId, {
					uri: trackInfo.AudioPreviewUrl+'&lol=cmonunity.mp3',
					duration: 30
				});
				// const musicAsset = this.assets.createSound('Sound_' + trackInfo.SpotifyId, {
				// 	uri: trackInfo.AudioPreviewUrl+'&lol=cmonunity.mp3',
				// 	duration: 30
				// });

				// const musicSoundInstance = boxActor.startSound(musicAsset.id,
				// 	{
				// 		volume: 0.2,
				// 		looping: false,
				// 		doppler: 0.0,
				// 		spread: 0.7,
				// 		rolloffStartDistance: 2.5,
				// 		time: 30.0
				// 	});
				// musicSoundInstance.pause();

				const cycleMusicState = () => {
					if (this.musicSoundActiveInstance) {
						this.musicSoundActiveInstance.stop();
						this.musicSoundActiveInstance = null;
						if (this.playingTrackId !== musicAsset.id) {
							this.playingTrackId = musicAsset.id;
							this.musicSoundActiveInstance = boxActor.startVideoStream(musicAsset.id,
								{
									volume: 0.2,
									looping: false,
									spread: 0.7,
									rolloffStartDistance: 2.5,
									time: 30.0
								});
						}
					} else {
						this.playingTrackId = musicAsset.id;
						this.musicSoundActiveInstance = boxActor.startVideoStream(musicAsset.id,
							{
								volume: 0.2,
								looping: false,
								spread: 0.7,
								rolloffStartDistance: 2.5,
								time: 30.0
							});
					}
				};

				// Set up cursor interaction. We add the input behavior ButtonBehavior to the cube.
				// Button behaviors have two pairs of events: hover start/stop, and click start/stop.
				const buttonBehavior = boxActor.setBehavior(MRE.ButtonBehavior);

				// Trigger the grow/shrink animations on hover.
				buttonBehavior.onHover('enter', () => {
					boxActor.animateTo(
						{ transform: { local: { scale: { x: 1.3, y: 1.3, z: 1.3 } } } },
						0.3,
						MRE.AnimationEaseCurves.EaseOutSine);
				});
				buttonBehavior.onHover('exit', () => {
					boxActor.animateTo(
						{ transform: { local: { scale: { x: 1., y: 1, z: 1 } } } },
						0.3,
						MRE.AnimationEaseCurves.EaseOutSine);
				});



				// When clicked, start playing audio preview.
				buttonBehavior.onClick(cycleMusicState);
			}
			trackActors.push(boxActor);
		}

	}

	addFloor(hex: Hex) {
		// todo

		const hexPos = this.calculateWorldHexPosition(hex.q, hex.r);
		hexPos.y = -2;

		const rotation = MRE.Quaternion.FromEulerAngles(0, -15, 0);

		const cube = MRE.Actor.CreateFromPrefab(this.context, {
			// Use the preloaded glTF for each box
			firstPrefabFrom: this.floorTile,
			// Also apply the following generic actor properties.
			actor: {
				name: 'Floor',
				transform: {
					app: {
						position: hexPos,
						rotation: rotation
					},
					local: { scale: { x: 0.5, y: 1, z: 0.5 } }
				}
			}
		});

	}


	/**
	 * Generate keyframe data for a simple spin animation.
	 * @param duration The length of time in seconds it takes to complete a full revolution.
	 * @param axis The axis of rotation in local space.
	 */
	private generateSpinKeyframes(duration: number, axis: MRE.Vector3): Array<MRE.Keyframe<MRE.Quaternion>> {
		return [{
			time: 0 * duration,
			value: MRE.Quaternion.RotationAxis(axis, 0)
		}, {
			time: 0.25 * duration,
			value: MRE.Quaternion.RotationAxis(axis, Math.PI / 2)
		}, {
			time: 0.5 * duration,
			value: MRE.Quaternion.RotationAxis(axis, Math.PI)
		}, {
			time: 0.75 * duration,
			value: MRE.Quaternion.RotationAxis(axis, 3 * Math.PI / 2)
		}, {
			time: 1 * duration,
			value: MRE.Quaternion.RotationAxis(axis, 2 * Math.PI)
		}];
	}
}
