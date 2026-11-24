import {createRoot} from 'react-dom/client';
import App from './App';
import {Provider} from "jotai";
import {ServiceWorkerProvider} from "./ServiceWorkerProvider";
import {OidcBereich} from "./auth/oidc";

createRoot(document.getElementById('root')!).render(
	<ServiceWorkerProvider>
		<OidcBereich>
			<Provider>
				<App/>
			</Provider>
		</OidcBereich>
	</ServiceWorkerProvider>
);

