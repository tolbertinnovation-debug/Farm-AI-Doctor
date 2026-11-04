import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidPhotoType, isValidPhotoSize, buildSparkMessages, buildWonderMessages, parseWonderResult } from "../lib/cropdoctor.js";

test("photo type must be image", () => {
  assert.equal(isValidPhotoType("image/jpeg"), true);
  assert.equal(isValidPhotoType("text/plain"), false);
});

test("photo size limit is 4 MB", () => {
  assert.equal(isValidPhotoSize(1000), true);
  assert.equal(isValidPhotoSize(0), false);
  assert.equal(isValidPhotoSize(5 * 1024 * 1024), false);
});

test("spark message holds the photo", () => {
  const msgs = buildSparkMessages("data:image/jpeg;base64,abc", "Cassava");
  assert.equal(msgs[1].content[1].image_url.url, "data:image/jpeg;base64,abc");
});

test("wonder message holds the description", () => {
  const msgs = buildWonderMessages("yellow spots", "Cassava");
  assert.match(msgs[1].content, /yellow spots/);
});

test("wonder answer is parsed", () => {
  const r = parseWonderResult('{"disease":"Leaf blight","treatment":"Remove sick leaves","confidence":"high"}');
  assert.equal(r.disease, "Leaf blight");
  assert.equal(r.confidence, "high");
});