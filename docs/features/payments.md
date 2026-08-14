# Feature: Payments

**Status:** Implemented

## What exists

- Record a payment: `app/admin/payments/new/page.tsx`
- Payment list / transactions: `app/admin/payments/page.tsx`
- Payment summary view: `app/admin/payments/summary/page.tsx`
- Server actions: `lib/actions/admin/payments.ts`
- Payment types: `REGULAR`, `ADVANCE`, `PENALTY` (`paymentTypeEnum`)
- Payment methods: `CASH`, `GCASH`, `BANK_TRANSFER`, `OTHER` (`paymentMethodEnum`)
- Payment event audit trail (created/updated/soft-deleted): `lib/domain/payment-events.ts`, `paymentEventTypeEnum`
- Client self-service read access: `app/api/client/payments/route.ts`

## Related

- PRD: `docs/product/PRD_BRD.md` §4 (Payments)
