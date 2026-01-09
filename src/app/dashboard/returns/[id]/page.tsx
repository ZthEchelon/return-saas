import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/events";
import ReturnTransactionHistory from "@/app/dashboard/returns/ui/ReturnTransactionHistory";

export default async function ReturnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) return <div>Unauthorized</div>;

  const { id } = await params;
  if (!id) notFound();

  const ret = await prisma.returnItem.findUnique({
    where: { id },
  });

  if (!ret || ret.userId !== userId) {
    notFound();
  }

  const statusColors: Record<string, string> = {
    NOT_STARTED: "bg-slate-100 text-slate-700",
    PACKED: "bg-amber-100 text-amber-700",
    DROPPED_OFF: "bg-blue-100 text-blue-700",
    REFUNDED: "bg-emerald-100 text-emerald-700",
  };

  const statusIcons: Record<string, string> = {
    NOT_STARTED: "📋",
    PACKED: "📦",
    DROPPED_OFF: "🚚",
    REFUNDED: "✅",
  };

  const isRefunded = ret.status === "REFUNDED";
  const isExpectedRefund = ret.refundExpectedBy ? new Date() < ret.refundExpectedBy : false;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{ret.store}</h1>
          <p className="mt-1 text-slate-600">
            Purchased {ret.purchaseDate.toLocaleDateString("en-CA")}
          </p>
        </div>
        <span className={`rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap ${statusColors[ret.status]}`}>
          {statusIcons[ret.status]} {ret.status.replaceAll("_", " ")}
        </span>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Purchase Amount</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatMoney(ret.amountCents ?? 0, ret.currency)}
          </p>
        </div>
        <div className={`rounded-xl border p-4 shadow-sm ${isRefunded ? "bg-emerald-50 border-emerald-200" : "bg-slate-50"}`}>
          <p className={`text-xs font-semibold ${isRefunded ? "text-emerald-700" : "text-slate-500"}`}>
            {isRefunded ? "Refunded Amount" : "Expected Refund"}
          </p>
          <p className={`mt-2 text-2xl font-bold ${isRefunded ? "text-emerald-900" : "text-slate-900"}`}>
            {formatMoney(ret.refundAmountCents ?? ret.amountCents ?? 0, ret.currency)}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Return Window</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{ret.returnWindowDays} days</p>
        </div>
        <div className={`rounded-xl border p-4 shadow-sm ${isExpectedRefund ? "bg-amber-50 border-amber-200" : "bg-slate-50"}`}>
          <p className={`text-xs font-semibold ${isExpectedRefund ? "text-amber-700" : "text-slate-500"}`}>
            Time to Refund
          </p>
          {ret.refundExpectedBy && (
            <p className={`mt-2 text-2xl font-bold ${isExpectedRefund ? "text-amber-900" : "text-slate-900"}`}>
              {Math.max(0, Math.ceil((ret.refundExpectedBy.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days
            </p>
          )}
        </div>
      </div>

      {/* Return Details */}
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-slate-500">Store</p>
            <p className="mt-1 text-slate-900 font-medium">{ret.store}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Purchase Date</p>
            <p className="mt-1 text-slate-900">{ret.purchaseDate.toLocaleDateString("en-CA")}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Return Deadline</p>
            <p className="mt-1 text-slate-900">{ret.returnBy.toLocaleDateString("en-CA")}</p>
          </div>
          {ret.dropoffDate && (
            <div>
              <p className="text-xs font-semibold text-slate-500">Dropped Off</p>
              <p className="mt-1 text-slate-900">{ret.dropoffDate.toLocaleDateString("en-CA")}</p>
            </div>
          )}
          {ret.refundExpectedBy && (
            <div>
              <p className="text-xs font-semibold text-slate-500">Expected Refund By</p>
              <p className="mt-1 text-slate-900">{ret.refundExpectedBy.toLocaleDateString("en-CA")}</p>
            </div>
          )}
          {ret.refundedDate && (
            <div>
              <p className="text-xs font-semibold text-slate-500">Refunded On</p>
              <p className="mt-1 text-green-700 font-medium">{ret.refundedDate.toLocaleDateString("en-CA")}</p>
            </div>
          )}
          {ret.itemNote && (
            <div className="md:col-span-2">
              <p className="text-xs font-semibold text-slate-500">Item Notes</p>
              <p className="mt-1 text-slate-900">{ret.itemNote}</p>
            </div>
          )}
        </div>
      </div>

      {/* Transaction History */}
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Timeline</h2>
        <ReturnTransactionHistory userId={userId} returnId={ret.id} />
      </div>
    </div>
  );
}
