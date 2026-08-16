import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/data-access/prisma";

export const runtime = "nodejs";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const job = await prisma.dataDeletionJob.create({
    data: { userId, status: "RUNNING" },
  });

  try {
    await prisma.notificationJob.deleteMany({ where: { userId } });
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.snoozedEvent.deleteMany({ where: { userId } });

    await prisma.returnItem.deleteMany({ where: { userId } });
    await prisma.shipmentEvent.deleteMany({ where: { userId } });
    await prisma.refundCase.deleteMany({ where: { userId } });

    await prisma.subscriptionPayment.deleteMany({ where: { userId } });
    await prisma.subscription.deleteMany({ where: { userId } });

    await prisma.billPayment.deleteMany({ where: { userId } });
    await prisma.bill.deleteMany({ where: { userId } });

    await prisma.purchaseItem.deleteMany({ where: { purchase: { userId } } });
    await prisma.purchaseAttachment.deleteMany({ where: { purchase: { userId } } });
    await prisma.purchase.deleteMany({ where: { userId } });

    await prisma.receiptDocument.deleteMany({ where: { userId } });
    await prisma.receiptUpload.deleteMany({ where: { userId } });

    await prisma.emailTransaction.deleteMany({ where: { userId } });
    await prisma.automationSuggestion.deleteMany({ where: { userId } });
    await prisma.detectedItem.deleteMany({ where: { userId } });
    await prisma.valueEvent.deleteMany({ where: { userId } });

    await prisma.billingAccount.deleteMany({ where: { userId } });
    await prisma.userRule.deleteMany({ where: { userId } });
    await prisma.emailConnection.deleteMany({ where: { userId } });

    await prisma.dataDeletionJob.update({
      where: { id: job.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    return NextResponse.json({ ok: true, jobId: job.id });
  } catch (error) {
    await prisma.dataDeletionJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: error instanceof Error ? error.message : String(error) },
    });

    return NextResponse.json({ error: "Failed to delete data" }, { status: 500 });
  }
}
