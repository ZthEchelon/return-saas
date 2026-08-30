# M5 — return-saas AI-Native Scaffolding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide `return-saas` with its first CI workflow (lint + typecheck + test), establish the canonical `AGENTS.md` router (≤40 lines) to cut always-loaded context from ~1,157 tokens to ≤300 tokens, check in `.claude/settings.json`, and relax Dependabot's update limits with full CI verification.

**Architecture:** `AGENTS.md` becomes the single canonical router that all AI agents read. `CLAUDE.md` shrinks to a single `@AGENTS.md` import. An aggregate `npm run check` command chains `lint`, `typecheck` (`tsc --noEmit`), and `test` (`node --test`), and `.github/workflows/ci.yml` runs this chain on pushes and pull requests to the default `organized` branch. A dedicated unit test asserts the router line budget and constraints.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Prisma 7, PostgreSQL, Node.js Test Runner (`node --test`), ESLint 9, GitHub Actions.

**Spec Reference:** `/Users/zub/Documents/Github_Projects/MoneyTalks/docs/superpowers/specs/2026-08-28-ai-native-repos-design.md` (§1–§6, M5).

---

## Global Constraints & Principles

- **Work Directly on Default Branch:** Default branch is `organized` (NOT `main`). Commit and push directly. Do NOT create a branch, open a PR, or run `gh pr create` (ratified 2026-08-30).
- **No Required Status Checks:** CI reports; it does not block (withdrawn 2026-08-30 to avoid multi-agent push conflicts).
- **P1 Compile to delete:** Replace always-loaded prose with executable checks and on-demand markdown links.
- **P2 Compile or demote:** What cannot be compiled into a test is linked in `docs/` via markdown links (`@file` is eager and prohibited in sub-documents).
- **P3 One owner:** Email intelligence unifier belongs to MoneyTalks/Inunity; `return-saas` is a revival-ready portfolio demo and return/refund tracker shell.
- **P4 No check ships without a trigger:** `npm run check` and `.github/workflows/ci.yml` land together first.
- **P5 Always-load the trigger, demote the procedure:** Router contains only identity, one command table, pointer table, fleet link, and freedom clause.
- **Router Budget:** `AGENTS.md` ≤ 40 lines; `CLAUDE.md` shrinks to `@AGENTS.md`. Always-loaded context ≤ 600 tokens (target ~300 tokens).
- **Commit Style:** Conventional Commits. **NEVER** add `Co-Authored-By` trailers.
- **No Unnecessary Ceremony:** `REPO_MAP.md` is omitted because `docs/` (3 files) and `scripts/` (2 files) are compact and orderly.

---

## Task Breakdown

### Task 1: Baseline Verification & Lint / Typecheck Fixes

Establish a 100% clean baseline across lint, typecheck, and test before wiring CI.

**Files:**
- Modify: `package.json` (add `"typecheck": "tsc --noEmit"`)
- Modify: `eslint.config.mjs` (set `"react-hooks/set-state-in-effect": "off"` for async data-fetching components)
- Modify / Rename: `scripts/parseAudit.js` -> `scripts/parseAudit.mjs` (ESM migration to fix `no-require-imports`)
- Modify: `src/app/api/automation/scan/route.ts` (replace `any` cast with proper type)
- Modify: `src/app/api/automation/suggestions/route.ts` (replace `any` cast with proper type)
- Modify: `src/app/dashboard/returns/ui/ReturnsBoard.tsx` (replace `any` parameter with `Record<string, unknown>`)
- Modify: `src/lib/domain/notifications/digestJobScheduler.ts` (type `$queryRaw` return with `NotificationJob[]`)
- Modify: `src/lib/domain/notifications/eventNotificationScheduler.ts` (type `type` with `NotificationType` and `where` with `Prisma.NotificationWhereInput`)

**Interfaces:**
- Produces: `npm run typecheck` passing with 0 errors.
- Produces: `npm run lint` passing with 0 errors.
- Produces: `npm test` passing with 32/32 tests.

- [ ] **Step 1:** Add `"typecheck": "tsc --noEmit"` to `package.json` `scripts`.
- [ ] **Step 2:** Update `eslint.config.mjs` to disable `"react-hooks/set-state-in-effect"` (matching `MoneyTalks`).
- [ ] **Step 3:** Migrate `scripts/parseAudit.js` to `scripts/parseAudit.mjs` with ES module imports and update `package.json` `"audit:parses"` script.
- [ ] **Step 4:** Replace explicit `any` types in the 5 identified source files with strict Prisma/TypeScript types.
- [ ] **Step 5:** Run `npm run lint`, `npm run typecheck`, and `npm test` to verify all pass cleanly.
- [ ] **Step 6:** Commit changes: `fix(repo): resolve lint errors and add typecheck script`.

---

### Task 2: The One Command (`check`) and First CI Workflow

Wire the single aggregate command and create `.github/workflows/ci.yml`.

**Files:**
- Modify: `package.json` (add `"check": "npm run lint && npm run typecheck && npm run test"`)
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: `npm run check` as the single verification entrypoint.
- Produces: GitHub Actions CI workflow running on `push` and `pull_request` against `organized`.

- [ ] **Step 1:** Add `"check": "npm run lint && npm run typecheck && npm run test"` to `package.json`.
- [ ] **Step 2:** Create `.github/workflows/ci.yml` with `verify` job running `actions/checkout@v4`, `actions/setup-node@v4` (Node 20, cache npm), `npm ci`, and `npm run check`.
- [ ] **Step 3:** Validate workflow YAML syntax.
- [ ] **Step 4:** Run `npm run check` locally to verify full suite passes.
- [ ] **Step 5:** Commit and push to `organized`: `ci: add first CI workflow and npm run check aggregate command`.
- [ ] **Step 6:** Confirm CI workflow executes and reports green on GitHub (`gh run list`).

---

### Task 3: Router Invariant Guardrail Test

Add an automated test to enforce `AGENTS.md` and `CLAUDE.md` line and token limits.

**Files:**
- Create: `src/lib/security/routerBudget.test.mts`

**Interfaces:**
- Produces: Automated regression test verifying `AGENTS.md` <= 40 lines, required sections present, `CLAUDE.md` <= 2 lines, and total always-loaded context <= 2,400 chars (~600 tokens).

- [ ] **Step 1:** Write `src/lib/security/routerBudget.test.mts` testing router line count, sections (Identity, One Command, Read When, FLEET, Freedom clause on `organized`), and `CLAUDE.md` content.
- [ ] **Step 2:** Run `npm test` and verify red/failing state (before creating `AGENTS.md`).

---

### Task 4: `AGENTS.md` Canonical Router & `CLAUDE.md` Demotion

Create the router file following Spec §2 and shrink `CLAUDE.md`.

**Files:**
- Create: `AGENTS.md` (≤40 lines)
- Modify: `CLAUDE.md` (replace entire contents with `@AGENTS.md`)

**Interfaces:**
- Produces: Canonical router for all LLM agents.
- Cuts always-loaded token cost from ~1,157 tokens to ~300 tokens (~74% reduction).

- [ ] **Step 1:** Author `AGENTS.md` (identity, one command table with `npm run check`, pointer table with markdown links to `docs/env.md`, `docs/architecture.md`, `ECOSYSTEM.md`, and `FLEET.md`, link to `FLEET.md`, and freedom clause specifying direct work on `organized`).
- [ ] **Step 2:** Replace `CLAUDE.md` with `@AGENTS.md`.
- [ ] **Step 3:** Run `npm test` and `npm run check` to verify green test execution.
- [ ] **Step 4:** Commit and push: `chore(agents): establish AGENTS.md router and demote CLAUDE.md`.

---

### Task 5: Checked-in `.claude/settings.json`

Add tool permission allowlist for non-destructive operations and verification commands.

**Files:**
- Create: `.claude/settings.json`

- [ ] **Step 1:** Create `.claude/settings.json` with permissions allowlist for `npm run check`, `npm run lint`, `npm run typecheck`, `npm test`, `npx tsc --noEmit`, `npx eslint`, `git status`, `git diff`, `git log`.
- [ ] **Step 2:** Commit and push: `chore(claude): check in tool permissions allowlist`.

---

### Task 6: Relax Dependabot Limits

Now that CI verifies dependencies on every pull request, relax the temporary cap from M6.

**Files:**
- Modify: `.github/dependabot.yml`

- [ ] **Step 1:** Update `.github/dependabot.yml` to remove the artificial cap (`open-pull-requests-limit: 2` and `1`), and add major version ignore for typescript (matching ecosystem practice).
- [ ] **Step 2:** Commit and push: `chore(dependabot): relax PR limit now that CI verification is active`.

---

### Task 7: Verification & Final Accounting

Run full verification, inspect GitHub Actions runs, and measure token savings.

- [ ] **Step 1:** Run `npm run check` locally.
- [ ] **Step 2:** Verify GitHub Actions runs (`gh run list --limit 5`).
- [ ] **Step 3:** Calculate and document exact before/after always-loaded token metrics.
