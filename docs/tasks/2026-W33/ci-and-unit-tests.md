---
id: ci-and-unit-tests
title: Add unit test runner, CI pipeline, and fix tools/ typecheck
status: done
owner: agent
feature_area: infra
created: 2026-08-14
---

## Task

Repo had no CI and no fast unit-test runner (only Playwright e2e). `pnpm exec tsc --noEmit` also failed on `tools/*.ts` (bun-only files pulled into the app tsconfig).

## Acceptance criteria

- [x] Vitest added with unit tests for `lib/domain/loan-calculations.ts` and `lib/presentation/formatters.ts`
- [x] `tools/` gets its own bun-typed tsconfig so `pnpm run typecheck` covers app code cleanly
- [x] `.github/workflows/ci.yml` runs lint, both typecheck targets, and unit tests on every push/PR; e2e runs in a separate job against a Postgres service container
- [x] `CLAUDE.md` and `GEMINI.md` command references updated to match

## Notes

- `vitest.config.ts`, `tools/tsconfig.json`, `.github/workflows/ci.yml`
- `lib/domain/loan-calculations.test.ts`, `lib/presentation/formatters.test.ts`
