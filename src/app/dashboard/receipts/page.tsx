import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const val = bytes / Math.pow(1024, idx);
  return `${val.toFixed(val >= 10 ? 0 : 1)} ${units[idx]}`;
}

function statusChip(status: string) {
  const map: Record<string, { text: string; cls: string }> = {
    PARSED: { text: "Parsed", cls: "bg-emerald-100 text-emerald-800" },
    NEEDS_REVIEW: { text: "Needs review", cls: "bg-amber-100 text-amber-800" },
    FAILED: { text: "Failed", cls: "bg-rose-100 text-rose-800" },
  };
  return map[status] ?? { text: status, cls: "bg-slate-100 text-slate-700" };
}

export default async function ReceiptsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const uploads = await prisma.receiptUpload.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white/80 p-6 shadow-sm">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Receipts</h1>
          <p className="text-sm text-slate-600">Upload receipts to convert them into suggestions and returns.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link className="pill-link" href="/dashboard/receipts/upload">
            Upload receipt
          </Link>
          <Link className="pill-link" href="/dashboard/automation/review">
            Go to Inbox Review
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border bg-white/80 p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900">Recent uploads</div>
          <div className="text-xs text-slate-500">{uploads.length} shown (latest first)</div>
        </div>

        {uploads.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
            No uploads yet. Try a PDF or image on the upload page.
          </div>
        ) : (
          <div className="mt-4 divide-y divide-slate-100">
            {uploads.map((u) => {
              const chip = statusChip(u.status);
              return (
                <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{u.filename}</div>
                    <div className="text-xs text-slate-500">
                      {u.contentType} · {formatBytes(u.sizeBytes)} · {u.createdAt.toISOString().slice(0, 10)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${chip.cls}`}>{chip.text}</span>
                    {u.status === "FAILED" && u.error ? (
                      <span className="truncate text-xs text-rose-700">Error: {u.error}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
