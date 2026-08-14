---
id: client-account-backfill-script
title: One-off script to provision CLIENT accounts for existing clients
status: done
owner: agent
feature_area: client-portal
created: 2026-08-14
---

## Task

Most existing `clients` rows have no linked `users` row (`clients.userId IS NULL`). Added a one-off, idempotent script (`tools/backfill-client-accounts.ts`, bun runtime like the existing `tools/vector-index.ts`) that walks all active clients missing a `userId`, provisions a `CLIENT` account for each using `clients.id` as the login (per [[client-login-by-client-id]]), and generates a random password.

## Acceptance criteria

- [x] ~~Only processes `clients` where `isActive = true AND userId IS NULL AND deletedAt IS NULL`~~ — **changed 2026-08-14**: dropped the `isActive = true` condition. Client loan-state (`isActive`/`deferred`) no longer has any bearing on portal access (`lib/auth/session.ts` already lets `CLIENT` sessions through regardless of `isActive`), so excluding inactive clients from the backfill was an inconsistency — they'd never get an account to log in with in the first place. ~~Now: `userId IS NULL AND deletedAt IS NULL`~~ — **further changed 2026-08-14**: also dropped `deletedAt IS NULL`. `clients.deletedAt` is set by the staff "Deactivate" action alongside `isActive = false` and is consumed only by `lib/db/repositories/loan-status.repository.ts` as a loan-status reconciliation sentinel (prevents auto-reactivation) — it is not an access-control field, per the same rule that dropped `isActive`. A client deactivated *before* ever getting a portal account was permanently unreachable by this script even though an existing account-holder who later gets deactivated keeps full login access. Now: `userId IS NULL` only (drizzle `isNull(clients.userId)`).
- [x] Idempotent — safe to re-run without creating duplicate/orphaned users: the eligibility query itself excludes anything with `userId` already set, so a rerun naturally finds zero eligible rows once everything's provisioned (verified live, see Notes); `provisionClientPortalAccount`'s own already-provisioned guard is the second line of defense if a client somehow gets picked up twice in one run
- [x] Generates a cryptographically random password per client (`randomBytes(9).toString("base64url")` in `lib/services/client-portal-provisioning.ts`, reused — not reimplemented), hashed with `lib/auth/password.ts:hashPassword`
- [x] Writes results to `tools/output/client-portal-backfill-<timestamp>.{csv,json}` (client name, login ID, plaintext password, plus `contactNumber` and a `delivered: false` flag in the JSON — added after initial ship, per user request, so a send-one-by-one script/checklist has something to iterate over and mark off), mode `0600`, directory gitignored (`/tools/output/` added to `.gitignore`) — never logged to stdout in full (script only ever prints the output file paths and a success count, never a row's contents)
- [x] `--dry-run` flag: reports the count and lists eligible clients (name + ID, no passwords generated) without writing anything
- [x] Meant to be run manually once against production data — not wired into any CI/deploy step
- [x] Vitest coverage for the shared helper already existed from [[client-portal-provisioning-action]] (`lib/services/client-portal-provisioning.test.ts`) — its "throws VALIDATION_ERROR when the client already has portal access" case *is* the idempotency guard this script relies on as a second line of defense

## Notes

- Reuses the same account-creation logic as [[client-portal-provisioning-action]] via the shared `lib/services/client-portal-provisioning.ts:provisionClientPortalAccount` helper — no duplicated logic, as planned
- **tsconfig fix required for reuse to work:** `tools/tsconfig.json` had no `@/*` path alias (unlike the root `tsconfig.json`), so importing anything under `lib/` that itself uses `@/...` imports (e.g. `lib/db/client.ts` → `@/drizzle/schema`) failed to resolve under `tsc -p tools/tsconfig.json`. Added `baseUrl: ".."` + `paths: { "@/*": ["./*"] }` and widened `include` to cover `../lib/**/*.ts` and `../drizzle/**/*.ts` so the tools typecheck target actually type-checks what it imports. Confirmed `bun run tools/backfill-client-accounts.ts` resolves the same aliases correctly at runtime (bun reads the nearest tsconfig's `paths` the same way).
- Live-verified end-to-end against local Postgres: `--dry-run` correctly listed 2 pre-existing test clients with `userId IS NULL`; a real run provisioned both (confirmed via psql: both `clients.userId` now set, linked `users` rows have `role = 'CLIENT'`), wrote a `0600` CSV with the correct header/row/column shape (verified structurally — `wc`/`awk`/`cut` on non-secret columns only, never printed plaintext passwords to the transcript); an immediate rerun reported "No clients need portal accounts. Nothing to do." confirming idempotency. Test data and the CSV were cleaned up afterward.
