import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/events";

export default async function ReturnsPage() {
  const { userId } = await auth();
  if (!userId) return <div>Unauthorized</div>;

  type ReturnRow = {
    id: string;
    store: string;
    itemNote: string | null;
    amountCents: number | null;
    currency: string;
    purchaseDate: Date;
    returnBy: Date;
    refundAmountCents: number | null;
    status: "NOT_STARTED" | "PACKED" | "DROPPED_OFF" | "REFUNDED";
  };

  const returns: ReturnRow[] = await prisma.returnItem.findMany({
    where: { userId },
    orderBy: { returnBy: "desc" },
  });

  const stats = {
    total: returns.length,
    refunded: returns.filter((r: ReturnRow) => r.status === "REFUNDED").length,
    inProgress: returns.filter((r: ReturnRow) => r.status !== "REFUNDED").length,
    totalRefunded: returns
      .filter((r: ReturnRow) => r.status === "REFUNDED")
      .reduce((sum, r) => sum + (r.refundAmountCents ?? 0), 0),
  };

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Returns</h1>
        <p className="mt-1 text-slate-600">Track your return status and refunds</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total Returns</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border bg-emerald-50 p-4 shadow-sm border-emerald-200">
          <p className="text-xs font-semibold text-emerald-700">Refunded</p>
          <p className="mt-2 text-2xl font-bold text-emerald-900">{stats.refunded}</p>
        </div>
        <div className="rounded-xl border bg-amber-50 p-4 shadow-sm border-amber-200">
          <p className="text-xs font-semibold text-amber-700">In Progress</p>
          <p className="mt-2 text-2xl font-bold text-amber-900">{stats.inProgress}</p>
        </div>
        <div className="rounded-xl border bg-green-50 p-4 shadow-sm border-green-200">
          <p className="text-xs font-semibold text-green-700">Total Refunded</p>
          <p className="mt-2 text-2xl font-bold text-green-900">
            {formatMoney(stats.totalRefunded, "CAD")}
          </p>
        </div>
      </div>

      {/* Returns List */}
      {returns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
          <p className="text-slate-600">No returns yet</p>
          <Link href="/dashboard/calendar" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline">
            Go to Calendar to add a return
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {returns.map(ret => (
            <Link key={ret.id} href={`/dashboard/returns/${ret.id}`} className="flex items-center justify-between rounded-xl border bg-white p-4 hover:border-slate-300 transition">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{statusIcons[ret.status]}</span>
                  <div>
                    <p className="font-semibold text-slate-900">{ret.store}</p>
                    <p className="text-xs text-slate-500">
                      Purchased {ret.purchaseDate.toLocaleDateString("en-CA")} · Return by {ret.returnBy.toLocaleDateString("en-CA")}
                    </p>
                    {ret.itemNote && (
                      <p className="mt-1 text-xs text-slate-600">{ret.itemNote}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-semibold text-slate-900">
                    {formatMoney(ret.amountCents ?? 0, ret.currency)}
                  </p>
                  {ret.refundAmountCents && ret.status === "REFUNDED" && (
                    <p className="text-xs text-green-600">
                      ✓ {formatMoney(ret.refundAmountCents, ret.currency)} refunded
                    </p>
                  )}
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${statusColors[ret.status]}`}>
                  {ret.status.replaceAll("_", " ")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
