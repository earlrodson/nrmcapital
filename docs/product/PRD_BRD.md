# NRM Lending — Product & Business Requirements

> Combined PRD/BRD. Update when scope changes; this is a living doc, not a point-in-time artifact.

## Business context

NRM Lending is an internal lending-management platform for a private lending operation. It replaces spreadsheet-based tracking of loans, clients, investors, and payments with a single system of record.

**Who uses it:**
- **Staff (SUPERADMIN / ADMIN)** — originate and manage loans, record payments, track investor capital, run reports.
- **Clients (CLIENT role)** — borrowers who can self-serve: view their loan(s), payment history, and submit loan applications.

## Problem statement

Loan terms, payment schedules, and investor capital tracking were previously manual/spreadsheet-driven, which does not scale and is error-prone for money math (rounding, amortization). The platform centralizes this with:
- Decimal-precise interest/amortization calculations (`lib/domain/loan-calculations.ts`)
- A single audit trail for every mutation (`audit_logs` table)
- Role-scoped access so client-facing and staff-facing data never mix

## Core entities (business language)

| Entity | Business meaning |
|---|---|
| Client | A borrower; may have an associated user login for self-service |
| Loan | A lending agreement with a client — principal, rate, term, type (FLAT or DIMINISHING) |
| Payment Schedule | The expected term-by-term repayment plan for a loan |
| Payment | An actual transaction against a schedule (REGULAR, ADVANCE, PENALTY) |
| Investor | A capital source funding loans, tracked separately from clients |
| Funding Transaction | A deposit/withdrawal of investor capital |
| Loan Application | A borrower-submitted request, reviewed by staff (PENDING/APPROVED/REJECTED) |

## Functional requirements (by area)

Each area below has a matching "done" inventory in `docs/features/<area>.md` — that file is the source of truth for what's actually implemented; this section states intent, not status.

1. **Auth** — staff and client login are separate sessions; a client session must never carry admin privileges.
2. **Client management** — create/view/edit client records, attach supporting documents.
3. **Loan management** — originate loans, compute amortization, track status (ACTIVE/COMPLETED/DEFAULTED), auto-reconcile client active state from loan balances.
4. **Payments** — record payments against a schedule, view transaction history, generate payment summaries.
5. **Investors & funding** — track investor capital, record deposits/withdrawals.
6. **Applications** — public-facing loan application intake, staff review/approval workflow.
7. **Reports** — exportable reports on loans, payments, investors.
8. **Admin settings** — user/role management, system settings, audit log visibility.

## Non-functional requirements

- All currency math uses `Decimal.js` — no floating-point money (see `documents/CODING-STANDARDS.MD`).
- Every mutating action is validated at the boundary with Zod and recorded to `audit_logs`.
- Strict TypeScript, no `any` (enforced — see `tsconfig.json`, CI typecheck job).

## Out of scope (explicitly)

- Multi-tenant support (single lending operation only, as of this writing).
- Automated payment collection/disbursement integrations — payments are recorded manually by staff.

## Change log

- 2026-08-14 — Initial PRD/BRD authored from current codebase state (retroactive baseline).
