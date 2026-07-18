---
phase: 09-coordinator-bip-builder-completion
plan: 05
subsystem: api
tags: [typescript, supabase, query-layer, wizard-adapter]

# Dependency graph
requires:
  - phase: 09-coordinator-bip-builder-completion
    provides: bip_edits builder-completion columns + regenerated database.types.ts (Plan 09-01); corrected wizard schema and BipDraftData carrying the four new fields (Plan 09-02)
provides:
  - BipDetail type extended with virtual_sessions_count, virtual_duration_notes, accommodation_notes, partner_institutions_only (all nullable, required keys)
  - Both getBipBySlug and getBipById .select() strings carry the four new columns
  - Coordinator edit-mode select + draft construction (coordinatorBipById.ts) pre-fill the four new fields from the live bips row
  - Wizard preview adapter (wizardAdapter.ts) draftToBipDetail maps the four new fields onto the preview BipDetail literal
affects: [09-07 (admin diff view reads live values off the extended BipDetail type)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BipDetail fields added as required (nullable) keys, not optional — tsc enforces every producer (both detail selects + wizardAdapter's literal) supplies them, preventing a silently-partial shape (anti-Pitfall-1)"

key-files:
  created: []
  modified:
    - lib/queries/bipDetail.ts
    - lib/queries/coordinatorBipById.ts
    - components/forms/wizardAdapter.ts

key-decisions:
  - "max_participants intentionally excluded from BipDetail — it is DETL-15 / Phase 10 territory, not part of this plan's scope"
  - "Public rendering components (BipBody.tsx, BipSidebar.tsx, BipHeader.tsx) untouched — this plan is type + query plumbing only; rendering the new fields is Phase 10"
  - "Fields added as required (nullable) BipDetail keys rather than optional, so TypeScript's structural typing forces every literal/query producer to explicitly supply them (or explicitly null them) — this is what caught wizardAdapter.ts as an unlisted propagation surface during Task 1's verification"

requirements-completed: [SUBM-09, SUBM-10, SUBM-11, SUBM-14]

# Metrics
duration: 6min
completed: 2026-07-18
---

# Phase 09 Plan 05: BipDetail Type + Query Propagation Summary

**Extended the BipDetail type and both detail-query select strings with the four builder-completion fields, then propagated them through the two RESEARCH-identified unlisted surfaces (coordinator edit pre-fill, wizard preview adapter) so they survive read-back and compile against the finalized type.**

## Performance

- **Duration:** ~6 min
- **Tasks:** 3 completed
- **Files modified:** 3

## Accomplishments
- `BipDetail` type (`lib/queries/bipDetail.ts`) now carries `virtual_sessions_count: number | null`, `virtual_duration_notes: string | null`, `accommodation_notes: string | null`, `partner_institutions_only: boolean | null` as required (nullable) keys
- Both `getBipBySlug` and `getBipById` `.select()` template strings append the four new columns alongside existing scalar fields
- `max_participants` confirmed absent from `BipDetail` (0 occurrences) — intentionally excluded per DETL-15/Phase 10 scope
- `lib/queries/coordinatorBipById.ts`'s `.select()` string and constructed `BipDraftData` draft object now carry the four fields, so re-opening a draft/approved/changes_requested BIP in the edit wizard pre-fills from the live `bips` row instead of silently blanking
- `components/forms/wizardAdapter.ts`'s `draftToBipDetail` now maps all four fields onto the `BipDetail` literal it returns, so the Step-5 preview compiles against the extended (now-required-key) type and reflects entered values
- `npx tsc --noEmit` exits 0 across the whole repo after all three tasks — the required-key design meant Task 1's edit alone surfaced a compile error in `wizardAdapter.ts` (the exact unlisted-propagation-surface the plan called out), which Task 3 then resolved

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend BipDetail type + both detail select strings** - `43f9fb8` (feat)
2. **Task 2: Coordinator edit pre-fill carries the four fields** - `68c9890` (feat)
3. **Task 3: Wizard preview adapter maps the four fields** - `15bd77e` (feat)

**Plan metadata:** (this commit, docs)

## Files Created/Modified
- `lib/queries/bipDetail.ts` - `BipDetail` type gains the four nullable fields; both `getBipBySlug` and `getBipById` select strings append the four columns
- `lib/queries/coordinatorBipById.ts` - `.select()` string appends the four columns; constructed `draft: BipDraftData` object sets them (`?? undefined` for optional strings/numbers, `?? false` for `partner_institutions_only` matching the existing `green_travel`/`inclusion_support` pattern)
- `components/forms/wizardAdapter.ts` - `draftToBipDetail`'s returned `BipDetail` literal gains the four fields (`?? null` for optional strings/numbers, `?? false` for `partner_institutions_only`)

## Decisions Made
- Followed the plan's `<interfaces>` block exactly for field mapping and null/undefined/false defaults on each surface
- Left `max_participants` out of `BipDetail` entirely (verified via `grep -c "max_participants" lib/queries/bipDetail.ts` == 0) since it's out of scope for this plan (DETL-15 / Phase 10)
- Did not touch `BipBody.tsx`, `BipSidebar.tsx`, or `BipHeader.tsx` — public detail-page rendering is explicitly Phase 10 scope per the plan's `<critical>` block

## Deviations from Plan

None - plan executed exactly as written. All three tasks completed on the interfaces specified; no auto-fixes were needed beyond the plan's own anticipated flow (the plan explicitly designed the required-key BipDetail type so that Task 1's edit alone would surface the wizardAdapter.ts gap, which Task 3 then closed as scoped).

## Issues Encountered

The plan's aggregate verification command (`grep -Eo "..." lib/queries/bipDetail.ts lib/queries/coordinatorBipById.ts components/forms/wizardAdapter.ts | sort -u | wc -l` expected to equal `4`) actually returns `12` in this shell, because grep prefixes matches with the source filename when given multiple file arguments (`file.ts:fieldname`), so `sort -u` dedups across 4 fields × 3 files = 12 unique `filename:match` pairs rather than 4 unique field names. This is a grep-invocation quirk, not a functional gap — verified directly that all 4 field names appear in all 3 files (each per-task acceptance criterion, run individually per file, passed). Same class of expected grep false-positive documented in the 09-02 SUMMARY.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `BipDetail` now carries all four builder-completion fields as required keys, and every current producer of a `BipDetail` value (both detail queries, the wizard preview adapter) supplies them — Plan 09-07's admin diff view can read live values for these fields off `BipDetail` without further plumbing
- Coordinator edit-mode pre-fill is complete: re-opening any draft/approved/changes_requested BIP hydrates the wizard with the live values of all four new fields
- No blockers identified for Plan 09-06 or later waves in this phase

---
*Phase: 09-coordinator-bip-builder-completion*
*Completed: 2026-07-18*

## Self-Check: PASSED

- FOUND: lib/queries/bipDetail.ts
- FOUND: lib/queries/coordinatorBipById.ts
- FOUND: components/forms/wizardAdapter.ts
- FOUND: .planning/phases/09-coordinator-bip-builder-completion/09-05-SUMMARY.md
- FOUND commit: 43f9fb8
- FOUND commit: 68c9890
- FOUND commit: 15bd77e
