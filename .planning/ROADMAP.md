# Roadmap: BipHub

## Milestones

- ✅ **v1.0 MVP** — Phases 1–4 (shipped 2026-06-14) — full detail in [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Product Depth & Engagement** — Phases 5, 6, 8 (shipped 2026-07-18; Phase 7 deferred to v1.2) — full detail in [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Coordinator BIP Builder** — Phases 9–11 (shipped 2026-08-10) — full detail in [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)
- 🚧 **v1.3 Growth & Operational Efficiency** — Phases 12–14 (planning — plan approved 2026-08-12, see [.agents/plans/2026-08-12-v1-3-growth-ops.md](../.agents/plans/2026-08-12-v1-3-growth-ops.md))

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–4) — SHIPPED 2026-06-14</summary>

- [x] **Phase 1: Discovery Foundation** (8/8 plans) — students find & explore BIPs against seeded data — completed 2026-05-09
- [x] **Phase 2: Coordinator Auth + Submission** (7/7 plans) — coordinators register & submit via wizard — completed 2026-05-11
- [x] **Phase 3: Admin Review + Email Notifications** (8/8 plans) — admin editorial loop + Resend emails + audit log — completed 2026-05-12
- [x] **Phase 4: Polish + Static Content + Performance Hardening** (7/7 plans) — static content, GDPR, Lighthouse, Playwright E2E — completed 2026-06-14

Full phase details, success criteria, and per-plan breakdown: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

<details>
<summary>✅ v1.1 Product Depth & Engagement (Phases 5, 6, 8) — SHIPPED 2026-07-18</summary>

- [x] **Phase 5: Student Auth + Role Model** (4/4 plans) — students register, sign in via magic link, land on a dedicated dashboard; role guards tightened — completed 2026-06-15
- [x] **Phase 6: Saved BIPs Sync** (4/4 plans) — server-side save/unsave, cross-device sync, localStorage migration, GDPR cascade — completed 2026-06-15
- [ ] **Phase 7: Alert Subscriptions + Email Pipeline** — NOT built; full scope deferred to v1.2 (see below)
- [x] **Phase 8: Edit-Approved + Request-Changes** (9/9 plans) — coordinators edit live BIPs through admin re-review; third "request changes" moderation state + audit trail — completed 2026-06-26

Full phase details, success criteria, and per-plan breakdown: [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)

**Deferred at close:** Phase 7 (Alert Subscriptions) moved to v1.2 to prioritize coordinator BIP-builder work. Phase 8 Resend+ISR manual UAT/verification carried to v1.2 (see STATE.md Deferred Items).

</details>

### v1.2 Coordinator BIP Builder (Phases 9–11)

- [x] **Phase 9: Coordinator BIP Builder Completion** (9/9 plans, verified 8/8) - the BIP data model is fully wired through the builder and edit-and-re-review flow (wizard → draft store → submit/edit → admin merge → diff view), two live data-integrity bugs fixed, and a partner-only badge on `/bips`
- [x] **Phase 10: BIP Detail Page** (verified 2026-08-10, 0 code — detail page already equals builder preview) - `/bip/[slug]` verified via real `renderToStaticMarkup` 17/17 (timing + dates + description, partner-only banner, accommodation, Fees, Funding & support, Max places, labelled sections + CTA; `Ready in 1874ms` with `dev:turbo`)
- [x] **Phase 11: Alert Subscriptions + Email Pipeline** (7/7 plans, verified 2026-08-10 — weekly default/daily, 5-cap, update/delete with confirm dialog, Medicine/Austria labels, HMAC no-login unsubscribe, pg_cron→pg_net→Edge Function→Resend idempotency on `approved_at`, cascade delete, `/privacy` update, 4/4 E2E, `cron.job_run_details succeeded`) - students subscribe to new-BIP digest alerts by field/country, receive idempotent weekly/daily emails, and unsubscribe with no login required (carried from v1.1 Phase 7)

> **Parallel tracks (2026-07-26).** Phases 10 and 11 are being built concurrently: Phase 10 on `main`
> in the primary checkout, Phase 11 on branch `phase-11-alerts` in the `../BipHub-p11` worktree.
> Requirement sets are disjoint (DETL-11..16 vs ALRT-01..09 + FOUN-11..13) and so are the code
> surfaces. Shared-resource rules (migration number space, `database.types.ts` ownership, cloud
> re-seed coordination) are recorded under "Current Position" in STATE.md — read them before
> touching either.

## Phase Details

### Phase 9: Coordinator BIP Builder Completion
**Goal**: Universities can fully express a BIP through the builder — every field the schema supports is wired into the wizard and survives the edit-and-re-review round trip — closing the four orphaned-column gaps and two live validation bugs research identified by direct code inspection.
**Depends on**: Phase 8 (the `bip_edits` shadow-table edit-approval flow that SUBM-14's per-field round-trip requirement extends); also builds on Phase 2 (submission wizard) and Phase 3 (admin review merge).
**Requirements**: SUBM-09, SUBM-10, SUBM-11, SUBM-12, SUBM-13, SUBM-14, BROW-14, FOUN-14
**Success Criteria** (what must be TRUE):
  1. A coordinator can enter the BIP's virtual-session count and duration/schedule notes (in the virtual-component step), mark the BIP as open only to partner institutions (in the Partners step), and add accommodation notes (in the application/practical step) — and every virtual-timing option the builder offers (`before`/`during`/`after`/`before_and_after`/`mixed`) saves successfully with no database CHECK-constraint error (SUBM-09, SUBM-10, SUBM-11, SUBM-12)
  2. The builder's participant-count field enforces the Erasmus+ minimum of 10, matching the database constraint, with no wizard path that allows saving a value below 10 (SUBM-13)
  3. A coordinator edits any of the newly-wired fields (virtual sessions, duration notes, partner-only flag, accommodation notes) on an already-approved BIP; once the admin approves that edit, the new value is persisted on the live BIP row — verified per field via the edit-and-re-review flow, not merely at wizard-render or diff-view time (SUBM-14, anti-Pitfall-1: seven-layer propagation)
  4. A student browsing `/bips` sees a badge on cards for BIPs open only to partner institutions — noticeable but not alarming (BROW-14)
  5. All three seed sources (`seed.sql`, `seed.e2e.sql`, `seed-cloud-e2e.mjs`) are updated for every new field, with the previously-duplicated `bip_edits` column-list literal consolidated into one shared constant (FOUN-14)
**Plans**: 9 plans
  - [x] 09-01-PLAN.md — Add the four builder-completion columns to `bip_edits` (migration) + [BLOCKING] cloud push + type regen
  - [x] 09-02-PLAN.md — Fix virtual_timing/participant bugs + consolidate create path onto fullBipSchema + extend schema/draft store (unit tests)
  - [x] 09-03-PLAN.md — BROW-14 partner-only amber badge on `/bips` cards + listing query column
  - [x] 09-04-PLAN.md — Wizard UI: virtual detail (Step 2), partner-only checkbox (Step 3), accommodation notes (Step 4)
  - [x] 09-05-PLAN.md — BipDetail type/query plumbing + coordinator edit pre-fill + wizard preview adapter
  - [x] 09-06-PLAN.md — Write paths: admin edit payload + coordinator edit-content builder carry the four fields
  - [x] 09-07-PLAN.md — bip_edits merge-on-approve + diff view + FOUN-14 shared column constant
  - [x] 09-08-PLAN.md — Update all three seed sources + verify-seed for the four fields (edit-target fixture)
  - [x] 09-09-PLAN.md — E2E: create-path fields, per-field edit→approve→persist read-back (D-08), `/bips` badge
**UI hint**: yes

### Phase 10: BIP Detail Page
**Goal**: The public `/bip/[slug]` page is redesigned against the finalized Phase 9 field set, presenting the complete BIP data — including the four newly-wired fields and participant capacity — in clear, scannable labelled sections.
**Depends on**: Phase 9 — a hard mechanical dependency, not a preference: the page layout and the detail query's `.select()` strings / `BipDetail` type can only be finalized once the builder field set is locked. (Per user decision, detail-page layout decisions are deliberately deferred until Phase 9 ships and are gathered in this phase's own discussion.)
**Requirements**: DETL-11, DETL-12, DETL-13, DETL-14, DETL-15, DETL-16
**Success Criteria** (what must be TRUE):
  1. The detail page shows the virtual-component detail (session count + duration/schedule notes) (DETL-11)
  2. The detail page clearly flags when a BIP is open only to partner-institution students — noticeable but not alarming, matching the `/bips` card badge — so a student knows before contacting the coordinator (DETL-12)
  3. The detail page presents accommodation info in its own dedicated section, shown only for BIPs that provide it (DETL-13)
  4. The detail page shows the BIP's participant capacity (DETL-15) and groups the complete field set into clear labelled sections (overview, schedule/virtual component, accommodation, application) with the deadline and Apply CTA prominent (DETL-16)
  5. Green-travel and inclusion-support indicators are surfaced with correct sending-institution framing (DETL-14) — framing/treatment deferred and to be decided in this phase's discussion (a low-priority item per user)
**Plans**: TBD
**UI hint**: yes

### Phase 11: Alert Subscriptions + Email Pipeline
**Goal**: Students can subscribe to new-BIP alert digests by field of study and/or country, receive a weekly (default) or daily email listing newly-approved matching BIPs exactly once per BIP, and unsubscribe without signing in — with the underlying cron/Edge Function infrastructure verified as actually working, not just deployed.
**Depends on**: Phase 3 (`approveBipAction`/`approveEditAction` already produce the `status = 'approved'` state this pipeline reads — read-only dependency, zero changes required to either action). Fully independent of Phase 9; shares no files, tables, or Server Actions with it and can be planned or executed in parallel.
**Requirements**: ALRT-01, ALRT-02, ALRT-03, ALRT-04, ALRT-05, ALRT-06, ALRT-07, ALRT-08, ALRT-09, FOUN-11, FOUN-12, FOUN-13
**Success Criteria** (what must be TRUE):
  1. Before any Server Action or UI work is considered done, `pg_net` is confirmed enabled (`supabase/config.toml` + `CREATE EXTENSION`) and a real `pg_cron` job is confirmed firing against the cloud project — verified directly via a `cron.job_run_details` query, not a deferred manual check (infrastructure-first, per research Pitfall 4/6)
  2. A student creates a subscription for a chosen field of study and/or country, selects weekly (default) or daily frequency, and can view, edit the frequency of, and delete their subscriptions from `/student-dashboard` — attempting a 6th active subscription is rejected (ALRT-01, ALRT-02, ALRT-04, ALRT-09)
  3. A student receives a digest email listing newly-approved BIPs matching their subscription; the email includes a working unsubscribe link and an RFC-8058 `List-Unsubscribe` header; the subscription row records the student's explicit consent text captured at creation time (ALRT-03, ALRT-05, ALRT-08)
  4. Running the digest job twice never sends a duplicate alert for the same BIP + subscriber — idempotency is keyed on a dedicated `bips.approved_at` marker (set once on the pending→approved transition, never touched by the edit-merge path — NOT `updated_at`, which edit-merges bump), backed by a unique `(bip_id, user_id)` constraint on `bip_alert_deliveries` as a second independent guard (ALRT-07)
  5. A student can click the unsubscribe link from the email and be unsubscribed with no sign-in required; on account deletion, all `bip_subscriptions` and `bip_alert_deliveries` rows cascade-delete (`ON DELETE CASCADE`); both tables carry RLS (`bip_subscriptions` with owner USING + WITH CHECK; `bip_alert_deliveries` service-role-only, no public policies); and `/privacy` enumerates both data surfaces (ALRT-06, FOUN-11, FOUN-12, FOUN-13)
**Plans**: TBD
**UI hint**: yes


### v1.3 Growth & Operational Efficiency (Phases 12–14 — planning)

> Plan: [.agents/plans/2026-08-12-v1-3-growth-ops.md](../.agents/plans/2026-08-12-v1-3-growth-ops.md) (approved 2026-08-12). Day 0 gate = Phase 8 verification (08-UAT 7 steps + 08-VERIFICATION). See that plan for decisions, work plan, and validation.

#### Phase 12: Duplicate BIP + Program Maturity
**Goal**: Coordinators duplicate an approved/rejected/changes_requested BIP into a new draft; detail page shows derived Edition N when N>1.
**Depends on**: v1.2 (builder complete) + Day 0 gate (deferred per user — Phase 12 shipped without gate).
**Requirements**: SUBM-15, SUBM-16
**Success Criteria**:
  1. Duplicate action clones all SUBM fields + partner universities into a new draft with regenerated slug and `duplicated_from_bip_id` FK `ON DELETE SET NULL`; no PII leakage.
  2. `/bip/[slug]` renders Edition badge only when edition>1 (recursive lineage, not stored counter).
**Plans**: 3 plans — 12.1 DDL 00045 + edition helper (done dde2f99), 12.2 duplicateBipAction + Duplicate affordance (done 91fc451), 12.3 Edition N badge + 3 seed chains + E2E bip-duplicate.spec.ts (done 2026-08-21)
**UI hint**: yes

#### Phase 13: Discovery — Exclude Partner-Only + Compare + Shortlist
**Goal**: Students filter out partner-only BIPs and compare/share shortlists via URL.
**Depends on**: Day 0 gate (no hard dep on Phase 12; can parallelize).
**Requirements**: BROW-15, DISC-08, DISC-09, GROW-01 (shortlist portion)
**Success Criteria**:
  1. `/bips?partnerOnly=exclude` hides partner-only cards; absent = show all; URL-driven and chip-removable.
  2. Compare 2–3 BIPs via `?ids=a,b,c` on `/bips/compare` (no table, cards with CTA), max 3, shareable incognito.
**Plans**: TBD
**UI hint**: yes

#### Phase 14: Admin Ops — CSV Export + Bulk Moderate
**Goal**: Admins export filtered queue as CSV and bulk approve/reject with per-row audit/ISR.
**Depends on**: Day 0 gate.
**Requirements**: TOOL-01, TOOL-02 (TOOL-03 deferred to v1.4)
**Success Criteria**:
  1. `GET /admin/export.csv` admin-guarded, filter passthrough, `text/csv` attachment.
  2. Bulk action returns `{succeeded, failed}` per row with per-row `bip_status_history` + `revalidatePath`.
**Plans**: 2 plans — 14.1 CSV export Route Handler (done fcf464b/8e54017: filtered+selected+coordinators, `getClaims()` guard, `text/csv`) + 14.2 bulk moderate Server Action + `BulkActionBar` + `AdminSelectionContext` (done: per-row audit + ISR + email, `AdminQueueClient` selectable) — verified 2026-08-24 (`tsc --noEmit` 0, `next build` 55/55)
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Discovery Foundation | v1.0 | 8/8 | Complete | 2026-05-09 |
| 2. Coordinator Auth + Submission | v1.0 | 7/7 | Complete | 2026-05-11 |
| 3. Admin Review + Email Notifications | v1.0 | 8/8 | Complete | 2026-05-12 |
| 4. Polish + Static Content + Performance Hardening | v1.0 | 7/7 | Complete | 2026-06-14 |
| 5. Student Auth + Role Model | v1.1 | 4/4 | Complete | 2026-06-15 |
| 6. Saved BIPs Sync | v1.1 | 4/4 | Complete | 2026-06-15 |
| 7. Alert Subscriptions + Email Pipeline | v1.1→v1.2 | 0/TBD | Deferred to v1.2 | - |
| 8. Edit-Approved + Request-Changes | v1.1 | 9/9 | Complete | 2026-06-26 |
| 9. Coordinator BIP Builder Completion | v1.2 | 9/9 | Complete | 2026-07-18 |
| 10. BIP Detail Page | v1.2 | 0/0 | Complete | 2026-08-10 |
| 11. Alert Subscriptions + Email Pipeline | v1.2 | 7/7 | Complete | 2026-08-10 |
| 12. Duplicate BIP + Program Maturity | v1.3 | 3/3 | Complete | 2026-08-21 |
| 13. Discovery — Exclude Partner-Only + Compare + Shortlist | v1.3 | 3/3 | Complete | 2026-08-21 |
| 14. Admin Ops — CSV Export + Bulk Moderate | v1.3 | 2/2 | Complete | 2026-08-24 |
