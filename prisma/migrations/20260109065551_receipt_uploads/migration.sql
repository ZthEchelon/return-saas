-- CreateEnum
CREATE TYPE "BillOccurrenceStatus" AS ENUM ('DUE', 'PAID');

-- CreateTable
CREATE TABLE "BillOccurrence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "BillOccurrenceStatus" NOT NULL DEFAULT 'DUE',
    "paidAt" TIMESTAMP(3),
    "amountCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillOccurrence_userId_dueDate_idx" ON "BillOccurrence"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "BillOccurrence_userId_status_idx" ON "BillOccurrence"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BillOccurrence_billId_dueDate_key" ON "BillOccurrence"("billId", "dueDate");

-- AddForeignKey
ALTER TABLE "BillOccurrence" ADD CONSTRAINT "BillOccurrence_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
