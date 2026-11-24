import {useContext, useMemo} from "react";
import {useAtom} from "jotai";
import {AuthContext} from "react-oidc-context";
import {userAtom} from "../context/atoms";
import {PflegeApi, pflegeApi, PflegeFehler} from "../api/PflegeApi";
import {ermittleRollen, Rollen} from "../auth/rollen";

export interface Pflege {
	rollen: Rollen;
	/** Pflege-API mit gültigem Access-Token; erneuert ein abgelaufenes Token still, wirft ohne Keycloak-Sitzung */
	api(): Promise<PflegeApi>;
}

/** Rollen und Pflege-API (Bearer-Token aus der Keycloak-Sitzung) für Set- und Artist-Pflege. */
export const usePflege = (): Pflege => {
	const [user] = useAtom(userAtom);
	// nur vorhanden, wenn die Anmeldung über Keycloak läuft (OidcBereich)
	const oidc = useContext(AuthContext);
	const oidcUser = oidc?.user;
	return useMemo(() => ({
		rollen: ermittleRollen(user, oidcUser?.access_token),
		api: async () => {
			let aktuell = oidcUser;
			if (aktuell && aktuell.expired && oidc) {
				aktuell = await oidc.signinSilent().catch(() => null);
			}
			if (!aktuell || aktuell.expired || !aktuell.access_token) {
				throw new PflegeFehler(401, "Für die Pflege bitte ab- und neu anmelden (Keycloak-Sitzung fehlt oder ist abgelaufen)");
			}
			return pflegeApi(aktuell.access_token);
		},
	}), [user, oidc, oidcUser]);
};
