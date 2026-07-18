---
phase: 09-coordinator-bip-builder-completion
plan: 08
subsystem: database
tags: [supabase, seed-data, e2e-fixtures, playwright, verify-script]

# Dependency graph
requires:
  - phase: 09-coordinator-bip-builder-completion
    provides: bip_edits builder-completion columns (Plan 09-01) + bip_edits column-list consolidation into BIP_EDIT_CONTENT_COLUMNS (Plan 09-07) — this plan closes FOUN-14's seed-source-sync half
provides:
  - supabase/seed.sql now populates virtual_sessions_count/virtual_duration_notes on 6 of 20 demo BIPs, alongside the pre-existing accommodation_notes/partner_institutions_only coverage
  - supabase/seed.e2e.sql and scripts/seed-cloud-e2e.mjs e2e-edit-target-bip fixture carries non-default values for all four builder-completion fields, in lockstep across both sources
  - scripts/verify-seed.ts partner_institutions_only distribution check (partner_only_ge_1)
affects: [09-09 (per-field edit->approve->persist round-trip E2E specs consume the edit-target fixture's pre-populated non-default values)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "New BIP-model fields must land in all three seed sources in the same commit-adjacent set of edits, with the edit-target fixture always given non-default values so round-trip E2E specs have something to change (FOUN-14 pattern, now demonstrated end-to-end for this field set)"

key-files:
  created:
    - .planning/phases/09-coordinator-bip-builder-completion/deferred-items.md
  modified:
    - supabase/seed.sql
    - supabase/seed.e2e.sql
    - scripts/seed-cloud-e2e.mjs
    - scripts/verify-seed.ts
    - .planning/REQUIREMENTS.md

key-decisions:
  - "virtual_sessions_count/virtual_duration_notes populated on exactly 6 of 20 seed.sql rows (BIPs 1, 4, 7, 10, 13, 16), spread across different countries/languages rather than clustered, mirroring the plan's '~6 rows' guidance; the other 14 rows carry explicit NULL, NULL rather than omitting the columns (single multi-row VALUES INSERT requires positional values for every row)"
  - "e2e-edit-target-bip is the ONLY e2e fixture given the four new fields — sufficient to satisfy both the 'at least one non-default value across the fixture set' truth and the fixture-specific truth; other e2e fixtures were left untouched to minimize unrelated diff surface"
  - "Did not re-date any of the 20 demo BIPs to fix the pre-existing open/closed deadline distribution failure — that drift is unrelated to FOUN-14/SUBM-09..11 and is logged to deferred-items.md instead of auto-fixed, per the scope-boundary rule (fix only what this plan's changes directly caused)"

patterns-established:
  - "verify-seed.ts distribution checks follow one recipe per boolean field: select the column, filter true, assert count >= N — new field checks should copy the green_travel/inclusion_support/partner_institutions_only block shape"

requirements-completed: [SUBM-09, SUBM-10, SUBM-11, FOUN-14]

# Metrics
duration: ~12min
completed: 2026-07-18
---

# Phase 09 Plan 08: Seed Sources Sync for Builder-Completion Fields Summary

**Populated virtual_sessions_count/virtual_duration_notes across local and e2e seed sources, pre-loaded the e2e edit-target fixture with non-default values for all four builder-completion fields in lockstep across both e2e sources, and added a partner_institutions_only distribution check to verify-seed.ts — closing FOUN-14's seed-source-sync half.**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-07-18
- **Tasks:** 3 completed
- **Files modified:** 4 (supabase/seed.sql, supabase/seed.e2e.sql, scripts/seed-cloud-e2e.mjs, scripts/verify-seed.ts) + 1 created (deferred-items.md) + REQUIREMENTS.md

## Accomplishments
- `supabase/seed.sql`'s 20-BIP INSERT column list gained `virtual_sessions_count`/`virtual_duration_notes`; 6 of 20 rows carry realistic values (e.g. "Four 2-hour synchronous sessions delivered weekly before arrival..."), the other 14 carry explicit `NULL, NULL`. `accommodation_notes`/`partner_institutions_only` were already present from Plan 01-03 and needed no further seeding to satisfy this plan's truths.
- `supabase/seed.e2e.sql`'s `e2e-edit-target-bip` fixture (UUID `e2e0bbbb-bbbb-bbbb-bbbb-000000000010`) now carries `virtual_sessions_count=4`, a descriptive `virtual_duration_notes`, an `accommodation_notes` string, and `partner_institutions_only=true` — non-default values for all four fields.
- `scripts/seed-cloud-e2e.mjs`'s equivalent fixture object gained the exact same four field values, kept identical to `seed.e2e.sql` per the BUG-002 lockstep requirement (MEMORY: the two e2e seed files must stay in sync).
- `scripts/verify-seed.ts` selects `partner_institutions_only` and asserts `partner_only_ge_1` (>=1 seeded BIP flagged partner-institutions-only), mirroring the existing `green_travel`/`inclusion_support` distribution-check shape.
- FOUN-14 is now fully satisfied: Plan 09-07 consolidated the `bip_edits` column-list literal into one shared constant; this plan closes the seed-source-sync half. Marked `[x]` in REQUIREMENTS.md (both the requirement line and the traceability table row).

## Task Commits

Each task was committed atomically:

1. **Task 1: Populate the four new fields in local seed.sql** - `cdb245f` (feat)
2. **Task 2: Update the two e2e seed sources in lockstep (incl. edit-target fixture)** - `b0e0a84` (feat)
3. **Task 3: Extend verify-seed and run it green (local)** - `b27b9f9` (feat)

**Plan metadata:** (this commit, docs)

## Files Created/Modified
- `supabase/seed.sql` - Added `virtual_sessions_count`/`virtual_duration_notes` to the bips INSERT column list; populated on 6 of 20 rows (BIPs 1, 4, 7, 10, 13, 16), `NULL, NULL` on the remaining 14
- `supabase/seed.e2e.sql` - `e2e-edit-target-bip` fixture INSERT gained all four builder-completion fields with non-default values
- `scripts/seed-cloud-e2e.mjs` - Cloud fixture object for `e2e-edit-target-bip` gained the identical four field values
- `scripts/verify-seed.ts` - `Bip` type, select string, and a new `partner_only_ge_1` check all reference `partner_institutions_only`
- `.planning/REQUIREMENTS.md` - FOUN-14 marked complete (checkbox + traceability table row)
- `.planning/phases/09-coordinator-bip-builder-completion/deferred-items.md` (created) - Documents the pre-existing, out-of-scope `verify-seed.ts` date-drift failure discovered while running Task 3's verification

## Decisions Made
- Spread the 6 rows carrying `virtual_sessions_count`/`virtual_duration_notes` across different countries/languages (BIPs 1 DE-en, 4 DE-en, 7 NL-en, 10 IT-it, 13 PL-en, 16 CZ-en) rather than clustering them, so the field exercises variety in the demo dataset
- Limited the e2e non-default-value seeding to the single `e2e-edit-target-bip` fixture rather than spreading across all e2e fixtures — sufficient to satisfy both plan truths ("at least one non-default value across the fixture set" and the edit-target-specific truth) while minimizing unrelated diff surface in files with strict lockstep-sync requirements
- Left the pre-existing open/closed deadline distribution failure in `verify-seed.ts` unfixed and logged it to `deferred-items.md` instead — it predates this plan (confirmed no date column was touched in either Task 1 or Task 2 commits) and re-dating 20 BIPs is out of FOUN-14's scope

## Deviations from Plan

### Auto-fixed Issues

None — no Rule 1/2/3 auto-fixes were needed for this plan's own scope.

### Out-of-Scope Discovery (logged, not fixed)

**1. `verify-seed.ts` date-relative distribution checks are stale (pre-existing calendar drift)**
- **Found during:** Task 3 (`npm run verify:seed` against the cloud TEST project)
- **Issue:** `open_count_in_range_10_to_14` and `closed_count_in_range_6_to_10` FAIL (4 open / 16 closed instead of ~12/~8). `supabase/seed.sql`'s 20 BIPs were authored with `application_deadline` values relative to a fixed "today = 2026-05-09" comment; real time has since advanced to 2026-07-18, so deadlines that were future at authoring time have rolled into the past.
- **Why not fixed:** Unrelated to FOUN-14/SUBM-09..11 (no date column was touched by this plan's Tasks 1 or 2); re-dating 20 BIPs risks disturbing other specs that depend on specific BIPs' open/closed state (e.g. BROW-* filter tests) and is better handled as a small dedicated maintenance plan (shift all seed dates by a fixed offset).
- **Logged to:** `.planning/phases/09-coordinator-bip-builder-completion/deferred-items.md`
- **Verification of pre-existing status:** confirmed neither Task 1 commit (`cdb245f`) nor Task 2 commit (`b0e0a84`) touches any `application_deadline`/`physical_start_date`/`physical_end_date` value

---

**Total deviations:** 0 auto-fixed; 1 out-of-scope issue logged (not fixed, per scope-boundary rules)
**Impact on plan:** This plan's own new/extended check (`partner_only_ge_1`) passes (2 BIPs). The two failing checks are pre-existing and unrelated to the four builder-completion fields this plan seeds.

## Issues Encountered
- `npm run verify:seed` runs against the cloud TEST project (`zbvcpiwbopmfbjfhzprw`), not a local Docker Postgres — this environment has neither Docker nor `psql` available, and there is no automated script that applies `supabase/seed.sql`'s raw SQL to the cloud project (only `scripts/seed-cloud-e2e.mjs`, which uses the Supabase JS client + Admin API for the e2e fixtures, exists for cloud writes). The cloud TEST project already carried the pre-Plan-09-08 demo seed data (including the pre-existing `partner_institutions_only`/`accommodation_notes` values from Plan 01-03), so `verify:seed`'s new `partner_only_ge_1` check could be verified against real data without a fresh re-seed. The updated `virtual_sessions_count`/`virtual_duration_notes` values in `seed.sql` and the e2e fixture's four non-default values are committed to the repo and will apply on the next `supabase db reset` (local) or the next intentional cloud re-seed — they were not independently verified against a live re-seeded cloud row in this session, since no re-seed mechanism for `seed.sql` against cloud exists in this repo.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- FOUN-14 is fully satisfied across both halves (bip_edits column-list consolidation from Plan 09-07 + seed-source sync from this plan)
- Plan 09-09's per-field edit->approve->persist round-trip E2E specs have a concrete non-default starting value for each of the four builder-completion fields on `e2e-edit-target-bip`, in both `seed.e2e.sql` (local Playwright runs) and `seed-cloud-e2e.mjs` (cloud/CI runs)
- Known gap: no automated mechanism exists in this repo to apply `supabase/seed.sql` (the 20-BIP demo catalog) to the cloud TEST project — only the e2e fixture seed (`seed-cloud-e2e.mjs`) has a cloud path. If Plan 09-09 or later work needs the demo catalog's new field values live in cloud, that gap will need to be closed (e.g. a `scripts/seed-cloud-demo.mjs` mirroring `seed-cloud-e2e.mjs`'s approach, or documented manual SQL application via Supabase Studio)
- Pre-existing `verify-seed.ts` date-drift failures (2 of 18 checks) remain open in `deferred-items.md` — unrelated to this plan, recommend a small follow-up plan to shift seed dates forward

---
*Phase: 09-coordinator-bip-builder-completion*
*Completed: 2026-07-18*

## Self-Check: PASSED

- FOUND: supabase/seed.sql
- FOUND: supabase/seed.e2e.sql
- FOUND: scripts/seed-cloud-e2e.mjs
- FOUND: scripts/verify-seed.ts
- FOUND: .planning/phases/09-coordinator-bip-builder-completion/deferred-items.md
- FOUND: .planning/REQUIREMENTS.md
- FOUND commit: cdb245f
- FOUND commit: b0e0a84
- FOUND commit: b27b9f9
