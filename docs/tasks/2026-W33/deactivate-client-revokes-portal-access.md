---
id: deactivate-client-revokes-portal-access
title: Deactivating a client should revoke their portal login
status: done
owner: agent
feature_area: client-portal
created: 2026-08-14
---

## Task

`adminRepository.deactivateClient` (`lib/db/repositories/admin.repository.ts:159`) only set `clients.isActive = false` and `clients.deletedAt` — it never touched the linked `users` row. Once client portal accounts exist ([[client-portal-provisioning-action]], [[client-account-backfill-script]]), a deactivated client's login and any active session would keep working indefinitely. `deactivateClient` now cascades to the linked account in the same transaction.

**Superseded (2026-08-14):** `users.isActive = false` no longer blocks `CLIENT`-role sessions — deactivated/deferred clients are meant to keep read-only access to their own loan/payment history (product decision: the portal has no write surface, so this doesn't reopen any mutation capability). `deactivateClient` still flips `users.isActive = false` on the linked account (kept as a data flag / for staff-facing status), but `lib/auth/session.ts:getSessionUserFromToken` now only enforces that flag for `ADMIN`/`SUPERADMIN`. See `docs/features/client-portal.md`.

## Acceptance criteria

- [x] `deactivateClient` also sets `users.isActive = false` for the linked `userId` (if any) in the same `db.transaction`
- [x] ~~No separate session-revocation mechanism needed: ... rejects if `!user.isActive`~~ — **superseded**: `getSessionUserFromToken` now only rejects on `!isActive` for staff roles; `CLIENT` sessions are exempt (`lib/auth/session.ts`, `lib/auth/session.test.ts`)
- [x] `requireAuth`/`requireRole` (`lib/api/auth-guard.ts`) already reject via `getSessionUser()` → `getSessionUserFromToken()`, which already checked `isActive` before this task — no change needed there
- [x] N/A — no "reactivate client" flow exists anywhere in the codebase (confirmed via search); nothing to guard against auto-reactivating portal access. If a reactivate flow is added later, it must not silently flip `users.isActive` back to `true` without an explicit separate admin action — flagged here for whoever builds it
- [x] Vitest coverage: `lib/db/repositories/admin.repository.test.ts` — cascades `users.isActive` when a `userId` is linked, is a no-op on `users` when `userId` is null, and returns `null` without touching `users` when the client doesn't exist

## Notes

- This is the client-portal analog of the existing delinquent/deferred-status auto-reconciliation logic (`DECISIONS.md` — "Auto-reconcile loan status from client delinquency") — same shape of problem (one entity's state needs to cascade to a related one)
- Live-verified end-to-end with a throwaway client+user pair via a `bun`-run script hitting the real repository and session code directly (no HTTP layer needed since neither touches `next/headers`): before deactivation `users.is_active = true`; after calling `adminRepository.deactivateClient`, `users.is_active = false` in Postgres; a freshly-signed, still-unexpired session token for that user was then correctly rejected (`getSessionUserFromToken` returned `null`). Test rows cleaned up afterward.
- UI trigger already existed and required no changes: `app/admin/clients/client-list-client.tsx`'s "Deactivate" dropdown item → confirmation dialog → `deactivateClient(client.id)` mutation now benefits from the cascade automatically since it calls the same repository method.
