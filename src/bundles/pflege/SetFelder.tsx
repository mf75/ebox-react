import {Autocomplete, FormControlLabel, Stack, Switch, TextField} from "@mui/material";
import {EBoxGenreTerm} from "../../hooks/types";
import {SetFormular} from "./pflegeModel";
import {ArtistAuswahl} from "./ArtistAuswahl";

interface Props {
	formular: SetFormular;
	onChange(formular: SetFormular): void;
	/** form_errors vom Server: title, setcreated, artistnames, genres */
	fehler: Record<string, string>;
	/** nur Begriffe aus dem Vokabular Genres; fehlt = Genres nicht anzeigen (erster Wizard-Schritt) */
	genres?: EBoxGenreTerm[];
}

/** Felder eines Sets für Bearbeiten-Dialog und Upload-Wizard */
export const SetFelder = ({formular: f, onChange, fehler, genres}: Props) => {
	const setze = (teil: Partial<SetFormular>) => onChange({...f, ...teil});
	return <Stack spacing={2} sx={{mt: 1}}>
		<TextField label="Titel" required value={f.title} onChange={e => setze({title: e.target.value})}
				   error={Boolean(fehler.title)} helperText={fehler.title ?? "z. B. „Artist – Name des Mixes“"}
				   slotProps={{htmlInput: {"data-testid": "set-titel"}}}/>
		<TextField label="Aufnahmedatum" type="date" value={f.setcreated} onChange={e => setze({setcreated: e.target.value})}
				   error={Boolean(fehler.setcreated)} helperText={fehler.setcreated ?? "ein Datum im Titel hat Vorrang"}
				   slotProps={{inputLabel: {shrink: true}}}/>
		{genres && <FormControlLabel label="Artists aus dem Titel erkennen" control={
			<Switch checked={f.artistErkennung} onChange={e => setze({artistErkennung: e.target.checked})}/>}/>}
		<ArtistAuswahl value={f.artistnames} fehler={fehler.artistnames}
					   onChange={namen => setze({artistnames: namen, artistErkennung: false})}/>
		{genres && <>
			<FormControlLabel label="Genres vom Artist übernehmen" control={
				<Switch checked={f.genresVomArtist} onChange={e => setze({genresVomArtist: e.target.checked})}/>}/>
			<Autocomplete multiple disabled={f.genresVomArtist} options={genres} getOptionLabel={g => g.name}
						  isOptionEqualToValue={(a, b) => a.tid === b.tid}
						  value={f.genres.map(tid => genres.find(g => g.tid === tid)).filter((g): g is EBoxGenreTerm => g !== undefined)}
						  onChange={(_e, wert) => setze({genres: wert.map(g => g.tid)})}
						  renderInput={params => <TextField {...params} label="Genres" error={Boolean(fehler.genres)}
															helperText={fehler.genres}/>}/>
		</>}
	</Stack>;
};
