---
phase: 09-coordinator-bip-builder-completion
plan: 06
subsystem: api
tags: [server-actions, zod, supabase, bip-edits, bips]

# Dependency graph
requires:
  - phase: 09-coordinator-bip-builder-completion
    provides: fullBipSchema with the four builder-completion field validators (Plan 09-02) and bip_edits columns + regenerated types (Plan 09-01)
provides:
  - adminUpdateBipAction updatePayload persists virtual_sessions_count, virtual_duration_notes, accommodation_notes, partner_institutions_only to the live bips row on admin direct-edit
  - buildContentPayload (lib/actions/bip-edits.ts) carries the same four fields into every coordinator edit write path — submitEditAction (new bip_edits row), resubmitEditAction (bip_edits update), resubmitPendingBipAction (bips update for changes_requested → pending resubmit)
affects: [09-07, 09-08, 09-09 (any downstream plan verifying the full builder-completion write/read round-trip)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single buildContentPayload helper feeds three distinct edit-action write paths (bip_edits insert, bip_edits update, bips update) — one change here propagates to all three, matching the pattern already established for fullBipSchema itself"

key-files:
  created: []
  modified:
    - lib/actions/admin-bips.ts
    - lib/actions/bip-edits.ts

key-decisions:
  - "All four values sourced strictly from parsed.data (post fullBipSchema.safeParse) in both files — no raw request-body pass-through, satisfying the plan's T-09-06-02 tampering mitigation"
  - "Followed the exact null-coalescing pattern already used for existing optional fields in both files: numeric field uses ?? null, free-text fields use || null, boolean flag uses ?? false — kept consistent with sibling fields in the same payload objects rather than introducing a new convention"

patterns-established: []

requirements-completed: [SUBM-09, SUBM-10, SUBM-11, SUBM-14]

# Metrics
duration: 4min
completed: 2026-07-18
---

# Phase 09 Plan 06: Admin + Coordinator Edit Write Paths Summary

**adminUpdateBipAction and buildContentPayload (feeding all three coordinator edit actions) now persist the four builder-completion fields (virtual_sessions_count, virtual_duration_notes, accommodation_notes, partner_institutions_only) into bips and bip_edits respectively.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-18 (session start)
- **Completed:** 2026-07-18
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments
- `adminUpdateBipAction`'s `updatePayload` (lib/actions/admin-bips.ts) now includes all four builder-completion fields, so an admin direct-edit of a BIP writes them to the live `bips` row alongside the existing 20+ content columns
- `buildContentPayload`'s parameter type and returned object (lib/actions/bip-edits.ts) extended with the same four fields — because `submitEditAction`, `resubmitEditAction`, and `resubmitPendingBipAction` all spread `...buildContentPayload(parsed.data)` into their respective `bip_edits`/`bips` writes, this single change propagates the fields through all three coordinator edit paths (new edit, resubmit changes_requested edit, resubmit changes_requested new-submission)
- `npx tsc --noEmit` exits 0 in both cases, confirming the bip_edits Insert/Update types (regenerated in Plan 09-01) accept the new columns and `fullBipSchema`'s optional fields (Plan 09-02) satisfy both function signatures

## Task Commits

Each task was committed atomically:

1. **Task 1: admin edit path writes the four fields to bips** - `710ee55` (feat)
2. **Task 2: coordinator edit-content builder carries the four fields** - `97d7445` (feat)

**Plan metadata:** (this commit, docs)

## Files Created/Modified
- `lib/actions/admin-bips.ts` - `adminUpdateBipAction`'s `updatePayload` gains `virtual_sessions_count`, `virtual_duration_notes`, `accommodation_notes`, `partner_institutions_only`; `status`/`slug` omissions and partner delete-then-insert reconciliation untouched
- `lib/actions/bip-edits.ts` - `buildContentPayload`'s param type and return object both extended with the four fields; slug exclusion (D-10/EDIT-09) and all other content mappings untouched

## Decisions Made
- Sourced every new field strictly from `parsed.data` in both files (never raw request body) — direct implementation of the plan's threat register mitigation (T-09-06-02)
- Matched the existing null-coalescing conventions per field type already present in each payload object (`?? null` for the optional number, `|| null` for optional free-text, `?? false` for the boolean flag) rather than picking a new pattern

## Deviations from Plan

None - plan executed exactly as written. Both tasks matched the `<interfaces>` mapping in the plan verbatim; no auto-fixes required.

## Issues Encountered

None. `npx tsc --noEmit` passed cleanly on the first attempt after each task's edit, confirming Plan 09-01's regenerated `bip_edits` types and Plan 09-02's `fullBipSchema` optional-field additions were already correctly in place.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Both write halves of the builder-completion propagation map (admin direct-edit → `bips`, coordinator shadow-edit → `bip_edits`) are now complete, joining the read halves landed in Plan 09-05 (BipDetail type/query + wizard pre-fill/preview)
- Downstream plans (09-07, 09-08, 09-09) verifying the full field round-trip (wizard submit → DB → admin review → approve → live page) can now rely on every write path in the propagation map carrying the four fields; no remaining write-path gaps identified for this feature set
- No blockers identified for the next wave

---
*Phase: 09-coordinator-bip-builder-completion*
*Completed: 2026-07-18*
