import { getBillTransactionHistory } from "@/lib/transactions";
import { formatMoney } from "@/lib/events";

interface BillTransactionHistoryProps {
  userId: string;
  billId: string;
}

export default async function BillTransactionHistory({
  userId,
  billId,
}: BillTransactionHistoryProps) {
  const transactions = await getBillTransactionHistory(userId, billId);

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        No payment history yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map(tx => (
        <div key={tx.id} className="flex items-center justify-between rounded-lg border bg-slate-50 px-4 py-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="text-xl">
              {tx.status === "PAID" ? "✅" : "📅"}
            </span>
            <div>
              <p className="font-medium text-slate-900">{tx.title}</p>
              <p className="text-xs text-slate-500">
                {tx.date.toLocaleDateString("en-CA")}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-slate-900">
              {formatMoney(tx.amount, tx.currency)}
            </p>
            {tx.notes && (
              <p className="text-xs text-slate-500">{tx.notes}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
