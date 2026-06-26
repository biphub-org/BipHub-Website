---
phase: 08-edit-approved-request-changes
plan: 05
subsystem: server-actions
tags: [edit-workflow, coordinator-actions, admin-verdicts, server-actions, audit-log, email, ISR]
dependency_graph:
  requires: [08-03, 08-04]
  provides: [coordinator-submit-edit, coordinator-resubmit-edit, coordinator-resubmit-pending-bip, admin-approve-edit, admin-reject-edit, admin-request-changes-edit, admin-request-changes-bip]
  affects: [bip_edits, bips, bip_status_history, bip_partner_universities, ISR-cache, email-coordinator]
tech_stack:
  added: []
  patterns: [9-step-server-action, getClaims-auth, role-guard, defense-in-depth-read, Zod-server-revalidation, explicit-audit-log, fire-and-forget-email, revalidatePath-ISR]
key_files:
  created:
    - lib/actions/bip-edits.ts
    - lib/actions/admin-edit-bips.ts
  modified: []
decisions:
  - "Rule 1 deviation: used raw array for partner_institutions JSONB insert instead of JSON.stringify(partners) — passing a serialized string to a JSONB column results in a JSONB text value (not array) which mapPartnerInstitutions cannot parse; raw array is the correct Supabase JS client behavior"
  - "requestChangesEditAction status guard set to status==='pending' only (not pending|changes_requested) per 08-08 canRequestChanges button gate — consistent UX prevents error-toast-vs-disabled-button mismatch"
  - "Partner reconciliation in approveEditAction reads editRow.partner_institutions as Array.isArray check — matches mapPartnerInstitutions expectation"
metrics:
  duration: 42s
  completed: 2026-06-26
  tasks_completed: 2
  files_changed: 2
---

# Phase 8 Plan 05: Coordinator + Admin Edit Server Actions Summary

Implemented the behavioural core of the Phase 8 edit workflow: two Server Action modules providing the full EDIT-01/04/05/06/07/08/09 surface via the proven 9-step getClaims → role/ownership → Zod → read → transition check → write → audit → revalidate → email → redirect pattern.

## What Was Built

### `lib/actions/bip-edits.ts` — Coordinator Actions

Three coordinator-facing Server Actions:

**`submitEditAction(bipId, draft, partners)`** — EDIT-01 implementation.
- getClaims() + role∈{coordinator,admin} guard
- Defense-in-depth read: ownership (`created_by === userId`) AND `bips.status === 'approved'`
- One-open-edit application-layer guard (D-03): rejects if a pending|changes_requested edit already exists for the BIP
- fullBipSchema server re-validation
- INSERT bip_edits with 22 content columns; slug intentionally excluded (EDIT-09/D-10)
- No revalidatePath — public page deliberately unchanged until admin approves (D-01/EDIT-02)
- Returns `{ success: true, editId }` — trigger 00019 logs 'submit_edit' automatically

**`resubmitEditAction(editId, draft, partners)`** — D-05 same-row resubmit.
- Ownership guard + fullBipSchema re-validation
- UPDATE bip_edits: content fields + status='pending' + partner_institutions in one call
- `.eq('status', 'changes_requested')` idempotency guard
- No revalidatePath; trigger 00019 logs 'resubmit_edit'

**`resubmitPendingBipAction(bipId, draft, partners)`** — D-06a BLOCKER fix.
- Ownership guard + `bips.status === 'changes_requested'` check
- Single UPDATE on bips: all 22 editable columns + `status: 'pending'` together — this is the critical fix; a status-only update would discard coordinator content edits
- Passes `bips_update_own_changes_requested_to_pending` RLS (WITH CHECK requires only post-image status='pending')
- Delete-then-insert partner reconciliation via `bip_partner_universities`
- Slug excluded from payload; 00018 trigger handles 'resubmit' audit row

### `lib/actions/admin-edit-bips.ts` — Admin Verdict Actions

Four admin verdict Server Actions, all guarding `role !== 'admin'`:

**`approveEditAction(editId)`** — EDIT-04 merge + ISR bust.
- Guards `editRow.status === 'pending'`
- UPDATE bips: 22 content columns (slug OMITTED, status OMITTED — bips stays 'approved')
- UPDATE bip_edits: status → 'approved'
- Partner reconciliation: parse partner_institutions JSONB array → delete/re-insert bip_partner_universities
- Explicit audit: action_kind='approve_edit', note=null
- `revalidatePath(/bip/${slug})` + `revalidatePath('/bips')` + `revalidatePath('/admin')` (D-13)
- Fire-and-forget edit-approved email
- `redirect('/admin')`

**`rejectEditAction(editId, note)`** — EDIT-05 no-touch.
- Guards `editRow.status in ('pending','changes_requested')`
- UPDATE bip_edits only — bips content stays unchanged (SC4)
- Audit: action_kind='reject_edit', note stored
- NO revalidatePath (live BIP unchanged)
- edit-rejected email with admin note
- `redirect('/admin')`

**`requestChangesEditAction(editId, note)`** — EDIT-06 edit path.
- Guards `editRow.status === 'pending'` (matches 08-08 AdminActionsPanel canRequestChanges gate — prevents error-toast vs disabled-button mismatch)
- UPDATE bip_edits: status='changes_requested', admin_note written to row (D-04)
- Audit: action_kind='request_changes', note in history
- edit-changes-requested email
- `redirect('/admin')`

**`requestChangesBipAction(bipId, note)`** — D-06a new-submission path.
- `validateTransition(bip.status, 'changes_requested', 'admin')` state machine guard
- UPDATE bips: status='changes_requested'
- Explicit audit row: action_kind='request_changes', note lives in bip_status_history (Option A — retrievable via getLatestChangesRequest)
- 00018 trigger returns early for this transition — this action is the sole audit writer (no double-log)
- edit-changes-requested email (reusing same template as edit path)
- `redirect('/admin')`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] partner_institutions stored as raw array, not JSON.stringify(partners)**
- **Found during:** Task 1 implementation
- **Issue:** Plan's `partner_institutions: JSON.stringify(partners)` would pass a JavaScript string to a JSONB column. Via Supabase JS PostgREST, the string value would be stored as a JSONB text type (not array). `mapPartnerInstitutions` in `bipEdits.ts` checks `Array.isArray(raw)` and returns `[]` for non-array values — partner data would be silently lost on every edit submission.
- **Fix:** Passed `partners` (raw array) directly. Supabase JS client serializes JS arrays to JSON arrays correctly for JSONB columns. Reading back returns a parsed JS array, which `mapPartnerInstitutions` handles correctly.
- **Files modified:** `lib/actions/bip-edits.ts`
- **Commit:** 344f931

## Known Stubs

None. Both files wire real data to real DB operations.

## Self-Check: PASSED

- `lib/actions/bip-edits.ts` created: yes (344f931)
- `lib/actions/admin-edit-bips.ts` created: yes (c79cd7d)
- `tsc --noEmit`: clean (no errors)
- `submitEditAction`, `resubmitEditAction`, `resubmitPendingBipAction` all present
- `approveEditAction`, `rejectEditAction`, `requestChangesEditAction`, `requestChangesBipAction` all present
- `getClaims()` used; `getSession()` not called
- Slug not in any INSERT/UPDATE payload in either file
- `revalidatePath` only in `approveEditAction` (three calls: /bip/${slug}, /bips, /admin)
- No `revalidatePath` calls in `bip-edits.ts`
- `action_kind`: 'approve_edit', 'reject_edit', 'request_changes' all present
- `requestChangesEditAction` guards `status === 'pending'`
- `rejectEditAction` does NOT update bips, does NOT call revalidatePath
- `role !== 'admin'` guard in all four admin actions
