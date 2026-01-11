import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

interface MonthlyData {
  month: string; // YYYY-MM
  subscriptionsCents: number;
  billsCents: number;
  refundsCents: number;
  totalCents: number;
}

interface Analytics {
  currentMonthStats: {
    subscriptionsTotal: number;
    billsTotal: number;
    refundsTotal: number;
    estimatedMonthly: number;
  };
  sixMonthTrend: MonthlyData[];
  categoryBreakdown: {
    subscriptions: number; // percentage
    bills: number;
    returns: number;
  };
  topMerchants: Array<{ merchant: string; totalSpent: number; count: number }>;
  returnStats: {
    totalReturned: number;
    refundedAmount: number;
    pendingAmount: number;
    averageRefundDays: number;
  };
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Get all bills for this user
    type BillRow = { amountCents: number | null; payments: { paidAt: Date | null; amountCents: number | null }[] };
    const bills: BillRow[] = await prisma.bill.findMany({
      where: { userId },
      include: { payments: true },
    });

    // Get all subscriptions for this user
    type SubscriptionRow = { renewalDate: Date; amountCents: number };
    const subscriptions: SubscriptionRow[] = await prisma.subscription.findMany({
      where: { userId },
      select: { renewalDate: true, amountCents: true },
    });

    // Get all returns for this user
    type ReturnRow = {
      amountCents: number | null;
      refundAmountCents: number | null;
      refundExpectedAt: Date | null;
      refundedDate: Date | null;
      status: "NOT_STARTED" | "PACKED" | "DROPPED_OFF" | "DELIVERED" | "REFUNDED";
      deliveredAt: Date | null;
    };
    const returns: ReturnRow[] = await prisma.returnItem.findMany({
      where: { userId },
      select: {
        amountCents: true,
        refundAmountCents: true,
        refundExpectedAt: true,
        refundedDate: true,
        status: true,
        deliveredAt: true,
      },
    });

    // Calculate monthly breakdown (last 6 months)
    const monthlyMap = new Map<string, MonthlyData>();

    // Initialize 6 months
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.toISOString().slice(0, 7);
      monthlyMap.set(month, {
        month,
        subscriptionsCents: 0,
        billsCents: 0,
        refundsCents: 0,
        totalCents: 0,
      });
    }

    // Add subscription amounts (assume paid on renewal date each month)
    subscriptions.forEach(sub => {
      const monthKey = sub.renewalDate.toISOString().slice(0, 7);
      if (monthlyMap.has(monthKey)) {
        const data = monthlyMap.get(monthKey)!;
        data.subscriptionsCents += sub.amountCents;
        data.totalCents += sub.amountCents;
      }
    });

    // Add bill payments
    bills.forEach(bill => {
      bill.payments.forEach(payment => {
        if (payment.paidAt) {
          const monthKey = payment.paidAt.toISOString().slice(0, 7);
          if (monthlyMap.has(monthKey)) {
            const data = monthlyMap.get(monthKey)!;
            const amt = payment.amountCents ?? bill.amountCents ?? 0;
            data.billsCents += amt;
            data.totalCents += amt;
          }
        }
      });
    });

    // Add refund amounts
    returns.forEach(ret => {
      if (ret.refundedDate) {
        const monthKey = ret.refundedDate.toISOString().slice(0, 7);
        if (monthlyMap.has(monthKey)) {
          const data = monthlyMap.get(monthKey)!;
          const refundAmt = ret.refundAmountCents ?? ret.amountCents ?? 0;
          data.refundsCents += refundAmt;
          data.totalCents -= refundAmt; // subtract from total (money back)
        }
      }
    });

    const sixMonthTrend = Array.from(monthlyMap.values())
      .sort((a, b) => a.month.localeCompare(b.month));

    // Current month stats
    const currentMonth = now.toISOString().slice(0, 7);
    const currentMonthData = monthlyMap.get(currentMonth) || {
      month: currentMonth,
      subscriptionsCents: 0,
      billsCents: 0,
      refundsCents: 0,
      totalCents: 0,
    };

    // Category breakdown (overall percentage)
    const totalSpent = subscriptions.reduce((sum, s) => sum + s.amountCents, 0) +
                       bills.reduce((sum, b) => sum + (b.amountCents ?? 0), 0);
    const totalRefunded = returns.reduce((sum, r) => sum + (r.refundAmountCents ?? 0), 0);

    const subTotal = subscriptions.reduce((sum, s) => sum + s.amountCents, 0);
    const billTotal = bills.reduce((sum, b) => sum + (b.amountCents ?? 0), 0);

    const categoryBreakdown = {
      subscriptions: totalSpent > 0 ? Math.round((subTotal / totalSpent) * 100) : 0,
      bills: totalSpent > 0 ? Math.round((billTotal / totalSpent) * 100) : 0,
      returns: 0,
    };

    // Top merchants (from EmailTransaction for returns)
    type TxRow = { merchant: string; totalCents: number | null };
    const transactions: TxRow[] = await prisma.emailTransaction.findMany({
      where: { userId },
      select: { merchant: true, totalCents: true },
    });

    const merchantMap = new Map<string, { total: number; count: number }>();
    transactions.forEach(tx => {
      const key = tx.merchant;
      if (!merchantMap.has(key)) {
        merchantMap.set(key, { total: 0, count: 0 });
      }
      const m = merchantMap.get(key)!;
      m.total += tx.totalCents ?? 0;
      m.count += 1;
    });

    const topMerchants = Array.from(merchantMap.entries())
      .map(([merchant, data]) => ({
        merchant,
        totalSpent: data.total,
        count: data.count,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // Return stats
    const refundedReturns = returns.filter(r => r.status === "REFUNDED");
    const pendingReturns = returns.filter(r => r.status !== "REFUNDED");

    let avgRefundDays = 0;
    if (refundedReturns.length > 0) {
      const days = refundedReturns
        .map(r => {
          if (r.deliveredAt && r.refundedDate) {
            const diff = r.refundedDate.getTime() - r.deliveredAt.getTime();
            return Math.floor(diff / (1000 * 60 * 60 * 24));
          }
          return 0;
        })
        .reduce((a, b) => a + b, 0);
      avgRefundDays = Math.round(days / refundedReturns.length);
    }

    const returnStats = {
      totalReturned: returns.length,
      refundedAmount: refundedReturns.reduce((sum, r) => sum + (r.refundAmountCents ?? 0), 0),
      pendingAmount: pendingReturns.reduce((sum, r) => sum + (r.amountCents ?? 0), 0),
      averageRefundDays: avgRefundDays,
    };

    const response: Analytics = {
      currentMonthStats: {
        subscriptionsTotal: currentMonthData.subscriptionsCents,
        billsTotal: currentMonthData.billsCents,
        refundsTotal: currentMonthData.refundsCents,
        estimatedMonthly:
          currentMonthData.subscriptionsCents + currentMonthData.billsCents,
      },
      sixMonthTrend,
      categoryBreakdown,
      topMerchants,
      returnStats,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
