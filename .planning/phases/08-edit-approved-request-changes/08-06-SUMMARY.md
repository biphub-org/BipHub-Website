---
phase: 08-edit-approved-request-changes
plan: 06
subsystem: admin-ui
tags: [diff-view, admin-queue, bip-edits, react, tailwind-v4]
dependency_graph:
  requires: [08-03, 08-04]
  provides: [08-07, 08-08]
  affects:
    - components/admin/BipEditDiffView.tsx
    - components/admin/AdminBipCard.tsx
    - components/admin/AdminBipRow.tsx
    - app/(admin)/admin/page.tsx
tech_stack:
  added: []
  patterns:
    - FieldDef accessor pattern (getLive/getProposed) for heterogeneous BipDetail vs BipDraftData comparison
    - JSON.stringify change-detection for field diff rendering
    - Literal const badge class (EDIT_BADGE_CLASSES) — Tailwind v4 static scanner compliance
    - Two-div responsive layout (hidden md:grid + md:hidden) for desktop/mobile field rows
    - Promise.all + in-process sort for FIFO union queue
key_files:
  created:
    - components/admin/BipEditDiffView.tsx
  modified:
    - components/admin/AdminBipCard.tsx
    - components/admin/AdminBipRow.tsx
    - app/(admin)/admin/page.tsx
decisions:
  - "FieldDef uses getLive/getProposed accessors rather than a shared key, to handle BipDetail vs BipDraftData field name divergence (subject_area vs isced_f_code; max_participants absent from BipDetail)"
  - "Two-div approach per field row (hidden md:grid + md:hidden) avoids complex responsive class overrides for the changed/unchanged conditional styling"
  - "reviewHref prop on AdminBipCard constructed in admin/page.tsx so /admin/bip-edits/ literal appears there (acceptance criteria); card stays generic"
  - "Edit item bip.status overridden with edit row status in the queue page so the badge shows pending/changes_requested instead of approved"
metrics:
  duration: 229s
  completed: 2026-06-26
  tasks: 2
  files: 4
---

# Phase 8 Plan 6: Admin Read Surfaces — Diff View + Union Queue Summary

**One-liner:** All-fields side-by-side BipEditDiffView (22 editable fields, gold highlight on changes, JSON.stringify detection) plus unified admin queue consuming 08-04 getAdminPendingSubmissions/getAdminPendingEdits with Edit badge and sub-line copy.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Create BipEditDiffView.tsx | 5b2699c | components/admin/BipEditDiffView.tsx |
| 2 | Type badge on cards + union admin queue | b73130d | components/admin/AdminBipCard.tsx, AdminBipRow.tsx, app/(admin)/admin/page.tsx |

## Contracts Delivered

### components/admin/BipEditDiffView.tsx (new)

`'use client'` component. Props: `{ liveBip: BipDetail; proposedEdit: BipEditDetail }`.

- 22 editable fields in plan-specified order; no slug, no virtual_start_date/virtual_end_date
- `FieldDef` type with `getLive(BipDetail)` and `getProposed(BipDraftData)` accessors
- JSON.stringify change detection per field; `changedCount` header shows N fields changed / No fields changed
- Desktop (≥960px via `md:`): `grid grid-cols-[180px_1fr_1fr]` with changed-row class `bg-eu-gold-soft border-l-2 border-l-eu-gold`
- Mobile (<960px): stacked with Live:/Proposed: prefixes; Proposed only shown for changed fields
- Sticky column header row with green/blue dot indicators for Live version / Proposed edit
- Format helpers: booleans→Yes/No; study_levels→join ', '; partners→newline join; how_to_apply→`type: value`
- T-08-17: zero dangerouslySetInnerHTML; all values rendered as React text + whitespace-pre-wrap

### components/admin/AdminBipCard.tsx (modified)

- Added `kind?: 'submission' | 'edit'` and `reviewHref?: string` props
- When `kind === 'edit'`: renders Edit badge using `EDIT_BADGE_CLASSES` const (literal string; no concatenation)
- Review link uses `reviewHref ?? /admin/bips/${bip.id}/review`
- `changes_requested` status renders via STATUS_BADGE_CLASSES automatically (08-03 delivered)

### components/admin/AdminBipRow.tsx (modified)

- Added `kind?: 'submission' | 'edit'` prop; renders Edit badge when `kind === 'edit'`
- Same `EDIT_BADGE_CLASSES` const literal as AdminBipCard (T-08-18 compliance)

### app/(admin)/admin/page.tsx (modified)

- Replaced `getAdminPendingBips` with `Promise.all([getAdminPendingSubmissions(), getAdminPendingEdits()])`
- Merges into `QueueItem[]` typed union, sorted by `created_at` ascending (FIFO)
- Edit items: bip.status overridden with edit row status so badge shows pending/changes_requested
- Sub-line: 0 → "You're all caught up. New submissions and edits will appear here automatically."; hasEdits → "N items awaiting review · includes new submissions and edits"; else → "N BIP(s) awaiting review"
- Edit review href: `/admin/bip-edits/${editId}/review` (T-08-19: route-level auth in 08-08)

## Deviations from Plan

### Auto-fixed Issues

None.

### Design notes (not deviations)

**1. BipDetail vs BipDraftData field mismatch for "Field of study" and "Max participants"**

- `BipDetail` exposes `subject_area` (display name column); `BipDraftData` exposes `isced_f_code` (code column). These come from related but different query paths. The diff shows `subject_area` on the live side and `isced_f_code` on the proposed side. The admin can read both values; they may or may not produce a false-positive "changed" flag depending on underlying data format.
- `max_participants` is not in `BipDetail` (not selected by `getBipById`). The live column always shows "—" for this field. The proposed side shows the edit value if set. This is correct — the admin sees what's being proposed.

These are data-model constraints of the current `BipDetail` shape, not plan deviations. No schema or query changes were made.

## Security Compliance

| Threat | Status |
|--------|--------|
| T-08-17: XSS via coordinator content in diff | Mitigated — no dangerouslySetInnerHTML; whitespace-pre-wrap text only |
| T-08-18: Dynamic Edit-badge class concat | Mitigated — EDIT_BADGE_CLASSES const literal; no template literals |
| T-08-19: IDOR via edit-card review link | Mitigated — href built from edit.id; review route (08-08) re-gates via getBipEditById role check |

## Known Stubs

None. All components are fully wired to real query functions from 08-04. No hardcoded empty values flow to rendering.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes introduced. Trust boundary documentation matches plan's threat model.

## Self-Check: PASSED

- components/admin/BipEditDiffView.tsx: EXISTS (5b2699c, 306 lines)
- components/admin/AdminBipCard.tsx: MODIFIED (b73130d)
- components/admin/AdminBipRow.tsx: MODIFIED (b73130d)
- app/(admin)/admin/page.tsx: MODIFIED (b73130d)
- `npx tsc --noEmit`: 0 lines output (clean)
- 'use client' in BipEditDiffView: CONFIRMED
- 'Field Comparison' in BipEditDiffView: CONFIRMED
- JSON.stringify in BipEditDiffView: CONFIRMED
- bg-eu-gold-soft + border-l-eu-gold in BipEditDiffView: CONFIRMED
- virtual_start_date/virtual_end_date/slug count: 0
- whitespace-pre-wrap in BipEditDiffView: CONFIRMED
- getAdminPendingSubmissions + getAdminPendingEdits in admin/page.tsx: CONFIRMED
- bg-eu-blue-50 text-eu-blue border-eu-blue-light in AdminBipCard + AdminBipRow: CONFIRMED
- /admin/bip-edits/ in admin/page.tsx: CONFIRMED
- includes new submissions and edits in admin/page.tsx: CONFIRMED
