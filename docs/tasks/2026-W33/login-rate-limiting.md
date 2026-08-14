---
id: login-rate-limiting
title: Add rate limiting to /api/auth/login
status: done
owner: agent
feature_area: auth
created: 2026-08-14
---

## Task

`app/api/auth/login/route.ts` has no throttling — confirmed no rate-limit implementation exists anywhere in `lib/` or `app/`. This matters more once CLIENT accounts log in with `clients.id` (see [[client-login-by-client-id]]) instead of a private email: the identifier is a structured UUID tied to a visible record rather than a secret a client picked, so credential-stuffing / brute-force against the password becomes the only real barrier. Added per-identifier and per-IP throttling to `/api/auth/login`, backed by a new `login_throttles` Postgres table.

## Acceptance criteria

- [x] Failed attempts are throttled per identifier (lock out after 5 failures within a 15-minute window) and per source IP independently — `lib/auth/login-throttle.ts`
- [x] Throttle state persists in Postgres (`login_throttles` table, `drizzle/0006_dear_blink.sql`) rather than in-memory — no serverless/multi-instance deployment config found in the repo (no `vercel.json`/`Dockerfile`/etc.), but DB-backed state survives dev-server restarts and is trivially correct if the deployment target changes later
- [x] Successful login clears the failure counter for that identifier only (verified live: IP counter is left intact, identifier row is deleted)
- [x] Generic error response either way: invalid credentials → 401 `INVALID_CREDENTIALS` regardless of whether the identifier exists; throttled → 429 `TOO_MANY_ATTEMPTS` with no remaining-attempts count leaked
- [x] Vitest coverage for the throttle boundary: `lib/auth/login-throttle.test.ts` — Nth attempt allowed, N+1th blocked, still-locked mid-window, unlocks after window elapses, counter resets after window/lock expiry

## Notes

- Landed after [[client-login-by-client-id]] and [[route-middleware-admin-client-separation]], before [[client-account-backfill-script]], per the plan
- Throttle decision/transition logic (`isThrottleStateLocked`, `nextThrottleStateAfterFailure` in `lib/auth/login-throttle.ts`) is kept pure and separate from the Drizzle-backed `lib/db/repositories/login-throttle.repository.ts`, so the boundary is unit-testable without a live DB (test file mocks `@/lib/db/client` the same way `loan-status.repository.test.ts` does)
- `/api/auth/refresh` reads an existing signed session cookie rather than accepting attacker-supplied credentials, so it isn't exposed to the same brute-force risk and was left untouched
- Live-verified via curl against the dev server: 5 failed attempts for one identifier returned 401, the 6th returned 429; a different identifier from the same IP was also blocked (per-IP throttle firing independently); a correct admin login cleared only the identifier's counter, leaving the IP counter's fail count intact
