import {useEffect, useState} from "react";
import {useParams} from "react-router";
import {useJunkiesService} from "../../hooks/useJunkiesService";
import {useAtom} from "jotai";
import {pageTitleAtom, toolbarSearchInputAtom} from "../../context/atoms";
import {SetCardList} from "./SetCardList";
import {EBoxFilter, EBoxSearchParams, EBoxSet} from "../../hooks/types";
import {Button} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import {Link} from "react-router";
import useAuthService from "../../hooks/useAuthService";
import {darfAendern, istAdmin} from "../filtereditor/filterModel";

export const SetCardListContainer = () => {
	const junkiesApi = useJunkiesService()
	const auth = useAuthService()
	const id = Number(useParams().id)
	const [ sets, setSets ] = useState<EBoxSet[]>([] as EBoxSet[])
	const [ filterDefinition, setFilterDefinition ] = useState<EBoxFilter|undefined>();
	const [ , setPageTitle] = useAtom(pageTitleAtom);
	const [ toolbarSearchInput ] = useAtom<string>(toolbarSearchInputAtom);
	const [ searchParams, setSearchParams ] = useState<EBoxSearchParams>({filterid:id, page:0});

	const loadNextPage = () => {
		setSearchParams({...searchParams, page: searchParams.page + 1});
	}

	useEffect(() => {
		console.log("Load FilterDEF for Filter", id);
		junkiesApi.filterlist(id).then((res: EBoxFilter[]) => {
			if (res.length === 1) {
				console.log("Filter", res[0])
				setFilterDefinition(() => res[0]);
				setPageTitle((t) => "Filter " + res[0].filtername);
			}
		})
	}, [junkiesApi,id,setPageTitle])

	useEffect( ()=> {
		console.log("START NEW SEARCH",toolbarSearchInput)
		setSets(() => []);
		setSearchParams(() => { return {filterid:id, page:0, s:toolbarSearchInput}});
	}, [id,toolbarSearchInput]);

	useEffect(() => {
		//TODO: HACK damit beim Start nicht doppelt gesucht wird (dieser und obiger Hook) suchen wir erst nachdem
		// "s" mit "toolbarSearchInput" befüllt wurde durch obigen Hook...
		if (searchParams.s !== undefined) {
			console.log("FETCH NEXT:", searchParams)
			junkiesApi.setlist(searchParams).then(res => setSets([...sets, ...res]));
		}
	}, [searchParams])

	const bearbeiten = filterDefinition && darfAendern(filterDefinition.is_preset === true, istAdmin(auth.user)) &&
		<Button size="small" startIcon={<EditIcon/>} component={Link} to={`/filter/${id}/bearbeiten`}>Bearbeiten</Button>;
	return <SetCardList sets={sets} filter={filterDefinition} kopfAktion={bearbeiten} onNextPage={loadNextPage}/>
}
