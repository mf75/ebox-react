import {useCallback, useEffect, useMemo, useState} from "react";
import {useParams} from "react-router";
import {useAtom} from "jotai";
import {Typography} from "@mui/material";
import {pageTitleAtom} from "../../context/atoms";
import {useJunkiesService} from "../../hooks/useJunkiesService";
import {useArtistDetails} from "../../hooks/useArtistDetails";
import {usePlaylist} from "../../components/playlist/hooks/usePlaylist";
import useAuthService from "../../hooks/useAuthService";
import {EBoxSet, EBoxTrack, EBoxVote} from "../../hooks/types";
import {SetDetail, SetDetailActions} from "./SetDetail";
import {usePflege} from "../../hooks/usePflege";
import {darfAdminPflege} from "../../auth/rollen";
import {ArtistDialog} from "../pflege/ArtistDialog";

/** Seite /set/:nid – lädt das Set per retrieve, Artist-Infos per artistinfo. */
export const SetDetailContainer = () => {
	const nid = Number(useParams().nid);
	const junkies = useJunkiesService();
	const playlist = usePlaylist();
	const auth = useAuthService();
	const [, setPageTitle] = useAtom(pageTitleAtom);
	const [set, setSet] = useState<EBoxSet | null | undefined>(null);
	const pflege = usePflege();
	const [artistDialog, setArtistDialog] = useState<number | null>(null);

	const laden = useCallback(() => junkies.set(nid).then(s => setSet(s)).catch(() => setSet(undefined)), [junkies, nid]);
	useEffect(() => {
		laden();
	}, [laden]);
	useEffect(() => {
		setPageTitle(set ? set.title : "Set");
	}, [set, setPageTitle]);

	// nach jedem Neuladen ist set.artists ein neues Array; useArtistDetails soll nur bei anderen Artists neu laden
	const artistKey = set?.artists.join(",") ?? "";
	const artists = useMemo(() => artistKey ? artistKey.split(",").map(Number) : [], [artistKey]);
	const artistDetails = useArtistDetails({artists});
	const mitArtists = useMemo(() => set && artistDetails.length > 0 ? {...set, artistDetails} : set, [set, artistDetails]);

	if (set === null) {
		return null;
	}
	if (!mitArtists) {
		return <Typography data-testid="set-missing">Dieses Set gibt es nicht oder es ist deaktiviert.</Typography>;
	}
	const nurTrack = (track: EBoxTrack): EBoxSet => ({...mitArtists, tracks: [track]});
	const actions: SetDetailActions = {
		play: () => playlist.controls.replace(mitArtists),
		enqueue: () => playlist.controls.addAll(mitArtists),
		playTrack: track => playlist.controls.replace(nurTrack(track)),
		enqueueTrack: track => playlist.controls.addAll(nurTrack(track)),
		bookmark: () => {
			junkies.bookmark(mitArtists.nid, !mitArtists.bookmarked).then(laden)
		},
		vote: (vote: EBoxVote) => {
			junkies.vote(mitArtists.nid, vote).then(laden)
		},
		comment: (text: string) => junkies.createComment(mitArtists.nid, text)
			.then((antwort: any) => {
				laden();
				return Boolean(antwort);
			}),
	};
	return <>
		<SetDetail set={mitArtists} actions={actions} canWrite={auth.isAuthenticated}
				   onArtistBearbeiten={darfAdminPflege(pflege.rollen) ? setArtistDialog : undefined}/>
		{artistDialog !== null && <ArtistDialog nid={artistDialog} onClose={() => setArtistDialog(null)}
												onGespeichert={() => sessionStorage.removeItem("artist_" + artistDialog)}/>}
	</>;
}
