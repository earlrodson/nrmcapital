# NRM Capital - Project Context & Guidelines

## Project Overview
**NRM Capital** is a Next.js 16 monorepo-based lending platform built with the App Router, React 19, Tailwind CSS v4, and shadcn/ui. The project aims to provide a unified portal for public users, administrators, and clients.

### Main Technologies
- **Monorepo:** [pnpm](https://pnpm.io/) workspaces + [Turbo](https://turbo.build/)
- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Language:** TypeScript 5.9.3 (Strict mode)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/) (stored in `packages/ui`)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Runtime:** Node.js 20+

## Architecture & Structure
The project is split into three major route areas to distinguish audiences:
- `/*` (Public): Visitors and unauthenticated landing pages.
- `/admin/*` (Protected): Internal staff operations (dashboards, clients, loans, reports).
- `/client/*` (Mixed): Borrower self-service (login, loan status, payments).

### Repository Structure
- `apps/web`: The main Next.js application.
- `packages/ui`: Shared UI component library using shadcn/ui.
- `packages/eslint-config`: Shared ESLint configurations.
- `packages/typescript-config`: Shared TypeScript configurations.
- `documents/`: Contains canonical architecture and coding standard documentation.

## Development Workflow

### Key Commands
- **Install dependencies:** `pnpm install`
- **Development mode:** `pnpm dev` (Runs all apps via Turbo)
- **Build projects:** `pnpm build`
- **Linting:** `pnpm lint`
- **Formatting:** `pnpm format`
- **Type checking:** `pnpm typecheck`

### Adding UI Components
To add new shadcn/ui components to the workspace, run from the root:
```bash
pnpm dlx shadcn@latest add [component-name] -c apps/web
```
*Note: This automatically places components in `packages/ui/src/components`.*

### Using UI Components
Import components from the workspace package:
```tsx
import { Button } from "@workspace/ui/components/button";
```

## Coding Standards & Conventions
Refer to `documents/ARCHITECTURE.MD` and `documents/CONDING-STANDARDS.MD` for exhaustive details.

### Core Principles
- **Strict TypeScript:** Avoid `any`. Prefer explicit domain types.
- **DRY (Don't Repeat Yourself):** Centralize business logic, validation, and formatting.
- **Server-First:** Default to Server Components; use Client Components (`'use client'`) only when interactivity or browser APIs are required.
- **Zod Validation:** All inputs at boundaries (Server Actions, API routes) MUST be validated using Zod schemas.
- **Precise Money Handling:** NEVER use floating-point math for currency. Use `Decimal.js` (or approved precise library).
- **Explicit UI States:** Account for Loading, Empty, Error, and Success states in all user-facing screens.

### Preferred Patterns
- **Server Actions:** Use for data mutations.
- **Route Groups:** Use in `apps/web/app/` for organization (e.g., `(public)/`, `(admin)/`, `(client)/`).
- **Composition:** Page files should compose reusable UI primitives rather than containing large blocks of JSX.
- **State Management:**
    - Server State: TanStack Query (planned).
    - UI State: Zustand or React local state.

## Critical Files
- `documents/ARCHITECTURE.MD`: Canonical route and module strategy.
- `documents/CONDING-STANDARDS.MD`: Detailed technical requirements and "Do/Don't" list.
- `apps/web/package.json`: Main app dependencies and scripts.
- `packages/ui/src/lib/utils.ts`: Shared utility functions (e.g., `cn` for Tailwind class merging).
- `turbo.json`: Monorepo task pipeline configuration.
