import {useEffect, useState} from "react";
import {useArtistDetails} from "../../hooks/useArtistDetails";
import {EBoxSet} from "../../hooks/types";
import SetCard from "./SetCard";
import {usePlaylist} from "../../components/playlist/hooks/usePlaylist";
import {mapFromJsonSet, useJunkiesService} from "../../hooks/useJunkiesService";
import {usePflege} from "../../hooks/usePflege";
import {setAktionen} from "../../auth/rollen";
import {SetPflegeMenue} from "../pflege/SetPflegeMenue";
import {setEigentum, statusHinweis} from "../pflege/pflegeModel";

interface Props {
	nummer: number;
	cardData: EBoxSet;
	hinweis?: string;
}

export const SetCardContainer = ({nummer, cardData, hinweis}:Props) => {
	const playlist = usePlaylist();
	const junkiesService = useJunkiesService();
	const pflege = usePflege();
	const artistDetails = useArtistDetails({artists:cardData.artists});
	const [ details, setDetails ] = useState<EBoxSet>(cardData);

	useEffect(() => {
		let mounted = true;
		if (artistDetails.length > 0 && mounted) {
			setDetails((details) => {
				return {...details, artistDetails: artistDetails}
			})
		}
		return () => {mounted = false;}
	}, [artistDetails])

	const enqueueAction = () => {
		playlist.controls.addAll(details)
	}
	const playAction = () => {
		playlist.controls.replace(details)
	}
	const bookmarkAction = () => {
		junkiesService.bookmark(details.nid, !details.bookmarked)
			.then(() => setDetails({...details, bookmarked: !details.bookmarked}))
	}
	// Antwort der Pflege-Endpunkte (Mxlnode): Set neu abbilden, geladene Artist-Bilder behalten
	const geaendert = (mxlnode: any) => {
		if (mxlnode?.nid) {
			setDetails(alt => ({...mapFromJsonSet(junkiesService, mxlnode), artistDetails: alt.artistDetails}));
		}
	}
	const menue = setAktionen(pflege.rollen, setEigentum(details)).length > 0
		? <SetPflegeMenue set={details} onGeaendert={geaendert}/> : undefined;
	const hinweise = [statusHinweis(details), hinweis].filter(Boolean).join(" · ") || undefined;
	return <SetCard nummer={nummer} cardData={details} hinweis={hinweise} menue={menue}
					playAction={playAction} enqueueAction={enqueueAction} bookmarkAction={bookmarkAction}/>
}