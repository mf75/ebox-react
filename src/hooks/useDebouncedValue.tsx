import {useEffect, useState} from "react";

/** Wert, der erst nach `ms` ohne Änderung nachzieht (z. B. Suchfeld → Server-Abfrage). */
export function useDebouncedValue<T>(wert: T, ms: number): T {
	const [verzoegert, setVerzoegert] = useState(wert);
	useEffect(() => {
		const timer = setTimeout(() => setVerzoegert(wert), ms);
		return () => clearTimeout(timer);
	}, [wert, ms]);
	return verzoegert;
}
