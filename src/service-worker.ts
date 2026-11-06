/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import {CacheableResponsePlugin} from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import {createHandlerBoundToURL, precacheAndRoute} from 'workbox-precaching';
import {NavigationRoute, registerRoute} from 'workbox-routing';
import {CacheFirst, StaleWhileRevalidate} from 'workbox-strategies';
import settings from "./settings";
import type {RouteMatchCallback as MatchCallback} from "workbox-core";


declare const self: ServiceWorkerGlobalScope;

clientsClaim();

// self.__WB_MANIFEST wird beim Build durch die Precache-Liste ersetzt (vite-plugin-pwa, injectManifest).
precacheAndRoute(self.__WB_MANIFEST);

// TODO: artistinfo und getfilters (beides POST) würden vom Caching profitieren, die Cache-API speichert aber nur
// GET-Requests. Dafür müssten die Endpunkte auf GET umgestellt oder die Antworten anders zwischengespeichert werden.

const matchArtistImages:MatchCallback = ({url}) => {
	return url.origin === settings.REST_API_URL && url.pathname.startsWith("/artist/");
};
registerRoute(matchArtistImages,new StaleWhileRevalidate({cacheName:"artist_images"}),'GET');

const matchSets:MatchCallback = ({url}) => {
	return url.origin === settings.REST_API_URL && url.pathname.startsWith("/js-api/mischungxl");
};
registerRoute(matchSets,new StaleWhileRevalidate({cacheName:"sets"}),'GET');

// Google Fonts für das Logo: Das Stylesheet kann sich ändern und wird im Hintergrund aktualisiert,
// die Schriftdateien haben versionierte URLs und bleiben dauerhaft im Cache.
registerRoute(({url}) => url.origin === 'https://fonts.googleapis.com',
	new StaleWhileRevalidate({cacheName: 'google-fonts-stylesheets'})
);
registerRoute(({url}) => url.origin === 'https://fonts.gstatic.com',
	new CacheFirst({
		cacheName: 'google-fonts-webfonts',
		plugins: [
			// Status 0: opake Antwort, falls die Schrift ohne CORS angefragt wird.
			new CacheableResponsePlugin({statuses: [0, 200]}),
			new ExpirationPlugin({
				maxEntries: 30,
				maxAgeSeconds: 365 * 24 * 60 * 60,
			}),
		],
	})
);

registerRoute(({request}) => request.destination === 'image',
	new CacheFirst({
		cacheName: 'images',
		plugins: [
			new ExpirationPlugin({
				maxEntries: 60,
				maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
			}),
		],
	})
);

// App-Shell: Navigationen innerhalb der SPA liefern immer die gecachte index.html. Ausgenommen sind Pfade mit
// "/_" am Anfang und Pfade, die wie eine Datei aussehen (Endung im letzten Segment).
registerRoute(new NavigationRoute(createHandlerBoundToURL(import.meta.env.BASE_URL + 'index.html'), {
	denylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
}));

// Wird von updateServiceWorker() aus virtual:pwa-register gesendet, wenn der Benutzer das Update auslöst.
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}
});
