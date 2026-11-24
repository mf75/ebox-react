import settings, {appVersion} from "../settings";

/**
 * Query-String wie ihn die Legacy-API (PHP) erwartet: Arrays als `name[]=a&name[]=b`,
 * undefined/null werden weggelassen.
 * @param {Object<string, any>} params
 */
export const queryString = (params) => Object.entries(params)
		.filter(([, wert]) => wert !== undefined && wert !== null)
		.flatMap(([name, wert]) => Array.isArray(wert)
				? wert.map(w => encodeURIComponent(name + "[]") + "=" + encodeURIComponent(w))
				: [encodeURIComponent(name) + "=" + encodeURIComponent(wert)])
		.join("&");

export const junkiesApi = (authTokenSupplier) => {
	const authToken = authTokenSupplier;
	const defaultHeader = () => {
		return {
			Accept: "application/json"
		};
	}
	const customFetch = (
			url,
			method = "GET",
			body = false,
			type = "application/json",
			headers = defaultHeader()
	) => {
		const options = {
			method,
			headers
		};
		if (body) {
			options.body = type === "application/json" ? JSON.stringify(body) : body;
			if (type) {//kein Content-Type setzen für Dateiupload aus Javascript
				options.headers["Content-Type"] = type;
			}
		}
		return fetch(url, options)
				.then(async response => {
					if (!response.ok) {
						throw new Error(await response.text());
					}
					return response;
				})
				.catch(err => {
					throw new Error(err);
				});
	};

	const login = (username, password) => {
		const url = `${settings.REST_API_URL}/js-api/user/login`;
		const data = new URLSearchParams("username=" + username + "&password=" + password);
		return customFetch(url, "POST", data, "application/x-www-form-urlencoded")
				.then(response => response.json());
	}

	const connect = () => {
		const url = `${settings.REST_API_URL}/js-api/mischungxl/connect?${authToken.token ? 'token=' + authToken.token : ''}`;
		return customFetch(url, "POST")
				.then(response => response.json());
	}

	/** connect mit Keycloak-Access-Token (ebox-backend, ab S5): Nutzer samt Legacy-Token */
	const connectMitBearer = (accessToken) => {
		const headers = {...defaultHeader(), Authorization: `Bearer ${accessToken}`};
		return customFetch(`${settings.REST_API_URL}/js-api/mischungxl/connect`, "POST", false, "application/json", headers)
				.then(response => response.json());
	}

	const setlist = (searchParams) => {
		const params = {
			...authToken.token && {token: authToken.token},
			...searchParams
		};
		const url = `${settings.REST_API_URL}/js-api/mischungxl?${queryString(params)}`;
		return customFetch(url, "GET")
				.then(response => response.json());
	}

	/** @param {number} nid ein Set (retrieve), Antwort ein Mxlnode bzw. leeres Objekt */
	const retrieve = (nid) => {
		const params = {...authToken.token && {token: authToken.token}};
		const paramsStr = Object.entries(params).map(pair => pair.map(encodeURIComponent).join('=')).join("&")
		const url = `${settings.REST_API_URL}/js-api/mischungxl/${encodeURIComponent(nid)}?${paramsStr}`;
		return customFetch(url, "GET")
				.then(response => response.json());
	}

	/** Plays der letzten 120 min, neueste zuerst: [{timestamp, uid, name, caller, set: Mxlnode}] */
	const playing = () => {
		const params = {...authToken.token && {token: authToken.token}};
		const paramsStr = Object.entries(params).map(pair => pair.map(encodeURIComponent).join('=')).join("&")
		const url = `${settings.REST_API_URL}/js-api/mischungxl/playing?${paramsStr}`;
		return customFetch(url, "GET")
				.then(response => response.json());
	}

	/**
	 * Filter anlegen (ohne filterid) oder ändern; mit ersetzen=1 ersetzt ebox-backend die gespeicherten Kriterien
	 * vollständig. Antwort {successful, filter} bzw. {successful: false, message}.
	 */
	const editfilter = (params) => {
		const all = {...params, ...authToken.token && {token: authToken.token}};
		const url = `${settings.REST_API_URL}/js-api/mischungxl/editfilter?${queryString(all)}`;
		return customFetch(url, "POST").then(response => response.json());
	}

	const deletefilter = (filterid) => {
		const all = {filterid, ...authToken.token && {token: authToken.token}};
		const url = `${settings.REST_API_URL}/js-api/mischungxl/deletefilter?${queryString(all)}`;
		return customFetch(url, "POST").then(response => response.json());
	}

	/** Genres und Tags: [{tid, vid, vocabulary, name, parent, weight}] */
	const genres = () => {
		const all = {...authToken.token && {token: authToken.token}};
		return customFetch(`${settings.REST_API_URL}/js-api/mischungxl/genres?${queryString(all)}`, "GET")
				.then(response => response.json());
	}

	/** Artist-Suche: {s: "teil"} oder {djid: [1, 2]} → [{djid, nid, name}] */
	const artists = (suche) => {
		const all = {...suche, ...authToken.token && {token: authToken.token}};
		return customFetch(`${settings.REST_API_URL}/js-api/mischungxl/artists?${queryString(all)}`, "GET")
				.then(response => response.json());
	}

	/** @param {number|null} [id] ohne ID liefert der Server alle Filter des Benutzers */
	const filterlist = (id = null) => {
		const params = {
			...id && {id: id},
			...authToken.token && {token: authToken.token},
		}
		const paramsStr = Object.entries(params).map(pair => pair.map(encodeURIComponent).join('=')).join("&")
		const url = `${settings.REST_API_URL}/js-api/mischungxl/getfilters?${paramsStr}`;
		return customFetch(url, "POST")
				.then(response => response.json());
	}

	const artistinfo = (artistnid) => {
		const url = `${settings.REST_API_URL}/js-api/mischungxl/artistinfo?nid=${artistnid}&${authToken.token ? 'token=' + authToken.token : ''}`;
		return customFetch(url, "POST")
				.then(response => response.json());
	}

	const playinform = (nid) => {
		const params = {
			...authToken.token && {token: authToken.token},
			id: nid,
			caller: appVersion,
			timestamp: new Date().getTime()/1000
		}
		const paramsStr = Object.entries(params).map(pair => pair.map(encodeURIComponent).join('=')).join("&")
		const url = `${settings.REST_API_URL}/js-api/mischungxl/playinform?${paramsStr}`;
		return customFetch(url, "POST").then(response => response.json());
	}

	const vote = (nid, vote) => {
		const params = {
			...authToken.token && {token: authToken.token},
			id: nid,
			vote: vote,
			timestamp: new Date().getTime()/1000
		}
		const paramsStr = Object.entries(params).map(pair => pair.map(encodeURIComponent).join('=')).join("&")
		const url = `${settings.REST_API_URL}/js-api/mischungxl/vote?${paramsStr}`;
		return customFetch(url, "POST").then(response => response.json());
	}

	const addbookmark = (nid) => {
		const params = {
			...authToken.token && {token: authToken.token},
			timestamp: new Date().getTime()/1000
		}
		const paramsStr = Object.entries(params).map(pair => pair.map(encodeURIComponent).join('=')).join("&")
		const url = `${settings.REST_API_URL}/js-api/mischungxl/addbookmark?${paramsStr}`;
		return customFetch(url, "POST", [nid]).then(response => response.json());
	}

	const delbookmark = (nid) => {
		const params = {
			...authToken.token && {token: authToken.token},
			timestamp: new Date().getTime()/1000
		}
		const paramsStr = Object.entries(params).map(pair => pair.map(encodeURIComponent).join('=')).join("&")
		const url = `${settings.REST_API_URL}/js-api/mischungxl/delbookmark?${paramsStr}`;
		return customFetch(url, "POST",  [nid]).then(response => response.json());
	}

	const createComment = (nid, commentText) => {
		const params = {
			...authToken.token && {token: authToken.token}
		}
		const paramsStr = Object.entries(params).map(pair => pair.map(encodeURIComponent).join('=')).join("&")
		const url = `${settings.REST_API_URL}/js-api/comment?${paramsStr}`;
		// ohne subject leitet der Server den Betreff aus dem Text ab
		return customFetch(url, "POST", {nid:nid, comment:commentText})
				.then(response => response.json());
	}

	const buildTrackUrl = (nid, downloadfilename) => {
		const params = {
			...authToken.token && {token: authToken.token},
			nid: nid, trackname: downloadfilename
		};
		const paramsStr = Object.entries(params).map(pair => pair.map(encodeURIComponent).join('=')).join("&")
		return `${settings.REST_API_URL}/mischungxl/download?${paramsStr}`
	}

	return {
		login,
		connect,
		connectMitBearer,
		setlist,
		retrieve,
		playing,
		filterlist,
		editfilter,
		deletefilter,
		genres,
		artists,
		artistinfo,
		playinform,
		vote,
		addbookmark,
		delbookmark,
		createComment,
		buildTrackUrl
	};
};


