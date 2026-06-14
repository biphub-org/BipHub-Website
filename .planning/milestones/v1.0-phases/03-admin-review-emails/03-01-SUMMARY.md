---
phase: 03-admin-review-emails
plan: 01
subsystem: schema-foundation
tags: [database, rls, status-machine, supabase, migration, zod, audit-log, phase-3]

# Dependency graph
requires:
  - phase: 03-admin-review-emails
    provides: vitest infra + test stubs (03-00) — 4 stub files were filled in here
  - phase: 02-coordinator-auth-submission
    provides: bips table (00003), profiles (00002), RLS skeleton (00006), app_metadata role mirror (00008)
provides:
  - bip_status_history append-only audit log table (D-07) with admin-only INSERT, owner-or-admin SELECT, and immutability (no UPDATE/DELETE policies)
  - log_bip_status_change SECURITY DEFINER trigger function on public.bips for coordinator-initiated transitions (submit/resubmit/withdraw)
  - bips_update_own_editable RLS policy (D-10) replacing bips_update_own_draft_or_pending; WITH CHECK clamps post-image status to 'draft' (T-03-02 mitigation)
  - validateTransition() state machine guard + ALLOWED_TRANSITIONS table (D-06) — application-layer T-03-03 mitigation
  - ApproveBipSchema / RejectBipSchema Zod v3 schemas (D-04) — uuid bipId, optional 500-char note, 10–1000 char reason
  - Regenerated TypeScript database types covering the new bip_status_history table
affects:
  - 03-02 admin-dashboard (selects from bips with admin role check; will read history rows)
  - 03-03 approval-flow (calls validateTransition + ApproveBipSchema + writes audit row from Server Action)
  - 03-04 rejection-flow (calls validateTransition + RejectBipSchema + writes audit row)
  - 03-04 / 03-05 resubmit + submit (must navigate the new WITH CHECK clamp — see deviation note below)
  - 03-06 coordinator-resubmit (rejected → draft path now permitted by USING clause)

# Tech tracking
tech-stack:
  added: []   # no new runtime deps; uses existing zod@v3 + @supabase/ssr
  patterns:
    - "Append-only audit log via absence of UPDATE/DELETE policies (D-08 immutability)"
    - "SECURITY DEFINER trigger function with explicit revoke from public/anon/authenticated — only the trigger context may call it"
    - "ON DELETE SET NULL FKs on audit table to survive BIP/profile deletion (T-03-07 repudiation mitigation)"
    - "auth.jwt() -> 'app_metadata' ->> 'role' = 'admin' RLS predicate (mirrors 00006 pattern exactly)"
    - "Action-kind CHECK constraint enumerated explicitly (submit, approve, reject, resubmit, admin_edit, withdraw)"
    - "Indexes: (bip_id, created_at desc) for per-BIP timeline; (action_kind, created_at desc) for analytics"
    - "Zod v3 schema co-location: lib/schemas/admin-bips.ts mirrors lib/schemas/auth.ts shape with 'Zod v3 — see CLAUDE.md' anchor comment"

key-files:
  created:
    - supabase/migrations/00010_bip_status_history.sql (114 lines)
    - supabase/migrations/00011_bips_update_own_editable.sql (34 lines)
    - lib/utils/status-transitions.ts (47 lines, exports validateTransition + ALLOWED_TRANSITIONS + Actor type)
    - lib/schemas/admin-bips.ts (25 lines, exports ApproveBipSchema + RejectBipSchema + inferred input types)
  modified:
    - tests/utils/status-transitions.test.ts (10 it.todo replaced with real assertions)
    - tests/schemas/admin-bips.test.ts (10 it.todo replaced with real assertions)
    - lib/supabase/database.types.ts (+48 lines: bip_status_history Row/Insert/Update + FK relationships)

decisions:
  - "D-06 state machine is enforced at application layer (validateTransition) rather than a DB CHECK constraint — keeps the rule co-located with the Server Action that consumes it, and makes the actor dimension easy to express"
  - "Coordinator-initiated audit inserts (submit/resubmit/withdraw) flow through a SECURITY DEFINER trigger; admin-initiated inserts (approve/reject) are written directly by the Server Action via the regular createServerClient with the admin JWT — service-role bypass NOT required (T-03-05)"
  - "WITH CHECK on bips_update_own_editable clamps post-image to 'draft' even though USING permits draft/pending/rejected sources. This is the T-03-02 mitigation. The cost is that submitBipAction (writing status='pending') now requires a separate policy path; Plan 03-04 owns that work"
  - "Initial 'draft create' from wizard step 1 is intentionally NOT logged — the audit log captures lifecycle transitions, not row creation. The trigger early-returns when (TG_OP='INSERT' and status='draft')"
  - "Audit rows on approve/reject are written explicitly by the Server Action with the human-supplied note/reason text, NOT by the trigger — the trigger early-returns for admin transitions to avoid double-logging"

# Execution metrics
metrics:
  duration: "≈10 minutes total (3 commits across an initial executor + this resumption agent after Docker Desktop was started)"
  completed-date: 2026-05-12
  tasks-completed: 3
  files-touched: 7
---

# Phase 3 Plan 01: Schema Foundation Summary

**One-liner:** Ships the immutable audit log (`bip_status_history`), the resubmit-enabling RLS policy (`bips_update_own_editable`), the application-layer state machine validator (`validateTransition`), and the admin-action Zod schemas — the four primitives every remaining Phase 3 slice consumes.

## Commits

| # | Hash      | Type    | Scope | Summary                                                          | Files                                                                                                                                          |
|---|-----------|---------|-------|------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| 1 | `77758e2` | feat    | 03-01 | add state machine + admin Zod schemas + fill test bodies         | lib/utils/status-transitions.ts, lib/schemas/admin-bips.ts, tests/utils/status-transitions.test.ts, tests/schemas/admin-bips.test.ts          |
| 2 | `da87013` | feat    | 03-01 | add bip_status_history (00010) + bips_update_own_editable (00011) migrations | supabase/migrations/00010_bip_status_history.sql, supabase/migrations/00011_bips_update_own_editable.sql                                       |
| 3 | `90c751b` | chore   | 03-01 | regenerate database types for bip_status_history                 | lib/supabase/database.types.ts                                                                                                                |

## Tasks

### Task 1 — State machine + Zod schemas + test bodies (TDD)
- `lib/utils/status-transitions.ts` exports `validateTransition`, `ALLOWED_TRANSITIONS`, and `Actor` type.
- `lib/schemas/admin-bips.ts` exports `ApproveBipSchema` (uuid + optional 500-char note), `RejectBipSchema` (uuid + 10–1000 char reason), and inferred input types.
- 20 unit tests added (10 state-machine + 10 Zod-schema) — all pass; no `it.todo` remain in these two files.
- Verified: `npx vitest run` → 20 passed, 17 todo (downstream plans), 2 file passed + 2 skipped stubs (email send + email templates) untouched.

### Task 2 — Migrations 00010 + 00011
- `00010_bip_status_history.sql`: new table with 8 columns, `action_kind` CHECK constraint, two indexes, RLS enabled, two policies (`bsh_select_own_or_admin`, `bsh_insert_admin`), SECURITY DEFINER trigger `log_bip_status_change` + trigger `bips_status_change_audit`. No UPDATE/DELETE policies (audit immutability).
- `00011_bips_update_own_editable.sql`: drops `bips_update_own_draft_or_pending`; creates `bips_update_own_editable` with USING `(draft|pending|rejected)` + WITH CHECK forcing post-image `status='draft'`. Trailing comment block documents the `submitBipAction` follow-up dependency for Plan 03-04.

### Task 3 — Push migrations + regenerate types (BLOCKING)
- `npx supabase start` booted the local Docker stack (Docker Desktop required — see "Authentication Gates" below).
- `npx supabase db reset` applied migrations 00001..00011 from scratch with no errors; trigger and policy creation succeeded.
- `npx supabase gen types typescript --local > lib/supabase/database.types.ts` produced the regenerated types. After stripping a leaked stderr header and a Supabase plugin footer (see Deviations), the diff is a clean +48-line addition of the `bip_status_history` Row/Insert/Update types with FK relationships to `bips` and `profiles`.
- Verifications: `npx tsc --noEmit` → exit 0. `npx next lint` → exit 0 ("No ESLint warnings or errors"). `npx vitest run` → 20 passed.

## Deviations from Plan

### [Rule 1 – Bug] Generated types file contained non-TS content
- **Found during:** Task 3 (post-generation review).
- **Issue:** `npx supabase gen types typescript --local` redirected to a file emitted a CLI stderr line (`Connecting to db 5432`) as the first byte of the file, and the Supabase Claude Code plugin appended a trailing `<claude-code-hint v="1" type="plugin" value="supabase@claude-plugins-official" />` marker after the final `} as const`. Both would have failed `tsc` if left in place.
- **Fix:** Stripped both lines via in-place edit before staging — the prefix `Connecting to db 5432\n` and the trailing two lines `\n<claude-code-hint ... />\n`. Final diff is a clean +48 lines confined to the new `bip_status_history` table block.
- **Files modified:** `lib/supabase/database.types.ts`
- **Commit:** `90c751b`

### [Rule 3 – Plan-frontmatter path mismatch] Canonical types path is `lib/supabase/database.types.ts`
- **Found during:** Task 3 (read-first step).
- **Issue:** The plan frontmatter and the `action` block both reference `lib/types/database.ts` as the regenerated-types destination, but that file does not exist on disk. The actual canonical path used by the rest of the codebase (and by `package.json`'s `db:types` script) is `lib/supabase/database.types.ts`. The plan itself anticipated this case in step 3 ("If the existing types file lives at a different path… DO NOT relocate it — write to the existing path instead") and instructed the executor to record the actual path here.
- **Decision:** Wrote to the canonical path `lib/supabase/database.types.ts`. The plan's `files_modified` frontmatter entry `lib/types/database.ts` should be read as `lib/supabase/database.types.ts` for traceability. No new directory created; no file relocated.
- **Follow-up:** None — the plan explicitly authorised this. Recorded here for transparency in case future plans grep for `lib/types/database.ts`.

### [Plan-anticipated dependency] `submitBipAction` WITH CHECK conflict deferred to Plan 03-04
- The `bips_update_own_editable` policy's WITH CHECK clause forces post-image `status = 'draft'`. Phase 2's `submitBipAction` writes `status = 'pending'` in a single UPDATE — that path is now blocked by RLS until Plan 03-04 introduces either a `bips_update_own_to_pending` policy (USING `status='draft'`, WITH CHECK `status='pending'`) or a SECURITY DEFINER RPC. The trailing comment in `00011_bips_update_own_editable.sql` and the plan's own caveat document this — not a deviation, just surfacing the hand-off.

## Authentication Gates

### Gate 1 — Docker Desktop required for `npx supabase start`
- **Task:** Task 3.
- **What was needed:** Docker Desktop running on the host before `npx supabase start` can boot the local stack (Postgres + Auth + Studio + Mailpit + Edge Runtime).
- **Outcome:** The initial executor surfaced this as a checkpoint after Tasks 1 + 2 (commits 77758e2, da87013 already in place); the user started Docker Desktop and a continuation agent resumed and completed Task 3 cleanly. `supabase start` and `supabase db reset` then ran end-to-end without retry.

## Threat Model Implementation

| Threat ID | Disposition | Where mitigated in this plan                                                                                                          |
|-----------|-------------|---------------------------------------------------------------------------------------------------------------------------------------|
| T-03-02   | mitigate    | `bips_update_own_editable` WITH CHECK clamps post-image to `status='draft'` (migration 00011).                                        |
| T-03-03   | mitigate    | `validateTransition()` rejects every (from, to, actor) not in `ALLOWED_TRANSITIONS`; verified by 4 negative-path unit tests.          |
| T-03-04   | mitigate    | `RejectBipSchema.reason.min(10).max(1000)` and `ApproveBipSchema.note.max(500)` enforced at the schema layer; 6 boundary tests.       |
| T-03-05   | mitigate    | `bsh_insert_admin` accepts a regular admin JWT via `auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'`. `createAdminClient` NOT used. |
| T-03-07   | mitigate    | No UPDATE or DELETE policies on `bip_status_history`; FKs to `bips` and `profiles` use `ON DELETE SET NULL`.                          |

T-03-01 (spoofing — `getClaims()` enforcement) and T-03-EC (compliance disclaimer) remain `accept-deferred` to Plan 03-02 per the threat-model section.

## Known Stubs

None for this plan. The 17 `it.todo` placeholders remaining in `tests/email/send.test.ts` and `tests/email/templates.test.ts` belong to Plan 03-05's email-send slice and were intentionally left as scaffolding by Plan 03-00 — they are not stubs in production code paths.

## Threat Flags

None introduced. The new audit-log surface is fully covered by the threat model (T-03-05, T-03-07).

## Self-Check: PASSED

Verified after writing this SUMMARY:

- `supabase/migrations/00010_bip_status_history.sql` — FOUND
- `supabase/migrations/00011_bips_update_own_editable.sql` — FOUND
- `lib/utils/status-transitions.ts` — FOUND
- `lib/schemas/admin-bips.ts` — FOUND
- `lib/supabase/database.types.ts` — FOUND (contains 3 grep matches for `bip_status_history`)
- Commit `77758e2` — FOUND in `git log`
- Commit `da87013` — FOUND in `git log`
- Commit `90c751b` — FOUND in `git log`
- `npx tsc --noEmit` — exit 0
- `npx next lint` — exit 0, no warnings
- `npx vitest run` — 20 passed (2 files passed, 2 stub files skipped for downstream plans)
- `npx supabase db reset` — applied migrations 00001..00011 with zero errors
