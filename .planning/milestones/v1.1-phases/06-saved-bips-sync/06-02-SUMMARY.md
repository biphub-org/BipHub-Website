---
phase: 06-saved-bips-sync
plan: "02"
subsystem: save-toggle-ui
tags: [server-actions, rls, useOptimistic, isr, bip-card, refactor, client-island]
dependency_graph:
  requires: [06-01-database-foundation]
  provides: [saveAction, unsaveAction, migrateLegacyBookmarksAction, SaveToggleIsland, BipSaveButton, BipCard-refactored, getSavedBipIds, isBipSaved]
  affects: [06-03-saved-bips-page, 06-04-legacy-sweep, /bips-page, /bip-slug-page]
tech_stack:
  added: []
  patterns:
    - "useOptimistic + useTransition (React 19) for heart toggle with revert-on-error"
    - "ReactNode saveButton slot prop pattern — RSC page constructs island, passes to client component without plumbing imports"
    - "div outer + Link block child + SaveToggleIsland sibling — avoids button-inside-anchor invalid HTML (Pitfall 1)"
    - "Static Tailwind class lookup objects (ICON_CLASSES, BUTTON_LABELS) — never template literals"
key_files:
  created:
    - lib/actions/saved-bips.ts
    - lib/queries/savedBips.ts
    - components/bip/SaveToggleIsland.tsx
    - components/bip/BipSaveButton.tsx
  modified:
    - components/bip/BipCard.tsx
    - components/bip/BipGrid.tsx
    - components/bip/BipSidebar.tsx
    - components/bip/BipMobileApplyBar.tsx
    - components/home/RecentBips.tsx
    - app/(public)/bips/page.tsx
    - app/(public)/bip/[slug]/page.tsx
    - lib/supabase/database.types.ts
decisions:
  - "D-bip-02-01: SaveToggleIsland positioned absolute right-3 top-[102px] against card div (not header div) — keeps <button> outside <a>, 44px target in lower-right of 140px gradient header"
  - "D-bip-02-02: saveButton slot pattern — RSC page (page.tsx) constructs BipSaveButton and passes as ReactNode to BipSidebar/BipMobileApplyBar; client components never import action plumbing"
  - "D-bip-02-03 (CORRECTED 2026-06-15): /bips reads searchParams (filters) so it is inherently dynamic for ALL visitors — never ISR-cached (curl: Cache-Control: private, X-Vercel-Cache: MISS). The 'unauthenticated stays ISR-cached' claim was FALSE; /bips was dynamic since Phase 1, not a Phase 6 regression. Computing getClaims() server-side on /bips is fine (dynamic anyway). The real regression was /bip/[slug] (●→ƒ), fixed in commit 5722e2b via client-side saved-state hydration."
  - "D-bip-02-04: RecentBips homepage cards pass initialSaved=false isStudent=false — homepage is public-only, no save affordance needed there"
metrics:
  duration: "~10 minutes"
  completed: "2026-06-15"
  tasks_completed: 3
  tasks_total: 3
  files_created: 4
  files_modified: 8
---

# Phase 06 Plan 02: Save Toggle UI — Server Actions, Islands, BipCard Refactor

RLS-scoped Server Actions (save/unsave/migrate), PostgREST query layer (getSavedBipIds/isBipSaved/getSavedBips/count), React 19 useOptimistic heart island in icon and button modes, BipCard HTML refactor (div outer, Link block child, island sibling), and wiring of /bips and /bip/[slug] with per-user saved state.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Server Actions + query layer | 988e209 | lib/actions/saved-bips.ts, lib/queries/savedBips.ts |
| 2 | SaveToggleIsland + BipSaveButton | 3502552 | components/bip/SaveToggleIsland.tsx, components/bip/BipSaveButton.tsx |
| 3 | BipCard refactor + BipGrid props + /bips + /bip/[slug] wiring | 24830b3 | BipCard.tsx, BipGrid.tsx, BipSidebar.tsx, BipMobileApplyBar.tsx, both pages |

## Decisions Made

1. **SaveToggleIsland absolute positioning** — positioned `absolute right-3 top-[102px]` against the card outer `<div>` (which is `relative`). The 44px button center falls at top-[124px] within the 140px gradient header — clearly in the gradient zone. Avoids overlap with deadline pill at `top-3 right-3`.

2. **saveButton slot pattern** — the RSC page (`bip/[slug]/page.tsx`) constructs `<BipSaveButton .../>` and passes it as a `ReactNode` prop to `BipSidebar` and `BipMobileApplyBar`. This keeps the client components free of action imports while remaining declarative. `BipSidebar` renders the slot below the Apply CTA in public mode; suppressed in admin-review mode.

3. **`/bips` is dynamic by nature (CORRECTED 2026-06-15)** — `/bips` reads `searchParams`, so Next.js 15 renders it `ƒ` Dynamic for ALL visitors regardless of cookies; it was dynamic since Phase 1. The earlier claim that "unauthenticated requests remain ISR-cached" was **false** (curl: `Cache-Control: private`, `X-Vercel-Cache: MISS`); `export const revalidate = 3600` is inert on a dynamic route. Because `/bips` is dynamic regardless, computing saved state server-side is free and SSR-correct.

4. **RecentBips homepage** — passes `initialSaved=false` and `isStudent=false` to BipCard. The homepage is public; the save affordance on homepage cards is rendered but routes non-students to /register/student on click (correct behaviour).

## Verification Results

- `npx tsc --noEmit` PASS after all three tasks
- All grep gates passed (ACTIONS_OK, ISLAND_OK, WIRING_OK)
- `export const revalidate = 3600` verified present in both /bips and /bip/[slug] pages
- SaveToggleIsland appears after `</Link>` in BipCard (sibling, never child)
- No `getSession`, no `createAdminClient`, no `revalidatePath('/bips')` in action file

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed database.types.ts corruption (pre-existing, blocked tsc)**
- **Found during:** Task 1 (first tsc run)
- **Issue:** `lib/supabase/database.types.ts` had "Initialising login role..." on line 1 and Supabase CLI update notice ("A new version...") appended after the closing `} as const` — both artifacts from the Plan 06-01 `supabase gen types` stdout being captured with CLI noise mixed in. This caused TS1434 parse errors on every file in the project.
- **Fix:** Removed the spurious first line and the 3 trailing lines (CLI update message).
- **Files modified:** lib/supabase/database.types.ts
- **Commit:** 988e209 (included in Task 1 commit)

**2. [Rule 1 - Bug] Fixed RecentBips.tsx missing required BipCard props**
- **Found during:** Task 3 (tsc after BipCard prop signature change)
- **Issue:** `components/home/RecentBips.tsx` rendered `<BipCard bip={bip} />` without the now-required `initialSaved` and `isStudent` props — TS2739 type error.
- **Fix:** Added `initialSaved={false} isStudent={false}` (homepage is public-only; save affordance clicks route non-students to /register/student).
- **Files modified:** components/home/RecentBips.tsx
- **Commit:** 24830b3 (included in Task 3 commit)

## Known Stubs

None. All artifacts are complete and wired:
- `saveAction`/`unsaveAction`/`migrateLegacyBookmarksAction` are complete Server Actions with full RLS + validation
- `getSavedBipIds`/`isBipSaved`/`getSavedBips`/`getSavedBipsCount` are complete query functions
- `SaveToggleIsland` is a complete optimistic toggle in both icon and button modes
- `/bips` and `/bip/[slug]` pages pass real per-user saved state to the islands

## Threat Surface Scan

No new network endpoints or trust boundaries beyond what the plan's `<threat_model>` documents.
- T-06-07 (spoofing): user_id always from getClaims().sub — verified, no client-trusted userId
- T-06-08 (tampering): SaveBipSchema.safeParse() on every action — verified in saveAction + unsaveAction + migrate
- T-06-09 (getSession): grep gate confirmed no getSession in action file
- T-06-10 (admin client): grep gate confirmed no createAdminClient in action file
- T-06-11 (unknown IDs): migrateLegacyBookmarksAction validates against bips table before upsert
- T-06-12 (ISR bust): revalidate=3600 preserved, no revalidatePath('/bips') in actions

## Self-Check

Files exist:
- lib/actions/saved-bips.ts: FOUND
- lib/queries/savedBips.ts: FOUND
- components/bip/SaveToggleIsland.tsx: FOUND
- components/bip/BipSaveButton.tsx: FOUND

Commits exist:
- 988e209 (Task 1 — server actions + query layer): FOUND
- 3502552 (Task 2 — SaveToggleIsland + BipSaveButton): FOUND
- 24830b3 (Task 3 — BipCard refactor + wiring): FOUND

## Self-Check: PASSED
