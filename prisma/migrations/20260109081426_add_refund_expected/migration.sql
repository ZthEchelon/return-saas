-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN     "billLeadDays" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "primaryEmail" TEXT,
ADD COLUMN     "returnLeadDays" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "subLeadDays" INTEGER NOT NULL DEFAULT 3;

-- CreateTable
CREATE TABLE "ReceiptDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailTransactionId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceiptDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReceiptDocument_userId_emailTransactionId_idx" ON "ReceiptDocument"("userId", "emailTransactionId");

-- CreateIndex
CREATE INDEX "SubscriptionPayment_userId_subscriptionId_paidAt_idx" ON "SubscriptionPayment"("userId", "subscriptionId", "paidAt");

-- AddForeignKey
ALTER TABLE "ReceiptDocument" ADD CONSTRAINT "ReceiptDocument_emailTransactionId_fkey" FOREIGN KEY ("emailTransactionId") REFERENCES "EmailTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
