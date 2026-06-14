---
phase: 04-polish-static-content-performance-hardening
plan: 06
subsystem: infra
tags: [next-15, bundle-analyzer, suspense, lighthouse, performance, react-19]

# Dependency graph
requires:
  - phase: 01-discovery-foundation
    provides: FOUN-02 perf target lock (LCP <1.5s, Lighthouse ≥90); MapSkeleton stationary-skeleton pattern; /bips client-component lineup that needs Suspense wraps
  - phase: 04-polish-static-content-performance-hardening (plan 05)
    provides: AccountDeletedToastIsland — already Suspense-wrapped on homepage; this plan does NOT duplicate that wrap
provides:
  - "@next/bundle-analyzer + cross-env devDeps installed; ANALYZE=true env-gated"
  - "build:analyze, test:e2e, test:e2e:ui npm scripts (Playwright binary still installed by plan 04-07)"
  - "Per-consumer <Suspense> boundaries with stationary skeletons around all 4 useSearchParams consumers on /bips"
  - "Image audit: zero raw <img> tags in app/ or components/"
  - "Lighthouse capture protocol checked in (manual capture pending user action)"
affects: [04-07, future-perf-regressions, v1.1-lighthouse-ci]

# Tech tracking
tech-stack:
  added: ["@next/bundle-analyzer@^15.5.0", "cross-env@^7.0.3"]
  patterns:
    - "Per-consumer Suspense boundaries (not whole-page) on routes with multiple useSearchParams hooks"
    - "Stationary RSC skeletons (no animation, no spinner) to avoid CLS during hydration"
    - "ANALYZE=true gated bundle analyzer (strict-equality check, not coercion)"

key-files:
  created:
    - "components/bip/BipFiltersSidebarSkeleton.tsx"
    - "components/bip/BipSearchBarSkeleton.tsx"
    - "components/bip/BipSortControlSkeleton.tsx"
    - "components/bip/BipPaginationSkeleton.tsx"
    - ".planning/phases/04-polish-static-content-performance-hardening/lighthouse/README.md"
  modified:
    - "package.json"
    - "package-lock.json"
    - "next.config.ts"
    - "app/(public)/bips/page.tsx"

key-decisions:
  - "BipFiltersDrawer reuses BipFiltersSidebarSkeleton — drawer renders the sidebar internally, dimensions match acceptably"
  - "BipFilterChips intentionally NOT Suspense-wrapped — it does not call useSearchParams (state comes via the filters prop)"
  - "BipFiltersSidebarSkeleton renders 7 placeholder rows matching the live accordion sections (country / field / language / dates / ects / status / level)"
  - "Lighthouse audits captured as manual-followup item — surfaced via lighthouse/README.md with step-by-step instructions; user runs locally and commits the four PNGs"

patterns-established:
  - "Skeleton fallback files live in components/bip/ alongside their live counterparts, named <Component>Skeleton.tsx"
  - "Skeletons are RSC (no 'use client'), aria-hidden, stationary (no animate-pulse, no spinner), and use literal Tailwind class strings only"
  - "Per-consumer Suspense (one boundary per useSearchParams consumer) — minimizes the blank area during route transitions"

requirements-completed: []  # Plan 04-06 has no REQ-IDs in frontmatter; satisfies SC-4 (Lighthouse > 90) and CONTEXT D-18..D-21, D-24

# Metrics
duration: ≈40min
completed: 2026-05-14
---

# Phase 04 Plan 06: Performance Hardening Summary

**Bundle analyzer wired behind ANALYZE=true, per-consumer Suspense boundaries with stationary skeletons on /bips, image audit clean, Lighthouse capture protocol staged for user run.**

## Performance

- **Duration:** ≈ 40 min
- **Started:** 2026-05-14
- **Completed:** 2026-05-14
- **Tasks:** 6 (5 automated + 1 manual checkpoint surfaced)
- **Files created:** 5 (4 skeletons + lighthouse README)
- **Files modified:** 4 (package.json, package-lock.json, next.config.ts, app/(public)/bips/page.tsx)

## Accomplishments

- **D-19 satisfied:** @next/bundle-analyzer (^15.5.0) + cross-env (^7.0.3) added as devDeps; `build:analyze` script runs `cross-env ANALYZE=true next build`; verified `.next/analyze/{client,edge,nodejs}.html` reports are generated.
- **D-24 satisfied:** Three new scripts in package.json (`build:analyze`, `test:e2e`, `test:e2e:ui`); `db:migrate` correctly absent (D-24 lock — `supabase db push` is canonical).
- **D-18 satisfied:** Every useSearchParams consumer on /bips wrapped in a per-consumer `<Suspense>` boundary with a stationary skeleton fallback — BipFiltersSidebar, BipFiltersDrawer, BipSearchBar, BipSortControl, BipPagination. BipFilterChips is intentionally not wrapped (no useSearchParams).
- **D-21 satisfied (audit clean):** `grep -rn "<img " app/ components/ --include="*.tsx"` returns zero matches; Phase 1/2/3 used next/image throughout. No migration required.
- **D-20 staged:** Manual Lighthouse audit instructions checked in at `lighthouse/README.md`; awaiting user capture of four PNGs (/, /bips, /bip/{slug}, /what-is-a-bip).

## Task Commits

1. **Task 1: Add devDeps + npm scripts** — `ed92ff5`
2. **Task 2: Wrap next.config in withBundleAnalyzer** — `46703fe`
3. **Task 3: Create 4 stationary skeleton components** — `b24d3e8`
4. **Task 4: Wrap /bips useSearchParams consumers in Suspense** — `2fe60f2`
5. **Task 5: Image audit** — no commit (audit clean; zero raw <img> tags found)
6. **Task 6: Lighthouse manual checkpoint** — staged via `lighthouse/README.md`; awaiting user capture

## Files Created/Modified

### Created
- `components/bip/BipFiltersSidebarSkeleton.tsx` — 7-row stationary skeleton matching the live accordion
- `components/bip/BipSearchBarSkeleton.tsx` — h-10 full-width placeholder
- `components/bip/BipSortControlSkeleton.tsx` — w-40 pill placeholder
- `components/bip/BipPaginationSkeleton.tsx` — five 36px square placeholders
- `.planning/phases/04-polish-static-content-performance-hardening/lighthouse/README.md` — manual capture protocol + targets

### Modified
- `package.json` — +3 scripts (`build:analyze`, `test:e2e`, `test:e2e:ui`), +2 devDeps (`@next/bundle-analyzer`, `cross-env`)
- `package-lock.json` — npm install resolved 17 added packages, no peer-dep conflicts
- `next.config.ts` — wrapped in `withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })`, `reactStrictMode: true` preserved
- `app/(public)/bips/page.tsx` — 5 `<Suspense>` boundaries (sidebar, drawer, search, sort, pagination) with matching skeleton fallbacks; new skeleton imports

## Decisions Made

- **Drawer reuses sidebar skeleton:** BipFiltersDrawer renders `<BipFiltersSidebar />` internally for mobile; reusing `BipFiltersSidebarSkeleton` is dimensionally acceptable and avoids a fifth, near-identical skeleton component.
- **Chips not wrapped:** BipFilterChips receives state via the `filters` prop (RSC-resolved); it does not call useSearchParams, so Suspense-wrapping it would add cost with no benefit.
- **7 accordion rows, not 6:** The plan said "6 filter section placeholders"; reading BipFiltersSidebar.tsx revealed 7 accordion items (country / field / language / dates / ects / status / level). Skeleton adjusted to match — the plan's read_first instruction explicitly authorized this adjustment.
- **Lighthouse checkpoint as manual-followup:** Per the executor brief's escape clause, with no interactive AskUserQuestion available in this background-job context and the user's documented preference for delegated implementation, the four-screenshot capture is staged as a clearly-documented manual followup. Capture protocol + targets + commit instructions live in `lighthouse/README.md`.

## Deviations from Plan

None — plan executed as written, with the planner-authorized 6→7 accordion-row adjustment in Task 3 (read_first instruction expected this audit).

## Issues Encountered

None.

## Manual Followups

### Lighthouse audits (D-20 — BLOCKING for D-20 closure; non-blocking for plan 04-07 to begin)

The user must run the four Lighthouse audits documented in `lighthouse/README.md` and commit the resulting PNGs:

- `lighthouse/home.png` — `/`
- `lighthouse/bips.png` — `/bips`
- `lighthouse/bip-detail.png` — `/bip/{any-seed-slug}`
- `lighthouse/what-is-a-bip.png` — `/what-is-a-bip`

**Targets (locked by FOUN-02):** Performance ≥ 90, Accessibility ≥ 90, SEO ≥ 90, LCP < 1.5s (Mobile, Simulated 4G throttling).

If any score is below target, do not paper over — investigate before approving D-20 closure. Findings should be appended to this SUMMARY under a new "Lighthouse findings" section, and any remediation captured as a follow-up plan.

Plan 04-07 (Playwright E2E) does NOT depend on the Lighthouse capture and can proceed in parallel.

## Next Phase Readiness

- Plan 04-06's automated work is complete; Plan 04-07 (Playwright E2E) is unblocked.
- D-20 Lighthouse capture remains as a single discrete user action; documented and self-serve.
- Bundle analyzer baseline can be re-run at any time via `npm run build:analyze`; reports are in `.next/analyze/` (gitignored).

---
*Phase: 04-polish-static-content-performance-hardening*
*Completed: 2026-05-14*
