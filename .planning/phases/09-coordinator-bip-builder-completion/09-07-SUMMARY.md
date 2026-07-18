---
phase: 09-coordinator-bip-builder-completion
plan: 07
subsystem: api
tags: [typescript, supabase, server-actions, bip-edits, admin-diff]

# Dependency graph
requires:
  - phase: 09-coordinator-bip-builder-completion
    provides: BipDetail type extended with the four builder-completion fields (Plan 09-05); admin/coordinator write paths persisting them to bips + bip_edits (Plan 09-06); bip_edits columns + regenerated database.types.ts (Plan 09-01)
provides:
  - lib/constants/bip-edit-columns.ts exporting the single BIP_EDIT_CONTENT_COLUMNS constant consumed directly by both admin-edit-bips.ts and bipEdits.ts .select() calls (FOUN-14)
  - buildMergePayload (admin-edit-bips.ts) copies virtual_sessions_count, virtual_duration_notes, accommodation_notes, partner_institutions_only from bip_edits onto the live bips row on approve — closes the anti-Pitfall-1 merge-drop gap for SUBM-14
  - mapEditRowToBipDraftData (bipEdits.ts) carries the same four fields into the BipDraftData shape used by the diff view and coordinator edit pre-fill
  - BipEditDiffView renders live-vs-proposed for all four new fields (Virtual sessions, Virtual duration, Accommodation, Partner institutions only)
affects: [09-08, 09-09 (any downstream plan verifying the full builder-completion round-trip end to end)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single shared select-string constant (lib/constants/*.ts) imported directly at the .select() call site by every consumer — no local alias/re-export, so a field added to the constant can never be silently absent from one of the two consumers (FOUN-14 pattern, reusable for future shadow-table column lists)"

key-files:
  created:
    - lib/constants/bip-edit-columns.ts
  modified:
    - lib/actions/admin-edit-bips.ts
    - lib/queries/bipEdits.ts
    - components/admin/BipEditDiffView.tsx

key-decisions:
  - "Acceptance criteria required zero occurrences of the old local const names (EDIT_CONTENT_SELECT / BIP_EDIT_CONTENT_SELECT) after consolidation, not just an alias to the shared constant — both files now reference BIP_EDIT_CONTENT_COLUMNS directly at the .select() call site rather than keeping a same-named local re-export"
  - "Doc-comment column counts updated from '22' to '26' in admin-edit-bips.ts to stay accurate now that the four builder-completion fields are included in the merge payload"

requirements-completed: [SUBM-14, FOUN-14]

# Metrics
duration: ~10min
completed: 2026-07-18
---

# Phase 09 Plan 07: bip_edits Merge-on-Approve + Diff View + FOUN-14 Consolidation Summary

**Consolidated the duplicated bip_edits content-column literal into one shared constant (FOUN-14) and closed the anti-Pitfall-1 merge-drop gap by making buildMergePayload copy all four builder-completion fields from bip_edits onto the live bips row on approve, with the admin diff view now showing live-vs-proposed values for them.**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-07-18
- **Tasks:** 3 completed
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- `lib/constants/bip-edit-columns.ts` created, exporting the single `BIP_EDIT_CONTENT_COLUMNS` constant (now including the four builder-completion columns) — both `admin-edit-bips.ts` and `bipEdits.ts` import and use it directly at their `.select()` call sites; the old duplicated `EDIT_CONTENT_SELECT` / `BIP_EDIT_CONTENT_SELECT` local literals are fully removed (zero occurrences verified)
- `buildMergePayload` (`admin-edit-bips.ts`) and its `RawEditRow` type now carry `virtual_sessions_count`, `virtual_duration_notes`, `accommodation_notes`, `partner_institutions_only` — an admin approving a coordinator edit now merges all four fields onto the live `bips` row instead of silently dropping them (the exact anti-Pitfall-1 hot spot the plan targeted)
- `mapEditRowToBipDraftData` (`bipEdits.ts`) and its `RawBipEditContentRow` type carry the same four fields into the `BipDraftData` shape, following the established null-coalescing conventions (`?? undefined` for optional string/number, `?? false` for the boolean flag)
- `BipEditDiffView.tsx`'s `FIELDS` array gained four new `FieldDef` entries — "Virtual sessions", "Virtual duration", "Accommodation" read/compare off `BipDetail`/`BipDraftData` directly; "Partner institutions only" reuses the existing `fmtBool` helper
- `npx tsc --noEmit` and `npx eslint` both exit clean after every task's edit

## Task Commits

Each task was committed atomically:

1. **Task 1: Create the shared bip_edits column constant and consolidate both literals** - `456c3b0` (feat)
2. **Task 2: Merge-on-approve + raw types + edit-row mapping carry the four fields** - `a387ecd` (feat)
3. **Task 3: Diff view shows the four new fields** - `0160312` (feat)

**Plan metadata:** (this commit, docs)

## Files Created/Modified
- `lib/constants/bip-edit-columns.ts` (created) - Exports `BIP_EDIT_CONTENT_COLUMNS`, the single source of truth for the bip_edits content select string (28 columns incl. the four builder-completion fields)
- `lib/actions/admin-edit-bips.ts` - Imports `BIP_EDIT_CONTENT_COLUMNS` directly (old `EDIT_CONTENT_SELECT` local literal removed); `RawEditRow` and `buildMergePayload` gain the four fields; doc-comment column counts corrected 22→26
- `lib/queries/bipEdits.ts` - Imports `BIP_EDIT_CONTENT_COLUMNS` directly (old `BIP_EDIT_CONTENT_SELECT` local literal removed); `RawBipEditContentRow` and `mapEditRowToBipDraftData` gain the four fields
- `components/admin/BipEditDiffView.tsx` - `FIELDS` array gains four entries: Virtual sessions, Virtual duration, Accommodation, Partner institutions only; no dynamic Tailwind class names introduced

## Decisions Made
- Went further than the interfaces block's illustrative "rename usages" note by removing the local const declarations entirely (not just re-pointing them at the import) — this was required to satisfy the plan's own acceptance criteria (`grep -c "const EDIT_CONTENT_SELECT" ... returns 0`), and is the stricter/more correct form of FOUN-14 consolidation (one name, one place, no aliasing)
- Kept the exact null-coalescing conventions already established in Plan 09-06/09-05 for each field type across both files, rather than introducing a new pattern

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed local const aliases instead of leaving a same-named re-export**
- **Found during:** Task 1 verification
- **Issue:** My first pass replaced the body of `EDIT_CONTENT_SELECT`/`BIP_EDIT_CONTENT_SELECT` with `= BIP_EDIT_CONTENT_COLUMNS` but kept the local const declaration, which still matched the acceptance criteria's `grep -c "const EDIT_CONTENT_SELECT" == 0` check (it failed, returning 1)
- **Fix:** Removed the local const declarations entirely and replaced every `.select(EDIT_CONTENT_SELECT)` / `.select(BIP_EDIT_CONTENT_SELECT)` call site with `.select(BIP_EDIT_CONTENT_COLUMNS)` directly
- **Files modified:** lib/actions/admin-edit-bips.ts, lib/queries/bipEdits.ts
- **Verification:** `grep -c "const EDIT_CONTENT_SELECT" lib/actions/admin-edit-bips.ts` and `grep -c "const BIP_EDIT_CONTENT_SELECT" lib/queries/bipEdits.ts` both return 0; `npx tsc --noEmit` exits 0
- **Committed in:** 456c3b0 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — self-corrected during verification, before commit)
**Impact on plan:** No scope creep; this made the consolidation strictly conform to the plan's own acceptance criteria.

## Issues Encountered

None beyond the self-caught Task 1 verification issue documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The full anti-Pitfall-1 propagation map for the four builder-completion fields is now closed on both ends: write (Plan 09-06: admin direct-edit → bips, coordinator edit → bip_edits) and merge-on-approve (this plan: bip_edits → bips), with read/display already in place (Plan 09-05: BipDetail + wizard pre-fill; this plan: admin diff view)
- FOUN-14 is fully satisfied — the bip_edits content-column list exists in exactly one place (`lib/constants/bip-edit-columns.ts`), imported directly by both consumers with no aliasing
- No blockers identified for Plan 09-08 or later waves in this phase

---
*Phase: 09-coordinator-bip-builder-completion*
*Completed: 2026-07-18*

## Self-Check: PASSED

- FOUND: lib/constants/bip-edit-columns.ts
- FOUND: lib/actions/admin-edit-bips.ts
- FOUND: lib/queries/bipEdits.ts
- FOUND: components/admin/BipEditDiffView.tsx
- FOUND commit: 456c3b0
- FOUND commit: a387ecd
- FOUND commit: 0160312
