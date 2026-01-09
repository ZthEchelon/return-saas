-- CreateTable
CREATE TABLE "DigestRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "digestDate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DigestRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DigestRun_userId_digestDate_idx" ON "DigestRun"("userId", "digestDate");

-- CreateIndex
CREATE UNIQUE INDEX "DigestRun_userId_digestDate_key" ON "DigestRun"("userId", "digestDate");
