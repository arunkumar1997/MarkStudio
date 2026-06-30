// Unit tests for the pure two-root template resolver (M5.1, ADR-0025).

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  resolve,
  filterByKind,
  type ScannedTemplate
} from "../../src/templates/templateResolver";

function ws(
  basename: string,
  overrides: Partial<ScannedTemplate> = {}
): ScannedTemplate {
  return {
    basename,
    path: `.markstudio/templates/${basename}.md`,
    source: "workspace",
    kind: "file",
    ...overrides
  };
}

function user(
  basename: string,
  overrides: Partial<ScannedTemplate> = {}
): ScannedTemplate {
  return {
    basename,
    path: `user/templates/${basename}.md`,
    source: "user",
    kind: "file",
    ...overrides
  };
}

describe("resolve — precedence", () => {
  it("lets a workspace template win over a user template with the same basename", () => {
    const result = resolve([ws("daily")], [user("daily")]);
    assert.equal(result.length, 1);
    assert.equal(result[0].source, "workspace");
  });

  it("is case-insensitive on basename collisions", () => {
    const result = resolve([ws("Daily")], [user("daily")]);
    assert.equal(result.length, 1);
    assert.equal(result[0].source, "workspace");
    assert.equal(result[0].basename, "Daily");
  });

  it("keeps a user template whose basename is not present in the workspace", () => {
    const result = resolve([ws("daily")], [user("meeting")]);
    assert.deepEqual(
      result.map((t) => t.basename),
      ["daily", "meeting"]
    );
  });

  it("returns user-only templates when there are no workspace templates", () => {
    const result = resolve([], [user("a"), user("b")]);
    assert.deepEqual(
      result.map((t) => t.source),
      ["user", "user"]
    );
  });

  it("returns an empty list when both roots are empty", () => {
    assert.deepEqual(resolve([], []), []);
  });
});

describe("resolve — multi-root (first-root-wins)", () => {
  it("prefers the lower workspaceFolderIndex on a workspace collision", () => {
    const root0 = ws("daily", { workspaceFolderIndex: 0, path: "a/daily.md" });
    const root1 = ws("daily", { workspaceFolderIndex: 1, path: "b/daily.md" });
    // Provide them out of order to prove ordering is by index, not input order.
    const result = resolve([root1, root0], []);
    assert.equal(result.length, 1);
    assert.equal(result[0].path, "a/daily.md");
  });
});

describe("resolve — ordering", () => {
  it("sorts by display name case-insensitively", () => {
    const result = resolve([ws("Zebra"), ws("apple"), ws("Mango")], []);
    assert.deepEqual(
      result.map((t) => t.basename),
      ["apple", "Mango", "Zebra"]
    );
  });

  it("merges and sorts across both roots", () => {
    const result = resolve([ws("beta")], [user("alpha"), user("gamma")]);
    assert.deepEqual(
      result.map((t) => t.basename),
      ["alpha", "beta", "gamma"]
    );
  });
});

describe("filterByKind", () => {
  it("keeps only file templates", () => {
    const result = filterByKind(
      [ws("a"), ws("b", { kind: "snippet" }), ws("c")],
      "file"
    );
    assert.deepEqual(
      result.map((t) => t.basename),
      ["a", "c"]
    );
  });

  it("keeps only snippet templates", () => {
    const result = filterByKind(
      [ws("a"), ws("b", { kind: "snippet" })],
      "snippet"
    );
    assert.deepEqual(
      result.map((t) => t.basename),
      ["b"]
    );
  });
});
