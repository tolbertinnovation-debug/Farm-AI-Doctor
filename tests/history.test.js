import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanHistorySearch, isValidHistoryKind, isValidHistoryDate, filterChecks } from "../lib/history.js";

test("search is cleaned", () => {
  assert.equal(cleanHistorySearch("  cassava   leaf  "), "cassava leaf");
});

test("kind check", () => {
  assert.equal(isValidHistoryKind("crop"), true);
  assert.equal(isValidHistoryKind("livestock"), true);
  assert.equal(isValidHistoryKind("chat"), true);
  assert.equal(isValidHistoryKind("other"), false);
});

test("date check needs YYYY-MM-DD", () => {
  assert.equal(isValidHistoryDate("2026-11-02"), true);
  assert.equal(isValidHistoryDate("02-11-2026"), false);
  assert.equal(isValidHistoryDate("2026-13-01"), false);
});

test("filter by word, type and date", () => {
  const list = [
    { id: 1, kind: "crop", title: "Cassava - Leaf blight", summary: "Remove leaves", created_at: "2026-11-02" },
    { id: 2, kind: "livestock", title: "Goat - Worms", summary: "Call vet", created_at: "2026-11-03" }
  ];
  assert.equal(filterChecks(list, { q: "cassava" }).length, 1);
  assert.equal(filterChecks(list, { kind: "livestock" })[0].id, 2);
  assert.equal(filterChecks(list, { date: "2026-11-03" })[0].id, 2);
});