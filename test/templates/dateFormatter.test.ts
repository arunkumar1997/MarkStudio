// Unit tests for the pure date formatter (M5.1, ADR-0025).
//
// Tests pass a fixed `Date` and an explicit IANA timezone so they are
// independent of the machine's local timezone.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { format } from "../../src/templates/dateFormatter";

// 2026-03-07T09:04 UTC. In UTC: year 2026, month 03, day 07, hour 09, min 04.
const FIXED = new Date(Date.UTC(2026, 2, 7, 9, 4, 0));
const UTC = "UTC";

describe("dateFormatter — token coverage", () => {
  it("formats YYYY-MM-DD", () => {
    assert.equal(format(FIXED, "YYYY-MM-DD", UTC), "2026-03-07");
  });

  it("formats YYYY/MM/DD HH:mm", () => {
    assert.equal(format(FIXED, "YYYY/MM/DD HH:mm", UTC), "2026/03/07 09:04");
  });

  it("formats each token individually", () => {
    assert.equal(format(FIXED, "YYYY", UTC), "2026");
    assert.equal(format(FIXED, "MM", UTC), "03");
    assert.equal(format(FIXED, "DD", UTC), "07");
    assert.equal(format(FIXED, "HH", UTC), "09");
    assert.equal(format(FIXED, "mm", UTC), "04");
  });

  it("zero-pads single-digit month, day, hour, and minute", () => {
    assert.equal(format(FIXED, "MM-DD HH:mm", UTC), "03-07 09:04");
  });
});

describe("dateFormatter — verbatim passthrough", () => {
  it("emits unsupported characters verbatim", () => {
    assert.equal(format(FIXED, "Year YYYY!", UTC), "Year 2026!");
  });

  it("returns a pattern with no tokens unchanged", () => {
    assert.equal(format(FIXED, "no tokens here", UTC), "no tokens here");
  });

  it("does not treat a lone Y or M as a token", () => {
    assert.equal(format(FIXED, "Y-M-D", UTC), "Y-M-D");
  });
});

describe("dateFormatter — timezone handling", () => {
  it("shifts the calendar day across a timezone boundary", () => {
    // 23:30 UTC on the 7th is 08:30 on the 8th in Tokyo (UTC+9).
    const lateUtc = new Date(Date.UTC(2026, 2, 7, 23, 30, 0));
    assert.equal(
      format(lateUtc, "YYYY-MM-DD HH:mm", "Asia/Tokyo"),
      "2026-03-08 08:30"
    );
  });

  it("renders midnight as 00, not 24", () => {
    const midnight = new Date(Date.UTC(2026, 2, 7, 0, 0, 0));
    assert.equal(format(midnight, "HH:mm", UTC), "00:00");
  });
});
