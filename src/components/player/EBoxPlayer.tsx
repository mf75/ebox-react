import React, {useEffect, useState} from "react";
import {
	Box,
	ListItemIcon,
	ListItemText,
	Menu,
	MenuItem,
	Paper,
	Slider,
	Tooltip,
	Typography
} from "@mui/material";
import type {SxProps, Theme} from "@mui/material/styles";
import IconButton from "@mui/material/IconButton";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbsUpDownIcon from "@mui/icons-material/ThumbsUpDown";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import AddCommentIcon from '@mui/icons-material/AddComment';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import FastForwardIcon from '@mui/icons-material/FastForward';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import PlaylistPlayIcon from '@mui/icons-material/PlaylistPlay';
import Divider from "@mui/material/Divider";
import MoreIcon from "@mui/icons-material/MoreVert";
import Repeat from "@mui/icons-material/Repeat";
import RepeatOne from "@mui/icons-material/RepeatOne";
import {AudioControls, AudioState} from "./types";
import {readableTime} from "../../bundles/common/helper";
import {EBoxVote, PlaylistItem} from "../../hooks/types";
import {PlaylistControls, PlaylistState} from "../playlist/types";

const styles = {
	root: {
		position: "fixed",
		zIndex: 10,
		bottom: "0%",
		width: {xs: "100%", md: "80%", lg: "60%", xl: "40%"},
		left: {xs: "0%", md: "10%", lg: "20%", xl: "30%"},
		right: {xs: "0%", md: "10%", lg: "20%", xl: "30%"},
	},
	// Seitlich mindestens die halbe Thumb-Breite (20px), sonst ragt der Thumb an den Enden aus dem Player.
	sliderContainer: {
		flex: '1 1 auto',
		margin: '-16px 12px -8px 12px'
	},
	// Ab MUI 5 bekommt der Slider auf Touch-Geräten zusätzliches Padding, das hier ebenfalls entfällt.
	slider: {
		padding: 0,
		'@media (pointer: coarse)': {
			padding: 0,
		},
	}
} satisfies Record<string, SxProps<Theme>>;

interface Props {
	audioState: AudioState;
	audioControls: AudioControls;
	playlistControls: PlaylistControls;
	playlistState: PlaylistState;
	voteFunction: (item: PlaylistItem, vote: EBoxVote) => void;
	startCommentFunction: (item: PlaylistItem) => void;
	showSetFunction: (item: PlaylistItem) => void;
}

export const EBoxPlayer: React.FC<Props> = ({
	audioState,
	audioControls,
	playlistState,
	playlistControls,
	voteFunction,
	startCommentFunction,
	showSetFunction
}: Props) => {
	const [anchorEl, setAnchorEl] = React.useState<Element | null>();
	const handleClick = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
		setAnchorEl(event.currentTarget);
	};
	const handleClose = () => {
		setAnchorEl(null);
	};
	const [seekbarTime, setSeekbarTime] = useState(0);
	useEffect(() => {
		setSeekbarTime(audioState.time)
	}, [audioState.time])

	const onSeekChange = (event: Event, progress: number | number[]) => {
		setSeekbarTime(progress as number)
		audioControls.seek(progress as number);
	}

	return <>
		<Paper sx={styles.root} elevation={6}>
			<Box sx={{display: "flex", flexWrap: "wrap", justifyContent: "space-around"}}>
				<Tooltip title="aktuelle Playlist anzeigen">
					<IconButton onClick={playlistControls.show}><PlaylistPlayIcon /></IconButton>
				</Tooltip>
				<Tooltip title={"Repeat " + playlistState.repeat}>
					<IconButton size={"small"} onClick={playlistControls.toggleRepeat}>
						{playlistState.repeat === "single" && <RepeatOne color={"primary"}/>}
						{playlistState.repeat === "all" && <Repeat color={"primary"}/>}
						{playlistState.repeat === "none" && <Repeat color={"disabled"}/>}
					</IconButton>
				</Tooltip>
				<Tooltip title="zurück zum vorherigen Track/Set">
					<IconButton size={"small"} onClick={playlistControls.prev}><SkipPreviousIcon/></IconButton>
				</Tooltip>
				<Tooltip title="30 sec zurück">
					<IconButton size={"small"}
									onClick={() => audioControls.seek(audioState.time - 30)}><FastRewindIcon/></IconButton>
				</Tooltip>

				{audioState.paused && <Tooltip title="Play">
					<IconButton size={"small"} onClick={audioControls.play}><PlayArrowIcon/></IconButton>
				</Tooltip>}
				{!audioState.paused && <Tooltip title="Pause">
					<IconButton size={"small"} onClick={audioControls.pause}><PauseIcon/></IconButton>
				</Tooltip>}

				<Tooltip title="30 sec vorwärts">
					<IconButton size={"small"}
									onClick={() => audioControls.seek(audioState.time + 30)}><FastForwardIcon/></IconButton>
				</Tooltip>
				<Tooltip title="zum Nächsten Track/Set">
					<IconButton size={"small"} onClick={playlistControls.next}><SkipNextIcon/></IconButton>
				</Tooltip>
				{playlistState.currentTrack && <Tooltip title="Weitere Aktionen">
					<IconButton size={"small"} onClick={handleClick}><MoreIcon/></IconButton>
				</Tooltip>}
			</Box>

			{playlistState.currentTrack &&
			<Menu anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={handleClose}>
				<MenuItem onClick={() => {
					showSetFunction(playlistState.currentTrack!);
					handleClose()
				}}>
					<ListItemIcon><InfoOutlinedIcon/></ListItemIcon>
					<ListItemText>Set-Details</ListItemText>
				</MenuItem>
				<MenuItem onClick={() => {
					startCommentFunction(playlistState.currentTrack!);
					handleClose()
				}}>
					<ListItemIcon><AddCommentIcon/></ListItemIcon>
					<ListItemText>Kommentieren</ListItemText>
				</MenuItem>
				<MenuItem onClick={() => {
					voteFunction(playlistState.currentTrack!, "good");
					handleClose()
				}}>
					<ListItemIcon><ThumbUpIcon/></ListItemIcon>
					<ListItemText>gut bewerten</ListItemText>
				</MenuItem>
				<MenuItem onClick={() => {
					voteFunction(playlistState.currentTrack!, "neutral");
					handleClose()
				}}>
					<ListItemIcon><ThumbsUpDownIcon/></ListItemIcon>
					<ListItemText>mittelmäßig bewerten</ListItemText>
				</MenuItem>
				<MenuItem onClick={() => {
					voteFunction(playlistState.currentTrack!, "bad");
					handleClose()
				}}>
					<ListItemIcon><ThumbDownIcon/></ListItemIcon>
					<ListItemText>schlecht bewerten</ListItemText>
				</MenuItem>
				<MenuItem onClick={() => {
					voteFunction(playlistState.currentTrack!, "canceled");
					handleClose()
				}}>
					<ListItemIcon><HighlightOffIcon/></ListItemIcon>
					<ListItemText>Bewertung entfernen</ListItemText>
				</MenuItem>
			</Menu>
			}
			<Divider/>

			<Box sx={{display: "flex", flexDirection: "column"}}>
				<Box>
					<Box sx={{display: "flex", justifyContent: "space-between"}}>
						<Box sx={{px: 1}}>
							<Typography noWrap variant={"overline"}>{playlistControls.curPos() + "/"
							+ playlistControls.length()} Track(s)</Typography>
						</Box>
						<Box sx={{pr: 1, display: "inline-grid"}}>
							{playlistState.currentTrack && <Typography noWrap component={"span"} variant={"overline"}>{
								(playlistState.currentTrack.artist ? (playlistState.currentTrack.artist + " / ") : "")
								+ playlistState.currentTrack.title}</Typography>}
						</Box>
					</Box>
				</Box>

				<Box sx={styles.sliderContainer}>
					<Slider sx={styles.slider}
							  min={0} max={audioState.duration}
							  value={seekbarTime}
							  valueLabelDisplay={"off"}
							  valueLabelFormat={(value: number, index: number) => readableTime(value)}
							  onChange={onSeekChange}
					/>
				</Box>

				<Box sx={{display: "flex", justifyContent: "space-between"}}>
					<Box sx={{pl: 1}}>
						<Typography variant={"overline"}>{readableTime(audioState.time)}</Typography>
					</Box>
					<Box sx={{pr: 1}}>
						<Typography variant={"overline"}>{readableTime(
							audioState.duration - audioState.time)}</Typography>
					</Box>
				</Box>
			</Box>
		</Paper>
	</>
}