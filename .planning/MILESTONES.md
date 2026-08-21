# Milestones

## v1.2 Coordinator BIP Builder (Shipped: 2026-08-10)

**Phases completed:** 3 phases (9–11), 16/16 plans
**Stats:** 2026-07-18 → 2026-08-10 (~23 days). Phases 9 (9/9 builder), Phase 10 (0-code detail verification), Phase 11 (7/7 alerts).

**Key accomplishments:**

- **Phase 9 — Coordinator BIP Builder Completion:** 4 orphaned columns (virtual_sessions_count, virtual_duration_notes, accommodation_notes, partner_institutions_only) wired through all 7 layers (migration + Zod + Zustand draft + wizard UI + 4 write paths + diff view + BipDetail query); 2 live-bug fixes (virtual_timing 5-value enum, max_participants floor 10→consistent with DB); FOUN-14 anti-drift (seed.sql + seed.e2e.sql + seed-cloud-e2e.mjs synced, duplicated column-list literals collapsed into BIP_EDIT_CONTENT_COLUMNS).
- **Phase 10 — BIP Detail Page:** 0-code verification — InlineBipPreview already renders same BipBody/BipKeyFacts/BipSidebar as /bip/[slug]; 17/17 renderToStaticMarkup checks (timing+dates+description, partner-only amber banner, accommodation, Fees, Funding & support with sending-institution framing, Max places, 10 labelled sections + CTA); Ready in 1874ms dev:turbo.
- **Phase 11 — Alert Subscriptions + Email Pipeline (carried from v1.1 Phase 7):** weekly default/daily opt-in, 5-cap, field/country matching, HMAC no-login unsubscribe (RFC 8058 List-Unsubscribe), explicit consent capture, pg_cron→pg_net→Edge Function→Resend on approved_at (never updated_at), unique (bip_id,user_id) idempotency, ON DELETE CASCADE for GDPR, /privacy enumeration, cron.job_run_details heartbeat succeeded 17:58 UTC (throwaway uat-cascade-1786388288 1→0 cascade verified), 4/4 E2E, 110 tests.

**Known Gaps:**

- **Phase 8 verification debt (still outstanding, now v1.3 Day-0 gate):** 08-VERIFICATION.md human_needed (EDIT-04 ISR timing + EDIT-07 Resend live delivery) + 08-UAT.md 7 steps deferred 2026-06-26. Must pass with RESEND_API_KEY set before v1.3 feature plans count as done.
- **Phase 05 human-UAT closed 2026-08-12** per user instruction (cloud Custom Access Token hook).

**Known deferred items at close:** Phase 8 gate (carried to v1.3), plus the two-tab false-conflict fix (239998b) unverified in-browser.

---



## v1.1 Product Depth & Engagement (Shipped: 2026-07-18)

**Phases completed:** 3 of 4 planned (Phases 5, 6, 8) — 17 plans

**Stats:** 127 commits (42 `feat`) · 2026-06-15 → 2026-07-18 (~33 days). Phase 7 (Alert Subscriptions) not built — see Known Gaps.

**Key accomplishments:**

- **Phase 5 — Student Auth + Role Model:** Student role added to the DB via a Custom Access Token Hook that mints the role into the first JWT; two RLS holes (self-escalation + BIP insert) and a signup-trigger privilege-escalation hole closed. Magic-link OTP sign-in, `/register/student` entry page + `/student-dashboard` shell, student sign-out variant, callback magiclink branch, and the middleware D-11 redirect matrix — the full student routing spine, server + UI. 8-test `student-auth.spec.ts` covering all success criteria plus FOUN-07/FOUN-08 guards, suite green.
- **Phase 6 — Saved BIPs Sync:** Server-side save/unsave with cross-device sync and localStorage-bookmark migration; new PII table cascade-wired for GDPR erasure and enumerated in `/privacy`.
- **Phase 8 — Edit-Approved + Request-Changes:** Coordinators submit edits to live approved BIPs through admin re-review while the public page stays up (shadow `bip_edits` table). New `changes_requested` moderation state (amber token + 4 transitions), 3 note-bearing edit-outcome email templates on the exhaustive `EmailPayload` union, all-fields side-by-side `BipEditDiffView` (22 fields), unified admin queue with Edit badges, and a three-button admin verdict panel. Full audit trail in `bip_status_history`.
- **Post-milestone stabilization:** BUG-001 (approved-edit wizard trapped by RLS) resolved via an `editMode` no-save path; BUG-002 (e2e shared-state cascade + Step-4 submission-wizard flake) resolved with dedicated fixtures and single-click save + conflict-recovery helpers. E2E suite green (38 passed / 2 skipped).

**Known Gaps:**

- **Phase 7 — Alert Subscriptions + Email Pipeline (NOT built):** Deliberately deferred to v1.2 to prioritize the coordinator BIP-builder work (which unblocks BIP detail-page design). All Phase 7 requirements carry forward to the v1.2 roadmap. The transactional email pipeline (`lib/email/send.ts`, Resend + 6 templates) shipped in v1.0/Phase 8 and is independent of the Phase 7 alert/digest layer.

**Known deferred items at close:** 4 (carried into v1.2, tracked in STATE.md Deferred Items) — Phase 8 Resend-delivery + ISR-refresh manual UAT/verification (EDIT-07/EDIT-04), Phase 05 1 pending human-UAT scenario, and the BUG-001 debug session (resolved in `9bcccc7`; session file simply not marked verified).

---

## v1.0 MVP (Shipped: 2026-06-14)

**Phases completed:** 4 phases, 30 plans, 80 tasks

**Stats:** 4 phases · 30 plans · 80 tasks · ~24,500 LOC · 231 commits (103 `feat`) · 2026-05-08 → 2026-06-14 (~37 days)

**Key accomplishments:**

- **Phase 1 — Discovery:** Public student experience — homepage with interactive Europe choropleth map, `/bips` browse with 7 URL-driven filters + 300ms-debounced unaccent FTS (GIN), `/bip/[slug]` detail with SSR meta + OG images + localStorage bookmarks; 20 seeded BIPs; RLS on every table (USING + WITH CHECK).
- **Phase 2 — Coordinator pipeline:** Supabase Auth (institutional email + verification), onboarding, 5-step submission wizard with debounced auto-save + `updated_at` optimistic locking, coordinator dashboard with status tabs.
- **Phase 3 — Admin editorial loop:** Triple-layer admin gate (middleware + layout + RLS), approve/reject with `bip_status_history` audit log + Resend emails + `revalidatePath()` ISR bust, all-listings + analytics.
- **Phase 4 — Polish / compliance:** `/what-is-a-bip` + `/privacy` static pages, GDPR Art-17 account erasure (SECURITY DEFINER RPC), repo health (CONTRIBUTING + MIT LICENSE + Contributor Covenant + gitleaks CI), static OG cards, Suspense/perf hardening, Playwright E2E (4 golden-path specs).
- **Milestone close:** Closed the rejected→revise→resubmit gap (cross-phase) and verified the full Playwright suite green against cloud Supabase (17 pass / 2 skip / 0 fail).

**Known deferred items at close:** 2 human-verify checkpoints (Phase 01 visual fidelity + EuropeMap; Phase 03 runtime email/ISR) — see STATE.md Deferred Items. Minor a11y colour-contrast polish deferred to v1.1. `BIPS-NAV-BUG` is a local `next start`-only artifact (deployed Vercel filters work) — not a production issue.

---
