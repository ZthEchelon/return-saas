/*
  Warnings:

  - A unique constraint covering the columns `[userId,primaryMessageId]` on the table `AutomationSuggestion` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ReceiptUploadStatus" AS ENUM ('PARSED', 'NEEDS_REVIEW', 'FAILED');

-- AlterEnum
ALTER TYPE "EmailProvider" ADD VALUE 'UPLOAD';

-- AlterTable
ALTER TABLE "AutomationSuggestion" ADD COLUMN     "primaryMessageId" TEXT;

-- CreateTable
CREATE TABLE "ReceiptUpload" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "status" "ReceiptUploadStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "extracted" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReceiptUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "EmailProvider" NOT NULL DEFAULT 'GMAIL',
    "messageId" TEXT NOT NULL,
    "merchant" TEXT NOT NULL,
    "fromEmail" TEXT,
    "subject" TEXT,
    "purchasedAt" TIMESTAMP(3),
    "orderId" TEXT,
    "totalCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "items" JSONB,
    "rawSource" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReceiptUpload_userId_createdAt_idx" ON "ReceiptUpload"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailTransaction_userId_merchant_idx" ON "EmailTransaction"("userId", "merchant");

-- CreateIndex
CREATE INDEX "EmailTransaction_userId_purchasedAt_idx" ON "EmailTransaction"("userId", "purchasedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTransaction_provider_messageId_key" ON "EmailTransaction"("provider", "messageId");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationSuggestion_userId_primaryMessageId_key" ON "AutomationSuggestion"("userId", "primaryMessageId");
