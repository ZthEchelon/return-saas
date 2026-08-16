# Environment variables

Use [../.env.example](../.env.example) as a template and create a local env file named [../.env.local](../.env.local).

## Required

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. |
| `NEXT_PUBLIC_APP_URL` | Public app URL (used in checkout redirects). |
| `APP_URL` | Server app URL (used by digests). |
| `CRON_SECRET` | Shared secret for `/api/cron/*` endpoints. **Fails closed:** if unset, all cron requests are rejected. Accepts `x-cron-secret` or `Authorization: Bearer`. |
| `SECRET_ENC_ACTIVE_VERSION` | Key version used to encrypt new credentials, e.g. `1`. |
| `SECRET_ENC_KEY_V<n>` | Base64 32-byte AES-256-GCM key for version `<n>`. At least the active version must be set. |
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

## Credential encryption

`EmailConnection.accessToken`, `refreshToken` and `imapPassword` are stored as
AES-256-GCM envelopes, never as plaintext:

```
encv1:<keyVersion>:<base64url(iv ‖ authTag ‖ ciphertext)>
```

Each ciphertext is bound to its `(userId, column)` via GCM additional authenticated
data, so a value copied into another row or column fails authentication rather than
decrypting.

Generate a key:

```
openssl rand -base64 32
```

Encrypt any pre-existing plaintext rows (idempotent — safe to re-run):

```
npm run secrets:encrypt            # dry run, writes nothing
npm run secrets:encrypt -- --apply
```

### Rotating a key

1. Add `SECRET_ENC_KEY_V2` alongside the existing `SECRET_ENC_KEY_V1`.
2. Set `SECRET_ENC_ACTIVE_VERSION=2`. New writes use V2; old rows still read via V1.
3. Run `npm run secrets:encrypt -- --apply` to re-encrypt at the new version.
4. Remove `SECRET_ENC_KEY_V1`.

Never delete a key version while rows still reference it — those credentials become
unrecoverable and affected users must reconnect.
