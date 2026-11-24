import {fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import {MemoryRouter} from "react-router";
import {SetDetail, SetDetailActions} from "./SetDetail";
import {EBoxSet} from "../../hooks/types";

const set: EBoxSet = {
	nid: 2005, title: "Fabrikhalle Mix", duration: new Date(5400 * 1000), created: new Date(2026, 9, 5),
	bookmarked: true, myVote: "neutral", artists: [1002],
	genres: [{tid: 20, name: "house"}],
	artistDetails: [{nid: 1002, djid: 2, name: "quarzwerk", bio: "Bio-Text", country: "de", artwork: {large: "l.jpg"}}],
	tracks: [{nid: 2005, title: "Teil 1", url: "u1", duration: 2700}, {nid: 2005, title: "Teil 2", url: "u2"}],
	votes: {avg: 4, count: 2, all: [
		{uid: 2, name: "nutzer", vote: 5, timestamp: new Date()},
		{uid: 4, name: "madmin", vote: 3, timestamp: new Date()}]},
	comments: [{cid: 1, pid: 0, uid: 2, name: "nutzer", subject: "Start", text: "Erster Kommentar", timestamp: new Date(), thread: "01/"}],
};

const actions = (): SetDetailActions => ({
	play: vi.fn(), enqueue: vi.fn(), playTrack: vi.fn(), enqueueTrack: vi.fn(), bookmark: vi.fn(), vote: vi.fn(),
	comment: vi.fn().mockResolvedValue(true),
});

const zeige = (a: SetDetailActions, canWrite = true) =>
	render(<MemoryRouter><SetDetail set={set} actions={a} canWrite={canWrite}/></MemoryRouter>);

test("zeigt Tracks, Votes aller Nutzer, Kommentare und Artist", () => {
	zeige(actions());
	expect(screen.getByRole("heading", {name: "Fabrikhalle Mix"})).toBeInTheDocument();
	expect(within(screen.getByTestId("tracks")).getAllByRole("listitem")).toHaveLength(2);
	expect(screen.getByTestId("vote-summary")).toHaveTextContent("Ø 4 von 5 · 2 Bewertungen");
	expect(screen.getByLabelText("madmin: 3 von 5")).toBeInTheDocument();
	expect(screen.getByTestId("comments")).toHaveTextContent("Erster Kommentar");
	expect(screen.getByText("quarzwerk (DE)")).toBeInTheDocument();
	expect(screen.getByText("Bio-Text")).toBeInTheDocument();
});

test("einzelnen Track abspielen und Vote ändern", () => {
	const a = actions();
	zeige(a);
	fireEvent.click(screen.getByLabelText("Track 2 abspielen"));
	expect(a.playTrack).toHaveBeenCalledWith(set.tracks[1]);
	fireEvent.click(screen.getByLabelText("gut"));
	expect(a.vote).toHaveBeenCalledWith("good");
	// aktiven Vote erneut klicken = Vote entfernen
	fireEvent.click(screen.getByLabelText("mittel"));
	expect(a.vote).toHaveBeenCalledWith("canceled");
});

test("Kommentar absenden leert das Feld", async () => {
	const a = actions();
	zeige(a);
	const input = screen.getByTestId("comment-input");
	fireEvent.change(input, {target: {value: "  Neuer Kommentar "}});
	fireEvent.click(screen.getByRole("button", {name: "Kommentieren"}));
	expect(a.comment).toHaveBeenCalledWith("Neuer Kommentar");
	await waitFor(() => expect(input).toHaveValue(""));
});

test("ohne Anmeldung keine Schreibaktionen", () => {
	zeige(actions(), false);
	expect(screen.queryByTestId("comment-input")).toBeNull();
	expect(screen.queryByLabelText("bookmark")).toBeNull();
	expect(screen.queryByLabelText("gut")).toBeNull();
});
