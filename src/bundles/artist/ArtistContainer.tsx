import {useEffect, useState} from "react";
import {useParams} from "react-router";
import {useAtom} from "jotai";
import {Box, Button, Typography} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import {usePflege} from "../../hooks/usePflege";
import {darfAdminPflege} from "../../auth/rollen";
import {ArtistDialog} from "../pflege/ArtistDialog";
import {pageTitleAtom} from "../../context/atoms";
import {useJunkiesService} from "../../hooks/useJunkiesService";
import {artistAusInfo, useArtistService} from "../../hooks/useArtistDetails";
import {EBoxArtist, EBoxSet} from "../../hooks/types";
import {SetCardList} from "../filter/SetCardList";
import {ArtistKopf} from "./ArtistKopf";

/** So viele ähnliche Artists werden nachgeschlagen und angezeigt. */
export const MAX_AEHNLICHE = 8;

/** Seite /artist/:nid – Artist per artistinfo, seine Sets aus dem Index mit djs[]=djid. */
export const ArtistContainer = () => {
	const nid = Number(useParams().nid);
	const junkies = useJunkiesService();
	const artistService = useArtistService();
	const [, setPageTitle] = useAtom(pageTitleAtom);
	// null: lädt, undefined: gibt es nicht
	const [artist, setArtist] = useState<EBoxArtist | null | undefined>(null);
	const [aehnliche, setAehnliche] = useState<EBoxArtist[]>([]);
	const [sets, setSets] = useState<EBoxSet[]>([]);
	const [page, setPage] = useState(0);
	const pflege = usePflege();
	const [bearbeiten, setBearbeiten] = useState(false);
	const [version, setVersion] = useState(0);

	useEffect(() => {
		artistService.artistInfo(nid)
			.then(info => setArtist(artistAusInfo(info) ?? undefined))
			.catch(() => setArtist(undefined));
	}, [artistService, nid, version]);
	useEffect(() => setPageTitle(artist ? artist.name : "Artist"), [artist, setPageTitle]);

	useEffect(() => {
		const nids = artist?.similar?.slice(0, MAX_AEHNLICHE) ?? [];
		let aktuell = true;
		Promise.all(nids.map(n => artistService.artistInfo(n).then(artistAusInfo).catch(() => null)))
			.then(liste => aktuell && setAehnliche(liste.filter((a): a is EBoxArtist => a !== null)));
		return () => {
			aktuell = false;
		};
	}, [artist, artistService]);

	const djid = artist?.djid;
	useEffect(() => {
		if (!djid) {
			return;
		}
		junkies.setlist({djs: [djid], page})
			.then(neu => setSets(alt => page === 0 ? neu : [...alt, ...neu]));
	}, [junkies, djid, page]);

	if (artist === null) {
		return null;
	}
	if (artist === undefined) {
		return <Typography data-testid="artist-missing">Diesen Artist gibt es nicht.</Typography>;
	}
	return <Box sx={{pb: 16}}>
		<ArtistKopf artist={artist} aehnliche={aehnliche} aktion={darfAdminPflege(pflege.rollen) &&
			<Button size="small" startIcon={<EditIcon/>} onClick={() => setBearbeiten(true)}>Bearbeiten</Button>}/>
		{bearbeiten && <ArtistDialog nid={nid} onClose={() => setBearbeiten(false)} onGespeichert={() => {
			// artistinfo liegt im sessionStorage; nach dem Speichern neu holen
			sessionStorage.removeItem("artist_" + nid);
			setVersion(v => v + 1);
		}}/>}
		<SetCardList sets={sets} title={`Sets von ${artist.name}`} onNextPage={() => setPage(p => p + 1)}/>
	</Box>;
}
