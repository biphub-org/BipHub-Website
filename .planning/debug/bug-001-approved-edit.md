---
status: verified
trigger: "systematic fix for the approved-edit wizard (BUG-001)"
created: 2026-07-17
updated: 2026-07-26
verified_by: "E2E — all 11 tests/e2e/bip-edits.spec.ts tests green against the cloud test project (see Resolution > verification); KNOWN-BUGS.md BUG-001 marked resolved in 9bcccc7"
verified_note: "Flipped from awaiting_human_verify during 2026-07-26 pre-parallel-split cleanup. The fix was already test-proven on 2026-07-17; only this session file lagged. Open blind spot from the original investigation, deliberately NOT claimed as verified: the SIGNED_OUT -> localStorage recovery path under coordinator editMode was reasoned about but never driven end-to-end in a browser."
---

## Current Focus
<!-- OVERWRITE on each update - reflects NOW -->

reasoning_checkpoint:
  hypothesis: "Coordinator-mode saveAndContinue always calls performSave→saveDraftAction (status-preserving UPDATE on the live bips row) before advancing; RLS has no owner UPDATE policy that permits a status-preserving UPDATE while status stays approved or changes_requested, so the UPDATE matches 0 rows → conflict → the wizard cannot advance past Step 1 for edit-states A/C/D-06a, making the Step-5 submit CTA unreachable."
  confirming_evidence:
    - "Source read of BipSubmissionWizard.tsx lines 257-265: saveAndContinue only skips performSave when mode==='admin'; coordinator mode always awaits performSave and only advances on result.ok."
    - "Source read of lib/actions/bip-draft.ts saveDraftAction (lines 72-91): UPDATE never sets status, filters .eq('id')/.eq('created_by')/.eq('updated_at', lastKnownUpdatedAt); 0 matched rows -> maybeSingle() null -> { error: 'conflict' }."
    - "Source read of migrations 00011/00012/00018: no UPDATE policy permits a status-preserving owner UPDATE for approved; the only changes_requested policy forces post-image to pending (WITH CHECK status='pending'), so status-preserving UPDATE on a changes_requested row also fails WITH CHECK."
    - "Live repro against cloud test project zbvcpiwbopmfbjfhzprw (2026-07-17): as e2e-coordinator on the approved fixture BIP, Save & continue on Step 1 opens the two-tab conflict dialog and the wizard stays on Step 1."
  falsification_test: "If saveAndContinue advanced past Step 1 for the approved fixture BIP while per-step saveDraftAction was still being called (i.e. RLS actually permitted the UPDATE), the hypothesis would be false. It does not — repro confirms the conflict every time on Step 1 for State A, and source-level RLS policy read confirms 0 matching UPDATE policies for approved/changes_requested-preserving cases."
  fix_rationale: "The Step-5 actions (submitEditAction/resubmitEditAction/resubmitPendingBipAction) already write all content from the Zustand draft independent of per-step saveDraftAction — the per-step save is therefore never required for edit-states, only harmful (RLS-forbidden AND semantically wrong, since it would mutate the live public row before admin approval). Suppressing per-step save for the whole edit-states branch (mirroring the existing mode==='admin' no-save path) addresses the root cause directly: it removes the forbidden/unnecessary UPDATE rather than papering over the conflict dialog or widening RLS (which was explicitly rejected — see Eliminated)."
  blind_spots: "Have not yet driven State C and D-06a end-to-end through the live UI (only source-level RLS analysis + State A live repro); have not yet verified the SaveStatusIndicator/SIGNED_OUT recovery behavior is still sensible once per-step save is suppressed for coordinator edit-mode (as opposed to admin mode, which also disables SIGNED_OUT->localStorage persistence — edit-mode should probably KEEP that recovery since there's still an in-progress draft to protect, but this needs a deliberate decision, not silent inheritance of every admin-mode branch)."

hypothesis: The coordinator edit wizard is trapped on Step 1 for any BIP whose live `bips` row is NOT in {draft,pending,rejected}, because `saveAndContinue` (coordinator mode) always runs `performSave` → `saveDraftAction`, which issues a status-preserving UPDATE on the live row that RLS matches to 0 rows → `{ error: 'conflict' }` → wizard opens the two-tab dialog and refuses to advance. This affects State A (approved), State C (approved live row + changes_requested edit), AND D-06a (changes_requested live row) — NOT just approved as originally scoped in KNOWN-BUGS.md.
test: Drive the real coordinator flow against the cloud test project for each state; confirm 0-row UPDATE / conflict dialog; then confirm suppressing per-step save (advance on Zustand draft, like mode==='admin') lets the wizard reach Step 5 and `submitEditAction`/`resubmitEditAction`/`resubmitPendingBipAction` write the content.
expecting: With per-step save suppressed for edit-states, "Save & continue" advances Step 1→5 without touching the live row; Step 5 CTA submits; no conflict dialog appears.
next_action: DONE. Fix applied + verified (see Resolution). Awaiting human confirmation that the approved-BIP edit flow works end-to-end in the real coordinator UI before archiving this session.

## Symptoms
<!-- Written during gathering, then IMMUTABLE -->

expected: A coordinator opening `/dashboard/bips/[id]/edit` for one of their approved (live) BIPs can fill fields and advance through the wizard (Step 1 → Step 5) and click "Submit Edit for Review" on Step 5 to create a `bip_edits` row.
actual: The wizard lands on Step 1 (State A "Submit Edit for Review"). Clicking "Save & continue →" opens the two-tab conflict dialog and shows a failed-save indicator; the wizard does NOT advance. The "Submit Edit for Review" button lives on Step 5, and step-nav dots only allow jumping backward to already-reached steps, so the coordinator can never reach Step 5 — the edit can never be submitted.
errors: No thrown error surfaced to the user. `saveDraftAction` returns `{ error: 'conflict' }` (0 rows matched the optimistic-lock UPDATE); the wizard maps this to `setSaveStatus('failed')` + `setConflictOpen(true)`.
reproduction: As e2e-coordinator (owner of an approved BIP), go to `/dashboard/bips/{approvedBipId}/edit`, edit the title, click "Save & continue →". Observe conflict/reload dialog + failed-save indicator; step stays on 1. (Verified 2026-07-17 against cloud test project zbvcpiwbopmfbjfhzprw.)
started: Present since Phase 8 (Edit-Approved + Request-Changes) shipped. Never worked — the `bip-edits` E2E spec was authored Wave-0/TDD-style (RED) and never ran green; the manual UAT that would have caught it was deferred.

## Eliminated
<!-- APPEND only - prevents re-investigating -->

- hypothesis: The submit action itself (`submitEditAction`) is broken.
  evidence: `submitEditAction(bipId, draft, partners)` reads the client-side Zustand draft and inserts a `bip_edits` row; it does not depend on per-step `saveDraftAction`. The block is purely forward navigation, which is gated on a save RLS forbids. (Source read + KNOWN-BUGS.md confirmation.)
  timestamp: 2026-07-17

- hypothesis: Fix by widening RLS to allow owner UPDATE on `approved` BIPs.
  evidence: Rejected by design — that would let coordinators mutate the live public BIP directly, defeating the edit-review model (EDIT-02 guarantee: public page stays live/unchanged until admin approves). The correct fix is app-side (suppress per-step save for edit-states), not an RLS widening.
  timestamp: 2026-07-17

## Evidence
<!-- APPEND only - facts discovered -->

- timestamp: 2026-07-17
  checked: components/forms/BipSubmissionWizard.tsx `saveAndContinue` (lines 257-265) and `performSave`/`debouncedAutoSave`.
  found: `saveAndContinue` early-returns after `mergeDraft` + `handleStepChange` ONLY when `mode === 'admin'`. In coordinator mode it always awaits `performSave({ ...draft, ...stepData })` and advances only if `result.ok`. `performSave` → `saveDraftAction`; on `{ error: 'conflict' }` it sets saveStatus='failed' and opens the conflict dialog. The 1.5s `debouncedAutoSave` is also suppressed only for admin mode.
  implication: The existing admin no-save path is exactly the behavior approved-edit coordinator sessions need. Reusing it (via a new mode/flag) is the minimal fix.

- timestamp: 2026-07-17
  checked: lib/actions/bip-draft.ts `saveDraftAction` UPDATE branch (lines 72-91).
  found: The UPDATE sets `{ ...persistable, updated_at }` and filters `.eq('id')`, `.eq('created_by')`, `.eq('updated_at', lastKnownUpdatedAt)`. It NEVER sets `status` — the update is status-preserving. `.maybeSingle()` returns null when 0 rows match → `{ error: 'conflict' }`.
  implication: Because status is preserved, RLS is evaluated against the row's CURRENT status. Any edit-state whose current status is not permitted by a matching UPDATE policy WITH CHECK matches 0 rows.

- timestamp: 2026-07-17
  checked: supabase/migrations/00011_bips_update_own_editable.sql, 00012_bips_update_to_pending.sql, 00018_bips_changes_requested.sql (all coordinator UPDATE policies on `bips`).
  found: (1) `bips_update_own_editable` — USING status in (draft,pending,rejected), WITH CHECK status='draft'. (2) `bips_update_own_to_pending` — draft→pending. (3) `bips_update_own_changes_requested_to_pending` — USING status='changes_requested', WITH CHECK status='pending'. No policy permits a status-preserving owner UPDATE of an `approved` row, and none permits a status-preserving UPDATE of a `changes_requested` row (the only changes_requested policy forces post-image='pending').
  implication: State A (bips=approved) → 0 rows → conflict. State C (bips=approved, edit=changes_requested; the LIVE row is still approved) → 0 rows → conflict (KNOWN-BUGS.md hypothesised this "may navigate fine" — that is WRONG). D-06a (bips=changes_requested) → status-preserving UPDATE post-image=changes_requested fails the WITH CHECK (requires 'pending') → 0 rows → conflict TOO. Only draft/pending/rejected (the normal new-submission flow) survive.

- timestamp: 2026-07-17
  checked: app/(dashboard)/dashboard/bips/[id]/edit/page.tsx edit-states branch (lines 51-137) and Step 5 CTAs.
  found: The branch `record.status === 'approved' || 'changes_requested'` handles States A/B/C/D-06a. Each renders `<WizardStep5EditPreview editState=...>` whose CTA calls a dedicated Step-5 action (submitEditAction / resubmitEditAction / resubmitPendingBipAction) reading the Zustand draft — none of which need the per-step `saveDraftAction`. State B is disabled ("Edit in review"). `omitSlug={record.status === 'approved'}` is already passed here.
  implication: For the WHOLE edit-states branch, per-step `saveDraftAction` is both RLS-forbidden (A/C/D-06a) and semantically wrong (we must not mutate the live/returned row — content flows through the Step-5 action). The fix should suppress per-step save for the entire edit-states branch, mirroring admin mode, not just for `approved`.

- timestamp: 2026-07-17
  checked: tests/e2e/bip-edits.spec.ts.
  found: The entire serial `bip edit flow` describe is `test.describe.fixme` (BUG-001). Fixtures are ready: seed.e2e.sql seeds the approved edit-target BIP (id e2e0bbbb-…-000000000010, slug e2e-edit-target-bip) owned by the coordinator with NO pre-seeded pending edit, so EDIT-01 starts in State A.
  implication: Verification of the fix = un-fixme the describe and rewrite EDIT-01 to drive the wizard Step 1 → Step 5 ("Save & continue" ×4, then "Submit Edit for Review"), then get the spec green against the cloud test project. This is the test-provable proof the user requires.

## Resolution
<!-- OVERWRITE as understanding evolves -->

root_cause: Coordinator-mode `saveAndContinue` in BipSubmissionWizard always performs a per-step `saveDraftAction` (status-preserving UPDATE on the live `bips` row) before advancing; RLS permits owner UPDATEs only for draft/pending/rejected (and changes_requested only when transitioning to pending), so for every edit-state (approved / approved+changes_requested-edit / changes_requested) the UPDATE matches 0 rows → conflict → the wizard refuses to advance past Step 1, and the Step-5 submit CTA is unreachable.

fix: Added an `editMode` prop to `BipSubmissionWizard` (components/forms/BipSubmissionWizard.tsx). When true, `saveAndContinue` advances on the merged Zustand draft alone (same no-save path as `mode === 'admin'`) and the 1.5s debounced auto-save is suppressed — no per-step `saveDraftAction` UPDATE is ever issued for edit-states. Unlike `mode === 'admin'`, coordinator-only concerns are preserved: no admin banner, and the SIGNED_OUT → localStorage recovery path stays active. The SaveStatusIndicator is hidden in editMode (rendered as a blank placeholder, matching the admin-mode slot) since there's no per-step save to report on or retry — content is written exclusively by the Step-5 action (submitEditAction / resubmitEditAction / resubmitPendingBipAction), which already reads the Zustand draft directly. `app/(dashboard)/dashboard/bips/[id]/edit/page.tsx` passes `editMode` unconditionally in the edit-states branch (covers A/B/C/D-06a).

  Also fixed two pre-existing, never-run defects surfaced while getting tests/e2e/bip-edits.spec.ts green (both were `test.describe.fixme`d before this session, so they'd never actually executed against the app):
  - AdminActionsPanel's "Approve Edit" is a single-click direct action (no confirmation modal, unlike Reject/Request Changes) — the test wrongly assumed a two-step modal and hung waiting for a nonexistent second button.
  - `page.waitForURL(/\/admin/, ...)` (4 call sites) is unanchored and falsely matches the CURRENT review-page URL (`/admin/bip-edits/{id}/review` contains the substring "/admin"), letting the test race ahead of the server action's actual redirect. Anchored to `/\/admin\/?(?:\?.*)?$/` in all 4 places. This was the direct cause of an EDIT-06b audit-row read racing ahead of `requestChangesEditAction`'s write.
  - `new RegExp(E2E_BIP_EDIT_TITLE, 'i')` in the EDIT-04 assertion mis-parsed the title's literal `[EDIT]` prefix as a regex character class; changed to a plain string (Playwright substring-matches string args against accessible name).

verification: Rebuilt (`npm run build && npm run start`, killing the stale pre-fix server on :3000 first — critical, since Playwright's `reuseExistingServer` silently reused a stale build on the first attempt) and ran the full un-fixme'd `tests/e2e/bip-edits.spec.ts` (all 11 tests, EDIT-01 through EDIT-09) against the cloud test project (zbvcpiwbopmfbjfhzprw) — **all 11 passed**, including EDIT-01 (State A: submit edit through Step 1→5), EDIT-04 (admin approves → merged content live), EDIT-05 (admin rejects → live unchanged), and EDIT-06b (admin requests changes on an approved-BIP edit). Also reran `submission.spec.ts` + `resubmit.spec.ts` (coordinator-authed, 4 tests) and `admin-review.spec.ts` (admin-authed, 3 tests) — all pass, confirming no regression to the normal new-submission wizard, the rejected→draft resubmit flow, the admin `mode="admin"` edit page, or the admin approve/reject-BIP flow. `npx tsc --noEmit` clean throughout. The `e2e-edit-target-bip` fixture (id e2e0bbbb-bbbb-bbbb-bbbb-000000000010) was restored to its canonical seeded state (title "E2E Edit Target BIP", status approved, no bip_edits rows) after verification.

files_changed:
  - components/forms/BipSubmissionWizard.tsx (added `editMode` prop; gated saveAndContinue, debouncedAutoSave, and the SaveStatusIndicator slot on `mode === 'admin' || editMode`)
  - app/(dashboard)/dashboard/bips/[id]/edit/page.tsx (pass `editMode` to BipSubmissionWizard for the whole edit-states branch; docstring update)
  - tests/e2e/bip-edits.spec.ts (un-fixme'd the suite; added `driveEditWizardToStep5()` helper and used it in EDIT-01/EDIT-05/EDIT-06b instead of assuming a Step-1-only submit CTA; fixed the Approve Edit single-click assumption, the 4 unanchored `waitForURL(/\/admin/)` races, and the `[EDIT]` regex-metacharacter bug in EDIT-04)
