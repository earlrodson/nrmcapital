<!-- session-warm-start -->
<!--
  READ THIS FIRST at the start of every session.
  Then read .claude/snapshot.json (if present) for schema, routes, env vars, and commands.
  Regenerate: pnpm run snapshot && pnpm run index
-->

## Session context

```yaml
project:  nrmcapital
stack:    pnpm · Next.js 16 (App Router) · Drizzle ORM (PostgreSQL) · TypeScript
snapshot: .claude/snapshot.json
```

## Docs — read before assuming architecture or status

- `documents/ARCHITECTURE.MD` — canonical route model and folder structure. Trust this over any file layout you infer from exploring, and over stale assumptions from training data.
- `documents/CODING-STANDARDS.MD` — mandatory coding rules (money handling, validation, TS strictness).
- `DECISIONS.md` — ADR log; check before re-litigating an architectural choice.
- `docs/README.md` — product/tech-spec/feature-inventory/ticket-tracking system. `docs/features/*.md` is the "what's actually implemented" source of truth; `docs/tasks/YYYY-Www/` is the ticket tracker (there is no external tracker).

## Commands (do not re-derive)

```bash
dev:             pnpm run dev
lint:            pnpm run lint
typecheck:       pnpm run typecheck        # app code (tools/ is checked separately)
typecheck:tools: pnpm run typecheck:tools  # tools/*.ts (bun runtime, own tsconfig)
test:unit:       pnpm run test:unit        # vitest — lib/**/*.test.ts
test:e2e:        pnpm run test:e2e         # playwright — tests/*.spec.ts
index:           pnpm run index
search:          bun tools/vector-search.ts "<query>"
snapshot:        pnpm run snapshot
```

CI (`.github/workflows/ci.yml`) runs lint, both typecheck targets, and unit tests on every push/PR; e2e runs against a Postgres service container in a separate job.

## Semantic search (use before grep)

```bash
bun tools/vector-search.ts "<query>"          # top 5 results
bun tools/vector-search.ts "<query>" --json   # machine-readable
```

**Rule:** use this before any grep, find, or Explore agent call.

Note: `tools/vector-index.ts` and `tools/vector-search.ts` use `bun:sqlite` and must be run with `bun` directly, even though this project's package manager is pnpm.

<!-- /session-warm-start -->

@AGENTS.md
