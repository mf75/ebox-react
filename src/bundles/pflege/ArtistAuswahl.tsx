import {useEffect, useState} from "react";
import {Autocomplete, TextField} from "@mui/material";
import {useJunkiesService} from "../../hooks/useJunkiesService";
import {useDebouncedValue} from "../../hooks/useDebouncedValue";
import {usePflege} from "../../hooks/usePflege";
import {darfArtistAnlegen} from "../../auth/rollen";
import {PflegeFehler} from "../../api/PflegeApi";

interface Props {
	value: string[];
	onChange(namen: string[]): void;
	disabled?: boolean;
	/** Fehler vom Server (form_errors.artistnames) */
	fehler?: string;
	helperText?: string;
}

/** Präfix der Option „‚X‘ als neuen Artist anlegen“ */
const NEU = "\u0000neu:";

/**
 * Artist-Feld eines Sets: Namen über die Artist-Suche (js-api/mischungxl/artists); Uploader und Admins können einen
 * unbekannten Namen als neuen Artist anlegen (artistanlegen).
 */
export const ArtistAuswahl = ({value, onChange, disabled, fehler, helperText}: Props) => {
	const junkies = useJunkiesService();
	const pflege = usePflege();
	const [eingabe, setEingabe] = useState("");
	const suche = useDebouncedValue(eingabe.trim(), 300);
	const [optionen, setOptionen] = useState<string[]>([]);
	const [anlegeFehler, setAnlegeFehler] = useState<string | undefined>();

	useEffect(() => {
		if (suche.length < 2) {
			setOptionen([]);
			return;
		}
		let aktuell = true;
		junkies.artists({s: suche})
			.then(t => aktuell && setOptionen(t.map(a => a.name)))
			.catch(() => aktuell && setOptionen([]));
		return () => {
			aktuell = false;
		};
	}, [junkies, suche]);

	const name = eingabe.trim();
	const bekannt = optionen.some(o => o.toLowerCase() === name.toLowerCase())
		|| value.some(v => v.toLowerCase() === name.toLowerCase());
	const angebot = [...optionen.filter(o => !value.includes(o)),
		...darfArtistAnlegen(pflege.rollen) && name.length > 0 && !bekannt ? [NEU + name] : []];

	const anlegen = (neuerName: string) => {
		setAnlegeFehler(undefined);
		pflege.api()
			.then(api => api.artistAnlegen(neuerName))
			.then(artist => {
				onChange([...value, artist.name]);
				setEingabe("");
			})
			.catch((e: Error) => setAnlegeFehler(e instanceof PflegeFehler ? e.felder.name ?? e.message : e.message));
	};

	return <Autocomplete multiple disabled={disabled} options={angebot} value={value} filterOptions={x => x}
						 inputValue={eingabe} onInputChange={(_e, wert, grund) => grund !== "reset" && setEingabe(wert)}
						 getOptionLabel={o => o.startsWith(NEU) ? `„${o.substring(NEU.length)}“ als neuen Artist anlegen` : o}
						 noOptionsText={eingabe ? "kein Artist gefunden" : "Namen eingeben"}
						 onChange={(_e, namen) => {
							 const neu = namen.find(n => n.startsWith(NEU));
							 if (neu) {
								 anlegen(neu.substring(NEU.length));
							 } else {
								 onChange(namen);
								 setEingabe("");
							 }
						 }}
						 renderInput={params => <TextField {...params} label="Artists"
														   error={Boolean(fehler || anlegeFehler)}
														   helperText={anlegeFehler ?? fehler ?? helperText ??
															   (darfArtistAnlegen(pflege.rollen) ? "Unbekannten Namen eintippen, um ihn als neuen Artist anzulegen" : undefined)}/>}/>;
};
