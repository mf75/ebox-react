import {useEffect, useState} from "react";
import {
	Autocomplete,
	Box,
	Button,
	Checkbox,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	FormControl,
	FormControlLabel,
	FormGroup,
	FormLabel,
	InputLabel,
	List,
	ListItem,
	ListItemText,
	MenuItem,
	Paper,
	Select,
	Stack,
	TextField,
	Typography
} from "@mui/material";
import {EBoxArtistTreffer, EBoxGenreTerm} from "../../hooks/types";
import {BASISFILTER, FilterEntwurf, FilterKriterien} from "./filterModel";
import {useDebouncedValue} from "../../hooks/useDebouncedValue";

export interface Vorschau {
	titel: string[];
	/** true, wenn es mehr Treffer gibt als angezeigt */
	mehr: boolean;
}

interface Props {
	entwurf: FilterEntwurf;
	onChange(entwurf: FilterEntwurf): void;
	genres: EBoxGenreTerm[];
	/** Namen zu bereits gewählten djids (beim Bearbeiten) */
	artistNamen: EBoxArtistTreffer[];
	sucheArtists(teil: string): Promise<EBoxArtistTreffer[]>;
	vorschau?: Vorschau;
	istAdmin: boolean;
	speichert: boolean;
	onSave(): void;
	onCancel(): void;
	/** nur beim Bearbeiten eines Filters, den man ändern darf */
	onDelete?: () => void;
}

const MEINE_VOTES = [
	{wert: 0, name: "nicht bewertet"}, {wert: 1, name: "1"}, {wert: 2, name: "2"}, {wert: 3, name: "3"},
	{wert: 4, name: "4"}, {wert: 5, name: "5"},
];

const SCHALTER: { name: keyof FilterKriterien, text: string }[] = [
	{name: "bookmarked", text: "nur gemerkte Sets"},
	{name: "lastheard", text: "nur gehörte Sets (zuletzt gehörte zuerst)"},
	{name: "notheard", text: "nur nicht gehörte Sets"},
	{name: "notvoted", text: "nur von mir nicht bewertete Sets"},
	{name: "score", text: "nach Score sortieren"},
];

const genreName = (g: EBoxGenreTerm) => g.vocabulary === "tag" ? `${g.name} (Tag)` : g.name;

export const FilterEditor = ({
								 entwurf, onChange, genres, artistNamen, sucheArtists, vorschau, istAdmin, speichert,
								 onSave, onCancel, onDelete
							 }: Props) => {
	const k = entwurf.kriterien;
	const setze = (teil: Partial<FilterKriterien>) => onChange({...entwurf, kriterien: {...k, ...teil}});
	const [artistEingabe, setArtistEingabe] = useState("");
	const artistSuche = useDebouncedValue(artistEingabe, 300);
	const [artistOptionen, setArtistOptionen] = useState<EBoxArtistTreffer[]>([]);
	const [bekannteArtists, setBekannteArtists] = useState<EBoxArtistTreffer[]>(artistNamen);
	const [loeschenFragen, setLoeschenFragen] = useState(false);

	useEffect(() => setBekannteArtists(alt => [...alt, ...artistNamen.filter(a => !alt.some(b => b.djid === a.djid))]),
		[artistNamen]);
	useEffect(() => {
		let aktuell = true;
		if (artistSuche.trim() === "") {
			setArtistOptionen([]);
			return;
		}
		sucheArtists(artistSuche).then(t => aktuell && setArtistOptionen(t)).catch(() => undefined);
		return () => {
			aktuell = false;
		};
	}, [artistSuche, sucheArtists]);

	const genresZu = (tids?: number[]) => (tids ?? []).map(tid => genres.find(g => g.tid === tid))
		.filter((g): g is EBoxGenreTerm => g !== undefined);
	const artistsZu = (djids?: number[]) => (djids ?? [])
		.map(djid => bekannteArtists.find(a => a.djid === djid) ?? {djid, nid: 0, name: `DJ ${djid}`});
	const zahlFeld = (name: keyof FilterKriterien, label: string, hilfe: string) =>
		<TextField type="number" label={label} helperText={hilfe} size="small" value={k[name] ?? ""} sx={{flex: 1}}
				   slotProps={{htmlInput: {min: 0, "data-testid": name}}}
				   onChange={e => {
					   const zahl = Number.parseInt(e.target.value);
					   setze({[name]: Number.isInteger(zahl) && zahl > 0 ? zahl : undefined});
				   }}/>;

	return <Box sx={{maxWidth: 900, mx: "auto", pb: 16}} component="form" data-testid="filter-editor"
				onSubmit={e => {
					e.preventDefault();
					onSave();
				}}>
		<Stack spacing={2}>
			<Stack direction={{xs: "column", sm: "row"}} spacing={2} sx={{alignItems: {sm: "center"}}}>
				<TextField label="Name des Filters" required value={entwurf.filtername} sx={{flex: 1}}
						   slotProps={{htmlInput: {"data-testid": "filtername", maxLength: 255}}}
						   onChange={e => onChange({...entwurf, filtername: e.target.value})}/>
				{istAdmin && <FormControlLabel label="Preset für alle Nutzer" control={
					<Checkbox checked={entwurf.is_preset} onChange={e => onChange({...entwurf, is_preset: e.target.checked})}/>}/>}
			</Stack>

			<Stack direction={{xs: "column", sm: "row"}} spacing={2}>
				<TextField label="Titel enthält" value={k.s ?? ""} sx={{flex: 1}} helperText="/regex/ möglich, z. B. /live|qrip/"
						   onChange={e => setze({s: e.target.value})}/>
				<TextField label="Titel enthält nicht" value={k.ns ?? ""} sx={{flex: 1}} helperText="/regex/ möglich"
						   onChange={e => setze({ns: e.target.value})}/>
			</Stack>

			<Autocomplete multiple options={genres} groupBy={g => g.vocabulary === "tag" ? "Tags" : "Genres"}
						  getOptionLabel={genreName} isOptionEqualToValue={(a, b) => a.tid === b.tid}
						  value={genresZu(k.genre)} onChange={(_e, wert) => setze({genre: wert.map(g => g.tid)})}
						  renderInput={params => <TextField {...params} label="Genres/Tags (inkl. Unterbegriffe)"/>}/>
			<FormControlLabel label="Sets ohne diese Genres/Tags (umkehren)" control={
				<Checkbox checked={Boolean(k.not_genre)} onChange={e => setze({not_genre: e.target.checked || undefined})}/>}/>
			<Autocomplete multiple options={genres} groupBy={g => g.vocabulary === "tag" ? "Tags" : "Genres"}
						  getOptionLabel={genreName} isOptionEqualToValue={(a, b) => a.tid === b.tid}
						  value={genresZu(k.genreexclude)} onChange={(_e, wert) => setze({genreexclude: wert.map(g => g.tid)})}
						  renderInput={params => <TextField {...params} label="Genres/Tags ausschließen"/>}/>

			<Autocomplete multiple options={artistOptionen} filterOptions={x => x}
						  getOptionLabel={a => a.name} isOptionEqualToValue={(a, b) => a.djid === b.djid}
						  value={artistsZu(k.djs)} inputValue={artistEingabe}
						  onInputChange={(_e, wert) => setArtistEingabe(wert)}
						  onChange={(_e, wert) => {
							  setBekannteArtists(alt => [...alt, ...wert.filter(a => !alt.some(b => b.djid === a.djid))]);
							  setze({djs: wert.map(a => a.djid)});
						  }}
						  noOptionsText={artistEingabe ? "kein Artist gefunden" : "Namen eingeben"}
						  renderInput={params => <TextField {...params} label="Artists"/>}/>

			<FormControl>
				<InputLabel id="votings-label">Basisfilter</InputLabel>
				<Select labelId="votings-label" label="Basisfilter" value={k.votings ?? 0}
						onChange={e => setze({votings: Number(e.target.value) || undefined})}>
					{BASISFILTER.map(b => <MenuItem key={b.wert} value={b.wert}>{b.name}</MenuItem>)}
				</Select>
			</FormControl>

			<FormGroup>
				{SCHALTER.map(sch => <FormControlLabel key={sch.name} label={sch.text} control={
					<Checkbox checked={Boolean(k[sch.name])} onChange={e => setze({[sch.name]: e.target.checked || undefined})}/>}/>)}
			</FormGroup>

			<FormControl component="fieldset">
				<FormLabel component="legend">Meine Bewertung</FormLabel>
				<Stack direction="row" spacing={1} useFlexGap sx={{flexWrap: "wrap", mt: 1}}>
					{MEINE_VOTES.map(v => {
						const aktiv = (k.myvotes ?? []).includes(v.wert);
						return <Chip key={v.wert} label={v.name} color={aktiv ? "primary" : "default"} variant={aktiv ? "filled" : "outlined"}
									 onClick={() => setze({
										 myvotes: aktiv ? (k.myvotes ?? []).filter(x => x !== v.wert) : [...(k.myvotes ?? []), v.wert].sort()
									 })}/>;
					})}
				</Stack>
			</FormControl>

			<Stack direction={{xs: "column", sm: "row"}} spacing={2}>
				{zahlFeld("entriesperartist", "Sets je Artist", "höchstens n Sets je Artist")}
				{zahlFeld("ignore_entries_from_artists_voted_last_x_days", "bewertet (Tage)", "Artists ausblenden, die ich in den letzten n Tagen bewertet habe")}
				{zahlFeld("ignore_entries_from_artists_listened_last_x_days", "gehört (Tage)", "Artists ausblenden, die ich in den letzten n Tagen gehört habe")}
			</Stack>
			{k.uid && k.uid.length > 0 && <Typography variant="body2" color="text.secondary">
				Dieser Filter schränkt zusätzlich auf Uploader ein (bleibt erhalten).
			</Typography>}

			<Paper variant="outlined" sx={{p: 2}} data-testid="vorschau">
				<Typography variant="subtitle2">Vorschau</Typography>
				{vorschau === undefined ? <Typography variant="body2" color="text.secondary">lädt …</Typography> :
					vorschau.titel.length === 0 ? <Typography variant="body2" color="text.secondary">keine Treffer</Typography> :
						<List dense disablePadding>
							{vorschau.titel.map((t, i) => <ListItem key={i} disableGutters><ListItemText primary={t}/></ListItem>)}
							{vorschau.mehr && <ListItem disableGutters><ListItemText secondary="… und weitere"/></ListItem>}
						</List>}
			</Paper>

			<Stack direction="row" spacing={1}>
				<Button type="submit" variant="contained" disabled={speichert || entwurf.filtername.trim() === ""}>Speichern</Button>
				<Button onClick={onCancel}>Abbrechen</Button>
				<Box sx={{flex: 1}}/>
				{onDelete && <Button color="error" onClick={() => setLoeschenFragen(true)}>Löschen</Button>}
			</Stack>
		</Stack>

		<Dialog open={loeschenFragen} onClose={() => setLoeschenFragen(false)}>
			<DialogTitle>Filter löschen?</DialogTitle>
			<DialogContent>
				<DialogContentText>„{entwurf.filtername}“ wird gelöscht{entwurf.is_preset ? " – für alle Nutzer" : ""}.</DialogContentText>
			</DialogContent>
			<DialogActions>
				<Button onClick={() => setLoeschenFragen(false)}>Abbrechen</Button>
				<Button color="error" onClick={() => {
					setLoeschenFragen(false);
					onDelete?.();
				}}>Löschen</Button>
			</DialogActions>
		</Dialog>
	</Box>
}
