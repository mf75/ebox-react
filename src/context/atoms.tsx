import {atom} from "jotai";
import {junkiesApi} from "../api/JunkiesApi";
import {NotifyMessage, PlaylistItem} from "../hooks/types";
import {PlaylistState} from "../components/playlist/types";

const localUserAtom = atom(JSON.parse(localStorage.getItem("user") ?? '{}'));
export const userAtom = atom(
		async get => {
			let user = await junkiesApi(get(localUserAtom)).connect()
				.then(session => session.user)
				.catch((err) => {
					return Promise.resolve(get(localUserAtom));
				});
			console.log("using user" , user);
			return user;
		},
		(_get, set, update) => {
			set(localUserAtom, update);
			localStorage.setItem("user", JSON.stringify(update))
		}
);

export const loadingAtom = atom(false);
export const notifyMessageAtom = atom<NotifyMessage | null>(null);

export const playlistAtom = atom<PlaylistItem[]>([] as PlaylistItem[]);
export const playlistStateAtom = atom<PlaylistState>({
	currentTrack: null,
	repeat: "none",
	showPlaylist: false,
});

export const pageTitleAtom = atom("Home");
export const showToolbarSearchAtom = atom(true);
export const toolbarSearchInputAtom = atom("");
export const darkStateAtom = atom(false);
/** wird nach Anlegen/Ändern/Löschen eines Filters erhöht, damit das Menü neu lädt */
export const filterVersionAtom = atom(0);
