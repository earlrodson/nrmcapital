# Feature: Investors & Funding

**Status:** Implemented

## What exists

- Investor list/detail: `app/admin/investors/page.tsx`, `app/admin/investors/[id]/page.tsx`
- Server actions: `lib/actions/admin/investors.ts`
- Funding transactions (deposit/withdrawal): `app/admin/funding/add/page.tsx`, `app/admin/funding/withdraw/page.tsx`, `fundingTransactionTypeEnum`
- Schema: `investors` table, `funding_transactions` table

## Related

- PRD: `docs/product/PRD_BRD.md` §5 (Investors & funding)
