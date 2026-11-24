import {SetDaten} from "../../api/PflegeApi";
import {EBoxGenreTerm, EBoxSet} from "../../hooks/types";
import {istDeaktiviert, istUnfertig, SetEigentum} from "../../auth/rollen";

/** Set für die Rechte-Prüfung; unfertig/deaktiviert aus dem Block pflege, falls vorhanden */
export const setEigentum = (set: EBoxSet): SetEigentum => ({
	uid: set.uid, status: set.status, tracks: set.tracks.length,
	...set.pflege && {unfertig: set.pflege.unfertig, deaktiviert: set.pflege.deaktiviert},
});

/** Inhalt des Bearbeiten-Dialogs (und des ersten Wizard-Schritts) */
export interface SetFormular {
	title: string;
	/** "JJJJ-MM-TT" oder leer */
	setcreated: string;
	/** Artists aus dem Titel erkennen; aus = die gewählten Artists gelten */
	artistErkennung: boolean;
	artistnames: string[];
	genresVomArtist: boolean;
	genres: number[];
}

/** Datum als "JJJJ-MM-TT" (lokal); ungültig oder vor 1971 = leer */
export const datumAlsText = (d?: Date): string => {
	if (!d || Number.isNaN(d.getTime()) || d.getTime() < 365 * 24 * 3600 * 1000) {
		return "";
	}
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Formular aus einem Set. Titel, Artist-Erkennung und „Genres vom Artist“ aus dem Block pflege (setpflege); ohne ihn
 * Anzeigetitel, Erkennung an, Genres nicht vom Artist.
 */
export const formularAusSet = (set: EBoxSet, artistnames: string[], genreTerms: EBoxGenreTerm[]): SetFormular => ({
	title: set.pflege?.fulltitle || set.title || "",
	setcreated: datumAlsText(set.created),
	artistErkennung: !(set.pflege?.artistdetection_disabled ?? false),
	artistnames,
	genresVomArtist: set.pflege?.taxonomy_by_dj ?? false,
	// nur Begriffe aus dem Vokabular Genres (Tags pflegt der Dialog nicht)
	genres: (set.genres ?? []).map(g => g.tid)
		.filter(tid => genreTerms.some(t => t.tid === tid && t.vocabulary === "genre")),
});

const gleich = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Body für setbearbeiten: nur geänderte Felder (fehlende bleiben bei ebox-backend unverändert).
 * Geänderte Artists schalten die Erkennung aus, geänderte Genres „Genres vom Artist“.
 */
export const aenderungen = (alt: SetFormular, neu: SetFormular): SetDaten => {
	const body: SetDaten = {};
	if (neu.title.trim() !== alt.title.trim()) {
		body.title = neu.title.trim();
	}
	if (neu.setcreated !== alt.setcreated && neu.setcreated !== "") {
		body.setcreated = neu.setcreated;
	}
	if (!gleich(neu.artistnames, alt.artistnames)) {
		body.artistnames = neu.artistnames;
		body.artistdetection_disabled = true;
	}
	if (neu.artistErkennung !== alt.artistErkennung) {
		body.artistdetection_disabled = !neu.artistErkennung;
	}
	if (neu.genresVomArtist !== alt.genresVomArtist) {
		body.taxonomy_by_dj = neu.genresVomArtist;
	}
	if (!neu.genresVomArtist && !gleich([...neu.genres].sort(), [...alt.genres].sort())) {
		body.genres = neu.genres;
		body.taxonomy_by_dj = false;
	}
	return body;
};

/** Body für setanlegen: nur Titel Pflicht, Datum und Artists optional */
export const neuesSet = (f: Pick<SetFormular, "title" | "setcreated" | "artistnames">): SetDaten => ({
	title: f.title.trim(),
	...f.setcreated && {setcreated: f.setcreated},
	...f.artistnames.length > 0 && {artistnames: f.artistnames, artistdetection_disabled: true},
});

/** Hinweis an der Set-Karte für Sets, die nur Berechtigte sehen */
export const statusHinweis = (set: EBoxSet): string | undefined => {
	if (set.status !== 0 && !set.pflege) {
		return undefined;
	}
	const eigentum = setEigentum(set);
	return istUnfertig(eigentum) ? "unfertig – Upload fortsetzen über ⋮" : istDeaktiviert(eigentum) ? "deaktiviert" : undefined;
};

/**
 * Fehler eines Pflege-Aufrufs aufteilen: Meldungen zu Feldern, die das Formular zeigt, und eine allgemeine Meldung
 * für alles andere (z. B. 403, form_errors.status).
 */
export const fehlerAufteilen = (e: unknown, formularFelder: string[]): {felder: Record<string, string>; allgemein?: string} => {
	const felder: Record<string, string> = (e as {felder?: Record<string, string>})?.felder ?? {};
	const angezeigt = Object.fromEntries(Object.entries(felder).filter(([feld]) => formularFelder.includes(feld)));
	const rest = Object.entries(felder).filter(([feld]) => !formularFelder.includes(feld)).map(([, m]) => m);
	const allgemein = Object.keys(angezeigt).length > 0 && rest.length === 0 ? undefined
		: rest.length > 0 ? rest.join("; ") : (e as Error)?.message ?? String(e);
	return {felder: angezeigt, ...allgemein !== undefined && {allgemein}};
};

export const SET_FELDER = ["title", "setcreated", "artistnames", "genres"];
