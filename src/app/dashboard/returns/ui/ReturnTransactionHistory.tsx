import { getReturnTransactionHistory } from "@/lib/transactions";
import { formatMoney } from "@/lib/events";

interface ReturnTransactionHistoryProps {
  userId: string;
  returnId: string;
}

export default async function ReturnTransactionHistory({
  userId,
  returnId,
}: ReturnTransactionHistoryProps) {
  const transactions = await getReturnTransactionHistory(userId, returnId);

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        No history yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map(tx => (
        <div key={tx.id} className="flex items-center justify-between rounded-lg border bg-slate-50 px-4 py-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-xl">
              {tx.type === "refund"
                ? "💰"
                : tx.status === "COMPLETED"
                ? "✅"
                : "📅"}
            </span>
            <div>
              <p className="font-medium text-slate-900">{tx.title}</p>
              <p className="text-xs text-slate-500">
                {tx.date.toLocaleDateString("en-CA")}
              </p>
            </div>
          </div>
          <div className="text-right">
            {tx.amount > 0 && (
              <p className={`font-semibold ${tx.type === "refund" ? "text-green-600" : "text-slate-900"}`}>
                {tx.type === "refund" ? "+" : "-"}{formatMoney(tx.amount, tx.currency)}
              </p>
            )}
            {tx.notes && (
              <p className="text-xs text-slate-500">{tx.notes}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
