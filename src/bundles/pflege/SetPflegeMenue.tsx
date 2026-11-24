import {ReactNode, useState} from "react";
import {Link as RouterLink} from "react-router";
import {IconButton, ListItemIcon, Menu, MenuItem, Tooltip} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import InfoIcon from "@mui/icons-material/Info";
import EditIcon from "@mui/icons-material/Edit";
import UploadIcon from "@mui/icons-material/Upload";
import SyncIcon from "@mui/icons-material/Sync";
import BlockIcon from "@mui/icons-material/Block";
import RestoreIcon from "@mui/icons-material/Restore";
import {useAtom} from "jotai";
import {EBoxSet, NotifyMessage} from "../../hooks/types";
import {notifyMessageAtom} from "../../context/atoms";
import {usePflege} from "../../hooks/usePflege";
import {istUnfertig, SetAktion, setAktionen} from "../../auth/rollen";
import {SetBearbeitenDialog} from "./SetBearbeitenDialog";
import {setEigentum} from "./pflegeModel";
import {UploadWizard} from "./UploadWizard";

interface Props {
	set: EBoxSet;
	/** Antwort mit dem geänderten Set (Mxlnode) */
	onGeaendert(mxlnode: any): void;
}


/**
 * ⋮-Menü an der Set-Karte: „Set-Details“ für alle; für Admins und den Uploader am eigenen Set zusätzlich
 * Bearbeiten, Dateien hochladen, Track-Scan, Deaktivieren bzw. (Admin) Reaktivieren.
 */
export const SetPflegeMenue = ({set, onGeaendert}: Props) => {
	const pflege = usePflege();
	const [, setNotify] = useAtom(notifyMessageAtom);
	const [anker, setAnker] = useState<HTMLElement | null>(null);
	const [dialog, setDialog] = useState<"bearbeiten" | "hochladen" | null>(null);
	const aktionen = setAktionen(pflege.rollen, setEigentum(set));

	const melden = (message: string, severity: NotifyMessage["severity"]) =>
		setNotify({message, severity, autohide: severity === "error" ? 10000 : 4000});

	const ausfuehren = (aktion: SetAktion) => {
		setAnker(null);
		if (aktion === "bearbeiten" || aktion === "hochladen") {
			setDialog(aktion);
			return;
		}
		pflege.api().then(async api => {
			if (aktion === "trackscan") {
				const ergebnis = await api.trackScan(set.nid);
				onGeaendert(ergebnis.set);
				melden(`Track-Scan: ${ergebnis.tracks} Track(s)` + (ergebnis.probleme.length ? ` – ${ergebnis.probleme.join("; ")}` : ""),
					ergebnis.tracks > 0 ? "success" : "warning");
			} else {
				onGeaendert(await api.setStatus(set.nid, aktion === "reaktivieren"));
				melden(aktion === "reaktivieren" ? "Set reaktiviert" : "Set deaktiviert", "success");
			}
		}).catch((e: Error) => melden(e.message, "error"));
	};

	const eintraege: Record<SetAktion, {text: string; icon: ReactNode}> = {
		bearbeiten: {text: "Set bearbeiten", icon: <EditIcon fontSize="small"/>},
		hochladen: {text: istUnfertig(setEigentum(set)) ? "Upload fortsetzen" : "Dateien hochladen", icon: <UploadIcon fontSize="small"/>},
		trackscan: {text: "Track-Scan", icon: <SyncIcon fontSize="small"/>},
		deaktivieren: {text: "Deaktivieren", icon: <BlockIcon fontSize="small"/>},
		reaktivieren: {text: "Reaktivieren", icon: <RestoreIcon fontSize="small"/>},
	};

	return <>
		<Tooltip title="Set-Menü">
			<IconButton aria-label="Set-Menü" onClick={e => setAnker(e.currentTarget)}><MoreVertIcon/></IconButton>
		</Tooltip>
		<Menu anchorEl={anker} open={anker !== null} onClose={() => setAnker(null)}>
			<MenuItem component={RouterLink} to={"/set/" + set.nid} onClick={() => setAnker(null)}>
				<ListItemIcon><InfoIcon fontSize="small"/></ListItemIcon>Set-Details
			</MenuItem>
			{aktionen.map(a => <MenuItem key={a} onClick={() => ausfuehren(a)}>
				<ListItemIcon>{eintraege[a].icon}</ListItemIcon>{eintraege[a].text}
			</MenuItem>)}
		</Menu>
		{dialog === "bearbeiten" && <SetBearbeitenDialog set={set} onClose={() => setDialog(null)} onGespeichert={onGeaendert}/>}
		{dialog === "hochladen" && <UploadWizard set={set} onClose={() => setDialog(null)} onGeaendert={onGeaendert}/>}
	</>;
};
