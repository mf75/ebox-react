import {useEffect, useRef, useState} from "react";
import {
	Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, List,
	ListItem, ListItemText, Stack, Step, StepLabel, Stepper, Typography
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import {EBoxSet} from "../../hooks/types";
import {mapFromJsonSet, useJunkiesService} from "../../hooks/useJunkiesService";
import {usePflege} from "../../hooks/usePflege";
import {pruefeUploadDatei, TrackScanErgebnis, UPLOAD_ENDUNGEN, UploadAuftrag} from "../../api/PflegeApi";
import {datumAlsText, fehlerAufteilen, neuesSet, SET_FELDER, setEigentum, SetFormular} from "./pflegeModel";
import {istUnfertig} from "../../auth/rollen";
import {SetFelder} from "./SetFelder";
import {SetBearbeitenDialog} from "./SetBearbeitenDialog";

interface Props {
	/** bestehendes Set (Upload fortsetzen, weitere Dateien); ohne: neues Set anlegen */
	set?: EBoxSet;
	onClose(): void;
	/** jede Antwort mit dem Set (Mxlnode) nach Anlegen, Korrektur und Track-Scan */
	onGeaendert?(mxlnode: any): void;
}

const LEER: SetFormular = {title: "", setcreated: "", artistErkennung: true, artistnames: [], genresVomArtist: false, genres: []};

interface DateiStand {
	datei: File;
	/** 0..1 */
	anteil: number;
	status: "wartet" | "laeuft" | "fertig" | "fehler";
	meldung?: string;
}

/** Artist-Namen zu djids (artists-Suche), für die Anzeige des Ergebnisses der Aufbereitung */
const useArtistNamen = (djids: number[]): string[] => {
	const junkies = useJunkiesService();
	const [namen, setNamen] = useState<string[]>([]);
	const schluessel = djids.join(",");
	useEffect(() => {
		const liste = schluessel ? schluessel.split(",").map(Number) : [];
		if (liste.length === 0) {
			setNamen([]);
			return;
		}
		let aktuell = true;
		junkies.artists({djid: liste})
			.then(t => aktuell && setNamen(liste.map(d => t.find(a => a.djid === d)?.name ?? `DJ ${d}`)))
			.catch(() => undefined);
		return () => {
			aktuell = false;
		};
	}, [junkies, schluessel]);
	return namen;
};

/** Ergebnis der Set-Aufbereitung (erkannter Titel, Datum, Artists, Genres) */
const Aufbereitung = ({set}: { set: EBoxSet }) => {
	const artists = useArtistNamen(set.djids ?? []);
	return <Box data-testid="aufbereitung">
		<Typography variant="subtitle2">Ergebnis der Aufbereitung</Typography>
		<Typography variant="body2">Titel: {set.title}</Typography>
		<Typography variant="body2">Aufnahmedatum: {datumAlsText(set.created) || "–"}</Typography>
		<Typography variant="body2">Artists: {artists.join(", ") || "keine erkannt"}</Typography>
		<Typography variant="body2">Genres: {(set.genres ?? []).map(g => g.name).join(", ") || "–"}</Typography>
	</Box>;
};

/**
 * Wizard „Set hochladen“: (1) Set anlegen und Ergebnis der Aufbereitung korrigieren, (2) Dateien nacheinander
 * hochladen, (3) Track-Scan. Abbruch lässt das Set unfertig; fortsetzen über „Meine Sets“.
 */
export const UploadWizard = ({set, onClose, onGeaendert}: Props) => {
	const junkies = useJunkiesService();
	const pflege = usePflege();
	const [schritt, setSchritt] = useState(set ? 1 : 0);
	const [aktuellesSet, setAktuellesSet] = useState<EBoxSet | undefined>(set);
	const [formular, setFormular] = useState<SetFormular>(LEER);
	const [fehler, setFehler] = useState<Record<string, string>>({});
	const [allgemein, setAllgemein] = useState<string | undefined>();
	const [laeuft, setLaeuft] = useState(false);
	const [korrigieren, setKorrigieren] = useState(false);
	const [dateien, setDateien] = useState<DateiStand[]>([]);
	const [abgelehnt, setAbgelehnt] = useState<string[]>([]);
	const [scan, setScan] = useState<TrackScanErgebnis | null>(null);
	const auftrag = useRef<UploadAuftrag | null>(null);
	const abgebrochen = useRef(false);

	useEffect(() => () => {
		abgebrochen.current = true;
		auftrag.current?.abbrechen();
	}, []);

	const fehlerZeigen = (e: unknown) => {
		const geteilt = fehlerAufteilen(e, SET_FELDER);
		setFehler(geteilt.felder);
		setAllgemein(geteilt.allgemein);
	};
	const uebernehmen = (mxlnode: any) => {
		setAktuellesSet(mapFromJsonSet(junkies, mxlnode));
		onGeaendert?.(mxlnode);
	};

	const anlegen = () => {
		setLaeuft(true);
		setFehler({});
		setAllgemein(undefined);
		pflege.api()
			.then(api => api.setAnlegen(neuesSet(formular)))
			.then(uebernehmen)
			.catch(fehlerZeigen)
			.finally(() => setLaeuft(false));
	};

	const dateienWaehlen = (liste: FileList | null) => {
		const gewaehlt = Array.from(liste ?? []);
		setAbgelehnt(gewaehlt.map(pruefeUploadDatei).filter((m): m is string => m !== null));
		setDateien(alt => [...alt.filter(d => d.status !== "wartet"),
			...gewaehlt.filter(d => pruefeUploadDatei(d) === null).map(datei => ({datei, anteil: 0, status: "wartet" as const}))]);
	};

	const setze = (i: number, teil: Partial<DateiStand>) =>
		setDateien(alt => alt.map((d, j) => j === i ? {...d, ...teil} : d));

	const trackScan = (nid: number) => {
		setSchritt(2);
		setLaeuft(true);
		setAllgemein(undefined);
		pflege.api()
			.then(api => api.trackScan(nid))
			.then(ergebnis => {
				setScan(ergebnis);
				uebernehmen(ergebnis.set);
			})
			.catch(fehlerZeigen)
			.finally(() => setLaeuft(false));
	};

	const hochladen = async () => {
		if (!aktuellesSet) {
			return;
		}
		setLaeuft(true);
		setAllgemein(undefined);
		let fehlerAnzahl = 0;
		try {
			const api = await pflege.api();
			for (let i = 0; i < dateien.length; i++) {
				if (abgebrochen.current) {
					return;
				}
				if (dateien[i].status === "fertig") {
					continue;
				}
				setze(i, {status: "laeuft", anteil: 0, meldung: undefined});
				auftrag.current = api.upload(aktuellesSet.nid, dateien[i].datei, anteil => setze(i, {anteil}));
				try {
					await auftrag.current.ergebnis;
					setze(i, {status: "fertig", anteil: 1});
				} catch (e) {
					fehlerAnzahl++;
					setze(i, {status: "fehler", meldung: (e as Error).message});
				}
			}
		} catch (e) {
			fehlerZeigen(e);
			return;
		} finally {
			auftrag.current = null;
			setLaeuft(false);
		}
		// Track-Scan automatisch nach der letzten Datei, wenn alles angekommen ist
		if (fehlerAnzahl === 0 && !abgebrochen.current) {
			trackScan(aktuellesSet.nid);
		}
	};

	const unfertig = aktuellesSet !== undefined && istUnfertig(setEigentum(aktuellesSet)) && !(scan && scan.tracks > 0);
	const offen = dateien.some(d => d.status !== "fertig");

	return <Dialog open onClose={laeuft ? undefined : onClose} fullWidth maxWidth="sm">
		<DialogTitle>{set ? `Dateien zu „${set.title}“` : "Set hochladen"}</DialogTitle>
		<DialogContent>
			<Stepper activeStep={schritt} sx={{mb: 3}}>
				{["Set anlegen", "Dateien", "Track-Scan"].map(l => <Step key={l}><StepLabel>{l}</StepLabel></Step>)}
			</Stepper>
			{allgemein && <Alert severity="error" sx={{mb: 2}}>{allgemein}</Alert>}

			{schritt === 0 && !aktuellesSet &&
				<SetFelder formular={formular} onChange={setFormular} fehler={fehler}/>}
			{schritt === 0 && aktuellesSet && <Stack spacing={2}>
				<Aufbereitung set={aktuellesSet}/>
				<Box><Button onClick={() => setKorrigieren(true)}>Angaben korrigieren</Button></Box>
			</Stack>}

			{schritt === 1 && <Stack spacing={2}>
				<Box>
					<Button component="label" variant="outlined" startIcon={<UploadFileIcon/>} disabled={laeuft}>
						Audiodateien wählen
						<input hidden multiple type="file" data-testid="dateien"
							   accept={UPLOAD_ENDUNGEN.map(e => "." + e).join(",")}
							   onChange={e => {
								   dateienWaehlen(e.target.files);
								   e.target.value = "";
							   }}/>
					</Button>
					<Typography variant="caption" sx={{display: "block", mt: 1}} color="text.secondary">
						{UPLOAD_ENDUNGEN.join(", ")}, je höchstens 1 GB
					</Typography>
				</Box>
				{abgelehnt.map(m => <Alert key={m} severity="warning">{m}</Alert>)}
				<List dense disablePadding data-testid="upload-dateien">
					{dateien.map(d => <ListItem key={d.datei.name} disableGutters sx={{display: "block"}}>
						<ListItemText primary={d.datei.name}
									  secondary={d.meldung ?? (d.status === "fertig" ? "hochgeladen" : d.status === "laeuft"
										  ? `${Math.round(d.anteil * 100)} %` : `${(d.datei.size / 1024 / 1024).toFixed(1)} MB`)}
									  slotProps={{secondary: {color: d.status === "fehler" ? "error" : undefined}}}/>
						{d.status !== "wartet" && <LinearProgress variant="determinate" value={d.anteil * 100}
																  color={d.status === "fehler" ? "error" : "primary"}/>}
					</ListItem>)}
				</List>
			</Stack>}

			{schritt === 2 && <Box data-testid="scan-ergebnis">
				{laeuft && <Stack direction="row" spacing={2} sx={{alignItems: "center"}}>
					<CircularProgress size={24}/><Typography>Track-Scan läuft …</Typography>
				</Stack>}
				{scan && <Stack spacing={1}>
					{scan.tracks > 0
						? <Alert severity="success">{scan.tracks} Track(s) gefunden ({scan.art}) – das Set ist sichtbar.</Alert>
						: <Alert severity="warning">Keine Tracks gefunden – das Set bleibt unsichtbar.</Alert>}
					{scan.probleme.map(p => <Alert key={p} severity="info">{p}</Alert>)}
				</Stack>}
			</Box>}
		</DialogContent>
		<DialogActions>
			<Button onClick={onClose} disabled={laeuft && schritt !== 1}>
				{schritt === 2 && !laeuft ? "Fertig" : unfertig ? "Abbrechen (Set bleibt unfertig)" : "Abbrechen"}
			</Button>
			{schritt === 0 && !aktuellesSet &&
				<Button variant="contained" disabled={!formular.title.trim() || laeuft} onClick={anlegen}>Set anlegen</Button>}
			{schritt === 0 && aktuellesSet &&
				<Button variant="contained" onClick={() => setSchritt(1)}>Weiter zu den Dateien</Button>}
			{schritt === 1 && aktuellesSet && !laeuft && dateien.some(d => d.status === "fertig") && offen &&
				<Button onClick={() => trackScan(aktuellesSet.nid)}>Ohne die übrigen Dateien scannen</Button>}
			{schritt === 1 && <Button variant="contained" disabled={laeuft || !offen} onClick={hochladen}>Hochladen</Button>}
			{schritt === 1 && aktuellesSet && dateien.length === 0 &&
				<Button disabled={laeuft} onClick={() => trackScan(aktuellesSet.nid)}>Nur Track-Scan</Button>}
			{schritt === 2 && !laeuft && !scan && aktuellesSet &&
				<Button variant="contained" onClick={() => trackScan(aktuellesSet.nid)}>Erneut scannen</Button>}
		</DialogActions>
		{korrigieren && aktuellesSet &&
			<SetBearbeitenDialog set={aktuellesSet} onClose={() => setKorrigieren(false)} onGespeichert={uebernehmen}/>}
	</Dialog>;
};
