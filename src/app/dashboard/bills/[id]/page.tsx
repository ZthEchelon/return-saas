import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/calendarEvents";
import BillTransactionHistory from "@/app/dashboard/bills/ui/BillTransactionHistory";

export default async function BillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return <div>Unauthorized</div>;

  const { id } = await params;
  if (!id) {
    notFound();
  }

  const bill = await prisma.bill.findUnique({
    where: { id },
    include: { payments: { orderBy: { paidAt: "desc" } } },
  });

  if (!bill || bill.userId !== userId) {
    notFound();
  }

  type PaymentRow = { paidAt: Date | null; amountCents: number | null };
  const payments = bill.payments as PaymentRow[];

  const stats = {
    total: payments.length,
    paid: payments.filter(p => p.paidAt).length,
    unpaid: payments.filter(p => !p.paidAt).length,
    totalPaid: payments
      .filter(p => p.paidAt)
      .reduce((sum, p) => sum + (p.amountCents ?? 0), 0),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{bill.name}</h1>
        <p className="mt-1 text-slate-600">Due on day {bill.dueDayOfMonth} of each month</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total Payments</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border bg-emerald-50 p-4 shadow-sm border-emerald-200">
          <p className="text-xs font-semibold text-emerald-700">Paid</p>
          <p className="mt-2 text-2xl font-bold text-emerald-900">{stats.paid}</p>
        </div>
        <div className="rounded-xl border bg-amber-50 p-4 shadow-sm border-amber-200">
          <p className="text-xs font-semibold text-amber-700">Unpaid</p>
          <p className="mt-2 text-2xl font-bold text-amber-900">{stats.unpaid}</p>
        </div>
        <div className="rounded-xl border bg-blue-50 p-4 shadow-sm border-blue-200">
          <p className="text-xs font-semibold text-blue-700">Total Paid</p>
          <p className="mt-2 text-2xl font-bold text-blue-900">
            {formatMoney(stats.totalPaid, bill.currency)}
          </p>
        </div>
      </div>

      {/* Bill Details */}
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-slate-500">Amount</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {formatMoney(bill.amountCents ?? 0, bill.currency)} / month
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Status</p>
            <p className="mt-1 text-xl font-bold text-slate-900 capitalize">
              {bill.status}
            </p>
          </div>
          {bill.payee && (
            <div>
              <p className="text-xs font-semibold text-slate-500">Payee</p>
              <p className="mt-1 text-slate-900">{bill.payee}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-slate-500">Autopay</p>
            <p className="mt-1 text-slate-900">{bill.autopay ? "Enabled" : "Disabled"}</p>
          </div>
          {bill.notes && (
            <div className="md:col-span-2">
              <p className="text-xs font-semibold text-slate-500">Notes</p>
              <p className="mt-1 text-slate-900">{bill.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Transaction History */}
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Payment History</h2>
        <BillTransactionHistory userId={userId} billId={bill.id} />
      </div>
    </div>
  );
}
