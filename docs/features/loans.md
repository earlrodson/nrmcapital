# Feature: Loan Management

**Status:** Implemented

## What exists

- List/create/view loans: `app/admin/loans/page.tsx`, `app/admin/loans/new/page.tsx`, `app/admin/loans/[id]/page.tsx`
- Server actions: `lib/actions/admin/loans.ts`
- Business logic: `lib/services/loans.service.ts`
- Amortization/interest math (FLAT and DIMINISHING): `lib/domain/loan-calculations.ts` — unit-tested (`lib/domain/loan-calculations.test.ts`)
- Payment schedule generation tied to loan terms: `paymentSchedules` table
- Loan status lifecycle: `ACTIVE` / `COMPLETED` / `DEFAULTED` (`loanStatusEnum`)
- Loan status / client active-state auto-reconcile (per commit `56436c4`) — loan balance changes propagate to `clients.isActive` automatically. Separate from the manual "Deferred" client flag (see `docs/features/clients.md`), which an admin sets/removes explicitly.
- Client self-service read access: `app/api/client/loans/route.ts`, `app/api/client/loans/[id]/route.ts`

## Related

- PRD: `docs/product/PRD_BRD.md` §3 (Loan management)
- Architecture: `documents/ARCHITECTURE.MD` (Domain Logic layer)
