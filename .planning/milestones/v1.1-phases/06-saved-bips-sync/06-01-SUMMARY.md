---
phase: 06-saved-bips-sync
plan: "01"
subsystem: database-foundation
tags: [migration, rls, supabase, zod, tdd, saved-bips, gdpr]
dependency_graph:
  requires: [05-student-role]
  provides: [saved_bips-table-live, database-types-saved_bips, SaveBipSchema, parseLegacyBookmarkIds]
  affects: [06-02-save-actions, 06-03-saved-bips-page, 06-04-legacy-sweep, 06-04-e2e]
tech_stack:
  added: []
  patterns:
    - "FK-driven GDPR cascade: user_id → auth.users(id) ON DELETE CASCADE (no RPC changes needed)"
    - "4-policy RLS pattern (select_own/insert_own/delete_own/select_admin) with no UPDATE policy"
    - "Pure testable module for legacy sweep — no React/Next/Supabase imports"
    - "TDD RED/GREEN: failing test committed before implementation"
key_files:
  created:
    - supabase/migrations/00016_saved_bips.sql
    - lib/schemas/saved-bips.ts
    - lib/legacy-bookmarks.ts
    - tests/schemas/saved-bips.test.ts
  modified:
    - lib/supabase/database.types.ts
decisions:
  - "D-06: migration 00016 DDL from ARCHITECTURE.md 166-204 copied verbatim; 4 RLS policies, no UPDATE policy"
  - "FOUN-09: cascade is FK-driven (user_id → auth.users ON DELETE CASCADE); delete_my_account() RPC (00013) untouched"
  - "supabase db push ran non-interactively (accepted default Y prompt); --dry-run confirms no pending migrations"
  - "parseLegacyBookmarkIds is a pure module (zero react/next/@supabase imports) — safe for unit testing without JSDOM"
metrics:
  duration: "~12 minutes"
  completed: "2026-06-15"
  tasks_completed: 3
  tasks_total: 3
  files_created: 4
  files_modified: 1
---

# Phase 06 Plan 01: Database Foundation for Saved BIPs Summary

saved_bips PII table with own-only RLS, FK cascade to auth.users, performance indexes, applied to linked cloud Supabase project; Zod v3 SaveBipSchema and pure parseLegacyBookmarkIds with 11 green unit tests.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Write migration 00016_saved_bips.sql | 3d4aa89 | supabase/migrations/00016_saved_bips.sql |
| 2 | Apply migration to cloud + regenerate types | c287c43 | lib/supabase/database.types.ts |
| 3 (RED) | Failing tests for SaveBipSchema + parseLegacyBookmarkIds | 780cfff | tests/schemas/saved-bips.test.ts |
| 3 (GREEN) | Implement SaveBipSchema + parseLegacyBookmarkIds | 34c94cd | lib/schemas/saved-bips.ts, lib/legacy-bookmarks.ts |

## Decisions Made

1. **Migration DDL copied verbatim** from ARCHITECTURE.md lines 166-204 / 06-RESEARCH.md lines 498-539 (D-06). No columns or policy names invented.

2. **No UPDATE policy** — save/unsave is insert/delete only. The CLAUDE.md USING+WITH CHECK rule for UPDATE policies is intentionally not applicable here.

3. **FK-driven GDPR cascade** — user_id references auth.users(id) ON DELETE CASCADE means the existing delete_my_account() RPC (00013) removes all saved_bips rows automatically. RPC left untouched (FOUN-09).

4. **supabase db push ran non-interactively** — accepted the default Y confirmation prompt in the non-TTY shell. `--dry-run` confirms: "Remote database is up to date" (no pending migrations). The plan's checkpoint:human-action escalation was not needed.

5. **parseLegacyBookmarkIds is a pure module** — zero imports from react, next, or @/lib/supabase. This makes the STUD-06 validation core unit-testable without JSDOM or Supabase mocks (D-02a).

## Verification Results

- `MIGRATION_OK` grep gate: all assertions passed (RLS, FK cascades, 4 policies, 2 indexes, no UPDATE policy, 00013 unchanged)
- `npx supabase db push --dry-run`: "Remote database is up to date"
- `lib/supabase/database.types.ts` contains `saved_bips` (Row/Insert/Update types + FK relation)
- `npx vitest run tests/schemas/saved-bips.test.ts`: 11/11 tests passed
- TDD gate compliance: RED commit (780cfff) precedes GREEN commit (34c94cd) in git log

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (test commit) | 780cfff | PASS — tests failed as expected (missing module imports) |
| GREEN (feat commit) | 34c94cd | PASS — 11/11 tests pass |

## Deviations from Plan

None — plan executed exactly as written. The `supabase db push` ran successfully in the non-TTY shell without requiring human intervention (accepted default Y confirmation). Task 2's `checkpoint:human-action` escalation was not triggered.

## Known Stubs

None. All three artifacts are complete and fully wired:
- `SaveBipSchema` is a complete Zod v3 validator (no placeholder)
- `parseLegacyBookmarkIds` is a complete pure parser (no TODO)
- `database.types.ts` contains actual generated types from the live cloud DB

## Threat Surface Scan

No new network endpoints, auth paths, or schema changes beyond what the plan's `<threat_model>` documents. All STRIDE threats (T-06-01 through T-06-06) are addressed by the migration RLS policies. No additional threat flags.

## Self-Check

Files exist:
- supabase/migrations/00016_saved_bips.sql: FOUND
- lib/schemas/saved-bips.ts: FOUND
- lib/legacy-bookmarks.ts: FOUND
- tests/schemas/saved-bips.test.ts: FOUND
- lib/supabase/database.types.ts: FOUND (contains saved_bips)

Commits exist:
- 3d4aa89: FOUND
- c287c43: FOUND
- 780cfff: FOUND
- 34c94cd: FOUND

## Self-Check: PASSED
