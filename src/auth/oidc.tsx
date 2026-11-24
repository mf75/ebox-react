import React from "react";
import {AuthProvider, AuthProviderProps} from "react-oidc-context";
import settings from "../settings";

/** Anmeldung über Keycloak (Code-Flow mit PKCE), sobald eine Realm-URL eingebaut ist. */
export const oidcAktiv = settings.KEYCLOAK_URL !== "";

/** Keycloak-Kontoseite: Passwort ändern, Mail, Sitzungen. */
export const kontoUrl = `${settings.KEYCLOAK_URL}/account`;

const oidcConfig: AuthProviderProps = {
	authority: settings.KEYCLOAK_URL,
	client_id: "ebox-frontend",
	redirect_uri: `${window.location.origin}/login`,
	post_logout_redirect_uri: `${window.location.origin}/`,
	scope: "openid",
	// Das Token braucht die App für connect und für die Pflege-Endpunkte (E6, Bearer); sonst arbeitet sie mit dem
	// Legacy-Token. Ein abgelaufenes Token erneuert usePflege bei Bedarf (signinSilent).
	automaticSilentRenew: false,
	// code/state aus der Adresse entfernen, damit ein Neuladen nicht erneut einlöst
	onSigninCallback: () => window.history.replaceState({}, document.title, window.location.pathname),
};

export const OidcBereich = ({children}: { children: React.ReactNode }) =>
		oidcAktiv ? <AuthProvider {...oidcConfig}>{children}</AuthProvider> : <>{children}</>;
