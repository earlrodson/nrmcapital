# NRM Lending — Architecture & Stack Reference

> For agentic development. Every decision here is final unless marked `[DISCUSS]`.  
> An AI coding agent should be able to read this file and start generating correct code immediately.

---

## Stack Decision Summary

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server Components = less client code to write |
| UI Components | shadcn/ui (preset `b1tMdLU9I`) | Pre-built, copy-paste, fully owned |
| Styling | Tailwind CSS v4 | Ships with shadcn preset |
| State — server | **Server Actions + `useActionState`** | Native Next.js, no extra lib needed |
| State — client | **Zustand** (scoped, minimal) | Auth session UI, sidebar, modals only |
| State — async | **NO React Query** (see note below) | Server Components handle data fetching |
| ORM | Prisma | Type-safe, great DX, migrations built-in |
| Auth | Auth.js v5 (NextAuth) | Native App Router support |
| Validation | Zod | Shared between client forms + server actions |
| Forms | React Hook Form + Zod resolver | Works with shadcn Form components |
| Package manager | pnpm | Faster, monorepo-ready |
| Database | PostgreSQL | Financial data needs ACID |
| Monorepo | Turborepo (via shadcn preset) | Shared packages, parallel builds |

---

## React Query — Why NOT for this project

You asked if React Query is preferred. For this specific app: **no, skip it.**

Here is the reasoning:

**Next.js App Router + Server Components already solve what React Query solves for reads:**

```
React Query job:        fetch → cache → dedupe → background refetch
Server Component job:   fetch → cache → dedupe → stream to client

They overlap almost completely for read operations.
```

**React Query adds real value when you have:**
- Real-time data (WebSockets, SSE)
- Optimistic UI updates (e.g. Twitter-like like button)
- Infinite scroll / pagination on the client
- Complex cross-component cache sharing on the client

**NRM Lending has:**
- Admin CRUD tables (server-rendered, paginated via URL params)
- Form submissions (Server Actions)
- Dashboard metrics (server-rendered, revalidated on demand)
- No real-time requirements
- No optimistic UI needed

**Using React Query here means:**
- Every data fetch has two versions: server + client
- You fight against Server Components trying to push data down
- Bundle size increases for no user-facing benefit
- Agent-generated code becomes inconsistent (sometimes uses RQ, sometimes not)

**Use `revalidatePath` / `revalidateTag` after mutations instead.**  
Clean, zero-client-bundle, works natively with Server Actions.

---

## Zustand — Where it IS used (scoped, not global data store)

Zustand is kept but scoped tightly. It is **not** a data store. It handles only:

```typescript
// stores/ui-store.ts
interface UIStore {
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
}

// stores/session-store.ts  
interface SessionStore {
  user: { id: string; name: string; role: string } | null
  setUser: (user: SessionStore['user']) => void
}
```

Everything else — loan data, client data, payment data — comes from Server Components or Server Actions. Never put business data in Zustand.

---

## Additional Stack Recommendations

These are not in your original list but will significantly increase development speed and quality:

### 1. `nuqs` — URL state management
```bash
pnpm add nuqs
```
For table filters, search, pagination, tab state. Keeps state in the URL so:
- Shareable links (admin can send a filtered loan list URL)
- Browser back/forward works
- No useState for filter values

```typescript
// Instead of: const [status, setStatus] = useState('ACTIVE')
const [status, setStatus] = useQueryState('status')
// URL becomes: /loans?status=ACTIVE&page=2
```

### 2. `date-fns` — Date manipulation
```bash
pnpm add date-fns
```
Required for: payment schedule generation, due date calculation, overdue detection, date formatting (Philippine locale).

### 3. `Decimal.js` — Financial precision arithmetic
```bash
pnpm add decimal.js
```
**Non-negotiable for a lending app.** JavaScript `number` type has floating point errors:
```javascript
// Without Decimal.js:
0.1 + 0.2 = 0.30000000000000004  // ← this in a payment balance is a bug

// With Decimal.js:
new Decimal(0.1).plus(0.2).toString() = "0.3"  // ← correct
```
Use for all: principal, interest, payment amounts, balance calculations.

### 4. `Recharts` — Dashboard charts
```bash
pnpm add recharts
```
Already works with shadcn/ui chart components. Needed for: collections over time, active vs completed loans, investor returns chart.

### 5. `react-to-print` or `@react-pdf/renderer` — Payment receipts
```bash
pnpm add react-to-print
```
Lightweight option for printing payment receipts and loan summaries directly from the browser. No server-side PDF generation needed for MVP.

### 6. `zod-prisma-types` — Auto-generate Zod schemas from Prisma schema
```bash
pnpm add -D zod-prisma-types
```
Eliminates writing Zod schemas by hand. Generates them from your `schema.prisma` automatically. Massive time saver for agentic development — the agent has one source of truth.

### 7. `tsx` — Run TypeScript scripts directly
```bash
pnpm add -D tsx
```
For running seed scripts, one-off migrations, data imports:
```bash
pnpm tsx prisma/seed.ts
```

---

## Monorepo Structure

```
nrm-lending/                          ← monorepo root
├── apps/
│   └── web/                          ← Next.js app
│       ├── app/
│       │   ├── (auth)/
│       │   │   └── login/
│       │   │       └── page.tsx
│       │   ├── (dashboard)/
│       │   │   ├── layout.tsx        ← sidebar + auth guard
│       │   │   ├── dashboard/
│       │   │   │   └── page.tsx
│       │   │   ├── clients/
│       │   │   │   ├── page.tsx
│       │   │   │   ├── new/page.tsx
│       │   │   │   └── [id]/page.tsx
│       │   │   ├── loans/
│       │   │   │   ├── page.tsx
│       │   │   │   ├── new/page.tsx
│       │   │   │   └── [id]/
│       │   │   │       ├── page.tsx
│       │   │   │       └── payments/page.tsx
│       │   │   ├── investors/
│       │   │   │   ├── page.tsx
│       │   │   │   └── [id]/page.tsx
│       │   │   ├── reports/
│       │   │   │   └── page.tsx
│       │   │   └── settings/
│       │   │       └── users/page.tsx
│       │   ├── api/
│       │   │   └── auth/[...nextauth]/route.ts
│       │   ├── layout.tsx
│       │   └── globals.css
│       ├── components/
│       │   ├── ui/                   ← shadcn components (auto-generated, do not edit)
│       │   ├── layout/
│       │   │   ├── sidebar.tsx
│       │   │   ├── header.tsx
│       │   │   └── nav-item.tsx
│       │   ├── loans/
│       │   │   ├── loan-table.tsx
│       │   │   ├── loan-form.tsx
│       │   │   ├── loan-calculator-preview.tsx
│       │   │   ├── loan-status-badge.tsx
│       │   │   ├── payment-schedule-table.tsx
│       │   │   └── loan-progress-bar.tsx
│       │   ├── payments/
│       │   │   ├── record-payment-form.tsx
│       │   │   └── payment-history-table.tsx
│       │   ├── clients/
│       │   │   ├── client-table.tsx
│       │   │   └── client-form.tsx
│       │   ├── dashboard/
│       │   │   ├── metric-card.tsx
│       │   │   ├── overdue-alert.tsx
│       │   │   └── collections-chart.tsx
│       │   └── shared/
│       │       ├── data-table.tsx    ← reusable table with sorting/pagination
│       │       ├── confirm-dialog.tsx
│       │       ├── currency-display.tsx
│       │       └── date-display.tsx
│       ├── lib/
│       │   ├── auth.ts
│       │   ├── db.ts                 ← Prisma singleton
│       │   └── utils.ts              ← shadcn cn() utility
│       ├── stores/
│       │   ├── ui-store.ts           ← Zustand: sidebar, modals
│       │   └── session-store.ts      ← Zustand: current user
│       ├── middleware.ts
│       └── next.config.ts
│
└── packages/
    ├── db/                           ← shared database package
    │   ├── prisma/
    │   │   ├── schema.prisma
    │   │   └── seed.ts
    │   ├── src/
    │   │   └── index.ts              ← exports prisma client
    │   └── package.json
    │
    ├── loan-engine/                  ← shared business logic package
    │   ├── src/
    │   │   ├── index.ts
    │   │   ├── calculator.ts         ← all loan computation functions
    │   │   ├── schedule.ts           ← payment schedule generator
    │   │   ├── validator.ts          ← Zod schemas for loan inputs
    │   │   └── types.ts              ← shared TypeScript types
    │   └── package.json
    │
    └── ui/                           ← optional: shared UI components
        └── package.json
```

**Key separation:** `packages/loan-engine` is isolated pure TypeScript with zero framework dependency. This means:
- Fully unit-testable without Next.js
- Reusable if a mobile app is ever built
- Agent can generate and test computation logic independently

---

## Data Flow Pattern

This is the pattern every feature follows. Agents must follow this exact pattern — no deviation.

```
URL / User Action
      ↓
Server Component (page.tsx)
  - fetches data directly via prisma (no API call)
  - passes data as props to Client Components
  - handles search params for filters/pagination
      ↓
Client Component (form, table)
  - renders UI
  - calls Server Action on submit
      ↓
Server Action (actions.ts)
  - validates with Zod
  - runs Prisma query
  - calls logAction() for audit
  - calls revalidatePath() to refresh data
  - returns { success, data?, error? }
      ↓
Client Component
  - shows toast on success/error
  - form resets / redirects
```

### Concrete example — Record a payment

```typescript
// app/(dashboard)/loans/[id]/page.tsx  — SERVER COMPONENT
import { getLoanWithPayments } from '@/modules/loan/queries'
import { RecordPaymentForm } from '@/components/payments/record-payment-form'

export default async function LoanDetailPage({ params }) {
  const loan = await getLoanWithPayments(params.id)  // direct prisma call
  return <RecordPaymentForm loan={loan} />
}

// components/payments/record-payment-form.tsx  — CLIENT COMPONENT
'use client'
import { recordPayment } from '@/modules/payment/actions'
import { useActionState } from 'react'

export function RecordPaymentForm({ loan }) {
  const [state, action, pending] = useActionState(recordPayment, null)
  return (
    <form action={action}>
      <input name="loanId" value={loan.id} type="hidden" />
      <input name="amount" type="number" step="0.01" />
      {/* ... */}
      <button disabled={pending}>Record Payment</button>
    </form>
  )
}

// modules/payment/actions.ts  — SERVER ACTION
'use server'
import { z } from 'zod'
import { prisma } from '@repo/db'
import { logAction } from '@/lib/audit'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'

const RecordPaymentSchema = z.object({
  loanId:        z.string().cuid(),
  amount:        z.coerce.number().positive(),
  paymentType:   z.enum(['REGULAR', 'ADVANCE', 'PENALTY']).default('REGULAR'),
  paymentMethod: z.enum(['CASH', 'GCASH', 'BANK_TRANSFER', 'OTHER']).default('CASH'),
  notes:         z.string().optional(),
})

export async function recordPayment(prevState, formData: FormData) {
  const session = await auth()
  if (!session) return { error: 'Unauthorized' }

  const parsed = RecordPaymentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.flatten() }

  const { loanId, amount, paymentType, paymentMethod, notes } = parsed.data

  const loan = await prisma.loan.findUnique({ where: { id: loanId } })
  if (!loan) return { error: 'Loan not found' }
  if (amount > Number(loan.outstanding_balance)) return { error: 'Amount exceeds outstanding balance' }

  const payment = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        loan_id:         loanId,
        amount,
        payment_type:    paymentType,
        payment_method:  paymentMethod,
        notes,
        recorded_by_id:  session.user.id,
      }
    })

    const newBalance = Number(loan.outstanding_balance) - amount
    await tx.loan.update({
      where: { id: loanId },
      data: {
        outstanding_balance: newBalance,
        total_paid: { increment: amount },
        status: newBalance === 0 ? 'COMPLETED' : 'ACTIVE',
      }
    })

    return p
  })

  await logAction(session.user.id, 'RECORD_PAYMENT', 'Payment', payment.id, { loanId, amount, paymentType })
  revalidatePath(`/loans/${loanId}`)
  return { success: true }
}
```

---

## Server Action Response Type

Every Server Action returns this shape. Agents must use this type consistently:

```typescript
// packages/loan-engine/src/types.ts

export type ActionResult<T = void> =
  | { success: true; data?: T; error?: never }
  | { success: false; error: string | Record<string, string[]>; data?: never }
```

---

## Module Structure Pattern

Each domain module follows this exact file structure:

```
modules/
  loan/
    actions.ts    ← 'use server' — all mutations
    queries.ts    ← plain async functions, called from Server Components only
    types.ts      ← module-specific types (extends shared types)
    utils.ts      ← helpers specific to this module
```

```typescript
// modules/loan/queries.ts  — no 'use server', called from Server Components
import { prisma } from '@repo/db'

export async function getLoans(filters: {
  status?: string
  clientId?: string
  page?: number
  limit?: number
}) {
  const { status, clientId, page = 1, limit = 20 } = filters
  return prisma.loan.findMany({
    where: {
      ...(status && { status: status as any }),
      ...(clientId && { client_id: clientId }),
    },
    include: { client: true, investor: true },
    orderBy: { created_at: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  })
}
```

---

## Loan Engine Package — Core Functions

These live in `packages/loan-engine/src/calculator.ts`.  
All amounts use `Decimal.js`. All functions are pure (no side effects, no DB calls).

```typescript
import Decimal from 'decimal.js'

export function getMonthlyRate(months: number): number {
  if (months >= 1  && months <= 6)  return 7
  if (months >= 7  && months <= 9)  return 6
  if (months >= 10 && months <= 12) return 5
  if (months >= 13 && months <= 15) return 4
  if (months >= 16 && months <= 17) return 3
  throw new Error(`Invalid term: ${months} months. Max is 17.`)
}

export interface FlatLoanResult {
  monthly_interest_rate: number
  monthly_interest:      Decimal   // ← what Excel wrongly called "Amortization"
  total_interest:        Decimal
  total_payable:         Decimal
  total_terms:           number
  monthly_payment:       Decimal
  semi_monthly_payment:  Decimal
  weekly_payment:        Decimal
}

export function computeFlatLoan(
  principal: number,
  months: number,
  terms_per_month: number
): FlatLoanResult {
  const p   = new Decimal(principal)
  const m   = new Decimal(months)
  const rate = new Decimal(getMonthlyRate(months)).div(100)

  const monthly_interest     = p.mul(rate)
  const total_interest       = monthly_interest.mul(m)
  const total_payable        = p.plus(total_interest)
  const total_terms          = months * terms_per_month
  const monthly_payment      = p.div(m).plus(monthly_interest)
  const semi_monthly_payment = monthly_payment.div(2)
  const weekly_payment       = semi_monthly_payment.div(2)

  return {
    monthly_interest_rate: getMonthlyRate(months),
    monthly_interest,
    total_interest,
    total_payable,
    total_terms,
    monthly_payment,
    semi_monthly_payment,
    weekly_payment,
  }
}

export interface DiminishingTerm {
  term:      number
  interest:  Decimal
  payment:   Decimal
  remaining: Decimal
}

export function computeDiminishingLoan(
  principal: number,
  months: number
): { schedule: DiminishingTerm[]; total_interest: Decimal; total_payable: Decimal } {
  const p    = new Decimal(principal)
  const m    = new Decimal(months)
  const rate = new Decimal(9).div(100)
  const principal_per_term = p.div(m)

  let remaining    = p
  let total_interest = new Decimal(0)
  const schedule: DiminishingTerm[] = []

  for (let i = 1; i <= months; i++) {
    const interest = remaining.mul(rate)
    const payment  = principal_per_term.plus(interest)
    total_interest = total_interest.plus(interest)
    remaining      = remaining.minus(principal_per_term)

    schedule.push({
      term:      i,
      interest,
      payment,
      remaining: Decimal.max(remaining, 0),
    })
  }

  return {
    schedule,
    total_interest,
    total_payable: p.plus(total_interest),
  }
}

export function computePenalty(amortization_amount: Decimal | number): Decimal {
  return new Decimal(amortization_amount).mul(0.5)
}

export function computeCompletionPercent(total_paid: Decimal | number, total_payable: Decimal | number): number {
  return new Decimal(total_paid).div(new Decimal(total_payable)).mul(100).toDecimalPlaces(1).toNumber()
}
```

---

## Environment Variables

```env
# apps/web/.env.local

# Database (from packages/db)
DATABASE_URL="postgresql://user:password@localhost:5432/nrm_lending"

# Auth
AUTH_SECRET="generate: openssl rand -base64 32"
AUTH_URL="http://localhost:3000"

# App
NODE_ENV="development"
NEXT_PUBLIC_APP_NAME="NRM Lending"
```

---

## Key Conventions for Agents

These rules must be followed in every generated file:

**1. Currency — always Decimal.js, never number**
```typescript
// ❌ Wrong
const balance = loan.total_payable - payment.amount

// ✅ Correct
const balance = new Decimal(loan.total_payable).minus(payment.amount)
```

**2. Server Components fetch data directly — never use fetch() to your own API**
```typescript
// ❌ Wrong (in a Server Component)
const res = await fetch('/api/loans')
const loans = await res.json()

// ✅ Correct
const loans = await prisma.loan.findMany({ ... })
```

**3. All mutations go through Server Actions — no API route handlers for mutations**
```typescript
// ❌ Wrong
// app/api/loans/route.ts with POST handler

// ✅ Correct
// modules/loan/actions.ts with 'use server' export
```

**4. Zod validation in every Server Action — no exceptions**
```typescript
// Every action starts with:
const parsed = Schema.safeParse(Object.fromEntries(formData))
if (!parsed.success) return { success: false, error: parsed.error.flatten() }
```

**5. Every mutation calls logAction() and revalidatePath()**
```typescript
// End of every successful action:
await logAction(userId, 'ACTION_NAME', 'Entity', entityId, payload)
revalidatePath('/affected-route')
return { success: true }
```

**6. Prisma transactions for any operation touching multiple tables**
```typescript
// Payment recording, loan creation with schedule — always use $transaction
await prisma.$transaction(async (tx) => {
  // all related writes here
})
```

**7. shadcn Form + React Hook Form for all forms**
```typescript
// Always use the Form component from shadcn, never raw <form> without RHF
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
```

**8. URL state for table filters via nuqs**
```typescript
// Filter state always lives in URL, never in useState
const [status, setStatus] = useQueryState('status', parseAsString.withDefault('ACTIVE'))
```

---

## Commands Reference

```bash
# Setup
pnpm dlx shadcn@latest init --preset b1tMdLU9I --template next --monorepo

# Add shadcn components
pnpm dlx shadcn@latest add table form dialog badge card chart

# Database
pnpm --filter @repo/db db:push        # push schema (dev)
pnpm --filter @repo/db db:migrate     # create migration (prod)
pnpm --filter @repo/db db:seed        # seed initial data
pnpm --filter @repo/db db:studio      # open Prisma Studio

# Dev
pnpm dev                              # runs all apps in parallel (Turborepo)
pnpm build                            # build all
pnpm lint                             # lint all
pnpm type-check                       # tsc --noEmit all

# Add packages
pnpm add decimal.js date-fns nuqs --filter web
pnpm add recharts --filter web
pnpm add -D zod-prisma-types tsx --filter @repo/db
```

---

## Deployment — Phase 1 (Railway)

```
Railway project
├── Service: web (Next.js)  — connect GitHub repo, auto-deploy on push
└── Service: postgres       — Railway managed PostgreSQL

Environment variables set in Railway dashboard.
DATABASE_URL auto-injected by Railway when services are linked.
```

**Zero config needed.** Railway detects Next.js and builds automatically.  
When ready to migrate to VPS: same Docker container, same env vars, same DB connection string.

---

## What to NOT build (scope guard)

| Temptation | Decision | Reason |
|---|---|---|
| React Query | Skip | Server Components cover it |
| Redux / Jotai | Skip | Zustand is enough |
| tRPC | Skip | Server Actions are simpler for this scale |
| Custom auth | Skip | Auth.js handles it |
| Microservices | Skip | Monolith is correct at this scale |
| WebSockets | Skip | No real-time requirement |
| Docker (dev) | Skip | Railway handles this |
| GraphQL | Skip | Overkill for admin CRUD |
