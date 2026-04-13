# NRM Lending — Full Development Specification

> **Version:** 1.0  
> **Source:** Reverse-engineered from `NRM_Lending.xlsx` (13 sheets)  
> **Stack:** Next.js (App Router) · PostgreSQL · Prisma · NextAuth.js  
> **Deployment:** Railway or Render (Phase 1) → VPS + Docker (Phase 2)

---

## Table of Contents

1. [Business Overview](#1-business-overview)
2. [Interest Rate System](#2-interest-rate-system)
3. [Exact Computation Formulas](#3-exact-computation-formulas)
4. [Penalty Policy](#4-penalty-policy)
5. [Payment Frequency Rules](#5-payment-frequency-rules)
6. [Database Schema](#6-database-schema)
7. [Business Rules & Validation](#7-business-rules--validation)
8. [API Routes / Server Actions](#8-api-routes--server-actions)
9. [Module Breakdown](#9-module-breakdown)
10. [Folder Structure](#10-folder-structure)
11. [Auth & Roles](#11-auth--roles)
12. [Dashboard Metrics](#12-dashboard-metrics)
13. [Audit Logging](#13-audit-logging)
14. [Development Priorities](#14-development-priorities)
15. [Post-MVP Features](#15-post-mvp-features)
16. [Non-Functional Requirements](#16-non-functional-requirements)
17. [Environment Variables](#17-environment-variables)

---

## 1. Business Overview

**NRM Lending** is a private lending business offering personal, business, student, and emergency loans. The system manages the full loan lifecycle: creation, payment tracking, balance computation, and completion.

**Key facts from the data:**
- Borrowers can have **multiple concurrent active loans**
- Loans are tracked per **investor/fund source** (e.g. different lenders pool funds)
- Payments can be made **monthly, semi-monthly, or weekly**
- Payments can be **advance** (ahead of schedule) — system must handle this
- Payments are recorded with a **channel** (cash, GCash, bank transfer)
- Interest rate is **automatically determined by the loan term in months**
- Status is **auto-computed** from the outstanding balance (`active` if balance > 0, `completed` if balance = 0)

---

## 2. Interest Rate System

The interest rate is **automatically assigned** based on the number of months the borrower chooses. There is no manual rate selection for flat-rate loans — the term drives the rate.

### Flat-Rate Tiers (Loans A–E)

| Loan Type | Term Range | Monthly Interest Rate |
|-----------|------------|----------------------|
| Loan A    | 1 – 6 months  | **7%** |
| Loan B    | 7 – 9 months  | **6%** |
| Loan C    | 10 – 12 months | **5%** |
| Loan D    | 13 – 15 months | **4%** |
| Loan E    | 16 – 17 months | **3%** |
| Invalid   | 18+ months    | Reject / not allowed |

### Diminishing Balance Loan (Loan D – special type)

- Fixed rate: **9% per month** applied to the **remaining principal** each month
- Available only for borrowers in Loan Types A, B, or C (per policy)
- Interest decreases every month as the principal is paid down

**Implementation note:** Store `loan_type` as an enum: `FLAT` or `DIMINISHING`. The tiered rate for FLAT loans is computed at loan creation and stored. Never recompute from term after creation.

---

## 3. Exact Computation Formulas

These formulas are extracted directly from the Excel formulas in the source file.

### 3.1 Flat-Rate Computation

```
function getMonthlyRate(months: number): number {
  if (months >= 1  && months <= 6)  return 7;
  if (months >= 7  && months <= 9)  return 6;
  if (months >= 10 && months <= 12) return 5;
  if (months >= 13 && months <= 15) return 4;
  if (months >= 16 && months <= 17) return 3;
  throw new Error("Invalid term: max 17 months");
}

// Core computation
const monthly_rate    = getMonthlyRate(months);           // e.g. 7
const est_interest    = principal * (monthly_rate / 100); // interest per term
const total_interest  = est_interest * terms;             // terms = total number of payments
const total_payable   = principal + total_interest;

// Amortization breakdown
const amortization_monthly      = (principal / months) + est_interest;
const amortization_semi_monthly = amortization_monthly / 2;
const amortization_weekly       = amortization_semi_monthly / 2;
```

**Example — ₱5,000 loan, 3 months, semi-monthly payments (2×/month = 6 terms):**
```
monthly_rate    = 7%
est_interest    = 5000 × 0.07 = ₱350 per month
total_interest  = 350 × 3 = ₱1,050
total_payable   = 5000 + 1050 = ₱6,050
amortization (monthly)      = (5000 / 3) + 350 = ₱2,016.67
amortization (semi-monthly) = 2016.67 / 2 = ₱1,008.33
```

### 3.2 Diminishing Balance Computation

Interest is recalculated every month on the remaining principal.

```
function computeDiminishingSchedule(principal: number, months: number, rate = 9) {
  const principal_per_term = principal / months;
  let remaining = principal;
  const schedule = [];

  for (let i = 1; i <= months; i++) {
    const interest  = remaining * (rate / 100);
    const payment   = principal_per_term + interest;
    remaining       = remaining - principal_per_term;

    schedule.push({
      term:       i,
      interest:   interest,
      payment:    payment,
      remaining:  Math.max(remaining, 0),
    });
  }
  return schedule;
}
```

**Example — ₱20,000, 6 months, 9% diminishing:**
```
Month 1: interest = 20000 × 9% = 1800 | payment = 3333.33 + 1800 = 5133.33 | remaining = 16666.67
Month 2: interest = 16666.67 × 9% = 1500 | payment = 3333.33 + 1500 = 4833.33 | remaining = 13333.33
... (decreasing each month)
```

### 3.3 Outstanding Balance Tracking

```
outstanding_balance = total_payable - SUM(all recorded payments for this loan)
```

Loan status is derived:
```
status = outstanding_balance === 0 ? 'COMPLETED' : 'ACTIVE'
```

If a payment date has passed and the borrower hasn't paid, compute overdue:
```
is_overdue = (current_date > expected_payment_date) && outstanding_balance > 0
```

---

## 4. Penalty Policy

> Source: POLICY sheet — explicitly stated

**Rule:** A late payment incurs a penalty of **50% of the scheduled amortization amount**.

```
penalty_amount = scheduled_amortization × 0.50
```

**Rules:**
- Penalty is charged **per missed payment**, not per day
- Early repayment has **no penalty**
- Penalty amounts must be recorded as a separate `payment_type` entry in the payments table
- Penalty does **not** reduce the principal — it is an additional charge

**Implementation note:** When recording a late payment, the admin should be prompted to add the penalty as a separate payment record with `payment_type = 'PENALTY'`.

---

## 5. Payment Frequency Rules

| Frequency | Terms per Month | Notes |
|-----------|----------------|-------|
| Monthly | 1 | 1 payment per month |
| Semi-monthly | 2 | Every 15 days (most common in data) |
| Weekly | 4 | Every 7 days |

**`terms` field** = total number of payment installments = `months × terms_per_month`

**Example:** 3 months, semi-monthly → `terms = 3 × 2 = 6 payments`

The `terms_per_month` field must be stored on the loan record. It determines the amortization amount used and the penalty calculation base.

---

## 6. Database Schema

### Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ───────────────────────────────────────────────

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

// ─── Models ──────────────────────────────────────────────

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  password_hash String
  name          String
  role          Role     @default(ADMIN)
  is_active     Boolean  @default(true)
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  loans_created   Loan[]    @relation("LoanCreatedBy")
  payments_recorded Payment[] @relation("PaymentRecordedBy")
  audit_logs      AuditLog[]
}

model Client {
  id             String   @id @default(cuid())
  full_name      String
  contact_number String?
  address        String?
  notes          String?
  created_at     DateTime @default(now())
  updated_at     DateTime @updatedAt

  loans Loan[]
}

model Investor {
  id         String   @id @default(cuid())
  name       String
  notes      String?
  is_active  Boolean  @default(true)
  created_at DateTime @default(now())

  loans Loan[]
}

model Loan {
  id                    String           @id @default(cuid())
  client_id             String
  investor_id           String?

  // Loan parameters
  loan_type             LoanType         @default(FLAT)
  principal_amount      Decimal          @db.Decimal(12, 2)
  monthly_interest_rate Decimal          @db.Decimal(5, 2)  // stored as number e.g. 7.00 = 7%
  months                Int
  terms_per_month       Int              // 1 = monthly, 2 = semi-monthly, 4 = weekly
  total_terms           Int              // months × terms_per_month
  payment_frequency     PaymentFrequency

  // Computed at creation and stored
  estimated_interest    Decimal          @db.Decimal(12, 2)  // interest per term
  total_interest        Decimal          @db.Decimal(12, 2)  // estimated_interest × total_terms
  total_payable         Decimal          @db.Decimal(12, 2)  // principal + total_interest
  amortization_amount   Decimal          @db.Decimal(12, 2)  // per payment installment

  // Dates
  loan_date             DateTime
  expected_end_date     DateTime

  // Status
  status                LoanStatus       @default(ACTIVE)
  outstanding_balance   Decimal          @db.Decimal(12, 2)
  total_paid            Decimal          @default(0) @db.Decimal(12, 2)

  // Metadata
  created_by_id         String
  created_at            DateTime         @default(now())
  updated_at            DateTime         @updatedAt
  notes                 String?

  // Relations
  client                Client           @relation(fields: [client_id], references: [id])
  investor              Investor?        @relation(fields: [investor_id], references: [id])
  created_by            User             @relation("LoanCreatedBy", fields: [created_by_id], references: [id])
  payments              Payment[]
  payment_schedule      PaymentSchedule[]
}

model PaymentSchedule {
  id             String   @id @default(cuid())
  loan_id        String
  term_number    Int      // 1, 2, 3...
  due_date       DateTime
  amount_due     Decimal  @db.Decimal(12, 2)
  is_paid        Boolean  @default(false)
  paid_at        DateTime?

  loan Loan @relation(fields: [loan_id], references: [id])
}

model Payment {
  id              String        @id @default(cuid())
  loan_id         String
  amount          Decimal       @db.Decimal(12, 2)
  payment_type    PaymentType   @default(REGULAR)
  payment_method  PaymentMethod @default(CASH)
  payment_date    DateTime      @default(now())
  notes           String?
  recorded_by_id  String

  loan        Loan @relation(fields: [loan_id], references: [id])
  recorded_by User @relation("PaymentRecordedBy", fields: [recorded_by_id], references: [id])
}

model AuditLog {
  id         String   @id @default(cuid())
  user_id    String
  action     String   // e.g. "CREATE_LOAN", "RECORD_PAYMENT", "UPDATE_CLIENT"
  entity     String   // e.g. "Loan", "Payment", "Client"
  entity_id  String
  payload    Json
  created_at DateTime @default(now())

  user User @relation(fields: [user_id], references: [id])
}
```

---

## 7. Business Rules & Validation

### Loan Creation Rules
- Monthly interest rate is **auto-computed** from term — never manually entered for FLAT loans
- DIMINISHING loans always use **9%** regardless of term
- `total_terms` = `months × terms_per_month`
- `estimated_interest` = `principal × (monthly_rate / 100)` (flat-rate: this is interest per month, same for every payment)
- `total_interest` = `estimated_interest × months` (not × total_terms — confirmed from source formulas)
- `total_payable` = `principal + total_interest`
- `amortization_amount` = `total_payable / total_terms`
- `outstanding_balance` initialized to `total_payable`
- Generate `PaymentSchedule` rows at loan creation (one per term, with due dates)
- Loan status starts as `ACTIVE`

### Payment Rules
- Payment amount must be > 0
- Payment amount must NOT exceed `outstanding_balance`
- After recording payment: `outstanding_balance -= payment.amount` and `total_paid += payment.amount`
- If `outstanding_balance === 0` after payment → set `status = 'COMPLETED'`
- Advance payments are allowed — mark `payment_type = 'ADVANCE'`
- Penalty payments do NOT reduce the principal directly — record as `payment_type = 'PENALTY'` and add to total paid
- Payments reduce `outstanding_balance` regardless of type

### Loan Editing Rules
- Loans CAN be edited after creation (per decision: yes, with audit log)
- Only editable fields: `notes`, `investor_id`, `status` (manual override for DEFAULTED)
- Core financial fields (`principal_amount`, `monthly_interest_rate`, `months`) are **locked after first payment is recorded**
- All edits must create an `AuditLog` entry with `before` and `after` payload

### Client Rules
- A client can have **multiple concurrent active loans** — no restriction
- Client deletion is not allowed if they have active loans

### Overdue Detection
```
A loan term is overdue if:
  due_date < today AND is_paid = false
```

A loan is DEFAULTED only if admin manually marks it (no automatic default — business decision).

---

## 8. API Routes / Server Actions

Use **Next.js Server Actions** (App Router) for mutations. Use **Route Handlers** for GET data fetching where needed.

### Auth
```
POST /api/auth/[...nextauth]   — NextAuth handler
```

### Clients
```
GET    /api/clients            — list all clients (with search/filter)
POST   /api/clients            — create client
GET    /api/clients/:id        — get single client with loan history
PUT    /api/clients/:id        — update client
```

### Loans
```
GET    /api/loans              — list loans (filter: status, client, date range)
POST   /api/loans              — create loan (computes all fields server-side)
GET    /api/loans/:id          — get loan with payments + schedule
PUT    /api/loans/:id          — edit allowed fields (audit logged)
GET    /api/loans/:id/schedule — get payment schedule
```

### Payments
```
GET    /api/payments?loanId=   — list payments for a loan
POST   /api/payments           — record payment (regular, advance, or penalty)
```

### Dashboard
```
GET    /api/dashboard          — summary metrics
```

### Investors
```
GET    /api/investors          — list investors
POST   /api/investors          — create investor
GET    /api/investors/:id      — investor detail + loan list + returns
```

### Reports
```
GET    /api/reports/loans      — loan summary report
GET    /api/reports/payments   — payment history report
GET    /api/reports/investors  — investor returns report
```

### Users (SUPERADMIN only)
```
GET    /api/users              — list admin users
POST   /api/users              — create admin user
PUT    /api/users/:id          — update user / deactivate
```

---

## 9. Module Breakdown

### 9.1 Loan Calculator (shared utility)

```typescript
// lib/loan-calculator.ts

export function getMonthlyRate(months: number): number {
  if (months >= 1  && months <= 6)  return 7;
  if (months >= 7  && months <= 9)  return 6;
  if (months >= 10 && months <= 12) return 5;
  if (months >= 13 && months <= 15) return 4;
  if (months >= 16 && months <= 17) return 3;
  throw new Error(`Invalid term: ${months} months. Maximum is 17.`);
}

export function computeFlatLoan(principal: number, months: number, termsPerMonth: number) {
  const monthly_rate      = getMonthlyRate(months);
  const estimated_interest = principal * (monthly_rate / 100);
  const total_interest    = estimated_interest * months;
  const total_payable     = principal + total_interest;
  const total_terms       = months * termsPerMonth;
  const amortization      = total_payable / total_terms;

  return {
    monthly_interest_rate: monthly_rate,
    estimated_interest,
    total_interest,
    total_payable,
    total_terms,
    amortization_amount: amortization,
  };
}

export function computeDiminishingLoan(principal: number, months: number, termsPerMonth: number) {
  const rate = 9;
  const principal_per_term = principal / months;
  let remaining = principal;
  let total_interest = 0;
  const schedule = [];

  for (let i = 1; i <= months; i++) {
    const interest = remaining * (rate / 100);
    const payment  = principal_per_term + interest;
    total_interest += interest;
    remaining      = Math.max(remaining - principal_per_term, 0);
    schedule.push({ term: i, interest, payment, remaining });
  }

  return {
    monthly_interest_rate: rate,
    total_interest,
    total_payable: principal + total_interest,
    total_terms: months * termsPerMonth,
    amortization_schedule: schedule,
  };
}

export function computePenalty(amortization_amount: number): number {
  return amortization_amount * 0.50;
}
```

### 9.2 Payment Schedule Generator

```typescript
// lib/schedule-generator.ts

import { addDays, addMonths } from 'date-fns';

export function generatePaymentSchedule(
  loanDate: Date,
  totalTerms: number,
  termsPerMonth: number,
  amortizationAmount: number
) {
  const schedule = [];
  let currentDate = new Date(loanDate);

  const intervalDays = termsPerMonth === 1 ? 30
    : termsPerMonth === 2 ? 15
    : termsPerMonth === 4 ? 7
    : 30;

  for (let i = 1; i <= totalTerms; i++) {
    currentDate = addDays(currentDate, intervalDays);
    schedule.push({
      term_number: i,
      due_date:    new Date(currentDate),
      amount_due:  amortizationAmount,
      is_paid:     false,
    });
  }
  return schedule;
}
```

### 9.3 Auth Configuration

```typescript
// lib/auth.ts — NextAuth.js with Credentials provider

import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from './db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user || !user.is_active) return null;
        const valid = await compare(credentials.password as string, user.password_hash);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) { token.role = user.role; token.id = user.id; }
      return token;
    },
    session({ session, token }) {
      session.user.role = token.role as string;
      session.user.id   = token.id as string;
      return session;
    },
  },
  pages: { signIn: '/login' },
});
```

---

## 10. Folder Structure

```
/app
  /login
    page.tsx
  /(dashboard)
    layout.tsx                  — sidebar + auth guard
    /dashboard
      page.tsx                  — summary metrics
    /clients
      page.tsx                  — client list
      /new
        page.tsx
      /[id]
        page.tsx                — client detail + loan history
    /loans
      page.tsx                  — loan list (filterable)
      /new
        page.tsx                — create loan with calculator preview
      /[id]
        page.tsx                — loan detail + payment schedule + payment history
    /payments
      /new
        page.tsx                — record payment (linked to loan)
    /investors
      page.tsx
      /[id]
        page.tsx
    /reports
      page.tsx
    /settings
      /users
        page.tsx                — SUPERADMIN only

/components
  /ui                           — Button, Input, Select, Table, Badge, Modal, etc.
  /loans
    LoanCalculator.tsx          — live preview of flat vs diminishing
    LoanCard.tsx
    PaymentScheduleTable.tsx
    LoanStatusBadge.tsx
  /payments
    RecordPaymentForm.tsx
    PaymentHistoryTable.tsx
  /dashboard
    MetricCard.tsx
    OverdueAlert.tsx
  /investors
    InvestorCard.tsx

/lib
  db.ts                         — Prisma client singleton
  auth.ts                       — NextAuth config
  loan-calculator.ts            — all computation functions
  schedule-generator.ts         — payment schedule generation
  audit.ts                      — logAction() helper

/modules
  /loan
    actions.ts                  — Server Actions: createLoan, updateLoan, etc.
    queries.ts                  — DB read functions
    types.ts
  /payment
    actions.ts
    queries.ts
    types.ts
  /client
    actions.ts
    queries.ts
    types.ts
  /investor
    actions.ts
    queries.ts
    types.ts
  /report
    queries.ts

/prisma
  schema.prisma
  seed.ts                       — seed superadmin user

/middleware.ts                  — protect all (dashboard) routes
```

---

## 11. Auth & Roles

### Roles

| Role | Access |
|------|--------|
| `SUPERADMIN` | Everything + user management |
| `ADMIN` | All loan/client/payment/investor/report operations |

### Route Protection

```typescript
// middleware.ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login');

  if (!isLoggedIn && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
});

export const config = { matcher: ['/((?!api|_next|favicon).*)'] };
```

---

## 12. Dashboard Metrics

The dashboard must show the following (all computed from DB):

| Metric | Computation |
|--------|-------------|
| Total capital lent | `SUM(principal_amount)` of all loans |
| Total collected | `SUM(amount)` of all payments |
| Outstanding receivables | `SUM(outstanding_balance)` of ACTIVE loans |
| Active loans count | `COUNT` where `status = ACTIVE` |
| Completed loans count | `COUNT` where `status = COMPLETED` |
| Overdue loans count | Loans with `PaymentSchedule.due_date < today AND is_paid = false` |
| Total interest earned | `SUM(total_interest)` of COMPLETED loans |
| New loans this month | `COUNT` where `loan_date` in current month |

---

## 13. Audit Logging

Every critical action must be logged. Use a helper:

```typescript
// lib/audit.ts
import { prisma } from './db';

export async function logAction(
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  payload: object
) {
  await prisma.auditLog.create({
    data: { user_id: userId, action, entity, entity_id: entityId, payload },
  });
}
```

### Actions to Log

| Action | Entity | Trigger |
|--------|--------|---------|
| `CREATE_LOAN` | Loan | New loan created |
| `UPDATE_LOAN` | Loan | Loan fields edited |
| `CREATE_PAYMENT` | Payment | Payment recorded |
| `CREATE_CLIENT` | Client | New client added |
| `UPDATE_CLIENT` | Client | Client info edited |
| `CREATE_USER` | User | Admin user created |
| `UPDATE_USER` | User | Admin user edited / deactivated |
| `CREATE_INVESTOR` | Investor | Investor added |
| `MARK_DEFAULTED` | Loan | Status manually set to DEFAULTED |

---

## 14. Development Priorities

Build in this exact order — each phase is independently testable.

### Phase 1 — Foundation
1. Prisma schema + migrations
2. Seed superadmin user
3. NextAuth login page + session
4. Route protection middleware
5. Sidebar layout shell

### Phase 2 — Core Business
6. Client management (create, list, view, edit)
7. Loan creation with live calculator preview
8. Payment schedule generation at loan creation
9. Payment recording (regular, advance, penalty)
10. Outstanding balance auto-update
11. Loan status auto-update on payment

### Phase 3 — Visibility
12. Loan list with status filters
13. Loan detail page (schedule + payment history)
14. Client detail page (all loans)
15. Dashboard with all 8 metrics
16. Overdue loans alert

### Phase 4 — Admin & Reporting
17. Investor management + assignment to loans
18. Audit log viewer
19. Loan summary report
20. Payment history report
21. Investor returns report
22. User management (SUPERADMIN only)

---

## 15. Post-MVP Features

These are found in the data but deferred from MVP:

| Feature | Notes |
|---------|-------|
| **Investor ROI report** | Capital deployed, interest earned, ROI % per investor |
| **Loan restructuring** | Admin can modify schedule for hardship cases (with full audit) |
| **SMS/Email reminders** | Notify borrower before due date |
| **Client portal login** | Borrowers log in to view their own loan status and schedule |
| **PDF export** | Print loan summary / payment receipt |
| **Excel export** | Bulk loan and payment data export |
| **Multi-branch support** | Separate loan pools per branch |
| **Negotiated rate override** | Some loans in data had custom rates ("?") — allow admin override with mandatory note |

---

## 16. Non-Functional Requirements

- **Password hashing:** bcryptjs, minimum 12 rounds
- **Input validation:** Zod on all server actions and API routes
- **Financial precision:** Use `Decimal.js` for all money calculations — never use JavaScript `number` for currency
- **Database backups:** Daily automated backup to cloud storage (configure on Railway/Render)
- **Error handling:** All server actions return typed `{ success, data, error }` — no unhandled promise rejections
- **Session security:** NextAuth JWT with 8-hour expiry; refresh on activity
- **HTTPS:** Enforced at platform level (Railway/Render provide this)
- **Audit trail:** No destructive deletes — use `is_active = false` soft deletes

---

## 17. Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/nrm_lending"

# NextAuth
NEXTAUTH_SECRET="generate-with: openssl rand -base64 32"
NEXTAUTH_URL="https://your-domain.com"

# App
NODE_ENV="production"
```

---

## Appendix A — Seed Data (Initial Setup)

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await hash('change-me-on-first-login', 12);

  await prisma.user.upsert({
    where: { email: 'admin@nrmlending.com' },
    update: {},
    create: {
      email:         'admin@nrmlending.com',
      password_hash: password,
      name:          'Super Admin',
      role:          'SUPERADMIN',
    },
  });

  // Seed investors from existing data
  const investors = ['Jay', 'Arvin', 'Mama'];
  for (const name of investors) {
    await prisma.investor.upsert({
      where:  { id: name.toLowerCase() },
      update: {},
      create: { id: name.toLowerCase(), name },
    });
  }

  console.log('Seed complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

---

## Appendix B — Loan Computation Examples

### Example 1: ₱5,000 — 3 months — semi-monthly

```
Type:              FLAT
Monthly rate:      7% (auto: 1–6 months)
Terms per month:   2
Total terms:       6

est_interest:      5,000 × 7% = ₱350/month
total_interest:    350 × 3 = ₱1,050
total_payable:     5,000 + 1,050 = ₱6,050
amortization:      6,050 / 6 = ₱1,008.33 per payment
```

### Example 2: ₱20,000 — 9 months — monthly

```
Type:              FLAT
Monthly rate:      6% (auto: 7–9 months)
Terms per month:   1
Total terms:       9

est_interest:      20,000 × 6% = ₱1,200/month
total_interest:    1,200 × 9 = ₱10,800
total_payable:     20,000 + 10,800 = ₱30,800
amortization:      30,800 / 9 = ₱3,422.22 per payment
```

### Example 3: ₱15,000 — 6 months — diminishing 9%

```
Type:              DIMINISHING
Rate:              9% on remaining balance
Principal/term:    15,000 / 6 = ₱2,500

Month 1: interest = 15,000 × 9% = 1,350 | payment = 3,850 | remaining = 12,500
Month 2: interest = 12,500 × 9% = 1,125 | payment = 3,625 | remaining = 10,000
Month 3: interest = 10,000 × 9% = 900   | payment = 3,400 | remaining = 7,500
Month 4: interest = 7,500 × 9%  = 675   | payment = 3,175 | remaining = 5,000
Month 5: interest = 5,000 × 9%  = 450   | payment = 2,950 | remaining = 2,500
Month 6: interest = 2,500 × 9%  = 225   | payment = 2,725 | remaining = 0

Total interest: ₱4,725  |  Total payable: ₱19,725
```

### Example 4: Penalty calculation

```
Amortization amount: ₱1,008.33 (from Example 1)
Missed 1 payment → Penalty = 1,008.33 × 50% = ₱504.17

Admin records:
  Payment 1 (REGULAR):  ₱1,008.33  — covers the missed term
  Payment 2 (PENALTY):  ₱504.17    — penalty charge
```

---

*Document generated from NRM_Lending.xlsx analysis. All formulas verified against source Excel computations.*
