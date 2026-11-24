import {Link, useNavigate} from "react-router";
import {Box, IconButton, Tooltip, Typography} from "@mui/material";

import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import useAuthService from "../hooks/useAuthService";
import {kontoUrl} from "../auth/oidc";

const UserInfo = () => {
	const navigate = useNavigate();
	const authService = useAuthService();
	return <Box>
		{authService.isAuthenticated === true ?
			<Typography variant={"subtitle2"}>
				{authService.user.name}
				{authService.oidc &&
				 <Tooltip title="Konto (Passwort ändern)">
					 <IconButton component="a" href={kontoUrl} target="_blank" rel="noopener">
						 <ManageAccountsIcon/>
					 </IconButton>
				 </Tooltip>}
				<Tooltip title="Abmelden">
					<IconButton onClick={() => {
						authService.signout(() => navigate('/'))
					}}>
						<ExitToAppIcon/>
					</IconButton>
				</Tooltip>
			</Typography>
			: <Typography variant={"subtitle2"}>nicht angemeldet!
				<IconButton component={Link} to="/login"><LockOpenIcon/></IconButton>
			</Typography>}
		</Box>
}

export default UserInfo;


