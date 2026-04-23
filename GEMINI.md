# GEMINI.md

## Project Overview

**NRM Capital** is a specialized lending management application built with **Next.js 16 (App Router)** and **React 19**. It is designed to handle the end-to-end lifecycle of loans, including client management, investor tracking, payment scheduling, and automated interest calculations.

### Core Technologies
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (Strict)
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL via **Drizzle ORM**
- **Validation:** Zod
- **Calculations:** Decimal.js for precise financial math
- **UI Components:** Shadcn UI (Radix-based)

---

## Architecture & Design Patterns

The project follows a modular, layered architecture with a clear separation of concerns as defined in `documents/ARCHITECTURE.MD`.

### 1. Route Strategy
- **Public (`/*`):** Landing page and marketing content.
- **Admin (`/admin/*`):** Internal staff operations (dashboards, client/loan management, reports).
- **Client (`/client/*`):** Borrower self-service (dashboards, payment history).

### 2. Implementation Layers
- **Repositories (`lib/db/repositories`):** Centralized data access using Drizzle ORM.
- **Services (`lib/services`):** Business logic coordination (e.g., recording payments, generating schedules).
- **Domain Logic (`lib/domain`):** Pure functional logic for calculations (e.g., interest, amortization).
- **Validations (`lib/validations`):** Shared Zod schemas for both client-side and server-side validation.

### 3. Database Schema (`drizzle/schema.ts`)
- **Users & Auth:** `users` (with roles: SUPERADMIN, ADMIN, CLIENT).
- **Core Entities:** `clients`, `investors`, `loans`.
- **Financials:** `payment_schedules` (term tracking), `payments` (actual transactions), `funding_transactions`.
- **System:** `audit_logs` (mandatory for mutations), `system_settings`, `attachments`.

---

## Development Conventions

Refer to `documents/CONDING-STANDARDS.MD` for full details.

### Coding Rules
- **Money Handling:** ALWAYS use `Decimal.js`. NEVER use floating-point for currency.
- **Validation:** Validate at every boundary (Server Actions, API routes) using Zod.
- **Strict TypeScript:** No `any`. Use domain-specific types.
- **Server-First:** Default to React Server Components (RSC) unless interactivity is required.
- **Transactions:** Use database transactions for any multi-table mutations (e.g., recording a payment and updating loan balance).

### File Structure
- `app/`: Next.js App Router routes and layouts.
- `components/`: UI components (split into `ui/` for primitives and feature-specific folders).
- `lib/`: Core logic, divided by concern (db, domain, services, auth, validations).
- `drizzle/`: Database schema definitions and migrations.
- `scripts/`: Maintenance and utility scripts (e.g., database seeding).

---

## Building and Running

### Development
```bash
pnpm install
pnpm dev
```

### Database Management
```bash
pnpm db:push      # Push schema changes to DB
pnpm db:generate  # Generate migration files
pnpm db:migrate   # Run migrations
pnpm db:studio    # Open Drizzle Studio UI
pnpm db:seed      # Seed initial admin user
```

### Testing & Linting
```bash
pnpm lint
# TODO: Add specific testing commands (e.g., vitest/jest) once implemented.
```

---

## Key Files for Reference
- `documents/ARCHITECTURE.MD`: Overall system design and route model.
- `documents/CONDING-STANDARDS.MD`: Mandatory coding practices and principles.
- `drizzle/schema.ts`: The source of truth for the database structure.
- `lib/domain/loan-calculations.ts`: Canonical interest and amortization formulas.
- `lib/db/client.ts`: Drizzle client initialization.
