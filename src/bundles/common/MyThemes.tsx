import {decomposeColor, getOverlayAlpha, recomposeColor, rgbToHex, Theme, ThemeOptions} from "@mui/material/styles";

export const lightTheme: ThemeOptions = {
	palette: {
		mode: "light",
	}
};
export const darkTheme: ThemeOptions = {
	palette: {
		mode: "dark",
	}
}

// Standard-Elevation der MUI-AppBar; im Dark-Mode bestimmt sie die Stärke der hellen Überlagerung.
const APP_BAR_ELEVATION = 4;

/**
 * Hintergrundfarbe der AppBar als Hex-Wert, z. B. für das theme-color-Meta-Tag.
 * Im Light-Mode die Primärfarbe; im Dark-Mode färbt MUI die AppBar nicht ein, sondern legt über
 * background.paper ein weißes Overlay je nach Elevation, das hier nachgerechnet wird.
 */
export const appBarColor = (theme: Theme): string => {
	if (theme.palette.mode === "light") {
		return rgbToHex(theme.palette.primary.main);
	}
	// Der Browser speichert die Deckkraft mit 8 Bit; ohne diese Rundung liegt das Ergebnis einen Farbwert daneben.
	const overlay = Math.round(getOverlayAlpha(APP_BAR_ELEVATION) * 255) / 255;
	const paper = decomposeColor(theme.palette.background.paper);
	const values = paper.values.slice(0, 3).map(c => Math.round(c + (255 - c) * overlay)) as [number, number, number];
	return rgbToHex(recomposeColor({type: "rgb", values}));
}
