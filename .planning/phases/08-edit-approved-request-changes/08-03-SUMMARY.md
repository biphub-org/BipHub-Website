---
phase: 08-edit-approved-request-changes
plan: "03"
subsystem: status-utils, email
tags: [status, email, changes-requested, wave-2]
dependency_graph:
  requires: [08-02]
  provides: [changes_requested-badge-token, edit-email-templates, email-payload-union-extended]
  affects: [08-04, 08-05, 08-06, 08-07]
tech_stack:
  added: []
  patterns:
    - "TDD RED/GREEN for status + transition tests (vitest)"
    - "Exhaustive discriminated union (EmailPayload never-check) as compile-time coverage gate"
    - "JSX text rendering for admin note (pre-wrap, no dangerouslySetInnerHTML) — T-08-08"
    - "Literal STATUS_BADGE_CLASSES entry — no template literals (CLAUDE.md / Tailwind v4)"
key_files:
  created:
    - lib/email/templates/EditApprovalEmail.tsx
    - lib/email/templates/EditRejectionEmail.tsx
    - lib/email/templates/EditChangesRequestedEmail.tsx
  modified:
    - lib/utils/status.ts
    - lib/utils/status-transitions.ts
    - app/globals.css
    - lib/email/send.ts
    - tests/utils/status-transitions.test.ts
decisions:
  - "changes_requested amber badge reuses #b45309/#fffbeb (same as status-pending) — semantically equivalent pending-with-feedback"
  - "EditApprovalEmail has no adminNote prop — approval is clean/final per plan spec"
  - "Admin note rendered as JSX text child with whiteSpace:pre-wrap — T-08-08 XSS mitigation"
metrics:
  duration: "~480s"
  completed: "2026-06-26"
  tasks_completed: 3
  files_changed: 8
---

# Phase 8 Plan 03: Status Vocabulary + Edit Email Templates Summary

**One-liner:** `changes_requested` amber status token + 4 transitions wired + 3 note-bearing Edit* email templates extending the exhaustive EmailPayload union.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Extend status vocabulary + globals token + transitions | 025b903 | lib/utils/status.ts, lib/utils/status-transitions.ts, app/globals.css, tests/utils/status-transitions.test.ts |
| 2 | Create 3 Edit outcome email templates | 02be5bc | lib/email/templates/Edit{Approval,Rejection,ChangesRequested}Email.tsx |
| 3 | Extend EmailPayload union + resolveSubject + sendEmail switch | 18e6662 | lib/email/send.ts |

## Verification

- `npx tsc --noEmit` exits 0 (zero errors across entire project)
- 58/58 vitest unit tests pass (all pre-existing + 7 new status tests)
- grep assertions:
  - `status.ts`: 3 occurrences of `changes_requested` (union + badge class + label)
  - `status-transitions.ts`: 5 occurrences of `changes_requested` (4 transition entries + array type)
  - `send.ts`: 9 occurrences of `edit-approved|edit-rejected|edit-changes-requested` (union × 3 + subject × 3 + switch × 3)
  - `globals.css`: `bg-status-changes-requested-bg` safelist comment present
- All 3 email templates contain EC disclaimer
- EditApprovalEmail has no `adminNote` prop
- EditRejection + EditChangesRequested both use `adminNote` with `whiteSpace: 'pre-wrap'`

## Deviations from Plan

None — plan executed exactly as written. The `changes_requested` CSS variable (`--color-status-changes-requested-bg`) reuses the same hex value as `status-pending-bg` (`#fffbeb`), which is correct per UI-SPEC (amber palette shared for "needs attention" states).

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. Files are pure utility/template modules. Threat T-08-08 (XSS via admin note) mitigated as planned: JSX text rendering escapes HTML by default; no `dangerouslySetInnerHTML` used anywhere. Threat T-08-09 (dynamic Tailwind class) mitigated: `STATUS_BADGE_CLASSES.changes_requested` is a complete literal string with no template literals or backticks.

## Self-Check: PASSED

- lib/utils/status.ts: FOUND
- lib/utils/status-transitions.ts: FOUND
- app/globals.css (changes_requested token): FOUND
- lib/email/templates/EditApprovalEmail.tsx: FOUND
- lib/email/templates/EditRejectionEmail.tsx: FOUND
- lib/email/templates/EditChangesRequestedEmail.tsx: FOUND
- lib/email/send.ts (edit-approved case): FOUND
- Commit 025b903: FOUND
- Commit 02be5bc: FOUND
- Commit 18e6662: FOUND
