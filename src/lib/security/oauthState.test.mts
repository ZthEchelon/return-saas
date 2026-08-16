import test from "node:test";
import assert from "node:assert/strict";

import { generateOAuthState, isValidOAuthState } from "./oauthState.ts";

test("rejects when the cookie value is missing", () => {
  assert.equal(isValidOAuthState(null, "abc"), false);
  assert.equal(isValidOAuthState(undefined, "abc"), false);
});

test("rejects when the query value is missing", () => {
  assert.equal(isValidOAuthState("abc", null), false);
  assert.equal(isValidOAuthState("abc", undefined), false);
});

test("rejects when both values are missing", () => {
  assert.equal(isValidOAuthState(null, null), false);
});

test("rejects when the values differ", () => {
  assert.equal(isValidOAuthState("abc", "xyz"), false);
});

test("rejects a near-miss (prefix of the real value)", () => {
  assert.equal(isValidOAuthState("abcdef", "abc"), false);
});

test("accepts when the cookie and query values match exactly", () => {
  assert.equal(isValidOAuthState("matching-nonce", "matching-nonce"), true);
});

test("generateOAuthState returns URL-safe, non-repeating nonces", () => {
  const a = generateOAuthState();
  const b = generateOAuthState();

  assert.match(a, /^[A-Za-z0-9_-]+$/);
  assert.ok(a.length >= 32, `expected a reasonably long nonce, got length ${a.length}`);
  assert.notEqual(a, b);
});
