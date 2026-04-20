# DB Provider Migration Runbook

This runbook keeps the app portable between Supabase-hosted Postgres and any standard PostgreSQL provider (e.g. DigitalOcean Managed PostgreSQL).

## Goal

- Keep PostgreSQL schema and data consistent.
- Switch hosts by changing environment variables, not business logic.
- Validate critical lending workflows after migration.

## Prerequisites

- Production backup access to source database.
- Target PostgreSQL instance provisioned and reachable.
- Application uses the shared DB layer (`lib/db/client.ts`) and repository/service modules only.
- Drizzle schema is source of truth: `drizzle/schema.ts`.
- SQL migration history is tracked and committed.

## Environment Contract

Use the same app env variables across providers:

- `DB_PROVIDER=supabase|postgres`
- `DATABASE_URL` (runtime URL)
- `DIRECT_URL` (optional direct connection for migration/introspection)

Example usage:

- Supabase as host:
  - `DB_PROVIDER=supabase`
  - `DATABASE_URL=postgresql://...`
- DigitalOcean as host:
  - `DB_PROVIDER=postgres`
  - `DATABASE_URL=postgresql://...`

## Supabase -> Generic PostgreSQL Migration Procedure

1. Freeze writes and announce maintenance window.
2. Export source data from Supabase Postgres.
3. Restore into target PostgreSQL.
4. Point app envs to new host.
5. Run migration deploy and smoke tests.
6. Cut traffic and monitor.

### 1) Freeze writes

- Put app in maintenance/read-only mode to avoid data drift during copy.
- Record migration start timestamp.

### 2) Export from Supabase

Use `pg_dump` against the Supabase Postgres connection string:

```bash
pg_dump --format=custom --no-owner --no-privileges --file=nrmcapital.dump "$SOURCE_DATABASE_URL"
```

### 3) Restore to target host

Create target database first, then restore:

```bash
pg_restore --no-owner --no-privileges --clean --if-exists --dbname="$TARGET_DATABASE_URL" nrmcapital.dump
```

If custom SQL roles/extensions differ by provider, resolve before cutover and re-run restore.

### 4) Switch app connection

- Update deployment secrets:
  - `DATABASE_URL=$TARGET_DATABASE_URL`
  - `DIRECT_URL=$TARGET_DIRECT_URL` (if used)
  - `DB_PROVIDER=postgres`
- Redeploy application.

### 5) Run schema validation/deploy

```bash
pnpm db:generate
pnpm db:migrate
```

### 6) Smoke tests and cutover

Verify:

- Authentication/admin login path still works.
- Loan creation writes succeed.
- Payment posting updates both `payments` and loan counters transactionally.
- Overdue/payment schedule reads are healthy.
- Key dashboard/list queries return within expected latency.

## Data Integrity Checks

Run row-count and sampling checks before opening writes:

- `clients`, `loans`, `payment_schedules`, `payments`, `funding_transactions`, `audit_logs`.
- Compare count deltas and max timestamps.
- Validate foreign key consistency for:
  - `loans.client_id`
  - `payments.loan_id`
  - `payment_schedules.loan_id`

## Rollback Plan

If post-cutover checks fail:

1. Pause writes immediately.
2. Repoint env to previous source host.
3. Redeploy.
4. Reopen writes.
5. Investigate and rerun migration in next window.

## Operational Notes

- Avoid provider-specific SQL features unless versioned and portable.
- Keep RLS/policies/triggers in versioned SQL files if added.
- Keep migration scripts and runbook updated as schema evolves.

## Drizzle Workflow Cheatsheet

- Generate SQL migration from schema:

```bash
pnpm db:generate
```

- Apply pending migrations:

```bash
pnpm db:migrate
```

- Push schema directly (non-production convenience):

```bash
pnpm db:push
```

- Open Drizzle Studio:

```bash
pnpm db:studio
```
