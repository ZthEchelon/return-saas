import test from "node:test";
import assert from "node:assert/strict";

import { isAuthorizedCronRequest } from "./cronAuth.ts";

const SECRET = "s3cret-cron-value";

function reqWith(headers: Record<string, string>) {
  const lower = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { headers: { get: (name: string) => lower.get(name.toLowerCase()) ?? null } };
}

function withSecret<T>(value: string | undefined, fn: () => T): T {
  const saved = process.env.CRON_SECRET;
  if (value === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = value;
  try {
    return fn();
  } finally {
    if (saved === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = saved;
  }
}

test("denies every request when CRON_SECRET is unset (fails closed)", () => {
  withSecret(undefined, () => {
    assert.equal(isAuthorizedCronRequest(reqWith({})), false);
    assert.equal(isAuthorizedCronRequest(reqWith({ "x-cron-secret": "anything" })), false);
  });
});

test("denies when CRON_SECRET is set to an empty or blank value", () => {
  withSecret("   ", () => {
    assert.equal(isAuthorizedCronRequest(reqWith({ "x-cron-secret": "   " })), false);
  });
});

test("accepts the x-cron-secret header used by external schedulers", () => {
  withSecret(SECRET, () => {
    assert.equal(isAuthorizedCronRequest(reqWith({ "x-cron-secret": SECRET })), true);
  });
});

test("accepts the Authorization bearer header sent by Vercel Cron", () => {
  withSecret(SECRET, () => {
    assert.equal(isAuthorizedCronRequest(reqWith({ authorization: `Bearer ${SECRET}` })), true);
  });
});

test("denies a wrong secret, a missing header, and a near-miss", () => {
  withSecret(SECRET, () => {
    assert.equal(isAuthorizedCronRequest(reqWith({})), false);
    assert.equal(isAuthorizedCronRequest(reqWith({ "x-cron-secret": "wrong" })), false);
    assert.equal(isAuthorizedCronRequest(reqWith({ "x-cron-secret": SECRET + "x" })), false);
    assert.equal(isAuthorizedCronRequest(reqWith({ authorization: SECRET })), false);
  });
});
