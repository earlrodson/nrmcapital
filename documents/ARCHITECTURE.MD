# NRM Lending Architecture

> Version: 2.0
> Last updated: 2026-04-16
> Status: Active

---

## 1. Overview

This document defines the current application architecture for **NRM Lending** based on the route strategy now in use by the project.

The platform is split into three major route areas:

- `/*` for public-facing pages
- `/admin/*` for authenticated admin-only pages
- `/client/*` for client-facing pages, with a mix of public and protected routes depending on feature needs

This file supersedes earlier architecture assumptions that treated the app as admin-only with no public routes.

---

## 2. Route Model

### Public routes

These are pages accessible without authentication.

- `/` — landing page
- future marketing or informational pages under `/*`
- selected client entry pages under `/client/*` when a feature requires public access, such as login or onboarding

### Admin protected routes

These routes are for internal staff and require authenticated admin access.

- `/admin/dashboard`
- `/admin/clients`
- `/admin/clients/new`
- `/admin/clients/[id]`
- `/admin/loans`
- `/admin/loans/new`
- `/admin/loans/[id]`
- `/admin/payments/new`
- `/admin/investors`
- `/admin/investors/[id]`
- `/admin/reports`
- `/admin/settings/users`

### Client routes

Client routes live under `/client/*`.

They may be:

- public, such as `/client/login`
- protected, such as `/client/dashboard`, `/client/loans`, or `/client/payments`

Authentication and authorization for client routes must be handled separately from admin access. A client session must never be treated as an admin session.

---

## 3. Architectural Principles

### Separation by audience

The route structure should clearly communicate who the page is for:

- public pages for visitors and unauthenticated users
- admin pages for internal operations
- client pages for borrower self-service experiences

### App Router only

The application uses **Next.js App Router** exclusively.

### Protected route groups

Route groups should reflect the three route families:

```text
app/
  (public)/
    page.tsx
  (auth)/
    login/
      page.tsx
  admin/
    dashboard/
    clients/
    loans/
    payments/
    investors/
    reports/
    settings/
  client/
    login/
    dashboard/
    loans/
    payments/
```

Route groups are for organization only. Public URLs remain:

- `/`
- `/login` if global admin login is kept public
- `/admin/...`
- `/client/...`

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

### Client pages

Client pages may be either:

- unauthenticated, for entry flows like login or verification
- authenticated, for borrower dashboards and loan views

Client auth logic must be scoped so clients cannot access `/admin/*`.

---

## 6. Recommended Folder Structure

```text
apps/web/
  app/
    (public)/
      page.tsx
    login/
      page.tsx
    admin/
      dashboard/
        page.tsx
      clients/
        page.tsx
        new/
          page.tsx
        [id]/
          page.tsx
      loans/
        page.tsx
        new/
          page.tsx
        [id]/
          page.tsx
      payments/
        new/
          page.tsx
      investors/
        page.tsx
        [id]/
          page.tsx
      reports/
        page.tsx
      settings/
        users/
          page.tsx
    client/
      login/
        page.tsx
      dashboard/
        page.tsx
      loans/
        page.tsx
      payments/
        page.tsx
  components/
    app/
    ui/
  lib/
    auth/
    db/
    validations/
  actions/
  hooks/
  middleware.ts
```

---

## 7. Current Implementation Status

### Already aligned with this architecture

- public root page exists at `/`
- admin placeholder routes exist under `/admin/*`
- login page exists
- the app uses Next.js App Router
- the app uses a shared reusable placeholder component for initial scaffolding

### Still to be added for full alignment

- `/client/*` route scaffolding
- middleware-based protection for admin and protected client pages
- Auth.js integration
- role separation between admin and client sessions
- domain actions, database layer, and validations
- route-group layouts for admin shell and future client shell

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

Expected future client protected pages:

- `/client/dashboard`
- `/client/loans`
- `/client/loans/[id]`
- `/client/payments`
- `/client/profile`

Expected future admin additions:

- audit logs
- payment history views
- report detail screens
- investor returns views

---

## 10. Decision Summary

The canonical route model for the project is now:

- `/*` for public pages
- `/admin/*` for admin protected pages
- `/client/*` for client pages, with both open and protected flows

All future implementation decisions should align to this structure unless this document is revised again.
