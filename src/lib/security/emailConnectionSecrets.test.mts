import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

import { encryptSecret } from "./secretCrypto.ts";
import { encryptConnectionSecrets, readConnectionSecret } from "./emailConnectionSecrets.ts";

process.env.SECRET_ENC_ACTIVE_VERSION = "1";
process.env.SECRET_ENC_KEY_V1 = randomBytes(32).toString("base64");

const USER = "user_123";

test("encrypts every present secret and leaves the rest untouched", () => {
  const out = encryptConnectionSecrets(USER, {
    accessToken: "ya29.access",
    refreshToken: null,
    imapPassword: undefined,
  });

  assert.match(String(out.accessToken), /^encv1:1:/);
  assert.equal(out.refreshToken, null);
  assert.equal(out.imapPassword, undefined);
});

test("never stores a secret under the wrong column's binding", () => {
  const out = encryptConnectionSecrets(USER, { accessToken: "value", imapPassword: "value" });

  // Same plaintext, different columns -> neither ciphertext is valid in the other's slot.
  assert.equal(readConnectionSecret(USER, "accessToken", String(out.accessToken)), "value");
  assert.equal(readConnectionSecret(USER, "accessToken", String(out.imapPassword)), null);
});

test("reads back a secret written for the same user and column", () => {
  const stored = encryptSecret("s3cret", { userId: USER, field: "imapPassword" });
  assert.equal(readConnectionSecret(USER, "imapPassword", stored), "s3cret");
});

test("treats a null column as simply absent", () => {
  assert.equal(readConnectionSecret(USER, "refreshToken", null), null);
  assert.equal(readConnectionSecret(USER, "refreshToken", undefined), null);
  assert.equal(readConnectionSecret(USER, "refreshToken", ""), null);
});

test("treats un-migrated plaintext as absent rather than leaking it", () => {
  assert.equal(readConnectionSecret(USER, "refreshToken", "1//0gBarePlaintextToken"), null);
});

test("treats a tampered or foreign ciphertext as absent, not as a crash", () => {
  const foreign = encryptSecret("someone-elses", { userId: "user_other", field: "refreshToken" });
  assert.equal(readConnectionSecret(USER, "refreshToken", foreign), null);
});

test("escalates a missing encryption key instead of silently degrading", () => {
  const stored = encryptSecret("s3cret", { userId: USER, field: "accessToken" });
  const saved = process.env.SECRET_ENC_KEY_V1;
  delete process.env.SECRET_ENC_KEY_V1;
  try {
    // A misconfigured deployment must be loud: this is not "user has no token".
    assert.throws(() => readConnectionSecret(USER, "accessToken", stored), { code: "UNKNOWN_KEY_VERSION" });
  } finally {
    process.env.SECRET_ENC_KEY_V1 = saved;
  }
});
