---
id: client-dashboard-mobile-template
title: Confirm and harden client dashboard mobile responsiveness
status: done
owner: agent
feature_area: client-portal
created: 2026-08-14
---

## Task

`app/client/dashboard/client-dashboard-client.tsx` and `app/client/layout.tsx` currently exist and work (verified against real DB data: name, current balance, % paid, last payment date per loan, plus logout).

**Scope correction (2026-08-14):** the original plan below called for stripping the admin visual language (gradients, glass cards) down to a "basic" template. User clarified mid-task that the actual ask is narrower: the existing look should stay, it just needs to genuinely be mobile-responsive — verified at real small viewports, not assumed. This task was re-scoped accordingly: audit + fix responsiveness issues, keep the visual design as-is.

## Acceptance criteria

- [x] `app/client/layout.tsx` header confirmed to degrade cleanly at 320px, 375px, and 768px viewport widths (Playwright viewport emulation + screenshots, see Notes) — no horizontal overflow at any width
- [x] `app/client/dashboard/client-dashboard-client.tsx`'s card layout is already single-column by default: the `grid` container had no explicit `grid-cols-N` below the `md:grid-cols-2` breakpoint, so Tailwind's bare `grid` class alone produces one implicit column per row — confirmed via screenshot, no code change needed there
- [x] No dependency on admin-only components — confirmed both files only import from `@/components/ui/*` (shared primitives), never `components/admin/*`
- [x] Manual check on real small viewports via Playwright viewport emulation (320×568, 375×667, 768×1024) against a throwaway seeded client with a long name, an active loan, and a payment — not a visual guess
- [x] `docs/features/client-portal.md` updated to describe the client-facing dashboard UI (previously only listed the API routes)

## Fix applied

- `app/client/layout.tsx`: the "Sign out" button used `size="sm"` (24px tall) — too small a tap target on what is the only interactive control on a phone-first, single-purpose page. Bumped to `size="lg"` with an explicit `h-10` (40px), closer to the ~44px mobile tap-target guideline, without touching anything else about the page's look.

## Notes

- Depends on [[route-middleware-admin-client-separation]] and [[client-login-by-client-id]] landing so the page is reachable through the real login flow during testing — both done earlier in this session
- Verified live: seeded a throwaway client (`clients`/`users`/`loans`/`payments` rows, deliberately given a long two-part name to stress-test wrapping) via a scratch bun script, logged in through the real `/login` flow with Playwright at each viewport width, checked `document.documentElement.scrollWidth > clientWidth` (false at all three widths — no horizontal overflow), and reviewed screenshots. All test rows and scratch files deleted afterward.
- At 768px a single loan card doesn't stretch to fill the row (by design — `md:grid-cols-2` only engages a second column when there's a second loan to show); this is expected, not a bug, and out of scope for this task per the re-scoped ask.
