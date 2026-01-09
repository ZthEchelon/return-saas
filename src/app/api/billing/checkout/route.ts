//checkout session endpoint

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const interval = body?.interval === "yearly" ? "yearly" : "monthly";

  const priceId =
    interval === "yearly"
      ? process.env.STRIPE_PRICE_PRO_YEARLY!
      : process.env.STRIPE_PRICE_PRO_MONTHLY!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Ensure billing row exists
  const billing = await prisma.billingAccount.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: billing.stripeCustomerId ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?billing=success`,
    cancel_url: `${appUrl}/dashboard?billing=cancel`,
    allow_promotion_codes: true,
    metadata: { userId },
  });

  return NextResponse.json({ url: session.url });
}
