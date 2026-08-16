import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

import { encryptSecret, decryptSecret, isEnvelope } from "./secretCrypto.ts";

const KEY_V1 = randomBytes(32).toString("base64");

function withKeys<T>(env: Record<string, string | undefined>, fn: () => T): T {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  for (const [k, v] of Object.entries(env)) if (v === undefined) delete process.env[k];
  try {
    return fn();
  } finally {
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  }
}

const activeKeyEnv = { SECRET_ENC_ACTIVE_VERSION: "1", SECRET_ENC_KEY_V1: KEY_V1 };
const ctx = { userId: "user_abc", field: "refreshToken" as const };

test("round-trips a secret through the envelope", () => {
  withKeys(activeKeyEnv, () => {
    const plaintext = "1//0gRefreshTokenValue-with-symbols_=";
    const envelope = encryptSecret(plaintext, ctx);

    assert.notEqual(envelope, plaintext);
    assert.equal(decryptSecret(envelope, ctx), plaintext);
  });
});

test("produces a different envelope each time (no IV reuse)", () => {
  withKeys(activeKeyEnv, () => {
    const a = encryptSecret("same-secret", ctx);
    const b = encryptSecret("same-secret", ctx);
    assert.notEqual(a, b);
  });
});

function tamperedPayload(envelope: string, byteIndex: number): string {
  const [prefix, version, payloadB64] = envelope.split(":");
  const payload = Buffer.from(payloadB64, "base64url");
  payload[byteIndex] ^= 0xff;
  return `${prefix}:${version}:${payload.toString("base64url")}`;
}

test("rejects a flipped ciphertext byte", () => {
  withKeys(activeKeyEnv, () => {
    const envelope = encryptSecret("secret-value-long-enough", ctx);
    // byte 28+ is ciphertext (12 IV + 16 tag)
    assert.throws(() => decryptSecret(tamperedPayload(envelope, 30), ctx), {
      code: "DECRYPT_FAILED",
    });
  });
});

test("rejects a flipped auth tag byte", () => {
  withKeys(activeKeyEnv, () => {
    const envelope = encryptSecret("secret-value-long-enough", ctx);
    assert.throws(() => decryptSecret(tamperedPayload(envelope, 15), ctx), {
      code: "DECRYPT_FAILED",
    });
  });
});

test("rejects a ciphertext replayed under a different userId", () => {
  withKeys(activeKeyEnv, () => {
    const envelope = encryptSecret("victim-refresh-token", { userId: "user_victim", field: "refreshToken" });
    assert.throws(() => decryptSecret(envelope, { userId: "user_attacker", field: "refreshToken" }), {
      code: "DECRYPT_FAILED",
    });
  });
});

test("rejects a ciphertext replayed into a different column", () => {
  withKeys(activeKeyEnv, () => {
    const envelope = encryptSecret("a-refresh-token", { userId: "user_abc", field: "refreshToken" });
    assert.throws(() => decryptSecret(envelope, { userId: "user_abc", field: "imapPassword" }), {
      code: "DECRYPT_FAILED",
    });
  });
});

test("refuses to encrypt when the active key is unset (fails closed)", () => {
  withKeys({ SECRET_ENC_ACTIVE_VERSION: "1", SECRET_ENC_KEY_V1: undefined }, () => {
    assert.throws(() => encryptSecret("anything", ctx), { code: "MISSING_KEY" });
  });
});

test("refuses to encrypt when the active version is unset (fails closed)", () => {
  withKeys({ SECRET_ENC_ACTIVE_VERSION: undefined, SECRET_ENC_KEY_V1: KEY_V1 }, () => {
    assert.throws(() => encryptSecret("anything", ctx), { code: "MISSING_KEY" });
  });
});

test("refuses to encrypt with a key that is not 32 bytes", () => {
  withKeys({ SECRET_ENC_ACTIVE_VERSION: "1", SECRET_ENC_KEY_V1: Buffer.alloc(16).toString("base64") }, () => {
    assert.throws(() => encryptSecret("anything", ctx), { code: "INVALID_KEY" });
  });
});

test("refuses to decrypt an envelope whose key version is not configured", () => {
  withKeys(activeKeyEnv, () => {
    const envelope = encryptSecret("value", ctx).replace("encv1:1:", "encv1:7:");
    assert.throws(() => decryptSecret(envelope, ctx), { code: "UNKNOWN_KEY_VERSION" });
  });
});

test("refuses to decrypt raw plaintext instead of returning it", () => {
  withKeys(activeKeyEnv, () => {
    assert.throws(() => decryptSecret("ya29.a0AfB_bare_plaintext_token", ctx), {
      code: "MALFORMED_ENVELOPE",
    });
  });
});

test("decrypts with a retired key version after the active version rotates", () => {
  const KEY_V2 = randomBytes(32).toString("base64");
  const envelope = withKeys(activeKeyEnv, () => encryptSecret("written-under-v1", ctx));

  withKeys({ SECRET_ENC_ACTIVE_VERSION: "2", SECRET_ENC_KEY_V1: KEY_V1, SECRET_ENC_KEY_V2: KEY_V2 }, () => {
    assert.equal(decryptSecret(envelope, ctx), "written-under-v1");
    assert.match(encryptSecret("written-now", ctx), /^encv1:2:/);
  });
});

test("isEnvelope distinguishes ciphertext from legacy plaintext", () => {
  withKeys(activeKeyEnv, () => {
    assert.equal(isEnvelope(encryptSecret("v", ctx)), true);
    assert.equal(isEnvelope("1//0gPlaintextRefreshToken"), false);
    assert.equal(isEnvelope(""), false);
    assert.equal(isEnvelope(null), false);
  });
});
