import * as got from 'got';


export class Track {
	public Name = 'No name';
	public Artist = 'Anonymous';
	public SpotifyId: string; //required
	public ImageUrl = '';
	public AudioPreviewUrl = '';
}

export default class SpotifyAPI {
	// eg:
	//'https://classy-mangrove-vertebra.glitch.me/recommendations/29muRA6aply0SHg0Z50slB-5uunXHE4kIW6uS4HWAXaOQ'
	private spotifyAPIReqPath = 'https://classy-mangrove-vertebra.glitch.me/recommendations/';
	private spotifyAPITrackPath = 'https://classy-mangrove-vertebra.glitch.me/track/';

	public getTrackInfo(trackId: string): Promise<Track> {
		let reqPath = this.spotifyAPITrackPath + trackId;
		return got.default(reqPath).json<any>()
			.then((body: any) => {
				if (!body.id) {
					return null;
				}

				let result = new Track();
				result.SpotifyId = body.id;
				if (body.artists[0]) {
					// TODO: append
					result.Artist = body.artists[0].name;
				}

				if (body.name) {
					result.Name = body.name;
				}

				if (body.preview_url) {
					result.AudioPreviewUrl = body.preview_url;
				}
				//TODO: pick highest
				if (body.album.images[0]) {
					result.ImageUrl = body.album.images[0].url;
				}

				return result;
			})
			.catch((ex) => {
				return null;
			});

	}

	public getNextRecommendation(trackId1: string, trackId2: string): Promise<Track> {
		let reqPath = this.spotifyAPIReqPath + trackId1 + '-' + trackId2;
		return got.default(reqPath).json<any>()
			.then((body: any) => {
				//MRE.log.debug('got response %s', body);
				if (!body.id) {
					return null;
				}

				const result = new Track();
				result.SpotifyId = body.id;
				if (body.artists[0]) {
					// TODO: append
					result.Artist = body.artists[0].name;
				}

				if (body.name) {
					result.Name = body.name;
				}

				if (body.preview_url) {
					result.AudioPreviewUrl = body.preview_url;
				}
				//TODO: pick highest
				if (body.album.images[0]) {
					result.ImageUrl = body.album.images[0].url;
				}

				return result;
			})
			.catch((ex) => {
				return null;
			});
	}
}
