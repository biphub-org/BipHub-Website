---
phase: 09-coordinator-bip-builder-completion
plan: 02
subsystem: api
tags: [zod, tdd, vitest, server-actions, wizard-schema]

# Dependency graph
requires:
  - phase: 09-coordinator-bip-builder-completion
    provides: bip_edits builder-completion columns (Plan 09-01) — not a hard runtime dependency for this plan, but confirms the four new fields already exist end-to-end (bips + bip_edits + database.types.ts)
provides:
  - Corrected VIRTUAL_TIMINGS 5-value enum matching the bips.virtual_timing DB CHECK exactly (before/during/after/before_and_after/mixed) on step2Schema and fullBipSchema
  - max_participants floor raised from 5 to 10 on step2Schema and fullBipSchema (Erasmus+ minimum)
  - Four new optional field validators (virtual_sessions_count, virtual_duration_notes, accommodation_notes, partner_institutions_only) on step2Schema/step3Schema/step4Schema/fullBipSchema
  - BipDraftData (Zustand store) extended with the corrected virtual_timing union and the four new fields
  - Create path (lib/actions/bip-submit.ts) consolidated onto the single shared fullBipSchema — inline submitSchema twin removed
affects: [09-03, 09-04, 09-05, 09-06, 09-07, 09-08, 09-09 (any downstream plan touching the wizard, draft store, or create/submit path)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Single shared fullBipSchema for both create (bip-submit.ts) and edit (admin-bips.ts) paths — no hand-copied schema twins permitted (Pitfall 0 anti-drift pattern, aligned with FOUN-14)"

key-files:
  created:
    - tests/schemas/bip-wizard.test.ts
  modified:
    - lib/schemas/bip-wizard.ts
    - lib/store/bip-draft.ts
    - lib/actions/bip-submit.ts

key-decisions:
  - "Consolidated lib/actions/bip-submit.ts onto the exported fullBipSchema instead of maintaining its own inline submitSchema — removes an entire class of drift where fixing a bug in one schema left the other silently broken"
  - "New builder-completion fields kept strictly optional across every schema path (step2/step3/step4/fullBipSchema) so existing seeded/pending BIPs without these fields still validate"
  - "DB max_participants CHECK deliberately left untouched (RESEARCH OQ1) — the Zod floor of 10 here is the binding proof for SUBM-13, with the E2E round-trip check deferred to Plan 09-09"

patterns-established:
  - "Any schema value must be checked against the actual DB CHECK constraint before being encoded as a Zod enum — the wizard previously offered a value ('concurrent') that the DB itself rejected"

requirements-completed: [SUBM-09, SUBM-10, SUBM-11, SUBM-12, SUBM-13, SUBM-14]

# Metrics
duration: 3min
completed: 2026-07-18
---

# Phase 09 Plan 02: Wizard Schema Fixes + Builder-Completion Fields Summary

**Fixed the virtual_timing enum mismatch and participant floor bugs via TDD, added four new optional field validators across all wizard schema layers, and consolidated the create path onto the single shared fullBipSchema, eliminating the Pitfall 0 hand-copied schema twin.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-18T09:41:19+03:00 (RED commit)
- **Completed:** 2026-07-18T09:44:11+03:00 (Task 3 commit)
- **Tasks:** 3 completed
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- `VIRTUAL_TIMINGS` now matches `bips.virtual_timing`'s DB CHECK exactly (`before`/`during`/`after`/`before_and_after`/`mixed`); the legacy `'concurrent'` value — which previously silently failed the DB CHECK on save (SUBM-12) — is rejected on both `step2Schema` and `fullBipSchema`
- `max_participants` floor raised from 5 to 10 on both schemas, matching the Erasmus+ minimum (SUBM-13); upper bound of 20 left untouched
- Four new optional builder-completion field validators added: `virtual_sessions_count` + `virtual_duration_notes` (step2Schema + fullBipSchema), `partner_institutions_only` (step3Schema + fullBipSchema), `accommodation_notes` (step4Schema + fullBipSchema)
- `BipDraftData` (Zustand store) extended with the corrected 5-value `virtual_timing` union and the four new optional fields, placed in the Step 2/3/4 blocks to mirror the schema layout
- `lib/actions/bip-submit.ts`'s inline `submitSchema` (a hand-copied twin of `fullBipSchema`, including the same two bugs) deleted entirely; the create path now imports and validates against `fullBipSchema` directly (Pitfall 0 resolved) and persists all four new fields to `bips` on submit
- 18/18 new unit tests pass (`tests/schemas/bip-wizard.test.ts`); full repo test suite (76 tests) green; `npx tsc --noEmit` exits 0

## Task Commits

Each task was committed atomically, following the TDD RED → GREEN gate sequence:

1. **Task 1 (RED): Write the wizard-schema unit tests** - `c7ee6c0` (test) — 12/18 assertions failed as expected against the unfixed schema
2. **Task 2 (GREEN): Fix the schema + extend the draft store** - `f96866f` (feat) — all 18 assertions pass
3. **Task 3: Consolidate the create path onto fullBipSchema (Pitfall 0) + write new fields** - `aab0dd0` (feat)

**Plan metadata:** (this commit, docs)

## Files Created/Modified
- `tests/schemas/bip-wizard.test.ts` - New unit test file covering the virtual_timing enum (5 valid values + rejected 'concurrent'), the max_participants floor (rejects 9, accepts 10), and the new field validators, on both `step2Schema` and `fullBipSchema`
- `lib/schemas/bip-wizard.ts` - `VIRTUAL_TIMINGS` corrected to 5 values; `max_participants` floor raised to 10 on step2Schema/fullBipSchema; four new optional field validators added across step2/step3/step4Schema and fullBipSchema
- `lib/store/bip-draft.ts` - `BipDraftData.virtual_timing` union corrected to the 5-value set; four new optional fields added (`virtual_sessions_count`, `virtual_duration_notes`, `partner_institutions_only`, `accommodation_notes`)
- `lib/actions/bip-submit.ts` - Inline `submitSchema` deleted; imports and validates via `fullBipSchema`; `updatePayload` now writes the four new fields; stale docstring reference to `submitSchema` corrected to `fullBipSchema`

## Decisions Made
- Consolidated the create path onto the exported `fullBipSchema` rather than keeping a synchronized inline twin — this is the anti-drift choice from the plan's `<critical>` block (RESEARCH §Pitfall 0, FOUN-14 alignment)
- Kept all four new fields strictly optional on every schema path so existing/seeded BIPs without them continue to validate
- Left the DB `max_participants` CHECK untouched per RESEARCH OQ1 — the Zod floor is the binding correctness proof here; the full E2E round-trip proof is deferred to Plan 09-09 per the plan's scope

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test fixture used an invalid ISCED field id**
- **Found during:** Task 2 (GREEN verification) — after implementing the schema fix, `fullBipSchema` tests still failed unexpectedly (7 of 18) even though `step2Schema` tests passed
- **Issue:** `validFullBase.subject_areas` in the new test file used `'engineering'`, which is not a valid `ISCED_FIELDS.id` (the real id is `'it-engineering'` per `lib/isced.ts`). This caused `fullBipSchema.safeParse` to fail for reasons unrelated to virtual_timing/max_participants, masking whether the actual schema fix worked.
- **Fix:** Corrected the fixture to `'it-engineering'` in `tests/schemas/bip-wizard.test.ts`
- **Files modified:** `tests/schemas/bip-wizard.test.ts`
- **Verification:** Re-ran `npx vitest run tests/schemas/bip-wizard.test.ts` — all 18 assertions pass
- **Committed in:** `f96866f` (Task 2 GREEN commit — the test file diff for this fix is folded into the GREEN commit since the RED commit's failing state was still correctly RED for the right reasons, just noisier than expected)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** No scope creep. The fix corrected the test fixture itself, not the schema under test; the RED commit's failure was still valid (schema genuinely lacked the enum/floor/fields), it just had one extra unrelated failure mode that GREEN verification caught and Rule 1 resolved inline.

## Issues Encountered

The acceptance criterion `grep -c "min(5" lib/schemas/bip-wizard.ts` returning 0 is not literally satisfied — two unrelated pre-existing fields (`title.min(5, ...)` and `description.min(50, ...)`) still contain the substring `min(5`. Neither is the `max_participants` floor (which is confirmed fixed to `.min(10, ...)` via direct inspection and the passing unit tests). Documenting this as an expected grep false-positive rather than a real gap — the underlying intent (participant floor raised from 5 to 10) is verified correct.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- The wizard schema, draft store, and create path now share one contract for all Phase 9 fields — downstream plans building the wizard UI (Step 2/3/4 forms), the edit-path write code, and any BipDetail adapters can rely on `fullBipSchema` as the single source of truth without re-checking for a second hand-copied schema
- `bip_edits` (Plan 09-01) and `bips` (pre-existing) both already carry the four new columns in `database.types.ts`, so downstream write-path plans (bip_edits shadow-table read/write) are unblocked
- No blockers identified for Plan 09-03 or later waves in this phase

---
*Phase: 09-coordinator-bip-builder-completion*
*Completed: 2026-07-18*

## Self-Check: PASSED

- FOUND: tests/schemas/bip-wizard.test.ts
- FOUND: lib/schemas/bip-wizard.ts
- FOUND: lib/store/bip-draft.ts
- FOUND: lib/actions/bip-submit.ts
- FOUND: .planning/phases/09-coordinator-bip-builder-completion/09-02-SUMMARY.md
- FOUND commit: c7ee6c0
- FOUND commit: f96866f
- FOUND commit: aab0dd0
