import {mapFromJsonSet} from "./useJunkiesService";

const api = {buildTrackUrl: (nid: number, name: string) => `dl/${nid}/${name}`};

const json = {
	nid: "2001", title: "Deep Session", setcreated: "1790967900", duration: 3612, lastheard: null, bookmarked: false,
	taxonomy: {"20": {tid: "20", name: "house"}},
	votes: {
		my: "5", avg: 4.5, count: "2", sum: 2,
		firstgoodvote: {uid: "2", name: "nutzer", vote: "5", timestamp: "1790967900"},
		all: [{uid: "2", name: "nutzer", vote: "5", timestamp: "1790967900"}, {uid: "4", name: "madmin", vote: "4", timestamp: "1790974800"}],
	},
	comments: [
		{cid: "3", pid: "1", uid: "4", name: "madmin", subject: "Re", comment: "Antwort", timestamp: "1792519300", status: "0", thread: "01.00/"},
		{cid: "2", pid: "0", uid: "2", name: "nutzer", subject: "zweiter", comment: "<p>später</p>", timestamp: "1792519400", status: "0", thread: "02/"},
		{cid: "1", pid: "0", uid: "2", name: "nutzer", subject: "Start", comment: "erster", timestamp: "1792519200", status: "0", thread: "01/"},
		{cid: "9", pid: "0", uid: "2", name: "nutzer", subject: "x", comment: "unveröffentlicht", timestamp: "1792519500", status: "1", thread: "03/"},
	],
	trackinfo: [{downloadfilename: "a.mp3", title: "Teil 1", artist: "nova", duration: "1800"}, {downloadfilename: "b.mp3", title: "", duration: null}],
	artists: [{djid: "1", artistnid: "1001"}],
	dj: {id: "1", name: "nova kestrel"},
};

test("Votes, Kommentare und Tracks aus dem Mxlnode", () => {
	const set = mapFromJsonSet(api, json);
	expect(set.nid).toBe(2001);
	expect(set.myVote).toBe("good");
	expect(set.artists).toEqual([1001]);
	expect(set.djName).toBe("nova kestrel");
	expect(set.votes?.avg).toBe(4.5);
	expect(set.votes?.all.map(v => [v.name, v.vote])).toEqual([["nutzer", 5], ["madmin", 4]]);
	expect(set.votes?.firstGood?.timestamp).toEqual(new Date(1790967900 * 1000));
	// nur veröffentlichte, in Thread-Reihenfolge (Antwort direkt unter dem Eltern-Kommentar)
	expect(set.comments?.map(c => c.cid)).toEqual([1, 3, 2]);
	expect(set.comments?.[2].text).toBe("später");
	expect(set.tracks.map(t => [t.title, t.url, t.duration])).toEqual([["Teil 1", "dl/2001/a.mp3", 1800], ["Deep Session", "dl/2001/b.mp3", undefined]]);
});

test("Set ohne Votes und Kommentare (Drupal liefert [] statt Objekt)", () => {
	const set = mapFromJsonSet(api, {...json, taxonomy: [], votes: {my: null, avg: null, count: "0", all: [], sum: 0}, comments: []});
	expect(set.votes).toEqual({count: 0, all: []});
	expect(set.comments).toEqual([]);
	expect(set.genres).toEqual([]);
});

test("Eigentümer, Status und djids für die Pflege", () => {
	const set = mapFromJsonSet(api, {...json, uid: 3, status: 0, artists: [{djid: 1, artistnid: 1001}, {djid: 5, artistnid: null}]});
	expect(set.uid).toBe(3);
	expect(set.status).toBe(0);
	expect(set.djids).toEqual([1, 5]);
	const ohne = mapFromJsonSet(api, json);
	expect(ohne.uid).toBeUndefined();
	expect(ohne.status).toBeUndefined();
	expect(ohne.pflege).toBeUndefined();
	const mitPflege = mapFromJsonSet(api, {...json, pflege: {unfertig: true, deaktiviert: false, herkunft: "upload",
		artistdetection_disabled: true, taxonomy_by_dj: false, fulltitle: "Deep Session 2026"}});
	expect(mitPflege.pflege).toEqual({unfertig: true, deaktiviert: false, herkunft: "upload",
		artistdetection_disabled: true, taxonomy_by_dj: false, fulltitle: "Deep Session 2026"});
});
