-- CreateEnum
CREATE TYPE "ScanMode" AS ENUM ('ALL', 'RECEIPTS_ONLY', 'SHIPPING_ONLY', 'SUBSCRIPTIONS_ONLY');

-- CreateEnum
CREATE TYPE "DataDeletionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "EmailConnection" ADD COLUMN     "lastScanAt" TIMESTAMP(3),
ADD COLUMN     "scanMode" "ScanMode" NOT NULL DEFAULT 'ALL',
ADD COLUMN     "scopes" TEXT;

-- AlterTable (guarded: RefundCase is created by a later-timestamped migration,
-- so it does not exist yet when rebuilding from an empty database)
DO $$
BEGIN
    IF to_regclass('"RefundCase"') IS NOT NULL THEN
        ALTER TABLE "RefundCase" ALTER COLUMN "updatedAt" DROP DEFAULT;
    END IF;
END $$;

-- CreateTable
CREATE TABLE "DataDeletionJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "DataDeletionStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "DataDeletionJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataDeletionJob_userId_status_idx" ON "DataDeletionJob"("userId", "status");
