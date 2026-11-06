import {Suspense, useEffect, useMemo} from "react";
import {BrowserRouter} from 'react-router'

import {Box, CircularProgress, CssBaseline} from "@mui/material";
import {createTheme, ThemeProvider} from '@mui/material/styles';
import {appBarColor, darkTheme, lightTheme} from "./bundles/common/MyThemes";
import {useAtom} from "jotai";
import {darkStateAtom} from "./context/atoms";
import {AppPageRouter} from "./AppPageRouter";


function App() {
	const [darkState] = useAtom(darkStateAtom);
	const appliedTheme = useMemo(() => createTheme(darkState ? darkTheme : lightTheme), [darkState]);
	// Android färbt Status- bzw. Adressleiste nach diesem Meta-Tag, auch in der installierten PWA.
	useEffect(() => {
		document.querySelector('meta[name="theme-color"]')?.setAttribute("content", appBarColor(appliedTheme));
	}, [appliedTheme]);
	return (
		<ThemeProvider theme={appliedTheme}>
			<Suspense fallback={<CircularProgress variant={"indeterminate"}/>}>
				<Box sx={{display: "flex"}}>
					<CssBaseline/>
					<BrowserRouter>
						<AppPageRouter/>
					</BrowserRouter>
				</Box>
			</Suspense>
		</ThemeProvider>
	);
}

export default App;
