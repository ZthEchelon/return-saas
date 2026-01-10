-- Persist snoozed calendar events per user/event pair
CREATE TABLE "SnoozedEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "snoozedUntil" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

ALTER TABLE "SnoozedEvent" ADD CONSTRAINT "SnoozedEvent_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "SnoozedEvent_userId_eventId_key" ON "SnoozedEvent" ("userId", "eventId");
CREATE INDEX "SnoozedEvent_userId_snoozedUntil_idx" ON "SnoozedEvent" ("userId", "snoozedUntil");
