---
phase: 09-coordinator-bip-builder-completion
plan: 09
subsystem: testing
tags: [playwright, e2e, supabase, postgrest, wizard, admin-review]

# Dependency graph
requires:
  - phase: 09-coordinator-bip-builder-completion
    provides: "Wizard UI for the four builder-completion fields (Plan 09-04); BipDetail/write-path propagation (Plan 09-05/09-06); bip_edits merge-on-approve closing the anti-Pitfall-1 gap (Plan 09-07); seed sources carrying non-default fixture values (Plan 09-08); the BROW-14 badge on BipCard (Plan 09-03)"
provides:
  - "tests/e2e/submission.spec.ts create-path coverage: virtual_sessions_count/virtual_duration_notes, a non-'before' virtual_timing option ('mixed'), max_participants floor of 10, partner_institutions_only, and accommodation_notes all filled and submitted without a DB CHECK error"
  - "tests/e2e/bip-edits.spec.ts per-field edit->approve->persist round trip: all four builder-completion fields changed to NEW values, admin-approved, and asserted against the LIVE bips row via a service-role REST read-back — the binding SUBM-14/anti-Pitfall-1 proof (D-08)"
  - "tests/e2e/bips-card.spec.ts (new): BROW-14 partner-institutions-only badge proven present on a partner-only demo BIP and absent on a non-partner-only one"
  - "scripts/seed-cloud-e2e.mjs fix: partner_institutions_only now explicitly set on every fixture BIP (was silently NULL-violating the NOT NULL constraint on all but the edit-target row)"
affects: [10-bip-detail-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Cloud e2e fixture reads for D-08-class proofs always target the live `bips` table directly (service-role REST, select naming the exact changed columns) — never the bip_edits/bip_status_history audit tables and never a wizard/diff render assertion"
    - "New badge/listing specs anchor on stable demo-seed (supabase/seed.sql) fixtures rather than mutable e2e fixtures (supabase/seed.e2e.sql) when another spec in the suite mutates the same field on the same row — avoids Playwright project-execution-order races"
    - "PostgREST bulk .insert() over a heterogeneous array of JS objects treats a key ABSENT from any one object as an explicit NULL for that row (not 'use the column default') — every NOT NULL column with a default must be set on every object in the batch, not just the ones needing a non-default value"

key-files:
  created:
    - tests/e2e/bips-card.spec.ts
  modified:
    - tests/e2e/submission.spec.ts
    - tests/e2e/bip-edits.spec.ts
    - scripts/seed-cloud-e2e.mjs
    - playwright.config.ts

key-decisions:
  - "bips-card.spec.ts anchors on the two demo-seeded (supabase/seed.sql) partner_institutions_only=true BIPs ('Smart Grid...Vienna' / 'Offshore Wind...Lyngby') instead of e2e-edit-target-bip — the edit-target fixture's partner_institutions_only is flipped true->false by this same plan's bip-edits.spec.ts round-trip test, and Playwright's 'admin-authed' vs 'public' project execution order is not something a badge spec should depend on"
  - "The per-field round-trip test in bip-edits.spec.ts is inserted immediately after 'admin approves edit' (not appended at file end) so it starts from State A (no open edit) and ends by approving its own edit (State A again), preserving the 'admin rejects edit' test's precondition that follows it"
  - "partner_institutions_only's seeded round-trip direction is true->false (not false->true) since e2e-edit-target-bip's only seeded non-default value for this field is true (Plan 09-08)"

patterns-established:
  - "D-08 read-back helper shape: fetch `${supabaseUrl}/rest/v1/bips?id=eq.${id}&select=<exact NEW-field column names>` with service-role headers, then one `expect(...).toBe(...)` per field — the template for any future per-field live-row persistence proof in this suite"

requirements-completed: [SUBM-09, SUBM-10, SUBM-11, SUBM-12, SUBM-13, SUBM-14, BROW-14]

# Metrics
duration: ~45min
completed: 2026-07-18
---

# Phase 09 Plan 09: Phase-Gate E2E Proof — Create Path, Per-Field Round Trip, Partner Badge Summary

**Extended the wizard create-path and bip-edits E2E specs to cover all four builder-completion fields plus the corrected virtual_timing enum, added the binding per-field edit->approve->persist live-row read-back proof for SUBM-14 (anti-Pitfall-1/D-08), and added a new BROW-14 badge spec — closing out Phase 9 with a fully green 42-test Playwright suite against the cloud TEST project.**

## Performance

- **Duration:** ~45 min
- **Completed:** 2026-07-18
- **Tasks:** 3 completed
- **Files modified:** 4 (1 created: tests/e2e/bips-card.spec.ts; 3 modified: tests/e2e/submission.spec.ts, tests/e2e/bip-edits.spec.ts, scripts/seed-cloud-e2e.mjs) + playwright.config.ts wiring

## Accomplishments
- `tests/e2e/submission.spec.ts`'s "coordinator submits a BIP through the 5-step wizard" test now selects `virtual_timing='mixed'` (a non-'before' option, proving the corrected 5-value DB CHECK enum accepts it — SUBM-12), fills `virtual_sessions_count`/`virtual_duration_notes` in Step 2, sets `max_participants` to the new floor of 10 (SUBM-13), ticks the `partner_institutions_only` checkbox in Step 3 (SUBM-11), and fills `accommodation_notes` in Step 4 (SUBM-10) — the wizard submits cleanly through to the Pending tab with all five changes in place.
- `tests/e2e/bip-edits.spec.ts` gained a new serial test, "per-field edit round-trip persists on the live bips row — field round trip", inserted right after the existing "admin approves edit" test. It drives the coordinator edit wizard changing all four builder-completion fields on `e2e-edit-target-bip` to values distinct from the Plan 09-08 seed (`virtual_sessions_count` 4→8, new `virtual_duration_notes`/`accommodation_notes` strings, `partner_institutions_only` true→false), submits, has the admin approve, then reads the LIVE `bips` row via `GET /rest/v1/bips?id=eq.{id}&select=virtual_sessions_count,virtual_duration_notes,accommodation_notes,partner_institutions_only` with the service-role key and asserts each field's post-approve value individually. This is the binding SUBM-14 / anti-Pitfall-1 proof the phase gate required — not a wizard-preview or diff-view render check.
- New `tests/e2e/bips-card.spec.ts` (BROW-14): asserts the "Partner institutions only" badge is visible on the seeded partner-only demo BIP's card (anchored by `a[href="/bip/smart-grid-energy-transition-vienna-2025"]`) and absent from a known non-partner-only card, plus a count cross-check (`badgeCount > 0 && badgeCount < totalCards`) proving the badge is conditional, not global. Wired into `playwright.config.ts`'s `public` project `testMatch` alongside `map-filter`/`no-horizontal-overflow` — without this the new file matched no project and would have silently run 0 tests.
- Fixed a real bug in `scripts/seed-cloud-e2e.mjs` discovered while verifying Task 2 against the cloud TEST project: `partner_institutions_only` (NOT NULL DEFAULT false) was only set on the `e2e-edit-target-bip` fixture object; every other fixture BIP omitted the key. Supabase's PostgREST bulk `.insert()` over a heterogeneous JSON array treats an absent key as an explicit `NULL` for that row (not "use the column default"), so the cloud reseed failed outright with a NOT NULL violation on the first run. Added `partner_institutions_only: false` to the shared `baseBip` object.
- Full phase-gate verification run clean: `npm run test` (76/76 Vitest), `npm run verify:seed` (16/18 — the 2 pre-existing date-drift failures are logged in Plan 09-08's `deferred-items.md`, unrelated to this plan), and a full `npx playwright test` run against a freshly cloud-reseeded fixture set: **41 passed, 1 skipped** (the pre-existing, documented local-only `test.fixme` in `map-filter.spec.ts` — not a regression).

## Task Commits

Each task was committed atomically:

1. **Task 1: Create-path assertions in submission.spec.ts** - `bb0c0a1` (test)
2. **Task 2: Per-field edit->approve->persist read-back in bip-edits.spec.ts (D-08)** - `cdd93d4` (test)
3. **Task 3: BROW-14 badge spec on /bips** - `f027f27` (test)

**Plan metadata:** (this commit, docs)

## Files Created/Modified
- `tests/e2e/submission.spec.ts` - Step 2/3/4 now fill/select all four builder-completion fields plus a non-'before' `virtual_timing` option and the `max_participants` floor of 10
- `tests/e2e/bip-edits.spec.ts` - New serial test proving the per-field edit->approve->persist round trip via a live-`bips`-row service-role read-back (SUBM-14 binding proof)
- `tests/e2e/bips-card.spec.ts` (created) - BROW-14 badge presence/absence spec on `/bips`, anchored on stable demo-seed fixtures
- `scripts/seed-cloud-e2e.mjs` - `baseBip.partner_institutions_only: false` added so every fixture row explicitly sets the NOT NULL column (Rule 3 fix)
- `playwright.config.ts` - `public` project `testMatch` extended to include `bips-card.spec.ts`

## Decisions Made
- Anchored `bips-card.spec.ts` on the two demo-seed (`supabase/seed.sql`) partner-only BIPs instead of `e2e-edit-target-bip`, to avoid a race with this same plan's edit round-trip test flipping that fixture's `partner_institutions_only` value.
- Inserted the new per-field round-trip test immediately after "admin approves edit" (not at file end) so State A/State B preconditions for the subsequent reject/request-changes tests remain intact.
- Chose the seeded `true → false` direction for `partner_institutions_only` in the round-trip test since that is the fixture's only seeded non-default value for this boolean field.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed NOT NULL violation in scripts/seed-cloud-e2e.mjs blocking the cloud fixture reseed**
- **Found during:** Task 2 verification (running the new round-trip test against the cloud TEST project required a correct fixture reseed)
- **Issue:** `node scripts/seed-cloud-e2e.mjs` failed with `null value in column "partner_institutions_only" of relation "bips" violates not-null constraint`. The script's shared `baseBip` object never set `partner_institutions_only`; only the `e2e-edit-target-bip` entry set it (to `true`). PostgREST's bulk insert over a heterogeneous JSON array fills an absent key with `NULL` for that row rather than falling back to the column's `DEFAULT false`.
- **Fix:** Added `partner_institutions_only: false` to `baseBip`, matching the DB default; the edit-target-bip entry's explicit `partner_institutions_only: true` still overrides it via object-spread order.
- **Files modified:** scripts/seed-cloud-e2e.mjs
- **Verification:** `node scripts/seed-cloud-e2e.mjs` completes with "Cloud E2E fixtures seeded successfully"; subsequent full `npx playwright test` run green (41 passed, 1 pre-existing skip)
- **Committed in:** cdd93d4 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — a genuine pre-existing bug in the cloud fixture seeder, surfaced only because this plan's verification required actually running it)
**Impact on plan:** Necessary to unblock cloud E2E verification for Task 2 and any future cloud reseed. No scope creep — fix is scoped to the exact NOT NULL violation this plan's own verification triggered.

## Issues Encountered
- The Playwright `setup.ts` "admin session" login flaked once (native form GET fallback before client JS hydration attached) during one of several full-suite runs in this session; it passed cleanly on immediate retry and is unrelated to this plan's changes — not investigated further per the scope-boundary rule (pre-existing E2E harness timing, not caused by any file this plan touches).
- Running the three-spec command twice in a row (once before, once after fixing the seed script) without an intervening cloud reseed caused two tests to fail on the second pass ("coordinator withdraws pending BIP" and the "submit edit" precondition test) — this is expected: those fixtures are consumed exactly once per fresh seed and the suite is designed to run against a freshly reseeded DB (as CI does). Re-running `node scripts/seed-cloud-e2e.mjs` before the final full-suite run resolved this; it is not a defect in the specs.

## User Setup Required

None - no external service configuration required. (The cloud TEST project fixture reseed was performed as part of this plan's own verification, using the existing `node scripts/seed-cloud-e2e.mjs` script with the bugfix above.)

## Next Phase Readiness
- Phase 9 (coordinator-bip-builder-completion) is now fully proven end-to-end: all 30 v1.2 requirements assigned to this phase (SUBM-09 through SUBM-14, BROW-14, FOUN-14, plus the Plan 09-01..09-08 requirements) are complete, and the phase's anchor acceptance criterion — a per-field live-row read-back proving an approved edit round-trips, not just a render check — is satisfied by `bip-edits.spec.ts`'s new "field round trip" test.
- Full `npx playwright test` is green against the cloud TEST project (41 passed, 1 pre-existing documented skip) with a freshly reseeded fixture set.
- Phase 10 (BIP Detail Page) can now proceed — it depends on Phase 9's finalized `BipDetail` type and write-path propagation, both of which are exercised end-to-end by this plan's specs.
- No blockers identified. The `scripts/seed-cloud-e2e.mjs` fix should be considered a standing prerequisite for any future contributor running a fresh cloud e2e reseed — the script now works correctly, no further action needed.

---
*Phase: 09-coordinator-bip-builder-completion*
*Completed: 2026-07-18*

## Self-Check: PASSED

- FOUND: tests/e2e/bips-card.spec.ts
- FOUND: tests/e2e/submission.spec.ts
- FOUND: tests/e2e/bip-edits.spec.ts
- FOUND: scripts/seed-cloud-e2e.mjs
- FOUND: playwright.config.ts
- FOUND commit: bb0c0a1
- FOUND commit: cdd93d4
- FOUND commit: f027f27
