import { test } from "node:test";
import assert from "node:assert/strict";
import { formatCheckDate } from "../lib/format.js";

test("formats date to YYYY-MM-DD", () => {
  assert.equal(formatCheckDate("2026-11-04T10:00:00.000Z"), "2026-11-04");
});

test("empty stays empty", () => {
  assert.equal(formatCheckDate(""), "");
  assert.equal(formatCheckDate(null), "");
});