---
phase: 08-edit-approved-request-changes
verified: 2026-06-26T14:45:00Z
status: human_needed
score: 6/6 must-haves verified
overrides_applied: 0
human_verification:
  - test: "ISR perceptual timing (EDIT-04): After approving an edit as admin, reload /bip/[slug] and confirm merged content appears within a few seconds"
    expected: "New title/content visible on the public BIP page without a hard cache bypass"
    why_human: "'Within seconds' is a wall-clock timing claim; Playwright asserts content changed but not latency"
  - test: "Resend live email delivery (EDIT-07): With RESEND_API_KEY set, approve an edit and confirm the coordinator inbox receives 'Your BIP edit is live' with a working BIP link; reject an edit with a note and confirm the rejection email arrives with the note embedded"
    expected: "All three edit-outcome emails (approved/rejected/changes-requested) arrive in coordinator inbox with note embedded"
    why_human: "playwright.config.ts deliberately blanks RESEND_API_KEY to force D-15 console fallback; real delivery cannot be asserted in headless E2E"
  - test: "Full bip-edits.spec.ts E2E suite (all 8 tests covering EDIT-01..09): run against local Supabase or a dedicated test cloud project"
    expected: "All 8 serial tests pass: submit edit, public page unchanged, diff view, approve edit, reject edit, request changes new submission, request changes edit, slug immutable"
    why_human: "playwright.config.ts safety guard explicitly refuses to run the suite against the production cloud ref (zbvcpiwbopmfbjfhzprw) to prevent seed data pollution"
---

# Phase 8: Edit-Approved + Request-Changes Verification Report

**Phase Goal:** Coordinators can submit edits to already-approved BIPs that go through admin re-review — the live BIP stays fully public throughout — and admins have a third moderation state ("request changes") in addition to approve and reject, with every action recorded in the audit log

**Verified:** 2026-06-26T14:45:00Z
**Status:** human_needed (all code verified; 3 manual UAT items cannot be asserted programmatically)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                                                              | Status     | Evidence                                                                                                                                              |
|----|------------------------------------------------------------------------------------------------------------------------------------|------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1  | SC1: Coordinator submits edit → `bip_edits` pending row; public `/bip/[slug]` unchanged                                           | ✓ VERIFIED | `submitEditAction` in `lib/actions/bip-edits.ts` inserts to `bip_edits`, zero `revalidatePath` calls; `bips_select_approved_public` policy untouched in `00001` |
| 2  | SC2: Admin sees Edit-badged pending item + all-fields diff view                                                                    | ✓ VERIFIED | `BipEditDiffView.tsx` (22 fields, gold highlight); `AdminBipCard` renders `EDIT_BADGE_CLASSES` literal when `kind==='edit'`; `/admin/page.tsx` uses `Promise.all([getAdminPendingSubmissions(), getAdminPendingEdits()])` |
| 3  | SC3: Approve → merged content live (ISR); `bip_status_history` gains `edit_approved` row                                          | ✓ VERIFIED | `approveEditAction` updates all 22 content columns (slug/status omitted), calls `revalidatePath` × 3; explicit audit INSERT with `action_kind: 'approve_edit'` at line 253 of `admin-edit-bips.ts`; ISR perceptual timing deferred to manual UAT |
| 4  | SC4: Reject → live BIP unchanged; coordinator emailed; `reject_edit` audit row                                                    | ✓ VERIFIED | `rejectEditAction` updates `bip_edits` only — no `bips` mutation, no `revalidatePath` (confirmed at line 367); `edit-rejected` email fires; `action_kind: 'reject_edit'` at line 361 |
| 5  | SC5: Request changes → coordinator sees `changes_requested` state + admin note; can revise and resubmit (D-06a content-preserving) | ✓ VERIFIED | `requestChangesEditAction` + `requestChangesBipAction` implemented; `EditStatusCallout` State C renders gold-border callout + `{adminNote}` text; `resubmitPendingBipAction` passes full `(bipId, draft, partners)` payload (not status-only) |
| 6  | SC6: Slug cannot change through edit flow (form omits it; merge action enforces immutability)                                      | ✓ VERIFIED | No slug column in `00017_bip_edits.sql`; `buildContentPayload` and `buildMergePayload` explicitly exclude slug (comment "intentionally omitted"); `omitSlug={record.status === 'approved'}` passed to `BipSubmissionWizard` |

**Score:** 6/6 truths verified

---

### Required Artifacts

| Artifact                                                        | Expected                                   | Status     | Details                                          |
|-----------------------------------------------------------------|--------------------------------------------|------------|--------------------------------------------------|
| `supabase/migrations/00017_bip_edits.sql`                       | bip_edits table + 5 RLS policies + D-03 partial unique index | ✓ VERIFIED | 125 lines; 5 named policies all with USING + WITH CHECK; partial unique index `bip_edits_one_open_per_bip`; ENABLE ROW LEVEL SECURITY; FK CASCADE to auth.users (FOUN-09) |
| `supabase/migrations/00018_bips_changes_requested.sql`          | bips.status extended + coordinator resubmit policy | ✓ VERIFIED | 92 lines; `'changes_requested'` added to CHECK; `bips_update_own_changes_requested_to_pending` policy with USING + WITH CHECK; trigger extended for new transitions |
| `supabase/migrations/00019_bip_status_history_edit_kinds.sql`   | 5 new action_kinds + SECURITY DEFINER trigger on bip_edits | ✓ VERIFIED | 87 lines; action_kind CHECK extended with `submit_edit`, `resubmit_edit`, `approve_edit`, `reject_edit`, `request_changes`; SECURITY DEFINER `log_bip_edit_status_change` trigger; REVOKE EXECUTE on function |
| `lib/actions/bip-edits.ts`                                      | Coordinator submit/resubmit/D-06a actions  | ✓ VERIFIED | 13644 bytes; `submitEditAction`, `resubmitEditAction`, `resubmitPendingBipAction`; all use `getClaims()`; slug excluded from every payload |
| `lib/actions/admin-edit-bips.ts`                                | Admin approve/reject/request-changes actions | ✓ VERIFIED | 22680 bytes; `approveEditAction`, `rejectEditAction`, `requestChangesEditAction`, `requestChangesBipAction`; all use `getClaims()`; all guard `role !== 'admin'` |
| `lib/queries/bipEdits.ts`                                       | 5 query functions + 2 exported types       | ✓ VERIFIED | 14824 bytes; `getOpenEditForBip`, `getBipEditById`, `getAdminPendingSubmissions`, `getAdminPendingEdits`, `getLatestChangesRequest` all present |
| `lib/queries/coordinatorBipById.ts`                             | Extended to handle approved/changes_requested + openEdit | ✓ VERIFIED | Status whitelist includes `approved` and `changes_requested`; `openEdit` sub-object populated |
| `lib/schemas/bip-edits.ts`                                      | 4 Zod v3 schemas                           | ✓ VERIFIED | `ApproveEditSchema`, `RejectEditSchema`, `RequestChangesEditSchema`, `RequestChangesBipSchema` — all present |
| `lib/email/templates/EditApprovalEmail.tsx`                     | Edit approval email with BIP link          | ✓ VERIFIED | 3916 bytes; EC disclaimer present ("Independent project — not affiliated with the European Commission") |
| `lib/email/templates/EditRejectionEmail.tsx`                    | Edit rejection email with admin note       | ✓ VERIFIED | 5224 bytes; EC disclaimer present; admin note embedded |
| `lib/email/templates/EditChangesRequestedEmail.tsx`             | Changes-requested email with admin note    | ✓ VERIFIED | 5213 bytes; EC disclaimer present; admin note embedded |
| `lib/email/send.ts`                                             | EmailPayload union extended with 3 edit variants | ✓ VERIFIED | 3 variants in union: `edit-approved`, `edit-rejected`, `edit-changes-requested`; exhaustive switch covers all |
| `lib/utils/status.ts`                                           | `changes_requested` in BipStatus union + badge class | ✓ VERIFIED | `BipStatus` union includes `'changes_requested'`; `STATUS_BADGE_CLASSES` has literal class string for `changes_requested` (no template literals) |
| `components/admin/BipEditDiffView.tsx`                          | All-fields side-by-side diff (D-07)        | ✓ VERIFIED | 11739 bytes; 22 editable fields; gold highlight on changed rows; JSON.stringify change detection; no `dangerouslySetInnerHTML` |
| `components/admin/AdminActionsPanel.tsx`                        | Three-button verdict panel with Request Changes | ✓ VERIFIED | `isEdit` + `editId` props; "Request Changes" button; `canRequestChanges = currentStatus === 'pending'`; `approveEditAction` called directly via `useTransition` |
| `components/admin/RequestChangesBipModal.tsx`                   | Amber note modal (both submission + edit modes) | ✓ VERIFIED | 9853 bytes; `isEdit=false` uses `RequestChangesBipSchema` + `requestChangesBipAction`; `isEdit=true` uses `RequestChangesEditSchema` + `requestChangesEditAction` |
| `components/admin/AdminBipCard.tsx`                             | Edit badge + reviewHref prop               | ✓ VERIFIED | `EDIT_BADGE_CLASSES` const literal; `kind === 'edit'` renders badge; `reviewHref` prop for edit review URL |
| `components/dashboard/EditStatusCallout.tsx`                    | 3-state coordinator banner (A/B/C)         | ✓ VERIFIED | 2594 bytes; all three states implemented; `{adminNote}` rendered as React text (no `dangerouslySetInnerHTML`) |
| `app/(admin)/admin/bip-edits/[editId]/review/page.tsx`          | Admin edit review route                    | ✓ VERIFIED | 109 lines; `force-dynamic`; `getBipEditById` role-gated; renders `BipEditDiffView` + `AdminActionsPanel(isEdit=true)` |
| `app/(dashboard)/dashboard/bips/[id]/edit/page.tsx`             | Coordinator edit form with States A/B/C/D-06a | ✓ VERIFIED | 4-branch state machine; `EditStatusCallout` above wizard; `omitSlug={record.status === 'approved'}` |
| `tests/e2e/bip-edits.spec.ts`                                   | 8 serial E2E tests covering EDIT-01..EDIT-09 | ✓ VERIFIED | 498 lines; 8 tests confirmed by `grep -c "test(" = 8`; tests named to match VALIDATION.md grep keys; blocked from running against prod by playwright.config.ts safety guard |
| `app/(admin)/admin/page.tsx`                                     | Unified queue consuming both submissions + edits | ✓ VERIFIED | `Promise.all([getAdminPendingSubmissions(), getAdminPendingEdits()])`; Edit items routed to `/admin/bip-edits/${editId}/review` |

---

### Key Link Verification

| From                              | To                                   | Via                                                      | Status     | Details                                                          |
|-----------------------------------|--------------------------------------|----------------------------------------------------------|------------|------------------------------------------------------------------|
| `editPage` (coordinator)          | `submitEditAction`                   | `WizardStep5EditPreview` State A CTA                     | ✓ WIRED    | State A calls `submitEditAction(bipId, draft, partners)` |
| `editPage` (coordinator)          | `resubmitEditAction`                 | `WizardStep5EditPreview` State C CTA                     | ✓ WIRED    | State C calls `resubmitEditAction(editId, draft, partners)` |
| `editPage` (coordinator D-06a)    | `resubmitPendingBipAction`           | `WizardStep5EditPreview` d06a CTA                        | ✓ WIRED    | d06a passes full `(bipId, draft, partners)` — content-preserving |
| `AdminActionsPanel` (edit mode)   | `approveEditAction`                  | `useTransition` direct call                              | ✓ WIRED    | `approveEditAction(editId)` called directly (no modal needed) |
| `RejectBipModal` (isEdit=true)    | `rejectEditAction`                   | `editRejectForm` + `rejectEditAction(editId, note)`      | ✓ WIRED    | Dual-form hook pattern; edit branch wired separately from submission branch |
| `RequestChangesBipModal` (edit)   | `requestChangesEditAction`           | `isEdit=true` branch                                     | ✓ WIRED    | `requestChangesEditAction(editId, note)` |
| `RequestChangesBipModal` (submit) | `requestChangesBipAction`            | `isEdit=false` branch                                    | ✓ WIRED    | `requestChangesBipAction(bipId, note)` |
| `approveEditAction`               | `bips` (22 content columns)          | `buildMergePayload` → `supabase.from('bips').update()`   | ✓ WIRED    | Slug and status intentionally excluded from merge payload |
| `approveEditAction`               | ISR cache bust                       | `revalidatePath('/bip/${slug}')` + `/bips` + `/admin`    | ✓ WIRED    | Three `revalidatePath` calls only in `approveEditAction` |
| `approveEditAction`               | `bip_status_history`                 | Explicit INSERT `action_kind: 'approve_edit'`            | ✓ WIRED    | Line 253; trigger does NOT handle admin transitions (Option B) |
| `submitEditAction` (trigger)      | `bip_status_history`                 | SECURITY DEFINER `log_bip_edit_status_change` trigger    | ✓ WIRED    | Trigger fires on INSERT to `bip_edits`; writes `submit_edit` audit row |
| `resubmitEditAction` (trigger)    | `bip_status_history`                 | SECURITY DEFINER trigger (changes_requested → pending)   | ✓ WIRED    | Writes `resubmit_edit` audit row |
| `admin/page.tsx`                  | Edit review route                    | `reviewHref: /admin/bip-edits/${editId}/review`          | ✓ WIRED    | Edit items in unified queue link to the edit review route |
| `email/send.ts`                   | 3 Edit* email templates              | Exhaustive `switch` on `EmailPayload` union              | ✓ WIRED    | All 3 edit variants covered; compile-time exhaustiveness enforced |
| `bip_edits.created_by`            | `auth.users(id)` ON DELETE CASCADE   | FK in `00017_bip_edits.sql`                              | ✓ WIRED    | GDPR cascade wired directly to auth.users (not profiles per Pitfall 11) |

---

### Data-Flow Trace (Level 4)

| Artifact                        | Data Variable        | Source                                               | Produces Real Data | Status     |
|---------------------------------|----------------------|------------------------------------------------------|--------------------|------------|
| `BipEditDiffView.tsx`           | `liveBip`, `proposedEdit` | `getBipEditById` + `getAdminBipById` (DB queries)  | Yes                | ✓ FLOWING  |
| `EditStatusCallout.tsx`         | `status`, `adminNote` | `getCoordinatorBipById` + `getOpenEditForBip` (DB)  | Yes                | ✓ FLOWING  |
| `AdminBipCard.tsx` (edit items) | `bip`, `kind`        | `getAdminPendingEdits()` (two-query DB merge)        | Yes                | ✓ FLOWING  |
| `RequestChangesBipModal.tsx`    | `bipTitle`, `coordinatorName` | Props from admin review RSC (real DB data)     | Yes                | ✓ FLOWING  |

---

### Behavioral Spot-Checks

| Behavior                                              | Command                                                                                       | Result                                                       | Status  |
|-------------------------------------------------------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------|---------|
| Slug excluded from `bip_edits` table                  | `grep -c "slug" 00017_bip_edits.sql`                                                         | 0 matches (confirmed in migration file)                      | ✓ PASS  |
| Slug excluded from `buildMergePayload`                | `grep "slug" admin-edit-bips.ts` (in payload context)                                        | "slug intentionally omitted" comment only; not in payload    | ✓ PASS  |
| `revalidatePath` only in `approveEditAction`          | `grep "revalidatePath" bip-edits.ts` (coordinator file)                                      | 0 actual calls (comments only)                               | ✓ PASS  |
| `getClaims()` in all 7 new Server Actions             | `grep -c "getClaims" admin-edit-bips.ts bip-edits.ts`                                        | 4 calls in admin-edit-bips.ts, 3 in bip-edits.ts            | ✓ PASS  |
| No `createAdminClient` in Phase 8 server action files | `grep "createAdminClient" bip-edits.ts admin-edit-bips.ts`                                   | Comments only ("NEVER createAdminClient")                    | ✓ PASS  |
| EC disclaimer in all 3 edit email templates           | `grep -n "not affiliated" Edit*Email.tsx`                                                     | Line 136, 176, 175 respectively                              | ✓ PASS  |
| `published_snapshot` absent from all migrations       | `grep -r "published_snapshot" supabase/migrations/`                                          | No matches in migration files (only planning docs)           | ✓ PASS  |
| `pending_edit` status absent from all migrations      | `grep -r "pending_edit" supabase/migrations/`                                                | No matches                                                   | ✓ PASS  |
| E2E spec covers all EDIT requirements                 | `grep -c "test(" tests/e2e/bip-edits.spec.ts`                                               | 8 tests (EDIT-01/02/03/04/05/06a/06b/09 + EDIT-07/08 inline) | ✓ PASS  |
| Build gate (npm run build)                            | Documented in 08-09-SUMMARY.md                                                               | PASSED — 51 pages generated including `/admin/bip-edits/[editId]/review` | ✓ PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description                                                                    | Status      | Evidence                                                                       |
|-------------|------------|--------------------------------------------------------------------------------|-------------|--------------------------------------------------------------------------------|
| EDIT-01     | 08-05      | Coordinator can submit edit to approved BIP for re-review                      | ✓ SATISFIED | `submitEditAction` in `bip-edits.ts`; inserts to `bip_edits` table             |
| EDIT-02     | 08-02      | Approved BIP stays publicly visible while edit is under review                 | ✓ SATISFIED | `bips_select_approved_public` policy unchanged; no `revalidatePath` in submit  |
| EDIT-03     | 08-06      | Admin can view proposed edit as diff against live BIP                          | ✓ SATISFIED | `BipEditDiffView.tsx` with all 22 editable fields, gold highlight              |
| EDIT-04     | 08-05      | Admin can approve edit, merging it into live BIP and refreshing public page     | ✓ SATISFIED | `approveEditAction` merges 22 columns + `revalidatePath` × 3; ISR timing deferred to manual UAT |
| EDIT-05     | 08-05      | Admin can reject edit, leaving live BIP unchanged                              | ✓ SATISFIED | `rejectEditAction` updates only `bip_edits`; no bips mutation; no revalidatePath |
| EDIT-06     | 08-05/08   | Admin can "request changes" on pending submission OR edit with a note          | ✓ SATISFIED | `requestChangesEditAction` (edit path) + `requestChangesBipAction` (D-06a new submission) |
| EDIT-07     | 08-03/05   | Coordinator emailed on approve/reject/changes-requested                        | ✓ SATISFIED | 3 email templates; exhaustive `EmailPayload` union; fire-and-forget in all actions; live Resend delivery deferred to manual UAT |
| EDIT-08     | 08-02/05   | Every edit and re-review action recorded in `bip_status_history`               | ✓ SATISFIED | SECURITY DEFINER trigger for coordinator writes (`submit_edit`, `resubmit_edit`); explicit admin inserts (`approve_edit`, `reject_edit`, `request_changes`) |
| EDIT-09     | 08-05/07   | BIP slug cannot be changed through edit flow                                   | ✓ SATISFIED | No slug column in `bip_edits` table; excluded from all Server Action payloads; `omitSlug` prop on wizard |

---

### CLAUDE.md Constraint Compliance

| Constraint                                        | Status     | Evidence                                                                 |
|---------------------------------------------------|------------|--------------------------------------------------------------------------|
| `getClaims()` not `getSession()` server-side      | ✓ PASS     | All 7 new Server Actions + 5 query functions use `getClaims()`; no actual `getSession()` calls in Phase 8 code |
| `await cookies()` (no synchronous cookies call)   | ✓ PASS     | `createClient` factory unchanged from prior phases (already compliant)   |
| Every new table has `ENABLE ROW LEVEL SECURITY`   | ✓ PASS     | `alter table public.bip_edits enable row level security` in 00017        |
| UPDATE policies have both `USING` and `WITH CHECK` | ✓ PASS     | `bip_edits_update_own_resubmit`, `bip_edits_update_admin`, and `bips_update_own_changes_requested_to_pending` all have USING + WITH CHECK |
| No `createAdminClient` outside `app/(admin)/` and `lib/supabase/admin.ts` | ✓ PASS | `createClient` (anon key) used in all new Phase 8 files |
| `revalidatePath()` in approve/reject (not webhooks) | ✓ PASS   | `revalidatePath` only in `approveEditAction` (D-13); no webhooks introduced |
| No dynamic Tailwind class names                   | ✓ PASS     | `EDIT_BADGE_CLASSES` is a complete literal string constant; `STATUS_BADGE_CLASSES.changes_requested` is a complete literal |
| Footer disclaimer on every page                   | ✓ PASS     | EC disclaimer in all 3 new email templates                               |
| No `published_snapshot` column / `pending_edit` status | ✓ PASS | Not present in any migration file; D-01a confirmed                       |

---

### D-01a Verification

`published_snapshot` and `pending_edit` terms appear in 6 files — all planning/research/context documents:

- `.planning/research/ARCHITECTURE.md` (overridden by D-01a)
- `.planning/research/SUMMARY.md` (context only)
- `.planning/research/PITFALLS.md` (context only)
- `.planning/phases/08-edit-approved-request-changes/08-CONTEXT.md` (D-01a decision recorded here)
- `.planning/phases/08-edit-approved-request-changes/08-RESEARCH.md` (original research)
- `.planning/phases/08-edit-approved-request-changes/08-DISCUSSION-LOG.md` (decision log)

Zero occurrences in any migration SQL file, TypeScript source, or component. D-01a is fully respected.

---

### Anti-Patterns Found

| File                                         | Line   | Pattern                     | Severity     | Impact                                                    |
|----------------------------------------------|--------|-----------------------------|--------------|-----------------------------------------------------------|
| `components/admin/RequestChangesBipModal.tsx` | 159, 222 | HTML `placeholder` attribute | ℹ Info only | These are `<textarea placeholder="...">` UI hints for admin input — not code stubs. Values do not flow to rendering as real data. Correct usage. |

No blocker or warning anti-patterns found.

---

### Human Verification Required

#### 1. ISR Perceptual Timing (EDIT-04)

**Test:** As admin, approve an edit on a running dev server or Vercel preview. After redirect to `/admin`, navigate to `/bip/[slug]` and reload.
**Expected:** The merged title/content from the approved edit appears within a few seconds (no hard cache bypass required).
**Why human:** "Within seconds" is a wall-clock latency claim. Playwright asserts that content changed but cannot assert ISR timing. The three `revalidatePath` calls in `approveEditAction` are confirmed present in the codebase — the mechanism is correct; the perceptual guarantee requires a running environment.

#### 2. Resend Live Email Delivery (EDIT-07)

**Test:** With a real `RESEND_API_KEY` configured (not the E2E blank-override), exercise each of the three edit outcomes:
1. Submit + approve edit → check coordinator inbox for "Your BIP edit is live" with BIP link
2. Submit + reject edit with note → check coordinator inbox for rejection email containing the note text
3. Submit + request changes with note → check coordinator inbox for changes-requested email containing the note text

**Expected:** All three emails arrive in the coordinator inbox; emails embed the admin note where applicable; BIP link is correct.
**Why human:** `playwright.config.ts` deliberately blanks `RESEND_API_KEY` to force the D-15 console fallback during E2E. The email template code and `sendEmail` wiring are verified correct in the codebase; actual Resend delivery cannot be asserted headlessly.

#### 3. Full bip-edits.spec.ts E2E Suite

**Test:** Point the environment at a local Supabase stack or a dedicated test cloud project (not `zbvcpiwbopmfbjfhzprw`), then run:
```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 npx playwright test tests/e2e/bip-edits.spec.ts
```
Or with the E2E_ALLOW_CLOUD override against a non-prod project.

**Expected:** All 8 serial tests pass (submit edit, public page unchanged, diff view, approve edit, reject edit, request changes new submission, request changes edit, slug immutable).
**Why human:** `playwright.config.ts` has a hard safety guard: it throws `Error: Refusing to run the e2e suite against the PRODUCTION cloud Supabase project` when `NEXT_PUBLIC_SUPABASE_URL` contains the production ref. This correctly prevents seed data from polluting the live database. The spec (498 lines, 8 tests) is wired and ready; only the execution environment is the blocker.

---

### Gaps Summary

No gaps. All 6 success criteria and all 9 EDIT requirements are verified by codebase evidence. The 3 human verification items are not failures — they are programmatic execution limits:

- ISR timing is a perceptual guarantee that requires a running server
- Resend delivery requires a live API key that is intentionally withheld from E2E
- The E2E spec exists and is correct; it is blocked by a purposeful production-safety guard

The codebase is complete and correct for Phase 8.

---

*Verified: 2026-06-26T14:45:00Z*
*Verifier: Claude (gsd-verifier)*
