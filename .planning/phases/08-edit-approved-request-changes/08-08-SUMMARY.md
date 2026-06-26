---
phase: 08-edit-approved-request-changes
plan: 08
subsystem: admin-ui
tags: [admin-verdicts, request-changes, diff-view, edit-review-route, modal, server-actions]
dependency_graph:
  requires: [08-05, 08-06]
  provides: [admin-edit-verdict-surface, edit-review-route, request-changes-modal]
  affects:
    - components/admin/RequestChangesBipModal.tsx
    - components/admin/AdminActionsPanel.tsx
    - components/admin/RejectBipModal.tsx
    - app/(admin)/admin/bip-edits/[editId]/review/page.tsx
tech_stack:
  added: []
  patterns:
    - dual-mode modal pattern (isEdit branch in both form hooks + JSX)
    - two-useForm-hooks always-called React pattern (avoids conditional hook violation)
    - direct action call in useTransition for edit-mode approve (no modal)
    - force-dynamic RSC with sequential fetch then parallel fetch for edit review route
key_files:
  created:
    - components/admin/RequestChangesBipModal.tsx
    - app/(admin)/admin/bip-edits/[editId]/review/page.tsx
  modified:
    - components/admin/AdminActionsPanel.tsx
    - components/admin/RejectBipModal.tsx
decisions:
  - "canRequestChanges = currentStatus === 'pending' ONLY — matches requestChangesEditAction server guard; prevents error-toast-vs-disabled-button mismatch (WARNING-1 fix per 08-08 plan)"
  - "dual-form hook pattern: both editForm and submissionForm hooks always called (React rules), each used in its own JSX branch — avoids union type resolution errors from shared form ref"
  - "Edit-mode Approve calls approveEditAction(editId) directly via useTransition in AdminActionsPanel — no separate ApproveEditModal needed (not in plan file list; action takes no note)"
  - "RejectBipModal extended with isEdit/editId props and edit-reject branch using RejectEditSchema + rejectEditAction — plan explicitly allowed this via 'small edit branch' option"
  - "Edit review page: sequential fetch pattern (getBipEditById → notFound if null, then parallel getAdminBipById+getCoordinatorForBip) — bip_id not available until editRow is resolved"
metrics:
  duration: 496s
  completed: 2026-06-26
  tasks_completed: 2
  files_changed: 4
---

# Phase 8 Plan 08: Admin Verdict Surface Summary

**One-liner:** Three-button admin verdict panel (Approve/Request Changes/Reject with edit/submission labels), amber required-note RequestChangesBipModal, and /admin/bip-edits/[editId]/review route rendering BipEditDiffView plus the edit-mode action panel.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | RequestChangesBipModal + AdminActionsPanel third button | ef6037c | components/admin/RequestChangesBipModal.tsx (new), components/admin/AdminActionsPanel.tsx (modified), components/admin/RejectBipModal.tsx (modified) |
| 2 | New edit-review route + Request Changes on submission review page | a2241c5 | app/(admin)/admin/bip-edits/[editId]/review/page.tsx (new) |

## Contracts Delivered

### components/admin/RequestChangesBipModal.tsx (new)

`'use client'` amber modal mirroring RejectBipModal structure.

- Props: `{ open, onOpenChange, bipId, editId?, bipTitle, coordinatorName, isEdit? }`
- `isEdit=false`: uses `RequestChangesBipSchema` + `requestChangesBipAction(bipId, note)`
- `isEdit=true`: uses `RequestChangesEditSchema` + `requestChangesEditAction(editId, note)`
- Both form hooks always called (avoids React conditional hook violation); each used only in its JSX branch
- Gold-border BIP callout (`bg-bg-soft border-l-4 border-eu-gold`); amber confirm button (`bg-status-pending text-white hover:bg-amber-700 rounded-pill`)
- Note field: `id="request-changes-note"` rows=4 maxLength=1000; char counter; disabled until valid per spec
- Success toast: "Changes requested. {coordinatorName} will be notified."
- Server error: `Alert variant="destructive"` inside modal

### components/admin/AdminActionsPanel.tsx (modified)

Three-button verdict panel.

- New props: `isEdit?: boolean`, `editId?: string`
- New button "Request Changes" (MessageSquare icon, amber outline: `border-status-pending text-status-pending bg-white hover:bg-status-pending-bg rounded-pill`) between Approve and Reject
- `canRequestChanges = currentStatus === 'pending'` ONLY — matches 08-05 action guard (WARNING-1 fix)
- `canApprove = currentStatus === 'pending'` (unchanged)
- `canReject = isEdit ? currentStatus === 'pending' : currentStatus === 'pending' || currentStatus === 'approved'`
- Approve button in edit mode: calls `approveEditAction(editId)` directly via `useTransition`; shows "Approving…" during transition; surfaces error inline
- Approve button in submission mode: opens ApproveBipModal (unchanged)
- Reject button: opens RejectBipModal with `isEdit` and `editId` for edit-mode branch
- Button labels: "Approve Edit" / "Reject Edit" (isEdit=true); "Approve BIP" / "Reject BIP" (isEdit=false)
- Contextual helper text: edit vs submission copy per UI-SPEC Surface 4

### components/admin/RejectBipModal.tsx (modified)

Edit-mode reject branch added.

- New props: `isEdit?: boolean`, `editId?: string`
- Two separate form hooks always called (React rules); submissionForm uses `RejectBipSchema` (field: `reason`); editRejectForm uses `RejectEditSchema` (field: `note`)
- `isEdit=true`: title "Reject Edit"; `editRejectForm` wired; calls `rejectEditAction(editId, note)`
- `isEdit=false` (default): title "Reject BIP"; `submissionForm` wired; calls `rejectBipAction(bipId, reason)` — existing behavior unchanged

### app/(admin)/admin/bip-edits/[editId]/review/page.tsx (new)

Admin edit-review RSC route.

- `export const dynamic = 'force-dynamic'` — always-fresh verdict state
- Sequential then parallel fetch: `getBipEditById(editId)` first (T-08-23 role check inside); then `Promise.all([getAdminBipById(editRow.bip_id), getCoordinatorForBip(editRow.bip_id)])`
- `notFound()` on null editRow or null bip
- Two-column layout: left column BipEditDiffView + BipHeader + BipBody; right column BipSidebar + AdminActionsPanel(isEdit=true, editId=editRow.id)
- `currentStatus={editRow.status as BipStatus}` — edit row status drives verdict buttons (not live bip status)
- Breadcrumb: "← Back to queue" → /admin; status label shows edit row status

### app/(admin)/admin/bips/[id]/review/page.tsx (no changes needed)

AdminActionsPanel is already rendered without `isEdit` prop (defaults to false = submission mode). The new Request Changes button appears automatically. The page resolves for `changes_requested` status via admin RLS (no status filter in `getAdminBipById`).

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

### Design notes (not deviations)

**1. Edit-mode Approve: direct action call instead of a modal**

The plan's task action says "the Approve button calls approveEditAction(editId)" without mentioning a modal. `ApproveEditModal` is not in the plan's `files_modified` list. `approveEditAction` takes no note parameter (unlike `approveBipAction` which has an optional note). Implementation calls the action directly via `useTransition` in AdminActionsPanel, with inline error surfacing. This is the most faithful interpretation of the plan.

**2. RejectBipModal modification classified as plan-directed**

The plan task 1 action text explicitly says "reuse RejectBipModal with an edit-mode prop OR a small edit branch". Although `RejectBipModal.tsx` is not in the plan's `files_modified` frontmatter list, the plan body authorizes this modification. Not logged as a deviation.

**3. Dual-form hook pattern**

Using two `useForm` calls (one for each mode) with a conditional JSX branch avoids React's conditional hook rule violation and also avoids TypeScript union-type resolution errors that arise from a shared `form = isEdit ? editForm : submissionForm` reference with `watch()`. Both hooks called unconditionally; each form used only in its own JSX branch.

## Security Compliance

| Threat | Status |
|--------|--------|
| T-08-23: IDOR via forged editId | Mitigated — getBipEditById re-checks role==='admin'; returns null for non-admin JWT; page calls notFound() |
| T-08-24: empty/oversized note | Mitigated — RequestChanges*Schema min 10 / max 1000 client (RHF zodResolver) + server safeParse (08-05) |
| T-08-25: createAdminClient misuse | Mitigated — edit review page uses createClient (anon+JWT); no createAdminClient introduced |

## Known Stubs

None. All components wire to real 08-05 Server Actions and real 08-06 BipEditDiffView. No hardcoded empty values flow to rendering.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes. The /admin/bip-edits/[editId]/review route is inside app/(admin)/ and inherits the (admin) layout auth guard plus getBipEditById's role re-check.

## Self-Check: PASSED

- components/admin/RequestChangesBipModal.tsx: EXISTS (ef6037c)
- components/admin/AdminActionsPanel.tsx: MODIFIED (ef6037c)
- components/admin/RejectBipModal.tsx: MODIFIED (ef6037c)
- app/(admin)/admin/bip-edits/[editId]/review/page.tsx: EXISTS (a2241c5)
- `npx tsc --noEmit`: 0 lines output (clean)
- `npm run build`: clean (no errors)
- RequestChangesEditSchema in RequestChangesBipModal: CONFIRMED
- RequestChangesBipSchema in RequestChangesBipModal: CONFIRMED
- requestChangesEditAction in RequestChangesBipModal: CONFIRMED
- requestChangesBipAction in RequestChangesBipModal: CONFIRMED
- isEdit in AdminActionsPanel: CONFIRMED
- editId in AdminActionsPanel: CONFIRMED
- MessageSquare in AdminActionsPanel: CONFIRMED
- Request Changes button in AdminActionsPanel: CONFIRMED
- approveEditAction in AdminActionsPanel: CONFIRMED
- canRequestChanges = currentStatus === 'pending' ONLY: CONFIRMED (grep -Eq passes)
- getBipEditById in edit review page: CONFIRMED
- BipEditDiffView in edit review page: CONFIRMED
- isEdit={true} in edit review page: CONFIRMED
- editId={editRow.id} in edit review page: CONFIRMED
- force-dynamic in edit review page: CONFIRMED
- AdminActionsPanel without isEdit in bips review page: CONFIRMED
