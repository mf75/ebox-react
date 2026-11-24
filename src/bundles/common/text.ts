/**
 * HTML aus dem Backend (Kommentare, last.fm-Bio) als reiner Text: Tags weg, Entities dekodiert.
 * DOMParser führt keine Skripte aus und lädt keine Ressourcen; das Ergebnis wird nie als HTML eingesetzt.
 */
export function htmlZuText(html: string | null | undefined): string {
    if (!html) {
        return "";
    }
    const mitUmbruechen = html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n");
    const text = new DOMParser().parseFromString(mitUmbruechen, "text/html").body.textContent ?? "";
    return text.replace(/\n{3,}/g, "\n\n").trim();
}
