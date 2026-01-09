"use client";

export function UpgradeButtons() {
  async function startCheckout(interval: "monthly" | "yearly") {
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interval }),
    });
    const data = await res.json();
    window.location.href = data.url;
  }

  return (
    <div className="flex gap-2">
      <button
        className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
        onClick={() => startCheckout("monthly")}
      >
        Go Pro — $4.99/mo
      </button>
      <button
        className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
        onClick={() => startCheckout("yearly")}
      >
        Go Pro — $40/yr
      </button>
    </div>
  );
}
