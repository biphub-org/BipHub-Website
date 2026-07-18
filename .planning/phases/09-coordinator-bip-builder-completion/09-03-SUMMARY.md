---
phase: 09-coordinator-bip-builder-completion
plan: 03
subsystem: ui
tags: [nextjs, supabase, tailwind, bips-listing, card-ui]

# Dependency graph
requires:
  - phase: 09-coordinator-bip-builder-completion (Plan 01/02)
    provides: bips schema with partner_institutions_only column, wizard/query types
provides:
  - "/bips listing query fetches partner_institutions_only for every card"
  - "Conditional amber 'Partner institutions only' badge on BipCard for BROW-14"
affects: [10-bip-detail-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reuse existing status-pending amber design token for non-alarming informational badges (not a new colour)"

key-files:
  created: []
  modified:
    - lib/queries/bips.ts
    - components/bip/BipCard.tsx

key-decisions:
  - "Badge placed at top of card body (above field-tag chips), not in the gradient header, to keep it with BIP metadata rather than over decorative art"
  - "w-fit added to the badge span (static Tailwind class, no template literal) so the pill doesn't stretch full width in the flex-col body"

patterns-established:
  - "Informational/status badges on BipCard reuse the status-pending amber token (#b45309 / #fffbeb) rather than introducing new hues — consistent with the changes_requested badge precedent from Plan 08-03"

requirements-completed: [BROW-14]

# Metrics
duration: 3min
completed: 2026-07-18
---

# Phase 09 Plan 03: Partner-Institutions-Only Badge Summary

**Students browsing `/bips` now see a restrained amber "Partner institutions only" badge on cards for BIPs restricted to partner-institution applicants, sourced from a query column that was previously fetched nowhere.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-18T06:48:08Z
- **Completed:** 2026-07-18T06:50:13Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments
- `lib/queries/bips.ts` `baseSelect` now includes `partner_institutions_only`, so every `/bips` card row carries the flag (the `BipWithRelations` type already declared it — only the query was missing the column).
- `BipCard.tsx` renders a conditional amber badge reusing the existing `status-pending` / `status-pending-bg` design tokens, shown only when `bip.partner_institutions_only` is true; all other cards render unchanged.

## Task Commits

1. **Task 1: Add partner_institutions_only to the /bips listing query** - `bc29100` (feat)
2. **Task 2: Render the partner-only badge on BipCard** - `909b4fc` (feat)

**Plan metadata:** (this commit)

## Files Created/Modified
- `lib/queries/bips.ts` - Added `partner_institutions_only,` to the `baseSelect` column list so PostgREST returns it for every listing row.
- `components/bip/BipCard.tsx` - Added a conditional badge span (static Tailwind classes only) at the top of the card body, rendered when `bip.partner_institutions_only` is truthy, using the exact label "Partner institutions only".

## Decisions Made
- Followed the plan's provided markup verbatim, with one addition: `w-fit` on the badge span so it doesn't stretch to the full flex-col width of the card body — a static class, no dynamic construction, consistent with CLAUDE.md's never-do on dynamic Tailwind class names.
- Placed the badge above the field-tag chips block per the plan's `read_first` guidance, keeping it with BIP metadata rather than over the gradient header.

## Deviations from Plan

None - plan executed exactly as written (one minor additive static class, `w-fit`, for correct layout — not a deviation from the specified markup's intent).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- BROW-14 is complete; `/bips` cards now surface partner-only status ahead of the click-through, closing the info-disclosure gap noted in the plan's threat model (accepted disposition — the flag is public non-sensitive metadata).
- No blockers for Plan 09-04 or downstream Phase 10 (BIP detail page) work; `partner_institutions_only` is now flowing through the standard `BipWithRelations` shape used elsewhere.

## Self-Check: PASSED

- FOUND: lib/queries/bips.ts
- FOUND: components/bip/BipCard.tsx
- FOUND: .planning/phases/09-coordinator-bip-builder-completion/09-03-SUMMARY.md
- FOUND: bc29100 (Task 1 commit)
- FOUND: 909b4fc (Task 2 commit)

---
*Phase: 09-coordinator-bip-builder-completion*
*Completed: 2026-07-18*
