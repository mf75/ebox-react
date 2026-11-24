import {Divider, Grid, Link, List, ListItem, ListItemIcon, ListItemText, Typography} from "@mui/material";
import DoneIcon from '@mui/icons-material/Done';
import React, {useEffect} from "react";
import {useAtom} from "jotai";
import {pageTitleAtom} from "../../context/atoms";
import {Logo} from "../../components/Logo";

function createRoadmapEntry(title: string, text: string, finished: boolean) {
	return {title: title, text: text, finished: finished};
}

export const Home = () => {
	const [, setPageTitle] = useAtom(pageTitleAtom);
	useEffect(() => {
		setPageTitle("Home")
	}, [setPageTitle])
	const roadmapEntries = [
		createRoadmapEntry("Filter/Set-List inkl Suche in Filtern",
			"endlos durch die (eigenen) Filter scrollen<br/>"
			+ "Sets(mit allen Tracks) in Playlist ersetzen oder anhängen.", true),
		createRoadmapEntry("MusicPlayer", "Musik abspielen inkl. Untstützung der Mediasession(Keys)", true),
		createRoadmapEntry("Playlist-Next/Prev/Seek/Repeat", "Shuffle noch ohne Funktion", true),
		createRoadmapEntry("Bewerten", "das aktuell gespielte Set bewerten", true),
		createRoadmapEntry("Kommentieren", "das aktuell gespielte Set kommentieren", true),
		createRoadmapEntry("Vote-Reminder", "Desktop-Benachrichtigung am Ende des Sets zum Bewerten", true),
		createRoadmapEntry("Playlist-Shuffle/Repeat", "Shuffle/Repeat Support", true),
		createRoadmapEntry("Playlist-Anzeige", "Anzeige der aktuellen Einträge mit Edit-Funktionen", true),
		createRoadmapEntry("PWA-App (alpha)", "Verfügbar als App mit ersten Offline Funktionen (Caching) inkl. Update-Benachrichtigung", true),

		createRoadmapEntry("Set-Details", "Tracks, Bewertungen aller Nutzer, Kommentare lesen und schreiben, Artist-Info", true),
		createRoadmapEntry("Gerade gehört / Zuletzt gut bewertet", "wer gerade was hört und welche Sets zuletzt gut bewertet wurden", true),
		createRoadmapEntry("Filter-Editor",
			"Filter bauen, Vorschau ansehen und persistent auf dj-junkies speichern/bearbeiten/löschen", true),
		createRoadmapEntry("Artist-Anzeige", "Artists suchen, Bio, ähnliche Artists und alle Sets eines Artists", true),
	]
	return <Grid container sx={{justifyContent: "center", alignItems: "center"}}>
		<Grid size={12}><Logo/></Grid>
		<Grid size={12}>
			<Typography variant="h5" sx={{mb: 2}}>Der neue DJ-Junkies WEB-Client zum Musik hören...</Typography>
		</Grid>
		<Grid size={12}>
			<Typography gutterBottom data-testid="home">
				Das Projekt ist OpenSource und der Quellcode ist{" "}
				<Link target="_blank" rel="noreferrer" href="https://github.com/NiasSt90/ebox-react">hier</Link> zu
				finden.
			</Typography>
		</Grid>

		<Grid size={12}>
			aktueller Stand/Roadmap:
			<List>
				{roadmapEntries.map((entry, index) => <React.Fragment key={index}>
						<ListItem>
							{entry.finished && <ListItemIcon><DoneIcon/></ListItemIcon>}
							<ListItemText primary={entry.title} secondary={entry.text}/>
						</ListItem>
						<Divider/>
					</React.Fragment>
				)}
			</List>
		</Grid>
	</Grid>
}