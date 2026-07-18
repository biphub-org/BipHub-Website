---
phase: 09-coordinator-bip-builder-completion
plan: 04
subsystem: ui
tags: [react-hook-form, zod, wizard, zustand, tailwind-v4]

# Dependency graph
requires:
  - phase: 09-coordinator-bip-builder-completion
    provides: "Plan 09-02's corrected VIRTUAL_TIMINGS 5-value enum, max_participants floor of 10, and the four new optional field validators/draft-store fields (virtual_sessions_count, virtual_duration_notes, partner_institutions_only, accommodation_notes)"
provides:
  - "Step 2 (WizardStep2ProgramDetails.tsx): 5-option virtual_timing select matching the DB CHECK exactly, max_participants floor of 10 in the UI, and new virtual_sessions_count / virtual_duration_notes inputs wired into useForm defaultValues"
  - "Step 3 (WizardStep3Partners.tsx): partner_institutions_only checkbox using the non-RHF useState + mergeDraft mirroring pattern (matches the existing partners[] discipline)"
  - "Step 4 (WizardStep4ApplicationInfo.tsx): accommodation_notes textarea FormField modeled on eligibility_notes"
affects: [09-05, 09-06, 09-07, 09-08, 09-09 (any downstream plan rendering or persisting these four fields — BipDetail adapters, submit/edit actions, E2E round-trip verification)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Step 3 non-RHF field mirroring: useState + onCheckedChange calling both the local setter and mergeDraft({ field }) directly — no <FormField> wrapper, since Step 3 has no <Form> context"

key-files:
  created: []
  modified:
    - components/forms/steps/WizardStep2ProgramDetails.tsx
    - components/forms/steps/WizardStep3Partners.tsx
    - components/forms/steps/WizardStep4ApplicationInfo.tsx

key-decisions:
  - "Step 3's handleSubmit now parses { partner_universities, partner_institutions_only } together through step3Schema so the on-continue value and the draft-store mirror stay in sync, rather than parsing partners alone and relying solely on the mergeDraft side-channel"

requirements-completed: [SUBM-09, SUBM-10, SUBM-11, SUBM-12, SUBM-13]

# Metrics
duration: 3min
completed: 2026-07-18
---

# Phase 09 Plan 04: Wire Builder-Completion Fields into the Wizard UI Summary

**Wired the four new builder-completion fields into the wizard's three steps — Step 2 gained a corrected 5-option virtual_timing selector plus virtual-session-count/duration-notes inputs, Step 3 gained a non-RHF partner-only checkbox mirrored into Zustand, and Step 4 gained an accommodation_notes textarea — closing the schema-to-UI gap left by Plan 09-02.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-07-18T09:53:xx+03:00
- **Completed:** 2026-07-18T09:55:09+03:00
- **Tasks:** 3 completed
- **Files modified:** 3

## Accomplishments
- `WizardStep2ProgramDetails.tsx`: `virtual_timing` `<select>` rebuilt to the exact 5 DB-valid values (before/during/after/before_and_after/mixed) — the legacy `concurrent` option, which silently failed the DB CHECK, is fully removed; `max_participants` floor raised to `min={10}` in the UI with updated copy ("10–20 participants"); new `virtual_sessions_count` number input and `virtual_duration_notes` textarea added and registered in `useForm` defaultValues (auto-saved via the existing `form.watch` -> `mergeDraft`/`onAutoSave` effect, no new watch wiring needed)
- `WizardStep3Partners.tsx`: added `partnerOnly` state (`useState<boolean>(draft.partner_institutions_only ?? false)`) rendered as a `<Checkbox>` below the "Selected partners" list with label "Open only to partner-institution students"; `onCheckedChange` mirrors into both local state and `mergeDraft({ partner_institutions_only })`, matching the exact non-RHF `commit()` discipline already used for the `partners` array; `handleSubmit`'s `step3Schema.safeParse` call now includes `partner_institutions_only` alongside `partner_universities`
- `WizardStep4ApplicationInfo.tsx`: added `accommodation_notes` `<Textarea>` `FormField`, modeled field-for-field on the existing `eligibility_notes` block (same placeholder-only styling, no `FormDescription`), with `accommodation_notes: draft.accommodation_notes ?? ''` in `useForm` defaultValues; propagated automatically by the existing `form.watch` effect
- Full verification passed: no `concurrent` reference remains in Step 2 outside comments; all 4 field-name greps across the three files resolve to exactly 4 unique tokens; `npx tsc --noEmit` exits 0; full Vitest suite (76/76) stays green

## Task Commits

Each task was committed atomically:

1. **Task 1: Step 2 — virtual session detail, 5-option timing, participant floor** - `387be92` (feat)
2. **Task 2: Step 3 — partner-only checkbox (non-RHF)** - `2bf0e37` (feat)
3. **Task 3: Step 4 — accommodation notes textarea** - `8fe5eec` (feat)

**Plan metadata:** (this commit, docs)

## Files Created/Modified
- `components/forms/steps/WizardStep2ProgramDetails.tsx` - 5-option `virtual_timing` select, `max_participants` floor of 10, new `virtual_sessions_count`/`virtual_duration_notes` FormFields
- `components/forms/steps/WizardStep3Partners.tsx` - `partnerOnly` state + `<Checkbox>` mirrored into `mergeDraft`, non-RHF pattern preserved; `handleSubmit` parse payload extended
- `components/forms/steps/WizardStep4ApplicationInfo.tsx` - `accommodation_notes` FormField modeled on `eligibility_notes`

## Decisions Made
- Extended Step 3's `step3Schema.safeParse` call to include `partner_institutions_only` (not just `partner_universities`) so the value returned to `onContinue` reflects the checkbox state too, rather than relying purely on the `mergeDraft` side-channel to keep the draft store correct — keeps the on-continue payload and the store consistent with each other.

## Deviations from Plan

None - plan executed exactly as written. All locked field placements (D-02 Step 2, D-01 Step 3 via mergeDraft, D-03 Step 4 via the eligibility_notes RHF pattern) were followed verbatim.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All four builder-completion fields are now enterable end-to-end from the wizard UI down to the Zustand draft store (Plan 09-02's contract). Downstream plans writing these fields to `bips`/`bip_edits` on submit/edit (already wired in `lib/actions/bip-submit.ts` per 09-02) and any BipDetail-page rendering work can proceed without further schema or UI gaps.
- No blockers identified for Plan 09-05 or later waves in this phase.

---
*Phase: 09-coordinator-bip-builder-completion*
*Completed: 2026-07-18*

## Self-Check: PASSED

- FOUND: components/forms/steps/WizardStep2ProgramDetails.tsx
- FOUND: components/forms/steps/WizardStep3Partners.tsx
- FOUND: components/forms/steps/WizardStep4ApplicationInfo.tsx
- FOUND: .planning/phases/09-coordinator-bip-builder-completion/09-04-SUMMARY.md
- FOUND commit: 387be92
- FOUND commit: 2bf0e37
- FOUND commit: 8fe5eec
