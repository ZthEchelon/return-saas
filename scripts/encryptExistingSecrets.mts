// One-time (and re-runnable) backfill: encrypts any EmailConnection credential
// still stored as plaintext.
//
//   npm run secrets:encrypt            # dry run - reports, writes nothing
//   npm run secrets:encrypt -- --apply # performs the migration
//
// Idempotent: rows already in envelope form are skipped, so re-running is a
// no-op and it is safe to run before and after a deploy.
//
// Self-contained on purpose - no "@/" aliases, no Next runtime - so it can be
// pointed at a production DATABASE_URL with `node` and nothing else.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import {
  SecretCryptoError,
  decryptSecret,
  encryptSecret,
  isEnvelope,
  type SecretField,
} from "../src/lib/security/secretCrypto.ts";

const FIELDS: SecretField[] = ["accessToken", "refreshToken", "imapPassword"];

const apply = process.argv.includes("--apply");

function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

async function main() {
  if (!process.env.DATABASE_URL) fail("DATABASE_URL is not set.");

  // Prove the key is usable before touching a single row, so a misconfigured
  // run aborts cleanly instead of stopping halfway through the table.
  try {
    const probe = encryptSecret("preflight", { userId: "preflight", field: "accessToken" });
    if (decryptSecret(probe, { userId: "preflight", field: "accessToken" }) !== "preflight") {
      fail("Encryption preflight did not round-trip. Refusing to migrate.");
    }
  } catch (err) {
    const detail = err instanceof SecretCryptoError ? `${err.code}: ${err.message}` : String(err);
    fail(`Encryption key is not usable (${detail})`);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool), log: ["error"] });

  const rows = await prisma.emailConnection.findMany({
    select: { id: true, userId: true, accessToken: true, refreshToken: true, imapPassword: true },
  });

  const stats = { rows: rows.length, alreadyEncrypted: 0, encrypted: 0, empty: 0, rowsChanged: 0, failed: 0 };

  for (const row of rows) {
    const updates: Partial<Record<SecretField, string>> = {};

    for (const field of FIELDS) {
      const value = row[field];
      if (typeof value !== "string" || value.length === 0) {
        stats.empty++;
        continue;
      }
      if (isEnvelope(value)) {
        stats.alreadyEncrypted++;
        continue;
      }
      updates[field] = encryptSecret(value, { userId: row.userId, field });
      stats.encrypted++;
    }

    const changed = Object.keys(updates) as SecretField[];
    if (changed.length === 0) continue;
    stats.rowsChanged++;

    console.log(
      `${apply ? "encrypting" : "would encrypt"} ${changed.join(", ")} for user ${row.userId}`
    );
    if (!apply) continue;

    await prisma.emailConnection.update({ where: { id: row.id }, data: updates });

    // Read back and decrypt: confirms the row is recoverable before we move on.
    const after = await prisma.emailConnection.findUniqueOrThrow({
      where: { id: row.id },
      select: { accessToken: true, refreshToken: true, imapPassword: true },
    });
    for (const field of changed) {
      const stored = after[field];
      if (typeof stored !== "string" || decryptSecret(stored, { userId: row.userId, field }) !== (row[field] as string)) {
        stats.failed++;
        console.error(`  ✖ verification FAILED for ${field} on user ${row.userId}`);
      }
    }
  }

  await prisma.$disconnect();
  await pool.end();

  console.log("\n--- summary ---");
  console.log(`connections scanned      : ${stats.rows}`);
  console.log(`columns already encrypted: ${stats.alreadyEncrypted}`);
  console.log(`columns empty            : ${stats.empty}`);
  console.log(`columns ${apply ? "encrypted       " : "needing encryption"}: ${stats.encrypted}`);
  console.log(`rows ${apply ? "updated             " : "that would change  "}: ${stats.rowsChanged}`);

  if (stats.failed > 0) fail(`${stats.failed} column(s) failed verification. Investigate before deploying.`);
  if (!apply && stats.encrypted > 0) {
    console.log("\nDry run only. Re-run with --apply to write these changes.");
  } else if (!apply) {
    console.log("\nNothing to do - no plaintext credentials found.");
  } else {
    console.log("\n✔ Migration complete and verified.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
