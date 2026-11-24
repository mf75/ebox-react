const settings = {
	// Vorgabe und Umschaltung auf das Testsystem stehen in vite.config.mts.
	REST_API_URL: import.meta.env.VITE_REST_API_URL,
	// Realm-URL von Keycloak; leer = Anmeldung über das bisherige Formular (js-api/user/login)
	KEYCLOAK_URL: import.meta.env.VITE_KEYCLOAK_URL || "",
};
export default settings;

export const appVersion = "ElectroBox@Web v" + (import.meta.env.VITE_GIT_SHA || 'unknown')+''
