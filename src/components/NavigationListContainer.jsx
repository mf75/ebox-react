import {useEffect, useState} from "react";
import {useJunkiesService} from "../hooks/useJunkiesService";
import {NavigationList} from "./NavigationList";
import {useAtom} from "jotai";
import {filterVersionAtom} from "../context/atoms";
import {usePflege} from "../hooks/usePflege";
import {darfAdminPflege, darfHochladen} from "../auth/rollen";

export const NavigationListContainer = () => {
	const junkiesApi = useJunkiesService()
	const {rollen} = usePflege()
	const [filter, setFilter] = useState([])
	const [filterVersion] = useAtom(filterVersionAtom)
	useEffect(() => {
		junkiesApi.filterlist()
				.then((res) => {
					// ohne Anmeldung bzw. bei Fehlern kommt keine Liste
					const newFilters = (Array.isArray(res) ? res : []).filter(f => f.filtername !== "")
							.map(f => ({id: f.filterid, name:f.filtername, user: !f.is_preset}));
					setFilter(newFilters)
				})
				.catch(() => setFilter([]));
	}, [junkiesApi,setFilter,filterVersion])

	return <>
		<NavigationList filters={filter} meineSets={darfHochladen(rollen)} deaktivierteSets={darfAdminPflege(rollen)}/>
	</>
}
