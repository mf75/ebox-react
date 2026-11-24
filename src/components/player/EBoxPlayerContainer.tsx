import {useEffect, useMemo, useState} from "react";
import {EBoxPlayer} from "./EBoxPlayer";
import {useAudio} from "./hooks/useAudio";
import {useMediaSession} from "./hooks/useMediaSession";
import {usePlaylist} from "../playlist/hooks/usePlaylist";
import {ArtistImageSizes, EBoxVote, NotifyMessage, PlaylistItem} from "../../hooks/types";
import {mapArtistImageSizes} from "../../bundles/common/helper";
import {useJunkiesService} from "../../hooks/useJunkiesService";
import {useAtom} from "jotai";
import {notifyMessageAtom} from "../../context/atoms";
import {CommentDialog} from "./CommentDialog";
import {useVoteReminder} from "./hooks/useVoteReminder";
import {Messages} from "../../bundles/common/Messages";
import {EBoxPlaylistDialog} from "../playlist/EBoxPlaylistDialog";
import {useNavigate} from "react-router";


export const EBoxPlayerContainer = () => {
	const playlistCtrl = usePlaylist();
	const junkiesService = useJunkiesService();
	const [, setNotifyMessage] = useAtom(notifyMessageAtom);
	const [commentDlgItem, setCommentDlgItem] = useState<PlaylistItem | null>(null);
	const navigate = useNavigate();

	const state = playlistCtrl.state;
	const audio = useAudio({
		src: state.currentTrack?.url as string,
		autoPlay: state.currentTrack !== null,
		onError: (event: any) => console.log("PLAYBACK ERROR", event)
	});
	useVoteReminder({playlistState: state, audioState: audio.state});
	useMediaSession({
		element: audio.element,
		mediaMetadata: {
			title: state.currentTrack?.title as string,
			artist: state.currentTrack?.artist as string,
			album: "",
			artwork: state.currentTrack ? Object.keys(state.currentTrack.artwork).map((key) => {
				return {
					src: state.currentTrack?.artwork[key as ArtistImageSizes] as string,
					sizes: mapArtistImageSizes(key as ArtistImageSizes)
				}
			}) : []
		},
		controls: {
			play: audio.controls.play,
			pause: audio.controls.pause,
			nexttrack: playlistCtrl.controls.next,
			previoustrack: playlistCtrl.controls.prev,
			seekbackward: () => audio.controls.seek(audio.state.time - 30),
			seekforward: () => audio.controls.seek(audio.state.time + 30),
			seekto: details => audio.controls.seek(details.seekTime as number),
		},
	});

	//chain end of track with playlist.next() call
	const onEndedCallback = useMemo( () => {
		return (event: Event) => {
			console.log(`Playing ended: repeat=${playlistCtrl.state.repeat} hasNext=`, playlistCtrl.controls.hasNext());
			if (playlistCtrl.state.repeat === "single") {
				audio.controls.play();
			}
			else if (playlistCtrl.controls.hasNext()) {
				playlistCtrl.controls.next();
			}
		};
	}, [audio.controls, playlistCtrl.controls, playlistCtrl.state.repeat])
	useEffect(() => {audio.controls.setEndedCallback(onEndedCallback)}, [audio.controls, onEndedCallback])

	//send playinform
	useEffect(() => {
		if (!audio.state.paused && playlistCtrl.state.currentTrack) {
			console.log("SEND playinform for Track", playlistCtrl.state.currentTrack)
			junkiesService.playinform(playlistCtrl.state.currentTrack.nid);
		}
	}, [audio.state.paused, playlistCtrl.state.currentTrack, junkiesService])

	//clear playlist -> stop player
	useEffect(() => {
		if (playlistCtrl.state.currentTrack === null) {
			audio.controls.clear();
		}
	}, [audio.controls, playlistCtrl.state.currentTrack])

	const voteFunction = (item: PlaylistItem, vote: EBoxVote) => {
		junkiesService.vote(item.nid, vote)
			.then(() => {
				item.myVote = vote !== "canceled" ? vote : undefined;
				setNotifyMessage({
					message: Messages.voteMsg(vote),
					severity: "success",
					autohide: 3000
				} as NotifyMessage)
			});
	}

	const startComment = (item: PlaylistItem) => {
		setCommentDlgItem(item);
	}
	const submitComment = (text: string, item: PlaylistItem) => {
		junkiesService.createComment(item.nid, text)
			.then(setCommentDlgItem(null));
	}

	return <>
		{audio.element}
		<EBoxPlayer audioControls={audio.controls} audioState={audio.state}
						playlistControls={playlistCtrl.controls} playlistState={playlistCtrl.state}
						voteFunction={voteFunction} startCommentFunction={startComment}
						showSetFunction={(item: PlaylistItem) => navigate("/set/" + item.nid)}
		/>
		<EBoxPlaylistDialog playlist={playlistCtrl}/>
		{commentDlgItem != null &&
		<CommentDialog
				open={Boolean(commentDlgItem)} item={commentDlgItem}
				handleComment={submitComment} handleClose={() => setCommentDlgItem(null)}/>}
	</>
}