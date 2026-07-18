# Phase 9: Coordinator BIP Builder Completion - Context

**Gathered:** 2026-07-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete the coordinator BIP builder so the BIP data model is fully expressed through the wizard and the edit-and-re-review flow. Concretely: wire the four schema-present-but-UI-absent columns (`virtual_sessions_count`, `virtual_duration_notes`, `accommodation_notes`, `partner_institutions_only`) into the builder, fix two live validation bugs (`virtual_timing` enum mismatch; `max_participants` floor), add a partner-only badge on `/bips` cards, and keep all three seed sources + the `bip_edits` diff/merge surfaces in sync.

**In scope:** SUBM-09..14, BROW-14, FOUN-14 (the builder + the browse-card badge + anti-drift plumbing).
**Out of scope (moved to Phase 10):** the public `/bip/[slug]` detail-page redesign and all detail-page rendering (DETL-11..16). The detail page was split into its own phase per user decision — build the builder first, design the detail page after. Alert pipeline is Phase 11.
</domain>

<decisions>
## Implementation Decisions

### Wizard field placement (Claude's calls, user-confirmed direction)
- **D-01:** `partner_institutions_only` checkbox goes in the **Partners step** (Step 3) — it sits with the partner-institution list it refers to.
- **D-02:** `virtual_sessions_count` + `virtual_duration_notes` go in the **virtual-component step** (Step 2), alongside the existing virtual fields.
- **D-03:** `accommodation_notes` goes in the **application / practical step** (Step 4).

### Data-integrity fixes
- **D-04:** Fix the `virtual_timing` mismatch by aligning the wizard's option set to the DB CHECK constraint (`before` / `during` / `after` / `before_and_after` / `mixed`). Every selectable option must save without a constraint error.
- **D-05:** Raise the `max_participants` wizard floor from 5 to 10 (Erasmus+ minimum group size). **Before tightening, planning must check existing/seeded BIPs for values below 10** and decide how to treat them (backfill, grandfather, or flag) — do not silently break existing data.

### Partner-only badge on `/bips` cards (BROW-14)
- **D-06:** Treatment is **noticeable but not alarming** — a restrained badge (amber-ish, not a loud full-width warning, not a quiet grey tag) so a student notices a BIP may be closed to them without the card feeling like an error state.

### Anti-drift (FOUN-14)
- **D-07:** Every new field must be added to all three seed sources (`supabase/seed.sql`, `supabase/seed.e2e.sql`, `scripts/seed-cloud-e2e.mjs`), and the duplicated `bip_edits` content-column literal (`BIP_EDIT_CONTENT_SELECT` in `lib/queries/bipEdits.ts` and `EDIT_CONTENT_SELECT` / `buildMergePayload()` in `lib/actions/admin-edit-bips.ts`) consolidated into one shared constant so a field can't be wired into some surfaces and silently dropped at edit-merge (Pitfall 1).
- **D-08:** SUBM-14 acceptance is proven by editing each new field on an approved BIP, having the admin approve, and asserting the value persists on the live row — per field, not just at wizard/diff render.

### Pre-decided for Phase 10 (detail page) — captured here so they aren't lost
- **D-09:** Accommodation shows as its **own dedicated detail-page section**, rendered only for BIPs that actually provide accommodation notes (not all BIPs offer it).
- **D-10:** The partner-only flag on the detail page uses the **same "noticeable but not alarming"** treatment as the card badge (D-06).
- **D-11:** Green-travel / inclusion-support framing (DETL-14) is **deferred and low-priority** — to be decided during Phase 10's discussion. It stays hidden until then; do not surface it half-framed.
- **D-12:** Overall detail-page **layout/redesign is deliberately deferred** — the user will shape it after the builder ships (that's Phase 10's discussion).

### Claude's Discretion
- Exact UI control styling within each wizard step (matching existing step components); the shared-constant refactor mechanics; participant-capacity display placement on the detail page (Phase 10).
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope + requirements
- `.planning/ROADMAP.md` §"Phase 9: Coordinator BIP Builder Completion" — goal + success criteria
- `.planning/REQUIREMENTS.md` — SUBM-09..14, BROW-14, FOUN-14 (definitions + Open Decisions section)

### Research (grounded in direct code inspection)
- `.planning/research/SUMMARY.md` — the seven-layer propagation definition, the two bug details, sequencing
- `.planning/research/PITFALLS.md` — Pitfall 1 (field dropped at edit-merge), seed-drift, `db:types --local` trap
- `.planning/research/ARCHITECTURE.md` — the exact seven layers a `bips` field must touch, file-by-file

### Key code (the surfaces each new field must reach)
- `lib/schemas/bip-wizard.ts` — wizard Zod schema (`step2Schema` holds the `virtual_timing` + `max_participants` bugs)
- `components/forms/BipSubmissionWizard.tsx` + `components/forms/steps/WizardStep*.tsx` — wizard UI
- `lib/store/bip-draft.ts` — `BipDraftData` draft store type
- `lib/actions/bip-submit.ts`, `lib/actions/admin-bips.ts` — submit / admin-update write paths
- `lib/actions/bip-edits.ts` (`buildContentPayload`), `lib/actions/admin-edit-bips.ts` (`buildMergePayload` / `EDIT_CONTENT_SELECT`) — edit + merge (the duplicated literal to consolidate)
- `lib/queries/bipEdits.ts` (`BIP_EDIT_CONTENT_SELECT`), `components/admin/BipEditDiffView.tsx` — diff view
- `components/bip/BipCard.tsx` — `/bips` card (partner-only badge target, BROW-14)
- `supabase/migrations/00003_bips_full_schema.sql` (orphaned columns), `00020_bip_subject_areas.sql` (multi-field pattern to mirror)
- `supabase/seed.sql`, `supabase/seed.e2e.sql`, `scripts/seed-cloud-e2e.mjs` — three seed sources (FOUN-14)
- `CLAUDE.md` — never-do items (RLS, admin-client boundary, cloud-migration-before-types)
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Multi-value field pattern already exists**: `subject_areas text[]` (migration 00020) + `study_levels text[]` show the established array-facet pattern (GIN + array-overlap filter + wizard checkboxes) — the new fields are simpler scalars, but the wiring discipline is the same.
- **`WizardStep1BasicInfo.tsx` multi-select** demonstrates the checkbox-array control pattern if any new field is multi-value (partner-only is boolean; virtual/accommodation are scalar).
- **`bip_edits` shadow-table flow** (Phase 8) already round-trips 22 content fields — new fields extend the existing `content` payload, diff `FIELDS` array, and merge.

### Established Patterns
- RHF + Zod v3 typed fields (no rich text — locked out of scope).
- Optimistic-locking autosave in the wizard (`updated_at`); new fields must flow through it.
- All three seed sources hand-maintained (drift already caused BUG-002).

### Integration Points
- Each new field touches: DB (already present) → wizard Zod schema → `BipDraftData` → submit + admin-update actions → `bip_edits` content/merge/select literals → diff view. (Detail-page render is Phase 10.)
</code_context>

<specifics>
## Specific Ideas

- Partner-only badge: "noticeable but not alarming" (user's words) — restrained amber badge, present on both `/bips` card (this phase) and detail page (Phase 10, D-10).
- Accommodation: dedicated, conditionally-shown section on the detail page (Phase 10) — "since not all BIPs offer accommodation" (user).
</specifics>

<deferred>
## Deferred Ideas

- **BIP detail-page redesign (DETL-11..16)** — moved to **Phase 10** by user decision (build builder first). Display decisions D-09/D-10/D-11/D-12 above are pre-captured for that phase's discussion.
- **Green-travel / inclusion-support framing** — low priority; decided in Phase 10 (D-11).
- **`partner_institutions_only` as a browse *filter*** (not just a badge) — Future (`BROW-15`), out of v1.2 per REQUIREMENTS.md.
- **"Duplicate this BIP" / program-maturity signal** — Future (`SUBM-15/16`).

None of these expand Phase 9 scope.
</deferred>

---

*Phase: 9-coordinator-bip-builder-completion*
*Context gathered: 2026-07-18*
