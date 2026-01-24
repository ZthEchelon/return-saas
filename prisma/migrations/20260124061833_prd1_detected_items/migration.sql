-- CreateEnum
CREATE TYPE "DetectedItemType" AS ENUM ('TRIAL', 'RENEWAL', 'BILL');

-- CreateEnum
CREATE TYPE "DetectedItemStatus" AS ENUM ('NEW', 'CONFIRMED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "RuleType" AS ENUM ('RENEWAL_REMINDER');

-- AlterTable (guarded: RefundCase may not exist on older bases)
DO $$
BEGIN
    IF to_regclass('"RefundCase"') IS NOT NULL THEN
        ALTER TABLE "RefundCase" ALTER COLUMN "updatedAt" DROP DEFAULT;
    END IF;
END $$;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "cancelInstructions" TEXT,
ADD COLUMN     "merchantCanonicalId" TEXT,
ADD COLUMN     "renewalAt" TIMESTAMP(3),
ADD COLUMN     "renewalCadence" "SubscriptionCadence",
ADD COLUMN     "trialEndAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DetectedItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "DetectedItemType" NOT NULL,
    "merchant" TEXT NOT NULL,
    "amountCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "date" TIMESTAMP(3) NOT NULL,
    "confidence" TEXT NOT NULL,
    "sourceEmailId" TEXT,
    "rawSnippetHash" TEXT NOT NULL,
    "status" "DetectedItemStatus" NOT NULL DEFAULT 'NEW',
    "subscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetectedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleType" "RuleType" NOT NULL,
    "daysBefore" INTEGER NOT NULL,
    "channels" "NotificationChannel"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DetectedItem_userId_status_idx" ON "DetectedItem"("userId", "status");

-- CreateIndex
CREATE INDEX "DetectedItem_userId_date_idx" ON "DetectedItem"("userId", "date");

-- CreateIndex
CREATE INDEX "DetectedItem_userId_merchant_idx" ON "DetectedItem"("userId", "merchant");

-- CreateIndex
CREATE INDEX "UserRule_userId_ruleType_idx" ON "UserRule"("userId", "ruleType");

-- AddForeignKey
ALTER TABLE "DetectedItem" ADD CONSTRAINT "DetectedItem_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
