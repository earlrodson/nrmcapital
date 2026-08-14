---
id: client-password-recovery-and-delivery
title: Client password recovery flow and initial-credential delivery
status: done
owner: agent
feature_area: client-portal
created: 2026-08-14
---

## Task

Two related gaps in the password lifecycle for client accounts:

1. **No self-service recovery.** `components/login/login-form.tsx` had a "Forgot password?" link pointing at `href="#"` — dead. Once real clients start using generated passwords ([[client-portal-provisioning-action]], [[client-account-backfill-script]]) they will lose them, and the only reset path was an admin-driven one buried in the `SUPERADMIN`-only `app/admin/settings/users` page — not discoverable from the client-detail page an admin would actually be looking at.
2. **No decided delivery channel for initial credentials.** The provisioning action shows a generated password once in an admin-facing dialog, but `clients` has no email field, so there's no automated way to get that password to the client. Needed a product decision: read aloud in person, SMS to `clients.contactNumber`, printed slip, or something else.

## Acceptance criteria

- [x] Delivery channel decided and documented (see Notes) — **admin-mediated, out-of-band, manual delivery**. No automated channel (SMS/email) is built. Rationale: `clients` has no verified email column, `contactNumber` is unverified free text with no delivery-receipt guarantee, and there's no SMS provider integrated anywhere in the codebase — building one for this alone would be infra scope creep ahead of actual need. The admin who runs "Create Portal Access" / "Reset Portal Password" (both already implemented in [[client-portal-provisioning-action]]) reads the one-time dialog and relays the Client ID + password to the client directly (in person, phone call, or whatever channel that admin already uses with that client) — the same trust boundary the business already operates on for every other client interaction.
- [x] "Reset Portal Password" action on `app/admin/clients/[id]/client-detail-client.tsx` — **already shipped** as part of [[client-portal-provisioning-action]] in this same session (`resetClientPortalAccessPassword`), so this AC was satisfied before this task started
- [x] Self-service vs. admin-mediated decided: **stays admin-mediated only**, no self-service "forgot password" flow added. Clients authenticate with `clients.id` as the login (a non-secret, visible UUID) and have no verified email or phone/2FA channel today, so there is no safe way to gate a self-service reset behind an identity check a client — but not an attacker holding the same visible client ID — could pass. Revisit if/when clients get a verified contact channel.
- [x] Dead "Forgot password?" link removed from `components/login/login-form.tsx` (not replaced with a stub route) — matches the admin-mediated-only decision above; there is nothing for it to link to
- [x] Vitest coverage for the reset-password action: `lib/actions/admin/clients.test.ts` — `resetClientPortalAccessPassword` regenerates the password via the mocked service and requires `ADMIN`/`SUPERADMIN` (rejects `CLIENT` role and no-session), asserting the audit log call; companion coverage for `createClientPortalAccess`. Password-regeneration/hash-invalidation behavior itself is covered separately in `lib/services/client-portal-provisioning.test.ts` (from [[client-portal-provisioning-action]])

## Notes

- Depends on [[client-login-by-client-id]] and [[client-portal-provisioning-action]] landing first — both done in this session
- Related to [[login-rate-limiting]] — moot for now since there's no self-service recovery endpoint to abuse; revisit if a self-service flow is added later
- If credential-delivery volume or client count grows enough to justify automating this (e.g. SMS), that decision should go through `DECISIONS.md` since it's an infra/vendor choice — not made here since the manual/admin-mediated path is sufficient for current scale
