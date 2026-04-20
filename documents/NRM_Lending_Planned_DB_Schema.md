# NRM Lending Planned DB Schema

Source of truth consolidated from:
- `documents/NRM_Lending_Dev_Spec.md`
- `documents/NRM_Lending_Architecture.md`

This document captures the planned PostgreSQL + Prisma schema for the lending system, including enums, models, and relationship intent.

## Schema Summary

### Enums
- `Role`: `SUPERADMIN`, `ADMIN`, `CLIENT`
- `LoanType`: `FLAT`, `DIMINISHING`
- `LoanStatus`: `ACTIVE`, `COMPLETED`, `DEFAULTED`
- `PaymentFrequency`: `MONTHLY`, `SEMI_MONTHLY`, `WEEKLY`
- `PaymentMethod`: `CASH`, `GCASH`, `BANK_TRANSFER`, `OTHER`
- `PaymentType`: `REGULAR`, `ADVANCE`, `PENALTY`
- `FundingTransactionType`: `DEPOSIT`, `WITHDRAWAL`
- `AttachmentType`: `GOV_ID`, `PROOF_OF_INCOME`, `PROOF_OF_BILLING`, `CONTRACT`, `OTHER`

### Core Models
- `User`: identity & authentication (plural: `users`)
- `Client`: borrower profile linked to user (plural: `clients`)
- `Attachment`: client document storage (plural: `attachments`)
- `Investor`: funding source (plural: `investors`)
- `Loan`: main loan contract (plural: `loans`)
- `PaymentSchedule`: installment due dates (plural: `payment_schedules`)
- `Payment`: payment ledger (plural: `payments`)
- `FundingTransaction`: capital pool ledger (plural: `funding_transactions`)
- `SystemSetting`: dynamic configuration (plural: `system_settings`)
- `AuditLog`: mutation audit trail (plural: `audit_logs`)

### Relation Overview
- `User` 1..1 `Client` via `Client.user_id`
- `User` 1..* `Attachment` via `Attachment.uploaded_by_id`
- `User` 1..* `Loan` via `Loan.created_by_id`
- `User` 1..* `Payment` via `Payment.recorded_by_id`
- `User` 1..* `FundingTransaction` via `FundingTransaction.recorded_by_id`
- `User` 1..* `SystemSetting` via `SystemSetting.updated_by_id` (optional)
- `User` 1..* `AuditLog` via `AuditLog.user_id`
- `Client` 1..* `Loan` via `Loan.client_id`
- `Client` 1..* `Attachment` via `Attachment.client_id`
- `Investor` 1..* `Loan` via `Loan.investor_id` (optional)
- `Investor` 1..* `FundingTransaction` via `FundingTransaction.investor_id` (optional)
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
  CLIENT
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

enum FundingTransactionType {
  DEPOSIT
  WITHDRAWAL
}

enum AttachmentType {
  GOV_ID
  PROOF_OF_INCOME
  PROOF_OF_BILLING
  CONTRACT
  OTHER
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
  funding_recorded  FundingTransaction[] @relation("FundingRecordedBy")
  attachments_uploaded Attachment[] @relation("AttachmentUploadedBy")
  settings_updated  SystemSetting[] @relation("SystemSettingUpdatedBy")
  audit_logs        AuditLog[]
  client_profile    Client?

  @@map("users")
}

model Client {
  id             String    @id @default(cuid())
  user_id        String?   @unique
  first_name     String
  last_name      String
  contact_number String?
  address        String?
  id_type        String?
  id_number      String?
  notes          String?
  is_active      Boolean   @default(true)
  created_at     DateTime  @default(now())
  updated_at     DateTime  @updatedAt
  deleted_at     DateTime?
  
  user           User?     @relation(fields: [user_id], references: [id])
  loans          Loan[]
  attachments    Attachment[]

  @@map("clients")
}

model Attachment {
  id          String         @id @default(cuid())
  client_id   String
  type        AttachmentType @default(OTHER)
  storage_key String
  file_name   String?
  uploaded_by_id String
  created_at  DateTime       @default(now())
  updated_at  DateTime       @updatedAt
  
  client      Client         @relation(fields: [client_id], references: [id])
  uploaded_by User           @relation("AttachmentUploadedBy", fields: [uploaded_by_id], references: [id])

  @@map("attachments")
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
  funding_transactions FundingTransaction[]

  @@map("investors")
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
  total_interest        Decimal           @db.Decimal(12, 2)
  total_payable         Decimal           @db.Decimal(12, 2)
  amortization_amount   Decimal           @db.Decimal(12, 2)
  loan_date             DateTime
  disbursement_date     DateTime?
  expected_end_date     DateTime
  actual_end_date       DateTime?
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

  @@map("loans")
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
  updated_at    DateTime  @updatedAt
  
  loan          Loan      @relation(fields: [loan_id], references: [id])
  payments      Payment[]

  @@map("payment_schedules")
}

model Payment {
  id                   String           @id @default(cuid())
  loan_id              String
  payment_schedule_id  String?
  amount               Decimal          @db.Decimal(12, 2)
  payment_type         PaymentType      @default(REGULAR)
  payment_method       PaymentMethod    @default(CASH)
  payment_date         DateTime         @default(now())
  penalty_reason       String?
  notes                String?
  recorded_by_id       String
  
  loan                 Loan             @relation(fields: [loan_id], references: [id])
  payment_schedule     PaymentSchedule? @relation(fields: [payment_schedule_id], references: [id])
  recorded_by          User             @relation("PaymentRecordedBy", fields: [recorded_by_id], references: [id])

  @@map("payments")
}

model FundingTransaction {
  id               String                 @id @default(cuid())
  investor_id      String?
  transaction_type FundingTransactionType
  amount           Decimal                @db.Decimal(12, 2)
  transaction_date DateTime               @default(now())
  reference_number String?
  notes            String?
  recorded_by_id   String
  
  investor         Investor?              @relation(fields: [investor_id], references: [id])
  recorded_by      User                   @relation("FundingRecordedBy", fields: [recorded_by_id], references: [id])

  @@map("funding_transactions")
}

model SystemSetting {
  id            String   @id @default(cuid())
  setting_key   String   @unique
  value         String
  description   String?
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt
  updated_by_id String?

  updated_by    User?    @relation("SystemSettingUpdatedBy", fields: [updated_by_id], references: [id])

  @@map("system_settings")
}

model AuditLog {
  id         String   @id @default(cuid())
  user_id    String
  action     String
  entity     String
  entity_id  String
  payload    Json
  created_at DateTime @default(now())
  
  user       User     @relation(fields: [user_id], references: [id])

  @@map("audit_logs")
}
```

## Notes from Architecture Constraints

- Database is PostgreSQL and ORM is Prisma.
- Table names in PostgreSQL are pluralized (e.g., `users`, `clients`) using Prisma `@@map`.
- Financial amounts are modeled using decimal columns (`@db.Decimal(...)`) for precision.
- Audit trail is mandatory for critical mutations (`AuditLog` model).
- `estimated_interest` vs `total_interest` on `Loan`: the former is the projected amount at origination, the latter is the actual accrued amount updated per payment.

## MVP Decisions (Locked)

- Keep `Role.CLIENT` for portal-ready account modeling.
- Keep `Client.user_id` unique for 1-to-1 user profile linkage.
- Keep `Loan.client_id` non-unique so a client can have multiple loans.
- Keep `FundingTransaction.investor_id` nullable for unassigned transaction workflows.

## Minimum Index Plan

- `loans(client_id)`
- `loans(investor_id)`
- `loans(status)`
- `payment_schedules(loan_id, is_paid)`
- `payment_schedules(due_date)`
- `payments(loan_id)`
- `audit_logs(entity, entity_id)`
- `audit_logs(user_id)`

## Changelog

### MVP Review — 2025-04
- **Pluralization**: Added `@@map` to all models for plural table names in PostgreSQL.
- **Identity Link**: Added `user_id` to `Client` and `client_profile` to `User` for 1-to-1 login capability.
- **Client Status**: Added `is_active` to `Client` for admin control over borrowers with unpaid balances.
- **Attachments**: Added `attachments` table for client KYC document storage.
- **Funding**: Added `funding_transactions` for a proper ledger of deposits and withdrawals.
- **System Settings**: Added `system_settings` for dynamic business rule configuration.
