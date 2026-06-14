---
phase: 01-discovery-foundation
plan: 06
subsystem: ui
tags: [next.js, supabase, tailwind, shadcn, zod, url-state, fts, pagination, filters]

# Dependency graph
requires:
  - phase: 01-02
    provides: BipWithRelations type, search_vector GIN index, immutable_unaccent, ISCED_FIELDS, ERASMUS_COUNTRIES
  - phase: 01-03
    provides: 20 seeded approved BIPs exercising all 7 filter dimensions
  - phase: 01-04
    provides: (public) layout chrome, EU palette tokens, Button component, cn utility
  - phase: 01-05
    provides: BipCard + BookmarkHeartIsland components (reused unchanged)
provides:
  - /bips browse page with 7 URL-driven filter groups + full-text search + sort + pagination
  - lib/filters/parseSearchParams.ts (Zod BipFilterState — shared contract for admin Phase 3)
  - lib/filters/buildSupabaseQuery.ts (pure applyFilters() — Phase 3 admin view reuses)
  - lib/queries/bips.ts (getBips/countBips — single PostgREST embed, Phase 3 reuses)
  - BipFiltersSidebar, BipFiltersDrawer, BipSearchBar, BipSortControl, BipGrid, BipPagination, BipsEmptyState, BipFilterChips components
affects:
  - 01-07: /bip/[slug] detail page reuses BipCard and bookmark Zustand store
  - Phase 3: admin all-listings view calls getBips(filters, { statusOverride: 'pending' })

# Tech tracking
tech-stack:
  added:
    - use-debounce@10.0.4 (BipSearchBar 300ms debounce)
    - vaul (via shadcn drawer — Vaul-based bottom sheet)
    - @radix-ui/react-slot (Button asChild support for DrawerClose/Trigger composition)
    - react-day-picker@10 (shadcn calendar dep — installed but not used in this plan)
  patterns:
    - URL-as-filter-state: RSC reads searchParams → Zod parse → PostgREST query → server render; client components write to URL via useSearchParams + useRouter.push
    - Single PostgREST relational embed in getBips() (PITFALLS Pitfall 21 — no N+1)
    - Canonical meta pinned to /bips regardless of query params (PITFALLS Pitfall 14)
    - Pure applyFilters() function: testable, Phase 3 reusable
    - Base UI Accordion uses `multiple` prop (not `type="multiple"` like Radix)
    - Slider onValueChange: (v: number | readonly number[]) — cast to array for range slider usage

key-files:
  created:
    - lib/filters/parseSearchParams.ts
    - lib/filters/buildSupabaseQuery.ts
    - lib/queries/bips.ts
    - app/(public)/bips/page.tsx
    - app/(public)/bips/loading.tsx
    - app/(public)/bips/error.tsx
    - components/bip/BipFiltersSidebar.tsx
    - components/bip/BipFiltersDrawer.tsx
    - components/bip/BipSearchBar.tsx
    - components/bip/BipSortControl.tsx
    - components/bip/BipGrid.tsx
    - components/bip/BipPagination.tsx
    - components/bip/BipsEmptyState.tsx
    - components/bip/BipFilterChips.tsx
    - components/ui/accordion.tsx
    - components/ui/calendar.tsx
    - components/ui/drawer.tsx
    - components/ui/select.tsx
    - components/ui/skeleton.tsx
    - components/ui/slider.tsx
  modified:
    - components/ui/button.tsx (added asChild via @radix-ui/react-slot; compat aliases for shadcn deps)

key-decisions:
  - "Plan 01-06: text search uses .textSearch('search_vector', q, { type: 'websearch', config: 'english' }) — backed by GIN index on search_vector tsvector from 01-02 migration"
  - "Plan 01-06: pagination is numbered 24/page; first page is ?page=1 (NOT 0); page=1 drops the param for clean URLs"
  - "Plan 01-06: all filters parse via Zod BipFilterSchema.safeParse — invalid values default silently to no-filter; never throw"
  - "Plan 01-06: BipFiltersDrawer uses vaul-based shadcn Drawer for mobile; BipFiltersSidebar is 'use client' for desktop (sticky via useRouter.push)"
  - "Plan 01-06: shadcn accordion/slider use @base-ui/react not @radix-ui — API differs: Accordion needs `multiple` prop not `type='multiple'`; Slider onValueChange signature is (v: number | readonly number[])"
  - "Plan 01-06: Button.tsx extended with asChild support (@radix-ui/react-slot) and shadcn compat variant/size aliases (outline, secondary, destructive, link, icon, default)"

patterns-established:
  - "URL-as-filter-state: RSC page.tsx awaits searchParams → parseSearchParams (Zod) → getBips (PostgREST) → server render; client components write back to URL"
  - "applyFilters() is a pure function — no side effects, easy to test, reusable in Phase 3 admin view with statusOverride param"
  - "BROW-04 gate: language_of_instruction filter MUST use lowercase values — DB stores lowercase ISO 639-1; never call .toUpperCase() on filter values"

requirements-completed:
  - BROW-01
  - BROW-02
  - BROW-03
  - BROW-04
  - BROW-05
  - BROW-06
  - BROW-07
  - BROW-08
  - BROW-09
  - BROW-10
  - BROW-11
  - BROW-12
  - BROW-13
  - FOUN-02

# Metrics
duration: 90min
completed: 2026-05-09
---

# Phase 1 Plan 06: Browse All BIPs Summary

**URL-driven /bips browse page with 7 filter groups (country/field/language/dates/ECTS/status/level), 300ms-debounced FTS via search_vector GIN + unaccent, 24/page numbered pagination, Vaul mobile drawer, and empty-state matching D-04 verbatim**

## Performance

- **Duration:** ~90 min
- **Started:** 2026-05-09T06:00:00Z
- **Completed:** 2026-05-09T07:30:00Z
- **Tasks:** 3 auto tasks + 1 human-verify (auto smoke-checked)
- **Files modified:** 21

## Accomplishments

- Complete /bips page shipped as async RSC shell: reads searchParams, Zod parses, single PostgREST query with host_university embed, renders sidebar + grid + pagination
- All 7 filter groups wired to URL state (BROW-02..08); BipSearchBar with 300ms debounce updates ?q= (BROW-09 unaccent path live); BipSortControl defaults to deadline-soonest (D-03)
- Mobile drawer (Vaul-based shadcn) mirrors all 7 filter widgets with sticky "Show N results" footer (D-01); desktop 280px sticky sidebar always visible at ≥1024px
- Canonical `<link>` pinned to https://biphub.eu/bips on every parameterized URL — no duplicate-content indexing (PITFALLS Pitfall 14)
- BipsEmptyState matches D-04 copy verbatim; BipFilterChips chip row with individual remove + Clear-all
- npm run build exits 0; npm run lint exits 0; /bips smoke checks pass (invalid ?country=zz falls back gracefully, canonical persists on ?country=de)

## Task Commits

1. **Task 1: Data layer (filter parser + query builder + getBips)** - `6f7d216` (feat)
2. **Task 2+3: RSC page + UI components** - `710c681` (feat)

## Files Created/Modified

- `lib/filters/parseSearchParams.ts` — Zod BipFilterSchema + parseSearchParams() + PAGE_SIZE=24
- `lib/filters/buildSupabaseQuery.ts` — pure applyFilters() with all 7 filter chains + textSearch
- `lib/queries/bips.ts` — getBips() + countBips(), single PostgREST relational embed
- `app/(public)/bips/page.tsx` — async RSC shell, generateMetadata canonical=/bips, revalidate=3600
- `app/(public)/bips/loading.tsx` — 12 skeleton cards during RSC loading
- `app/(public)/bips/error.tsx` — "Something went wrong loading BIPs." with reload button
- `components/bip/BipFiltersSidebar.tsx` — desktop sticky sidebar, 7 collapsible accordion groups
- `components/bip/BipFiltersDrawer.tsx` — mobile Vaul bottom drawer wrapping BipFiltersSidebar
- `components/bip/BipSearchBar.tsx` — 300ms debounced search input via use-debounce
- `components/bip/BipSortControl.tsx` — shadcn Select with 3 sort options, default deadline-soonest
- `components/bip/BipGrid.tsx` — RSC, responsive 1/2/3-col ul grid using BipCard
- `components/bip/BipPagination.tsx` — numbered pagination, ellipsis compression, URL-driven
- `components/bip/BipsEmptyState.tsx` — D-04 copy with ClearFiltersButton + Browse all BIPs link
- `components/bip/BipFilterChips.tsx` — active filter chip row + ClearFiltersButton export
- `components/ui/{accordion,calendar,drawer,select,skeleton,slider}.tsx` — shadcn primitives
- `components/ui/button.tsx` — added asChild via @radix-ui/react-slot; shadcn compat type aliases

## Decisions Made

- **FTS approach**: `.textSearch('search_vector', q, { type: 'websearch', config: 'english' })` — backed by the GIN index on `bips.search_vector` from Plan 01-02; no separate RPC needed since PostgREST textSearch handles websearch_to_tsquery natively with the existing tsvector column.
- **Slider API deviation**: shadcn Slider uses Base UI not Radix; `onValueChange` signature is `(v: number | readonly number[])` — cast to array inside handler for range slider usage.
- **Accordion API deviation**: Base UI Accordion uses `multiple` boolean prop, not `type="multiple"` (Radix API). Applied automatically.
- **Button asChild**: Added `@radix-ui/react-slot` to enable asChild pattern needed by DrawerClose/DrawerTrigger composition. Also added shadcn-compat variant aliases (outline, secondary, destructive, link, icon, default).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] shadcn Accordion uses Base UI API, not Radix API**
- **Found during:** Task 3 (BipFiltersSidebar) — TypeScript error `Property 'type' does not exist on type 'IntrinsicAttributes & Props<any>'`
- **Issue:** Plan specified `<Accordion type="multiple">` (Radix API), but the shadcn component installed uses `@base-ui/react/accordion` which uses `multiple` boolean prop
- **Fix:** Changed to `<Accordion multiple defaultValue={['country']}>`
- **Files modified:** components/bip/BipFiltersSidebar.tsx
- **Verification:** tsc --noEmit passes, build passes
- **Committed in:** 710c681

**2. [Rule 1 - Bug] shadcn Slider uses Base UI API with different onValueChange signature**
- **Found during:** Task 3 — TypeScript error on onValueChange parameter type
- **Issue:** Plan specified `onValueChange={(v: number[]) => ...}` but Base UI Slider's signature is `(v: number | readonly number[])`
- **Fix:** Added array cast inside handler: `const arr = Array.isArray(v) ? (v as number[]) : [v as number]`
- **Files modified:** components/bip/BipFiltersSidebar.tsx
- **Verification:** tsc --noEmit passes
- **Committed in:** 710c681

**3. [Rule 2 - Missing Critical] Added asChild support to Button component**
- **Found during:** Task 2/3 — BipFiltersDrawer uses DrawerClose asChild + DrawerTrigger asChild with Button child
- **Issue:** Custom Button from Plan 01-04 did not support `asChild` prop required for Radix/Vaul composition patterns
- **Fix:** Installed `@radix-ui/react-slot`; added `asChild` prop + Slot component to Button.tsx; added shadcn-compat variant/size aliases to satisfy calendar.tsx type imports
- **Files modified:** components/ui/button.tsx, package.json
- **Verification:** DrawerClose asChild + DrawerTrigger asChild work; tsc passes; build passes
- **Committed in:** 710c681

**4. [Rule 1 - Bug] shadcn calendar.tsx incompatibility: `table` key removed in react-day-picker v10**
- **Found during:** Task 2 shadcn primitive installation — `Property 'table' does not exist in type 'Partial<ClassNames>'`
- **Issue:** shadcn calendar generated with `table:` in classNames object, but react-day-picker v10 removed `table` from ClassNames type
- **Fix:** Removed the `table: "w-full border-collapse"` line from components/ui/calendar.tsx
- **Files modified:** components/ui/calendar.tsx
- **Verification:** tsc --noEmit passes
- **Committed in:** 710c681

---

**Total deviations:** 4 auto-fixed (2 Rule 1 API mismatch, 1 Rule 2 missing critical, 1 Rule 1 dep compat)
**Impact on plan:** All fixes necessary for correctness and compilation. No scope creep. Core architecture unchanged.

## Issues Encountered

- shadcn components installed in this project use `@base-ui/react` (already a project dep) rather than `@radix-ui/react-*`. This means the Accordion and Slider have different TypeScript APIs than the plan specified (which described the standard Radix-based shadcn API). Fixed inline as Rule 1 bugs. Future plans should note: shadcn accordion/slider = Base UI API.

## Known Stubs

None. All data flows from the live Supabase seed (Plan 01-03's 20 approved BIPs). The "programs across N countries" lede reflects the actual filtered result set. Pagination renders only when total > 24 (20-row seed stays on 1 page — component renders correctly with empty pagination when ≤ 24 rows).

## Next Phase Readiness

- Plan 01-07 (/bip/[slug] detail page) can import BipCard and useBookmarks unchanged; no interface changes needed
- Phase 3 admin all-listings view can call `getBips(filters, { statusOverride: 'pending' })` directly — the statusOverride opt is already wired in applyFilters()
- No blockers for Plan 01-07

---
*Phase: 01-discovery-foundation*
*Completed: 2026-05-09*

## Self-Check: PASSED

Files verified:
- [FOUND] lib/filters/parseSearchParams.ts
- [FOUND] lib/filters/buildSupabaseQuery.ts
- [FOUND] lib/queries/bips.ts
- [FOUND] app/(public)/bips/page.tsx
- [FOUND] app/(public)/bips/loading.tsx
- [FOUND] app/(public)/bips/error.tsx
- [FOUND] components/bip/BipFiltersSidebar.tsx
- [FOUND] components/bip/BipFiltersDrawer.tsx
- [FOUND] components/bip/BipSearchBar.tsx
- [FOUND] components/bip/BipSortControl.tsx
- [FOUND] components/bip/BipGrid.tsx
- [FOUND] components/bip/BipPagination.tsx
- [FOUND] components/bip/BipsEmptyState.tsx
- [FOUND] components/bip/BipFilterChips.tsx

Commits verified:
- [FOUND] 6f7d216 (Task 1: data layer)
- [FOUND] 710c681 (Tasks 2+3: RSC page + UI components)
