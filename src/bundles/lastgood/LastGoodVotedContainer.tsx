import {useEffect, useState} from "react";
import {useAtom} from "jotai";
import {pageTitleAtom} from "../../context/atoms";
import {useJunkiesService} from "../../hooks/useJunkiesService";
import {SetCardList} from "../filter/SetCardList";
import {EBoxSet} from "../../hooks/types";

/** Basisfilter 12: Sets nach erstem guten Vote, neueste zuerst. */
export const VOTINGS_ZULETZT_GUT = 12;

export const zuletztGutHinweis = (set: EBoxSet): string | undefined => {
	const vote = set.votes?.firstGood;
	return vote && `gut bewertet von ${vote.name} am ${vote.timestamp.toLocaleDateString()}`;
}

export const LastGoodVotedContainer = () => {
	const junkies = useJunkiesService();
	const [, setPageTitle] = useAtom(pageTitleAtom);
	const [sets, setSets] = useState<EBoxSet[]>([]);
	const [page, setPage] = useState(0);

	useEffect(() => setPageTitle("Zuletzt gut bewertet"), [setPageTitle]);
	useEffect(() => {
		junkies.setlist({votings: VOTINGS_ZULETZT_GUT, page})
			.then(neu => setSets(alt => page === 0 ? neu : [...alt, ...neu]));
	}, [junkies, page]);

	return <SetCardList sets={sets} title="Zuletzt gut bewertet" hinweis={zuletztGutHinweis}
							  onNextPage={() => setPage(p => p + 1)}/>;
}
