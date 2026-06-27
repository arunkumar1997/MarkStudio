// Unit tests for the pure document-statistics function (T-2.4, Phase 2 M2.4).
//
// `src/status/wordCount.ts` has no `vscode` or DOM dependency, so it runs
// directly under Node's built-in runner with no mock needed (ADR-0011).

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { computeDocumentStats } from "../../src/status/wordCount";

describe("computeDocumentStats — word counting", () => {
  it("reports zero for empty and whitespace-only text", () => {
    assert.equal(computeDocumentStats("").words, 0);
    assert.equal(computeDocumentStats("   \n\t  ").words, 0);
  });

  it("counts space-separated words", () => {
    assert.equal(computeDocumentStats("one two three").words, 3);
  });

  it("counts words across newlines and multiple spaces", () => {
    assert.equal(computeDocumentStats("one  two\nthree\n\nfour").words, 4);
  });

  it("treats contractions and hyphenated words as one word each", () => {
    assert.equal(computeDocumentStats("don't well-known up-to-date").words, 3);
  });

  it("does not count Markdown punctuation as words", () => {
    // Heading marker, emphasis markers, list bullet, and link brackets must
    // not inflate the count — only the real words are counted.
    assert.equal(computeDocumentStats("# Title").words, 1);
    assert.equal(computeDocumentStats("**bold** and *italic*").words, 3);
    assert.equal(computeDocumentStats("- [a link](http://x)").words, 4);
  });

  it("counts numbers as words", () => {
    assert.equal(computeDocumentStats("version 2 point 0").words, 4);
  });
});

describe("computeDocumentStats — characters", () => {
  it("reports the full string length including whitespace", () => {
    assert.equal(computeDocumentStats("ab cd").characters, 5);
    assert.equal(computeDocumentStats("").characters, 0);
  });
});

describe("computeDocumentStats — reading time", () => {
  it("is zero when there are no words", () => {
    assert.equal(computeDocumentStats("").readingMinutes, 0);
  });

  it("rounds up to at least one minute for any prose", () => {
    assert.equal(computeDocumentStats("a few short words").readingMinutes, 1);
  });

  it("scales with length at ~200 words per minute", () => {
    const text = Array.from({ length: 450 }, () => "word").join(" ");
    // 450 / 200 = 2.25 -> ceil -> 3 minutes.
    assert.equal(computeDocumentStats(text).readingMinutes, 3);
  });
});
