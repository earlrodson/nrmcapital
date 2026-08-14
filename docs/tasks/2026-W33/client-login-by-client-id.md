---
id: client-login-by-client-id
title: Support client login via client ID instead of email
status: done
owner: agent
feature_area: auth
created: 2026-08-14
---

## Task

`loginSchema` (`lib/validations/api.ts:3`) enforces `email: z.string().email()`, and `/api/auth/login` (`app/api/auth/login/route.ts`) looks users up via `usersRepository.findByEmail`. CLIENT accounts should log in with their client ID (`clients.id`) instead of a real email address — clients don't have an email field on `clients` today, and the client dashboard (`app/client/dashboard`) already exists and expects a `CLIENT`-role session.

Store the client's `clients.id` in `users.email` for CLIENT-role accounts (that column already has no DB-level format constraint, only the current zod `.email()` check) and relax the schema so it accepts either shape.

**Decision (2026-08-14): one shared login page, not a separate `/client/login`.** `app/login/page.tsx` / `components/login/login-form.tsx` stays the single entry point for both staff and clients. The field label/placeholder should read generically (e.g. "Email or Client ID") since the same input now accepts either shape, and the identifier field is no longer typed `type="email"` in the HTML (that would block non-email input in some browsers).

## Acceptance criteria

- [x] `loginSchema` accepts a plain identifier string (not strict email format) — confirmed no format loosening issue since the column has no DB-level constraint either
- [x] `components/login/login-form.tsx` relabeled to a generic identifier field (not `type="email"`), still posts to `/api/auth/login`
- [x] Successful CLIENT login redirects to `/client/dashboard`; staff roles still redirect to `/admin/dashboard` — verified live against local Postgres with both a CLIENT and a SUPERADMIN account
- [x] ~~Decided: full `clients.id` (UUID) used as-is, no shorter derived form~~ — **superseded 2026-08-14**: the full UUID proved too long/unwieldy to hand out as a login in practice. Added `clients.clientNumber` (short, e.g. `CL-0001`, assigned via a Postgres sequence default so every insert path gets one automatically) and switched `users.email` for CLIENT accounts to store that instead of the raw UUID. See migration `drizzle/0007_chief_rafael_vega.sql` and `docs/features/client-portal.md`.
- [x] Vitest coverage for the relaxed `loginSchema` (`lib/validations/api.test.ts`)
- [x] `docs/features/auth.md` updated

## Notes

- Depends on accounts actually existing with `users.email = clients.id` — see [[client-portal-provisioning-action]] and [[client-account-backfill-script]]
- `lib/auth/session.ts`, `lib/db/repositories/users.repository.ts` (`findByEmail`) are the other touchpoints
- `loginSchema`'s field was renamed from `email` to `identifier` — updated `tests/helpers/admin-auth.ts` (`#email` → `#identifier`) to match the new form field id
