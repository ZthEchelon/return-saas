# Onboarding guide

## Where to start

1. Read the architecture overview in [architecture.md](architecture.md).
2. Configure env vars using [env.md](env.md).
3. Review core domains in [src/app/dashboard](../src/app/dashboard) and [src/app/api](../src/app/api).

## Suggested learning path

- Returns flow: start with [src/app/dashboard/returns](../src/app/dashboard/returns) and related API routes in [src/app/api/returns](../src/app/api/returns).
- Notifications: review [src/app/api/notifications](../src/app/api/notifications) and models in [prisma/schema.prisma](../prisma/schema.prisma).
- Billing: inspect [src/app/api/billing](../src/app/api/billing) and [src/lib/services/stripeClient.ts](../src/lib/services/stripeClient.ts).
- Receipts and ingestion: follow [src/app/api/receipts](../src/app/api/receipts), [src/lib/services/gmailClient.ts](../src/lib/services/gmailClient.ts), and [src/lib/services/imapClient.ts](../src/lib/services/imapClient.ts).

## Dev workflow checklist

- Run migrations before starting dev: `pnpm run prisma:migrate:deploy`.
- Use `pnpm dev` and test flows via dashboard pages.
- Seed endpoints are available under `/api/dev` and are blocked in production.
