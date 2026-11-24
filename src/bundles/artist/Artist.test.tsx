import {fireEvent, render, screen, within} from "@testing-library/react";
import {MemoryRouter} from "react-router";
import {ArtistSuche} from "./ArtistSuche";
import {ArtistKopf} from "./ArtistKopf";
import {artistAusInfo} from "../../hooks/useArtistDetails";
import {EBoxArtist} from "../../hooks/types";

test("Suche zeigt Treffer als Links auf die Artist-Seite", () => {
	const onSuche = vi.fn();
	render(<MemoryRouter><ArtistSuche suche="quar" onSuche={onSuche}
												 treffer={[{djid: 2, nid: 1002, name: "quarzwerk"}, {djid: 3, nid: 1003, name: "quarzsand"}]}/></MemoryRouter>);
	const links = within(screen.getByTestId("artist-treffer")).getAllByRole("link");
	expect(links.map(l => l.getAttribute("href"))).toEqual(["/artist/1002", "/artist/1003"]);
	fireEvent.change(screen.getByTestId("artist-suche"), {target: {value: "quarz"}});
	expect(onSuche).toHaveBeenCalledWith("quarz");
});

test("Suche ohne Treffer sagt das, vor der Suche nichts", () => {
	const {rerender} = render(<MemoryRouter><ArtistSuche suche="" treffer={null} onSuche={vi.fn()}/></MemoryRouter>);
	expect(screen.queryByText("Kein Artist gefunden.")).not.toBeInTheDocument();
	rerender(<MemoryRouter><ArtistSuche suche="xyz" treffer={[]} onSuche={vi.fn()}/></MemoryRouter>);
	expect(screen.getByText("Kein Artist gefunden.")).toBeInTheDocument();
});

test("Artist-Kopf mit Land, Bio und ähnlichen Artists", () => {
	const artist: EBoxArtist = {nid: 1002, djid: 2, name: "quarzwerk", country: "de", bio: "Bio-Text", artwork: {large: "l.jpg"}};
	const aehnlich: EBoxArtist = {nid: 1003, djid: 3, name: "quarzsand", artwork: {}};
	render(<MemoryRouter><ArtistKopf artist={artist} aehnliche={[aehnlich]}/></MemoryRouter>);
	expect(screen.getByRole("heading", {name: "quarzwerk (DE)"})).toBeInTheDocument();
	expect(screen.getByText("Bio-Text")).toBeInTheDocument();
	expect(within(screen.getByTestId("aehnliche")).getByRole("link", {name: "quarzsand"})).toHaveAttribute("href", "/artist/1003");
});

test("artistinfo-Antwort wird abgebildet, unbekannter Artist ist null", () => {
	expect(artistAusInfo({id: null, nid: null, name: null})).toBeNull();
	const a = artistAusInfo({
		id: 2, nid: 1002, name: "quarzwerk", country: "de",
		lastfm_artistinfo: {name: "Quarzwerk", image: [{size: "large", "#text": "l.jpg"}, {size: "mega", "#text": ""}],
			bio: {summary: "<p>Bio &amp; mehr</p>"}},
		similar_artists: [{match: "1", nid: 1003}, {match: "0.5", nid: 0}],
	})!;
	expect(a).toMatchObject({nid: 1002, djid: 2, name: "Quarzwerk", country: "de", bio: "Bio & mehr", similar: [1003]});
	expect(a.artwork.large).toBe("l.jpg");
	// leere Bild-URL überschreibt das Platzhalterbild nicht
	expect(a.artwork.mega).toContain("dj_silhouette");
});
