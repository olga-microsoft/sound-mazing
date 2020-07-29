import SpotifyAPI, { Track } from "./spotify"
import { print } from "util";

// divide into 2 classes? track and walkable
export class Hex {
	getName(): string {
		throw new Error("Method not implemented.");
	}
    public constructor(init?: Partial<Hex>) {
        Object.assign(this, init);
	}

	// todo: get world position
	// Hex position in 2D space
	public x: number;
	public y: number;

	// if no track the Hex is walkable
	//public trackInfo?: Track = null;
	public isWalkable: boolean = false;
	// if is walkable which tracks hexes are neighbors?
	public accessedTracks: string[];
	// if not walkable must have a track assigned
	public trackId: string;
}

export default class MuzicMaze {
	private defaultMazeDepth = 3;
	private Spotify: SpotifyAPI = null;
	private seed1TrackId = '29muRA6aply0SHg0Z50slB';
	private seed2TrackId = '5uunXHE4kIW6uS4HWAXaOQ';
	private trackMap: Map<string, Track>;
	private cells: Array<Hex>;

	public getCells(): Array<Hex> {
		return this.cells;
	}

	public getHexTrackInfo(hex: Hex): Track {
		if (hex.isWalkable) return null;

		let track = this.trackMap.get(hex.trackId);
		if (track) {
			return track;
		}

		return null;
	}

	public initialize(): void {
		this.Spotify = new SpotifyAPI();
		// get seed track info

		//https://classy-mangrove-vertebra.glitch.me/recommendations/29muRA6aply0SHg0Z50slB-5uunXHE4kIW6uS4HWAXaOQ
		this.Spotify.getNextRecommendation('29muRA6aply0SHg0Z50slB', '5uunXHE4kIW6uS4HWAXaOQ').then((track) => {
			if (track)
			{
				console.log('Building maze with third seed track: ' + track.SpotifyId);
				let startingHex = new Hex({x: 0, y: 0});
				startingHex.isWalkable = true;
				startingHex.accessedTracks = [this.seed1TrackId, this.seed2TrackId, track.SpotifyId];

				this.buildMaze(this.defaultMazeDepth, startingHex);


			} else {
				console.log('null: spotify API problem');
			}
		});
	}

	private buildMaze(depth: number, startingHex: Hex): void {

	}

}
