-- CreateTable
CREATE TABLE "NotificationPreference" (
    "userId" TEXT NOT NULL,
    "emailDigestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'America/Toronto',
    "digestHourLocal" INTEGER NOT NULL DEFAULT 9,
    "windowDays" INTEGER NOT NULL DEFAULT 14,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "DigestSendLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateLocal" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigestSendLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DigestSendLog_userId_sentAt_idx" ON "DigestSendLog"("userId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "DigestSendLog_userId_dateLocal_key" ON "DigestSendLog"("userId", "dateLocal");
