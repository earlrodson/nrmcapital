# Feature: Auth

**Status:** Implemented

## What exists

- Staff login/session: `app/api/auth/login`, `logout`, `me`, `refresh` (`app/api/auth/*/route.ts`)
- Session handling: `lib/auth/session.ts`
- Password hashing: `lib/auth/password.ts`
- Shared login page for staff and clients: `app/login/page.tsx`, `components/login/login-form.tsx` — single "Email or Client Number" identifier field (`loginSchema` in `lib/validations/api.ts` accepts either shape). Staff (`ADMIN`/`SUPERADMIN`) sign in with their `users.email`; `CLIENT` accounts sign in with their `clients.clientNumber` (short, e.g. `CL-0001` — not the raw `clients.id` UUID, which was too long to use as a login), stored in `users.email` for that role.
- Route-level auth guard: `lib/api/auth-guard.ts`
- Roles: `SUPERADMIN`, `ADMIN`, `CLIENT` (`drizzle/schema.ts` — `roleEnum`)
- Edge-of-request route separation: `proxy.ts` (this Next.js version's `middleware.ts` replacement — Node.js runtime by default). Redirects unauthenticated requests to `/login`, `CLIENT` sessions off `/admin/**` to `/client/dashboard`, and staff sessions off `/client/**` to `/admin/dashboard`.
- Login rate limiting: `lib/auth/login-throttle.ts` + `lib/db/repositories/login-throttle.repository.ts` (`login_throttles` table). Locks out an identifier or source IP independently after 5 failed `/api/auth/login` attempts within a 15-minute window, for a 15-minute lock; a successful login clears that identifier's counter. Throttled requests get a generic 429 `TOO_MANY_ATTEMPTS`.
- Password recovery: **admin-mediated only, no self-service flow.** There is no "Forgot password?" link on the login page — removed rather than left dead, since clients have no verified email/phone/2FA channel to safely gate a self-service reset behind. An `ADMIN`/`SUPERADMIN` regenerates a client's password via "Reset Portal Password" on the client detail page (see `docs/features/client-portal.md`) and relays it to the client out-of-band; there is no automated delivery channel (SMS/email) built for this.

## Related

- PRD: `docs/product/PRD_BRD.md` §1 (Auth)
- Architecture: `documents/ARCHITECTURE.MD` §2 (Route Model)
