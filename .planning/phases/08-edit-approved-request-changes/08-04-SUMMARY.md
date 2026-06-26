---
phase: 08-edit-approved-request-changes
plan: 04
subsystem: data-access
tags: [zod, queries, supabase, bip-edits, admin-queue, coordinator]
dependency_graph:
  requires: [08-02]
  provides: [08-05, 08-06, 08-07, 08-08]
  affects: [lib/queries/coordinatorBipById.ts, lib/queries/adminBips.ts]
tech_stack:
  added: []
  patterns:
    - Zod v3 discriminated schemas for edit/reject/request-changes verdicts
    - Two-query merge pattern for admin queue union (bip_edits + bips join in-process)
    - openEdit sub-object on CoordinatorBipForEdit (proposed content alongside live content)
    - getClaims() + role guard pattern applied to all query functions
key_files:
  created:
    - lib/schemas/bip-edits.ts
    - lib/queries/bipEdits.ts
  modified:
    - lib/queries/coordinatorBipById.ts
    - lib/queries/adminBips.ts
decisions:
  - "Two-query merge for getAdminPendingEdits: separate bip_edits + bips queries joined in-process rather than nested PostgREST template-literal select; avoids edge cases with ADMIN_BIP_SELECT embedded as nested template literal"
  - "ADMIN_BIP_SELECT exported from adminBips.ts so bipEdits.ts can import it; normalize() kept private (duplicated as normalizeAdminBipRow in bipEdits.ts)"
  - "openEdit populated for both 'approved' and 'changes_requested' BIP statuses so coordinator sees proposed content in all edit-path states"
metrics:
  duration: 900s
  completed: 2026-06-26
  tasks: 3
  files: 4
---

# Phase 8 Plan 4: Validation + Data-Access Layer Summary

**One-liner:** Zod v3 edit schemas (4 types) + typed query module for admin queue union (bip_edits + bips pending/changes_requested) + coordinator approved-BIP load with openEdit sub-object + latest-changes-request history read.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Create lib/schemas/bip-edits.ts | 28116f2 | lib/schemas/bip-edits.ts |
| 2 | Create lib/queries/bipEdits.ts | 1c1c388 | lib/queries/bipEdits.ts, lib/queries/adminBips.ts |
| 3 | Extend coordinatorBipById + export ADMIN_BIP_SELECT | 314f551 | lib/queries/coordinatorBipById.ts |

## Contracts Delivered

### lib/schemas/bip-edits.ts

Four Zod v3 schemas + inferred types:

- `ApproveEditSchema` — `{ editId: uuid }` (D-03 edit-path approve)
- `RejectEditSchema` — `{ editId: uuid, note: min10/max1000 }` (D-04)
- `RequestChangesEditSchema` — `{ editId: uuid, note: min10/max1000 }` (D-06a edit path)
- `RequestChangesBipSchema` — `{ bipId: uuid, note: min10/max1000 }` (D-06a new-submission path)

### lib/queries/bipEdits.ts

Five exported query functions + two exported types:

| Export | Scope | Purpose |
|--------|-------|---------|
| `getOpenEditForBip(bipId)` | coordinator | Returns `BipEditDetail\|null` for pending/changes_requested edit; used by `getCoordinatorBipById` |
| `getBipEditById(editId)` | admin | Returns `BipEditDetail\|null` for admin review page (diff + action panel) |
| `getAdminPendingSubmissions()` | admin | Returns `AdminBip[]` for bips with status in pending/changes_requested |
| `getAdminPendingEdits()` | admin | Returns `AdminBipEditItem[]` for bip_edits with parent bip (two-query merge) |
| `getLatestChangesRequest(bipId)` | coordinator | Returns `string\|null` note from bip_status_history action_kind=request_changes |
| `BipEditDetail` | type | `{id, bip_id, status, admin_note, created_by, data: BipDraftData}` |
| `AdminBipEditItem` | type | `{id, bip_id, status, created_at, admin_note, bip: AdminBip}` |

### lib/queries/coordinatorBipById.ts (extended)

- Status whitelist: `draft | pending | approved | changes_requested` (was `draft | pending` — Pitfall 1 fix)
- Return type `CoordinatorBipForEdit` gains `status` field and optional `openEdit?: {id, status, admin_note, data: BipDraftData} | null`
- For approved/changes_requested BIPs: populates `openEdit` from `getOpenEditForBip`; `data` stays LIVE bips content (diff reference); `openEdit.data` is proposed content for form pre-fill

### lib/queries/adminBips.ts (modified)

- `ADMIN_BIP_SELECT` promoted from `const` to `export const` — no behavior change

## Security Compliance

| Threat | Mitigation |
|--------|------------|
| T-08-10: coordinator reading another's edit | `getOpenEditForBip` RLS `bip_edits_select_own` + `getClaims()` sub; coordinator can only see their own rows |
| T-08-11: non-admin reaching admin queue | `getAdminPendingSubmissions` and `getAdminPendingEdits` return `[]\|null` unless `role === 'admin'` |
| CLAUDE.md: never getSession() | All 5 functions use `getClaims()` only; `getSession()` never called |
| CLAUDE.md: never createAdminClient outside admin scope | `createClient()` (anon key) used throughout; file lives in `lib/queries/` not `app/(admin)/` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ADMIN_BIP_SELECT not exported; Task 2 import would fail**
- **Found during:** Task 2 (bipEdits.ts imports ADMIN_BIP_SELECT from adminBips.ts)
- **Issue:** `ADMIN_BIP_SELECT` was a private `const` in adminBips.ts. Task 2 imports it before Task 3 would export it.
- **Fix:** Added `export` keyword to `ADMIN_BIP_SELECT` as part of Task 2 (committed with Task 2 changes). Task 3 confirmed the export is already in place.
- **Files modified:** lib/queries/adminBips.ts
- **Commit:** 1c1c388

**2. [Rule 1 - Implementation choice] Two-query merge for getAdminPendingEdits**
- **Found during:** Task 2 implementation
- **Issue:** Nesting ADMIN_BIP_SELECT (a multi-line template literal) inside another PostgREST select string creates a brittle pattern. The query would read: `bip_edits.select('id, ..., bips!bip_id (\n  id, slug, ...\n)')` — valid but error-prone to maintain.
- **Fix:** Two-query approach: fetch bip_edits first, collect unique bip_ids, fetch bips with ADMIN_BIP_SELECT using `.in('id', bipIds)`, merge in-process. Clean, type-safe, no risk of template-literal nesting issues.
- **Files modified:** lib/queries/bipEdits.ts
- **Commit:** 1c1c388

**3. [Rule 1 - Minor] normalizeAdminBipRow duplicated in bipEdits.ts**
- **Found during:** Task 2 (normalization needed for AdminBip shape)
- **Issue:** `normalize()` in adminBips.ts is a private function; exporting it would be a behavioral change to adminBips.ts contract. Importing private functions across modules is not clean TypeScript.
- **Fix:** Duplicated the normalization logic as `normalizeAdminBipRow()` in bipEdits.ts. Both functions receive `RawAdminBipRow` and produce `AdminBip` — behavior is identical. ADMIN_BIP_SELECT export ensures the select string shape stays in sync.
- **Files modified:** lib/queries/bipEdits.ts
- **Commit:** 1c1c388

## Known Stubs

None. All functions are fully implemented with typed returns. No hardcoded empty values flow to UI rendering.

## Threat Flags

None. No new network endpoints, auth paths, or schema changes introduced. Trust boundary documentation for T-08-10 and T-08-11 matches the plan's threat model.

## Self-Check: PASSED

- lib/schemas/bip-edits.ts: EXISTS (created 28116f2)
- lib/queries/bipEdits.ts: EXISTS (created 1c1c388)
- lib/queries/coordinatorBipById.ts: MODIFIED (314f551)
- lib/queries/adminBips.ts: MODIFIED (1c1c388, export added)
- `npx tsc --noEmit` output: 0 lines (fully clean)
- All 4 schemas in bip-edits.ts: grep -c "Schema = z.object" = 4
- All 5 query functions in bipEdits.ts: confirmed present
- getClaims() in all query functions: confirmed; getSession() never called
- 'approved' in coordinatorBipById.ts whitelist: confirmed
- openEdit sub-object in coordinatorBipById.ts: confirmed
- ADMIN_BIP_SELECT exported from adminBips.ts: confirmed
