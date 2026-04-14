# NRM Lending Planned DB Schema

Source of truth consolidated from:
- `documents/NRM_Lending_Dev_Spec.md`
- `documents/NRM_Lending_Architecture.md`

This document captures the planned PostgreSQL + Prisma schema for the lending system, including enums, models, and relationship intent.

## Schema Summary

### Enums
- `Role`: `SUPERADMIN`, `ADMIN`
- `LoanType`: `FLAT`, `DIMINISHING`
- `LoanStatus`: `ACTIVE`, `COMPLETED`, `DEFAULTED`
- `PaymentFrequency`: `MONTHLY`, `SEMI_MONTHLY`, `WEEKLY`
- `PaymentMethod`: `CASH`, `GCASH`, `BANK_TRANSFER`, `OTHER`
- `PaymentType`: `REGULAR`, `ADVANCE`, `PENALTY`

### Core Models
- `User`: admin accounts, role-based access
- `Client`: borrower profile
- `Investor`: funding source
- `Loan`: main loan contract and computed financial fields
- `PaymentSchedule`: installment due dates and status, with principal/interest breakdown
- `Payment`: payment ledger (regular/advance/penalty), linked to schedule term
- `AuditLog`: mutation audit trail

### Relation Overview
- `User` 1..* `Loan` via `Loan.created_by_id`
- `User` 1..* `Payment` via `Payment.recorded_by_id`
- `User` 1..* `AuditLog` via `AuditLog.user_id`
- `Client` 1..* `Loan` via `Loan.client_id`
- `Investor` 1..* `Loan` via `Loan.investor_id` (optional)
- `Loan` 1..* `PaymentSchedule` via `PaymentSchedule.loan_id`
- `Loan` 1..* `Payment` via `Payment.loan_id`
- `PaymentSchedule` 1..* `Payment` via `Payment.payment_schedule_id` (optional)

## Planned Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  SUPERADMIN
  ADMIN
}

enum LoanType {
  FLAT
  DIMINISHING
}

enum LoanStatus {
  ACTIVE
  COMPLETED
  DEFAULTED
}

enum PaymentFrequency {
  MONTHLY
  SEMI_MONTHLY
  WEEKLY
}

enum PaymentMethod {
  CASH
  GCASH
  BANK_TRANSFER
  OTHER
}

enum PaymentType {
  REGULAR
  ADVANCE
  PENALTY
}

model User {
  id                String     @id @default(cuid())
  email             String     @unique
  password_hash     String
  name              String
  role              Role       @default(ADMIN)
  is_active         Boolean    @default(true)
  last_login_at     DateTime?
  created_at        DateTime   @default(now())
  updated_at        DateTime   @updatedAt
  loans_created     Loan[]     @relation("LoanCreatedBy")
  payments_recorded Payment[]  @relation("PaymentRecordedBy")
  audit_logs        AuditLog[]
}

model Client {
  id             String    @id @default(cuid())
  full_name      String
  contact_number String?
  address        String?
  id_type        String?
  id_number      String?
  notes          String?
  created_at     DateTime  @default(now())
  updated_at     DateTime  @updatedAt
  deleted_at     DateTime?
  loans          Loan[]
}

model Investor {
  id                  String   @id @default(cuid())
  name                String
  capital_amount      Decimal? @db.Decimal(12, 2)
  interest_share_rate Decimal? @db.Decimal(5, 2)
  notes               String?
  is_active           Boolean  @default(true)
  created_at          DateTime @default(now())
  updated_at          DateTime @updatedAt
  loans               Loan[]
}

model Loan {
  id                    String            @id @default(cuid())
  client_id             String
  investor_id           String?
  loan_type             LoanType          @default(FLAT)
  principal_amount      Decimal           @db.Decimal(12, 2)
  monthly_interest_rate Decimal           @db.Decimal(5, 2)
  months                Int
  terms_per_month       Int
  total_terms           Int
  payment_frequency     PaymentFrequency
  estimated_interest    Decimal           @db.Decimal(12, 2)
  // estimated_interest = projected interest at origination (pre-computed)
  // total_interest     = actual interest accrued to date (updated on payment)
  // These will diverge for DIMINISHING loans after early or advance payments.
  total_interest        Decimal           @db.Decimal(12, 2)
  total_payable         Decimal           @db.Decimal(12, 2)
  amortization_amount   Decimal           @db.Decimal(12, 2)
  loan_date             DateTime
  disbursement_date     DateTime?
  expected_end_date     DateTime
  status                LoanStatus        @default(ACTIVE)
  outstanding_balance   Decimal           @db.Decimal(12, 2)
  total_paid            Decimal           @default(0) @db.Decimal(12, 2)
  created_by_id         String
  created_at            DateTime          @default(now())
  updated_at            DateTime          @updatedAt
  notes                 String?
  client                Client            @relation(fields: [client_id], references: [id])
  investor              Investor?         @relation(fields: [investor_id], references: [id])
  created_by            User              @relation("LoanCreatedBy", fields: [created_by_id], references: [id])
  payments              Payment[]
  payment_schedule      PaymentSchedule[]
}

model PaymentSchedule {
  id            String    @id @default(cuid())
  loan_id       String
  term_number   Int
  due_date      DateTime
  amount_due    Decimal   @db.Decimal(12, 2)
  principal_due Decimal   @db.Decimal(12, 2)
  interest_due  Decimal   @db.Decimal(12, 2)
  is_paid       Boolean   @default(false)
  paid_at       DateTime?
  loan          Loan      @relation(fields: [loan_id], references: [id])
  payments      Payment[]
}

model Payment {
  id                   String           @id @default(cuid())
  loan_id              String
  payment_schedule_id  String?
  amount               Decimal          @db.Decimal(12, 2)
  payment_type         PaymentType      @default(REGULAR)
  payment_method       PaymentMethod    @default(CASH)
  payment_date         DateTime         @default(now())
  notes                String?
  recorded_by_id       String
  loan                 Loan             @relation(fields: [loan_id], references: [id])
  payment_schedule     PaymentSchedule? @relation(fields: [payment_schedule_id], references: [id])
  recorded_by          User             @relation("PaymentRecordedBy", fields: [recorded_by_id], references: [id])
}

model AuditLog {
  id         String   @id @default(cuid())
  user_id    String
  action     String
  entity     String
  entity_id  String
  // Recommended payload shape: { before: {...}, after: {...} }
  payload    Json
  created_at DateTime @default(now())
  user       User     @relation(fields: [user_id], references: [id])
}
```

## Notes from Architecture Constraints

- Database is PostgreSQL and ORM is Prisma.
- Financial amounts are modeled using decimal columns (`@db.Decimal(...)`) for precision.
- Mutations are expected to be transaction-safe for multi-write operations (`$transaction` usage in services/actions). This is especially critical for `Payment` inserts that must atomically update `Loan.outstanding_balance` and `Loan.total_paid`.
- Audit trail is mandatory for critical mutations (`AuditLog` model). Recommended `payload` shape is `{ before: {...}, after: {...} }` for rollback and compliance queries.
- `Client.deleted_at` enables soft-delete; filter active clients with `WHERE deleted_at IS NULL`.
- `estimated_interest` vs `total_interest` on `Loan`: the former is the projected amount at origination, the latter is the actual accrued amount updated per payment. These diverge for `DIMINISHING` loans after early or advance payments.

## Changelog

### MVP Review — 2025-04
- **`PaymentSchedule`**: Added `principal_due` and `interest_due` for per-term principal/interest breakdown (required for `DIMINISHING` loan accuracy).
- **`Payment`**: Added optional `payment_schedule_id` FK to `PaymentSchedule` to link payments to specific schedule terms. Without this, reconciliation requires fragile date/amount matching.
- **`Investor`**: Added `capital_amount` and `interest_share_rate` fields. Added missing `updated_at`.
- **`Client`**: Added `id_type` and `id_number` for KYC. Added `deleted_at` for soft-delete.
- **`Loan`**: Added `disbursement_date` (distinct from `loan_date`). Added inline comments clarifying `estimated_interest` vs `total_interest` divergence.
- **`User`**: Added `last_login_at` for access auditing.
- **Relations**: Added `Loan` → `PaymentSchedule` → `Payment` link in Relation Overview.
