//automation for emails types

export type SuggestionType = "RETURN" | "SUBSCRIPTION" | "BILL";
export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export type Suggestion = {
  id: string;
  type: SuggestionType;
  merchant: string;
  amountCents?: number;
  currency: "CAD";
  detectedDate: string; // YYYY-MM-DD
  confidence: Confidence;
  reasons: string[];
  source: {
    provider: "gmail" | "outlook";
    messageIds: string[];
  };
  draft: {
    // Return
    purchaseDate?: string; // YYYY-MM-DD
    returnBy?: string; // YYYY-MM-DD
    returnWindowDays?: number;
    trackingNumber?: string;
    carrier?: string;
    refundSlaDays?: number;
    refundExpectedAt?: string;
    refundType?: "ORIGINAL" | "STORE_CREDIT" | "PARTIAL";
    deliveredAt?: string;

    // Subscription
    renewalDate?: string; // YYYY-MM-DD
    cadence?: "MONTHLY" | "YEARLY";

    // Bill
    dueDayOfMonth?: number;
    autopay?: boolean;
  };

  status: "NEW" | "CONFIRMED" | "IGNORED";
};

export function formatMoney(amountCents?: number, currency: string = "CAD") {
  if (amountCents == null) return "";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}
