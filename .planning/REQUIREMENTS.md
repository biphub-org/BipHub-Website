# Requirements: BipHub — v1.2 Coordinator BIP Builder

**Defined:** 2026-07-18
**Core Value:** Universities can fully express a BIP through a complete, self-service builder — which makes the public BIP detail page worth designing against — and students can re-engage through new-BIP alert digests (carried from v1.1 Phase 7).

> Predecessor requirements are archived: v1.0 MVP at `milestones/v1.0-REQUIREMENTS.md` (DISC, BROW, DETL, INFO, AUTH, SUBM, DASH, ADMN, FOUN-01..06 — all shipped) and v1.1 at `milestones/v1.1-REQUIREMENTS.md` (STUD, EDIT, FOUN-07..10 — shipped; ALRT-01..08 — deferred here). Research backing these requirements: `.planning/research/SUMMARY.md`.

## v1.2 Requirements

Each maps to a roadmap phase. REQ-IDs continue existing category numbering.

### Coordinator BIP Builder Completion (SUBM)

*Wire the BIP data model fully end-to-end. Four columns already exist in the DB but reach no UI; two live validation bugs ride alongside.*

- [x] **SUBM-09**: A coordinator can record the BIP's virtual-component detail — number of online sessions and free-text duration/schedule notes — in the builder *(wires `virtual_sessions_count`, `virtual_duration_notes`)*
- [x] **SUBM-10**: A coordinator can mark a BIP as open only to students from its listed partner institutions *(wires `partner_institutions_only`)*
- [x] **SUBM-11**: A coordinator can add accommodation / practical-information notes for prospective students *(wires `accommodation_notes`)*
- [x] **SUBM-12**: Every virtual-timing option the builder offers saves successfully — no selectable option violates the database CHECK constraint *(fixes the live `virtual_timing` enum mismatch)*
- [x] **SUBM-13**: The builder enforces the Erasmus+ minimum group size of 10 on the participant-count field, consistent with the database *(fixes the `max_participants` wizard floor of 5; planning must check existing/seeded BIPs for values below 10 before tightening)*
- [x] **SUBM-14**: Any field a coordinator enters in the builder round-trips through the edit-and-re-review flow — an approved edit to that field appears on the live BIP, with no field silently dropped at merge *(anti-Pitfall-1: seven-layer propagation, enforced by per-field E2E)*

### BIP Detail Page (DETL)

*Redesign `/bip/[slug]` against the finalized builder field set.*

- [ ] **DETL-11**: The detail page shows the virtual-component detail (session count + duration/schedule notes)
- [ ] **DETL-12**: The detail page clearly flags when a BIP is open only to partner-institution students, so a student knows before contacting the coordinator
- [ ] **DETL-13**: The detail page presents accommodation / practical information in a dedicated section
- [ ] **DETL-14**: The detail page shows green-travel and inclusion-support indicators with correct sending-institution framing *(resolves the v1.1 badge suppression — data collected but shown nowhere)*
- [ ] **DETL-15**: The detail page shows the BIP's participant capacity
- [ ] **DETL-16**: The detail page groups the complete field set into clear labelled sections (overview, schedule / virtual component, practical information, application) with the deadline and Apply CTA prominent

### Discovery (BROW)

- [x] **BROW-14**: A student browsing `/bips` sees a badge on BIPs that are open only to partner institutions

### BIP Alerts — Email Digest Pipeline (ALRT, carried from v1.1 Phase 7)

- [ ] **ALRT-01**: A student can subscribe to alerts for new BIPs matching a chosen field of study and/or country
- [ ] **ALRT-02**: A student can choose alert frequency — weekly (default) or daily
- [ ] **ALRT-03**: A student receives an email digest listing newly-approved BIPs matching their subscription
- [ ] **ALRT-04**: A student can view, edit the frequency of, and delete their alert subscriptions from their dashboard
- [ ] **ALRT-05**: Every alert email includes a working unsubscribe link and a `List-Unsubscribe` header (RFC 8058 one-click)
- [ ] **ALRT-06**: A student can unsubscribe via the email link without signing in
- [ ] **ALRT-07**: An alert is never sent twice for the same BIP + subscriber (idempotent delivery)
- [ ] **ALRT-08**: A subscription records the student's explicit consent text at creation time
- [ ] **ALRT-09**: A student can hold at most 5 active subscriptions *(cap — research-recommended default, confirm)*

### Foundation / Compliance (FOUN — continuing)

- [ ] **FOUN-11**: `bip_subscriptions` has RLS with owner USING + WITH CHECK policies (no cross-user access, no reassigning `user_id`); `bip_alert_deliveries` has RLS enabled with no public policies (service-role-only, written by the Edge Function)
- [ ] **FOUN-12**: Account erasure cascades all new alert PII (subscriptions and alert-delivery records)
- [ ] **FOUN-13**: The `/privacy` page enumerates the subscription and alert-delivery data surfaces
- [x] **FOUN-14**: Adding any BIP-model field updates all three seed sources (`seed.sql`, `seed.e2e.sql`, `seed-cloud-e2e.mjs`) and the duplicated `bip_edits` column-list literals are consolidated into one shared constant *(anti-drift; prevents the BUG-002-class regression — bip_edits column-list consolidation done in Plan 09-07; seed-source sync done in Plan 09-08)*

## Open Decisions (confirm during scoping / planning)

These are research-flagged choices baked into the draft as recommended defaults — change or confirm:

1. **Digest cadence default** — draft locks **weekly default, daily opt-in** (ALRT-02), matching the low-frequency student audience.
2. **Subscription cap** — draft locks **5** (ALRT-09), enforced in the Server Action (not a CHECK constraint).
3. **`bip_alert_deliveries.user_id` post-erasure** — `ON DELETE CASCADE` (simple, loses delivery audit) vs `SET NULL` (retains anonymized idempotency history). Draft assumes **CASCADE** via FOUN-12; flip if audit retention matters.
4. **Delivery idempotency write** — reserve-then-send vs write-after-confirmed-send (STACK.md and ARCHITECTURE.md differ). A Phase 10 planning detail; the unique `(bip_id, user_id)` constraint holds either way.
5. **`partner_institutions_only` as a browse *filter*** (not just a badge) — deferred to Future (differentiator) unless you want it in scope now.

## Future Requirements

Tracked, not in the v1.2 roadmap.

- **SUBM-15**: A coordinator can duplicate an existing BIP into a new draft (BIPs recur annually) — depends on builder completion so clones don't propagate gaps
- **SUBM-16**: A BIP shows a "program maturity / Nth edition" signal derived from its duplication lineage *(reviews/ratings substitute)*
- **BROW-15**: A student can filter `/bips` to exclude partner-only BIPs
- **TOOL-01/02/03**: Admin CSV export; bulk approve/reject; per-listing view/save counts (carried)
- **DISC-08/09, GROW-01**: BIP compare, shareable shortlist, `/bip/[slug]` JSON-LD (carried)
- **API-01**: Versioned public read API (parked until there's an audience)

## Out of Scope

Locked anti-features — do not re-litigate during planning (all confirmed by research + PROJECT.md).

| Feature | Reason |
|---------|--------|
| Rich-text / WYSIWYG editor for description fields | Contradicts the existing structured multi-field model; adds a stored-XSS surface. Constrained sanitized Markdown only on demonstrated need |
| University / coordinator photo uploads | Standing v1.0 out-of-scope item; gradient placeholders remain correct |
| JSON-LD / schema.org / public read API | Parked (see API-01) until there's a real audience — supersedes an earlier v1.1-research suggestion to bundle JSON-LD |
| Structured cost / funding calculator | Grant amounts set annually per National Agency across 29 countries; BipHub can't maintain that data |
| BIP reviews / ratings | Institutional-politics + moderation burden; "program maturity" signal is the substitute |
| Structured day-by-day itinerary builder | Format mismatch for 5–30-day programs; free text is correct |
| Instant per-BIP alerts | Digest (daily/weekly) only; instant adds webhook complexity for marginal value |
| Vercel Cron for digests | pg_cron → pg_net → Edge Function → Resend chosen; Vercel Hobby cron is once-daily + imprecise and breaks one-command local dev |

## Traceability

Finalized by the roadmapper against `.planning/ROADMAP.md`. Phase numbering continues from v1.1 (last phase 8) — v1.2 starts at Phase 9.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SUBM-09 | Phase 9 — Coordinator BIP Builder Completion | Complete |
| SUBM-10 | Phase 9 | Complete |
| SUBM-11 | Phase 9 | Complete |
| SUBM-12 | Phase 9 | Complete |
| SUBM-13 | Phase 9 | Complete |
| SUBM-14 | Phase 9 | Complete |
| BROW-14 | Phase 9 | Complete |
| FOUN-14 | Phase 9 | Complete |
| DETL-11 | Phase 10 — BIP Detail Page | Pending |
| DETL-12 | Phase 10 | Pending |
| DETL-13 | Phase 10 | Pending |
| DETL-14 | Phase 10 | Pending |
| DETL-15 | Phase 10 | Pending |
| DETL-16 | Phase 10 | Pending |
| ALRT-01 | Phase 11 — Alert Subscriptions + Email Pipeline | Pending |
| ALRT-02 | Phase 11 | Pending |
| ALRT-03 | Phase 11 | Pending |
| ALRT-04 | Phase 11 | Pending |
| ALRT-05 | Phase 11 | Pending |
| ALRT-06 | Phase 11 | Pending |
| ALRT-07 | Phase 11 | Pending |
| ALRT-08 | Phase 11 | Pending |
| ALRT-09 | Phase 11 | Pending |
| FOUN-11 | Phase 11 | Pending |
| FOUN-12 | Phase 11 | Pending |
| FOUN-13 | Phase 11 | Pending |

**Coverage:** 30/30 v1.2 requirements mapped, no orphans, no duplicates. **Phase 9** (8 requirements): SUBM-09..14, BROW-14, FOUN-14 — complete the builder + partner-only badge + anti-drift. **Phase 10** (6 requirements): DETL-11..16 — redesign `/bip/[slug]`; depends on Phase 9 (needs the finalized field set — mechanical dependency per research). **Phase 11** (16 requirements): ALRT-01..09, FOUN-11..13 — alert pipeline, independent. Totals by category: SUBM ×6, DETL ×6, BROW ×1, ALRT ×9, FOUN ×4 (FOUN-14 in Phase 9; FOUN-11/12/13 in Phase 11). Builder and detail-page split into separate phases (was one) per user decision: build the builder first, design the detail page after.

---
*Requirements defined: 2026-07-18 — scope confirmed (both phases); quality-revised (FOUN-11 RLS split, SUBM-13 group-size wording + backfill note, DETL-16 observable sections)*
*Traceability finalized: 2026-07-18 — roadmap created, Phase 9 / Phase 10 mapping locked, 30/30 coverage validated*
