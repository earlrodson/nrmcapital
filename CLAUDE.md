<!-- session-warm-start -->
<!--
  READ THIS FIRST at the start of every session.
  Then read .claude/snapshot.json (if present) for schema, routes, env map, and commands.
  Regenerate: pnpm run snapshot | pnpm run index
-->

## Session context

```yaml
project:  nrmcapital
stack:    pnpm · Next.js 16 (App Router) · Drizzle ORM (PostgreSQL) · TypeScript
snapshot: .claude/snapshot.json
```

## Commands (do not re-derive)

```bash
dev:       pnpm run dev
lint:      pnpm run lint
typecheck: pnpm exec tsc --noEmit
test:      pnpm run test:e2e
index:     pnpm run index
search:    bun tools/vector-search.ts "<query>"
snapshot:  pnpm run snapshot
```

## Semantic search (use before grep)

```bash
bun tools/vector-search.ts "<query>"          # top 5 results
bun tools/vector-search.ts "<query>" --json   # machine-readable
```

**Rule:** use this before any grep, find, or Explore agent call.

Note: `tools/vector-index.ts` and `tools/vector-search.ts` use `bun:sqlite` and must be run with `bun` directly, even though this project's package manager is pnpm.

<!-- /session-warm-start -->

@AGENTS.md
