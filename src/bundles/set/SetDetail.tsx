import {ChangeEvent, useState} from "react";
import {
	Avatar,
	Box,
	Button,
	Card,
	CardContent,
	CardMedia,
	Chip,
	Divider,
	IconButton,
	List,
	ListItem,
	ListItemAvatar,
	Link,
	ListItemText,
	Rating,
	Stack,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	Typography
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import QueueIcon from "@mui/icons-material/Queue";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbsUpDownIcon from "@mui/icons-material/ThumbsUpDown";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import EditIcon from "@mui/icons-material/Edit";
import {EBoxSet, EBoxTrack, EBoxVote} from "../../hooks/types";
import {Link as RouterLink} from "react-router";
import {readableTime} from "../common/helper";

export interface SetDetailActions {
	play(): void;
	enqueue(): void;
	playTrack(track: EBoxTrack): void;
	enqueueTrack(track: EBoxTrack): void;
	bookmark(): void;
	vote(vote: EBoxVote): void;
	/** liefert true, wenn der Kommentar angelegt wurde (dann wird das Feld geleert) */
	comment(text: string): Promise<boolean>;
}

interface Props {
	set: EBoxSet;
	actions: SetDetailActions;
	/** angemeldet: Vote, Bookmark und Kommentar möglich */
	canWrite: boolean;
	/** nur für Admins: Artist-Dialog öffnen */
	onArtistBearbeiten?(nid: number): void;
}

const datumZeit = (d: Date) => d.toLocaleDateString() + " " + d.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});

const dauer = (set: EBoxSet) => {
	const h = set.duration.getUTCHours();
	const m = set.duration.getUTCMinutes();
	return (h > 0 ? h + " h " : "") + String(m).padStart(h > 0 ? 2 : 1, "0") + " min";
}

/** Drupal-Thread "01.00/" → Tiefe 1 */
const tiefe = (thread: string) => (thread.match(/\./g) ?? []).length;

const Abschnitt = ({titel, children}: { titel: string, children: React.ReactNode }) =>
	<Box component="section" sx={{mt: 3}}>
		<Typography variant="h6" component="h2" gutterBottom>{titel}</Typography>
		{children}
	</Box>;

export const SetDetail = ({set, actions, canWrite, onArtistBearbeiten}: Props) => {
	const [kommentar, setKommentar] = useState("");
	const [sendet, setSendet] = useState(false);
	const artist = set.artistDetails[0];

	const absenden = () => {
		setSendet(true);
		actions.comment(kommentar.trim())
			.then(ok => ok && setKommentar(""))
			.finally(() => setSendet(false));
	}

	// unten Platz für den fest stehenden Player
	return <Box sx={{maxWidth: 900, mx: "auto", pb: 16}} data-testid="set-detail">
		<Card sx={{display: "flex", flexDirection: {xs: "column", sm: "row"}}}>
			<CardMedia component="img" image={artist.artwork.extralarge ?? artist.artwork.large}
						  alt={artist.name} sx={{width: {xs: "100%", sm: 250}, height: {xs: 220, sm: "auto"}, objectFit: "cover"}}/>
			<CardContent sx={{flex: 1, minWidth: 0}}>
				<Typography variant="h5" component="h1" sx={{overflowWrap: "anywhere"}}>{set.title}</Typography>
				<Typography color="text.secondary" gutterBottom>
					produziert am {set.created.toLocaleDateString()} · {dauer(set)}
					{set.tracks.length > 1 && ` · ${set.tracks.length} Tracks`}
				</Typography>
				{set.lastheard && <Typography variant="body2" color="text.secondary">
					zuletzt gehört am {datumZeit(set.lastheard)}
				</Typography>}
				{set.genres && set.genres.length > 0 &&
					<Stack direction="row" spacing={1} useFlexGap sx={{flexWrap: "wrap", my: 1}}>
						{set.genres.map(g => <Chip key={g.tid} label={g.name} size="small"/>)}
					</Stack>}
				<Stack direction="row" spacing={1} useFlexGap sx={{flexWrap: "wrap", alignItems: "center", mt: 2}}>
					<Button variant="contained" startIcon={<PlayArrowIcon/>} onClick={actions.play}>Abspielen</Button>
					<Button startIcon={<QueueIcon/>} onClick={actions.enqueue}>Anhängen</Button>
					{canWrite && <Tooltip title={set.bookmarked ? "Bookmark entfernen" : "Set bookmarken"}>
						<IconButton aria-label="bookmark" onClick={actions.bookmark}>
							<FavoriteIcon color={set.bookmarked ? "secondary" : "disabled"}/>
						</IconButton>
					</Tooltip>}
					{canWrite && <ToggleButtonGroup size="small" exclusive value={set.myVote ?? null} aria-label="eigene Bewertung"
														onChange={(_e, wert: EBoxVote | null) => actions.vote(wert ?? "canceled")}>
						<ToggleButton value="good" aria-label="gut"><ThumbUpIcon fontSize="small"/></ToggleButton>
						<ToggleButton value="neutral" aria-label="mittel"><ThumbsUpDownIcon fontSize="small"/></ToggleButton>
						<ToggleButton value="bad" aria-label="schlecht"><ThumbDownIcon fontSize="small"/></ToggleButton>
					</ToggleButtonGroup>}
				</Stack>
			</CardContent>
		</Card>

		<Abschnitt titel={set.artistDetails.length > 1 ? "Artists" : "Artist"}>
			<List disablePadding>
				{set.artistDetails.map(a =>
					<ListItem key={a.nid} alignItems="flex-start" disableGutters
							  secondaryAction={onArtistBearbeiten && a.nid > 0 && <Tooltip title="Artist bearbeiten">
								  <IconButton edge="end" aria-label={`Artist ${a.name} bearbeiten`} onClick={() => onArtistBearbeiten(a.nid)}>
									  <EditIcon/></IconButton></Tooltip>}>
						<ListItemAvatar><Avatar src={a.artwork.small ?? a.artwork.large} alt={a.name}/></ListItemAvatar>
						<ListItemText primary={<Link component={RouterLink} to={"/artist/" + a.nid} color="inherit" underline="hover">
											  {a.name + (a.country ? ` (${a.country.toUpperCase()})` : "")}</Link>}
										  secondary={a.bio} slotProps={{secondary: {sx: {whiteSpace: "pre-line"}}}}/>
					</ListItem>)}
			</List>
		</Abschnitt>

		<Abschnitt titel="Tracks">
			<List dense disablePadding data-testid="tracks">
				{set.tracks.map((track, i) =>
					<ListItem key={track.url} disableGutters secondaryAction={<>
						<Tooltip title="Track abspielen">
							<IconButton edge="end" aria-label={`Track ${i + 1} abspielen`} onClick={() => actions.playTrack(track)}>
								<PlayArrowIcon/>
							</IconButton>
						</Tooltip>
						<Tooltip title="Track anhängen">
							<IconButton edge="end" aria-label={`Track ${i + 1} anhängen`} onClick={() => actions.enqueueTrack(track)}>
								<QueueIcon/>
							</IconButton>
						</Tooltip>
					</>}>
						<ListItemText sx={{pr: 10}} primary={`${i + 1}. ${track.title}`}
										  secondary={[track.artist, track.duration ? readableTime(track.duration) : undefined]
											  .filter(Boolean).join(" · ")}/>
					</ListItem>)}
			</List>
		</Abschnitt>

		<Abschnitt titel="Bewertungen">
			{set.votes && set.votes.all.length > 0 ? <>
				<Typography variant="body2" color="text.secondary" data-testid="vote-summary">
					{set.votes.avg !== undefined && `Ø ${set.votes.avg.toLocaleString(undefined, {maximumFractionDigits: 1})} von 5 · `}
					{set.votes.all.length} {set.votes.all.length === 1 ? "Bewertung" : "Bewertungen"}
				</Typography>
				<List dense disablePadding data-testid="votes">
					{set.votes.all.map(v =>
						<ListItem key={v.uid} disableGutters>
							<ListItemText primary={v.name} secondary={datumZeit(v.timestamp)}/>
							<Rating value={v.vote} max={5} readOnly size="small" aria-label={`${v.name}: ${v.vote} von 5`}/>
						</ListItem>)}
				</List>
			</> : <Typography variant="body2" color="text.secondary">Noch keine Bewertungen.</Typography>}
		</Abschnitt>

		<Abschnitt titel="Kommentare">
			{set.comments && set.comments.length > 0 ?
				<List disablePadding data-testid="comments">
					{set.comments.map((c, i) => <Box key={c.cid}>
						{i > 0 && <Divider component="li"/>}
						<ListItem alignItems="flex-start" disableGutters sx={{pl: Math.min(tiefe(c.thread), 4) * 3}}>
							<ListItemText
								primary={<><b>{c.name}</b>{" · " + datumZeit(c.timestamp)}{c.subject && !c.text.startsWith(c.subject) ? " · " + c.subject : ""}</>}
								secondary={c.text} slotProps={{secondary: {sx: {whiteSpace: "pre-line", color: "text.primary"}}}}/>
						</ListItem>
					</Box>)}
				</List> :
				<Typography variant="body2" color="text.secondary">Noch keine Kommentare.</Typography>}
			{canWrite && <Box sx={{mt: 2}}>
				<TextField multiline fullWidth minRows={2} maxRows={8} label="dein Kommentar" value={kommentar}
							  slotProps={{htmlInput: {"data-testid": "comment-input"}}}
							  onChange={(e: ChangeEvent<HTMLInputElement>) => setKommentar(e.target.value)}/>
				<Button sx={{mt: 1}} variant="outlined" disabled={sendet || kommentar.trim() === ""} onClick={absenden}>
					Kommentieren
				</Button>
			</Box>}
		</Abschnitt>
	</Box>
}
