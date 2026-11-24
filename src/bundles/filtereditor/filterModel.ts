/** Kriterien eines Filters mit den Parameternamen der Legacy-API (Index, getfilters, editfilter). */
export interface FilterKriterien {
	s?: string;
	ns?: string;
	genre?: number[];
	not_genre?: boolean;
	genreexclude?: number[];
	/** Legacy-djids */
	djs?: number[];
	/** Uploader; im Editor nicht änderbar, bleibt aber erhalten */
	uid?: number[];
	votings?: number;
	bookmarked?: boolean;
	lastheard?: boolean;
	notheard?: boolean;
	notvoted?: boolean;
	score?: boolean;
	/** 0 = nicht bewertet, 1–5 */
	myvotes?: number[];
	entriesperartist?: number;
	ignore_entries_from_artists_voted_last_x_days?: number;
	ignore_entries_from_artists_listened_last_x_days?: number;
}

export interface FilterEntwurf {
	filterid?: number;
	filtername: string;
	is_preset: boolean;
	kriterien: FilterKriterien;
}

/** Basisfilter wie im Drupal-Formular (Werte 1–3 und 10 bot es nicht an). */
export const BASISFILTER: { wert: number, name: string }[] = [
	{wert: 0, name: "Alle Sets"},
	{wert: 4, name: "Meine Best Of"},
	{wert: 5, name: "Fremde Best Of"},
	{wert: 6, name: "Meine DJ-Favoriten"},
	{wert: 7, name: "Meine Goldmine"},
	{wert: 8, name: "Manitoba DJ-Favoriten"},
	{wert: 9, name: "Manitoba Goldmine"},
	{wert: 11, name: "Unbewertete DJs"},
	{wert: 12, name: "Neu gut bewertete Sets"},
	{wert: 13, name: "Zu löschende Sets"},
];

const LISTEN = ["genre", "genreexclude", "djs", "uid", "myvotes"] as const;
const SCHALTER = ["not_genre", "bookmarked", "lastheard", "notheard", "notvoted", "score"] as const;
const TEXTE = ["s", "ns"] as const;
const ZAHLEN = ["votings", "entriesperartist", "ignore_entries_from_artists_voted_last_x_days",
	"ignore_entries_from_artists_listened_last_x_days"] as const;

const zahlListe = (wert: any): number[] | undefined =>
	Array.isArray(wert) ? wert.map(Number).filter(n => Number.isInteger(n)) : undefined;

/** Eintrag aus getfilters → Entwurf; nur gesetzte Kriterien werden übernommen. */
export function entwurfAusFilter(json: any): FilterEntwurf {
	const k: FilterKriterien = {};
	TEXTE.forEach(name => {
		if (typeof json[name] === "string" && json[name] !== "") k[name] = json[name];
	});
	LISTEN.forEach(name => {
		const liste = zahlListe(json[name]);
		if (liste && liste.length > 0) k[name] = liste;
	});
	SCHALTER.forEach(name => {
		if (json[name] === true) k[name] = true;
	});
	ZAHLEN.forEach(name => {
		const zahl = json[name] === null || json[name] === undefined || json[name] === "" ? NaN : Number(json[name]);
		// 0 heißt überall „aus“ (votings 0 = Alle Sets)
		if (Number.isInteger(zahl) && zahl > 0) k[name] = zahl;
	});
	return {
		filterid: json.filterid ? Number(json.filterid) : undefined,
		filtername: json.filtername ?? "",
		is_preset: json.is_preset === true,
		kriterien: k,
	};
}

/**
 * Kriterien → Parameter für Index und editfilter; leere Werte entfallen (bei editfilter mit ersetzen=1
 * heißt „entfällt“: nicht gesetzt).
 */
export function alsParameter(k: FilterKriterien): Record<string, string | number | (string | number)[]> {
	const params: Record<string, string | number | (string | number)[]> = {};
	TEXTE.forEach(name => {
		const text = k[name]?.trim();
		if (text) params[name] = text;
	});
	LISTEN.forEach(name => {
		const liste = k[name];
		if (liste && liste.length > 0) params[name] = liste;
	});
	SCHALTER.forEach(name => {
		if (k[name]) params[name] = 1;
	});
	ZAHLEN.forEach(name => {
		const zahl = k[name];
		if (zahl !== undefined && Number.isInteger(zahl) && zahl > 0) params[name] = zahl;
	});
	return params;
}

/** Eigene Filter darf man ändern, Presets nur Admins (getfilters liefert nur Presets und eigene). */
export const darfAendern = (istPreset: boolean, istAdmin: boolean) => !istPreset || istAdmin;

/** Rollen aus connect/login: {"7": "m-admin", …} */
export const istAdmin = (user: any): boolean =>
	Object.values(user?.roles ?? {}).some(rolle => rolle === "m-admin" || rolle === "admin");
