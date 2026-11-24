import {PflegeFehler} from "../../api/PflegeApi";
import {EBoxSet} from "../../hooks/types";
import {aenderungen, datumAlsText, fehlerAufteilen, formularAusSet, neuesSet, SET_FELDER, SetFormular, statusHinweis} from "./pflegeModel";

const AUSGANG: SetFormular = {
	title: "Nova Kestrel – Wintermix", setcreated: "2026-01-10", artistErkennung: true, artistnames: ["nova kestrel"],
	genresVomArtist: false, genres: [20, 21],
};

test("ohne Änderung leerer Body", () => {
	expect(aenderungen(AUSGANG, {...AUSGANG, genres: [21, 20]})).toEqual({});
});

test("nur geänderte Felder; Artists schalten die Erkennung aus, Genres „vom Artist“", () => {
	expect(aenderungen(AUSGANG, {...AUSGANG, title: " Neuer Titel "})).toEqual({title: "Neuer Titel"});
	expect(aenderungen(AUSGANG, {...AUSGANG, setcreated: "2026-02-01"})).toEqual({setcreated: "2026-02-01"});
	expect(aenderungen(AUSGANG, {...AUSGANG, artistnames: ["nova kestrel", "teodor brann"], artistErkennung: false}))
		.toEqual({artistnames: ["nova kestrel", "teodor brann"], artistdetection_disabled: true});
	expect(aenderungen(AUSGANG, {...AUSGANG, genres: [20]})).toEqual({genres: [20], taxonomy_by_dj: false});
	expect(aenderungen(AUSGANG, {...AUSGANG, genresVomArtist: true, genres: []})).toEqual({taxonomy_by_dj: true});
	expect(aenderungen(AUSGANG, {...AUSGANG, artistErkennung: false})).toEqual({artistdetection_disabled: true});
});

test("setanlegen: nur Titel Pflicht", () => {
	expect(neuesSet({title: " Mix ", setcreated: "", artistnames: []})).toEqual({title: "Mix"});
	expect(neuesSet({title: "Mix", setcreated: "2026-11-01", artistnames: ["nova kestrel"]}))
		.toEqual({title: "Mix", setcreated: "2026-11-01", artistnames: ["nova kestrel"], artistdetection_disabled: true});
});

test("Formular aus einem Set: Datum, nur Genres (keine Tags)", () => {
	const set = {
		nid: 1, title: "Mix", created: new Date(2026, 0, 10, 12), genres: [{tid: 20, name: "house"}, {tid: 90, name: "live"}],
	} as EBoxSet;
	const f = formularAusSet(set, ["nova kestrel"], [
		{tid: 20, vid: 1, vocabulary: "genre", name: "house", parent: 0, weight: 0},
		{tid: 90, vid: 2, vocabulary: "tag", name: "live", parent: 0, weight: 0},
	]);
	expect(f).toEqual({title: "Mix", setcreated: "2026-01-10", artistErkennung: true, artistnames: ["nova kestrel"], genresVomArtist: false, genres: [20]});
	expect(datumAlsText(new Date(Number.NaN))).toBe("");
	expect(datumAlsText(new Date(0))).toBe("");
});

test("Formular mit Block pflege: Originaltitel und echte Schalter", () => {
	const set = {
		nid: 1, title: "nova kestrel - Wintermix", created: new Date(Number.NaN), genres: [], tracks: [],
		pflege: {unfertig: false, deaktiviert: false, herkunft: "upload", artistdetection_disabled: true, taxonomy_by_dj: true,
			fulltitle: "Nova Kestrel – Wintermix 2026"},
	} as unknown as EBoxSet;
	expect(formularAusSet(set, [], [])).toMatchObject({
		title: "Nova Kestrel – Wintermix 2026", setcreated: "", artistErkennung: false, genresVomArtist: true,
	});
});

test("Fehler: Feldfehler am Feld, Rest allgemein", () => {
	expect(fehlerAufteilen(new PflegeFehler(406, "Titel fehlt", {title: "Titel fehlt"}), SET_FELDER))
		.toEqual({felder: {title: "Titel fehlt"}});
	expect(fehlerAufteilen(new PflegeFehler(406, "Set hat keine Tracks", {status: "Set hat keine Tracks"}), SET_FELDER))
		.toEqual({felder: {}, allgemein: "Set hat keine Tracks"});
	expect(fehlerAufteilen(new PflegeFehler(403, "Keine Berechtigung"), SET_FELDER))
		.toEqual({felder: {}, allgemein: "Keine Berechtigung"});
});

test("Hinweis an der Karte: unfertig oder deaktiviert", () => {
	const set = (status: number | undefined, tracks: number) => ({status, tracks: new Array(tracks).fill({})} as EBoxSet);
	expect(statusHinweis(set(1, 2))).toBeUndefined();
	expect(statusHinweis(set(undefined, 0))).toBeUndefined();
	expect(statusHinweis(set(0, 2))).toBe("deaktiviert");
	expect(statusHinweis(set(0, 0))).toMatch(/unfertig/);
	const mitPflege = (status: number, tracks: number, unfertig: boolean, deaktiviert: boolean) =>
		({...set(status, tracks), pflege: {unfertig, deaktiviert, herkunft: "upload", artistdetection_disabled: false, taxonomy_by_dj: false, fulltitle: ""}} as EBoxSet);
	expect(statusHinweis(mitPflege(0, 2, true, false))).toMatch(/unfertig/);
	expect(statusHinweis(mitPflege(0, 0, false, true))).toBe("deaktiviert");
	expect(statusHinweis(mitPflege(1, 2, false, false))).toBeUndefined();
});
