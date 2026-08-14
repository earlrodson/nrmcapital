# Docs & Ticket Tracking System

This is the base for both AI-agent and human ticket tracking on NRM Lending. There is no external tracker (Linear/Jira/GitHub Issues) — **this folder is the tracker.**

## Layout

```
docs/
  README.md              this file
  product/
    PRD_BRD.md            what the product is for and who it serves (business + product requirements, combined)
  tech-specs/
    README.md              points to the canonical architecture docs; only NEW specs for in-flight work live here
    <feature>.md            written when a task needs a spec before implementation (not retroactive)
  features/
    <feature-area>.md       "done" inventory — what's actually implemented, generated from reading the code
  tasks/
    TEMPLATE.md
    YYYY-Www/
      <task-slug>.md
```

## Why this isn't redundant with existing docs

- `documents/ARCHITECTURE.MD` and `documents/CODING-STANDARDS.MD` remain the canonical **how we build** references — this system does not duplicate them. `docs/tech-specs/README.md` links out rather than re-explaining.
- `DECISIONS.md` remains the ADR log for irreversible/expensive-to-relitigate calls — ticket files link to a decision instead of re-arguing it.
- What was missing and is new here: **product intent** (why a feature exists, PRD_BRD.md), a **feature-complete inventory** (what's actually shipped vs. planned, `docs/features/`), and **task-level tracking** (`docs/tasks/`) — none of that existed before.

## Conventions

- **Weekly foldering starts now (2026-W33)**, forward-only. Past work is not backfilled from git history — the `docs/features/*.md` inventory already captures "what exists today" as a snapshot, so there's no gap.
- One task = one file in `docs/tasks/YYYY-Www/<slug>.md`, using `docs/tasks/TEMPLATE.md`.
- A task's status lives only in its own file's frontmatter (`status:`), not duplicated elsewhere — grep across `docs/tasks/**/*.md` for `status: in_progress` etc. instead of maintaining a separate board.
- When a task ships, update the relevant `docs/features/<feature-area>.md` entry in the same PR — that file is the "done functions" source of truth, and it rots the moment code and doc diverge.
- Keep task files short. They point at code (`file:line`) and at `docs/features/*.md`; they don't restate implementation detail that's already legible from the diff.

## Risk to watch

A docs-as-tracker system only works if it's updated in the same commit as the code change it describes. If that discipline slips, prefer deleting stale sections over leaving them — a wrong doc actively misleads the next agent more than a missing one.
