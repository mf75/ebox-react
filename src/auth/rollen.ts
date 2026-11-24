/**
 * Rollen im Frontend (Nutzer, Uploader, Admin) – nur zum Ein- und Ausblenden, die maßgebliche Prüfung macht
 * ebox-backend. Uploader steht nur im Keycloak-Access-Token (`realm_access.roles`), Admin zusätzlich in den
 * Drupal-Rollen aus connect/login (`m-admin`, `admin`).
 */
import {istAdmin} from "../bundles/filtereditor/filterModel";

export interface Rollen {
	uid: number;
	uploader: boolean;
	admin: boolean;
}

export const KEINE_ROLLEN: Rollen = {uid: 0, uploader: false, admin: false};

/** Realm-Rollen aus dem Payload eines JWT; bei kaputtem Token leer. */
export const realmRollen = (accessToken?: string | null): string[] => {
	const teil = accessToken?.split(".")[1];
	if (!teil) {
		return [];
	}
	try {
		const base64 = teil.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(teil.length / 4) * 4, "=");
		const json = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(base64), c => c.charCodeAt(0))));
		const rollen = json?.realm_access?.roles;
		return Array.isArray(rollen) ? rollen.filter((r: unknown): r is string => typeof r === "string") : [];
	} catch {
		return [];
	}
};

/** Rollen aus dem Nutzer von connect/login und (falls vorhanden) dem Keycloak-Access-Token. */
export const ermittleRollen = (user: any, accessToken?: string | null): Rollen => {
	const uid = Number(user?.uid) || 0;
	if (uid <= 0) {
		return KEINE_ROLLEN;
	}
	const realm = realmRollen(accessToken);
	const admin = istAdmin(user) || realm.includes("admin");
	return {uid, admin, uploader: admin || realm.includes("uploader")};
};

/** Set, wie es für die Rechte gebraucht wird */
export interface SetEigentum {
	/** Eigentümer (node.uid); unbekannt = undefined */
	uid?: number;
	/** node.status: 1 aktiv, 0 deaktiviert oder unfertig */
	status?: number;
	/** Anzahl Tracks */
	tracks: number;
	/** aus dem Block pflege der Pflege-Endpunkte; fehlt bei getnodes */
	unfertig?: boolean;
	deaktiviert?: boolean;
}

export type SetAktion = "bearbeiten" | "hochladen" | "trackscan" | "deaktivieren" | "reaktivieren";

/** Uploader am eigenen Set oder Admin */
export const darfSetPflegen = (r: Rollen, set: SetEigentum): boolean =>
	r.admin || (r.uploader && set.uid !== undefined && set.uid === r.uid);

/** Upload nicht abgeschlossen: laut Block pflege, ohne ihn geschätzt als status 0 ohne Tracks. */
export const istUnfertig = (set: SetEigentum): boolean =>
	set.unfertig ?? (set.status === 0 && set.tracks === 0);

/** deaktiviert (nicht unfertig): laut Block pflege, ohne ihn status 0 mit Tracks. */
export const istDeaktiviert = (set: SetEigentum): boolean =>
	set.deaktiviert ?? (set.status === 0 && set.tracks > 0);

/** Einträge des ⋮-Menüs an der Set-Karte; leer = kein Pflege-Menü. */
export const setAktionen = (r: Rollen, set: SetEigentum): SetAktion[] => {
	if (!darfSetPflegen(r, set)) {
		return [];
	}
	const aktionen: SetAktion[] = ["bearbeiten", "hochladen", "trackscan"];
	if (set.status === 0 || istUnfertig(set) || istDeaktiviert(set)) {
		// reaktivieren nur Admin, nur deaktivierte Sets mit Tracks (ebox-backend antwortet sonst 406)
		if (r.admin && istDeaktiviert(set) && set.tracks > 0) {
			aktionen.push("reaktivieren");
		}
	} else {
		aktionen.push("deaktivieren");
	}
	return aktionen;
};

/** FAB „Set hochladen“ und Preset „Meine Sets“ */
export const darfHochladen = (r: Rollen): boolean => r.uploader || r.admin;
/** Preset „Deaktivierte Sets“, Artist-Dialog */
export const darfAdminPflege = (r: Rollen): boolean => r.admin;
/** „Neuer Artist“ */
export const darfArtistAnlegen = (r: Rollen): boolean => r.uploader || r.admin;
