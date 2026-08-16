import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { computeValueSummary } from "@/lib/domain/valueSummary";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const summary = await computeValueSummary(userId, { horizonDays: 7 });
    return NextResponse.json(summary);
  } catch (error) {
    console.error("analytics summary error", error);
    return NextResponse.json({ error: "Failed to compute summary" }, { status: 500 });
  }
}
