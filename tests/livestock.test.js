import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidPhotoType, isValidPhotoSize, buildSparkMessages, buildWonderMessages, parseWonderResult } from "../lib/livestock.js";

test("animal photo type must be image", () => {
  assert.equal(isValidPhotoType("image/jpeg"), true);
  assert.equal(isValidPhotoType("text/plain"), false);
});

test("animal photo size limit is 4 MB", () => {
  assert.equal(isValidPhotoSize(1000), true);
  assert.equal(isValidPhotoSize(5 * 1024 * 1024), false);
});

test("animal spark message holds the photo", () => {
  const msgs = buildSparkMessages("data:image/jpeg;base64,abc", "Goat");
  assert.equal(msgs[1].content[1].image_url.url, "data:image/jpeg;base64,abc");
});

test("animal wonder answer is parsed", () => {
  const r = parseWonderResult('{"cause":"Worms","firstAid":"Give clean water","callVet":"If weak 2 days","confidence":"high"}');
  assert.equal(r.cause, "Worms");
  assert.equal(r.confidence, "high");
});