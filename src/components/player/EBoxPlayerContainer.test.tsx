import {Suspense} from "react";
import {Provider} from "jotai";
import {act} from "react-dom/test-utils";
import {EBoxPlayerContainer} from "./EBoxPlayerContainer";
import {render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router";


test('render home as default', async () => {
	await act(async () => {
		render(<MemoryRouter><Provider><Suspense fallback={"test"}><EBoxPlayerContainer /></Suspense></Provider></MemoryRouter>)
	})
	screen.debug();
});
