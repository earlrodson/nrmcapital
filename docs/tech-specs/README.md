# Tech Specs

**Canonical architecture reference:** `documents/ARCHITECTURE.MD` (route model, layering) and `documents/CODING-STANDARDS.MD` (coding rules). Do not duplicate those here — link to them.

This folder holds specs written **before starting** a specific piece of new work, when the design isn't obvious from the existing architecture doc (e.g., a new integration, a schema change with migration risk, a cross-cutting refactor). Not every task needs one — most tasks just need a `docs/tasks/` entry.

## When to write one

Write `docs/tech-specs/<slug>.md` when a task involves:
- A new external integration (payment gateway, notification provider, etc.)
- A schema change touching more than one table's relationships
- A decision significant enough that it should also get a `DECISIONS.md` entry once made

## Template

```markdown
# <Feature/Change> Tech Spec

- **Related task:** docs/tasks/YYYY-Www/<slug>.md
- **Status:** draft | approved | implemented

## Problem
## Proposed approach
## Alternatives considered
## Data model changes
## Rollout / migration plan
## Open questions
```

Once implemented, update `docs/features/<area>.md` and, if the decision is worth preserving, add an entry to `DECISIONS.md`.
