import {fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router";
import {PlayingList, vorZeit} from "./PlayingList";
import {EBoxPlay, EBoxSet} from "../../hooks/types";

const jetzt = new Date(2026, 10, 14, 12, 0);
const set = {nid: 2016, title: "Set A", tracks: [], artistDetails: []} as unknown as EBoxSet;

test("relative Zeit", () => {
	expect(vorZeit(new Date(jetzt.getTime() - 20_000), jetzt)).toBe("gerade eben");
	expect(vorZeit(new Date(jetzt.getTime() - 5 * 60_000), jetzt)).toBe("vor 5 min");
	expect(vorZeit(new Date(jetzt.getTime() - 80 * 60_000), jetzt)).toBe("vor 1 h 20 min");
});

test("Plays mit Nutzer, Zeit, Client und Set-Link; Abspielen", () => {
	const plays: EBoxPlay[] = [{timestamp: new Date(jetzt.getTime() - 3 * 60_000), uid: 3, name: "uploader", caller: "XBMC", set}];
	const onPlay = vi.fn();
	render(<MemoryRouter><PlayingList plays={plays} jetzt={jetzt} onPlay={onPlay} onEnqueue={vi.fn()}/></MemoryRouter>);
	expect(screen.getByText("uploader · vor 3 min · XBMC")).toBeInTheDocument();
	expect(screen.getByRole("link", {name: "Set A"})).toHaveAttribute("href", "/set/2016");
	fireEvent.click(screen.getByLabelText("Set A abspielen"));
	expect(onPlay).toHaveBeenCalledWith(plays[0]);
});

test("leer", () => {
	render(<MemoryRouter><PlayingList plays={[]} jetzt={jetzt} onPlay={vi.fn()} onEnqueue={vi.fn()}/></MemoryRouter>);
	expect(screen.getByTestId("playing-leer")).toBeInTheDocument();
});
