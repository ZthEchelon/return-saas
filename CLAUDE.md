# Project rules (ratified — do not relitigate in-session)

Decision record: ../MoneyTalks/docs/decisions/2026-08-16-one-money-app.md

- **This repo is being absorbed, not grown as a standalone SaaS.** Keep healthy: email/receipt ingestion, returns/refunds domain, the digest job queue (`src/lib/domain/notifications/digestJobScheduler.ts`), and `src/lib/security/`. Do NOT add features to the SaaS shell (pricing, Stripe tiers, marketing pages, "Looply" branding).
- Preferred work here: deletion of dead/duplicate code (17 re-export shims, `route-new.ts`/`route-backup.ts`, dead models like `EmailMessage`/`DigestRun`/`RefundCase`-write-only, `renewalAt`/`renewalCadence`/`scopes` columns) and hardening of the pieces that will move.
- Credentials are encrypted at rest (AES-256-GCM envelopes; `src/lib/security/`). Deploys hard-require `SECRET_ENC_ACTIVE_VERSION` + `SECRET_ENC_KEY_V<n>`; new/restored DBs need `npm run secrets:encrypt -- --apply`. See docs/env.md.
