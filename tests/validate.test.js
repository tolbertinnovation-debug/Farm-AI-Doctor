import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeEmail, isValidEmail, isValidPassword, isValidSignupRole, cleanText, isValidCropName, isValidAnimalType, isValidAnimalCount } from "../lib/validate.js";

test("email is cleaned", () => {
  assert.equal(normalizeEmail("  Ama@Gmail.COM "), "ama@gmail.com");
});

test("bad emails fail", () => {
  assert.equal(isValidEmail("ama"), false);
  assert.equal(isValidEmail("ama@gmail.com"), true);
});

test("password needs 6 letters", () => {
  assert.equal(isValidPassword("12345"), false);
  assert.equal(isValidPassword("123456"), true);
});

test("role is farmer or expert", () => {
  assert.equal(isValidSignupRole("farmer"), true);
  assert.equal(isValidSignupRole("admin"), false);
});

test("crop and animal names", () => {
  assert.equal(isValidCropName("C"), false);
  assert.equal(isValidCropName("Cassava"), true);
  assert.equal(isValidAnimalType("G"), false);
  assert.equal(isValidAnimalType("Goat"), true);
});

test("animal count is a whole number", () => {
  assert.equal(isValidAnimalCount("5"), true);
  assert.equal(isValidAnimalCount("0"), false);
  assert.equal(isValidAnimalCount(2.5), false);
});

test("text is trimmed", () => {
  assert.equal(cleanText("  hello   world  ", 20), "hello world");
});