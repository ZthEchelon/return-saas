-- AlterTable
ALTER TABLE "ReturnItem" ADD COLUMN     "refundAmountCents" INTEGER,
ADD COLUMN     "refundExpectedBy" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ReturnItem_userId_refundExpectedBy_idx" ON "ReturnItem"("userId", "refundExpectedBy");
