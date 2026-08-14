---
id: client-portal-provisioning-action
title: Add "Create Portal Access" action for new/existing clients
status: done
owner: agent
feature_area: client-portal
created: 2026-08-14
---

## Task

Admins can already create a user with role `CLIENT` via `lib/actions/admin/users.ts:createUser`, but it never links back to a `clients` row (`clients.userId` stays null) and requires manually typing a login + password. Added a per-client action — buttons on `app/admin/clients/[id]/client-detail-client.tsx` — that provisions or resets portal access for one client on demand: generates the login (`clients.id`, per [[client-login-by-client-id]]) and a random password, hashes it, creates the `CLIENT` user, sets `clients.userId`, and shows the plaintext password once in a dialog.

Covers new clients going forward; the one-time backlog of existing clients without accounts is handled separately by [[client-account-backfill-script]].

## Acceptance criteria

- [x] New `adminRepository.createClientPortalUser` method creates the user and sets `clients.userId` in one `db.transaction`, re-checking `clients.userId IS NULL` inside the transaction to close the check-then-act race
- [x] Both server actions (`createClientPortalAccess`, `resetClientPortalAccessPassword` in `lib/actions/admin/clients.ts`) require `ADMIN`/`SUPERADMIN` via `requireActionRole` and write an audit log entry (`CREATE_PORTAL_ACCESS` / `RESET_PORTAL_PASSWORD`)
- [x] Clear `VALIDATION_ERROR` if `clients.userId` is already set — doesn't silently overwrite an existing account
- [x] Button toggles based on `client.userId`: "Create Portal Access" when absent, "Reset Portal Password" when present
- [x] Generated password (`randomBytes(9).toString("base64url")`, 12 chars) shown exactly once in a dismissable dialog (read-only inputs for login ID + password); never logged (audit log payload only stores `userId`, never the password) or persisted in plaintext (only the SHA-256 hash is stored)
- [x] `docs/features/client-portal.md` updated

## Notes

- Depends on [[client-login-by-client-id]] landing first (or in the same PR) so the generated login is actually usable — landed in this same session
- **Deviation from the original plan:** rather than reusing the existing SUPERADMIN-only, admin-types-the-password `resetUserPassword`/`user-management-client.tsx:131` flow verbatim, added a parallel `resetClientPortalAccessPassword` action scoped to `ADMIN`/`SUPERADMIN` (matching every other client-management action) that generates-and-shows-once the same way "Create Portal Access" does. Reusing the literal existing action would have meant a different role gate and a different UX (typed password vs. generated) for what is otherwise the same "manage this client's portal access" surface — kept the pattern (admin-triggered dialog) but not the exact function.
- Account creation and password-generation logic extracted into `lib/services/client-portal-provisioning.ts` (`provisionClientPortalAccount`, `resetClientPortalPassword`, `generateClientPortalPassword`) specifically so [[client-account-backfill-script]] can import and reuse it instead of duplicating
- Vitest coverage: `lib/services/client-portal-provisioning.test.ts` — NOT_FOUND / VALIDATION_ERROR (already-provisioned) guards, and the happy path for both provision and reset, with the admin repository mocked
- Live-verified via a headless-browser script against the dev server: created portal access for a real test client (`clients.userId` set, `users` row created with `role = 'CLIENT'` and `email = clients.id`), then reset its password and confirmed a new, different password was generated; audit log rows for both actions confirmed via psql, then all test state cleaned up
