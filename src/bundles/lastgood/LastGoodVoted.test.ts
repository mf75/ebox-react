import {zuletztGutHinweis} from "./LastGoodVotedContainer";
import {EBoxSet} from "../../hooks/types";

test("Hinweis nennt, wer das Set als erster gut bewertet hat", () => {
	const set = {votes: {count: 1, all: [], firstGood: {uid: 2, name: "nutzer", vote: 5, timestamp: new Date(2026, 9, 2)}}} as unknown as EBoxSet;
	expect(zuletztGutHinweis(set)).toBe("gut bewertet von nutzer am " + new Date(2026, 9, 2).toLocaleDateString());
	expect(zuletztGutHinweis({} as EBoxSet)).toBeUndefined();
});
