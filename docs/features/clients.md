# Feature: Client Management

**Status:** Implemented

## What exists

- List/create/edit clients: `app/admin/clients/page.tsx`, `app/admin/clients/new/page.tsx`, `app/admin/clients/[id]/page.tsx`
- Server actions: `lib/actions/admin/clients.ts`
- Schema: `clients` table (`drizzle/schema.ts`) — linked to `users` via `userId`
- Attachments (supporting documents): `attachments` table, `app/api/admin/attachments/[id]/view/route.ts`, upload via `app/api/admin/upload/{file,presign}/route.ts` (S3-compatible, `lib/api/s3.ts`)
- Deferred status: manual admin flag (`clients.deferred` + `deferredReason`/`deferredSetById`/`deferredSetAt`), toggled via "Set to Deferred" / "Remove Deferred" in the client list dropdown (`app/admin/clients/client-list-client.tsx`); filterable via `/admin/clients?status=deferred` and the sidebar "Deferred Clients" link. Independent of the auto-computed loan/active-state reconciliation in `docs/features/loans.md`.

## Related

- PRD: `docs/product/PRD_BRD.md` §2 (Client management)
