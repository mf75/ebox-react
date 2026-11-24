import {htmlZuText} from "./text";

test("Tags entfernt, Entities dekodiert, Umbrüche erhalten", () => {
	expect(htmlZuText("<p>Gro&szlig;er <b>Übergang</b></p><p>zweiter<br/>Absatz</p>")).toEqual("Großer Übergang\n\nzweiter\nAbsatz");
});

test("Skripte werden nicht ausgeführt und erscheinen nur als Text", () => {
	(window as any).boese = false;
	expect(htmlZuText('<img src=x onerror="window.boese=true">ok<script>window.boese=true</script>')).toEqual("okwindow.boese=true");
	expect((window as any).boese).toBe(false);
});

test("leer bleibt leer", () => {
	expect(htmlZuText(null)).toEqual("");
	expect(htmlZuText(undefined)).toEqual("");
});
