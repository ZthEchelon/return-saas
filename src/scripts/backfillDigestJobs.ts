import { prisma } from "@/lib/data-access/prisma";
import { scheduleNextDigestJob } from "@/lib/domain/notifications/digestJobScheduler";

async function main() {
  const prefs = await prisma.notificationPreference.findMany({
    where: { emailDigestEnabled: true },
    select: { userId: true, timezone: true, digestHourLocal: true },
  });

  for (const p of prefs) {
    await scheduleNextDigestJob(p.userId, { timezone: p.timezone, digestHourLocal: p.digestHourLocal });
  }

  console.log("Backfilled digest jobs:", prefs.length);
}

main().finally(() => prisma.$disconnect());
