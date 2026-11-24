import {useEffect, useMemo, useState} from "react";
import {ArtistImageSizes, EBoxArtist} from "./types";
import {useAtom} from "jotai";
import {userAtom} from "../context/atoms";
import {junkiesApi} from "../api/JunkiesApi";
import {htmlZuText} from "../bundles/common/text";

export const defaultImageUrl = import.meta.env.BASE_URL + "images/dj_silhouette.png";

/** artistinfo-Antwort → EBoxArtist; null, wenn es den Artist nicht gibt (Antwort mit nid null). */
export const artistAusInfo = (artistInfo: any): EBoxArtist | null => {
	if (!artistInfo?.nid) {
		return null;
	}
	const data: EBoxArtist = {
		nid: Number(artistInfo.nid),
		djid: Number(artistInfo.id),
		name: artistInfo.name,
		artwork: {
			small: defaultImageUrl,
			large: defaultImageUrl,
			extralarge: defaultImageUrl,
			mega: defaultImageUrl
		}
	};
	const lastfm = artistInfo["lastfm_artistinfo"];
	if (lastfm) {
		(lastfm["image"] || []).filter((img: any) => img["#text"])
			.forEach((img: any) => data.artwork[img.size as ArtistImageSizes] = img["#text"]);
		data.name = lastfm["name"] || data.name;
		const bio = htmlZuText(lastfm["bio"]?.["summary"]);
		if (bio) {
			data.bio = bio;
		}
	}
	if (artistInfo.country) {
		data.country = artistInfo.country;
	}
	if (Array.isArray(artistInfo["similar_artists"])) {
		data.similar = artistInfo["similar_artists"].map((a: any) => Number(a.nid)).filter((nid: number) => nid > 0);
	}
	return data;
}

interface Props {
	artists: number[];
}

export const useArtistDetails = ({artists}:Props):EBoxArtist[] => {
	const artistService = useArtistService();
	const [artistDetails, setArtistDetails] = useState<EBoxArtist[]>([] as EBoxArtist[]);

	useEffect(() => {
		let mounted = true;
		artists.map(artistID =>
				artistService.artistInfo(artistID).then((artistInfo) => {
					const data = artistAusInfo(artistInfo);
					if (mounted) {
						if (data) setArtistDetails((curData) => [...curData && [...curData], data]);
					}
				})
		)
		return () => {mounted = false;}
	}, [artistService, artists])
	return artistDetails;
}

//@deprecated
export const useArtistService = () => {
	const [user] = useAtom(userAtom);
	return useMemo(() => {
		return {
			artistInfo: (artistnid:number) => {
				if (sessionStorage.getItem("artist_" + artistnid)) {
					return Promise.resolve(JSON.parse(sessionStorage.getItem("artist_" + artistnid) as string));
				}
				return junkiesApi(user).artistinfo(artistnid)
					.then(info => {
						sessionStorage.setItem("artist_" + artistnid, JSON.stringify(info));
						return info;
					});
			}
		}
	}, [user]);
};
