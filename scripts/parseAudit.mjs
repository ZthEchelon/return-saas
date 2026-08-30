import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["error", "warn"] });

function pct(num, den) {
  if (!den) return "0%";
  return `${((num / den) * 100).toFixed(1)}%`;
}

async function main() {
  const days = Number(process.argv[2] ?? 90);
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (Number.isFinite(days) ? days : 90));

  const [receiptUploads, emailTransactions] = await Promise.all([
    prisma.receiptUpload.findMany({
      where: { createdAt: { gte: since } },
      select: { status: true },
    }),
    prisma.emailTransaction.findMany({
      where: { createdAt: { gte: since }, provider: "GMAIL" },
      select: { parserError: true, merchant: true },
    }),
  ]);

  const receiptsTotal = receiptUploads.length;
  const receiptsSuccess = receiptUploads.filter(r => r.status !== "FAILED").length;

  const emailsTotal = emailTransactions.length;
  const emailsSuccess = emailTransactions.filter(t => !t.parserError && t.merchant !== "Parse Failed").length;

  const total = receiptsTotal + emailsTotal;
  const totalSuccess = receiptsSuccess + emailsSuccess;

  console.log("Parse audit (last %s days)", days);
  console.log("Receipts (PDF/uploads):", receiptsSuccess, "/", receiptsTotal, "=", pct(receiptsSuccess, receiptsTotal));
  console.log("Email HTML receipts:", emailsSuccess, "/", emailsTotal, "=", pct(emailsSuccess, emailsTotal));
  console.log("Combined:", totalSuccess, "/", total, "=", pct(totalSuccess, total));
}

main()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
