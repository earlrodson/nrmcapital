# Decisions

Architectural Decision Records for this project. One entry per decision that would be expensive to re-litigate or non-obvious to a future reader — not a log of every choice made.

## Format

```
### {Title}
- **Date:** YYYY-MM-DD
- **Status:** proposed | accepted | deprecated | superseded
- **Context:** what problem or constraint forced this decision
- **Decision:** what was chosen
- **Consequences:** what this makes easier/harder, what it rules out
```

---

<!-- Add entries below, most recent first -->

### Auto-reconcile loan status from client delinquency
- **Date:** 2026-08-12
- **Status:** accepted
- **Context:** Loan status (`ACTIVE`/`COMPLETED`/`DEFAULTED`) and client activity state were being tracked independently, requiring manual sync and risking drift between a client's delinquent flag and their loans' actual status.
- **Decision:** Loan status and client delinquency are synced automatically when balances change, via `lib/db/repositories/loan-status.repository.ts`. No manual reconciliation step.
- **Consequences:** Removes a class of data-drift bugs; makes loan status a derived value that must not be hand-edited independently of balance/payment changes. See commit `56436c4`.

### DB provider portability (Supabase ⇄ standard PostgreSQL)
- **Date:** 2026-04-20 (approx., predates ADR log)
- **Status:** accepted
- **Context:** Needed to avoid vendor lock-in on the hosted Postgres provider while keeping schema/data consistent and switching hosts without touching business logic.
- **Decision:** `DB_PROVIDER` env var (`supabase|postgres`) plus `DATABASE_URL`/`DIRECT_URL` contract; all DB access goes through `lib/db/client.ts` and repository/service modules only — no direct provider-specific calls elsewhere. Full runbook: `documents/DB_PROVIDER_MIGRATION_RUNBOOK.md`.
- **Consequences:** Any new DB access must go through the shared client/repository layer or it breaks portability. Migrating hosts is an env-var change, not a code change.
