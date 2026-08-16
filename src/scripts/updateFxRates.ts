import { prisma } from "@/lib/data-access/prisma";

// Source: ECB via exchangerate.host (free, no key). Base EUR.
const FX_ENDPOINT = "https://api.exchangerate.host/latest?base=EUR";

async function fetchRates() {
  const res = await fetch(FX_ENDPOINT);
  if (!res.ok) throw new Error(`FX fetch failed: ${res.status}`);
  const json: { rates: Record<string, number>; date: string } = await res.json();
  return { rates: json.rates, asOf: new Date(json.date) };
}

async function main() {
  const { rates, asOf } = await fetchRates();
  const entries = Object.entries(rates).filter(([code]) => code.length === 3);

  console.log(`Upserting ${entries.length} FX rates for ${asOf.toISOString().slice(0, 10)}...`);

  for (const [quoteCurrency, rate] of entries) {
    const baseCurrency = "EUR";
    const asOfDate = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()));
    await prisma.fxRate.upsert({
      where: { baseCurrency_quoteCurrency_asOfDate: { baseCurrency, quoteCurrency, asOfDate } },
      update: { rate },
      create: { baseCurrency, quoteCurrency, rate, asOfDate },
    });

    // Store inverse for convenience (quote -> EUR)
    const inverseRate = rate > 0 ? 1 / rate : null;
    if (inverseRate) {
      await prisma.fxRate.upsert({
        where: { baseCurrency_quoteCurrency_asOfDate: { baseCurrency: quoteCurrency, quoteCurrency: baseCurrency, asOfDate } },
        update: { rate: inverseRate },
        create: { baseCurrency: quoteCurrency, quoteCurrency: baseCurrency, rate: inverseRate, asOfDate },
      });
    }
  }

  console.log("FX rates upsert complete");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
