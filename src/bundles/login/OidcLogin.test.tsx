import {render, screen, waitFor} from "@testing-library/react";
import {MemoryRouter, Route, Routes} from "react-router";
import {Provider} from "jotai";
import OidcLogin from "./OidcLogin";

const auth = vi.hoisted(() => ({
	current: {} as Record<string, unknown>,
}));
vi.mock("react-oidc-context", () => ({useAuth: () => auth.current}));

const api = vi.hoisted(() => ({connectMitBearer: vi.fn(), connect: vi.fn()}));
vi.mock("../../api/JunkiesApi", () => ({junkiesApi: () => api}));

const zeige = (state?: unknown) => render(<Provider>
	<MemoryRouter initialEntries={[{pathname: "/login", state}]}>
		<Routes>
			<Route path="/login" element={<OidcLogin/>}/>
			<Route path="/filter/7" element={<div>Filterseite</div>}/>
		</Routes>
	</MemoryRouter>
</Provider>);

beforeEach(() => {
	localStorage.clear();
	api.connect.mockRejectedValue(new Error("offline"));
});

test("ohne Keycloak-Sitzung geht es zu Keycloak, die Zielseite reist im state mit", async () => {
	const signinRedirect = vi.fn().mockResolvedValue(undefined);
	auth.current = {isLoading: false, user: null, signinRedirect};
	zeige({from: {pathname: "/filter/7"}});
	await waitFor(() => expect(signinRedirect).toHaveBeenCalledWith({state: "/filter/7"}));
});

test("nach der Rückkehr holt connect den Nutzer samt Legacy-Token und springt zur Zielseite", async () => {
	api.connectMitBearer.mockResolvedValue({sessid: "", user: {uid: "3", name: "uploader", token: "abc"}});
	auth.current = {isLoading: false, user: {access_token: "jwt", expired: false, state: "/filter/7"}, signinRedirect: vi.fn()};
	zeige();
	expect(await screen.findByText("Filterseite")).toBeInTheDocument();
	expect(api.connectMitBearer).toHaveBeenCalledWith("jwt");
	expect(JSON.parse(localStorage.getItem("user")!)).toMatchObject({uid: "3", token: "abc"});
});

test("Konto ohne Nutzer bei dj-junkies: Fehlermeldung statt Anmeldung", async () => {
	api.connectMitBearer.mockResolvedValue({sessid: "", user: {uid: "0"}});
	auth.current = {isLoading: false, user: {access_token: "jwt", expired: false}, signinRedirect: vi.fn(), removeUser: vi.fn()};
	zeige();
	expect(await screen.findByText(/keinen Nutzer bei dj-junkies/)).toBeInTheDocument();
	expect(localStorage.getItem("user")).toBeNull();
});
