import {alsParameter, darfAendern, entwurfAusFilter, istAdmin} from "./filterModel";
import {queryString} from "../../api/JunkiesApi";

// getfilters-Eintrag, wie ebox-backend ihn liefert (NULL-Schalter als false/null)
const gespeichert = {
	s: "live", ns: "", genre: [20, 123], genreexclude: null, not_genre: false, djs: [1], uid: [3], votings: 0,
	bookmarked: false, lastheard: null, notheard: true, notvoted: false, score: false, myvotes: [0, 5],
	entriesperartist: 2, filterid: 7, filtername: "Mein Filter", is_preset: false,
	ignore_entries_from_artists_voted_last_x_days: null, ignore_entries_from_artists_listened_last_x_days: 30,
};

test("getfilters-Eintrag → Entwurf: nur gesetzte Kriterien", () => {
	const e = entwurfAusFilter(gespeichert);
	expect(e).toEqual({
		filterid: 7, filtername: "Mein Filter", is_preset: false,
		kriterien: {
			s: "live", genre: [20, 123], djs: [1], uid: [3], notheard: true, myvotes: [0, 5], entriesperartist: 2,
			ignore_entries_from_artists_listened_last_x_days: 30,
		},
	});
});

test("Entwurf → Parameter: leere Werte entfallen, Schalter als 1", () => {
	expect(alsParameter({s: "  ", ns: "bbc", genre: [], djs: [4], notvoted: true, score: false, votings: 0, entriesperartist: 3}))
		.toEqual({ns: "bbc", djs: [4], notvoted: 1, entriesperartist: 3});
});

test("Rundreise: gespeicherter Filter bleibt gleich", () => {
	const params = alsParameter(entwurfAusFilter(gespeichert).kriterien);
	expect(entwurfAusFilter({...params, notheard: true, filterid: 7, filtername: "Mein Filter"}).kriterien)
		.toEqual(entwurfAusFilter(gespeichert).kriterien);
});

test("Query-String in PHP-Notation", () => {
	expect(queryString({filtername: "A & B", genre: [20, 123], s: undefined, token: "t"}))
		.toBe("filtername=A%20%26%20B&genre%5B%5D=20&genre%5B%5D=123&token=t");
});

test("Rechte: Presets nur für Admins", () => {
	expect(istAdmin({roles: {"7": "m-admin"}})).toBe(true);
	expect(istAdmin({roles: {"12": "admin"}})).toBe(true);
	expect(istAdmin({roles: {"9": "mischungxl"}})).toBe(false);
	expect(istAdmin({})).toBe(false);
	expect(darfAendern(false, false)).toBe(true);
	expect(darfAendern(true, false)).toBe(false);
	expect(darfAendern(true, true)).toBe(true);
});
