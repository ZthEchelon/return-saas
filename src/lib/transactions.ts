import { prisma } from "@/lib/prisma";

export interface TransactionRecord {
  id: string;
  date: Date;
  title: string;
  amount: number;
  currency: string;
  type: "payment" | "refund" | "pending";
  notes?: string;
  status: string;
}

export async function getBillTransactionHistory(userId: string, billId: string) {
  const payments = await prisma.billPayment.findMany({
    where: { userId, billId },
    orderBy: { paidAt: "desc" },
  });

  return payments.map(p => ({
    id: p.id,
    date: p.paidAt || p.dueDate,
    title: p.paidAt ? "Paid" : "Due",
    amount: p.amountCents ?? 0,
    currency: p.currency,
    type: p.paidAt ? ("payment" as const) : ("pending" as const),
    notes: p.notes,
    status: p.paidAt ? "PAID" : "DUE",
  }));
}

export async function getReturnTransactionHistory(userId: string, returnId: string) {
  const ret = await prisma.returnItem.findUnique({
    where: { id: returnId },
  });

  if (!ret) return [];

  const transactions: TransactionRecord[] = [];

  // Purchase transaction
  transactions.push({
    id: `${ret.id}-purchase`,
    date: ret.purchaseDate,
    title: "Purchase",
    amount: ret.amountCents ?? 0,
    currency: ret.currency,
    type: "payment" as const,
    status: "COMPLETED",
  });

  // Return deadline
  transactions.push({
    id: `${ret.id}-deadline`,
    date: ret.returnBy,
    title: "Return Deadline",
    amount: 0,
    currency: ret.currency,
    type: ret.status === "REFUNDED" ? ("payment" as const) : ("pending" as const),
    status: ret.status,
  });

  // Drop-off date if exists
  if (ret.dropoffDate) {
    transactions.push({
      id: `${ret.id}-dropoff`,
      date: ret.dropoffDate,
      title: "Dropped Off",
      amount: 0,
      currency: ret.currency,
      type: "payment" as const,
      status: "COMPLETED",
    });
  }

  // Expected refund date
  if (ret.refundExpectedBy) {
    transactions.push({
      id: `${ret.id}-expected`,
      date: ret.refundExpectedBy,
      title: "Refund Expected By",
      amount: ret.refundAmountCents ?? ret.amountCents ?? 0,
      currency: ret.currency,
      type: ret.refundedDate ? ("payment" as const) : ("pending" as const),
      status: "PENDING",
    });
  }

  // Actual refund date
  if (ret.refundedDate) {
    transactions.push({
      id: `${ret.id}-refund`,
      date: ret.refundedDate,
      title: "Refunded",
      amount: ret.refundAmountCents ?? ret.amountCents ?? 0,
      currency: ret.currency,
      type: "refund" as const,
      notes: ret.refundAmountCents ? `${ret.refundAmountCents} cents refunded` : undefined,
      status: "COMPLETED",
    });
  }

  return transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export async function getSubscriptionTransactionHistory(
  userId: string,
  subscriptionId: string
) {
  const payments = await prisma.subscriptionPayment.findMany({
    where: { userId, subscriptionId },
    orderBy: { paidAt: "desc" },
  });

  return payments.map(p => ({
    id: p.id,
    date: p.paidAt,
    title: "Payment",
    amount: p.amountCents,
    currency: p.currency,
    type: "payment" as const,
    notes: p.notes,
    status: "PAID",
  }));
}
