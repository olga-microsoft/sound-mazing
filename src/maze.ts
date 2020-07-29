import SpotifyAPI, { Track } from "./spotify"

class AxialCoordinate {
	constructor(q: number, r: number) {
		this.q = q;
		this.r = r;
	}

	q: number;
	r: number;
}

// divide into 2 classes? track and walkable
export class Hex {
	getCoord(): AxialCoordinate {
		return new AxialCoordinate(this.q, this.r);
	}
	getName(): string {
		if (this.trackId.length > 0) {
			return "(" + this.q + ", " + this.r + ") " + this.trackId;
		}
		return "(" + this.q + ", " + this.r + ")";
	}

    public constructor(init?: Partial<Hex>) {
        Object.assign(this, init);
	}

	// Hex position in 2D space
	public q: number;
	public r: number;

	// if no track the Hex is walkable
	//public trackInfo?: Track = null;
	public isWalkable = true;
	// if is walkable which tracks hexes are neighbors?
	public accessedTracks: string[];
	// if not walkable must have a track assigned
	public trackId: string;
}

export default class MuzicMaze {
	private defaultMazeDepth = 7;
	private Spotify: SpotifyAPI = null;
	private trackMap = new Map<string, Track>();
	private cells =  new Map<string, Hex>();
	private isInitialized = false;

	public async getCells(): Promise<Hex[]> {
		while (!this.isInitialized) {
			console.log('building maze');
			await (async () => new Promise(resolve => setTimeout(resolve, 100)))();
		}

		return Promise.resolve([...this.cells.values()]);
	}

	public getHexTrackInfo(hex: Hex): Track {
		if (hex.isWalkable) {
			return null;
		}

		let track = this.trackMap.get(hex.trackId);
		if (track) {
			return track;
		}

		return null;
	}

	public async initialize(seed1TrackId: string, seed2TrackId: string) {
		if (this.isInitialized) return;

		this.Spotify = new SpotifyAPI();
		// get seed track info

		//https://classy-mangrove-vertebra.glitch.me/recommendations/29muRA6aply0SHg0Z50slB-5uunXHE4kIW6uS4HWAXaOQ
		return this.Spotify.getNextRecommendation(seed1TrackId, seed2TrackId)
			.then(async (track) => {
			if (track) {
				this.trackMap.set(track.SpotifyId, track);
				this.Spotify.getTrackInfo(seed1TrackId).then((t) => {
					this.trackMap.set(seed1TrackId, t);
				});
				this.Spotify.getTrackInfo(seed2TrackId).then((t) => {
					this.trackMap.set(seed2TrackId, t);
				});
				console.log('Building maze with third seed track: ' + track.SpotifyId);
				let startingHex = new Hex({q: 0, r: 0});
				startingHex.isWalkable = true;
				// not used?
				startingHex.accessedTracks = [seed1TrackId, seed2TrackId, track.SpotifyId];

				await this.buildMaze(this.defaultMazeDepth, startingHex);
				this.isInitialized = true;
				return true;
			} else {
				console.log('null: spotify API problem');
				return false;
			}
		}).catch((ex) => {
			console.error('problem! ', ex);
			return false;
		});
	}

	private async buildMaze(depth: number, startingHex: Hex) {

		let hexQ: Hex[] = [ ];

		const firstCircle = this.getNeighbors(startingHex);
		firstCircle.forEach((hex) => {
			const c = hex.getCoord();
			/*
			new AxialCoordinate(+1, 0), *new AxialCoordinate(+1, -1), new AxialCoordinate(0, -1),
			new *AxialCoordinate(-1, 0), new AxialCoordinate(-1, +1), new *AxialCoordinate(0, +1)
			*/
			if (c.q === 1 && c.r === -1) {
				hex.isWalkable = false;
				hex.trackId = startingHex.accessedTracks[0];
			} else if (c.q === -1 && c.r === 0) {
				hex.isWalkable = false;
				hex.trackId = startingHex.accessedTracks[1];
			} else if (c.q === 0 && c.r === 1) {
				hex.isWalkable = false;
				hex.trackId = startingHex.accessedTracks[2];
			} else {
				// walkable
				hex.isWalkable = true;
				hexQ.push(hex);
				//TODO: hex.accessedTracks
			}

			this.save(hex);
		});

		let processedHexes = new Set<string>();
		processedHexes.add(this.getCoordString(startingHex.getCoord()));
		let maxDistanceFromCenter = 0;
		while (hexQ.length > 0) {
			const hex = hexQ.pop();
			const distanceFromCenter = this.getDistance(hex.getCoord(), startingHex.getCoord());

			let neighbors = this.getNeighbors(hex);

			const isFull = await this.tryAddTracks(hex, neighbors);
			if (isFull || distanceFromCenter >= depth) {
				processedHexes.add(this.getCoordString(hex.getCoord()));
				this.save(hex);
			}

			if (distanceFromCenter < depth) {
				neighbors.forEach(newCell => {
					if (newCell.isWalkable && !processedHexes.has(this.getCoordString(newCell.getCoord()))) {
						hexQ.push(newCell);
					}
				});
			}
		}
	}

	// todo: this is actually tostring of Coord
	getCoordString(c: AxialCoordinate): string {
		return '(' + c.q + ', ' + c.r + ')';
	}

	save(hex: Hex) {
		this.cells.set(this.getCoordString(hex.getCoord()), hex);
	}

	tryAddTracks(hex: Hex, neighbors: Hex[]): Promise<boolean> {
		if (!hex.isWalkable) {
			//ensureNeighbors are walkable
			neighbors.forEach(n => {
				n.isWalkable = true;
			});
			return Promise.resolve(true);
		} else {
			//let tracks = hex.accessedTracks;
			let trackNeighbors: Hex[] = [];
			neighbors.forEach(n => {
				// if already has a track assigned
				if (n.isWalkable === false && n.trackId.length > 1) {
					trackNeighbors.push(n);
				}
			});

			switch (trackNeighbors.length) {
				case 0: break; // todo; init manually
				case 1: break; // todo: noop
				case 2:

					return this.Spotify.getNextRecommendation(
						trackNeighbors[0].trackId, trackNeighbors[1].trackId)
						.then((track) => {
							//hex.accessedTracks.push(track.SpotifyId);

							let trackCoord = this.getOppositeDirCoord(hex.getCoord(),
								trackNeighbors[0].getCoord(),
								trackNeighbors[1].getCoord());

							const newHex = neighbors.find((n) =>
								this.getCoordString(n.getCoord()) === this.getCoordString(trackCoord));
							if (newHex) {
								newHex.isWalkable = false;
								newHex.trackId = track.SpotifyId;
								this.trackMap.set(track.SpotifyId, track);
								this.save(newHex);
								return true;
							}

							return false;
						});

				break;
				case 3: return Promise.resolve(true);
				default: throw new Error("Too many nieghbors");
			}

			return Promise.resolve(false);
			// // TODO: if neighbor has tracks assigned?
			// this.axial_directions.forEach(dir => {

			// });
		}
	}

	isOnAxis(arg0: AxialCoordinate, arg1: AxialCoordinate): boolean {
		const isOpposite =  (arg0.q+arg1.q === 0) && (arg0.r+arg1.r === 0);
		const isSame = (arg0.q-arg1.q === 0) && (arg0.r-arg1.r === 0);
		return isOpposite || isSame;
	}

	getOppositeDirCoord(center: AxialCoordinate, arg0: AxialCoordinate, arg1: AxialCoordinate) {
		//const c = new AxialCoordinate(hex.q + direction.q, hex.r + direction.r);
		const dir1 = new AxialCoordinate(center.q - arg0.q, center.r - arg0.r);
		const dir2 = new AxialCoordinate(center.q - arg1.q, center.r - arg1.r);

		let found: AxialCoordinate;
		this.axial_directions.forEach(dir => {
			if (this.isOnAxis(dir, dir1)) {
				return;
			}
			if (this.isOnAxis(dir, dir2)) {
				return;
			}

			let c = this.getNeighborCoord(center, dir);
			// distance must be 2 between tracks
			if (this.getDistance(c, arg0) === 2) {
				found = c;
			}
		});

		if (found) {
			return found;
		}
		throw new Error("Unable to find direction");
	}

	getDistance(a: AxialCoordinate, b: AxialCoordinate): number {
		return (Math.abs(a.q - b.q)
		+ Math.abs(a.q + a.r - b.q - b.r)
		+ Math.abs(a.r - b.r)) / 2;
	}

	getNeighbors(hex: Hex): Hex[] {
		const result: Hex[] = [];

		this.axial_directions.forEach(dir => {
			const n = this.getOrCreateNeighbor(hex, dir);
			result.push(n);
		});

		return result;
	}

	//https://www.redblobgames.com/grids/hexagons/#neighbors-axial
	private axial_directions = [
		new AxialCoordinate(+1, 0), new AxialCoordinate(+1, -1), new AxialCoordinate(0, -1),
		new AxialCoordinate(-1, 0), new AxialCoordinate(-1, +1), new AxialCoordinate(0, +1)
	]


	private getNeighborCoord(center: AxialCoordinate, direction: AxialCoordinate): AxialCoordinate {
		return new AxialCoordinate(center.q + direction.q, center.r + direction.r);
	}

	private getOrCreateNeighbor(hex: Hex, direction: AxialCoordinate): Hex {
		const c = this.getNeighborCoord(hex.getCoord(), direction);

		const s = this.getCoordString(c);

		if (this.cells.has(s)) {
			return this.cells.get(s);
		}

		return new Hex(c);
	}

}
