---
phase: 08-edit-approved-request-changes
plan: "01"
subsystem: test-harness
tags: [e2e, wave-0, bip-edits, playwright, seed]
dependency_graph:
  requires: []
  provides: [Wave0-failing-spec-bip-edits, seed-approved-bip, seed-pending-bip-edit]
  affects: [playwright.config.ts, supabase/seed.e2e.sql]
tech_stack:
  added: []
  patterns: [multi-context-playwright, service-role-db-read, serial-test-ordering]
key_files:
  created:
    - tests/e2e/bip-edits.spec.ts
  modified:
    - playwright.config.ts
    - supabase/seed.e2e.sql
decisions:
  - "bip-edits.spec.ts assigned to admin-authed project only; coordinator assertions spawn in-spec context via browser.newContext(storageState.coordinator.json) — avoids double-run"
  - "Service-role DB read helper assertAuditRow() uses Supabase REST API + SUPABASE_SERVICE_ROLE_KEY (same pattern as saved-bips.spec.ts) for EDIT-08 audit assertions"
  - "Wave 0 spec is intentionally RED; selectors reference routes that do not exist until later plan waves"
  - "Seeded BIP uuid e2e0bbbb-bbbb-bbbb-bbbb-000000000010 / slug e2e-edit-target-bip is distinct from admin-review.spec.ts BIPs (Machine Learning, Data Ethics)"
  - "bip_edits seed row requires migration 00017 (Plan 08-02); INSERT is safe to author now — applied at test run time after Wave 1 push"
metrics:
  duration: "~10 min"
  completed: "2026-06-26T10:03:14Z"
  tasks_completed: 2
  files_created: 1
  files_modified: 2
---

# Phase 8 Plan 01: Wave 0 Failing Spec for BIP-Edits — Summary

Wave 0 failing E2E harness for Phase 8 (edit-approved-BIP + request-changes): 8-test serial spec, admin-authed project wiring, approved-BIP + pending-edit seed rows locking EDIT-01..EDIT-09 observable success criteria.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Author the failing bip-edits E2E spec | cf34ecd | tests/e2e/bip-edits.spec.ts |
| 2 | Wire playwright.config.ts + seed | b34599b | playwright.config.ts, supabase/seed.e2e.sql |

---

## What Was Built

**tests/e2e/bip-edits.spec.ts** (498 lines)

8 serial tests under `test.describe.configure({ mode: 'serial' })`, covering the full EDIT-01..EDIT-09 surface:

| Test # | Grep key (VALIDATION.md) | Requirement |
|--------|--------------------------|-------------|
| 1 | submit edit | EDIT-01 |
| 2 | public page unchanged | EDIT-02 |
| 3 | diff view | EDIT-03 |
| 4 | approve edit | EDIT-04 |
| 5 | reject edit | EDIT-05 |
| 6 | request changes new submission | EDIT-06 (new submission) |
| 7 | request changes edit | EDIT-06 (edit row) |
| 8 | slug immutable | EDIT-09 |

EDIT-07 (D-15 console-log fallback) and EDIT-08 (audit row) are included inside the relevant tests — EDIT-07 via console capture annotation, EDIT-08 via `assertAuditRow()` service-role REST read.

**playwright.config.ts**

`admin-authed` project `testMatch` changed from `/admin-review\.spec\.ts$/` to `/(admin-review|bip-edits)\.spec\.ts$/`. Coordinator-authed testMatch UNCHANGED (single-execution design decision from 08-01-PLAN.md interfaces block).

**supabase/seed.e2e.sql** — Phase 8 block (Step 6):

- Row a: `bips` row `status='approved'`, uuid `e2e0bbbb-bbbb-bbbb-bbbb-000000000010`, slug `e2e-edit-target-bip`, owned by `e2e-coordinator@biphub.test` (uid `11111111-1111-1111-1111-111111111111`). Does NOT reuse admin-review.spec.ts BIPs (T-08-01 mitigation).
- Row b: `bip_edits` row `status='pending'`, proposed title `[EDIT] E2E Edit Target BIP — revised` (differs from live title), `partner_institutions='[]'::jsonb`. Requires migration 00017 applied at test run time (Wave 1).

---

## Verification

All acceptance criteria pass:

```
npx playwright test --list tests/e2e/bip-edits.spec.ts
# → 8 tests listed under [admin-authed] (with NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321)

grep -c "submit edit|public page unchanged|diff view|approve edit|reject edit|..." bip-edits.spec.ts
# → 27 (>= 8 required)

grep -q "storageState.coordinator.json" bip-edits.spec.ts
# → FOUND
```

---

## Deviations from Plan

None — plan executed exactly as written. The `--list` verification required Task 2's config update to be applied first (testMatch must include `bip-edits`); both tasks were completed before running the final verification pass.

---

## Known Stubs

None. This is a test-harness plan. The spec references routes (`/dashboard/bips/[id]/edit`, `/admin/bip-edits/[editId]/review`) and selectors ("Submit Edit for Review", "Field Comparison") that do not exist yet — this is the intended Wave 0 RED state, not a stub.

---

## Threat Flags

None. No new network endpoints, auth paths, or schema changes introduced. The seed.e2e.sql additions are test-fixture-only (E2E_ALLOW_CLOUD guard prevents prod use).

---

## Self-Check: PASSED

- [x] tests/e2e/bip-edits.spec.ts — FOUND (498 lines, created)
- [x] playwright.config.ts — FOUND (modified, testMatch verified)
- [x] supabase/seed.e2e.sql — FOUND (modified, bip_edits + e2e-edit-target-bip verified)
- [x] cf34ecd — FOUND in git log
- [x] b34599b — FOUND in git log
