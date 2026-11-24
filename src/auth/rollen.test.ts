import {darfAdminPflege, darfArtistAnlegen, darfHochladen, ermittleRollen, istDeaktiviert, istUnfertig, realmRollen, Rollen, setAktionen} from "./rollen";

/** unsigniertes JWT mit dem Payload (Signatur spielt im Frontend keine Rolle) */
const jwt = (payload: object) => {
	const b64 = (o: object) => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))))
		.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
	return `${b64({alg: "none"})}.${b64(payload)}.sig`;
};

const NUTZER: Rollen = {uid: 2, uploader: false, admin: false};
const UPLOADER: Rollen = {uid: 3, uploader: true, admin: false};
const ADMIN: Rollen = {uid: 4, uploader: true, admin: true};

test("Realm-Rollen aus dem Access-Token, kaputtes Token = keine", () => {
	expect(realmRollen(jwt({realm_access: {roles: ["nutzer", "uploader"]}, name: "Jürgen"}))).toEqual(["nutzer", "uploader"]);
	expect(realmRollen(jwt({sub: "x"}))).toEqual([]);
	expect(realmRollen("kein.token")).toEqual([]);
	expect(realmRollen(undefined)).toEqual([]);
});

test("Rollen aus connect-Nutzer und Token", () => {
	expect(ermittleRollen({uid: "3", roles: {"2": "authenticated user"}}, jwt({realm_access: {roles: ["uploader"]}})))
		.toEqual({uid: 3, uploader: true, admin: false});
	// Admin aus Drupal-Rollen (Legacy-Login) oder aus Keycloak
	expect(ermittleRollen({uid: "4", roles: {"7": "m-admin"}})).toEqual({uid: 4, uploader: true, admin: true});
	expect(ermittleRollen({uid: "4"}, jwt({realm_access: {roles: ["admin"]}}))).toEqual({uid: 4, uploader: true, admin: true});
	// Uploader gibt es nur im Token
	expect(ermittleRollen({uid: "2", roles: {"3": "mischungxl"}})).toEqual({uid: 2, uploader: false, admin: false});
	// nicht angemeldet: nichts, auch mit Token
	expect(ermittleRollen({}, jwt({realm_access: {roles: ["admin"]}}))).toEqual({uid: 0, uploader: false, admin: false});
});

const aktiv = (uid: number) => ({uid, status: 1, tracks: 3});
const deaktiviert = (uid: number) => ({uid, status: 0, tracks: 3});
const unfertig = (uid: number) => ({uid, status: 0, tracks: 0});

test("⋮-Menü: Nutzer sehen keine Pflege", () => {
	expect(setAktionen(NUTZER, aktiv(2))).toEqual([]);
});

test("⋮-Menü: Uploader nur am eigenen Set, reaktivieren nie", () => {
	expect(setAktionen(UPLOADER, aktiv(3))).toEqual(["bearbeiten", "hochladen", "trackscan", "deaktivieren"]);
	expect(setAktionen(UPLOADER, aktiv(99))).toEqual([]);
	expect(setAktionen(UPLOADER, {status: 1, tracks: 1})).toEqual([]);
	expect(setAktionen(UPLOADER, deaktiviert(3))).toEqual(["bearbeiten", "hochladen", "trackscan"]);
	expect(setAktionen(UPLOADER, unfertig(3))).toEqual(["bearbeiten", "hochladen", "trackscan"]);
});

test("⋮-Menü: Admin an allen Sets, reaktivieren nur deaktivierte mit Tracks", () => {
	expect(setAktionen(ADMIN, aktiv(99))).toEqual(["bearbeiten", "hochladen", "trackscan", "deaktivieren"]);
	expect(setAktionen(ADMIN, deaktiviert(99))).toEqual(["bearbeiten", "hochladen", "trackscan", "reaktivieren"]);
	expect(setAktionen(ADMIN, unfertig(99))).toEqual(["bearbeiten", "hochladen", "trackscan"]);
});

test("Block pflege schlägt die Schätzung über Tracks", () => {
	// unfertig mit schon gescannten Tracks (Status noch 0): kein Reaktivieren
	const unfertigMitTracks = {uid: 99, status: 0, tracks: 2, unfertig: true, deaktiviert: false};
	expect(istUnfertig(unfertigMitTracks)).toBe(true);
	expect(istDeaktiviert(unfertigMitTracks)).toBe(false);
	expect(setAktionen(ADMIN, unfertigMitTracks)).toEqual(["bearbeiten", "hochladen", "trackscan"]);
	const deaktiviertOhneTracks = {uid: 99, status: 0, tracks: 0, unfertig: false, deaktiviert: true};
	expect(istUnfertig(deaktiviertOhneTracks)).toBe(false);
	expect(istDeaktiviert(deaktiviertOhneTracks)).toBe(true);
	expect(setAktionen(ADMIN, {...aktiv(99), unfertig: false, deaktiviert: false})).toContain("deaktivieren");
});

test("ohne Block pflege: unfertig = status 0 ohne Tracks", () => {
	expect(istUnfertig(unfertig(3))).toBe(true);
	expect(istUnfertig(deaktiviert(3))).toBe(false);
	expect(istUnfertig(aktiv(3))).toBe(false);
});

test("FAB, Presets und Artist-Pflege nach Rolle", () => {
	expect([NUTZER, UPLOADER, ADMIN].map(darfHochladen)).toEqual([false, true, true]);
	expect([NUTZER, UPLOADER, ADMIN].map(darfArtistAnlegen)).toEqual([false, true, true]);
	expect([NUTZER, UPLOADER, ADMIN].map(darfAdminPflege)).toEqual([false, false, true]);
});
