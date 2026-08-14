---
id: fix-ai-doc-drift
title: Fix stale/incorrect AI context files (ARCHITECTURE.MD, snapshot.json, GEMINI.md)
status: done
owner: agent
feature_area: infra
created: 2026-08-14
---

## Task

Audit of the agent-context files found several actively wrong, not just stale: `documents/ARCHITECTURE.MD` described an `apps/web/` monorepo layout and `/client/*` page tree that were never built (actual client surface is API-only under `app/api/client/*`), and `.claude/snapshot.json`'s schema extractor truncated most tables to 1-2 columns due to a brace-matching bug.

## Acceptance criteria

- [x] `documents/ARCHITECTURE.MD` rewritten (§1-3, §6-7, §9-10) to match actual route/folder structure
- [x] `tools/snapshot.ts` brace-matching bug fixed (was stopping at the first `}`, e.g. inside `.references(() => x.id, { onDelete: ... })`); `env_map` FILL_IN placeholders replaced with real vars derived from `.env.example`; `commands.snapshot` self-report bug fixed (was reporting `pnpm`, needs `bun`)
- [x] `.claude/snapshot.json` regenerated — all 12 tables now show full column lists
- [x] `documents/CONDING-STANDARDS.MD` renamed to `CODING-STANDARDS.MD` (typo), references updated
- [x] `GEMINI.md` removed (no `.gemini/` config in repo, confirmed unused)
- [x] `CLAUDE.md` session-warm-start now points to `documents/ARCHITECTURE.MD`, `CODING-STANDARDS.MD`, `DECISIONS.md`, `docs/README.md`
- [x] `DECISIONS.md` backfilled with the DB-provider-portability and delinquent-status-auto-reconcile decisions, which existed in code/commits but were never logged
- [x] lint, typecheck, typecheck:tools, test:unit all green after changes

## Notes

Root cause pattern across findings: docs describing a *planned* future state (route tree, env map) drifted from what was actually shipped, and nothing forced them back into sync. `docs/features/README.md` (added prior task) is meant to be the harder-to-drift alternative — it's a snapshot of what's implemented, updated in the same PR as the code.
