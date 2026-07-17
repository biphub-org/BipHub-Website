# Known Bugs

Tracked defects awaiting a dedicated fix. Each entry: symptom → root cause (with
evidence) → proposed fix → affected tests.

---

## BUG-001 — Coordinator cannot submit an edit for an approved BIP (edit wizard trapped on Step 1)

**Status:** open · **Severity:** high (core Phase 8 feature non-functional) · **Found:** 2026-07-17

### Symptom
A coordinator opening `/dashboard/bips/[id]/edit` for one of their **approved**
(live) BIPs lands on Step 1 of the edit wizard (State A, "Submit Edit for
Review"). Clicking **"Save & continue →"** opens the two-tab **conflict dialog**
and a failed-save indicator; the wizard does **not** advance. Because the
"Submit Edit for Review" button lives on **Step 5** and the step-nav dots only
allow jumping *backward* to already-reached steps, the coordinator can never
reach Step 5 — the edit can never be submitted.

### Root cause (confirmed empirically)
`BipSubmissionWizard`'s `saveAndContinue` (coordinator mode) calls
`performSave` → `saveDraftAction`, which does an `UPDATE` on the live `bips`
row. The RLS policy `bips_update_own_editable`
(`supabase/migrations/00011_bips_update_own_editable.sql`) permits owner updates
only for `status in ('draft','pending','rejected')` — **not `approved`**. No
Phase 8 migration adds `approved`. So the UPDATE matches 0 rows, which
`saveDraftAction` returns as `{ error: 'conflict' }`; the wizard opens the
conflict dialog and refuses to advance.

Verified 2026-07-17 by driving the real coordinator flow against the cloud test
project: after "Save & continue" the conflict/reload dialog and the failed-save
indicator were both visible; the step did not advance.

Note the submit itself is fine: `submitEditAction(bipId, draft, partners)` reads
the **client-side Zustand draft** and inserts a `bip_edits` row — it does not
depend on the per-step saves. The bug is purely that forward navigation is
gated on a save that RLS forbids for approved BIPs.

### Why it wasn't caught
Phase 8 shipped "complete **pending** manual UAT" (see
`08-edit-approved-request-changes/08-UAT.md`); the UAT that would have exercised
this was deferred, and the `bip-edits` E2E spec was written Wave-0/TDD-style and
never ran green.

### Proposed fix (app change — do not just widen RLS)
Do **not** add `approved` to `bips_update_own_editable` — that would let
coordinators mutate the live public BIP directly, defeating the edit-review
model. Instead, for approved / changes_requested edits the wizard should
**suppress per-step `saveDraftAction`** and advance on the Zustand draft alone,
exactly as `mode='admin'` already does (`saveAndContinue` early-returns without
`performSave` when `mode==='admin'`). The edit page
(`app/(dashboard)/dashboard/bips/[id]/edit/page.tsx`) should pass a flag (a new
mode, or reuse the admin no-save path) so the approved-edit wizard advances
without touching the live row; the proposed content is written only by
`submitEditAction` on Step 5.

Check the sibling paths for the same wall while fixing: State C
(`resubmitEditAction`) and D-06a (`resubmitPendingBipAction`) — a
`changes_requested` BIP *is* in the editable policy, so State C/D-06a may
navigate fine, but confirm.

### Affected tests
`tests/e2e/bip-edits.spec.ts` — the entire serial `bip edit flow` describe is
marked `test.describe.fixme` pending this fix. The fixtures are ready:
`supabase/seed.e2e.sql` seeds the approved edit-target BIP owned by the
coordinator with **no** pre-seeded pending edit (so EDIT-01 starts in State A and
creates the edit itself). Once the feature is fixed, rewrite EDIT-01 to drive the
wizard Step 1 → Step 5 ("Save & continue" ×4, then "Submit Edit for Review") and
un-fixme the describe.
