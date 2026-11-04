import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidDocName, cleanDocText, buildAssistantMessages, MAX_DOC_CHARS } from "../lib/assistant.js";

test("doc name must be txt md or csv", () => {
  assert.equal(isValidDocName("notes.txt"), true);
  assert.equal(isValidDocName("paper.pdf"), false);
});

test("doc text is cut to limit", () => {
  const long = "a".repeat(MAX_DOC_CHARS + 100);
  assert.equal(cleanDocText(long).length, MAX_DOC_CHARS);
});

test("chat message holds paper and last question", () => {
  const msgs = buildAssistantMessages([{ role: "user", content: "yellow leaves?" }], "my paper text");
  assert.match(JSON.stringify(msgs), /my paper text/);
  assert.match(JSON.stringify(msgs), /yellow leaves/);
});

test("only last 10 messages are kept", () => {
  const h = [];
  for (let i = 0; i < 15; i++) h.push({ role: "user", content: "q" + i });
  const msgs = buildAssistantMessages(h, "");
  assert.equal(msgs.filter((m) => m.role === "user").length, 10);
});