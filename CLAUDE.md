# Project rules (ratified — do not relitigate in-session)

Decision record: ../MoneyTalks/docs/decisions/2026-08-16-one-money-app.md · newest rulings: ../MoneyTalks/docs/decisions/LOG.md

@ECOSYSTEM.md

- **This repo is absorbed, not grown.** "Looply" is the *retired product name* for this shell; the email-intelligence *capability* it pioneered now lives in the unifier (`../MoneyTalks/src/lib/domain/receipts/`, `src/lib/services/email.ts`). The deployment stays live indefinitely as a recruiter-facing portfolio demo, explicitly not a product (B1) — no feature work, no users solicited.
- Do NOT add features to the SaaS shell (pricing, Stripe tiers, marketing pages, Looply branding). Keep healthy what still matters: email/receipt ingestion, returns/refunds domain, the digest job queue (`src/lib/domain/notifications/digestJobScheduler.ts`), and `src/lib/security/`.
- Preferred work here: deletion of dead/duplicate code and hardening of the pieces that move.
- Credentials are encrypted at rest (AES-256-GCM envelopes; `src/lib/security/`). Deploys hard-require `SECRET_ENC_ACTIVE_VERSION` + `SECRET_ENC_KEY_V<n>`; new/restored DBs need `npm run secrets:encrypt -- --apply`. See docs/env.md.
- Containment: Google OAuth stays in testing mode, Stripe stays in test mode, its old Clerk app is never used by the unified product.
