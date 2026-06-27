// Unit tests for the persisted webview view-state (T-112).
//
// `src/webview/state/viewState.ts` is pure: it shapes, clamps, and validates
// the JSON slot held by `vscode.setState()` / `getState()`. The tests drive it
// through a tiny in-memory state API, so they need neither `vscode` nor a DOM.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
    clampRatio,
    createViewStateStore,
    DEFAULT_VIEW_STATE
} from "../../src/webview/state/viewState";

function fakeApi(initial: unknown) {
    let state: unknown = initial;
    return {
        getState: () => state,
        setState: (next: unknown) => {
            state = next;
        },
        peek: () => state
    };
}

describe("clampRatio", () => {
    it("returns the default for non-finite input", () => {
        assert.equal(clampRatio(Number.NaN), DEFAULT_VIEW_STATE.splitRatio);
        assert.equal(clampRatio(Number.POSITIVE_INFINITY), DEFAULT_VIEW_STATE.splitRatio);
    });

    it("clamps to the [0.05, 0.95] band", () => {
        assert.equal(clampRatio(-1), 0.05);
        assert.equal(clampRatio(2), 0.95);
        assert.equal(clampRatio(0.5), 0.5);
    });
});

describe("createViewStateStore", () => {
    it("falls back to defaults for junk persisted state", () => {
        assert.deepEqual(createViewStateStore(fakeApi(null)).read(), DEFAULT_VIEW_STATE);
        assert.deepEqual(createViewStateStore(fakeApi(42)).read(), DEFAULT_VIEW_STATE);
    });

    it("parses and clamps a stored state", () => {
        const store = createViewStateStore(
            fakeApi({
                splitRatio: 5,
                layoutMode: "editor-only",
                cursor: { anchor: 3, head: 7 },
                scrollTop: 120
            })
        );
        assert.deepEqual(store.read(), {
            splitRatio: 0.95,
            layoutMode: "editor-only",
            cursor: { anchor: 3, head: 7 },
            scrollTop: 120
        });
    });

    it("drops a malformed cursor to null", () => {
        const store = createViewStateStore(fakeApi({ cursor: { anchor: "x", head: 1 } }));
        assert.equal(store.read().cursor, null);
    });

    it("writes through setState on a real change", () => {
        const api = fakeApi(undefined);
        const store = createViewStateStore(api);
        store.patch({ layoutMode: "split" });
        assert.equal(store.read().layoutMode, "split");
        assert.equal((api.peek() as { layoutMode: string }).layoutMode, "split");
    });

    it("is a no-op when nothing actually changes", () => {
        const api = fakeApi({ splitRatio: 0.5, layoutMode: "split", scrollTop: 0 });
        const store = createViewStateStore(api);
        api.setState("sentinel");
        store.patch({ splitRatio: 0.5, layoutMode: "split" });
        assert.equal(api.peek(), "sentinel");
    });

    it("floors and clamps cursor offsets on patch", () => {
        const store = createViewStateStore(fakeApi(undefined));
        store.patch({ cursor: { anchor: -5, head: 4.9 } });
        assert.deepEqual(store.read().cursor, { anchor: 0, head: 4 });
    });
});
