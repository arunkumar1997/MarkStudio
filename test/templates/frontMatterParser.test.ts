// Unit tests for the pure template front-matter parser (M5.1, ADR-0025).
//
// `parseFrontMatter` imports nothing from `vscode` or the DOM, so it runs
// directly under the Node test runner.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { parseFrontMatter } from "../../src/templates/frontMatterParser";

describe("parseFrontMatter — no front-matter", () => {
  it("returns meta null and the whole text as body when there is no fence", () => {
    const text = "# Just a note\n\nNo front matter here.";
    assert.deepEqual(parseFrontMatter(text), { meta: null, body: text });
  });

  it("returns meta null when the opening fence is not on the first line", () => {
    const text = "\n---\nkind: file\n---\nbody";
    assert.deepEqual(parseFrontMatter(text), { meta: null, body: text });
  });

  it("returns meta null when the closing fence is missing", () => {
    const text = "---\nkind: file\noutput: x.md\nbody with no close";
    assert.deepEqual(parseFrontMatter(text), { meta: null, body: text });
  });

  it("returns meta null for an empty string", () => {
    assert.deepEqual(parseFrontMatter(""), { meta: null, body: "" });
  });
});

describe("parseFrontMatter — fixed schema", () => {
  it("parses kind, description, output, and cursor", () => {
    const text =
      "---\nkind: file\ndescription: A daily note\noutput: daily/{{date}}.md\ncursor: 5\n---\n# Body";
    const { meta, body } = parseFrontMatter(text);
    assert.ok(meta);
    assert.equal(meta.kind, "file");
    assert.equal(meta.description, "A daily note");
    assert.equal(meta.output, "daily/{{date}}.md");
    assert.equal(meta.cursor, 5);
    assert.deepEqual(meta.extras, {});
    assert.equal(body, "# Body");
  });

  it("defaults kind to file when absent", () => {
    const { meta } = parseFrontMatter("---\noutput: x.md\n---\nbody");
    assert.ok(meta);
    assert.equal(meta.kind, "file");
  });

  it("recognises kind: snippet", () => {
    const { meta } = parseFrontMatter("---\nkind: snippet\n---\nbody");
    assert.ok(meta);
    assert.equal(meta.kind, "snippet");
  });

  it("falls back to file for an unknown kind value", () => {
    const { meta } = parseFrontMatter("---\nkind: nonsense\n---\nbody");
    assert.ok(meta);
    assert.equal(meta.kind, "file");
  });

  it("omits cursor when the value is not a non-negative integer", () => {
    const { meta } = parseFrontMatter("---\ncursor: abc\n---\nbody");
    assert.ok(meta);
    assert.equal(meta.cursor, undefined);
  });

  it("keeps unknown keys in extras", () => {
    const { meta } = parseFrontMatter(
      "---\nkind: file\ntags: a, b\nauthor: me\n---\nbody"
    );
    assert.ok(meta);
    assert.deepEqual(meta.extras, { tags: "a, b", author: "me" });
  });
});

describe("parseFrontMatter — value handling", () => {
  it("strips a pair of surrounding double quotes", () => {
    const { meta } = parseFrontMatter('---\ndescription: "quoted"\n---\nbody');
    assert.ok(meta);
    assert.equal(meta.description, "quoted");
  });

  it("strips a pair of surrounding single quotes", () => {
    const { meta } = parseFrontMatter("---\ndescription: 'quoted'\n---\nbody");
    assert.ok(meta);
    assert.equal(meta.description, "quoted");
  });

  it("removes an unquoted trailing comment", () => {
    const { meta } = parseFrontMatter(
      "---\noutput: x.md # the target\n---\nbody"
    );
    assert.ok(meta);
    assert.equal(meta.output, "x.md");
  });

  it("keeps a # that is part of a quoted value", () => {
    const { meta } = parseFrontMatter('---\ndescription: "a # b"\n---\nbody');
    assert.ok(meta);
    assert.equal(meta.description, "a # b");
  });

  it("skips blank lines and comment lines inside the block", () => {
    const { meta } = parseFrontMatter(
      "---\n# a comment\n\nkind: file\n---\nbody"
    );
    assert.ok(meta);
    assert.equal(meta.kind, "file");
  });

  it("skips a line with no colon", () => {
    const { meta } = parseFrontMatter("---\nnot a pair\nkind: file\n---\nbody");
    assert.ok(meta);
    assert.deepEqual(meta.extras, {});
  });
});

describe("parseFrontMatter — body extraction", () => {
  it("removes exactly one leading blank line after the block", () => {
    const { body } = parseFrontMatter("---\nkind: file\n---\n\n# Heading");
    assert.equal(body, "# Heading");
  });

  it("keeps a second leading blank line", () => {
    const { body } = parseFrontMatter("---\nkind: file\n---\n\n\n# Heading");
    assert.equal(body, "\n# Heading");
  });

  it("returns an empty body when there is nothing after the block", () => {
    const { body } = parseFrontMatter("---\nkind: file\n---\n");
    assert.equal(body, "");
  });
});
