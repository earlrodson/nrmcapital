---
id: route-middleware-admin-client-separation
title: Add middleware to separate /admin and /client routing by role
status: done
owner: agent
feature_area: auth
created: 2026-08-14
---

## Task

There is no `middleware.ts` in the repo today — auth is only enforced at the API-route level (`requireRole` in `lib/api/auth-guard.ts`), and page shells (`app/admin/layout.tsx`, `app/client/layout.tsx`) render before any redirect happens, relying on a client-side fetch (`/api/auth/me`) to bounce unauthenticated/wrong-role users. That means an ADMIN session can still load `/client/dashboard`'s shell (even though `/api/client/*` would 403 it) and a CLIENT session briefly renders `/admin/*` chrome before the client-side check kicks in.

Added a root `proxy.ts` (this Next.js version's `middleware.ts` replacement — see Notes) that reads the session cookie (`lib/auth/session.ts`) and redirects at the edge:
- Unauthenticated → `/login` for both `/admin/**` and `/client/**`
- `CLIENT` role hitting `/admin/**` → redirect to `/client/dashboard`
- `ADMIN`/`SUPERADMIN` hitting `/client/**` → redirect to `/admin/dashboard`

## Acceptance criteria

- [x] `proxy.ts` at repo root with `matcher` scoped to `/admin/:path*` and `/client/:path*`
- [x] Session check reuses `lib/auth/session.ts` — extracted `getSessionUserFromToken(token)` out of `getSessionUser()` so `proxy.ts` can pass in `request.cookies.get(...)` directly instead of relying on `next/headers`'s `cookies()`, which isn't valid in this context
- [x] `app/client/layout.tsx`'s client-side redirect-on-error logic removed; the `/api/auth/me` fetch is now display-only (for the header name)
- [x] Manual check via curl + cookies against local Postgres: unauthenticated → `/login`; CLIENT → `/admin/dashboard` bounces to `/client/dashboard`; ADMIN → `/client/dashboard` bounces to `/admin/dashboard`; same-role access returns 200 in both directions
- [x] Playwright e2e coverage: `tests/proxy-route-separation.spec.ts` (unauthenticated, wrong-role CLIENT, wrong-role ADMIN cases)
- [x] `docs/features/auth.md` updated

## Notes

- **Correction from the original plan:** this Next.js version deprecated `middleware.ts` in favor of `proxy.ts` (same file-convention slot, function renamed `proxy`). More importantly, **Proxy defaults to the Node.js runtime here, not Edge** (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`), so the `node:crypto` concern that blocked this task in planning doesn't apply — `lib/auth/session.ts`'s `createHmac`/`timingSafeEqual` usage works as-is.
- `tests/helpers/admin-auth.ts` and `tests/auth.spec.ts` both had a stale `#email` selector fixed to `#identifier` (from [[client-login-by-client-id]]'s form field rename) while touching this area.
