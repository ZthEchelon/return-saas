//webhook endpoint

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const sig = (await headers()).get("stripe-signature");
  if (!sig) return new NextResponse("Missing signature", { status: 400 });

  const rawBody = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return new NextResponse("Webhook signature verification failed", { status: 400 });
  }

  // Idempotency: store processed event IDs
  const existing = await prisma.webhookEvent.findUnique({ where: { id: event.id } });
  if (existing) return NextResponse.json({ received: true });

  await prisma.webhookEvent.create({
    data: { id: event.id, type: event.type },
  });

  // Handle events
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const customerId = session.customer?.toString();

      if (userId && customerId) {
        await prisma.billingAccount.upsert({
          where: { userId },
          create: { userId, stripeCustomerId: customerId },
          update: { stripeCustomerId: customerId },
        });
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer.toString();

      const priceId = sub.items.data[0]?.price?.id ?? null;
      const status = sub.status;
      const currentPeriodEnd = (sub as unknown as Record<string, unknown>).current_period_end;
      const periodEnd = new Date(Number(currentPeriodEnd) * 1000);

      await prisma.billingAccount.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          stripeSubscriptionId: sub.id,
          stripePriceId: priceId,
          stripeStatus: status,
          currentPeriodEnd: periodEnd,
          plan: status === "active" ? "PRO" : "FREE",
        },
      });

      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer.toString();

      await prisma.billingAccount.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          stripeStatus: sub.status,
          plan: "FREE",
          stripeSubscriptionId: null,
          stripePriceId: null,
          currentPeriodEnd: null,
        },
      });

      break;
    }
  }

  return NextResponse.json({ received: true });
}
