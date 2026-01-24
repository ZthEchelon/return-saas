-- CreateEnum
CREATE TYPE "PurchaseSource" AS ENUM ('GMAIL', 'UPLOAD', 'MANUAL');

-- AlterTable (guarded: RefundCase may not exist on older bases)
DO $$
BEGIN
    IF to_regclass('"RefundCase"') IS NOT NULL THEN
        ALTER TABLE "RefundCase" ALTER COLUMN "updatedAt" DROP DEFAULT;
    END IF;
END $$;

-- AlterTable
ALTER TABLE "ReturnItem" ADD COLUMN     "purchaseId" TEXT;

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "merchant" TEXT NOT NULL,
    "totalCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "purchasedAt" TIMESTAMP(3) NOT NULL,
    "orderNumber" TEXT,
    "paymentMethod" TEXT,
    "source" "PurchaseSource" NOT NULL DEFAULT 'GMAIL',
    "sourceEmailId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "qty" INTEGER,
    "priceCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'CAD',

    CONSTRAINT "PurchaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseAttachment" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mime" TEXT,
    "sha256" TEXT,
    "sourceEmailId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Purchase_userId_purchasedAt_idx" ON "Purchase"("userId", "purchasedAt");

-- CreateIndex
CREATE INDEX "Purchase_userId_merchant_idx" ON "Purchase"("userId", "merchant");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_userId_sourceEmailId_key" ON "Purchase"("userId", "sourceEmailId");

-- CreateIndex
CREATE INDEX "PurchaseItem_purchaseId_idx" ON "PurchaseItem"("purchaseId");

-- CreateIndex
CREATE INDEX "PurchaseAttachment_purchaseId_idx" ON "PurchaseAttachment"("purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseAttachment_purchaseId_storageKey_key" ON "PurchaseAttachment"("purchaseId", "storageKey");

-- AddForeignKey
ALTER TABLE "ReturnItem" ADD CONSTRAINT "ReturnItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseItem" ADD CONSTRAINT "PurchaseItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseAttachment" ADD CONSTRAINT "PurchaseAttachment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
