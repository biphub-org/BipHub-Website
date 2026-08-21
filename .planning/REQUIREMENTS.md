# Requirements: BipHub — v1.3 Growth & Operational Efficiency

**Defined:** 2026-08-12 (scaffold — plan approved, see `.agents/plans/2026-08-12-v1-3-growth-ops.md`)
**Core Value:** Close the shipped-but-unverified Phase 8 debt, then make BipHub retain coordinators year-over-year and make students compare/share BIPs — without adding a public API or rich-text editor.

> Predecessor requirements are archived: v1.0 MVP at `milestones/v1.0-REQUIREMENTS.md`, v1.1 at `milestones/v1.1-REQUIREMENTS.md` (STUD, EDIT — shipped), v1.2 at `milestones/v1.2-REQUIREMENTS.md` (SUBM-09..14, DETL-11..16, ALRT-01..09, FOUN-14/11/12/13 — shipped 2026-08-10). Research backing v1.3: `.planning/research/SUMMARY.md` (v1.2 research still applies; v1.3 deltas will be appended).

## v1.3 Requirements

Each maps to a roadmap phase. REQ-IDs continue existing category numbering.

### Day 0 — Phase 8 Verification Gate (EDIT — shipped, unverified)

*Must pass with `RESEND_API_KEY` set before any v1.3 feature plan counts as done. From `milestones/v1.1-phases/08-edit-approved-request-changes/08-UAT.md` + `08-VERIFICATION.md`.*

- [ ] **EDIT-04 (gate):** An admin can approve an edit and the merged content appears on the live `/bip/[slug]` within seconds (ISR `revalidatePath` perceptual timing)
- [ ] **EDIT-07 (gate):** A coordinator is emailed on edit approved / rejected / changes-requested — all 3 emails arrive with a working BIP link and the admin note embedded where applicable

### Coordinator Retention (SUBM)

- [x] **SUBM-15**: A coordinator can duplicate an existing BIP (approved / rejected / changes_requested — not pending/draft) into a new draft — fields + partner universities cloned, slug regenerated, `duplicated_from_bip_id` FK `ON DELETE SET NULL` linked, owned by duplicator — shipped 2026-08-21 (00045 + duplicateBipAction + Dashboard Duplicate, E2E bip-duplicate.spec.ts)
- [x] **SUBM-16**: A BIP's public detail page shows a derived "Edition N" / program-maturity signal when `N > 1` (computed via recursive lineage of `duplicated_from_bip_id`, not a stored counter or editable field) — shipped 2026-08-21 (BipHeader Edition badge + getBipEdition/getEditionForBip, seed chains in 3 sources, E2E Edition 2 badge)

### Discovery (BROW / DISC / GROW)

- [x] **BROW-15**: A student browsing `/bips` can filter to exclude BIPs open only to partner institutions (`?partnerOnly=exclude`, absent = show all; chip-removable, URL-shareable) — shipped 2026-08-21 (schema `partnerOnly` enum, `buildSupabaseQuery` `partner_institutions_only=false`, `BipFiltersSidebar` Access checkbox + `BipFilterChips` + `parseSearchParams`, E2E bip-compare.spec.ts BROW-15)
- [x] **DISC-08**: A student can compare 2–3 BIPs side-by-side on `/bips/compare?ids=a,b,c` (cards, no tables; uses existing `BipDetail` fields; deadline + Apply CTA prominent) — shipped 2026-08-21 (`/bips/compare` `CompareCard` + `BipKeyFacts`/`BipApplyCta`, `CompareBar` + `CompareToggle` + `lib/store/compare` cap 3, E2E DISC-08)
- [x] **DISC-09 / GROW-01 (shortlist):** A student can share a shortlist via URL — the comparison URL is the shortlist (no auth, no server table, `?ids=` is the sole source of truth, works incognito) — shipped 2026-08-21 (URL `?ids=` is sole authority, localStorage only for persistence, incognito test in bip-compare.spec.ts)

### Admin Operations (TOOL)

- [ ] **TOOL-01**: An admin can export the currently-filtered BIP queue as CSV (`GET /admin/export.csv`, admin-guarded, `text/csv` attachment, filter passthrough)
- [ ] **TOOL-02**: An admin can bulk approve / bulk reject (with note) from `/admin` — per-row `bip_status_history` audit + per-row `revalidatePath`, returns `{ succeeded, failed }` per row (no silent `WHERE id IN (...)` shortcut)
- [ ] **TOOL-03**: *Deferred to v1.4* — per-listing view/save counts (needs analytics instrumentation; not in v1.3 scope)

### Foundation / Compliance (FOUN — continuing)

- [x] **FOUN-15 (v1.3):** `duplicated_from_bip_id` is the only new BIP-model column — it is included in all 3 seed sources (`seed.sql:882`, `seed.e2e.sql:512` `e2e-edition-copy`, `seed-cloud-e2e.mjs:54` `e2e-edition-copy`) and any shared column constant; `TOOL-01/02` carry RLS (`export.csv` admin-only `getClaims()` guard, bulk action `role='admin'`); new routes remain `revalidatePath`-aware where they mutate live BIPs — shipped 2026-08-21, verify-seed `edition_chain_ge_1`

## Open Decisions (from plan — confirm during Phase 12–14 planning)

1. **TOOL-03** — deferred to v1.4 (recommended). Flip only if analytics instrumentation is added to v1.3.
2. **Duplicate dates** — recommended: copy verbatim + hint "Adjust dates for the new edition" (not +1 year auto-bump).
3. **Compare cap** — recommended: **3** (fits 3-col desktop without scroll).
4. **Admin CSV columns + PII** — recommended: `id, slug, title, host_university, country, field, status, created_by, created_at, physical_start_date` — **exclude** `contact_email` PII unless approved.

## Future Requirements

Tracked, not in the v1.3 roadmap.

- **TOOL-03**: Per-listing view/save counts — see above (v1.4 candidate, needs `bip_views` instrument)
- **API-01**: Versioned public read API — still parked until audience (PROJECT.md Out of Scope)
- **JSON-LD / schema.org** — still parked until audience
- **Rich-text, photo uploads, funding calculator, reviews/ratings, day-by-day itinerary** — permanent anti-features (do not re-litigate)

## Out of Scope (v1.3)

Locked — same as `.agents/plans/2026-08-12-v1-3-growth-ops.md:Out of Scope`:

| Feature | Reason |
|---------|--------|
| Public read API / JSON-LD | Parked until audience (PROJECT.md) |
| Rich-text / WYSIWYG | Contradicts structured multi-field model; stored-XSS surface |
| Photo uploads | v1.0 out-of-scope, gradient placeholders remain |
| Funding calculator | Grant amounts per National Agency × 29 countries — not maintainable |
| Reviews / ratings | Moderation/politics burden; SUBM-16 edition signal is the substitute |
| Day-by-day itinerary builder | Format mismatch for 5–30-day programs; free text is correct |
| Instant per-BIP alerts | Digest-only (weekly/daily) — already shipped |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| EDIT-04 (gate) | Day 0 — Phase 8 verification gate | Pending (manual) |
| EDIT-07 (gate) | Day 0 | Pending (manual) |
| SUBM-15 | Phase 12 — Duplicate BIP | Shipped 2026-08-21 (12.1/12.2) |
| SUBM-16 | Phase 12 — Program Maturity | Shipped 2026-08-21 (12.3 Edition badge + seed chains) |
| BROW-15 | Phase 13 — Discovery | Shipped 2026-08-21 (BROW-15 + chip + E2E) |
| DISC-08 | Phase 13 — Compare | Shipped 2026-08-21 (/bips/compare + CompareBar/Toggle) |
| DISC-09 / GROW-01 | Phase 13 — Shortlist (URL) | Shipped 2026-08-21 (incognito URL authority + E2E) |
| TOOL-01 | Phase 14 — Admin CSV export | Pending |
| TOOL-02 | Phase 14 — Admin bulk moderate | Pending |
| TOOL-03 | — | Deferred to v1.4 |
| FOUN-15 | Phase 12 (and TOOL RLS) | Shipped 2026-08-21 (3 seed sources + verify-seed) |

**Coverage:** 11 checkable reqs (2 gate + 9 feature + 1 foundation) mapped, 0 orphans. `TOOL-03` deferred.

---

*Requirements scaffolded: 2026-08-12 — plan approved, awaiting Phase 12 discussion. Detailing (schemas, filters, lineage helper) happens in Phase 12–14 DISCUSSION.md / PLAN.md.*
