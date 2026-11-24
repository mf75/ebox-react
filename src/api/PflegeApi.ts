import settings from "../settings";

/**
 * Pflege-Endpunkte von ebox-backend (E6: Set-Pflege, Upload, Artist-Pflege). Anders als die übrigen Legacy-Aufrufe
 * mit `Authorization: Bearer <Keycloak-Access-Token>`: Die Rolle Uploader steht nur im Keycloak-Token, mit `?token=`
 * kennt ebox-backend nur die Drupal-Rollen.
 */

/** Fehler eines Pflege-Aufrufs; `felder` aus `406 {form_errors: {feld: meldung}}` (bzw. 413 beim Upload). */
export class PflegeFehler extends Error {
	readonly status: number;
	readonly felder: Record<string, string>;

	constructor(status: number, message: string, felder: Record<string, string> = {}) {
		super(message);
		this.name = "PflegeFehler";
		this.status = status;
		this.felder = felder;
	}
}

const STATUS_TEXTE: Record<number, string> = {
	401: "Nicht angemeldet",
	403: "Keine Berechtigung",
	404: "Nicht gefunden",
	413: "Datei zu groß",
};

/** Antwort mit Fehlerstatus → PflegeFehler; `form_errors` werden zu Feldfehlern, die erste Meldung zur message. */
export const fehlerAusAntwort = (status: number, text: string): PflegeFehler => {
	let felder: Record<string, string> = {};
	try {
		const json = JSON.parse(text);
		if (json && typeof json.form_errors === "object" && json.form_errors !== null) {
			felder = Object.fromEntries(Object.entries(json.form_errors).map(([feld, meldung]) => [feld, String(meldung)]));
		}
	} catch {
		// kein JSON (z. B. Fehlerseite von nginx)
	}
	const erste = Object.values(felder)[0];
	return new PflegeFehler(status, erste ?? STATUS_TEXTE[status] ?? `Fehler ${status}`, felder);
};

/** Felder von setanlegen/setbearbeiten; bei setbearbeiten bleiben fehlende Felder unverändert. */
export interface SetDaten {
	title?: string;
	/** "JJJJ-MM-TT" */
	setcreated?: string;
	artistnames?: string[];
	artistdetection_disabled?: boolean;
	/** Genres vom Artist übernehmen */
	taxonomy_by_dj?: boolean;
	genres?: number[];
}

/** Antwort von trackscan; `set` ist ein Mxlnode */
export interface TrackScanErgebnis {
	tracks: number;
	art: string;
	probleme: string[];
	set: any;
}

/** Antwort von artist, artistanlegen und artistbearbeiten */
export interface ArtistPflegeDaten {
	nid: number;
	name: string;
	aliases: string[];
	country: string;
	artisttype: "normal" | "blacklisted" | string;
	lastfm_artistname: string;
	lastfm_nexttry: number | null;
	lastfm_errorcount: number | null;
	djid: number | null;
}

export interface ArtistAenderung {
	name?: string;
	aliases?: string[];
	artisttype?: "normal" | "blacklisted";
	country?: string;
	lastfm_artistname?: string;
	/** Abgleich mit Last.fm beim nächsten Lauf von Block B */
	abgleich?: boolean;
}

/** Erlaubte Endungen und Höchstgröße für den Upload (wie ebox-backend). */
export const UPLOAD_ENDUNGEN = ["mp3", "mp4", "m4a", "aac", "flac", "wav"];
export const UPLOAD_MAX_BYTES = 1024 * 1024 * 1024;

/** Prüft eine Datei vor dem Upload; liefert die Fehlermeldung oder null. */
export const pruefeUploadDatei = (datei: {name: string; size: number}): string | null => {
	const punkt = datei.name.lastIndexOf(".");
	const endung = punkt >= 0 ? datei.name.substring(punkt + 1).toLowerCase() : "";
	if (!UPLOAD_ENDUNGEN.includes(endung)) {
		return `${datei.name}: Endung nicht erlaubt (erlaubt: ${UPLOAD_ENDUNGEN.join(", ")})`;
	}
	if (datei.size > UPLOAD_MAX_BYTES) {
		return `${datei.name}: größer als 1 GB`;
	}
	return null;
};

export interface UploadAuftrag {
	ergebnis: Promise<{datei: string; groesse: number}>;
	abbrechen(): void;
}

type FetchFn = typeof fetch;

export const pflegeApi = (accessToken: string, basis: string = settings.REST_API_URL ?? "", fetchFn: FetchFn = fetch,
						  xhrFabrik: () => XMLHttpRequest = () => new XMLHttpRequest()) => {
	const url = (aktion: string, params: Record<string, string | number> = {}) => {
		const query = Object.entries(params).map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v)).join("&");
		return `${basis}/js-api/mischungxl/${aktion}${query ? "?" + query : ""}`;
	};
	const aufruf = async <T>(methode: "GET" | "POST", ziel: string, body?: unknown): Promise<T> => {
		const headers: Record<string, string> = {Accept: "application/json", Authorization: `Bearer ${accessToken}`};
		if (body !== undefined) {
			headers["Content-Type"] = "application/json";
		}
		const antwort = await fetchFn(ziel, {method: methode, headers, ...body !== undefined && {body: JSON.stringify(body)}});
		const text = await antwort.text();
		if (!antwort.ok) {
			throw fehlerAusAntwort(antwort.status, text);
		}
		return (text ? JSON.parse(text) : null) as T;
	};

	return {
		setAnlegen: (daten: SetDaten) => aufruf<any>("POST", url("setanlegen"), daten),
		setBearbeiten: (nid: number, daten: SetDaten) => aufruf<any>("POST", url("setbearbeiten", {nid}), daten),
		/** aktiv=false deaktivieren (Eigentümer, Admin), aktiv=true reaktivieren (Admin) */
		setStatus: (nid: number, aktiv: boolean) => aufruf<any>("POST", url("setstatus", {nid, status: aktiv ? 1 : 0})),
		/** das Set mit dem Block pflege (Stand für den Bearbeiten-Dialog) */
		setPflege: (nid: number) => aufruf<any>("GET", url("setpflege", {nid})),
		trackScan: (nid: number) => aufruf<TrackScanErgebnis>("POST", url("trackscan", {nid})),
		meineSets: () => aufruf<any[]>("GET", url("meinesets")),
		deaktivierteSets: () => aufruf<any[]>("GET", url("deaktiviertesets")),
		artistLesen: (nid: number) => aufruf<ArtistPflegeDaten>("GET", url("artist", {nid})),
		artistAnlegen: (name: string) => aufruf<ArtistPflegeDaten>("POST", url("artistanlegen"), {name}),
		artistBearbeiten: (nid: number, aenderung: ArtistAenderung) =>
			aufruf<ArtistPflegeDaten>("POST", url("artistbearbeiten", {nid}), aenderung),

		/** eine Datei als rohen Body hochladen; Fortschritt 0..1 */
		upload: (nid: number, datei: File, onFortschritt: (anteil: number) => void): UploadAuftrag => {
			const xhr = xhrFabrik();
			const ergebnis = new Promise<{datei: string; groesse: number}>((resolve, reject) => {
				xhr.open("POST", url("upload", {nid, datei: datei.name}));
				xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
				xhr.setRequestHeader("Accept", "application/json");
				xhr.setRequestHeader("Content-Type", "application/octet-stream");
				xhr.upload.onprogress = e => {
					if (e.lengthComputable && e.total > 0) {
						onFortschritt(e.loaded / e.total);
					}
				};
				xhr.onload = () => {
					if (xhr.status >= 200 && xhr.status < 300) {
						try {
							resolve(JSON.parse(xhr.responseText));
						} catch {
							resolve({datei: datei.name, groesse: datei.size});
						}
					} else {
						reject(fehlerAusAntwort(xhr.status, xhr.responseText));
					}
				};
				xhr.onerror = () => reject(new PflegeFehler(0, `${datei.name}: Verbindung abgebrochen`));
				xhr.onabort = () => reject(new PflegeFehler(0, `${datei.name}: Upload abgebrochen`));
				xhr.send(datei);
			});
			return {ergebnis, abbrechen: () => xhr.abort()};
		},
	};
};

export type PflegeApi = ReturnType<typeof pflegeApi>;
