import {useContext, useMemo} from "react";
import {useAtom} from "jotai";
import {AuthContext} from "react-oidc-context";
import {junkiesApi} from "../api/JunkiesApi";
import {userAtom} from "../context/atoms";


const useAuthService = () => {
	const [ user, setUser ] = useAtom(userAtom);
	// nur vorhanden, wenn die Anmeldung über Keycloak läuft (OidcBereich)
	const oidc = useContext(AuthContext);
	// Memoize so that a new object is only returned if something changes
	return useMemo(() => {
		return {
			login: (username:string, password:string, callback:Function) => {
				junkiesApi({}).login(username, password)
						.then(session => {
							console.log(session.user);
							setUser(session.user);
							callback(session.user);
						})
						.catch(error => {
							console.log(error);
							callback(error.message)
						});
			},
			signout: (callback:Function) => {
				setUser({});
				if (oidc) {
					// auch die Keycloak-Sitzung beenden, sonst meldet "Anmelden" ohne Passwort wieder an
					oidc.signoutRedirect().catch(() => callback());
				}
				else {
					callback();
				}
			},
			user,
			isAuthenticated: user.uid > 0,
			oidc: oidc !== undefined
		};
	}, [user, setUser, oidc]);
};

export default useAuthService;
