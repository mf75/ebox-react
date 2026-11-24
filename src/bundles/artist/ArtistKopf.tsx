import {ReactNode} from "react";
import {Box, Card, CardContent, CardMedia, Chip, Stack, Typography} from "@mui/material";
import {Link} from "react-router";
import {EBoxArtist} from "../../hooks/types";

interface Props {
	artist: EBoxArtist;
	/** ähnliche Artists, soweit es sie bei dj-junkies gibt */
	aehnliche: EBoxArtist[];
	/** z. B. „Bearbeiten“ für Admins */
	aktion?: ReactNode;
}

/** Kopf der Artist-Seite: Bild, Name, Land, Bio und ähnliche Artists. */
export const ArtistKopf = ({artist, aehnliche, aktion}: Props) =>
	<Card sx={{display: "flex", flexDirection: {xs: "column", sm: "row"}, maxWidth: 900, mx: "auto"}} data-testid="artist-kopf">
		<CardMedia component="img" image={artist.artwork.extralarge ?? artist.artwork.large} alt={artist.name}
					  sx={{width: {xs: "100%", sm: 250}, height: {xs: 220, sm: "auto"}, objectFit: "cover"}}/>
		<CardContent sx={{flex: 1, minWidth: 0}}>
			<Typography variant="h5" component="h1" sx={{overflowWrap: "anywhere"}}>
				{artist.name}{artist.country && ` (${artist.country.toUpperCase()})`}
			</Typography>
			{aktion}
			{artist.bio && <Typography variant="body2" sx={{whiteSpace: "pre-line", mt: 1}}>{artist.bio}</Typography>}
			{aehnliche.length > 0 && <Box sx={{mt: 2}}>
				<Typography variant="subtitle2" component="h2" gutterBottom>Ähnliche Artists</Typography>
				<Stack direction="row" spacing={1} useFlexGap sx={{flexWrap: "wrap"}} data-testid="aehnliche">
					{aehnliche.map(a => <Chip key={a.nid} label={a.name} size="small" clickable component={Link} to={"/artist/" + a.nid}/>)}
				</Stack>
			</Box>}
		</CardContent>
	</Card>;
