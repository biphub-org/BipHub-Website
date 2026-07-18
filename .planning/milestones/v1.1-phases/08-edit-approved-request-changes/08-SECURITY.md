# Phase 8 Security Audit — Edit-Approved + Request-Changes

**Phase:** 08 — Edit-Approved + Request-Changes
**Audited:** 2026-06-26
**ASVS Level:** 1
**Block On:** HIGH severity unmitigated threats
**Auditor stance:** FORCE — every mitigation assumed absent until grep evidence proves presence

---

## Result: SECURED

**Threats Closed:** 26 / 26
**Threats Open (BLOCKER):** 0
**Unregistered Flags:** 0

---

## Threat Verification

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-08-01 | Tampering | mitigate | CLOSED | `supabase/seed.e2e.sql` line 400: literal slug `'e2e-edit-target-bip'` with fixed UUID `e2e0bbbb-bbbb-bbbb-bbbb-000000000010`; distinct from Machine Learning Foundations BIP used in admin-review.spec.ts |
| T-08-02 | Repudiation | accept→mitigate | CLOSED | `playwright.config.ts` line 82: `testMatch: /(admin-review\|bip-edits)\.spec\.ts$/` on admin-authed project only; coordinator context spawned in-spec via storageState |
| T-08-03 | Elevation of Privilege | mitigate | CLOSED | `supabase/migrations/00017_bip_edits.sql` lines 83–106: `bip_edits_insert_own` WITH CHECK pins `status = 'pending'`; `bip_edits_update_own_resubmit` USING pre-image `= 'changes_requested'` WITH CHECK post-image `= 'pending'` — coordinator can never reach `'approved'` via these two policies |
| T-08-04 | Spoofing / IDOR | mitigate | CLOSED | `00017_bip_edits.sql` lines 83–89: INSERT WITH CHECK `(select auth.uid()) = created_by AND status = 'pending'`; `lib/actions/bip-edits.ts` lines 133–135: server-side defense-in-depth ownership read-back (`bip.created_by !== userId`) |
| T-08-05 | Tampering | mitigate | CLOSED | `00017_bip_edits.sql` full DDL (lines 17–56): 22 content columns listed — no `slug` column anywhere in the table definition |
| T-08-06 | Repudiation | mitigate | CLOSED | `00017_bip_edits.sql` line 19: `references public.bips(id) on delete cascade`; line 20: `references auth.users(id) on delete cascade` — both FK cascades present (FOUN-09) |
| T-08-07 | Repudiation | mitigate | CLOSED | `00019_bip_status_history_edit_kinds.sql` lines 43–76: `log_bip_edit_status_change()` declared `SECURITY DEFINER set search_path = public`; line 86: `revoke execute on function public.log_bip_edit_status_change() from public, anon, authenticated` |
| T-08-08 | Information Disclosure | mitigate | CLOSED | `lib/email/templates/EditRejectionEmail.tsx` lines 147–150: `{adminNote}` inside `<Text>` with `whiteSpace: 'pre-wrap'`; `lib/email/templates/EditChangesRequestedEmail.tsx` lines 147–149: identical pattern; no `dangerouslySetInnerHTML` in either file (word appears only in security comments) |
| T-08-09 | Tampering | mitigate | CLOSED | `lib/utils/status.ts` line 22: `changes_requested: 'bg-status-changes-requested-bg text-status-changes-requested border-status-changes-requested'` — complete literal string; no backticks or template literals |
| T-08-10 | Information Disclosure | mitigate | CLOSED | `lib/queries/bipEdits.ts` lines 228–251: `getOpenEditForBip` calls `getClaims()`, relies on `bip_edits_select_own` RLS (ownership at DB layer); lines 261–269: `getBipEditById` explicitly checks `role !== 'admin'` and returns `null` for non-admin callers |
| T-08-11 | Elevation of Privilege | mitigate | CLOSED | `lib/queries/bipEdits.ts` lines 295–315: `getAdminPendingSubmissions` returns `[]` when `role !== 'admin'`; lines 327–382: `getAdminPendingEdits` same guard; `getBipEditById` line 268–269: returns `null` on non-admin |
| T-08-12 | Elevation of Privilege | mitigate | CLOSED | `lib/actions/bip-edits.ts` line 154: INSERT uses `status: 'pending'`; line 213: resubmit UPDATE uses `status: 'pending'`; line 299: `resubmitPendingBipAction` UPDATE uses `status: 'pending'` — no coordinator code path ever writes `'approved'`; RLS WITH CHECK backs all three |
| T-08-13 | Tampering | mitigate | CLOSED | `lib/actions/admin-edit-bips.ts` lines 102–130: `buildMergePayload` comment line 127 "slug intentionally omitted"; `lib/actions/bip-edits.ts` lines 32–83: `buildContentPayload` comment line 82 "slug intentionally omitted"; bip_edits table has no slug column (dual guard) |
| T-08-14 | Spoofing | mitigate | CLOSED | `lib/actions/admin-edit-bips.ts`: `approveEditAction` line 165 `if (role !== 'admin') return { error: 'Forbidden.' }`; `rejectEditAction` line 312; `requestChangesEditAction` line 419; `requestChangesBipAction` line 528 — all four admin actions enforce the same role gate |
| T-08-15 | Repudiation | mitigate | CLOSED | `lib/actions/admin-edit-bips.ts`: `approveEditAction` lines 247–254 inserts `action_kind: 'approve_edit'`; `rejectEditAction` lines 355–364 inserts `action_kind: 'reject_edit'`; `requestChangesEditAction` lines 463–471 inserts `action_kind: 'request_changes'`; `requestChangesBipAction` lines 564–571 same — explicit audit row on every verdict |
| T-08-16 | Denial of Service | mitigate | CLOSED | `lib/actions/admin-edit-bips.ts`: `approveEditAction` line 269 `try {` + catch comment "Resend outage must NOT roll back the DB writes"; `rejectEditAction` line 372; `requestChangesEditAction` line 479; `requestChangesBipAction` line 582 — all four use fire-and-forget try/catch |
| T-08-17 | Information Disclosure | mitigate | CLOSED | `components/admin/BipEditDiffView.tsx` lines 251–303: all field values (`liveVal`, `proposedVal`) rendered as React text children inside `<span>` / `<p>` with `whitespace-pre-wrap`; no `dangerouslySetInnerHTML` in functional code (word appears only in security comment line 12) |
| T-08-18 | Tampering | mitigate | CLOSED | `components/admin/AdminBipCard.tsx` lines 26–28: `const EDIT_BADGE_CLASSES = 'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-eu-blue-50 text-eu-blue border-eu-blue-light'` — complete literal string constant, no template literals |
| T-08-19 | IDOR | mitigate | CLOSED | `app/(admin)/admin/bip-edits/[editId]/review/page.tsx` lines 60–61: `const editRow = await getBipEditById(editId); if (!editRow) notFound()` — admin role re-checked inside `getBipEditById`; route under `app/(admin)/` group with layout guard |
| T-08-20 | Tampering | mitigate | CLOSED | `app/(dashboard)/dashboard/bips/[id]/edit/page.tsx` line 133: `omitSlug={record.status === 'approved'}` passed to `BipSubmissionWizard` (client guard); server actions `buildContentPayload` and `buildMergePayload` also exclude slug (dual guard EDIT-09/D-10) |
| T-08-21 | Information Disclosure | mitigate | CLOSED | `components/dashboard/EditStatusCallout.tsx` line 66: `{adminNote}` rendered as JSX text node inside `<p>` — no `dangerouslySetInnerHTML`; comment lines 16–17 explicitly documents T-08-21 mitigation |
| T-08-22 | Elevation of Privilege | mitigate | CLOSED | `components/forms/steps/WizardStep5EditPreview.tsx` lines 161–172: comment "State B: disabled 'Edit in review' — resubmit action NOT mounted"; renders only a `disabled` button for `editState === 'state-b'`; `lib/actions/bip-edits.ts` `resubmitEditAction` line 221 `.eq('status', 'changes_requested')` idempotency guard — server rejects any resubmit call on a pending row |
| T-08-23 | IDOR | mitigate | CLOSED | `lib/queries/bipEdits.ts` lines 267–269: `getBipEditById` checks `role !== 'admin'` and returns `null`; page calls `notFound()` on null (line 61); `app/(admin)/` layout provides outer auth guard |
| T-08-24 | Input Validation | mitigate | CLOSED | `components/admin/RequestChangesBipModal.tsx` lines 41–45: imports `RequestChangesEditSchema` and `RequestChangesBipSchema`; both schemas enforce `min(10)` / `max(1000)` on `note`; server actions `requestChangesEditAction` line 422 and `requestChangesBipAction` line 531 both `safeParse` the same schemas |
| T-08-25 | Spoofing | mitigate | CLOSED | `app/(admin)/admin/bip-edits/[editId]/review/page.tsx` line 5: `import { createClient } from '@/lib/supabase/server'` — anon-key + JWT client only; no `createAdminClient` import in any Phase 8 file outside `lib/supabase/admin.ts` |
| T-08-26 | Information Disclosure | mitigate | CLOSED | `lib/email/templates/EditRejectionEmail.tsx` lines 147–150 and `lib/email/templates/EditChangesRequestedEmail.tsx` lines 147–149: `{adminNote}` inside `@react-email` `<Text>` component with `whiteSpace: 'pre-wrap'` — JSX auto-escapes; no `dangerouslySetInnerHTML` |

---

## Verify-Specifically Items

### Broken Object-Level Auth: coordinator cannot edit a BIP they do not own

Two-layer enforcement confirmed:

- **RLS (DB layer):** `bip_edits_insert_own` WITH CHECK `(select auth.uid()) = created_by AND status = 'pending'` — `00017_bip_edits.sql` lines 83–89
- **Server Action (app layer):** `submitEditAction` reads `bip.created_by` server-side and returns `{ error: 'You do not have permission to edit this BIP.' }` if mismatch — `lib/actions/bip-edits.ts` lines 127–135

### Privilege Escalation: coordinator cannot self-approve

Three independent barriers:

- `bip_edits_insert_own` WITH CHECK forces `status = 'pending'` on INSERT
- `bip_edits_update_own_resubmit` USING + WITH CHECK forces `changes_requested → pending` transition only
- Coordinator action files (`bip-edits.ts`) never set `status = 'approved'` anywhere; all four admin verdict actions in `admin-edit-bips.ts` guard `role !== 'admin'` before any DB write

### Slug Mutation (EDIT-09)

Dual guard confirmed:

- **Schema layer:** `bip_edits` table has no `slug` column — `00017_bip_edits.sql` DDL
- **Server layer:** `buildContentPayload` in `bip-edits.ts` and `buildMergePayload` in `admin-edit-bips.ts` both explicitly omit slug (documented in comments)
- **Client layer:** `omitSlug={record.status === 'approved'}` passed to `BipSubmissionWizard` — `edit/page.tsx` line 133

### Orphaned PII after Deletion (FOUN-09)

- `bip_edits.bip_id references public.bips(id) on delete cascade` — cascade fires on BIP deletion
- `bip_edits.created_by references auth.users(id) on delete cascade` — cascade fires on account hard-delete
- Both FKs present in `00017_bip_edits.sql` lines 19–20

### IDOR on /admin/bip-edits/[editId]/review

Three-layer defense:

1. `app/(admin)/` layout enforces admin role at the route group level
2. `getBipEditById(editId)` re-checks `role === 'admin'` in the query layer — returns `null` for non-admin
3. Page calls `notFound()` on `null` return — no data leaks on 404

### Stored XSS via admin_note / coordinator content

No `dangerouslySetInnerHTML` appears in functional code across all Phase 8 render surfaces:

- `EditStatusCallout.tsx`: `{adminNote}` as JSX text node (`<p>`)
- `BipEditDiffView.tsx`: all field values as `<span>` / `<p>` text children with `whitespace-pre-wrap`
- `EditRejectionEmail.tsx` + `EditChangesRequestedEmail.tsx`: `{adminNote}` inside `@react-email` `<Text>` with `whiteSpace: 'pre-wrap'`

The word `dangerouslySetInnerHTML` appears only in security comments documenting its explicit absence.

### Every New UPDATE RLS Policy Has Both USING and WITH CHECK

Three new UPDATE policies, all verified:

| Policy | File | USING | WITH CHECK |
|--------|------|-------|-----------|
| `bip_edits_update_own_resubmit` | `00017_bip_edits.sql` lines 96–106 | `created_by = auth.uid() AND status = 'changes_requested'` | `created_by = auth.uid() AND status = 'pending'` |
| `bip_edits_update_admin` | `00017_bip_edits.sql` lines 116–124 | `jwt() app_metadata.role = 'admin'` | `jwt() app_metadata.role = 'admin'` |
| `bips_update_own_changes_requested_to_pending` | `00018_bips_changes_requested.sql` lines 30–40 | `created_by = auth.uid() AND status = 'changes_requested'` | `created_by = auth.uid() AND status = 'pending'` |

---

## Unregistered Flags

None. All nine execution SUMMARY.md files report "None" under `## Threat Flags`. No new attack surface (network endpoints, auth paths, or schema changes) was detected during implementation beyond the threat register.

---

## Accepted Risks Log

None. No threats were accepted in this phase — all 26 carry `mitigate` (or `accept→mitigate`) dispositions and evidence of implementation was found.

---

*Phase 8 security audit complete. Implementation is clear to ship.*
