import {useEffect, useState} from "react";
import {Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle} from "@mui/material";
import {EBoxGenreTerm, EBoxSet} from "../../hooks/types";
import {mapFromJsonSet, useJunkiesService} from "../../hooks/useJunkiesService";
import {usePflege} from "../../hooks/usePflege";
import {aenderungen, fehlerAufteilen, formularAusSet, SET_FELDER, SetFormular} from "./pflegeModel";
import {SetFelder} from "./SetFelder";

interface Props {
	set: EBoxSet;
	onClose(): void;
	/** Antwort von setbearbeiten (Mxlnode mit dem Ergebnis der Aufbereitung) */
	onGespeichert(mxlnode: any): void;
}

/** Dialog „Set bearbeiten“: setbearbeiten mit den geänderten Feldern, Eingabefehler (406) am Feld. */
export const SetBearbeitenDialog = ({set, onClose, onGespeichert}: Props) => {
	const junkies = useJunkiesService();
	const pflege = usePflege();
	const [genres, setGenres] = useState<EBoxGenreTerm[] | null>(null);
	const [ausgang, setAusgang] = useState<SetFormular | null>(null);
	const [formular, setFormular] = useState<SetFormular | null>(null);
	const [fehler, setFehler] = useState<Record<string, string>>({});
	const [allgemein, setAllgemein] = useState<string | undefined>();
	const [speichert, setSpeichert] = useState(false);

	// beim Öffnen den echten Stand per setpflege laden (Titel, Artist-Erkennung, Genres vom Artist)
	useEffect(() => {
		let aktuell = true;
		pflege.api()
			.then(api => api.setPflege(set.nid))
			.then(async json => {
				const stand = mapFromJsonSet(junkies, json);
				const djids = stand.djids ?? [];
				const [terme, artists] = await Promise.all([
					junkies.genres().catch(() => [] as EBoxGenreTerm[]),
					djids.length > 0 ? junkies.artists({djid: djids}).catch(() => []) : Promise.resolve([]),
				]);
				if (!aktuell) {
					return;
				}
				const nurGenres = (terme as EBoxGenreTerm[]).filter(t => t.vocabulary === "genre");
				const namen = djids.map(d => artists.find(a => a.djid === d)?.name).filter((n): n is string => Boolean(n));
				const f = formularAusSet(stand, namen, nurGenres);
				setGenres(nurGenres);
				setAusgang(f);
				setFormular(f);
			})
			.catch((e: Error) => aktuell && setAllgemein(e.message));
		return () => {
			aktuell = false;
		};
		// nur beim Öffnen laden, nicht bei jeder Token-Erneuerung
	}, [junkies, set.nid]);

	const speichern = () => {
		if (!ausgang || !formular) {
			return;
		}
		const body = aenderungen(ausgang, formular);
		if (Object.keys(body).length === 0) {
			onClose();
			return;
		}
		setSpeichert(true);
		setFehler({});
		setAllgemein(undefined);
		pflege.api()
			.then(api => api.setBearbeiten(set.nid, body))
			.then(antwort => {
				onGespeichert(antwort);
				onClose();
			})
			.catch(e => {
				const geteilt = fehlerAufteilen(e, SET_FELDER);
				setFehler(geteilt.felder);
				setAllgemein(geteilt.allgemein);
			})
			.finally(() => setSpeichert(false));
	};

	return <Dialog open onClose={onClose} fullWidth>
		<DialogTitle>Set bearbeiten</DialogTitle>
		<DialogContent>
			{allgemein && <Alert severity="error" sx={{mb: 1}}>{allgemein}</Alert>}
			{formular && genres
				? <SetFelder formular={formular} onChange={setFormular} fehler={fehler} genres={genres}/>
				: !allgemein && <CircularProgress size={24}/>}
		</DialogContent>
		<DialogActions>
			<Button onClick={onClose}>Abbrechen</Button>
			<Button variant="contained" disabled={!formular || !formular.title.trim() || speichert} onClick={speichern}>
				Speichern
			</Button>
		</DialogActions>
	</Dialog>;
};
