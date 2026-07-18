# Roadmap: BipHub

## Milestones

- ✅ **v1.0 MVP** — Phases 1–4 (shipped 2026-06-14) — full detail in [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Product Depth & Engagement** — Phases 5, 6, 8 (shipped 2026-07-18; Phase 7 deferred to v1.2) — full detail in [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)
- 🚧 **v1.2 Coordinator BIP Builder** — Phases 9–10 (in progress)

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

### v1.2 Coordinator BIP Builder (Phases 9–10)

- [ ] **Phase 9: Coordinator BIP Builder Completion + BIP Detail Page** - the BIP data model is fully wired end-to-end (wizard → draft store → submit/edit → admin merge → diff view → detail page), two live data-integrity bugs fixed, and `/bip/[slug]` redesigned against the finalized field set
- [ ] **Phase 10: Alert Subscriptions + Email Pipeline** - students subscribe to new-BIP digest alerts by field/country, receive idempotent weekly/daily emails, and unsubscribe with no login required (carried from v1.1 Phase 7)

## Phase Details

### Phase 9: Coordinator BIP Builder Completion + BIP Detail Page
**Goal**: Universities can fully express a BIP through the builder — every field the schema supports is wired into the wizard, survives the edit-and-re-review round trip, and renders on a redesigned public detail page — closing the four orphaned-column gaps and two live validation bugs research identified by direct code inspection.
**Depends on**: Phase 8 (the `bip_edits` shadow-table edit-approval flow that SUBM-14's per-field round-trip requirement extends); also builds on Phase 2 (submission wizard) and Phase 3 (admin review merge). Hard-ordered internally: builder completion must land before the detail-page redesign, since the page layout is a mechanical function of the finalized `BipDetail` type and `.select()` strings, not a scheduling preference.
**Requirements**: SUBM-09, SUBM-10, SUBM-11, SUBM-12, SUBM-13, SUBM-14, DETL-11, DETL-12, DETL-13, DETL-14, DETL-15, DETL-16, BROW-14, FOUN-14
**Success Criteria** (what must be TRUE):
  1. A coordinator can enter the BIP's virtual-session count and duration/schedule notes, mark the BIP as open only to partner institutions, and add accommodation/practical-information notes in the builder — and every virtual-timing option the builder offers (`before`/`during`/`after`/`before_and_after`/`mixed`) saves successfully with no database CHECK-constraint error (SUBM-09, SUBM-10, SUBM-11, SUBM-12)
  2. The builder's participant-count field enforces the Erasmus+ minimum of 10, matching the database constraint, with no wizard path that allows saving a value below 10 (SUBM-13)
  3. A coordinator edits any of the newly-wired fields (virtual sessions, duration notes, partner-only flag, accommodation notes) on an already-approved BIP; once the admin approves that edit, the new value appears on the live public `/bip/[slug]` page — verified per field, not merely at wizard-render or diff-view time (SUBM-14, anti-Pitfall-1: seven-layer propagation)
  4. The public detail page shows the virtual-component detail, a clear partner-institution-only flag, a dedicated accommodation/practical-information section, correctly-framed green-travel and inclusion-support indicators (sending-institution framing, resolving the v1.1 badge-suppression gap), the participant capacity, and groups the full field set into labelled sections (overview, schedule/virtual component, practical information, application) with the deadline and Apply CTA prominent (DETL-11, DETL-12, DETL-13, DETL-14, DETL-15, DETL-16)
  5. A student browsing `/bips` sees a badge on cards for BIPs open only to partner institutions; and all three seed sources (`seed.sql`, `seed.e2e.sql`, `seed-cloud-e2e.mjs`) are updated for every new field, with the previously-duplicated `bip_edits` column-list literal consolidated into one shared constant (BROW-14, FOUN-14)
**Plans**: TBD
**UI hint**: yes

### Phase 10: Alert Subscriptions + Email Pipeline
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
| 9. Coordinator BIP Builder Completion + BIP Detail Page | v1.2 | 0/TBD | Not started | - |
| 10. Alert Subscriptions + Email Pipeline | v1.2 | 0/TBD | Not started | - |
