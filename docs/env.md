# Environment variables

Use [../.env.example](../.env.example) as a template and create a local env file named [../.env.local](../.env.local).

## Required

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. |
| `NEXT_PUBLIC_APP_URL` | Public app URL (used in checkout redirects). |
| `APP_URL` | Server app URL (used by digests). |
| `CRON_SECRET` | Shared secret for `/api/cron/*` endpoints. |
| `STRIPE_SECRET_KEY` | Stripe secret key. |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret. |
| `STRIPE_PRICE_PRO_MONTHLY` | Stripe price ID for monthly plan. |
| `STRIPE_PRICE_PRO_YEARLY` | Stripe price ID for yearly plan. |
| `RESEND_API_KEY` | Resend API key. |
| `EMAIL_FROM` | Sender email address. |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret. |
| `GOOGLE_REDIRECT_URI` | Google OAuth redirect URI. |

## Optional

| Variable | Description |
| --- | --- |
| `IMAP_HOST` | IMAP host (defaults to Gmail). |
| `IMAP_PORT` | IMAP port (defaults to 993). |
| `IMAP_SECURE` | IMAP TLS flag (defaults to true). |
| `IMAP_USER` | IMAP username. |
| `IMAP_PASSWORD` | IMAP password. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (if using Clerk). |
| `CLERK_SECRET_KEY` | Clerk secret key (if using Clerk). |
