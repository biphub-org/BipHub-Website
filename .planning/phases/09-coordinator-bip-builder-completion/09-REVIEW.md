---
phase: 09-coordinator-bip-builder-completion
reviewed: 2026-07-18T00:00:00Z
depth: standard
files_reviewed: 27
files_reviewed_list:
  - lib/schemas/bip-wizard.ts
  - lib/store/bip-draft.ts
  - lib/actions/bip-submit.ts
  - lib/actions/admin-bips.ts
  - lib/actions/admin-edit-bips.ts
  - lib/actions/bip-edits.ts
  - lib/constants/bip-edit-columns.ts
  - lib/queries/bips.ts
  - lib/queries/bipDetail.ts
  - lib/queries/bipEdits.ts
  - lib/queries/coordinatorBipById.ts
  - components/admin/BipEditDiffView.tsx
  - components/bip/BipCard.tsx
  - components/forms/wizardAdapter.ts
  - components/forms/steps/WizardStep2ProgramDetails.tsx
  - components/forms/steps/WizardStep3Partners.tsx
  - components/forms/steps/WizardStep4ApplicationInfo.tsx
  - supabase/migrations/00022_bip_edits_builder_completion.sql
  - supabase/seed.sql
  - supabase/seed.e2e.sql
  - scripts/seed-cloud-e2e.mjs
  - scripts/verify-seed.ts
  - tests/e2e/submission.spec.ts
  - tests/e2e/bip-edits.spec.ts
  - tests/e2e/bips-card.spec.ts
  - tests/schemas/bip-wizard.test.ts
  - playwright.config.ts
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 09: Coordinator BIP Builder Completion — Code Review Report

**Reviewed:** 2026-07-18
**Depth:** standard
**Files Reviewed:** 27
**Status:** issues_found

## Summary

Reviewed all Phase 9 source files against the anti-Pitfall-1 mandate (the four
builder-completion fields — `virtual_sessions_count`, `virtual_duration_notes`,
`accommodation_notes`, `partner_institutions_only` — must flow end-to-end with
no silent drop at any read/write/merge boundary), the `virtual_timing` enum
fix, the `max_participants` floor fix, the FOUN-14 consolidation, the seed
triple-sync, and CLAUDE.md's never-do list (RLS/`WITH CHECK`, `getClaims()`
vs `getSession()`, `await cookies()`, admin-client boundary, static Tailwind
classes, Zod v3, `motion` not `framer-motion`).

The four-field propagation is genuinely complete across every surface I
traced: wizard schemas (all four step schemas + `fullBipSchema`), the Zustand
draft store, all three wizard step components, the coordinator submit action,
the admin direct-edit action, all three coordinator edit actions
(`buildContentPayload`), the shared `BIP_EDIT_CONTENT_COLUMNS` constant, the
admin diff view, `BipDetail` + both detail queries, the coordinator edit
pre-fill query, the wizard preview adapter, the `/bips` listing query +
`BipCard` badge, and all three seed sources (including the e2e edit-target
fixture used for the binding per-field round-trip E2E proof). The
`virtual_timing` enum now matches the DB `CHECK` constraint exactly
(`before`/`during`/`after`/`before_and_after`/`mixed`), and all Tailwind
classes introduced (badge, diff view) are static literals, no template
strings.

One genuine correctness defect was found in the merge-on-approve path
(`buildMergePayload`), and three quality/robustness issues are worth fixing
before this is considered fully hardened.

## Critical Issues

### CR-01: `buildMergePayload` can crash `approveEditAction` with a NOT NULL violation on `partner_institutions_only`

**File:** `lib/actions/admin-edit-bips.ts:126`

**Issue:** `buildMergePayload` copies `editRow.partner_institutions_only`
straight through with no null-coalescing:

```ts
partner_institutions_only: editRow.partner_institutions_only,
```

`bips.partner_institutions_only` is declared `boolean not null default false`
(`supabase/migrations/00003_bips_full_schema.sql:40`), but the mirrored column
on `bip_edits` added by this phase's own migration
(`supabase/migrations/00022_bip_edits_builder_completion.sql`) is nullable
with **no backfill**:

```sql
add column partner_institutions_only boolean;
```

Any `bip_edits` row that was already open (`pending` or `changes_requested`)
at the moment migration `00022` is applied will have
`partner_institutions_only = NULL` for that pre-existing row (`ALTER TABLE
ADD COLUMN` with no `DEFAULT`/backfill leaves existing rows null). When an
admin later approves that edit, `buildMergePayload`'s unmodified
`editRow.partner_institutions_only` (i.e. `null`) is written straight into
the `UPDATE bips ...` call, which will fail outright with a Postgres
`NOT NULL` constraint violation — `approveEditAction` returns `{ error:
'Failed to apply edit. Please try again.' }` and the edit becomes stuck
(no error surfaces the real cause; the admin has no path to resolve it
without a manual DB fix). Because `bip_edits` is one shared cloud DB across
local dev, e2e, and any future production data (per project MEMORY: "Local
dev uses cloud Supabase"), an in-flight edit spanning this migration's deploy
is a realistic, not merely theoretical, scenario.

This is also the *only* place in the whole codebase that skips the
convention every other consumer of this exact field uses. Compare:

- `lib/queries/bipEdits.ts` — `partner_institutions_only: row.partner_institutions_only ?? false,`
- `lib/queries/coordinatorBipById.ts` — `partner_institutions_only: data.partner_institutions_only ?? false,`
- `components/forms/wizardAdapter.ts` — `partner_institutions_only: draft.partner_institutions_only ?? false,`
- `lib/actions/bip-edits.ts` (`buildContentPayload`) — `partner_institutions_only: data.partner_institutions_only ?? false,`
- `lib/actions/admin-bips.ts` (`adminUpdateBipAction`) — `partner_institutions_only: parsed.data.partner_institutions_only ?? false,`

`buildMergePayload` is the one write path into the NOT-NULL `bips` column
that omits the same defensive coalesce.

**Fix:**

```ts
// lib/actions/admin-edit-bips.ts — buildMergePayload
partner_institutions_only: editRow.partner_institutions_only ?? false,
```

Additionally (belt-and-suspenders), the migration should backfill existing
rows so no `bip_edits` row is left with a null value that later has to be
defended against at every read site:

```sql
-- supabase/migrations/00022_bip_edits_builder_completion.sql (or a follow-up migration)
update public.bip_edits
  set partner_institutions_only = false
  where partner_institutions_only is null;
```

## Warnings

### WR-01: Stale docstring in `bip-wizard.ts` contradicts the Phase 09-02 schema consolidation it documents elsewhere

**File:** `lib/schemas/bip-wizard.ts:149-158`

**Issue:** The docstring immediately above `fullBipSchema` still reads:

> "Plan 02-07's `submitBipAction` keeps a private flat schema for the
> coordinator submit path... The exported `fullBipSchema` below mirrors that
> flat shape verbatim... **Keep the two in sync** — any field change in
> submit's inline schema must also land here."

This is now factually wrong. Per this same phase's own `bip-submit.ts`
docstring and the 09-02 SUMMARY, the private `submitSchema` twin was
**deleted** — `submitBipAction` now imports and validates against
`fullBipSchema` directly (the whole point of the Pitfall-0 fix). The stale
comment instructs a future engineer to maintain two schemas in sync when
there is, by design, only one. Left uncorrected, this is exactly the kind of
misleading source-of-truth comment that could cause a future contributor to
re-introduce the duplicate-schema drift this phase went out of its way to
eliminate.

**Fix:** Replace the stale docstring with language matching `bip-submit.ts`'s
own comment (which already correctly describes the consolidated state), e.g.:

```ts
/**
 * `fullBipSchema` is the single flat cross-field validator shared by both
 * the coordinator create path (lib/actions/bip-submit.ts) and the admin
 * edit path (lib/actions/admin-bips.ts). There is no longer a hand-copied
 * twin (Plan 09-02 Pitfall 0 fix) — any field/validation change belongs
 * here, and only here.
 */
```

### WR-02: `RawEditRow` and `RawBipEditContentRow` are hand-duplicated types describing the same shared select string

**File:** `lib/actions/admin-edit-bips.ts:46-80`, `lib/queries/bipEdits.ts:27-56`

**Issue:** FOUN-14 consolidated the `bip_edits` content **select string**
into one shared constant (`BIP_EDIT_CONTENT_COLUMNS`), specifically to
prevent a field from being wired into one consumer and silently absent from
the other. However, the TypeScript **shape** describing what that select
returns is still hand-duplicated as two independently-maintained types —
`RawEditRow` in `admin-edit-bips.ts` and `RawBipEditContentRow` in
`bipEdits.ts` — each manually listing all 28+ fields. Both call sites use an
unchecked cast to bridge the actual query result to these types:

- `admin-edit-bips.ts:197` — `buildMergePayload(editRow as RawEditRow)`
- `bipEdits.ts:247,282` — `mapEditRowToBipDraftData(data as unknown as RawBipEditContentRow)`

If a future field is added to `BIP_EDIT_CONTENT_COLUMNS` and only one of
these two types is updated (or neither), TypeScript will not catch the
mismatch — the cast silences the compiler, and the omitted field simply
reads as `undefined` at runtime in whichever consumer wasn't updated. This
is the exact class of drift-by-omission (Pitfall 1) this phase fixed for the
select string but left unaddressed for the row-shape types describing it.

**Fix:** Derive one shared raw-row type from the constant (or a single
hand-written type) and import it in both files, e.g.:

```ts
// lib/constants/bip-edit-columns.ts
export type BipEditContentRow = {
  id: string
  bip_id: string
  status: string
  admin_note: string | null
  created_by: string | null
  title: string | null
  // ...one definition, used everywhere BIP_EDIT_CONTENT_COLUMNS is selected
}
```

Then `import type { BipEditContentRow } from '@/lib/constants/bip-edit-columns'`
in both `admin-edit-bips.ts` and `bipEdits.ts`, removing `RawEditRow` and
`RawBipEditContentRow` entirely.

### WR-03: `virtual_sessions_count` field default causes an uncontrolled→controlled input transition

**File:** `components/forms/steps/WizardStep2ProgramDetails.tsx:76`

**Issue:**

```ts
virtual_sessions_count: draft.virtual_sessions_count ?? undefined,
```

Every other numeric field on this same form defaults to a concrete number
(`ects_credits: draft.ects_credits ?? 3`, `max_participants:
draft.max_participants ?? 15`), which keeps the underlying `<Input
type="number" {...field} />` controlled from first render. `virtual_sessions_count`
is the one numeric field whose default resolves to `undefined`, so
`field.value` starts as `undefined` (the DOM input is effectively
uncontrolled) and becomes a defined value the moment the coordinator types —
React logs "A component is changing an uncontrolled input of type number to
be controlled" in the console. Functionally harmless (the value still
round-trips correctly through `Step2Values`), but it is a real React
anti-pattern and console noise on every wizard Step 2 render where this
field starts empty.

**Fix:** Default to an empty string (matching the pattern used for other
optional text fields like `virtual_duration_notes: draft.virtual_duration_notes ?? ''`)
rather than `undefined`, and let `z.coerce.number()` handle the empty-string
case, or explicitly control the display value:

```ts
virtual_sessions_count: draft.virtual_sessions_count ?? '',
```

## Info

### IN-01: `virtual_sessions_count` input has no `max` attribute matching the schema's upper bound

**File:** `components/forms/steps/WizardStep2ProgramDetails.tsx:151`

**Issue:** `<Input type="number" min={0} placeholder="e.g. 4" {...field} />`
omits `max={50}`, even though `step2Schema`/`fullBipSchema` both cap this
field at 50 (`z.coerce.number().int().min(0).max(50).optional()`). The
sibling `max_participants` field two blocks down does specify both
`min={10} max={20}`. Purely cosmetic — Zod still enforces the ceiling on
Save & Continue — but the native spinner/validation UX is inconsistent with
its neighboring field.

**Fix:** Add `max={50}` to match the schema and the `max_participants`
field's pattern.

### IN-02: `contact_name` minimum-length requirement differs between `step4Schema` and `fullBipSchema`

**File:** `lib/schemas/bip-wizard.ts:129,188`

**Issue:** `step4Schema.contact_name` has no minimum length
(`z.string().trim().max(120).optional().or(z.literal(''))`), while
`fullBipSchema.contact_name` requires `.min(2)`. A coordinator entering a
single-character contact name would pass Step 4's own client-side validation
but fail submit-time validation against `fullBipSchema` (used by both
`submitBipAction` and `adminUpdateBipAction`) with a generic error. Verified
via git history this discrepancy **predates Phase 9** (the pre-09-02 private
`submitSchema` twin already had the same `.min(2)`), so it is not a
regression introduced by this phase's consolidation — flagging only because
`bip-wizard.ts` was directly modified in this phase and the inconsistency
sits in the same file as the fields this review was scoped to verify.

**Fix (out of this phase's scope, low priority):** Align `step4Schema.contact_name`
with `fullBipSchema.contact_name` (add `.min(2)`) so the client-side and
submit-time validators agree.

---

_Reviewed: 2026-07-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
