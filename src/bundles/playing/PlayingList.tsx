import {Avatar, IconButton, List, ListItem, ListItemAvatar, ListItemText, Tooltip, Typography} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import QueueIcon from "@mui/icons-material/Queue";
import Link from "@mui/material/Link";
import {Link as RouterLink} from "react-router";
import {EBoxPlay} from "../../hooks/types";

interface Props {
	plays: EBoxPlay[];
	jetzt: Date;
	onPlay(play: EBoxPlay): void;
	onEnqueue(play: EBoxPlay): void;
}

/** "gerade eben", "vor 5 min", "vor 1 h 20 min" */
export const vorZeit = (zeit: Date, jetzt: Date): string => {
	const minuten = Math.max(0, Math.floor((jetzt.getTime() - zeit.getTime()) / 60000));
	if (minuten < 1) {
		return "gerade eben";
	}
	if (minuten < 60) {
		return `vor ${minuten} min`;
	}
	return `vor ${Math.floor(minuten / 60)} h ${minuten % 60} min`;
}

export const PlayingList = ({plays, jetzt, onPlay, onEnqueue}: Props) => {
	if (plays.length === 0) {
		return <Typography color="text.secondary" data-testid="playing-leer">In den letzten zwei Stunden hat niemand etwas gehört.</Typography>;
	}
	return <List data-testid="playing" sx={{maxWidth: 900, mx: "auto", pb: 16}}>
		{plays.map((p, i) =>
			<ListItem key={i} divider secondaryAction={<>
				<Tooltip title="Abspielen">
					<IconButton edge="end" aria-label={`${p.set.title} abspielen`} onClick={() => onPlay(p)}><PlayArrowIcon/></IconButton>
				</Tooltip>
				<Tooltip title="in Playlist anhängen">
					<IconButton edge="end" aria-label={`${p.set.title} anhängen`} onClick={() => onEnqueue(p)}><QueueIcon/></IconButton>
				</Tooltip>
			</>}>
				<ListItemAvatar><Avatar>{p.name.charAt(0).toUpperCase()}</Avatar></ListItemAvatar>
				<ListItemText sx={{pr: 10}}
								  primary={<Link component={RouterLink} to={"/set/" + p.set.nid} color="inherit" underline="hover">{p.set.title}</Link>}
								  secondary={`${p.name} · ${vorZeit(p.timestamp, jetzt)} · ${p.caller}`}/>
			</ListItem>)}
	</List>
}
