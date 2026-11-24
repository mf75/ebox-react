import {useEffect, useRef, useState} from "react";
import {useLocation, useNavigate} from "react-router";
import {useAuth} from "react-oidc-context";
import {useSetAtom} from "jotai";
import {Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography} from "@mui/material";
import {junkiesApi} from "../../api/JunkiesApi";
import {userAtom} from "../../context/atoms";

/**
 * Route /login bei Anmeldung über Keycloak: leitet zu Keycloak weiter und nimmt dort auch die Rückkehr an
 * (redirect_uri). Danach holt sie per connect mit Bearer-Token den Nutzer samt Legacy-Token, mit dem die App
 * wie bisher arbeitet, und springt zur ursprünglichen Seite zurück.
 */
const OidcLogin = () => {
	const auth = useAuth();
	const setUser = useSetAtom(userAtom);
	const location = useLocation();
	const navigate = useNavigate();
	const [fehler, setFehler] = useState<string | null>(null);
	const laeuft = useRef(false);

	useEffect(() => {
		if (auth.isLoading || auth.activeNavigator || fehler !== null || laeuft.current) {
			return;
		}
		if (auth.error) {
			setFehler(auth.error.message);
			return;
		}
		laeuft.current = true;
		if (auth.user && !auth.user.expired) {
			const ziel = typeof auth.user.state === "string" ? auth.user.state : "/";
			junkiesApi({}).connectMitBearer(auth.user.access_token)
					.then(session => {
						if (!(Number(session?.user?.uid) > 0)) {
							throw new Error("Zu diesem Konto gibt es keinen Nutzer bei dj-junkies.");
						}
						setUser(session.user);
						navigate(ziel, {replace: true});
					})
					.catch((e: Error) => {
						laeuft.current = false;
						setFehler(e.message || "Anmeldung fehlgeschlagen");
					});
			return;
		}
		const von = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";
		auth.signinRedirect({state: von}).catch((e: Error) => {
			laeuft.current = false;
			setFehler(e.message);
		});
	}, [auth, fehler, location.state, navigate, setUser]);

	const nochmal = () => {
		auth.removeUser().finally(() => setFehler(null));
	};

	return <Dialog open={true}>
		<DialogTitle>DJ-Junkies Login</DialogTitle>
		<DialogContent>
			{fehler === null
					? <Stack direction="row" spacing={2} sx={{alignItems: "center"}}>
						<CircularProgress size={24}/><Typography>Anmeldung läuft…</Typography>
					</Stack>
					: <Typography color="error">Anmeldung fehlgeschlagen: {fehler}</Typography>}
		</DialogContent>
		{fehler !== null && <DialogActions>
			<Button onClick={() => navigate("/", {replace: true})} color="secondary" variant="contained">Abbrechen</Button>
			<Button onClick={nochmal} color="primary" variant="contained">Erneut versuchen</Button>
		</DialogActions>}
	</Dialog>;
};

export default OidcLogin;
