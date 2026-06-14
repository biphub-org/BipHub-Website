---
phase: 03-admin-review-emails
plan: 07
subsystem: admin-edit
tags: [admin-edit, wizard-reuse, mode-prop, server-action, phase-3, vertical-slice]
requires: [03-03, 03-04, 03-05, 03-06, 02-07]
provides:
  - "BipSubmissionWizard mode='admin' (banner + suppressed auto-save + suppressed localStorage)"
  - "adminUpdateBipAction (admin edit any BIP, no status change, no email)"
  - "AdminEditFooter (Save / Reject / Approve panel for Step 5)"
  - "getAdminBipForEdit query (loads any BIP regardless of ownership/status)"
  - "/admin/bips/[id]/edit RSC page"
  - "fullBipSchema export (canonical cross-field BIP validator)"
affects:
  - components/forms/BipSubmissionWizard.tsx
  - lib/store/bip-draft.ts (no changes — suppression happens at wizard level)
  - lib/actions/admin-bips.ts
  - lib/queries/adminBips.ts
  - lib/schemas/bip-wizard.ts
  - components/admin/AdminEditFooter.tsx (new)
  - app/(admin)/admin/bips/[id]/edit/page.tsx (new)
tech-stack:
  added: []
  patterns:
    - "Mode-prop wizard reuse (Phase 2 form, Phase 3 admin context)"
    - "Live data binding via Zustand store (footer reads useBipDraft directly)"
    - "Pre-image read for slug stability + conditional ISR revalidation"
    - "Exported flat cross-field Zod schema for sharing between server actions"
key-files:
  created:
    - components/admin/AdminEditFooter.tsx
    - app/(admin)/admin/bips/[id]/edit/page.tsx
  modified:
    - components/forms/BipSubmissionWizard.tsx
    - lib/actions/admin-bips.ts
    - lib/queries/adminBips.ts
    - lib/schemas/bip-wizard.ts
key-decisions:
  - "Admin mode reads draft from Zustand store inside AdminEditFooter (Option 1, smaller patch than extending the wizard's renderPreviewStep contract)"
  - "fullBipSchema exported from lib/schemas/bip-wizard.ts (not re-declared inline in admin-bips.ts) so admin + coordinator submit paths share one validator"
  - "getAdminBipForEdit (new) chosen over reusing getAdminBipById — the latter returns BipDetail (public-page shape) and the wizard needs flat BipDraftData"
  - "Zustand store NOT modified — suppression of localStorage/auto-save happens entirely at the wizard level via the mode prop, keeping the store unaware of admin context"
  - "Slug NOT updated on admin edit (T-03-16 — ISR cache key stability for already-approved BIPs)"
  - "Status NOT changed on admin edit (D-18 — admin uses Approve/Reject buttons for transitions)"
  - "No coordinator email on admin edit (D-18 — admin edits are trusted; audit row is the forensic trail)"
requirements-completed: [ADMN-05, ADMN-08]
duration: 13 min
completed: 2026-05-12
---

# Phase 3 Plan 07: Admin Edit Any BIP Summary

Vertical slice that closes ADMN-05 and finishes the ADMN-08 audit-log
matrix: admin clicks Edit on any BIP row → opens the Phase 2 wizard in
admin mode (D-17 banner, no localStorage, no auto-save) → saves
explicitly via `adminUpdateBipAction` → audit row written with
`action_kind='admin_edit'` → public ISR busted only when the pre-image
status was `'approved'` (D-18 / T-03-11). No coordinator email fires.
Phase 3 is now feature-complete.

**Duration:** 13 minutes.
**Tasks:** 4 (3 autonomous + 1 human-verify checkpoint deferred).
**Files:** 2 created, 4 modified.
**Commits:** 3 (per-task atomic).

## Commits

| # | Hash      | Subject                                                        |
|---|-----------|----------------------------------------------------------------|
| 1 | `679aaf3` | feat(03-07): add mode='admin' to BipSubmissionWizard           |
| 2 | `28cc451` | feat(03-07): add adminUpdateBipAction + AdminEditFooter        |
| 3 | `f96e140` | feat(03-07): admin edit page + getAdminBipForEdit query        |

## Plan-required output disclosures

The plan's `<output>` block asks for six specific disclosures:

1. **Exact variable name(s) for the wizard's hydrate/auto-save hooks**
   - Hydration: `hydrate` + `hydrateFromServer` (destructured from
     `useBipDraft()` in BipSubmissionWizard.tsx, line ~122).
   - Auto-save: `debouncedAutoSave` (a `useDebouncedCallback` wrapping
     `performSave`, which calls `saveDraftAction` from
     `lib/actions/bip-draft.ts`).
   - SIGNED_OUT recovery hook: anonymous `onAuthStateChange` listener
     that calls `persistToLocalStorage()`.
   All three are now gated by `if (mode === 'admin')` early-returns.

2. **Exact validator chosen from lib/schemas/bip-wizard.ts for adminUpdateBipAction**
   - `fullBipSchema` — a new export added in this plan that mirrors
     the private `submitSchema` inside `lib/actions/bip-submit.ts`. The
     export was necessary because `submitSchema` lived inside a
     `'use server'` module and could not be imported from a peer
     action. The two schemas must be kept in sync; the export's
     docstring calls this out.

3. **Whether the Zustand store needed any modification**
   - **No.** `lib/store/bip-draft.ts` is unchanged. Suppression of
     localStorage hydration, auto-save, and SIGNED_OUT persistence all
     happens at the BipSubmissionWizard level via the `mode` prop.
     The store remains mode-agnostic.

4. **Whether TwoTabConflictDialog import path matched assumption**
   - **Yes.** Lives at `components/forms/TwoTabConflictDialog.tsx` —
     same path as the coordinator edit page uses. Imported in
     `app/(admin)/admin/bips/[id]/edit/page.tsx` with no path
     adjustment.

5. **Outcomes of the 12-step final integration checkpoint (Task 4)**
   - **Steps 1-11 (manual UI verification):** Deferred — autonomous
     executor cannot drive `supabase start && npm run dev` + admin
     browser sign-in. These are handed off to the user as part of the
     post-merge verification gate.
   - **Step 12 (automated CI):**
     - `npx tsc --noEmit` → EXIT 0
     - `npx next lint` (full repo) → EXIT 0
     - `npm run build` → EXIT 0 (route table shows
       `/admin/bips/[id]/edit` at 2.82 kB / 336 kB First Load)
     - `npx vitest run` → 40/40 tests pass

6. **Phase 3 milestone roll-up — ADMN-01..11 confirmation**
   - **ADMN-01** Admin login surface — Plan 03-01.
   - **ADMN-02** Admin queue (pending FIFO) — Plan 03-02.
   - **ADMN-03** Approve BIP — Plan 03-03.
   - **ADMN-04** Reject BIP with reason — Plan 03-04.
   - **ADMN-05** Admin edit any BIP — **this plan**.
   - **ADMN-06** All-listings view — Plan 03-06.
   - **ADMN-07** Admin analytics dashboard — Plan 03-06.
   - **ADMN-08** Status-history audit log — completed across
     Plans 03-03, 03-04, **this plan** (`admin_edit` row), and the
     trigger from Phase 1 migration 00010 (`submit` / `resubmit` /
     `withdraw`). All six action_kind values are now exercised.
   - **ADMN-09** Approval email — Plan 03-03.
   - **ADMN-10** Rejection email — Plan 03-04.
   - **ADMN-11** Admin-notification email on submit — Plan 03-05.

   **All 11 admin requirements satisfied.** Phase 3 vertical slices
   complete.

## Acceptance summary

All `<acceptance_criteria>` from Tasks 1-3 pass automatically:

| Criterion                                                                                  | Pass |
|--------------------------------------------------------------------------------------------|------|
| BipSubmissionWizard Props includes `mode?: 'coordinator' \| 'admin'`                       | yes  |
| Banner copy literal `Editing as admin — coordinator will not be notified.` present         | yes  |
| Hydrate effect early-returns when `mode === 'admin'`                                       | yes  |
| Debounced auto-save early-returns when `mode === 'admin'`                                  | yes  |
| Zero `framer-motion` imports                                                               | yes  |
| `adminUpdateBipAction` exported from `lib/actions/admin-bips.ts`                           | yes  |
| `action_kind: 'admin_edit'` literal present                                                | yes  |
| `adminUpdateBipAction` does NOT call `validateTransition` (only approve + reject do)       | yes  |
| `adminUpdateBipAction` revalidates `/bips` + `/bip/[slug]` conditionally on `'approved'`   | yes  |
| `adminUpdateBipAction` does NOT call `sendEmail`                                           | yes  |
| `adminUpdateBipAction` does NOT include `status:` in the UPDATE payload                    | yes  |
| `AdminEditFooter` exports with `'use client'`, renders Save / Reject / Approve             | yes  |
| Reject button gated to `pending` or `approved`; Approve button gated to `pending`          | yes  |
| Zero `createAdminClient` import in admin paths                                             | yes  |
| `/admin/bips/[id]/edit/page.tsx` calls `getAdminBipForEdit`, 404s on null                  | yes  |
| Page renders BipSubmissionWizard with `mode="admin"` and AdminEditFooter via renderPreview | yes  |
| Footer reads draft from Zustand store (Option 1 live binding)                              | yes  |
| Zero `getSession` / `createAdminClient` in page                                            | yes  |
| `npm run build` exits 0                                                                    | yes  |
| `npx vitest run` exits 0                                                                   | yes  |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Plan referenced `npm run typecheck` which does not exist**
- **Found during:** Task 1 verification
- **Issue:** Plan's `<verify>` blocks call `npm run typecheck`, but
  `package.json` only defines `dev`, `build`, `lint`, `test`. There
  is no `typecheck` script.
- **Fix:** Used `npx tsc --noEmit` directly, which is the underlying
  command and matches the plan's intent. Did not modify package.json
  (out of scope — pre-existing convention).
- **Files modified:** None (verification only).
- **Verification:** `npx tsc --noEmit` exits 0 after each task.

**2. [Rule 2 - Missing critical] Plan ambiguous about query name (`getAdminBipById` vs `getAdminBipForEdit`)**
- **Found during:** Task 3 planning
- **Issue:** Plan's `<files>` lists `lib/queries/adminBips.ts` and the
  prompt mentions adding `getAdminBipForEdit(id)`, but the action
  body's pseudo-code and acceptance-criteria grep test both invoke
  `getAdminBipById`. The existing `getAdminBipById` returns
  `BipDetail` (the public-page shape) — the wizard needs flat
  `BipDraftData`. Reusing `getAdminBipById` would require a second
  adapter pass on the page (or re-querying the partners + status).
- **Fix:** Added a new `getAdminBipForEdit(id)` query that returns
  the canonical `{ id, data: BipDraftData, updatedAt, hostUniversity,
  status, title, coordinatorName }` shape the page needs in one
  roundtrip. The page imports and uses `getAdminBipForEdit`.
- **Files modified:** `lib/queries/adminBips.ts`,
  `app/(admin)/admin/bips/[id]/edit/page.tsx`.
- **Verification:** Build + lint + tsc all green.

**3. [Rule 2 - Missing critical] adminUpdateBipAction needed a shared cross-field validator**
- **Found during:** Task 2 implementation
- **Issue:** The plan's pseudo-code references a `BipDraftSchema`
  from `lib/schemas/bip-wizard.ts` but no such named export existed.
  The canonical cross-field validator was a private `submitSchema`
  inside `'use server'` module `lib/actions/bip-submit.ts` — not
  importable from another action. Without a shared validator the
  admin path would have to either (a) duplicate the cross-field
  rules (drift risk per T-03-04) or (b) skip server-side validation
  entirely (security regression).
- **Fix:** Exported a new `fullBipSchema` from
  `lib/schemas/bip-wizard.ts` that mirrors the private `submitSchema`
  verbatim. Imported it into `lib/actions/admin-bips.ts` for the
  admin Zod re-validation. The export's docstring records that the
  two schemas must stay in sync.
- **Files modified:** `lib/schemas/bip-wizard.ts`,
  `lib/actions/admin-bips.ts`.
- **Verification:** Admin save now re-validates the full draft
  before any DB write (T-03-04 mitigation satisfied).

**Total deviations:** 3 auto-fixed (1 blocker tooling issue, 2 missing
critical APIs/exports). **Impact:** Net additive — no behavior changes
to existing Phase 2 / Phase 3 flows; admin edit now has the same
validation surface as coordinator submit.

## Authentication Gates

None. All auth flows were satisfied by the existing `getClaims()`
infrastructure shipped in Plans 03-01..03-04.

## Known Stubs

None. All new code paths are wired end-to-end; no placeholder data or
"coming soon" UI was introduced.

## Threat Flags

None new. The threat register in the plan's `<threat_model>` covers
all introduced surface (admin auth gate, wizard data validation,
audit row, conditional revalidatePath, slug stability, silent edit
audit trail).

## Issues Encountered

None. All tasks executed cleanly with the three auto-fixed deviations
documented above.

## TDD Gate Compliance

Not applicable — plan type was `execute`, not `tdd`. No RED/GREEN/
REFACTOR cycle expected.

## Phase 3 Readiness

Phase 3 is complete. All 11 admin requirements (ADMN-01..11) are
satisfied across the 8 plans. Ready to ship; the next step is the
manual integration smoke (Task 4 steps 1-11) and the user-facing
acceptance walkthrough on the merged branch.

## Self-Check: PASSED

- [x] `components/admin/AdminEditFooter.tsx` exists on disk
- [x] `app/(admin)/admin/bips/[id]/edit/page.tsx` exists on disk
- [x] `679aaf3` reachable in `git log --oneline`
- [x] `28cc451` reachable in `git log --oneline`
- [x] `f96e140` reachable in `git log --oneline`
- [x] `npm run build` exits 0
- [x] `npx vitest run` 40/40 pass
- [x] All `<acceptance_criteria>` PASS (table above)
- [x] All `<verification>` grep checks PASS
