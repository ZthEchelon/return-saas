-- CreateEnum
CREATE TYPE "ValueEventType" AS ENUM ('AVOIDED_RENEWAL', 'REFUND_RECEIVED', 'FEE_AVOIDED');

-- AlterTable
ALTER TABLE "BillingAccount" ADD COLUMN     "preferredCurrency" TEXT DEFAULT 'CAD';

-- AlterTable (guarded: RefundCase may not exist on older bases)
DO $$
BEGIN
    IF to_regclass('"RefundCase"') IS NOT NULL THEN
        ALTER TABLE "RefundCase" ALTER COLUMN "updatedAt" DROP DEFAULT;
    END IF;
END $$;

-- CreateTable
CREATE TABLE "FxRate" (
    "id" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL,
    "rate" DECIMAL(16,8) NOT NULL,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FxRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValueEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ValueEventType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "sourceId" TEXT,
    "isEstimated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValueEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FxRate_quoteCurrency_baseCurrency_asOfDate_idx" ON "FxRate"("quoteCurrency", "baseCurrency", "asOfDate");

-- CreateIndex
CREATE UNIQUE INDEX "FxRate_baseCurrency_quoteCurrency_asOfDate_key" ON "FxRate"("baseCurrency", "quoteCurrency", "asOfDate");

-- CreateIndex
CREATE INDEX "ValueEvent_userId_occurredAt_idx" ON "ValueEvent"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "ValueEvent_userId_type_idx" ON "ValueEvent"("userId", "type");
