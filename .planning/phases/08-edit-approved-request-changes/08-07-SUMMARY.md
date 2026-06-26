---
phase: 08-edit-approved-request-changes
plan: 07
subsystem: coordinator-ui
tags: [edit-workflow, coordinator-ui, edit-status-callout, state-machine, slug-immutability, resubmit]
dependency_graph:
  requires: [08-04, 08-05]
  provides: [coordinator-edit-entry-point, EditStatusCallout, State-A-B-C-CTAs, D-06a-resubmit]
  affects:
    - components/dashboard/EditStatusCallout.tsx
    - components/forms/steps/WizardStep5EditPreview.tsx
    - app/(dashboard)/dashboard/bips/[id]/edit/page.tsx
    - components/forms/BipSubmissionWizard.tsx
tech_stack:
  added: []
  patterns:
    - previewStep render-prop slot reused for edit-specific Step 5 CTA
    - State machine branching in RSC (approved/changes_requested + openEdit presence)
    - Zustand store read-at-submit-time pattern (draft+partners from useBipDraft)
    - omitSlug dual-guard (T-08-20: client prop + server action exclusion)
key_files:
  created:
    - components/dashboard/EditStatusCallout.tsx
    - components/forms/steps/WizardStep5EditPreview.tsx
  modified:
    - app/(dashboard)/dashboard/bips/[id]/edit/page.tsx
    - components/forms/BipSubmissionWizard.tsx
decisions:
  - "WizardStep5EditPreview placed in components/forms/steps/ alongside WizardStep5Preview — same render-prop slot pattern, RSC page passes the appropriate element per state"
  - "EditStatusCallout placed above wizard card (max-w-[760px] mx-auto) to match wizard width — callout is persistent context visible on all wizard steps, not just Step 5"
  - "omitSlug is a void no-op in BipSubmissionWizard (no slug input exists in any wizard step) — prop is the T-08-20 future-proof gate; void omitSlug suppresses the unused-variable TS error without stripping the prop from the interface"
  - "D-06a resubmitPendingBipAction call mirrors State C resubmitEditAction exactly: (bipId, draft, partners) — coordinator content edits are preserved; a status-only call is forbidden per plan constraint"
metrics:
  duration: 208s
  completed: 2026-06-26
  tasks_completed: 2
  files_changed: 4
---

# Phase 8 Plan 07: Coordinator Edit Entry Point Summary

**One-liner:** EditStatusCallout (three-state banner) + extended edit page with States A/B/C/D-06a gold-pill CTAs wired to submitEditAction / resubmitEditAction / resubmitPendingBipAction; slug field omitted from approved-BIP edit DOM (EDIT-09 client half).

## What Was Built

### `components/dashboard/EditStatusCallout.tsx` (Task 1)

Three-state `'use client'` coordinator banner placed above the wizard:

| State | Status prop | Visual | Copy |
|-------|-------------|--------|------|
| A | `'approved'` | Blue border + CheckCircle2 icon | "This BIP is live. Submit an edit to propose changes..." |
| B | `'pending'` | Amber border + Clock icon | "Your edit is under review..." |
| C | `'changes_requested'` | Gold left-border (DashboardBipCard analog) | "Changes requested" heading + adminNote as text + footer |

Security: T-08-21 mitigated — `adminNote` rendered as `{adminNote}` React text content, not `dangerouslySetInnerHTML`.

### `components/forms/steps/WizardStep5EditPreview.tsx` (Task 2)

Client component passed as `previewStep` to `BipSubmissionWizard` on the edit path. Reads `draft` and `partner_universities` from the Zustand store at submit time and dispatches to the correct server action:

| Edit state prop | Action called | Toast |
|-----------------|---------------|-------|
| `'state-a'` | `submitEditAction(bipId, draft, partners)` | "Edit submitted for review..." |
| `'state-b'` | (no action — disabled button only; T-08-22: resubmit not mounted) | — |
| `'state-c'` | `resubmitEditAction(editId, draft, partners)` | "Edit resubmitted..." |
| `'d06a'` | `resubmitPendingBipAction(bipId, draft, partners)` | "Edit resubmitted..." |

D-06a correctness: `resubmitPendingBipAction(bipId, draft, partners)` passes full wizard content — mirrors the State C call exactly. A status-only call would discard coordinator content edits.

### `app/(dashboard)/dashboard/bips/[id]/edit/page.tsx` (Task 2 extended)

RSC page extended to branch on `record.status` + `record.openEdit`:

- Approved/changes_requested BIPs no longer 404 (08-04 widened the whitelist; page now handles them).
- State determination: 4-branch logic (State A / B / C / D-06a) selects `calloutStatus`, `calloutAdminNote`, `prefillData` (live vs proposed content), and `previewStep` element.
- D-06a: calls `getLatestChangesRequest(record.id)` to fetch the admin note from `bip_status_history`.
- `omitSlug={record.status === 'approved'}` passed to wizard (EDIT-09 / D-10 dual-guard, T-08-20).
- Draft/pending flow unchanged.

### `components/forms/BipSubmissionWizard.tsx` (minor addition)

Added `omitSlug?: boolean` to the Props interface with a `void omitSlug` no-op guard (future-proofing: no wizard step currently renders a slug input; the prop prevents accidental addition from bypassing the guard).

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All four CTAs call real server actions with real draft+partners payloads. The preview renders the live wizard content.

## Threat Flags

None. No new network endpoints or auth paths introduced. All files are within the existing coordinator dashboard trust boundary. T-08-20 and T-08-21 and T-08-22 are all mitigated as specified.

## Self-Check: PASSED

- `components/dashboard/EditStatusCallout.tsx`: EXISTS (1910104)
- `components/forms/steps/WizardStep5EditPreview.tsx`: EXISTS (717b1db)
- `app/(dashboard)/dashboard/bips/[id]/edit/page.tsx`: MODIFIED (717b1db)
- `components/forms/BipSubmissionWizard.tsx`: MODIFIED (717b1db)
- `tsc --noEmit`: clean (0 errors)
- `EditStatusCallout` grep checks: 'use client' ✓, 'Changes requested' ✓, 'This BIP is live' ✓, 'under review' ✓, 'border-l-4 border-eu-gold' ✓, 'adminNote' ✓
- Edit page: 'Submit Edit for Review' ✓, 'Resubmit Edit' ✓, 'Edit in review' ✓, 'EditStatusCallout' ✓, 'omitSlug' wired to status==='approved' ✓
- resubmitPendingBipAction called with draft + partners ✓ (not no-arg/status-only)
- State B: resubmit action NOT mounted (disabled button only) ✓ (T-08-22)
