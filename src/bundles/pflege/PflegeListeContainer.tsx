import {useEffect, useState} from "react";
import {useAtom} from "jotai";
import {Alert} from "@mui/material";
import {pageTitleAtom} from "../../context/atoms";
import {mapFromJsonSet, useJunkiesService} from "../../hooks/useJunkiesService";
import {usePflege} from "../../hooks/usePflege";
import {EBoxSet} from "../../hooks/types";
import {SetCardList} from "../filter/SetCardList";

export type PflegeListe = "meine" | "deaktiviert";

const TITEL: Record<PflegeListe, string> = {meine: "Meine Sets", deaktiviert: "Deaktivierte Sets"};

/**
 * Presets „Meine Sets“ (Uploader/Admin, alle eigenen Sets auch unfertige und deaktivierte) und „Deaktivierte Sets“
 * (Admin); ebox-backend liefert je höchstens 500 Mxlnodes, deshalb ohne Nachladen.
 */
export const PflegeListeContainer = ({liste}: { liste: PflegeListe }) => {
	const junkies = useJunkiesService();
	const pflege = usePflege();
	const [, setPageTitle] = useAtom(pageTitleAtom);
	const [sets, setSets] = useState<EBoxSet[]>([]);
	const [fehler, setFehler] = useState<string | undefined>();

	useEffect(() => setPageTitle(TITEL[liste]), [liste, setPageTitle]);
	useEffect(() => {
		let aktuell = true;
		pflege.api()
			.then(api => liste === "meine" ? api.meineSets() : api.deaktivierteSets())
			.then(json => aktuell && setSets((json ?? []).map(s => mapFromJsonSet(junkies, s))))
			.catch((e: Error) => aktuell && setFehler(e.message));
		return () => {
			aktuell = false;
		};
		// nur beim Wechsel der Liste laden, nicht bei jeder Token-Erneuerung
	}, [liste, junkies]);

	return <>
		{fehler && <Alert severity="error">{fehler}</Alert>}
		<SetCardList sets={sets} title={TITEL[liste]} onNextPage={() => undefined}/>
	</>;
};
