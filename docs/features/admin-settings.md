# Feature: Admin Settings

**Status:** Implemented

## What exists

- User/role management: `app/admin/settings/users/page.tsx`, `lib/actions/admin/users.ts`
- Staff profile settings: `app/admin/settings/profile/page.tsx`
- System settings: `app/api/admin/settings/route.ts`
- Audit log viewer: `app/api/admin/audit-logs/route.ts`, `audit_logs` table (mandatory on mutations per `documents/ARCHITECTURE.MD`)
- Dashboard + activity feed: `app/admin/dashboard/page.tsx`, `app/admin/dashboard/activity/page.tsx`

## Related

- PRD: `docs/product/PRD_BRD.md` §8 (Admin settings)
