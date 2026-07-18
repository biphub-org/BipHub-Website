# Deferred Items — Phase 09 (coordinator-bip-builder-completion)

Out-of-scope discoveries logged during plan execution per the executor's
scope-boundary rule (fix only what the current task's changes directly caused).

## Plan 09-08

### `verify-seed.ts` date-relative distribution checks are stale (pre-existing, NOT caused by this plan)

- **Found during:** Task 3 (`npm run verify:seed` run against the cloud TEST project)
- **Symptom:** `open_count_in_range_10_to_14` and `closed_count_in_range_6_to_10` FAIL
  (currently 4 open / 16 closed instead of the expected ~12 open / ~8 closed).
- **Root cause:** `supabase/seed.sql`'s 20 BIPs were authored with `application_deadline`
  values relative to a fixed "today = 2026-05-09" (see the seed file's header comment).
  `verify-seed.ts` compares those deadlines against the actual wall-clock date at run
  time. Real time has since advanced to 2026-07-18, so deadlines that were "future" at
  authoring time have naturally rolled into "past" — this is calendar drift, not a
  regression from any Plan 09-08 change (Tasks 1-3 only added/queried the four new
  builder-completion fields; no `application_deadline` value was touched).
- **Verified pre-existing:** confirmed by inspecting the diff of Task 1/2 commits
  (`cdb245f`, `b0e0a84`) — neither touches any date column, and the same two checks
  would fail identically on the pre-Plan-09-08 seed data.
- **Not fixed here:** re-dating 20 BIPs' `physical_start_date`/`physical_end_date`/
  `application_deadline` is a content change unrelated to FOUN-14/SUBM-09..11, and
  risks disturbing other specs/tests that may depend on specific BIPs' open/closed
  state (e.g. BROW-* filter tests). Recommend a small dedicated follow-up plan (or a
  periodic "reseed relative dates" maintenance task) that shifts all seed dates
  forward by a fixed offset so the open/closed ratio holds regardless of calendar
  drift.
- **All four-field-specific checks in `verify-seed.ts` pass:** `partner_only_ge_1`
  passes with 2 BIPs flagged `partner_institutions_only=true` (already present in the
  cloud TEST project from the original Plan 01-03 seed). 16/18 total checks pass;
  the 2 failures are both date-drift, not new-field related.
