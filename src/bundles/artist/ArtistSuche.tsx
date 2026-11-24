import {ReactNode} from "react";
import {Box, IconButton, InputAdornment, List, ListItem, ListItemButton, ListItemText, TextField, Tooltip, Typography} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import {Link} from "react-router";
import {EBoxArtistTreffer} from "../../hooks/types";

interface Props {
	suche: string;
	/** null: noch nichts gesucht bzw. Suche läuft */
	treffer: EBoxArtistTreffer[] | null;
	onSuche(text: string): void;
	/** nur für Admins: Artist-Dialog öffnen */
	onBearbeiten?(nid: number): void;
	/** z. B. „Neuer Artist“ (Uploader, Admin) */
	kopfAktion?: ReactNode;
}

/** Ab so vielen Zeichen fragt die Seite den Server. */
export const MIN_ZEICHEN = 2;

export const ArtistSuche = ({suche, treffer, onSuche, onBearbeiten, kopfAktion}: Props) =>
	// der Inhaltsbereich passt sich dem Inhalt an, deshalb feste Breite (64px = Innenabstand links und rechts plus Scrollbalken)
	<Box sx={{width: {xs: "calc(100vw - 64px)", sm: 600}, maxWidth: "100%", mx: "auto", pb: 16}}>
		<TextField fullWidth autoFocus label="Artist suchen" value={suche} onChange={e => onSuche(e.target.value)}
					  helperText={`Teil des Namens, mindestens ${MIN_ZEICHEN} Zeichen`}
					  slotProps={{
						  htmlInput: {"data-testid": "artist-suche"},
						  input: {startAdornment: <InputAdornment position="start"><SearchIcon/></InputAdornment>}
					  }}/>
		{kopfAktion && <Box sx={{mt: 1}}>{kopfAktion}</Box>}
		{treffer && treffer.length === 0 &&
			<Typography sx={{mt: 2}} color="text.secondary">Kein Artist gefunden.</Typography>}
		{treffer && treffer.length > 0 &&
			<List data-testid="artist-treffer">
				{treffer.map(t =>
					<ListItem key={t.nid} disablePadding secondaryAction={onBearbeiten && <Tooltip title="Artist bearbeiten">
						<IconButton edge="end" aria-label={`Artist ${t.name} bearbeiten`} onClick={() => onBearbeiten(t.nid)}>
							<EditIcon/></IconButton></Tooltip>}>
						<ListItemButton component={Link} to={"/artist/" + t.nid}>
							<ListItemText primary={t.name}/>
						</ListItemButton>
					</ListItem>)}
			</List>}
	</Box>;
