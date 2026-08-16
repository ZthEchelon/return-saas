//webhook endpoint

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/services/stripeClient";
import { prisma } from "@/lib/data-access/prisma";

export async function POST(req: NextRequest) {
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

  // Idempotency. The insert itself is the claim: a unique-constraint violation
  // means another concurrent delivery of this event already owns it. A
  // read-then-write check would let two simultaneous retries both pass.
  try {
    await prisma.webhookEvent.create({ data: { id: event.id, type: event.type } });
  } catch (err) {
    if (isUniqueViolation(err)) return NextResponse.json({ received: true });
    throw err;
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    // Release the claim so Stripe's retry is processed instead of being
    // discarded as a duplicate. Without this, one failed handler silently
    // drops the event forever - e.g. a paying customer never leaving FREE.
    await prisma.webhookEvent.delete({ where: { id: event.id } }).catch(() => {});
    console.error(`[stripe] handler failed for ${event.type} ${event.id}`, err);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

async function handleStripeEvent(event: Stripe.Event) {
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
}
