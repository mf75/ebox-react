import {fireEvent, render, screen, within} from "@testing-library/react";
import {useState} from "react";
import {FilterEditor} from "./FilterEditor";
import {FilterEntwurf} from "./filterModel";
import {EBoxGenreTerm} from "../../hooks/types";

const genres: EBoxGenreTerm[] = [
	{tid: 20, vid: 2, vocabulary: "genre", name: "house", parent: 0, weight: 0},
	{tid: 167, vid: 11, vocabulary: "tag", name: "set", parent: 0, weight: 0},
];

// hält den Entwurf wie der Container, meldet jede Änderung nach außen
const Rahmen = (props: { start: FilterEntwurf, onEntwurf: (e: FilterEntwurf) => void, istAdmin?: boolean, onDelete?: () => void, onSave?: () => void }) => {
	const [entwurf, setEntwurf] = useState(props.start);
	return <FilterEditor entwurf={entwurf} onChange={e => {
		setEntwurf(e);
		props.onEntwurf(e);
	}} genres={genres} artistNamen={[{djid: 1, nid: 1001, name: "nova kestrel"}]} sucheArtists={() => Promise.resolve([])}
						 vorschau={{titel: ["Set A", "Set B"], mehr: true}} istAdmin={props.istAdmin ?? false} speichert={false}
						 onSave={props.onSave ?? vi.fn()} onCancel={vi.fn()} onDelete={props.onDelete}/>;
}

const start: FilterEntwurf = {filterid: 7, filtername: "Mein Filter", is_preset: false, kriterien: {genre: [20], djs: [1], myvotes: [5]}};

test("zeigt gespeicherte Kriterien und die Vorschau", () => {
	render(<Rahmen start={start} onEntwurf={vi.fn()}/>);
	expect(screen.getByTestId("filtername")).toHaveValue("Mein Filter");
	expect(screen.getByRole("button", {name: "house"})).toBeInTheDocument();
	expect(screen.getByRole("button", {name: "nova kestrel"})).toBeInTheDocument();
	expect(within(screen.getByTestId("vorschau")).getByText("Set B")).toBeInTheDocument();
	expect(within(screen.getByTestId("vorschau")).getByText("… und weitere")).toBeInTheDocument();
	expect(screen.queryByLabelText("Preset für alle Nutzer")).toBeNull();
});

test("Änderungen landen im Entwurf", () => {
	const onEntwurf = vi.fn();
	render(<Rahmen start={start} onEntwurf={onEntwurf}/>);
	fireEvent.click(screen.getByRole("button", {name: "nicht bewertet"}));
	expect(onEntwurf).toHaveBeenLastCalledWith(expect.objectContaining({kriterien: expect.objectContaining({myvotes: [0, 5]})}));
	fireEvent.click(screen.getByRole("button", {name: "5"}));
	expect(onEntwurf).toHaveBeenLastCalledWith(expect.objectContaining({kriterien: expect.objectContaining({myvotes: [0]})}));
	fireEvent.click(screen.getByLabelText("nur nicht gehörte Sets"));
	expect(onEntwurf).toHaveBeenLastCalledWith(expect.objectContaining({kriterien: expect.objectContaining({notheard: true})}));
	fireEvent.change(screen.getByTestId("entriesperartist"), {target: {value: "3"}});
	expect(onEntwurf).toHaveBeenLastCalledWith(expect.objectContaining({kriterien: expect.objectContaining({entriesperartist: 3})}));
	fireEvent.change(screen.getByTestId("entriesperartist"), {target: {value: ""}});
	expect(onEntwurf.mock.lastCall![0].kriterien.entriesperartist).toBeUndefined();
});

test("Preset-Schalter nur für Admins, Löschen mit Rückfrage", () => {
	const onDelete = vi.fn();
	render(<Rahmen start={start} onEntwurf={vi.fn()} istAdmin onDelete={onDelete}/>);
	expect(screen.getByLabelText("Preset für alle Nutzer")).toBeInTheDocument();
	fireEvent.click(screen.getByRole("button", {name: "Löschen"}));
	expect(onDelete).not.toHaveBeenCalled();
	fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", {name: "Löschen"}));
	expect(onDelete).toHaveBeenCalled();
});

test("ohne Namen nicht speicherbar", () => {
	const onSave = vi.fn();
	render(<Rahmen start={{...start, filtername: ""}} onEntwurf={vi.fn()} onSave={onSave}/>);
	expect(screen.getByRole("button", {name: "Speichern"})).toBeDisabled();
});
