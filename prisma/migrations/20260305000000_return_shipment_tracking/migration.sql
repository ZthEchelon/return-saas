-- Extend return tracking + refund SLA timeline

-- Add new return status
ALTER TYPE "ReturnStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';

-- Rename refund expected column and add tracking fields
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ReturnItem' AND column_name = 'refundExpectedBy'
  ) THEN
    -- Drop old index before renaming the column
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ReturnItem_userId_refundExpectedBy_idx') THEN
      DROP INDEX "ReturnItem_userId_refundExpectedBy_idx";
    END IF;
    ALTER TABLE "ReturnItem" RENAME COLUMN "refundExpectedBy" TO "refundExpectedAt";
  END IF;
END $$;

ALTER TABLE "ReturnItem"
ADD COLUMN IF NOT EXISTS "carrier" TEXT,
ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "refundSlaDays" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN IF NOT EXISTS "refundType" TEXT DEFAULT 'ORIGINAL';

-- Refresh refund expected index with new column name
CREATE INDEX IF NOT EXISTS "ReturnItem_userId_refundExpectedAt_idx" ON "ReturnItem"("userId", "refundExpectedAt");

-- Notification preferences and types
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RETURN_DELIVERED';

ALTER TABLE "NotificationPreference"
ADD COLUMN IF NOT EXISTS "notifyOnDelivery" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "notifyOnRefundOverdue" BOOLEAN NOT NULL DEFAULT true;

-- Shipment events table
CREATE TABLE IF NOT EXISTS "ShipmentEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "statusCode" TEXT NOT NULL,
    "statusText" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShipmentEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ShipmentEvent_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "ReturnItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ShipmentEvent_returnId_occurredAt_idx" ON "ShipmentEvent"("returnId", "occurredAt");
CREATE INDEX IF NOT EXISTS "ShipmentEvent_userId_occurredAt_idx" ON "ShipmentEvent"("userId", "occurredAt");

-- Refund case table
CREATE TABLE IF NOT EXISTS "RefundCase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "expectedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "overdueNotifiedAt" TIMESTAMP(3),
    "refundType" TEXT DEFAULT 'ORIGINAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefundCase_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RefundCase_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "ReturnItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RefundCase_returnId_key" UNIQUE ("returnId")
);
