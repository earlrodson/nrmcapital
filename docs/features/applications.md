# Feature: Loan Applications

**Status:** Implemented

## What exists

- Public application intake: `app/apply/page.tsx`, `lib/actions/applications.ts`
- Staff review queue: `app/admin/applications/page.tsx`, `lib/actions/admin/applications.ts`
- Status lifecycle: `PENDING` / `APPROVED` / `REJECTED` (`applicationStatusEnum`)
- Schema: `loanApplications` table, linked to `applicantUserId`

## Related

- PRD: `docs/product/PRD_BRD.md` §6 (Applications)
