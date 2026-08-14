# NRM Lending Coding Standards

> Version: 1.0
> Last updated: 2026-04-16
> Status: Active

---

## 1. Purpose

This document defines the top-tier coding practices for the NRM Lending codebase.

It exists to keep the application:

- maintainable
- readable
- secure
- consistent
- easy to extend

These standards apply to both **frontend** and **backend** work in the Next.js application.

---

## 2. Core Principles

### Keep it simple

Prefer the simplest solution that clearly solves the problem.

Do not introduce abstraction, patterns, or libraries unless they provide clear value.

### DRY

Follow the **DRY (Don’t Repeat Yourself)** principle.

Avoid duplicating:

- business logic
- validation rules
- formatting rules
- database access patterns
- UI patterns
- authorization checks

If logic appears in more than one place, move it into a shared utility, shared component, shared schema, or shared action helper where appropriate.

### Single source of truth

Every important rule should have one canonical home.

Examples:

- validation schemas live in `lib/validations`
- money formatting lives in one shared formatter
- auth/session logic lives in `lib/auth`
- loan computation logic lives in one domain module

### Explicit over clever

Write code that is easy to understand on a second read.

Prefer:

- descriptive names
- small focused functions
- clear data flow
- predictable return types

Avoid “magic” helpers that hide important behavior.

### Consistency over personal preference

When multiple valid approaches exist, use the one already established in the codebase.

---

## 3. General Standards

### Use TypeScript strictly

- Avoid `any`
- Prefer explicit domain types
- Use inferred types when they improve readability
- Narrow unknown input at boundaries

### Small focused files

Files should have one clear responsibility.

Good examples:

- one page component
- one domain action file
- one validation schema per domain area
- one hook per feature concern

### Functions should do one thing

If a function validates input, updates multiple models, formats output, and logs audit data all inline, break it into smaller internal helpers unless transaction boundaries require close grouping.

### Name things clearly

Use names that describe business meaning, not implementation guesses.

Prefer:

- `recordPayment`
- `calculateOutstandingBalance`
- `clientProfileSchema`

Avoid vague names like:

- `handleData`
- `processThing`
- `temp`

### Keep comments meaningful

Add comments only when the code’s intent is not obvious.

Good comments explain:

- why something exists
- business rules
- non-obvious tradeoffs

Bad comments simply restate the code.

---

## 4. Frontend Standards

### Build from reusable UI primitives

Use shared UI building blocks before creating one-off markup.

Prefer:

- shared form controls
- shared table wrappers
- shared empty/loading/error states
- shared amount/date/status display components

### Separate page composition from reusable UI

Page files should mostly compose existing components and wire data together.

Move reusable UI into shared components instead of copying JSX between pages.

### Keep components focused

A component should ideally be one of the following:

- layout component
- display component
- form component
- stateful feature component

Do not mix too many concerns into one file.

### Avoid prop bloat

If a component requires too many props, reassess the design.

Possible fixes:

- split the component
- pass a typed object
- move state ownership higher or lower

### Prefer server-first where appropriate

In Next.js App Router:

- default to Server Components when client interactivity is not needed
- use Client Components only when browser APIs, interactivity, local state, or React Query hooks are required

### Handle UI states explicitly

Every user-facing screen that loads data should account for:

- loading
- empty
- error
- success

Do not leave the UI ambiguous during async work.

### Forms must be structured

All forms should:

- use shared validation
- show clear field errors
- show submission state
- prevent duplicate submission
- handle success and failure predictably

### No duplicated formatting logic

Do not format:

- currency
- dates
- statuses
- names

in random page files. Use shared formatter helpers or shared display components.

---

## 5. Backend Standards

### Validate at the boundary

Every server action, route handler, or external input boundary must validate incoming data before using it.

Use Zod schemas as the standard validation layer.

### Keep business logic out of page components

Do not place database logic, financial calculations, or authorization logic inside page components.

Move them into:

- server actions
- domain services
- shared libraries

### Use transactions for related writes

Any operation that updates multiple records as one business action must use a database transaction.

Examples:

- creating a loan and payment schedule
- recording a payment and updating balances
- status transitions with audit logging

### Return predictable action results

Server actions should return a consistent result shape.

Recommended pattern:

```ts
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }
```

### Never trust client authorization

The UI can hide buttons, but the server must enforce permissions.

Always re-check session and role in server actions and backend handlers.

### Keep data access centralized

Database queries should not be scattered randomly across the app.

Prefer clear organization by domain so business behavior stays easy to reason about.

### Audit important mutations

Changes to critical financial or user records must be auditable.

At minimum, log:

- actor
- action
- entity
- entity id
- before/after snapshot when applicable

---

## 6. Next.js Standards

### Use App Router conventions properly

- keep routing file-based and predictable
- use route groups for organization where helpful
- keep layouts focused on shared shells and providers

### Prefer Server Actions for mutations

For internal app mutations, Server Actions should be the default unless a route handler is clearly more appropriate.

### Keep route files light

Page and layout files should mostly:

- compose UI
- call domain logic
- pass typed data

Avoid burying core business logic in `page.tsx`.

### Control client boundaries carefully

Only add `'use client'` where needed.

Do not convert large trees to client components just because one child needs interactivity.

### Prefer typed navigation

When typed routes are enabled, use them consistently and avoid stringly-typed route construction where possible.

---

## 7. State Management Standards

### Server data belongs in server state tools

Use React Query for server-backed data that needs fetching, caching, invalidation, and mutation coordination.

### UI-only state belongs in local or UI stores

Use local component state or Zustand for UI concerns such as:

- modals
- sidebar state
- filters before apply
- view toggles

### Do not duplicate state across layers

Do not copy the same server data into:

- React Query
- Zustand
- component state

Pick one correct owner for the state.

---

## 8. DRY in Practice

### Share schemas

The same Zod schema should power:

- server validation
- form validation
- TypeScript inference where useful

### Share domain rules

Loan calculations, penalty rules, amortization formulas, and status rules must live in one domain layer, not be repeated in UI and backend separately.

### Share presentation helpers

If multiple pages display the same domain concept, use a shared helper or component.

Examples:

- `AmountDisplay`
- `StatusBadge`
- `formatCurrency`
- `formatLoanStatus`

### Share error handling patterns

Use a consistent way to:

- return action errors
- show toast or inline errors
- log unexpected failures

---

## 9. Security Standards

### Validate everything

Never trust:

- form input
- query params
- route params
- uploaded files
- client role claims without server verification

### Protect sensitive operations

Any route or action affecting money, users, loans, or payment records must require verified authorization.

### Avoid leaking sensitive data

Do not expose:

- password hashes
- internal audit details unless intended
- private storage credentials
- raw internal error stacks to users

### Use safe defaults

- deny access by default
- sanitize output where relevant
- use least-privilege principles

---

## 10. Database and Money Handling

### Never use floating-point math for money

Use `Decimal.js` or the approved precise money type for all financial calculations.

### Keep financial rules centralized

Interest, penalties, amortization, outstanding balance logic, and status updates must be implemented in one trusted domain layer.

### Prefer soft deletes

Do not hard-delete important business records unless explicitly approved and architected for that case.

### Migrations must be deliberate

- write clear migration names
- review schema changes before applying
- avoid mixing unrelated schema changes into one migration

---

## 11. Testing Recommendations

### Test critical business logic first

Highest priority:

- loan calculations
- penalty calculations
- payment application
- outstanding balance updates
- authorization rules

### Test behavior, not implementation details

Prefer tests that verify outcomes and business rules instead of internal function structure.

### Add regression tests for bugs

When a bug is fixed, add a test that would have caught it.

---

## 12. Performance Recommendations

### Avoid unnecessary client rendering

Do not move data-heavy pages into client components without a clear need.

### Reuse fetch and cache patterns

Use consistent query keys, invalidation strategy, and cache boundaries.

### Be intentional about expensive computation

Dashboard aggregates and report generation should be isolated and optimized carefully.

### Avoid premature optimization

Measure before adding complexity.

---

## 13. Code Review Checklist

Before merging code, review for:

- correctness
- readability
- duplicated logic
- validation coverage
- authorization coverage
- transaction safety
- error handling
- loading/empty/error UI states
- naming clarity
- unnecessary complexity

---

## 14. Practical Do / Don’t

### Do

- write small readable functions
- extract duplicated logic
- validate at boundaries
- centralize business rules
- use shared UI primitives
- keep server and client concerns separate
- make error cases explicit
- enforce auth on the server

### Don’t

- duplicate formulas across files
- put DB logic in presentational components
- use `any` casually
- trust the client for permissions
- hide business rules inside JSX
- mix unrelated concerns in one giant file
- add abstractions too early

---

## 15. Decision Rule

When unsure between two implementations, choose the one that is:

- simpler
- clearer
- more consistent with existing patterns
- easier to test
- less repetitive
- safer for financial and authorization-sensitive workflows

If a pattern reduces duplication but makes the code harder to understand, prefer the clearer option unless the duplication is already causing real maintenance cost.
