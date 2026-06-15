# Roadmap: BipHub

## Milestones

- ✅ **v1.0 MVP** — Phases 1–4 (shipped 2026-06-14) — full detail in [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)
- 🚧 **v1.1 Product Depth & Engagement** — Phases 5–8 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–4) — SHIPPED 2026-06-14</summary>

- [x] **Phase 1: Discovery Foundation** (8/8 plans) — students find & explore BIPs against seeded data — completed 2026-05-09
- [x] **Phase 2: Coordinator Auth + Submission** (7/7 plans) — coordinators register & submit via wizard — completed 2026-05-11
- [x] **Phase 3: Admin Review + Email Notifications** (8/8 plans) — admin editorial loop + Resend emails + audit log — completed 2026-05-12
- [x] **Phase 4: Polish + Static Content + Performance Hardening** (7/7 plans) — static content, GDPR, Lighthouse, Playwright E2E — completed 2026-06-14

Full phase details, success criteria, and per-plan breakdown: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

### v1.1 Product Depth & Engagement (Phases 5–8)

- [ ] **Phase 5: Student Auth + Role Model** - Students can register, sign in, and land on a dedicated dashboard; student role cannot access coordinator or admin areas
- [ ] **Phase 6: Saved BIPs Sync** - Students can save BIPs server-side, sync across devices, migrate localStorage bookmarks, and delete their account with full cascade
- [ ] **Phase 7: Alert Subscriptions + Email Pipeline** - Students can subscribe to new-BIP alerts, receive idempotent digest emails with working unsubscribe, and manage subscriptions from their dashboard
- [ ] **Phase 8: Edit-Approved + Request-Changes** - Coordinators can submit edits to live BIPs without taking them offline; admins can approve, reject, or request changes with a full audit trail

## Phase Details

### Phase 5: Student Auth + Role Model
**Goal**: Students can create accounts and sign in via magic link, landing on a dedicated dashboard that is completely separate from coordinator and admin areas — and adding students tightens (not weakens) existing role guards
**Depends on**: Phase 4 (v1.0 complete)
**Requirements**: STUD-01, STUD-02, STUD-03, FOUN-07, FOUN-08
**Success Criteria** (what must be TRUE):
  1. A student navigates to `/register/student`, enters an email, clicks the magic link, and lands on `/student-dashboard` — not `/dashboard` or `/admin`
  2. A student who signs out and revisits the magic link URL gets a graceful expired-link message, then signs in and resumes on `/student-dashboard`
  3. A student session persists across browser restarts (cookie-based SSR session survives a close-and-reopen)
  4. An authenticated student who navigates directly to `/dashboard` is redirected to `/student-dashboard` (middleware role guard fires)
  5. A student JWT cannot insert a row into `bips` — the tightened `bips_insert_coordinator` RLS policy blocks the attempt with a permission error
**Plans**: 4 plans
  - [x] 05-01-PLAN.md — DB foundation: 00015 migration (role CHECK, handle_new_user trigger, Custom Access Token Hook, tightened RLS), config.toml hook, bip-submit assertion, [BLOCKING] schema push
  - [x] 05-02-PLAN.md — Auth flow: signInWithOtpAction + signOutStudentAction, callback magiclink branch, middleware D-11 matrix
  - [x] 05-03-PLAN.md — UI: /register/student magic-link page + form, (student) route group layout + nav + dashboard shell
  - [ ] 05-04-PLAN.md — E2E validation: student seed fixture + student-auth.spec.ts (all SC + FOUN-07/08 + D-11/D-15)
**UI hint**: yes

### Phase 6: Saved BIPs Sync
**Goal**: Students can save and unsave BIPs from their account, view them all in one place, and migrate existing localStorage bookmarks — with every new PII table correctly wired for cascade deletion and enumerated in `/privacy`
**Depends on**: Phase 5
**Requirements**: STUD-04, STUD-05, STUD-06, STUD-07, STUD-08, FOUN-09, FOUN-10
**Success Criteria** (what must be TRUE):
  1. A signed-in student clicks the heart/save icon on a BIP card and the save persists after a full page reload (server-side, not localStorage)
  2. A student who saved BIPs on device A sees the same saved list on device B after signing in
  3. A student who had localStorage bookmarks from v1.0 signs in for the first time and finds those BIPs already in their saved list on `/student-dashboard/saved`
  4. A student's saved BIPs are all visible in one list at `/student-dashboard/saved`, showing current BIP metadata
  5. A student who deletes their account has all `saved_bips` rows removed (verified by direct SQL query — no orphan rows remain)
  6. The `/privacy` page enumerates the `saved_bips` data surface with its retention and deletion policy
**Plans**: TBD
**UI hint**: yes

### Phase 7: Alert Subscriptions + Email Pipeline
**Goal**: Students can subscribe to new-BIP alerts by field and/or country, receive daily or weekly digest emails exactly once per matching BIP, and unsubscribe via a signed link without needing to sign in — and all alert PII tables are cascade-wired and enumerated in `/privacy`
**Depends on**: Phase 6
**Requirements**: ALRT-01, ALRT-02, ALRT-03, ALRT-04, ALRT-05, ALRT-06, ALRT-07, ALRT-08
**Success Criteria** (what must be TRUE):
  1. A student creates a subscription for Engineering BIPs in Germany on their dashboard; the subscription appears in their active subscription list with the chosen frequency (daily or weekly)
  2. When an admin approves a new Engineering BIP in Germany, the pg_cron digest job runs and the subscribed student receives exactly one Resend email listing the BIP — running the digest job a second time produces no additional email for the same (BIP, subscriber) pair
  3. Every alert email contains a working unsubscribe link and a `List-Unsubscribe` header — clicking the link without being signed in sets `bip_subscriptions.active = false` and shows a confirmation page
  4. A student can view, edit the frequency of, and delete their alert subscriptions from `/student-dashboard`
  5. Each subscription row in `bip_subscriptions` stores a `consent_text` value captured at creation time
  6. A student who deletes their account has all `bip_subscriptions` and `bip_alert_deliveries` rows removed (GDPR cascade — ongoing obligation from FOUN-09); the `/privacy` page enumerates the subscription and delivery data surfaces (ongoing obligation from FOUN-10)
**Plans**: TBD
**UI hint**: yes

### Phase 8: Edit-Approved + Request-Changes
**Goal**: Coordinators can submit edits to already-approved BIPs that go through admin re-review — the live BIP stays fully public throughout — and admins have a third moderation state ("request changes") in addition to approve and reject, with every action recorded in the audit log
**Depends on**: Phase 5 (student role must exist before `bip_edits` GDPR cascade is wired to profiles; Phase 6–7 not required)
**Requirements**: EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, EDIT-06, EDIT-07, EDIT-08, EDIT-09
**Success Criteria** (what must be TRUE):
  1. A coordinator on an approved BIP's edit page sees a "Submit Edit for Review" CTA; submitting it creates a `bip_edits` row in `pending` status while the public `/bip/[slug]` URL continues to serve the original approved content unchanged
  2. An admin sees the pending edit in the review queue with an "Edit" badge (distinguishing it from a new submission) and a diff view comparing the proposed changes against the live BIP
  3. An admin who approves the edit sees the merged content live on `/bip/[slug]` within seconds (ISR `revalidatePath` fires); the `bip_status_history` table gains an `edit_approved` row
  4. An admin who rejects the edit leaves the live BIP content unchanged; the coordinator receives an email notification; `bip_status_history` gains an `edit_rejected` row
  5. An admin who requests changes sends the coordinator a note; the coordinator sees a `changes_requested` state on their dashboard with the admin's note and can revise and resubmit
  6. The slug of a BIP cannot be changed through the edit flow — the edit form excludes the slug field and the merge Server Action enforces immutability
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Discovery Foundation | v1.0 | 8/8 | Complete | 2026-05-09 |
| 2. Coordinator Auth + Submission | v1.0 | 7/7 | Complete | 2026-05-11 |
| 3. Admin Review + Email Notifications | v1.0 | 8/8 | Complete | 2026-05-12 |
| 4. Polish + Static Content + Performance Hardening | v1.0 | 7/7 | Complete | 2026-06-14 |
| 5. Student Auth + Role Model | v1.1 | 3/4 | Executing | - |
| 6. Saved BIPs Sync | v1.1 | 0/TBD | Not started | - |
| 7. Alert Subscriptions + Email Pipeline | v1.1 | 0/TBD | Not started | - |
| 8. Edit-Approved + Request-Changes | v1.1 | 0/TBD | Not started | - |
