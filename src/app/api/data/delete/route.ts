import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const prismaAny = prisma as typeof prisma & {
    dataDeletionJob: {
      create: (args: unknown) => Promise<{ id: string }>;
      update: (args: unknown) => Promise<unknown>;
    };
    purchase: { deleteMany: (args: unknown) => Promise<unknown> };
    purchaseItem: { deleteMany: (args: unknown) => Promise<unknown> };
    purchaseAttachment: { deleteMany: (args: unknown) => Promise<unknown> };
    detectedItem: { deleteMany: (args: unknown) => Promise<unknown> };
    userRule: { deleteMany: (args: unknown) => Promise<unknown> };
  };

  const job = await prismaAny.dataDeletionJob.create({
    data: { userId, status: "RUNNING" },
  });

  try {
    await prisma.notificationJob.deleteMany({ where: { userId } });
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.digestRun.deleteMany({ where: { userId } });
    await prisma.digestSendLog.deleteMany({ where: { userId } });
    await prisma.snoozedEvent.deleteMany({ where: { userId } });

    await prisma.returnItem.deleteMany({ where: { userId } });
    await prisma.shipmentEvent.deleteMany({ where: { userId } });
    await prisma.refundCase.deleteMany({ where: { userId } });

    await prisma.subscriptionPayment.deleteMany({ where: { userId } });
    await prisma.subscription.deleteMany({ where: { userId } });

    await prisma.billPayment.deleteMany({ where: { userId } });
    await prisma.billOccurrence.deleteMany({ where: { userId } });
    await prisma.bill.deleteMany({ where: { userId } });

    await prismaAny.purchaseItem.deleteMany({ where: { purchase: { userId } } });
    await prismaAny.purchaseAttachment.deleteMany({ where: { purchase: { userId } } });
    await prismaAny.purchase.deleteMany({ where: { userId } });

    await prisma.receiptDocument.deleteMany({ where: { userId } });
    await prisma.receiptUpload.deleteMany({ where: { userId } });

    await prisma.emailTransaction.deleteMany({ where: { userId } });
    await prisma.emailMessage.deleteMany({ where: { userId } });
    await prisma.automationSuggestion.deleteMany({ where: { userId } });
    await prismaAny.detectedItem.deleteMany({ where: { userId } });
    await prisma.valueEvent.deleteMany({ where: { userId } });

    await prisma.billingAccount.deleteMany({ where: { userId } });
    await prismaAny.userRule.deleteMany({ where: { userId } });
    await prisma.emailConnection.deleteMany({ where: { userId } });

    await prismaAny.dataDeletionJob.update({
      where: { id: job.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    return NextResponse.json({ ok: true, jobId: job.id });
  } catch (error) {
    await prismaAny.dataDeletionJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: error instanceof Error ? error.message : String(error) },
    });

    return NextResponse.json({ error: "Failed to delete data" }, { status: 500 });
  }
}
