# NRM Lending Architecture

> Version: 3.0
> Last updated: 2026-08-14
> Status: Active

---

## 1. Overview

This document defines the current application architecture for **NRM Lending** based on the route strategy now in use by the project.

The platform is split into three major route areas:

- `/*` for public-facing pages
- `/admin/*` for authenticated admin-only pages
- `/api/client/*` for the client self-service surface — **API routes only**, no page tree (see §6)

This file supersedes earlier architecture assumptions that treated the app as admin-only with no public routes, and earlier versions of this file that described a planned `/client/*` page tree that was never built.

---

## 2. Route Model

### Public routes

These are pages accessible without authentication.

- `/` — landing page
- `/apply` — public loan application intake
- `/login` — staff login
- future marketing or informational pages under `/*`

### Admin protected routes

These routes are for internal staff and require authenticated admin access.

- `/admin/dashboard`, `/admin/dashboard/activity`
- `/admin/clients`, `/admin/clients/new`, `/admin/clients/[id]`
- `/admin/loans`, `/admin/loans/new`, `/admin/loans/[id]`
- `/admin/payments`, `/admin/payments/new`, `/admin/payments/summary`
- `/admin/investors`, `/admin/investors/[id]`
- `/admin/funding/add`, `/admin/funding/withdraw`
- `/admin/applications`
- `/admin/reports`
- `/admin/settings/profile`, `/admin/settings/users`

### Client routes

There is no client-facing page tree today. Client self-service is exposed as JSON API routes under `/api/client/*`:

- `/api/client/dashboard`
- `/api/client/loans`, `/api/client/loans/[id]`
- `/api/client/payments`

Authentication and authorization for client routes must be handled separately from admin access. A client session must never be treated as an admin session (`lib/api/auth-guard.ts`).

---

## 3. Architectural Principles

### Separation by audience

The route structure should clearly communicate who the page is for:

- public pages for visitors and unauthenticated users
- admin pages for internal operations
- an API-only surface for client (borrower) self-service — see §6 for why there's no client page tree

### App Router only

The application uses **Next.js App Router** exclusively.

### Route families

See §6 for the actual folder structure. At a high level:

- `app/` — public pages + `admin/` (staff pages) + `api/client/*` (client self-service API)

Public URLs:

- `/`, `/apply`
- `/login` (staff)
- `/admin/...`
- `/api/client/...`

---

## 4. Technology Stack

### Core stack

- **Framework:** Next.js 16 App Router
- **Language:** TypeScript
- **Runtime:** Node.js 20+
- **Styling:** Tailwind CSS v4
- **UI Base:** shadcn/ui via shared workspace package
- **Package manager:** pnpm
- **Monorepo tooling:** Turbo

### Planned application stack

These remain the target implementation choices as the app grows:

- **Authentication:** Auth.js / NextAuth v5
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Validation:** Zod
- **Money handling:** Decimal.js
- **Server state:** TanStack Query
- **Client UI state:** Zustand

---

## 5. Route Protection Strategy

### Public pages

Public pages require no session.

### Admin pages

All `/admin/*` pages require:

- authenticated session
- admin role check

If the user is not authenticated, redirect to the appropriate login page.

If role-specific behavior is introduced later, use role checks in both:

- middleware for coarse route protection
- server actions for final authorization enforcement

### Client API routes

`/api/client/*` routes may be either:

- unauthenticated, for entry flows like login or verification
- authenticated, for borrower dashboard/loan/payment data

Client auth logic must be scoped so clients cannot access `/admin/*`.

---

## 6. Actual Folder Structure

The app is a single Next.js project at repo root — **not** an `apps/web/` monorepo package. Client-facing functionality is API-only (`app/api/client/*`); there is no `app/client/*` page tree. This supersedes the earlier target structure below §7.

```text
app/
  page.tsx                     public landing page
  login/page.tsx                staff login
  apply/page.tsx                 public loan application intake
  admin/
    dashboard/page.tsx
    dashboard/activity/page.tsx
    clients/page.tsx, new/, [id]/
    loans/page.tsx, new/, [id]/
    payments/page.tsx, new/, summary/
    investors/page.tsx, [id]/
    funding/add/, withdraw/
    applications/page.tsx
    reports/page.tsx
    settings/profile/, users/
  api/
    auth/{login,logout,me,refresh}/route.ts
    admin/{attachments,audit-logs,reports,settings,upload}/...
    client/{dashboard,loans,payments}/route.ts   # client surface — API only, no pages
components/
  ui/                            shadcn primitives
  <feature>/                     feature-specific components
lib/
  auth/                          session + password hashing
  db/                            drizzle client + repositories
  domain/                        pure calculation logic (loan-calculations, payment-events)
  services/                      business logic coordination
  actions/                       server actions, split admin/ and top-level
  validations/                   zod schemas
  api/                           route handler helpers (auth-guard, pagination, response, s3)
  presentation/                  formatters, status display
drizzle/                         schema + migrations
```

---

## 7. Current Implementation Status

For a per-feature breakdown of what's implemented, see `docs/features/README.md` — this section only tracks alignment with the route/folder model above.

### Implemented

- Public (`/`, `/apply`), staff (`/login`, `/admin/*`), and client-API (`/api/client/*`) surfaces all exist and are role-separated
- Client sessions cannot access `/admin/*` (`lib/api/auth-guard.ts`)
- Full admin feature set: clients, loans, payments, investors, funding, applications, reports, settings/users, audit logs
- Domain/service/validation layering as described in §4

### Deliberately not built

- `app/client/*` UI pages (borrower-facing web UI beyond the API surface) — client self-service today is API-only; a dedicated client UI is a future scope decision, not an oversight. Log a decision in `DECISIONS.md` before building it, since it changes the route model in §2.

---

## 8. Placeholder Page Policy

During scaffolding, blank placeholder pages are acceptable when:

- route names are stable
- navigation and access strategy are still being finalized
- backend features are not yet implemented

Each placeholder should clearly show:

- the page title
- the intended route
- a short note describing the future purpose of the page

This helps routing, QA, and handoff while feature work is still pending.

---

## 9. Future Expansion

Expected future public pages:

- about
- contact
- FAQs
- public application or lead capture pages

A dedicated borrower-facing web UI (as opposed to the current `/api/client/*` API surface) is a candidate future addition, not committed work — see §7.

---

## 10. Decision Summary

The canonical route model for the project is:

- `/*` for public pages
- `/admin/*` for admin-protected pages
- `/api/client/*` for the client self-service surface (API only, no page tree today)

All future implementation decisions should align to this structure unless this document is revised again.
