import {fehlerAusAntwort, pflegeApi, PflegeFehler, pruefeUploadDatei, UPLOAD_MAX_BYTES} from "./PflegeApi";

const BASIS = "http://backend.test";

const antwort = (status: number, body: unknown) =>
	new Response(typeof body === "string" ? body : JSON.stringify(body), {status});

const mitFetch = (status = 200, body: unknown = {nid: 7}) => {
	const fetchFn = vi.fn().mockResolvedValue(antwort(status, body));
	return {fetchFn, api: pflegeApi("jwt-123", BASIS, fetchFn as unknown as typeof fetch)};
};

const aufruf = (fetchFn: ReturnType<typeof vi.fn>) => {
	const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
	return {url, init, headers: init.headers as Record<string, string>, body: init.body ? JSON.parse(String(init.body)) : undefined};
};

test("setanlegen: POST mit Bearer-Header und JSON-Body, ohne ?token=", async () => {
	const {fetchFn, api} = mitFetch();
	await expect(api.setAnlegen({title: "Mix", setcreated: "2026-11-01"})).resolves.toEqual({nid: 7});
	const {url, init, headers, body} = aufruf(fetchFn);
	expect(url).toBe(`${BASIS}/js-api/mischungxl/setanlegen`);
	expect(init.method).toBe("POST");
	expect(headers.Authorization).toBe("Bearer jwt-123");
	expect(headers["Content-Type"]).toBe("application/json");
	expect(body).toEqual({title: "Mix", setcreated: "2026-11-01"});
});

test("setbearbeiten, setstatus, trackscan mit nid in der Query", async () => {
	let t = mitFetch();
	await t.api.setBearbeiten(12, {title: "Neu"});
	expect(aufruf(t.fetchFn).url).toBe(`${BASIS}/js-api/mischungxl/setbearbeiten?nid=12`);
	expect(aufruf(t.fetchFn).body).toEqual({title: "Neu"});

	t = mitFetch();
	await t.api.setStatus(12, false);
	expect(aufruf(t.fetchFn).url).toBe(`${BASIS}/js-api/mischungxl/setstatus?nid=12&status=0`);
	expect(aufruf(t.fetchFn).init.body).toBeUndefined();

	t = mitFetch();
	await t.api.setStatus(12, true);
	expect(aufruf(t.fetchFn).url).toBe(`${BASIS}/js-api/mischungxl/setstatus?nid=12&status=1`);

	t = mitFetch(200, {tracks: 2, art: "einzeln", probleme: [], set: {nid: 12}});
	await expect(t.api.trackScan(12)).resolves.toMatchObject({tracks: 2});
	expect(aufruf(t.fetchFn).url).toBe(`${BASIS}/js-api/mischungxl/trackscan?nid=12`);
	expect(aufruf(t.fetchFn).init.method).toBe("POST");
});

test("setpflege per GET mit nid", async () => {
	const t = mitFetch(200, {nid: 12, pflege: {unfertig: false}});
	await expect(t.api.setPflege(12)).resolves.toMatchObject({nid: 12});
	expect(aufruf(t.fetchFn)).toMatchObject({url: `${BASIS}/js-api/mischungxl/setpflege?nid=12`, init: {method: "GET"}});
	expect(aufruf(t.fetchFn).headers.Authorization).toBe("Bearer jwt-123");
});

test("meinesets und deaktiviertesets per GET", async () => {
	let t = mitFetch(200, [{nid: 1}]);
	await expect(t.api.meineSets()).resolves.toEqual([{nid: 1}]);
	expect(aufruf(t.fetchFn)).toMatchObject({url: `${BASIS}/js-api/mischungxl/meinesets`, init: {method: "GET"}});
	expect(aufruf(t.fetchFn).headers.Authorization).toBe("Bearer jwt-123");

	t = mitFetch(200, []);
	await t.api.deaktivierteSets();
	expect(aufruf(t.fetchFn)).toMatchObject({url: `${BASIS}/js-api/mischungxl/deaktiviertesets`, init: {method: "GET"}});
});

test("Artist lesen, anlegen, bearbeiten", async () => {
	let t = mitFetch();
	await t.api.artistLesen(55);
	expect(aufruf(t.fetchFn)).toMatchObject({url: `${BASIS}/js-api/mischungxl/artist?nid=55`, init: {method: "GET"}});

	t = mitFetch();
	await t.api.artistAnlegen("nova kestrel");
	expect(aufruf(t.fetchFn)).toMatchObject({url: `${BASIS}/js-api/mischungxl/artistanlegen`, body: {name: "nova kestrel"}});

	t = mitFetch();
	await t.api.artistBearbeiten(55, {abgleich: true});
	expect(aufruf(t.fetchFn)).toMatchObject({url: `${BASIS}/js-api/mischungxl/artistbearbeiten?nid=55`, body: {abgleich: true}});
});

test("406 mit form_errors wird zu Feldfehlern", async () => {
	const {api} = mitFetch(406, {form_errors: {title: "Titel fehlt"}});
	const fehler = await api.setAnlegen({title: ""}).catch(e => e);
	expect(fehler).toBeInstanceOf(PflegeFehler);
	expect(fehler.status).toBe(406);
	expect(fehler.felder).toEqual({title: "Titel fehlt"});
	expect(fehler.message).toBe("Titel fehlt");
});

test("Fehler ohne form_errors: Text nach Status", () => {
	expect(fehlerAusAntwort(403, "[null]")).toMatchObject({status: 403, felder: {}, message: "Keine Berechtigung"});
	expect(fehlerAusAntwort(404, "[null]").message).toBe("Nicht gefunden");
	expect(fehlerAusAntwort(502, "<html>Bad Gateway</html>").message).toBe("Fehler 502");
});

test("Dateien vor dem Upload prüfen: Endung und Größe", () => {
	expect(pruefeUploadDatei({name: "set.MP3", size: 10})).toBeNull();
	expect(pruefeUploadDatei({name: "set.flac", size: UPLOAD_MAX_BYTES})).toBeNull();
	expect(pruefeUploadDatei({name: "cover.jpg", size: 10})).toMatch(/Endung nicht erlaubt/);
	expect(pruefeUploadDatei({name: "ohne-endung", size: 10})).toMatch(/Endung nicht erlaubt/);
	expect(pruefeUploadDatei({name: "riesig.wav", size: UPLOAD_MAX_BYTES + 1})).toMatch(/größer als 1 GB/);
});

/** XMLHttpRequest-Attrappe: merkt sich Aufruf und Header, Antwort per antworte() */
class XhrAttrappe {
	methode = "";
	url = "";
	headers: Record<string, string> = {};
	body: unknown;
	status = 0;
	responseText = "";
	upload: {onprogress: ((e: {lengthComputable: boolean; loaded: number; total: number}) => void) | null} = {onprogress: null};
	onload: (() => void) | null = null;
	onerror: (() => void) | null = null;
	onabort: (() => void) | null = null;
	open(methode: string, url: string) {
		this.methode = methode;
		this.url = url;
	}
	setRequestHeader(name: string, wert: string) {
		this.headers[name] = wert;
	}
	send(body: unknown) {
		this.body = body;
	}
	abort() {
		this.onabort?.();
	}
	antworte(status: number, text: string) {
		this.status = status;
		this.responseText = text;
		this.onload?.();
	}
}

test("Upload: roher Body, octet-stream, Bearer, Fortschritt", async () => {
	const xhr = new XhrAttrappe();
	const api = pflegeApi("jwt-123", BASIS, vi.fn() as unknown as typeof fetch, () => xhr as unknown as XMLHttpRequest);
	const datei = new File(["abc"], "Mein Set.mp3");
	const fortschritt = vi.fn();
	const auftrag = api.upload(9, datei, fortschritt);
	expect(xhr.methode).toBe("POST");
	expect(xhr.url).toBe(`${BASIS}/js-api/mischungxl/upload?nid=9&datei=Mein%20Set.mp3`);
	expect(xhr.headers).toMatchObject({Authorization: "Bearer jwt-123", "Content-Type": "application/octet-stream"});
	expect(xhr.body).toBe(datei);
	xhr.upload.onprogress?.({lengthComputable: true, loaded: 1, total: 4});
	expect(fortschritt).toHaveBeenCalledWith(0.25);
	xhr.antworte(200, JSON.stringify({datei: "Mein Set.mp3", groesse: 3}));
	await expect(auftrag.ergebnis).resolves.toEqual({datei: "Mein Set.mp3", groesse: 3});
});

test("Upload: 413 und 406 werden zu Feldfehlern an datei, Abbruch zu einem Fehler", async () => {
	const xhr = new XhrAttrappe();
	const api = pflegeApi("jwt", BASIS, vi.fn() as unknown as typeof fetch, () => xhr as unknown as XMLHttpRequest);
	let auftrag = api.upload(9, new File(["x"], "a.mp3"), () => undefined);
	xhr.antworte(413, JSON.stringify({form_errors: {datei: "Datei größer als 1 GB"}}));
	await expect(auftrag.ergebnis).rejects.toMatchObject({status: 413, felder: {datei: "Datei größer als 1 GB"}});

	auftrag = api.upload(9, new File(["x"], "a.mp3"), () => undefined);
	xhr.antworte(406, JSON.stringify({form_errors: {datei: "Endung nicht erlaubt"}}));
	await expect(auftrag.ergebnis).rejects.toMatchObject({status: 406, message: "Endung nicht erlaubt"});

	auftrag = api.upload(9, new File(["x"], "a.mp3"), () => undefined);
	auftrag.abbrechen();
	await expect(auftrag.ergebnis).rejects.toBeInstanceOf(PflegeFehler);
});
