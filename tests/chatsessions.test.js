import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanChatText, makeSessionTitle, isValidSessionId, buildAssistantMessages } from "../lib/chatsessions.js";

test("chat text is cleaned", () => {
  assert.equal(cleanChatText("  hello  ", 20), "hello");
  assert.equal(cleanChatText("", 20), "");
});

test("title from first message", () => {
  assert.equal(makeSessionTitle(""), "New chat");
  assert.equal(makeSessionTitle("How to plant cassava?"), "How to plant cassava?");
});

test("long title is cut", () => {
  const t = makeSessionTitle("a".repeat(100));
  assert.equal(t.length, 40);
});

test("session id check", () => {
  assert.equal(isValidSessionId("5"), true);
  assert.equal(isValidSessionId("abc"), false);
  assert.equal(isValidSessionId(0), false);
});

test("assistant messages hold history", () => {
  const msgs = buildAssistantMessages([{ role: "user", content: "hi" }], "help rice");
  assert.equal(msgs[0].role, "system");
  assert.match(msgs[msgs.length - 1].content, /help rice/);
});