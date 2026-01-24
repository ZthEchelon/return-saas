# Architecture overview

## High-level flow

1. Users authenticate via Clerk and access dashboard pages under [../src/app/dashboard](../src/app/dashboard).
2. Core data is stored in Postgres via Prisma models in [../prisma/schema.prisma](../prisma/schema.prisma).
3. Ingestion happens through Gmail OAuth or IMAP connections and receipt uploads.
4. Scheduled cron endpoints compute digests and notifications and enqueue send jobs.
5. Stripe billing controls access to paid features.

## Domain map

- Returns: tracking, shipment events, refunds.
- Subscriptions: recurring charges and upcoming renewals.
- Bills: recurring bill schedules and payments.
- Receipts: email and PDF ingestion.
- Notifications: digests, reminders, and delivery/refund alerts.
- Automation: suggestions and review workflows.

## Key data models

- `ReturnItem`, `ShipmentEvent`, `RefundCase`
- `Subscription`, `SubscriptionPayment`
- `Bill`, `BillOccurrence`, `BillPayment`
- `EmailConnection`, `EmailMessage`, `EmailTransaction`, `ReceiptDocument`
- `Notification`, `NotificationJob`, `NotificationPreference`, `DigestRun`, `DigestSendLog`
- `BillingAccount`, `WebhookEvent`

## Cron endpoints

These routes expect `CRON_SECRET` in the request.

- `/api/cron/digest`
- `/api/cron/notify`
- `/api/cron/shipping`

## Integration touchpoints

- Gmail OAuth: [../src/lib/services/gmailClient.ts](../src/lib/services/gmailClient.ts)
- IMAP: [../src/lib/services/imapClient.ts](../src/lib/services/imapClient.ts)
- Stripe: [../src/lib/services/stripeClient.ts](../src/lib/services/stripeClient.ts)
- Email delivery: [../src/lib/services/email.ts](../src/lib/services/email.ts)
