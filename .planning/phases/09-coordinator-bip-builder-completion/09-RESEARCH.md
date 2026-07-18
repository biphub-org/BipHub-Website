# Phase 9: Coordinator BIP Builder Completion - Research

**Researched:** 2026-07-18
**Domain:** Extending a live Next.js 15.5 + Supabase coordinator content model (wizard -> Zustand draft -> submit/admin-update Server Actions -> `bip_edits` shadow table -> admin merge -> diff view -> seed fixtures). Zero new stack.
**Confidence:** HIGH — every claim below is grounded in direct reads of the current repo (migrations, schemas, Server Actions, query files, wizard components, seed files, e2e specs), not inference from the milestone-level research. Where this document corrects or extends the milestone research (`SUMMARY.md`/`ARCHITECTURE.md`/`PITFALLS.md`), the divergence is called out explicitly.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** `partner_institutions_only` checkbox goes in the **Partners step** (Step 3) — it sits with the partner-institution list it refers to.
- **D-02:** `virtual_sessions_count` + `virtual_duration_notes` go in the **virtual-component step** (Step 2), alongside the existing virtual fields.
- **D-03:** `accommodation_notes` goes in the **application / practical step** (Step 4).
- **D-04:** Fix the `virtual_timing` mismatch by aligning the wizard's option set to the DB CHECK constraint (`before` / `during` / `after` / `before_and_after` / `mixed`). Every selectable option must save without a constraint error.
- **D-05:** Raise the `max_participants` wizard floor from 5 to 10 (Erasmus+ minimum group size). **Before tightening, planning must check existing/seeded BIPs for values below 10 before tightening.** (Resolved below — see Assumptions Log / Open Questions: no existing/seeded row is below 10.)
- **D-06:** Partner-only badge treatment is **noticeable but not alarming** — a restrained badge (amber-ish, not a loud full-width warning, not a quiet grey tag).
- **D-07:** Every new field must be added to all three seed sources (`supabase/seed.sql`, `supabase/seed.e2e.sql`, `scripts/seed-cloud-e2e.mjs`), and the duplicated `bip_edits` content-column literal (`BIP_EDIT_CONTENT_SELECT` in `lib/queries/bipEdits.ts` and `EDIT_CONTENT_SELECT` / `buildMergePayload()` in `lib/actions/admin-edit-bips.ts`) consolidated into one shared constant.
- **D-08:** SUBM-14 acceptance is proven by editing each new field on an approved BIP, having the admin approve, and asserting the value persists on the live row — per field, not just at wizard/diff render.
- **D-09..D-12:** Pre-decided for Phase 10 (detail page) — accommodation as its own conditionally-shown section, partner-only flag same treatment as the card badge, green-travel/inclusion-support framing deferred, overall layout deferred. Not this phase's concern; captured here so they aren't lost.

### Claude's Discretion
- Exact UI control styling within each wizard step (matching existing step components).
- The shared-constant refactor mechanics (D-07).
- Participant-capacity display placement on the detail page (Phase 10, not this phase).

### Deferred Ideas (OUT OF SCOPE)
- BIP detail-page redesign (DETL-11..16) — Phase 10. **Includes all rendering** in `components/bip/BipBody.tsx` / `BipSidebar.tsx` / `BipHeader.tsx`. (This research draws a precise line below: the *type + query* for `lib/queries/bipDetail.ts` IS in Phase 9 scope because the admin diff view depends on it — only the *rendering* is Phase 10.)
- Green-travel / inclusion-support framing — Phase 10.
- `partner_institutions_only` as a browse **filter** — Future (`BROW-15`).
- "Duplicate this BIP" / program-maturity signal — Future (`SUBM-15/16`).

None of these expand Phase 9 scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SUBM-09 | Record virtual-sessions-count + virtual-duration-notes in the builder | Layer map below (Step 2); confirmed both columns already exist on `bips` (00003), missing on `bip_edits` — new migration required |
| SUBM-10 | Mark a BIP open only to partner institutions | Layer map below (Step 3, non-RHF form — implementation nuance flagged); `partner_institutions_only` confirmed `NOT NULL DEFAULT false` on `bips`, needs nullable mirror on `bip_edits` |
| SUBM-11 | Accommodation / practical notes | Layer map below (Step 4) |
| SUBM-12 | Every `virtual_timing` option saves without CHECK violation | Confirmed live bug: wizard enum `['before','after','concurrent']` vs DB CHECK `['before','during','after','before_and_after','mixed']` — `'concurrent'` is not even a valid DB value today. Three independent schema locations must be fixed in sync (see Pitfall 0) |
| SUBM-13 | Enforce Erasmus+ min group size of 10 | DB CHECK is `max_participants between 1 and 30` (no floor of 10 today) — confirmed via direct migration read. Seed audit below: zero existing/seeded rows fall below 10, so no backfill is needed; recommend tightening at minimum the three wizard/schema call sites |
| SUBM-14 | Field round-trips create→submit→approve and edit→approve→persist, no silent drop | Full seven-plus-layer propagation map below, extended beyond the milestone `ARCHITECTURE.md` list with two newly-identified surfaces (`coordinatorBipById.ts`, `wizardAdapter.ts`) and the `submitSchema`/`fullBipSchema` duplication (Pitfall 0) |
| BROW-14 | `/bips` card badge for partner-only BIPs | `lib/queries/bips.ts` `baseSelect` confirmed missing `partner_institutions_only`; `BipCard.tsx` has no badge rendering today; existing `status-pending` amber design tokens are a directly reusable match for D-06's "noticeable but not alarming" ask |
| FOUN-14 | Seed sources + `bip_edits` literal consolidation | Three seed sources read directly; `BIP_EDIT_CONTENT_SELECT` / `EDIT_CONTENT_SELECT` / `buildMergePayload()` confirmed as the exact duplicated literal (Pitfall 2 from milestone `PITFALLS.md`, re-confirmed against current code) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

These govern every task in this phase's plan:

- Next.js **15.5.x** (confirmed `15.5.18` in `package.json` — `[VERIFIED: package.json]`), Zod **v3** (`^3.25.76`), `@hookform/resolvers` **^3.10.0** — do not bump to v4/Zod4 as part of this phase.
- **Never use `getSession()` server-side** — every Server Action touched in this phase already uses `getClaims()`; preserve that pattern in any new code.
- **Never call `cookies()` synchronously** — not directly relevant (no new server client factories in this phase), but any new query/action file must `await cookies()` via the existing `lib/supabase/server.ts` factory.
- **Never use dynamic Tailwind class names** — the partner-only badge (BROW-14) MUST use complete static class strings, not template literals. See the reusable `status-pending` token recommendation below.
- **Never create a table without RLS** — not applicable; this phase adds columns to an existing RLS-enabled table (`bip_edits`), not a new table. No new policies are needed (confirmed: `bip_edits` policies gate on `created_by`/`status`, not column names — verified by reading migration `00017`).
- **Never write an UPDATE policy without USING + WITH CHECK** — not applicable (no new/changed UPDATE policies this phase).
- **`createAdminClient` confinement** — not applicable; every touched file in this phase uses the anon-key `createClient()` pattern already.
- Atomic commits per plan/task; reference REQ-IDs (SUBM-09..14, BROW-14, FOUN-14) in commits.

## Summary

This phase is "wire up dead schema" against a codebase whose seven-layer propagation pattern is already fully proven for the 22 fields that work today. Direct inspection of the current repo (not the milestone-level research, which is now ~unchanged in its facts but incomplete in its file list) confirms every claim in the milestone research and adds two important corrections that matter for planning:

**First correction — the propagation surface is bigger than seven layers.** Beyond the six files `ARCHITECTURE.md` lists (schema/`bip_edits` mirror, wizard Zod schema, draft store type, wizard UI, four Server Action call sites, diff view, detail query), direct code reading found **two more files that silently break if skipped**: `lib/queries/coordinatorBipById.ts` (the coordinator edit-mode pre-fill query — has its own hand-copied `.select()` string and mapping, separate from `bip_edits`'s) and `components/forms/wizardAdapter.ts` (`draftToBipDetail()`, the Step-5 wizard preview adapter, which constructs a `BipDetail` object literal field-by-field and will fail to compile if `BipDetail`'s type gains new required keys without a matching update here). Neither is mentioned in the milestone research. Missing either produces the exact "looks done but isn't" failure mode Pitfall 1 describes: not a crash, but silently blank pre-fill or a build break.

**Second correction — a duplicated Zod schema this phase must also touch.** `lib/actions/bip-submit.ts` maintains its own **inline** `submitSchema` object that is a hand-copied twin of `lib/schemas/bip-wizard.ts`'s `fullBipSchema` — not an import of it (the file's own doc comment admits this: "Keep the two in sync — any field change in submit's inline schema must also land here"). `fullBipSchema` is what `adminUpdateBipAction`, `submitEditAction`, `resubmitEditAction`, and `resubmitPendingBipAction` all validate against; `submitSchema` is what the **brand-new BIP submission** path (`submitBipAction`) validates against. Fixing `fullBipSchema`'s `virtual_timing` enum and `max_participants` floor without also fixing `submitSchema` means a coordinator submitting a **new** BIP still hits the live bug — only edits to **already-approved** BIPs would be fixed. This is not mentioned anywhere in the milestone research and is the single highest-risk omission for SUBM-12/SUBM-13 if missed.

**Both open questions are resolved with high confidence.** (1) `max_participants`: the DB CHECK is `between 1 and 30` with **no existing floor of 10** — confirmed by reading migration `00003` directly. A grep of all three seed sources' `max_participants` values found the minimum seeded value is **15** (in `seed.sql`) and **16** (in both e2e seed files) — zero rows anywhere fall below 10, so **no backfill or grandfathering is needed**; tightening the wizard floor is a pure forward-looking change. (2) The four columns: `bips` already has all four (migration `00003`); `bip_edits` has **none** of them (migration `00017`'s 22-column list and `00020`'s `subject_areas` addition are the only content columns present) — **one new additive migration is required**, mirroring the exact pattern `00020` already used to add `subject_areas` to `bip_edits`. No `bips`-table migration, no RLS changes.

**Primary recommendation:** treat this phase as an explicit, per-field checklist against nine files (not seven), always fixing `submitSchema` and `fullBipSchema` together, and writing one Playwright spec per new/fixed field that drives create→submit→approve **and** a separate one that drives edit→approve→persist on an already-approved BIP — per D-08's explicit acceptance bar.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| New field capture (wizard input) | Browser / Client (RHF + Zod, client-side) | — | Wizard steps are `'use client'` components; validation runs client-side first for UX, then server-side (trust boundary) |
| New field persistence (create path) | API / Backend (Server Action) | Database | `submitBipAction` re-validates server-side and writes `bips` directly — the trust boundary |
| New field persistence (edit path) | API / Backend (Server Action) | Database | `submitEditAction`/`resubmitEditAction` write to `bip_edits` (shadow table), not `bips`, until admin approval |
| Edit-merge propagation | API / Backend (Server Action) | Database | `approveEditAction`'s `buildMergePayload()` is the sole bridge from `bip_edits` → `bips`; this is where Pitfall 1 lives |
| Admin diff rendering | Browser / Client (RSC + client diff component) | API / Backend (query layer) | `BipEditDiffView` is a client component fed by two server-fetched objects (`BipDetail` live, `BipEditDetail` proposed) |
| `/bips` badge (BROW-14) | Browser / Client (RSC `BipCard`) | API / Backend (query `.select()`) | Pure read-and-render; no new mutation path |
| Seed fixtures (FOUN-14) | Database (seed data) | — | Not a runtime tier — a fixture-maintenance discipline problem, addressed via the anti-drift constant + all three seed files |

**Sanity check:** no capability in this phase is misassigned across tiers — every new field's write path already exists (Server Actions), and this phase extends payloads/types within the established tiers. No new API routes, no new client-side data-fetching, no new caching layer.

## Standard Stack

No new stack. All work extends already-locked, already-installed dependencies.

### Core (unchanged, confirmed current)
| Library | Version (confirmed) | Purpose | Why Standard (this project) |
|---------|---------|---------|--------------|
| `zod` | `^3.25.76` `[VERIFIED: package.json]` | Wizard + Server Action validation | Locked stack decision (CLAUDE.md) — do not bump to v4 |
| `react-hook-form` | `^7.75.0` `[VERIFIED: package.json]` | Steps 1/2/4 form state | Existing pattern; Step 3 deliberately does NOT use it (see Architecture Patterns) |
| `@hookform/resolvers` | `^3.10.0` `[VERIFIED: package.json]` | Zod resolver bridge | Locked — v4 has TS overload failures with Zod 4 per CLAUDE.md |
| `zustand` | `^5.0.13` `[VERIFIED: package.json]` | `BipDraftData` wizard draft store | Existing pattern, no change needed beyond type extension |
| `@supabase/supabase-js` | `^2.105.4` `[VERIFIED: package.json]` | All DB reads/writes in this phase | No client changes needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | `4.1.6` `[VERIFIED: package.json]` | Unit tests for the Zod schema fixes (`tests/schemas/`) | Fast, no server needed — use for the `virtual_timing`/`max_participants` boundary tests |
| `@playwright/test` | `^1.60.0` `[VERIFIED: package.json]` | Per-field E2E round-trip proof (D-08) | Required — unit tests alone cannot prove the merge-payload propagation |

### Alternatives Considered
None — no viable alternative to extending the existing Zod/RHF/Server-Action stack was considered or is warranted; this is a strict continuation of an established, working pattern.

**Installation:** none required.

## Architecture Patterns

### Confirmed Field Status (current code, not milestone research)

| Column | On `bips`? | On `bip_edits`? | DB CHECK / default |
|---|---|---|---|
| `virtual_sessions_count` | Yes (`00003`) | **No** | none |
| `virtual_duration_notes` | Yes (`00003`) | **No** | none |
| `accommodation_notes` | Yes (`00003`) | **No** | none |
| `partner_institutions_only` | Yes (`00003`) | **No** | `not null default false` on `bips`; mirror as nullable no-default on `bip_edits` (matches `00020`'s `subject_areas` precedent) |
| `max_participants` | Yes (`00003`) | Yes (`00017`) | `between 1 and 30` — **no floor of 10 today** `[VERIFIED: 00003_bips_full_schema.sql line 27]` |
| `virtual_timing` | Yes (`00003`) | Yes (`00017`, no CHECK on the shadow table by design) | `in ('before','during','after','before_and_after','mixed')` `[VERIFIED: 00003_bips_full_schema.sql lines 14-15]` |

### Required Migration (resolves Open Question 2 — definitively: YES, one migration)

```sql
-- supabase/migrations/00022_bip_edits_builder_completion.sql
-- Mirrors the exact pattern 00020 used to add subject_areas to bip_edits:
-- nullable, no default, no CHECK (Zod validates at submit time — 00017's
-- own stated convention for content columns).

alter table public.bip_edits
  add column virtual_sessions_count    integer,
  add column virtual_duration_notes    text,
  add column accommodation_notes       text,
  add column partner_institutions_only boolean;
```

No RLS changes (bip_edits policies key on `created_by`/`status` only — confirmed by reading all 5 policies in `00017_bip_edits.sql`). No `bips`-table migration — all four columns already exist there. **This is the only migration this phase needs.**

### Resolved: `max_participants` Backfill (Open Question 1 — definitively: NO backfill needed)

Direct grep of `max_participants` across every row in all three seed sources:

| Source | Values found | Minimum |
|---|---|---|
| `supabase/seed.sql` (20 rows) | 18,15,20,18,18,20,16,20,18,16,18,20,16,16,18,18,18,20,16,16 | **15** |
| `supabase/seed.e2e.sql` (6 rows) | 20,18,16,20,20,18 | **16** |
| `scripts/seed-cloud-e2e.mjs` (6 rows, same fixture set) | 20,18,16,20,20,18 | **16** |

`[VERIFIED: direct grep of all three files]`. Zero rows anywhere are below 10. **Recommendation:** tighten the wizard floor only — no data migration, no grandfather clause, no flag needed. As a secondary (discretionary, not required by SUBM-13's text) hardening step, the DB CHECK itself could also be tightened from `between 1 and 30` to `between 10 and 30` in the same migration above, since no row would violate it — this closes the exact "wizard vs DB truth" gap class this phase exists to fix, applied symmetrically. Flagged as `[ASSUMED]` discretionary because CONTEXT.md's D-05 only asks for the wizard floor; tightening the DB CHECK is a judgment call for the planner/user to confirm (see Assumptions Log A1).

### Full Propagation Map — Corrected and Extended (9 files, not 7)

Every one of the four new fields (`virtual_sessions_count`, `virtual_duration_notes`, `accommodation_notes`, `partner_institutions_only`) plus the two bug fixes (`virtual_timing`, `max_participants`) must touch every row below. File paths and exact symbols confirmed against current code.

| # | File | Symbol(s) | What changes |
|---|------|-----------|--------------|
| 1 | `supabase/migrations/00022_*.sql` (NEW) | — | 4 new `bip_edits` columns (see above) |
| 2 | `lib/schemas/bip-wizard.ts` | `step2Schema`, `step3Schema`, `step4Schema`, `fullBipSchema`, `VIRTUAL_TIMINGS` const | Add 4 new field validators at the step level per D-01/D-02/D-03 placement (Step 2: sessions count + duration notes; Step 3: `partner_institutions_only`; Step 4: `accommodation_notes`); fix `VIRTUAL_TIMINGS` from `['before','after','concurrent']` to the 5 DB values; fix `max_participants` `.min(5)` → `.min(10)` in **both** `step2Schema` and `fullBipSchema` |
| 3 | `lib/actions/bip-submit.ts` | inline `submitSchema` object, `updatePayload` | **Independent duplicate of `fullBipSchema`** — apply the identical field additions + bug fixes here too (see Pitfall 0). Add 4 keys to `updatePayload` |
| 4 | `lib/store/bip-draft.ts` | `BipDraftData` type | Add 4 optional fields; widen `virtual_timing` union to the 5 DB values |
| 5 | `components/forms/steps/WizardStep2ProgramDetails.tsx` | JSX + `VIRTUAL_TIMINGS`-driven `<select>` | Add `virtual_sessions_count` (`<Input type="number">`) + `virtual_duration_notes` (`<Textarea>`); rebuild the `virtual_timing` `<select>` with 5 options matching the DB; change `max_participants` `<Input min={10}>` and update the `FormDescription` copy ("5–20" → "10–20" or similar) |
| 6 | `components/forms/steps/WizardStep3Partners.tsx` | local `useState` + `commit()` | Add `partner_institutions_only` checkbox — **this file does NOT use react-hook-form** (raw `<form>` + manual `Step3PartnerDraft[]` state + `step3Schema.safeParse` on submit). The new boolean needs its own `useState<boolean>` mirrored into `mergeDraft()`, following the same manual pattern already used for `partners`, NOT a `FormField` (there is no `<Form>` wrapper in this file) |
| 7 | `components/forms/steps/WizardStep4ApplicationInfo.tsx` | JSX (RHF-based, unlike Step 3) | Add `accommodation_notes` `<Textarea>` — this file DOES use RHF, so follow the existing `eligibility_notes` field pattern exactly |
| 8 | `lib/actions/admin-bips.ts` | `adminUpdateBipAction`'s `updatePayload` | Add 4 keys (validation is automatic via `fullBipSchema`, already fixed in row 2) |
| 9 | `lib/actions/bip-edits.ts` | `buildContentPayload()` param type + return object | Add 4 keys (feeds `submitEditAction`, `resubmitEditAction`, `resubmitPendingBipAction` — all three call `fullBipSchema.safeParse` first, already fixed in row 2) |
| 10 | `lib/actions/admin-edit-bips.ts` | `EDIT_CONTENT_SELECT` string, `RawEditRow` type, `buildMergePayload()` | Add 4 keys to **all three** — this is the exact merge-on-approve path Pitfall 1 warns about |
| 11 | `lib/queries/bipEdits.ts` | `BIP_EDIT_CONTENT_SELECT` string, `RawBipEditContentRow` type, `mapEditRowToBipDraftData()` | Add 4 keys to all three — feeds both `getOpenEditForBip` (coordinator pre-fill of an open edit) and `getBipEditById` (admin diff view's "proposed" side) |
| 12 | `components/admin/BipEditDiffView.tsx` | `FIELDS` array | Add 4 new `FieldDef` entries; reuse `fmtBool` for `partner_institutions_only` |
| 13 | `lib/queries/bipDetail.ts` | `BipDetail` type, both `getBipBySlug`/`getBipById` `.select()` strings | Add the **4 new fields only** (not `max_participants` — leave its existing intentional exclusion alone, it's Phase 10/DETL-15 territory) to the type and both duplicated select strings. **Scope note:** this file lives in the "Phase 10 detail page" territory by name, but this specific change (type + query, not rendering) is required THIS phase because `BipEditDiffView`'s `getLive` functions read `BipDetail` and won't type-check otherwise. Do NOT touch `BipBody.tsx`/`BipSidebar.tsx`/`BipHeader.tsx` — that rendering is Phase 10 |
| 14 | `lib/queries/coordinatorBipById.ts` | inline `.select()` string, `draft: BipDraftData` object construction | **Not mentioned in milestone `ARCHITECTURE.md`.** This is the query that pre-fills the wizard when a coordinator re-opens a `draft`/`pending`/`approved`/`changes_requested` BIP for editing — separate from `bip_edits`. Missing this means re-opening the edit wizard shows the new fields blank even though the live `bips` row has values, which would be a silent, hard-to-notice regression at exactly the moment SUBM-14's round-trip test is exercised manually |
| 15 | `components/forms/wizardAdapter.ts` | `draftToBipDetail()` | **Not mentioned in milestone `ARCHITECTURE.md`.** Constructs a `BipDetail` object literal field-by-field (not an `as unknown as` cast like the two DB query functions) for the Step-5 wizard preview. If row 13 adds the 4 new fields as required (non-optional) keys on `BipDetail`, this function **will fail to compile** unless updated in the same pass |
| 16 | `lib/queries/bips.ts` | `baseSelect` string (`getBips`, used by `/bips`) | Add `partner_institutions_only` — required for BROW-14. Note: `getRecentBips` in `lib/queries/homepage.ts` uses `select('*')` and is **already** covered automatically; `getSavedBips` in `lib/queries/savedBips.ts` has its own explicit column list that does **not** include it — a discretionary parity item (badge would be silently absent on `/student-dashboard/saved`) worth a one-line fix for consistency, not required by BROW-14's literal text |
| 17 | `components/bip/BipCard.tsx` | new badge JSX | BROW-14 — see Code Examples below for the exact reusable static classes |
| 18 | `supabase/seed.sql`, `supabase/seed.e2e.sql`, `scripts/seed-cloud-e2e.mjs` | INSERT statements | FOUN-14 — add all 4 new fields with at least one non-default value exercised across the fixture set; fix any `virtual_timing`/`max_participants` values that would now fail the corrected wizard/DB rules (audit above shows none currently would) |
| 19 | `scripts/verify-seed.ts` | new `check(...)` calls | Add a distribution assertion for at least one of the new fields (matching the existing pattern for `green_travel`/`inclusion_support`) |

**FOUN-14's specific consolidation target** (rows 10 + 11 above): `EDIT_CONTENT_SELECT` (`admin-edit-bips.ts`) and `BIP_EDIT_CONTENT_SELECT` (`bipEdits.ts`) are two independently-maintained copies of the identical column list — confirmed byte-for-byte near-identical today (both list the same 22+ columns). Extract into one exported constant (e.g. `lib/constants/bip-edit-columns.ts`) imported by both files, and derive `buildMergePayload()`'s key list from the same constant rather than hand-listing every field a second time.

### Pitfall 0 (New — Not in Milestone Research): `submitSchema` vs `fullBipSchema` Are Two Separate Copies

**What goes wrong:** `lib/actions/bip-submit.ts` defines its own flat `submitSchema` inline (lines 57-112), re-declaring every field from `step1Schema`/`step2Schema`/`step4Schema` by hand rather than importing `fullBipSchema` from `lib/schemas/bip-wizard.ts`. The file's own comment acknowledges this: *"Keep the two in sync — any field change in submit's inline schema must also land here."* If a plan fixes `fullBipSchema`'s `virtual_timing` enum and `max_participants` floor (needed for `adminUpdateBipAction` and the three `bip-edits.ts` actions) but forgets `submitSchema`, then:
- Editing an **already-approved** BIP correctly enforces the 5-value `virtual_timing` enum and the 10-participant floor.
- **Submitting a brand-new BIP still allows the old, broken `'concurrent'` option and the 5-participant floor** — SUBM-12/SUBM-13 would ship half-fixed with zero errors surfaced anywhere.

**Why it happens:** Same root cause class as Pitfall 2 (`BIP_EDIT_CONTENT_SELECT`/`EDIT_CONTENT_SELECT`) — a deliberate historical choice to avoid a cross-module import between a Server Action file and a schema file, now a liability.

**How to avoid:** Treat `submitSchema` as a **third** location (alongside the step schemas and `fullBipSchema`) that must receive every field addition/fix in this phase. Optionally consolidate `submitSchema` to import `fullBipSchema` directly (verify this doesn't break the `'use server'` module boundary — `fullBipSchema` is a plain exported const, not a server action, so importing it into `bip-submit.ts` should be safe) — this is a discretionary refactor beyond FOUN-14's literal scope (which only names the `bip_edits` column-list duplication) but the planner should decide whether to fix it now or accept the existing duplication risk with an explicit test guarding both copies.

**Verification:** A Playwright spec (or at minimum the existing `submission.spec.ts` "coordinator submits a BIP" test extended) that selects each of the 5 `virtual_timing` options and a `max_participants` value of exactly 10 through the **create** wizard (not just the edit wizard) proves this surface, distinct from `bip-edits.spec.ts`'s edit-path coverage.

### Wizard UI Framework Split (Implementation Nuance)

Steps 1, 2, and 4 use React Hook Form (`useForm` + `zodResolver` + `<Form>`/`<FormField>`). **Step 3 does not** — it's a raw `<form>` with local `useState<Step3PartnerDraft[]>` and a `step3Schema.safeParse()` call inside its own submit handler. Since D-01 places `partner_institutions_only` in Step 3, the planner must NOT assume the `<FormField>` pattern applies there — it needs its own `useState<boolean>` (or a small extension of the existing `commit()` state-mirroring pattern) wired into `mergeDraft({ partner_institutions_only: ... })`, matching how `partners` state is already mirrored.

### Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-file duplicated column lists (bip_edits select/merge) | A second column-list literal per new field | One shared exported constant, both `bipEdits.ts` and `admin-edit-bips.ts` import it | This is the entire premise of FOUN-14 and Pitfall 1/2 — don't perpetuate the pattern while fixing it |
| Zod schema duplication (submit vs full) | A third hand-copied field list | Either keep both in sync manually with an explicit checklist item, or import `fullBipSchema` into `bip-submit.ts` | See Pitfall 0 above |
| Partner-only badge color | A new ad-hoc amber/orange Tailwind class | The existing `status-pending` / `status-pending-bg` design tokens (`#b45309` / `#fffbeb`) already used identically for the "Pending" status pill across `AdminActionsPanel.tsx`, `EditStatusCallout.tsx`, `WithdrawBipDialog.tsx`, `RequestChangesBipModal.tsx` | D-06 asks for "amber-ish, noticeable but not alarming" — this is *exactly* the existing pending-status visual language; reusing it keeps the badge from reading as a new, unexplained color in the design system and avoids a CLAUDE.md dynamic-class violation since these are already static, safelisted-by-usage classes |

**Key insight:** every "don't hand-roll" item in this phase is about not re-creating a duplication this milestone's own research already diagnosed as the root pitfall — the temptation is always "just copy the existing list/schema/color one more time," which is precisely how the four orphaned columns happened at `00003` and were never touched again.

## Common Pitfalls

(Beyond Pitfall 0 above, which is new. The following are the milestone-level pitfalls re-confirmed against current code — not repeated in full; see `.planning/research/PITFALLS.md` for complete detail. Only phase-specific confirmations/deltas are noted.)

### Pitfall 1 — Field dropped at edit-merge (re-confirmed, extended)
Confirmed present today for all 4 new fields (none of rows 10/11/13/14/15 above currently include them). The milestone research's checklist (schema/bip_edits mirror, wizard schema, draft store, wizard UI, 4 Server Action call sites, diff view, detail query) is missing rows 14 and 15 discovered in this session — extend the checklist accordingly.

### Pitfall 2 — Duplicated `bip_edits` column-list literal (re-confirmed)
`BIP_EDIT_CONTENT_SELECT` (`lib/queries/bipEdits.ts` line 178) and `EDIT_CONTENT_SELECT` (`lib/actions/admin-edit-bips.ts` line 46) are confirmed near-identical duplicates today — both list the same columns in the same order, `[VERIFIED: direct read of both files]`.

### Pitfall 3 — Seed drift (re-confirmed, audited)
All three seed sources read directly. `seed.e2e.sql` and `seed-cloud-e2e.mjs` are already kept in careful lockstep (both list `e2e-withdraw-target` / `e2e-request-changes-target` / `e2e-edit-target-bip` with matching values) — good precedent to follow for the 4 new fields. Recommend seeding at least the `e2e-edit-target-bip` fixture (`e2e0bbbb-bbbb-bbbb-bbbb-000000000010`, used by `bip-edits.spec.ts`) with non-default values for all 4 new fields, since that is the exact fixture the new per-field Playwright specs will drive.

### Pitfall 4 — `database.types.ts` regenerated against `--local` (re-confirmed)
`package.json`'s `db:types` script is confirmed to still run `supabase gen types typescript --local` `[VERIFIED: package.json line 18]`. Push the new migration to the cloud TEST project (`zbvcpiwbopmfbjfhzprw`, confirmed in `playwright.config.ts` line 31) before regenerating types or running the new E2E specs — the e2e suite's own safety guard will refuse to run against anything else.

## Code Examples

### Corrected `virtual_timing` enum (wizard + fullBipSchema + submitSchema, all three)
```typescript
// lib/schemas/bip-wizard.ts — replace the existing VIRTUAL_TIMINGS const
const VIRTUAL_TIMINGS = ['before', 'during', 'after', 'before_and_after', 'mixed'] as const
// Matches supabase/migrations/00003_bips_full_schema.sql line 15 exactly.
```

### Reusable partner-only badge classes (BROW-14, D-06)
```tsx
// components/bip/BipCard.tsx — static, complete class strings (CLAUDE.md never-do
// on dynamic Tailwind classes). Reuses the existing status-pending token pair
// already used for the "Pending" status pill elsewhere in the app.
{bip.partner_institutions_only && (
  <span className="inline-flex rounded-pill border border-status-pending bg-status-pending-bg px-2.5 py-1 text-[11px] font-semibold text-status-pending">
    Partner institutions only
  </span>
)}
```

### `/bips` select addition (BROW-14)
```typescript
// lib/queries/bips.ts — baseSelect, add one column
const baseSelect = `
  id, slug, title, application_deadline, ects_credits, language_of_instruction,
  physical_start_date, physical_end_date, host_city, study_levels,
  green_travel, inclusion_support, is_seed, status, created_at, subject_areas,
  partner_institutions_only,
  ${universityJoin}
`
```

### Vitest unit-test pattern to extend (existing precedent: `tests/schemas/admin-bips.test.ts`)
```typescript
// tests/schemas/bip-wizard.test.ts (NEW — no existing file for bip-wizard schemas today)
import { describe, it, expect } from 'vitest'
import { step2Schema, fullBipSchema } from '@/lib/schemas/bip-wizard'

describe('step2Schema virtual_timing', () => {
  it('accepts all 5 DB-valid options', () => {
    for (const timing of ['before', 'during', 'after', 'before_and_after', 'mixed']) {
      expect(() => step2Schema.parse({ ...validStep2Base, virtual_timing: timing })).not.toThrow()
    }
  })
  it('rejects the old invalid "concurrent" value', () => {
    expect(() => step2Schema.parse({ ...validStep2Base, virtual_timing: 'concurrent' })).toThrow()
  })
})

describe('step2Schema max_participants floor', () => {
  it('rejects 9 (old floor was 5)', () => {
    expect(() => step2Schema.parse({ ...validStep2Base, max_participants: 9 })).toThrow()
  })
  it('accepts exactly 10', () => {
    expect(() => step2Schema.parse({ ...validStep2Base, max_participants: 10 })).not.toThrow()
  })
})
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Tightening the DB CHECK on `max_participants` to `between 10 and 30` (in addition to the wizard floor) is a safe, optional hardening step since no existing row violates it | Architecture Patterns / Resolved Open Question 1 | LOW — this is explicitly framed as discretionary/optional, not a required task; if the planner skips it, SUBM-13 is still satisfied via the wizard-only fix. If added and wrong, the migration would fail loudly at `db push` time (immediately visible), not silently |
| A2 | `submitSchema` in `bip-submit.ts` can safely import `fullBipSchema` directly instead of maintaining a hand-copied duplicate, without violating the `'use server'` module boundary | Pitfall 0 | LOW — `fullBipSchema` is a plain exported `const`, not a Server Action; if this assumption is wrong (e.g., a bundler/RSC boundary issue not visible from static reading), the fallback is simply keeping both copies in sync manually as today, which is already the existing pattern |
| A3 | Adding `partner_institutions_only` to `getSavedBips`' explicit select list (for badge parity on `/student-dashboard/saved`) is in scope as a discretionary consistency fix, not a hard BROW-14 requirement | Full Propagation Map, row 16 | LOW — BROW-14's literal text only names `/bips`; skipping this leaves a minor, non-breaking visual inconsistency (badge shows on `/bips` but not on the saved-bips list) |

**If this table is empty:** N/A — three low-risk discretionary items are flagged above; nothing here blocks planning or requires user confirmation before locking scope.

## Open Questions

1. **Should the DB CHECK on `max_participants` also be tightened to `between 10 and 30`, or should the wizard-only fix be considered sufficient for SUBM-13?**
   - What we know: no existing/seeded row would be affected either way (confirmed above).
   - What's unclear: whether the user considers "consistent with the database" in SUBM-13's requirement text to mean the DB itself should also enforce 10, or just that the wizard's chosen floor doesn't conflict with what the DB currently allows (which it already doesn't — 10 is within `1..30`).
   - Recommendation: default to wizard-only (satisfies the requirement text literally, smaller diff); offer the DB-tightening as an optional line in the same migration if the planner/user wants defense-in-depth. Non-blocking either way.

2. **Should `submitSchema` be refactored to import `fullBipSchema` (removing the duplication) as part of this phase, or left as a manually-synced duplicate with an explicit checklist item?**
   - What we know: both must receive the identical field additions and bug fixes regardless of which approach is chosen.
   - What's unclear: whether the refactor risk (touching a working, security-sensitive trust-boundary file more than strictly necessary) is worth it against the ongoing drift risk of two manually-synced copies.
   - Recommendation: keep them separate but add a code comment cross-reference in both files pointing at each other (if not already present) and add the Vitest coverage in Code Examples above for both. Treat true consolidation as a `FOUN-14`-adjacent nice-to-have, not required for this phase's acceptance criteria.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Unit framework | Vitest `4.1.6`, config at `vitest.config.ts`, tests in `tests/**/*.test.ts` |
| E2E framework | Playwright `^1.60.0`, config at `playwright.config.ts`, specs in `tests/e2e/*.spec.ts` |
| Quick run (unit) | `npm run test` (`vitest run`) |
| Quick run (E2E, single spec) | `npx playwright test tests/e2e/bip-edits.spec.ts` |
| Full suite | `npm run test && npm run test:e2e` |
| E2E safety guard | `playwright.config.ts` refuses any Supabase target except local or the cloud TEST project ref `zbvcpiwbopmfbjfhzprw` — no override needed for this phase's work, just confirm `.env.local` points at one of those before running |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SUBM-12 | All 5 `virtual_timing` options parse successfully; old `'concurrent'` rejected | unit | `npx vitest run tests/schemas/bip-wizard.test.ts` | ❌ Wave 0 (new file) |
| SUBM-13 | `max_participants` floor is 10 in both `step2Schema` and `fullBipSchema` | unit | `npx vitest run tests/schemas/bip-wizard.test.ts` | ❌ Wave 0 (same new file) |
| SUBM-09 | Create a BIP with `virtual_sessions_count` + `virtual_duration_notes` set, submit, approve, values are live | e2e | `npx playwright test tests/e2e/submission.spec.ts` (extend existing "coordinator submits a BIP" test to fill + assert these fields) | ✅ extend existing |
| SUBM-09/10/11 (edit path) | Edit an **already-approved** BIP's new fields, admin approves, live row reflects new values — per D-08 | e2e | `npx playwright test tests/e2e/bip-edits.spec.ts` (extend `driveEditWizardToStep5` callers, or add a new serial test after EDIT-04) | ✅ extend existing |
| SUBM-10 | `partner_institutions_only` checkbox in Step 3 round-trips (create path) | e2e | `npx playwright test tests/e2e/submission.spec.ts` | ✅ extend existing |
| SUBM-14 | No field silently dropped at merge — the binding, per-field proof D-08 requires | e2e | One assertion per new field inside the extended `bip-edits.spec.ts` EDIT-04-equivalent flow, reading back the live `/bip/[slug]` page OR the `bips` row via the service-role REST pattern already used by `assertAuditRow()` | ✅ extend existing pattern |
| BROW-14 | `/bips` card shows the badge only for `partner_institutions_only = true` rows | e2e | New assertion in a `/bips`-scoped spec, or extend `map-filter.spec.ts` if it already exercises `/bips` cards | Check at Wave 0 — `map-filter.spec.ts` scope unconfirmed in this pass |
| FOUN-14 | All three seed sources include the 4 new fields with a non-default value exercised | manual/script | `npm run verify:seed` after extending `scripts/verify-seed.ts` with a new `check(...)` for at least one new field's distribution | ❌ Wave 0 (extend existing script) |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/schemas/bip-wizard.test.ts` (fast, no server) for every schema-touching task.
- **Per wave merge:** full `npx playwright test` run (single-worker, ~serial per `playwright.config.ts`'s locked `workers: 1` — budget accordingly, this is not parallelizable).
- **Phase gate:** full suite green + `npm run verify:seed` green before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `tests/schemas/bip-wizard.test.ts` — NEW file; no existing unit coverage for `lib/schemas/bip-wizard.ts` today (only `admin-bips.ts` and `saved-bips.ts` schemas have Vitest coverage per `tests/schemas/`)
- [ ] Extend `tests/e2e/submission.spec.ts` with field-level assertions for the 3 new scalar/boolean fields + the corrected `virtual_timing` options
- [ ] Extend `tests/e2e/bip-edits.spec.ts` with a per-field edit→approve→persist assertion block (D-08) — likely as new steps within the existing serial `test.describe` rather than a wholly new file, to reuse `E2E_BIP_ID`/`assertAuditRow`
- [ ] Confirm whether any existing spec already covers `/bips` card rendering (`map-filter.spec.ts` was found but not read in this pass) before deciding whether BROW-14 needs a new spec file or an extension
- [ ] Extend `scripts/verify-seed.ts` with a distribution check for at least one new field

*(No test framework install needed — Vitest and Playwright are both already configured and used.)*

## Security Domain

No new ASVS-relevant surface. This phase adds columns to an existing RLS-protected table via the existing, already-audited Server Action / RLS pattern — no new authentication, session, or access-control code.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | No (unchanged) | Existing `bip_edits` RLS (00017) already gates on `created_by`/`status`; new columns inherit the same row-level policy automatically — Postgres RLS is row-scoped, not column-scoped |
| V5 Input Validation | Yes | Zod v3 at every Server Action boundary (existing pattern, extended per the propagation map above) — no new validation library needed |

### Known Threat Patterns for this stack (none new this phase)
No new threat surface. The one thing worth re-confirming during implementation: `accommodation_notes` and `virtual_duration_notes` are free-text fields rendered via React (never `dangerouslySetInnerHTML`, per the existing `BipEditDiffView.tsx` doc comment and the project-wide "no rich text" decision) — confirm any new rendering (Phase 10, not this phase) follows the same plain-text-only convention already used for `eligibility_notes`.

## Sources

### Primary (HIGH confidence — direct code inspection this session)
- `supabase/migrations/00003_bips_full_schema.sql`, `00017_bip_edits.sql`, `00020_bip_subject_areas.sql` — full reads, confirmed column/CHECK/default state
- `lib/schemas/bip-wizard.ts`, `lib/store/bip-draft.ts` — confirmed the exact `virtual_timing`/`max_participants` bug shape
- `lib/actions/bip-submit.ts`, `admin-bips.ts`, `bip-edits.ts`, `admin-edit-bips.ts` — confirmed all four Server Action call sites and discovered the `submitSchema`/`fullBipSchema` duplication (Pitfall 0, new this session)
- `lib/queries/bipEdits.ts`, `bipDetail.ts`, `coordinatorBipById.ts`, `bips.ts`, `homepage.ts`, `savedBips.ts` — confirmed the diff-view data layer, discovered `coordinatorBipById.ts` as an unlisted propagation surface, confirmed `bips.ts`'s missing `partner_institutions_only` column
- `components/admin/BipEditDiffView.tsx`, `components/bip/BipCard.tsx`, `components/forms/steps/WizardStep2/3/4*.tsx`, `components/forms/wizardAdapter.ts` — confirmed the exact field lists, the Step-3 non-RHF nuance, and discovered `wizardAdapter.ts` as an unlisted propagation surface
- `supabase/seed.sql`, `seed.e2e.sql`, `scripts/seed-cloud-e2e.mjs`, `scripts/verify-seed.ts` — full reads, grepped every `max_participants` value across all three
- `tests/e2e/bip-edits.spec.ts`, `submission.spec.ts`, `tests/schemas/admin-bips.test.ts`, `playwright.config.ts`, `vitest.config.ts`, `package.json` — confirmed existing test patterns and framework versions
- `app/globals.css` — confirmed the existing `status-pending`/`status-pending-bg` token pair already in use for an amber-style status pill, directly reusable for D-06

### Secondary (MEDIUM confidence)
- `.planning/research/SUMMARY.md`, `ARCHITECTURE.md`, `PITFALLS.md` — milestone-level research, re-confirmed against current code; this document supersedes their file-list completeness (two new surfaces found) and their schema-duplication analysis (one new duplication found) while confirming all other facts

### Tertiary (LOW confidence)
- None flagged in this pass — all findings were verified via direct code reads.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new stack, all versions confirmed directly against `package.json`
- Architecture: HIGH — every file/symbol claim confirmed by direct read this session, including two corrections to the milestone research
- Pitfalls: HIGH — Pitfall 0 is a new, directly-confirmed finding (not inferred); all re-confirmed pitfalls matched the milestone research's description exactly

**Research date:** 2026-07-18
**Valid until:** 30 days (stable, internal-codebase-only research; re-verify file states if execution is delayed past a major refactor)
