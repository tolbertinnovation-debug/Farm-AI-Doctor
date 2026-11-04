import { test } from "node:test";
import assert from "node:assert/strict";
import { formatCheckDate } from "../lib/format.js";

test("date formats to string", () => {
  const s = formatCheckDate(new Date("2026-11-02T10:00:00Z"));
  assert.match(s, /2026-11-02/);
});

test("empty date gives empty string", () => {
  assert.equal(formatCheckDate(null), "");
});