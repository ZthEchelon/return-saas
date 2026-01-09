-- CreateEnum
CREATE TYPE "EmailProvider" AS ENUM ('GMAIL');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('NEW', 'CONFIRMED', 'IGNORED');

-- CreateEnum
CREATE TYPE "SuggestionType" AS ENUM ('RETURN', 'SUBSCRIPTION', 'BILL');

-- CreateTable
CREATE TABLE "EmailConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "EmailProvider" NOT NULL DEFAULT 'GMAIL',
    "emailAddress" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiry" TIMESTAMP(3),
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "EmailProvider" NOT NULL DEFAULT 'GMAIL',
    "threadId" TEXT,
    "internalDate" TIMESTAMP(3),
    "fromEmail" TEXT,
    "subject" TEXT,
    "snippet" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationSuggestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "EmailProvider" NOT NULL DEFAULT 'GMAIL',
    "type" "SuggestionType" NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'NEW',
    "merchant" TEXT NOT NULL,
    "amountCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "detectedDate" TIMESTAMP(3) NOT NULL,
    "confidence" TEXT NOT NULL,
    "reasons" JSONB NOT NULL,
    "messageIds" JSONB NOT NULL,
    "draft" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailConnection_userId_key" ON "EmailConnection"("userId");

-- CreateIndex
CREATE INDEX "EmailMessage_userId_provider_idx" ON "EmailMessage"("userId", "provider");

-- CreateIndex
CREATE INDEX "AutomationSuggestion_userId_status_idx" ON "AutomationSuggestion"("userId", "status");

-- CreateIndex
CREATE INDEX "AutomationSuggestion_userId_type_idx" ON "AutomationSuggestion"("userId", "type");
