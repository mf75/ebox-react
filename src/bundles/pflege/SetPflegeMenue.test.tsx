import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MemoryRouter} from "react-router";
import {Provider} from "jotai";
import {EBoxSet} from "../../hooks/types";
import {Rollen} from "../../auth/rollen";
import {SetPflegeMenue} from "./SetPflegeMenue";
import {NavigationList} from "../../components/NavigationList";

const pflege = vi.hoisted(() => ({
	rollen: {uid: 0, uploader: false, admin: false} as Rollen,
	api: {setStatus: vi.fn(), trackScan: vi.fn()},
}));
vi.mock("../../hooks/usePflege", () => ({
	usePflege: () => ({rollen: pflege.rollen, api: () => Promise.resolve(pflege.api)}),
}));

const set = (teil: Partial<EBoxSet>): EBoxSet => ({
	nid: 11, title: "Mix", duration: new Date(0), created: new Date(), bookmarked: false, artists: [], artistDetails: [],
	tracks: [{nid: 11, title: "t", url: "u"}], uid: 3, status: 1, ...teil,
});

const zeige = (s: EBoxSet, onGeaendert = vi.fn()) => {
	render(<Provider><MemoryRouter><SetPflegeMenue set={s} onGeaendert={onGeaendert}/></MemoryRouter></Provider>);
	return onGeaendert;
};

const eintraege = async () => {
	await userEvent.click(screen.getByRole("button", {name: "Set-Menü"}));
	return screen.getAllByRole("menuitem").map(m => m.textContent);
};

test("Nutzer: nur Set-Details", async () => {
	pflege.rollen = {uid: 2, uploader: false, admin: false};
	zeige(set({}));
	expect(await eintraege()).toEqual(["Set-Details"]);
});

test("Uploader am eigenen unfertigen Set: Upload fortsetzen, kein Deaktivieren", async () => {
	pflege.rollen = {uid: 3, uploader: true, admin: false};
	zeige(set({status: 0, tracks: []}));
	expect(await eintraege()).toEqual(["Set-Details", "Set bearbeiten", "Upload fortsetzen", "Track-Scan"]);
});

test("Admin reaktiviert ein deaktiviertes Set per setstatus", async () => {
	pflege.rollen = {uid: 4, uploader: true, admin: true};
	pflege.api.setStatus.mockResolvedValue({nid: 11, status: 1});
	const onGeaendert = zeige(set({status: 0}));
	expect(await eintraege()).toContain("Reaktivieren");
	await userEvent.click(screen.getByRole("menuitem", {name: "Reaktivieren"}));
	await waitFor(() => expect(onGeaendert).toHaveBeenCalledWith({nid: 11, status: 1}));
	expect(pflege.api.setStatus).toHaveBeenCalledWith(11, true);
});

test("Navigation: Presets nur mit Rolle", () => {
	const {rerender} = render(<MemoryRouter><NavigationList filters={[]}/></MemoryRouter>);
	expect(screen.queryByText("Meine Sets")).not.toBeInTheDocument();
	rerender(<MemoryRouter><NavigationList filters={[]} meineSets deaktivierteSets={false}/></MemoryRouter>);
	expect(screen.getByText("Meine Sets")).toBeInTheDocument();
	expect(screen.queryByText("Deaktivierte Sets")).not.toBeInTheDocument();
	rerender(<MemoryRouter><NavigationList filters={[]} meineSets deaktivierteSets/></MemoryRouter>);
	expect(screen.getByText("Deaktivierte Sets")).toBeInTheDocument();
});
