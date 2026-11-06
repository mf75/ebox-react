import React from "react";
import {useRegisterSW} from "virtual:pwa-register/react";

interface ServiceWorkerControl {
	assetsUpdateReady: boolean;
	updateAssets: () => void;
}

const ServiceWorkerContext = React.createContext<ServiceWorkerControl | undefined>(undefined);

// Ohne Benachrichtigungs-Berechtigung schlägt showNotification fehl; der Button in der Toolbar reicht dann.
const notifyUpdate = () => {
	navigator.serviceWorker.ready
		.then(registration => registration.showNotification("Es ist eine neue Electrobox@Web Version verfügbar!", {
			body: "Das Update kann über den Button in der Toolbar ausgelöst werden!"
		}))
		.catch(() => undefined);
}

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

// Der Browser sucht von sich aus nur bei Navigationen nach einem neuen Service Worker. Eine lange offene App
// (z. B. die installierte PWA) würde ein Update sonst erst nach einem Neuladen bemerken.
const scheduleUpdateChecks = (registration: ServiceWorkerRegistration) => {
	const check = () => {
		if (navigator.onLine && !registration.installing) {
			registration.update().catch(() => undefined);
		}
	};
	setInterval(check, UPDATE_CHECK_INTERVAL_MS);
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "visible") {
			check();
		}
	});
}

/**
 * Registriert den Service Worker (nur im Produktions-Build, im Dev-Server liefert vite-plugin-pwa einen Leer-Stub)
 * und meldet eine wartende neue Version. updateAssets aktiviert sie per SKIP_WAITING und lädt die Seite neu.
 */
const ServiceWorkerProvider = ({children}: { children: React.ReactNode }) => {
	const {needRefresh: [assetsUpdateReady], updateServiceWorker} = useRegisterSW({
		onNeedRefresh: notifyUpdate,
		onRegisteredSW: (_swUrl, registration) => {
			if (registration) {
				scheduleUpdateChecks(registration);
			}
		},
	});

	const value = React.useMemo(() => ({
		assetsUpdateReady,
		updateAssets: () => void updateServiceWorker(),
	}), [assetsUpdateReady, updateServiceWorker]);

	return <ServiceWorkerContext.Provider value={value}>{children}</ServiceWorkerContext.Provider>;
}

function useServiceWorker() {
	const context = React.useContext(ServiceWorkerContext);
	if (!context) {
		throw new Error(
			"useServiceWorker must be used within a ServiceWorkerProvider"
		);
	}
	return context;
}

export {ServiceWorkerProvider, useServiceWorker};
