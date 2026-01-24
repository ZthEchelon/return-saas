# Return SaaS

A Next.js SaaS app for tracking returns, receipts, and subscriptions. It supports Gmail/IMAP ingestion, automated digests and notifications, Stripe billing, and a dashboard for analytics and operations.

## Docs

- [docs/onboarding.md](docs/onboarding.md)
- [docs/env.md](docs/env.md)
- [docs/architecture.md](docs/architecture.md)

## Features

- Return and shipment tracking with status updates.
- Receipt ingestion (PDF/email) and bill management.
- Purchases Inbox (unified purchase proof feed) with one-tap return creation.
- Trial/Renewal detection with Detected inbox and one-tap actions.
- Automation rules, suggestions, and digest notifications.
- Privacy & Data controls: scan modes, export, and delete.
- Stripe subscriptions and billing flows.
- Dashboard for analytics, calendar, notifications, and settings.

## Tech stack

- Next.js (App Router) + React 19
- Prisma + Postgres
- Clerk authentication
- Stripe billing
- Resend email delivery
- Gmail API + IMAP integrations

## Getting started

### 1) Install dependencies

```bash
pnpm install
```

### 2) Configure environment

Copy [.env.example](.env.example) to [.env.local](.env.local) and fill in values. See [docs/env.md](docs/env.md).

### 3) Prepare the database

```bash
pnpm run prisma:migrate:deploy
```

### 4) Run the app

```bash
pnpm dev
```

Open http://localhost:3000.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server. |
| `pnpm build` | Build for production. |
| `pnpm start` | Start the production server. |
| `pnpm lint` | Run ESLint. |
| `pnpm run prisma:migrate:deploy` | Apply Prisma migrations. |
| `pnpm run vercel-build` | Run migrations then build (Vercel). |

## Project structure

- [src/app](src/app) — routes, pages, and API handlers.
- [src/lib](src/lib) — services, data access, and domain logic.
- [prisma](prisma) — database schema and migrations.

## Key flows

- Detected inbox: [src/app/dashboard/settings/automation/detected/page.tsx](src/app/dashboard/settings/automation/detected/page.tsx)
- Purchases Inbox: [src/app/dashboard/receipts/inbox/page.tsx](src/app/dashboard/receipts/inbox/page.tsx)
- Privacy & Data: [src/app/dashboard/settings/privacy/page.tsx](src/app/dashboard/settings/privacy/page.tsx)

## Domain map

- Returns, shipment tracking, and refunds.
- Subscriptions and billing.
- Bills and recurring payments.
- Receipts and email ingestion.
- Notifications and digests.
- Automation suggestions and review.

## API map

- [src/app/api](src/app/api) — REST-style route handlers by domain.

## Privacy endpoints

- [src/app/api/gmail/scan-mode/route.ts](src/app/api/gmail/scan-mode/route.ts)
- [src/app/api/data/summary/route.ts](src/app/api/data/summary/route.ts)
- [src/app/api/data/export/route.ts](src/app/api/data/export/route.ts)
- [src/app/api/data/delete/route.ts](src/app/api/data/delete/route.ts)

## Data model

- [prisma/schema.prisma](prisma/schema.prisma) — core tables for subscriptions, returns, bills, receipts, notifications, and billing.

## Cron jobs

The following endpoints require `CRON_SECRET`:

- `/api/cron/digest`
- `/api/cron/notify`
- `/api/cron/shipping`

## Deployment

Deploy on Vercel with `pnpm run vercel-build` so migrations run before `next build`.
