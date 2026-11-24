import {useEffect, useState} from "react";
import {useAtom} from "jotai";
import {pageTitleAtom} from "../../context/atoms";
import {useJunkiesService} from "../../hooks/useJunkiesService";
import {usePlaylist} from "../../components/playlist/hooks/usePlaylist";
import {EBoxPlay} from "../../hooks/types";
import {PlayingList} from "./PlayingList";

/** „Gerade gehört“: lädt beim Öffnen und dann jede Minute neu. */
export const PlayingContainer = () => {
	const junkies = useJunkiesService();
	const playlist = usePlaylist();
	const [, setPageTitle] = useAtom(pageTitleAtom);
	const [plays, setPlays] = useState<EBoxPlay[] | null>(null);
	const [jetzt, setJetzt] = useState(new Date());

	useEffect(() => setPageTitle("Gerade gehört"), [setPageTitle]);
	useEffect(() => {
		const laden = () => junkies.playing()
			.then(p => {
				setPlays(p);
				setJetzt(new Date());
			})
			.catch(() => setPlays([]));
		laden();
		const timer = setInterval(laden, 60_000);
		return () => clearInterval(timer);
	}, [junkies]);

	return plays && <PlayingList plays={plays} jetzt={jetzt}
										  onPlay={p => playlist.controls.replace(p.set)}
										  onEnqueue={p => playlist.controls.addAll(p.set)}/>;
}
