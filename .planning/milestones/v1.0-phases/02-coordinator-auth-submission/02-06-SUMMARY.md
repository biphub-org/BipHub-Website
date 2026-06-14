---
phase: 02-coordinator-auth-submission
plan: "06"
subsystem: wizard-core
tags: [wizard, zustand, rhf, zod-v3, server-actions, optimistic-locking, motion, sonner]

requires:
  - phase: 02-coordinator-auth-submission
    plan: "01"
    provides: shadcn primitives (Form/Input/Textarea/Checkbox/Switch), STATUS tokens, slugify dep
  - phase: 02-coordinator-auth-submission
    plan: "04"
    provides: UniversityCombobox (@base-ui/react/popover composition), searchUniversitiesAction + UniversitySearchResult type, profile-locked host university id
  - phase: 02-coordinator-auth-submission
    plan: "05"
    provides: dashboard chrome + Sonner Toaster mount
provides:
  - lib/utils/slug.ts (generateDraftSlug + finalizeSlug)
  - lib/schemas/bip-wizard.ts (step1Schema..step4Schema, Zod v3, ISCED enum sourced from ISCED_FIELDS)
  - lib/store/bip-draft.ts (Zustand bipDraftStore mirroring bookmarks manual-hydration)
  - lib/actions/bip-draft.ts (saveDraftAction — insert with draft slug + optimistic-lock update)
  - components/forms/BipSubmissionWizard.tsx (wizard shell with render-prop slots for Step 5 + ConflictDialog)
  - components/forms/SaveStatusIndicator.tsx (idle/saving/failed Retry surface)
  - components/forms/steps/WizardStep1BasicInfo.tsx
  - components/forms/steps/WizardStep2ProgramDetails.tsx
  - components/forms/steps/WizardStep3Partners.tsx
  - components/forms/steps/WizardStep4ApplicationInfo.tsx
affects: [02-07-wizard-submit]

tech-stack:
  added: []
  patterns:
    - "Optimistic-lock UPDATE: .eq('id', bipId).eq('created_by', userId).eq('updated_at', lastKnownUpdatedAt).select().maybeSingle() — 0 rows ⇒ {error:'conflict'}"
    - "Draft slug strategy: draft-{slugify(title|'untitled')}-{uuid8} on first INSERT; finalizeSlug runs at submit time (Plan 02-07)"
    - "Zustand draft store with manual hydrate() + explicit persistToLocalStorage() (no auto-persist on every change) + clearDraft() — same shape as bookmarks store"
    - "Per-step RHF + zodResolver(stepNSchema); form.watch subscription mirrors changes into Zustand and triggers wizard's 1.5s debounce"
    - "Wizard footer submit button targets the active step's <form id='wizard-step-N-form'> via the form attribute — keeps RHF submission contained inside each step"
    - "Render-prop slots (renderPreviewStep, renderConflictDialog) let Plan 02-07 plug Step 5 + TwoTabConflictDialog without re-editing the wizard"
    - "Belt-and-suspenders session-expiry: onAuthStateChange SIGNED_OUT primary path + saveDraftAction returning {error:'auth'} fallback; both persistToLocalStorage + redirect /login"
    - "Free-text partner pattern: Step 3 maintains Zustand-only partner array (saveDraftAction strips it because bip_partner_universities requires bip_id) — partners are written by Plan 02-07's submitBipAction"

key-files:
  created:
    - lib/utils/slug.ts
    - lib/schemas/bip-wizard.ts
    - lib/store/bip-draft.ts
    - lib/actions/bip-draft.ts
    - components/forms/SaveStatusIndicator.tsx
    - components/forms/BipSubmissionWizard.tsx
    - components/forms/steps/WizardStep1BasicInfo.tsx
    - components/forms/steps/WizardStep2ProgramDetails.tsx
    - components/forms/steps/WizardStep3Partners.tsx
    - components/forms/steps/WizardStep4ApplicationInfo.tsx
  modified: []

key-decisions:
  - "ISCED enum sourced from ISCED_FIELDS.id (the URL-safe identifier locked by Plan 01-06's /bips?field= contract) instead of a non-existent ISCED_F_CODES export. The `id` keeps coordinator-submitted BIPs filterable in the public catalog without re-mapping at submit time."
  - "fullBipSchema deliberately omitted from this plan — Zod refinement merges produce awkward types and Plan 02-07's submitBipAction will declare its own flat schema with cross-step refinements re-applied at the top level."
  - "Step 3 uses local React state for partners + per-change mergeDraft mirror, NOT RHF — this is intentional because (a) the chip list isn't a single form field and (b) saveDraftAction strips partner_universities so debounced auto-save would be a no-op for it."
  - "Step 4 conditional reveal animates with motion/react + LazyMotion (m.div opacity transition); never framer-motion (CLAUDE.md never-do)."
  - "Wizard hydration sequence: (a) initialBip → hydrateFromServer (Plan 02-07's edit page); (b) no initialBip → hydrate() reads localStorage. Both paths set hydrated=true so the loading placeholder yields."
  - "Conflict overwrite handler reads latest updated_at via the browser client and re-issues the lock-aware update; this preserves single-tab consistency from that point onward (T-02-06-09 mitigation)."
  - "Partner duplicate check + host-university block are enforced in Step 3 client-side (T-02-06-01 + UX guard); the server-side write happens in Plan 02-07."

requirements-completed: [SUBM-01, SUBM-02, SUBM-04, SUBM-05, SUBM-06, SUBM-07]

duration: ~12min
completed: 2026-05-09
---

# Phase 02-06: Wizard Core Summary

**Wizard core delivered: a coordinator can navigate the 4 input steps, every blurred change auto-saves after 1.5s via a getClaims()-validated Server Action with optimistic locking on `updated_at`, partner universities (registered or free-text with `(unverified)` flag) live in the Zustand draft store, session expiry catches `SIGNED_OUT` and persists to localStorage before redirecting to /login, and the wizard exposes render-prop slots so Plan 02-07 can drop in the Preview step + TwoTabConflictDialog without re-editing this file.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 2 of 2 executed
- **Files created:** 10 (1 store + 1 schema + 1 action + 1 utility + 1 wizard shell + 1 status indicator + 4 step components)
- **Files modified:** 0

## Accomplishments

- SUBM-01..SUBM-07 reachable from a wizard mount:
  - SUBM-01: 5-step wizard with click-to-jump on already-reached steps; the step indicator + body + footer all animate via `motion/react` + `LazyMotion`.
  - SUBM-02: 1.5s debounced auto-save on field blur (per UI-SPEC D-02). Save & Continue runs a synchronous save and only advances on success.
  - SUBM-04: every required Erasmus+ field captured in `step1Schema..step4Schema` (Zod v3); cross-field refinements (`physical_start < physical_end`, `deadline < physical_start`, `url XOR contact`) live in the schemas themselves.
  - SUBM-05: Step 3 supports both the registered-university combobox AND a free-text fallback marked `isVerified: false`; selected partners render as a chip list with a delete button.
  - SUBM-06: optimistic locking via `.eq('updated_at', lastKnownUpdatedAt)` returns `{error:'conflict'}` on stale writes; the wizard opens the conflict dialog (rendered by Plan 02-07's TwoTabConflictDialog via the `renderConflictDialog` slot).
  - SUBM-07: `onAuthStateChange('SIGNED_OUT')` persists the Zustand store to `localStorage["biphub:draft"]` and redirects to `/login`; the same recovery path triggers when `saveDraftAction` returns `{error:'auth'}` (RESEARCH A4 belt-and-suspenders).
- Draft slug strategy (Pitfall 3): first insert generates `draft-{slugify(title|'untitled')}-{uuid8}`; the slug is finalized by Plan 02-07's `submitBipAction`.
- Server Action contract: `'use server'`, `getClaims()` only (zero `getSession(` substrings), `await createClient()` on every call. The action strips `partner_universities` from the auto-save payload because the partner table requires a finalized `bip_id`.

## Task Commits

1. **Task 1: Zustand store + schemas + slug + saveDraftAction** — `d488999` (feat) — `lib/store/bip-draft.ts`, `lib/schemas/bip-wizard.ts`, `lib/utils/slug.ts`, `lib/actions/bip-draft.ts`.
2. **Task 2: Wizard shell + SaveStatusIndicator + 4 step components** — `acc7de0` (feat) — `components/forms/BipSubmissionWizard.tsx`, `components/forms/SaveStatusIndicator.tsx`, `components/forms/steps/WizardStep{1,2,3,4}*.tsx`.

## Files Created

- `lib/utils/slug.ts` — `generateDraftSlug(title, suffix?)` for the wizard's first INSERT (uses `crypto.randomUUID().slice(0, 8)` when no suffix supplied) + `finalizeSlug(title, erasmusCode, year)` for Plan 02-07.
- `lib/schemas/bip-wizard.ts` — Zod v3 step1Schema..step4Schema. ISCED enum keyed off `ISCED_FIELDS.id` (URL-safe identifier locked by Plan 01-06 contract). Step 4 enforces "URL XOR contact" via `.refine(...)`.
- `lib/store/bip-draft.ts` — Zustand store. State: `bipId, currentStep, draft, lastKnownUpdatedAt, saveStatus, hydrated`. Actions: `setBipId, setCurrentStep, mergeDraft, setLastKnownUpdatedAt, setSaveStatus, hydrate, hydrateFromServer, persistToLocalStorage, clearDraft`. Same SSR-safe `typeof window === 'undefined'` guards + `if (get().hydrated) return` once-only pattern as `bookmarks.ts`.
- `lib/actions/bip-draft.ts` — `saveDraftAction(stepData, bipId, lastKnownUpdatedAt)` returning `{success, bipId, updatedAt} | {error: 'conflict' | 'auth' | 'unknown', message?}`. Insert path generates draft slug, hard-codes `status: 'draft'`. Update path uses `.maybeSingle()` so 0-row matches surface as conflicts (not errors).
- `components/forms/SaveStatusIndicator.tsx` — `'use client'`. Reads `saveStatus` from Zustand and renders Saved / Saving… / Save failed — Retry text per UI-SPEC line 244-248.
- `components/forms/BipSubmissionWizard.tsx` — `'use client'`. The shell: hydration → onAuthStateChange listener → `performSave` callback → `useDebouncedCallback(1.5s)` → step indicator + body + footer. Step 5 + ConflictDialog plugged in via render-prop slots (`renderPreviewStep`, `renderConflictDialog`).
- `components/forms/steps/WizardStep1BasicInfo.tsx` — title (with character counter) + ISCED-F native `<select>` populated from `ISCED_FIELDS` + description + learning_outcomes textareas; RHF + step1Schema; `form.watch` mirrors into Zustand and triggers debounced auto-save.
- `components/forms/steps/WizardStep2ProgramDetails.tsx` — virtual textarea + virtual_timing select + host_city + 3 native `<input type="date">` fields + ECTS / max_participants number inputs + study_levels Checkbox group + language_of_instruction + CEFR-level select.
- `components/forms/steps/WizardStep3Partners.tsx` — locked host-university callout + reused `<UniversityCombobox>` from Plan 02-04 for registered partners + free-text subform with country select. Validates via `step3Schema`. Mirrors partners into Zustand on every change but does NOT trigger debounced auto-save (saveDraftAction strips them).
- `components/forms/steps/WizardStep4ApplicationInfo.tsx` — green_travel + inclusion_support shadcn `<Switch>` toggles + eligibility_notes textarea + how_to_apply_type radio with conditional reveal of either URL field or contact name + email pair via `motion/react` + `LazyMotion` opacity transition.

## Decisions Made

See `key-decisions` in frontmatter. The single notable plan-vs-stack adaptation:

- The plan's snippet imports `ISCED_F_CODES` from `@/lib/isced`, but the actual canonical export from Plan 01-06 is `ISCED_FIELDS` (an 8-entry list of `{id, label, isced}`). Used the real export name and keyed the Zod enum off `ISCED_FIELDS.id` — same semantics (URL-safe identifier list), keeps coordinator-submitted BIPs filterable in the public `/bips?field=` catalog without a remap at submit time. The bips column `isced_f_code` accepts the same string range used by the public catalog filter, so no schema migration is needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Plan referenced `ISCED_F_CODES` but the canonical export is `ISCED_FIELDS`**

- **Found during:** Task 1 (writing `lib/schemas/bip-wizard.ts`).
- **Issue:** The plan snippet imports `ISCED_F_CODES` from `@/lib/isced`, but Plan 01-06's `lib/isced.ts` exports `ISCED_FIELDS` with shape `{id, label, isced}` (8 broad fields locked by the public `/bips?field=` filter contract).
- **Fix:** Imported `ISCED_FIELDS` and built the Zod enum from `ISCED_FIELDS.map((f) => f.id)`. The native `<select>` in Step 1 renders `f.label` and submits `f.id`. Same identifier set used by the public catalog — keeps coordinator-submitted BIPs filterable without re-mapping.
- **Files modified:** `lib/schemas/bip-wizard.ts`, `components/forms/steps/WizardStep1BasicInfo.tsx`.
- **Commits:** `d488999` (schema), `acc7de0` (step component).

**2. [Rule 3 — Blocking] Plan's `data: { claims }` inline destructure trips TS2339**

- **Found during:** Task 1 (`npx tsc --noEmit` after writing `saveDraftAction`).
- **Issue:** Same Supabase SSR types regression that Plans 02-02 and 02-04 hit — the outer `data` returned by `getClaims()` is nullable, so `const { data: { claims } } = ...` fails with TS2339.
- **Fix:** Adopted the established project pattern: `const { data: claimsData, error: authError } = ...` + `claimsData?.claims?.sub` guard. Behaviour preserved.
- **Files modified:** `lib/actions/bip-draft.ts`.
- **Commit:** `d488999`.

**3. [Rule 3 — Blocking] Plan's `fullBipSchema` snippet does not type-check**

- **Found during:** Task 1 (the snippet uses `step2Schema._def.schema as unknown as z.ZodObject<...>` — invalid).
- **Issue:** Zod refinement chains (`.refine(...)`) wrap the inner ZodObject in a ZodEffects, and the snippet's cast lands on a placeholder type that produces `any`-flavoured errors. The plan itself notes this is awkward and offers omission as an acceptable alternative ("If the `fullBipSchema` merge is awkward (Zod refinement merge limitations), simply omit it from this file and let Plan 02-07 declare its own flat submit schema.").
- **Fix:** Omitted `fullBipSchema` — Plan 02-07 will declare a flat submit schema with refinements re-applied at the top level. The four step schemas are sufficient for everything Plan 02-06 needs (per the plan's own done criteria).
- **Files modified:** `lib/schemas/bip-wizard.ts` (no `fullBipSchema` export).
- **Commit:** `d488999`.

---

**Total deviations:** 3 auto-fixed (1 export-name correction, 1 destructure pattern already established as the project standard, 1 explicitly-allowed omission). All required for build correctness or were called out as acceptable in the plan itself. No scope creep.

## Verification Performed

- `npx tsc --noEmit` exits 0 (full project, post-Task-2).
- `npx next build` ✓ Compiled successfully in 22.9s. The wizard component is not yet wired to a route (entry pages land in Plan 02-07), so it does not appear in the route table — that is expected behaviour for this plan.
- All four plan-defined automated checks pass:
  - Task 1: file-content regex check (`useBipDraft`, `hydrate:`, `persistToLocalStorage`, `clearDraft`, `hydrateFromServer`, `'biphub:draft'`, `step1Schema..step4Schema`, `'use server'`, `saveDraftAction`, `.eq('updated_at', lastKnownUpdatedAt)`, `generateDraftSlug`, `finalizeSlug`, `getClaims`, no `getSession(`) → OK.
  - Task 2 file existence: 6/6 files present → OK.
  - Task 2 wizard semantics check (`'use client'`, `onAuthStateChange`, `useDebouncedCallback`, `saveDraftAction`, `persistToLocalStorage`, `LazyMotion`, no `framer-motion`, `motion/react`, Step 1 `'use client'` + `zodResolver` + `step1Schema` + `form.watch`) → OK.
  - `npx tsc --noEmit` and `npx next build` both succeed.

End-to-end browser verification (mount the wizard at a route, walk through the 4 steps, observe the Saving…/Saved indicator, induce a conflict, expire the session) requires Plan 02-07 to land the entry pages and ConflictDialog. The wizard's render-prop slots are typed so Plan 02-07 can wire them without modifying this file.

## Threat Model Compliance

All STRIDE register entries with `mitigate` disposition are implemented:

| Threat ID    | Mitigation Implemented |
|--------------|------------------------|
| T-02-06-01   | `saveDraftAction` filters `.eq('id', bipId).eq('created_by', userId)` — RLS `bips_update_own_draft_or_pending` is the second layer; mismatch returns 0 rows → `{error:'conflict'}` |
| T-02-06-02   | `.eq('updated_at', lastKnownUpdatedAt)` is the optimistic lock; conflict opens the wizard's conflict dialog slot (Plan 02-07 owns the dialog component) |
| T-02-06-04   | `clearDraft()` exposed for Plan 02-07 to call after submit; on session expiry the draft persists intentionally as recovery, but the user lands on /login first |
| T-02-06-05   | `generateDraftSlug` produces a unique-per-record slug on first INSERT (uuid suffix) so `bips.slug` NOT NULL is always satisfied |
| T-02-06-06   | `saveDraftAction` hard-codes `status: 'draft'` on insert and never sets status on update; RLS `bips_update_own_draft_or_pending` rejects status promotion attempts |
| T-02-06-09   | `handleOverwrite` reads latest `updated_at` via the browser client and re-issues the lock-aware update — preserves single-tab consistency from that point onward |

`accept`-disposition entries (T-02-06-03 partial-draft, T-02-06-07 mutation-flooding, T-02-06-08 SIGNED_OUT-leak) are unchanged — Phase-2 risk acceptance documented in the plan's threat register.

## Issues Encountered

- None blocking. The three deviations above were caught by `npx tsc --noEmit` (deviations 2 + 3) or by reading `lib/isced.ts` before the schema write (deviation 1).
- `npx next build` emits a benign warning about multiple lockfiles (workspace + worktree). Pre-existing — not introduced by this plan.

## User Setup Required

None — wizard mounts at a route in Plan 02-07. To exercise locally after 02-07 lands: register a coordinator at `/register`, complete onboarding, click "+ Submit a BIP" on `/dashboard`, walk through steps 1-4.

## Next Phase Readiness

- **Plan 02-07 (wizard submit)** can now:
  - Create `app/(dashboard)/bips/new/page.tsx` and `app/(dashboard)/bips/[id]/edit/page.tsx` that fetch `hostUniversity` + `initialUniversities` server-side and pass them to `<BipSubmissionWizard>`.
  - Implement Step 5 Preview as a component passed via `renderPreviewStep` — it can call a new `submitBipAction` from `lib/actions/bip-submit.ts`.
  - Implement `TwoTabConflictDialog` and pass it via `renderConflictDialog` — the wizard already wires `onReload` (router.refresh) and `onOverwrite` (latest-updated-at re-issue) handlers.
  - Implement `submitBipAction` that finalizes the slug via `finalizeSlug(title, erasmusCode, year)` from `lib/utils/slug.ts`, writes `bip_partner_universities` rows from the Zustand `partner_universities` array, sets `status: 'pending'` and `published_at: null`, then calls `clearDraft()` and `redirect('/dashboard?submitted=true')` (which Plan 02-05's dashboard already handles via the `?submitted=true` toast handshake).
  - Re-declare a flat `fullBipSchema` with cross-step refinements re-applied at the top level for submit-time validation.

## Self-Check: PASSED

- [x] `lib/utils/slug.ts` exists and exports `generateDraftSlug` + `finalizeSlug`
- [x] `lib/schemas/bip-wizard.ts` exists, imports from `'zod'` (not `'zod/v4'`), exports `step1Schema..step4Schema`
- [x] `lib/store/bip-draft.ts` exists, exports `useBipDraft`, implements `hydrate / mergeDraft / persistToLocalStorage / clearDraft / hydrateFromServer`
- [x] `lib/actions/bip-draft.ts` exists, starts with `'use server'`, exports `saveDraftAction`, contains zero `getSession(` substrings
- [x] `components/forms/BipSubmissionWizard.tsx` exists, is `'use client'`, uses `onAuthStateChange` + `useDebouncedCallback` + `LazyMotion` + `motion/react` (NOT `framer-motion`)
- [x] `components/forms/SaveStatusIndicator.tsx` exists and reads from `useBipDraft`
- [x] All four step components exist under `components/forms/steps/` and use `zodResolver` + their step schema + `form.watch`
- [x] `npx tsc --noEmit` exits 0
- [x] `npx next build` succeeds
- [x] Commits `d488999` (Task 1) and `acc7de0` (Task 2) present in `git log --oneline`

---
*Phase: 02-coordinator-auth-submission · Plan 06 · Completed: 2026-05-09*
