import {useState} from "react";
import {Fab} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {usePflege} from "../../hooks/usePflege";
import {darfHochladen} from "../../auth/rollen";
import {UploadWizard} from "./UploadWizard";

/** FAB „Set hochladen“ (Uploader und Admin) mit dem Upload-Wizard; über dem Player. */
export const SetHochladenFab = () => {
	const pflege = usePflege();
	const [offen, setOffen] = useState(false);
	if (!darfHochladen(pflege.rollen)) {
		return null;
	}
	return <>
		<Fab color="secondary" variant="extended" sx={{position: "fixed", right: 24, bottom: 96, zIndex: 1100}}
			 onClick={() => setOffen(true)}>
			<AddIcon sx={{mr: 1}}/>Set hochladen
		</Fab>
		{offen && <UploadWizard onClose={() => setOffen(false)}/>}
	</>;
};
