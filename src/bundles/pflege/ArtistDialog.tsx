import {useEffect, useState} from "react";
import {
	Alert, Autocomplete, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel,
	Stack, Switch, TextField
} from "@mui/material";
import {usePflege} from "../../hooks/usePflege";
import {ArtistAenderung, ArtistPflegeDaten} from "../../api/PflegeApi";
import {fehlerAufteilen} from "./pflegeModel";

interface Props {
	nid: number;
	onClose(): void;
	onGespeichert?(artist: ArtistPflegeDaten): void;
}

const ARTIST_FELDER = ["name", "aliases", "artisttype", "country", "lastfm_artistname"];

/** nur geänderte Felder für artistbearbeiten */
export const artistAenderungen = (alt: ArtistPflegeDaten, neu: ArtistPflegeDaten): ArtistAenderung => {
	const a: ArtistAenderung = {};
	if (neu.name.trim() !== alt.name) a.name = neu.name.trim();
	if (neu.aliases.join("\n") !== alt.aliases.join("\n")) a.aliases = neu.aliases;
	if (neu.artisttype !== alt.artisttype) a.artisttype = neu.artisttype === "blacklisted" ? "blacklisted" : "normal";
	if (neu.country.trim() !== alt.country) a.country = neu.country.trim();
	if (neu.lastfm_artistname.trim() !== alt.lastfm_artistname) a.lastfm_artistname = neu.lastfm_artistname.trim();
	return a;
};

/** Artist-Dialog (Admin): Name, Aliases, Blacklist, Land, Last.fm-Name, Abgleich auslösen. */
export const ArtistDialog = ({nid, onClose, onGespeichert}: Props) => {
	const pflege = usePflege();
	const [ausgang, setAusgang] = useState<ArtistPflegeDaten | null>(null);
	const [d, setD] = useState<ArtistPflegeDaten | null>(null);
	const [fehler, setFehler] = useState<Record<string, string>>({});
	const [allgemein, setAllgemein] = useState<string | undefined>();
	const [hinweis, setHinweis] = useState<string | undefined>();
	const [laeuft, setLaeuft] = useState(false);

	useEffect(() => {
		let aktuell = true;
		pflege.api().then(api => api.artistLesen(nid))
			.then(artist => {
				if (aktuell) {
					setAusgang(artist);
					setD(artist);
				}
			})
			.catch((e: Error) => aktuell && setAllgemein(e.message));
		return () => {
			aktuell = false;
		};
		// pflege ändert sich mit jeder Token-Erneuerung; der Artist soll nur einmal geladen werden
	}, [nid]);

	const senden = (aenderung: ArtistAenderung, schliessen: boolean) => {
		setLaeuft(true);
		setFehler({});
		setAllgemein(undefined);
		setHinweis(undefined);
		pflege.api().then(api => api.artistBearbeiten(nid, aenderung))
			.then(artist => {
				onGespeichert?.(artist);
				if (schliessen) {
					onClose();
				} else {
					setAusgang(artist);
					setD(d => d && {...d, lastfm_nexttry: artist.lastfm_nexttry});
					setHinweis("Abgleich angestoßen – er läuft beim nächsten Durchgang mit Last.fm.");
				}
			})
			.catch(e => {
				const geteilt = fehlerAufteilen(e, ARTIST_FELDER);
				setFehler(geteilt.felder);
				setAllgemein(geteilt.allgemein);
			})
			.finally(() => setLaeuft(false));
	};

	const speichern = () => {
		if (!ausgang || !d) {
			return;
		}
		const aenderung = artistAenderungen(ausgang, d);
		if (Object.keys(aenderung).length === 0) {
			onClose();
			return;
		}
		senden(aenderung, true);
	};

	return <Dialog open onClose={onClose} fullWidth>
		<DialogTitle>Artist {ausgang ? `„${ausgang.name}“` : ""}</DialogTitle>
		<DialogContent>
			{allgemein && <Alert severity="error" sx={{mb: 1}}>{allgemein}</Alert>}
			{hinweis && <Alert severity="success" sx={{mb: 1}}>{hinweis}</Alert>}
			{!d && !allgemein && <CircularProgress size={24}/>}
			{d && <Stack spacing={2} sx={{mt: 1}}>
				<TextField label="Name" value={d.name} onChange={e => setD({...d, name: e.target.value})}
						   error={Boolean(fehler.name)} helperText={fehler.name ?? "wird klein geschrieben gespeichert"}
						   slotProps={{htmlInput: {"data-testid": "artist-name"}}}/>
				<Autocomplete multiple freeSolo options={[] as string[]} value={d.aliases}
							  onChange={(_e, wert) => setD({...d, aliases: wert.map(w => String(w).trim()).filter(Boolean)})}
							  renderInput={params => <TextField {...params} label="Aliases" error={Boolean(fehler.aliases)}
																helperText={fehler.aliases ?? "Alias eintippen und Enter drücken"}/>}/>
				<FormControlLabel label="Blacklist (nie als Artist erkennen)" control={
					<Switch checked={d.artisttype === "blacklisted"}
							onChange={e => setD({...d, artisttype: e.target.checked ? "blacklisted" : "normal"})}/>}/>
				{fehler.artisttype && <Alert severity="error">{fehler.artisttype}</Alert>}
				<TextField label="Land" value={d.country} onChange={e => setD({...d, country: e.target.value})}
						   error={Boolean(fehler.country)} helperText={fehler.country ?? "z. B. de"}/>
				<TextField label="Last.fm-Name" value={d.lastfm_artistname}
						   onChange={e => setD({...d, lastfm_artistname: e.target.value})}
						   error={Boolean(fehler.lastfm_artistname)}
						   helperText={fehler.lastfm_artistname ?? (d.lastfm_errorcount ? `${d.lastfm_errorcount} Fehler beim Abgleich` : undefined)}/>
			</Stack>}
		</DialogContent>
		<DialogActions>
			<Button disabled={!d || laeuft} onClick={() => senden({abgleich: true}, false)}>Abgleich auslösen</Button>
			<Button onClick={onClose}>Abbrechen</Button>
			<Button variant="contained" disabled={!d || !d.name.trim() || laeuft} onClick={speichern}>Speichern</Button>
		</DialogActions>
	</Dialog>;
};

interface NeuProps {
	onClose(): void;
	onAngelegt(artist: ArtistPflegeDaten): void;
}

/** „Neuer Artist“ (Uploader und Admin): artistanlegen mit dem Namen */
export const NeuerArtistDialog = ({onClose, onAngelegt}: NeuProps) => {
	const pflege = usePflege();
	const [name, setName] = useState("");
	const [fehler, setFehler] = useState<string | undefined>();
	const [laeuft, setLaeuft] = useState(false);
	const anlegen = () => {
		setLaeuft(true);
		setFehler(undefined);
		pflege.api().then(api => api.artistAnlegen(name.trim()))
			.then(artist => {
				onAngelegt(artist);
				onClose();
			})
			.catch(e => {
				const geteilt = fehlerAufteilen(e, ["name"]);
				setFehler(geteilt.felder.name ?? geteilt.allgemein);
			})
			.finally(() => setLaeuft(false));
	};
	return <Dialog open onClose={onClose} fullWidth>
		<DialogTitle>Neuer Artist</DialogTitle>
		<DialogContent>
			<TextField autoFocus fullWidth label="Name" value={name} onChange={e => setName(e.target.value)} sx={{mt: 1}}
					   error={Boolean(fehler)} helperText={fehler ?? "mindestens 4 Zeichen, kein Genre-Name"}
					   slotProps={{htmlInput: {"data-testid": "neuer-artist-name"}}}
					   onKeyDown={e => e.key === "Enter" && name.trim() && anlegen()}/>
		</DialogContent>
		<DialogActions>
			<Button onClick={onClose}>Abbrechen</Button>
			<Button variant="contained" disabled={!name.trim() || laeuft} onClick={anlegen}>Anlegen</Button>
		</DialogActions>
	</Dialog>;
};
