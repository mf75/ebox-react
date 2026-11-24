import {useCallback, useEffect, useMemo, useState} from "react";
import {useNavigate, useParams} from "react-router";
import {useAtom} from "jotai";
import {Typography} from "@mui/material";
import {filterVersionAtom, notifyMessageAtom, pageTitleAtom} from "../../context/atoms";
import {useJunkiesService} from "../../hooks/useJunkiesService";
import useAuthService from "../../hooks/useAuthService";
import {useDebouncedValue} from "../../hooks/useDebouncedValue";
import {EBoxArtistTreffer, EBoxGenreTerm, NotifyMessage} from "../../hooks/types";
import {alsParameter, darfAendern, entwurfAusFilter, FilterEntwurf, istAdmin} from "./filterModel";
import {FilterEditor, Vorschau} from "./FilterEditor";

const VORSCHAU_ANZAHL = 8;

/** /filter/neu und /filter/:id/bearbeiten */
export const FilterEditorContainer = () => {
	const params = useParams();
	const filterid = params.id ? Number(params.id) : undefined;
	const junkies = useJunkiesService();
	const auth = useAuthService();
	const admin = istAdmin(auth.user);
	const navigate = useNavigate();
	const [, setPageTitle] = useAtom(pageTitleAtom);
	const [, setFilterVersion] = useAtom(filterVersionAtom);
	const [, setNotify] = useAtom(notifyMessageAtom);

	const [entwurf, setEntwurf] = useState<FilterEntwurf | null>(filterid ? null : {filtername: "", is_preset: false, kriterien: {}});
	const [fehlt, setFehlt] = useState(false);
	const [genres, setGenres] = useState<EBoxGenreTerm[]>([]);
	const [artistNamen, setArtistNamen] = useState<EBoxArtistTreffer[]>([]);
	const [vorschau, setVorschau] = useState<Vorschau | undefined>();
	const [speichert, setSpeichert] = useState(false);

	const meldung = useCallback((message: string, severity: NotifyMessage["severity"]) =>
		setNotify({message, severity, autohide: severity === "error" ? 10000 : 3000}), [setNotify]);

	useEffect(() => setPageTitle(filterid ? "Filter bearbeiten" : "Neuer Filter"), [filterid, setPageTitle]);
	useEffect(() => {
		junkies.genres().then(setGenres).catch(() => setGenres([]));
	}, [junkies]);
	useEffect(() => {
		if (!filterid) {
			return;
		}
		junkies.filterlist(filterid).then(liste => {
			const gefunden = liste?.find(f => Number(f.filterid) === filterid);
			if (!gefunden || !darfAendern(gefunden.is_preset === true, admin)) {
				setFehlt(true);
				return;
			}
			const neu = entwurfAusFilter(gefunden);
			setEntwurf(neu);
			if (neu.kriterien.djs?.length) {
				junkies.artists({djid: neu.kriterien.djs}).then(setArtistNamen).catch(() => undefined);
			}
		});
	}, [junkies, filterid, admin]);

	// Vorschau: erste Treffer des Index mit denselben Parametern, verzögert nach jeder Änderung
	const parameterKey = JSON.stringify(entwurf ? alsParameter(entwurf.kriterien) : null);
	const verzoegert = useDebouncedValue(parameterKey, 600);
	useEffect(() => {
		const parameter = JSON.parse(verzoegert);
		if (!parameter) {
			return;
		}
		let aktuell = true;
		setVorschau(undefined);
		junkies.setlist({...parameter, perpage: VORSCHAU_ANZAHL + 1, page: 0})
			.then(sets => aktuell && setVorschau({titel: sets.slice(0, VORSCHAU_ANZAHL).map(s => s.title), mehr: sets.length > VORSCHAU_ANZAHL}))
			.catch(() => aktuell && setVorschau({titel: [], mehr: false}));
		return () => {
			aktuell = false;
		};
	}, [junkies, verzoegert]);

	const sucheArtists = useMemo(() => (teil: string) => junkies.artists({s: teil}), [junkies]);

	if (fehlt) {
		return <Typography data-testid="filter-fehlt">Diesen Filter gibt es nicht oder du darfst ihn nicht ändern.</Typography>;
	}
	if (!entwurf) {
		return null;
	}
	const speichern = () => {
		setSpeichert(true);
		junkies.saveFilter(entwurf)
			.then(filter => {
				setFilterVersion(v => v + 1);
				meldung(`Filter „${filter.filtername}“ gespeichert`, "success");
				navigate("/filter/" + filter.filterid);
			})
			.catch((e: Error) => meldung(e.message, "error"))
			.finally(() => setSpeichert(false));
	}
	const loeschen = () => {
		junkies.deleteFilter(entwurf.filterid!)
			.then(() => {
				setFilterVersion(v => v + 1);
				meldung(`Filter „${entwurf.filtername}“ gelöscht`, "success");
				navigate("/home");
			})
			.catch((e: Error) => meldung(e.message, "error"));
	}
	return <FilterEditor entwurf={entwurf} onChange={setEntwurf} genres={genres} artistNamen={artistNamen}
						 sucheArtists={sucheArtists} vorschau={vorschau} istAdmin={admin} speichert={speichert}
						 onSave={speichern} onCancel={() => navigate(filterid ? "/filter/" + filterid : "/home")}
						 onDelete={filterid ? loeschen : undefined}/>;
}
