# NRM Capital

Next.js app with Drizzle ORM and PostgreSQL.

## Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL running locally

## 1) Install dependencies

```bash
pnpm install
```

## 2) Configure environment

Create or update `.env`:

```env
DB_PROVIDER=postgres
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/postgres
AUTH_SECRET=dev-local-auth-secret
```

Notes:
- `DB_PROVIDER=postgres` is required for local PostgreSQL.
- `DATABASE_URL` is used by the app runtime.
- `DIRECT_URL` is used by Drizzle commands (falls back to `DATABASE_URL` if missing).

## 3) Prepare database schema

Use one of the following:

```bash
pnpm db:push
```

Or, if you prefer migrations:

```bash
pnpm db:migrate
```

## 4) Seed admin user

```bash
pnpm db:seed
```

Default seeded credentials:
- Email: `admin@nrmcapital.com`
- Password: `Admin123!ChangeMe`
- Role: `SUPERADMIN`

## 5) Run the app

```bash
pnpm dev
```

Open [http://localhost:3000/login](http://localhost:3000/login).

## 6) Login

Use the seeded admin credentials:
- Email: `admin@nrmcapital.com`
- Password: `Admin123!ChangeMe`

## Useful commands

- `pnpm dev` - start local dev server
- `pnpm lint` - run ESLint
- `pnpm db:generate` - generate Drizzle migrations
- `pnpm db:migrate` - run migrations
- `pnpm db:push` - push schema directly
- `pnpm db:studio` - open Drizzle Studio
- `pnpm db:seed` - seed admin user
