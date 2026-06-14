# Requirements: BipHub — v1.1 Product Depth & Engagement

**Defined:** 2026-06-14
**Core Value:** Students can reliably discover Erasmus+ BIPs and universities can self-service list them — v1.1 deepens this by giving students persistent accounts + re-engagement (alerts) and giving coordinators a non-destructive way to keep listings current.

> Predecessor milestone v1.0 (MVP) requirements are archived at `.planning/milestones/v1.0-REQUIREMENTS.md` (categories DISC, BROW, DETL, Info, AUTH, Submission, DASH, ADMN, FOUN-01..06 — all validated/shipped).

## v1.1 Requirements

Requirements for the v1.1 release. Each maps to a roadmap phase.

### Student Accounts & Saved BIPs (STUD)

- [ ] **STUD-01**: A student can create an account and sign in via magic-link (passwordless) email
- [ ] **STUD-02**: A student's session persists across visits and devices
- [ ] **STUD-03**: A signed-in student has a dedicated dashboard, separate from the coordinator and admin areas
- [ ] **STUD-04**: A student can save a BIP to their account and remove it
- [ ] **STUD-05**: A student's saved BIPs are stored server-side and sync across devices
- [ ] **STUD-06**: A student's existing localStorage bookmarks migrate to their account on first sign-in
- [ ] **STUD-07**: A student can view all of their saved BIPs in one place on their dashboard
- [ ] **STUD-08**: A student can delete their own account and all associated data

### BIP Alerts (ALRT)

- [ ] **ALRT-01**: A student can subscribe to alerts for new BIPs matching a chosen field of study and/or country
- [ ] **ALRT-02**: A student can choose alert frequency (daily or weekly)
- [ ] **ALRT-03**: A student receives an email digest listing newly-approved BIPs matching their subscription
- [ ] **ALRT-04**: A student can view, edit, and delete their alert subscriptions from their dashboard
- [ ] **ALRT-05**: Every alert email includes a working unsubscribe link and a `List-Unsubscribe` header
- [ ] **ALRT-06**: A student can unsubscribe via the email link without signing in
- [ ] **ALRT-07**: An alert is never sent twice for the same BIP + subscriber (idempotent delivery)
- [ ] **ALRT-08**: A subscription records the student's explicit consent at creation time

### Listing Editing & Re-Review (EDIT)

- [ ] **EDIT-01**: A coordinator can submit an edit to an already-approved BIP for admin re-review
- [ ] **EDIT-02**: An approved BIP stays publicly visible (showing the live approved version) while an edit is under re-review
- [ ] **EDIT-03**: An admin can view the proposed edit as a diff against the live BIP
- [ ] **EDIT-04**: An admin can approve an edit, merging it into the live BIP and refreshing the public page
- [ ] **EDIT-05**: An admin can reject an edit, leaving the live BIP unchanged
- [ ] **EDIT-06**: An admin can "request changes" on a pending submission (a third moderation state) with a note
- [ ] **EDIT-07**: A coordinator is emailed when their edit is approved, rejected, or has changes requested
- [ ] **EDIT-08**: Every edit and re-review action is recorded in the BIP status-history audit log
- [ ] **EDIT-09**: A BIP's slug cannot be changed through the edit flow (immutable after first approval)

### Foundation / Compliance (FOUN — continuing from v1.0)

- [ ] **FOUN-07**: Every new table has RLS with both USING and WITH CHECK, preventing cross-user access and role self-escalation
- [ ] **FOUN-08**: Adding the student role grants no access to coordinator/admin routes or BIP submission
- [ ] **FOUN-09**: Account erasure cascades all new v1.1 PII (saved BIPs, subscriptions, alert-delivery records)
- [ ] **FOUN-10**: The `/privacy` page enumerates every new v1.1 data surface

## Future Requirements

Deferred to a later milestone. Tracked but not in the v1.1 roadmap.

### Admin / Coordinator Tooling

- **TOOL-01**: An admin can export the BIP listing as CSV
- **TOOL-02**: An admin can bulk approve/reject from the review queue
- **TOOL-03**: A coordinator can see view and save counts for their own listings

### Discovery Enhancements

- **DISC-08**: A student can compare up to 3 BIPs side by side
- **DISC-09**: A student can share a shortlist of BIPs via a URL without an account
- **GROW-01**: `/bip/[slug]` emits schema.org JSON-LD for search-engine rich results

### Data Layer (parked)

- **API-01**: A versioned public read API exposes BIP data to external consumers (deliberately postponed until the product has an audience worth serving via API)

## Out of Scope

Explicitly excluded for v1.1. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Password auth for students | Magic-link only — removes ~40% signup abandonment; one fewer credential surface |
| Instant per-BIP alerts | Daily/weekly digest only in v1.1; instant adds webhook complexity for marginal value |
| Resend Audiences/Broadcasts migration | Manual `List-Unsubscribe` is correct at launch scale; revisit past ~500 subscribers |
| BIP reviews / ratings | Quality risk; deferred since v1.0 |
| In-platform application submission | Link out to university contact |
| Multilingual UI | English remains the BIP lingua franca for now |
| Public dev-facing API | Parked (see API-01) until there is external demand |

## Traceability

Which phases cover which requirements. Filled in during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| STUD-01 | Phase 5 | Pending |
| STUD-02 | Phase 5 | Pending |
| STUD-03 | Phase 5 | Pending |
| STUD-04 | Phase 6 | Pending |
| STUD-05 | Phase 6 | Pending |
| STUD-06 | Phase 6 | Pending |
| STUD-07 | Phase 6 | Pending |
| STUD-08 | Phase 6 | Pending |
| ALRT-01 | Phase 7 | Pending |
| ALRT-02 | Phase 7 | Pending |
| ALRT-03 | Phase 7 | Pending |
| ALRT-04 | Phase 7 | Pending |
| ALRT-05 | Phase 7 | Pending |
| ALRT-06 | Phase 7 | Pending |
| ALRT-07 | Phase 7 | Pending |
| ALRT-08 | Phase 7 | Pending |
| EDIT-01 | Phase 8 | Pending |
| EDIT-02 | Phase 8 | Pending |
| EDIT-03 | Phase 8 | Pending |
| EDIT-04 | Phase 8 | Pending |
| EDIT-05 | Phase 8 | Pending |
| EDIT-06 | Phase 8 | Pending |
| EDIT-07 | Phase 8 | Pending |
| EDIT-08 | Phase 8 | Pending |
| EDIT-09 | Phase 8 | Pending |
| FOUN-07 | Phase 5 | Pending |
| FOUN-08 | Phase 5 | Pending |
| FOUN-09 | Phase 6 | Pending |
| FOUN-10 | Phase 6 | Pending |

> **FOUN-09 and FOUN-10 distribution note:** Both requirements are cross-cutting — they apply to every phase that introduces a new PII-bearing table. They are assigned to Phase 6 (the earliest phase introducing such a table: `saved_bips`). The ongoing obligation is explicitly encoded in the Phase 7 and Phase 8 success criteria, which require that each new table (`bip_subscriptions`, `bip_alert_deliveries`, `bip_edits`) also carries `ON DELETE CASCADE` and is enumerated in `/privacy`.

**Coverage:**
- v1.1 requirements: 29 total
- Mapped to phases: 29 (Phase 5: 5, Phase 6: 7, Phase 7: 8, Phase 8: 9)
- Unmapped: 0 — full coverage confirmed

---
*Requirements defined: 2026-06-14*
*Last updated: 2026-06-14 — traceability filled in by roadmapper*
