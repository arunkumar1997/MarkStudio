// Unit tests for the pure variable expander (M5.1, ADR-0025).

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  expand,
  findCursorMarker,
  slugify,
  type ExpandContext
} from "../../src/templates/variableExpander";

const FIXED = new Date(Date.UTC(2026, 2, 7, 9, 4, 0));

function ctx(overrides: Partial<ExpandContext> = {}): ExpandContext {
  return {
    now: FIXED,
    dateFormat: "YYYY-MM-DD",
    tz: "UTC",
    title: "My Note",
    filename: "my-note",
    workspaceName: "MyVault",
    clipboard: "pasted text",
    ...overrides
  };
}

describe("expand — curly tokens", () => {
  it("expands {{date}} with the context date format", () => {
    assert.equal(expand("Today is {{date}}.", ctx()), "Today is 2026-03-07.");
  });

  it("expands {{time}} and {{datetime}}", () => {
    assert.equal(expand("{{time}}", ctx()), "09:04");
    assert.equal(expand("{{datetime}}", ctx()), "2026-03-07 09:04");
  });

  it("expands {{title}}, {{slug}}, and {{filename}}", () => {
    assert.equal(
      expand("{{title}} / {{slug}} / {{filename}}", ctx()),
      "My Note / my-note / my-note"
    );
  });

  it("respects a custom dateFormat for {{date}}", () => {
    assert.equal(
      expand("{{date}}", ctx({ dateFormat: "YYYY/MM/DD" })),
      "2026/03/07"
    );
  });

  it("leaves an unknown {{token}} intact", () => {
    assert.equal(expand("{{unknown}}", ctx()), "{{unknown}}");
  });

  it("removes the {{cursor}} marker", () => {
    assert.equal(expand("a{{cursor}}b", ctx()), "ab");
  });
});

describe("expand — dollar tokens", () => {
  it("expands the $CURRENT_* date tokens", () => {
    assert.equal(
      expand("$CURRENT_YEAR-$CURRENT_MONTH-$CURRENT_DATE", ctx()),
      "2026-03-07"
    );
    assert.equal(expand("$CURRENT_HOUR:$CURRENT_MINUTE", ctx()), "09:04");
  });

  it("expands $TM_FILENAME and $TM_FILENAME_BASE", () => {
    assert.equal(expand("$TM_FILENAME", ctx()), "my-note.md");
    assert.equal(expand("$TM_FILENAME_BASE", ctx()), "my-note");
  });

  it("expands $WORKSPACE_NAME and $CLIPBOARD", () => {
    assert.equal(expand("$WORKSPACE_NAME", ctx()), "MyVault");
    assert.equal(expand("$CLIPBOARD", ctx()), "pasted text");
  });

  it("substitutes an empty string for an empty clipboard", () => {
    assert.equal(expand("[$CLIPBOARD]", ctx({ clipboard: "" })), "[]");
  });

  it("leaves an unknown $TOKEN intact", () => {
    assert.equal(expand("$UNKNOWN_THING", ctx()), "$UNKNOWN_THING");
  });
});

describe("expand — snippet placeholders pass through", () => {
  it("leaves ${1}, ${1:default}, and ${0} untouched", () => {
    const template = "Start ${1:name} middle ${2} end ${0}";
    assert.equal(expand(template, ctx()), template);
  });

  it("does not confuse ${...} with a $TOKEN", () => {
    assert.equal(expand("${CURRENT_YEAR}", ctx()), "${CURRENT_YEAR}");
  });
});

describe("findCursorMarker", () => {
  it("returns the 0-based line of the {{cursor}} marker", () => {
    assert.equal(findCursorMarker("line0\nline1 {{cursor}}\nline2"), 1);
  });

  it("returns 0 when the marker is on the first line", () => {
    assert.equal(findCursorMarker("{{cursor}} here"), 0);
  });

  it("returns null when there is no marker", () => {
    assert.equal(findCursorMarker("no marker here"), null);
  });
});

describe("slugify", () => {
  it("kebab-cases a title", () => {
    assert.equal(slugify("My Great Note!"), "my-great-note");
  });

  it("collapses runs of non-alphanumeric characters", () => {
    assert.equal(slugify("a -- b __ c"), "a-b-c");
  });

  it("trims leading and trailing separators", () => {
    assert.equal(slugify("  !Hello!  "), "hello");
  });

  it("returns an empty string for a title with no alphanumerics", () => {
    assert.equal(slugify("!!!"), "");
  });
});
