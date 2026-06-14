# Research Summary: BipHub v1.1 — Product Depth & Engagement

**Project:** BipHub
**Domain:** EU Erasmus+ BIP directory — adding student accounts, email alerts, coordinator edit workflow, and admin tooling to an existing Next.js 15 + Supabase + Resend + Vercel system
**Researched:** 2026-06-14
**Confidence:** HIGH (all four research files grounded in live migrations, verified Supabase docs, and named comparable platforms)

---

## Gap Analysis — What Did v1.0 Miss?

| Gap | Why It Matters | Research Verdict |
|-----|---------------|-----------------|
| Email alerts for new BIPs matching saved field/country | The re-engagement loop. Without it students never return after a first session. LinkedIn Jobs, GoAbroad, Smart Job Board all ship this. | Table stakes — ship in v1.1 |
| Server-side student accounts + saved-BIP sync | localStorage bookmarks do not survive browser clears or cross-device use. Every major discovery platform requires an account for bookmark persistence. | Table stakes — prerequisite for alerts |
| Side-by-side BIP comparison (up to 3) | GoAbroad and GoOverseas both have this. BipHub's niche is exactly "help students choose between BIPs." | High-value differentiator — P2 candidate |
| Coordinator listing analytics (views, saves count) | Airbnb hosts see impressions and wishlist adds. Coordinators with no engagement data have no reason to improve listings or return. | Differentiator — P2 candidate |
| Edit-approved-BIP with re-review + "request changes" admin action | No edit path forces full withdraw+resubmit on any date or contact change = coordinator churn. "Request changes" stops binary approve/reject from causing the same churn. Airbnb, WPRentals, Microsoft SharePoint approval all ship this. | Table stakes — ship in v1.1 |

---

## Executive Summary

BipHub v1.0 shipped a complete three-audience MVP. v1.1 closes the gaps that make the platform feel like a v1 demo instead of a mature directory. Research confirms the highest-leverage additions are an email alert pipeline (the single most important missing feature for student re-engagement), server-side student accounts (prerequisite for alerts and cross-device sync), and a non-destructive edit-with-re-review workflow for coordinators and admins.

The stack requires no new services. All v1.1 capabilities are delivered by Supabase features already in the project (pg_cron, Edge Functions, Vault) and npm packages already installed (resend, @react-email/components). The critical scheduling decision is locked: pg_cron → Edge Function → Resend, not Vercel Cron. Vercel Cron on Hobby is once-per-day with ±59 min precision and a 10-second timeout. Supabase Cron is free-tier, runs inside the existing project, and triggers an Edge Function with a 150-second timeout — sufficient for digest loops at any realistic launch-scale subscriber volume.

The two areas carrying the most implementation risk are the edit-with-re-review pattern (ARCHITECTURE.md and PITFALLS.md are in tension; reconciled below) and GDPR compliance for the new email subscription surface. Every new PII table (saved_bips, bip_subscriptions, bip_alert_deliveries, bip_edits) must have ON DELETE CASCADE and be enumerated in /privacy — this is non-negotiable and easy to defer-and-forget when a new migration is written.

---

## Key Findings

### Stack (net new for v1.1)

No new npm packages required. Three key questions decided:

**Auth — student role:** Same `auth.users` table; third role added to `profiles.role CHECK ('coordinator' | 'admin' | 'student')`. Existing `sync_role_to_app_metadata()` trigger (migrations 00002/00008) mirrors role into JWT automatically. Custom Access Token Hook implemented as PL/pgSQL (in-process, no cold-start latency) not as an Edge Function.

**Email scheduling:** Supabase Cron (pg_cron) → pg_net HTTP POST → Supabase Edge Function (`send-bip-alerts`) → Resend. Zero new deploy targets. Resend's `batch.send()` (already installed) handles launch-scale digest batching up to 100 per API call.

**Subscription persistence:** `bip_subscriptions` table in Postgres with student-owned RLS. No new service.

**Core technology decisions:**

- `Supabase Cron (pg_cron)` — digest scheduling — already in Supabase project; free tier; replaces Vercel Cron Pro ($20/mo) which is unsuitable for weekly or sub-daily digests on Hobby plan
- `pg_net` — HTTP from Postgres to Edge Function — companion to pg_cron; requires explicit enabling in `supabase/config.toml` for local dev
- `Supabase Edge Functions (Deno)` — alert matcher + batch sender — 500K free invocations/month; 150-second timeout; correct home for background logic that must not run inside a Next.js Server Action
- `resend ^6.x` (already installed) — `resend.batch.send()` for digest; `react-email` (already installed) for `BipAlertEmail.tsx`

### Features

**Must have — table stakes (v1.1 must-ship):**

- Student accounts via magic-link auth (passwordless) — prerequisite for everything below; 40% abandonment reduction vs password-creation (Calendly data)
- Saved-BIP sync to server-side account — migrate localStorage on first sign-in
- Email alerts for new BIPs matching saved field + country — the re-engagement loop; highest-value missing feature
- Notification frequency preference (daily vs weekly) — digest control reduces unsubscribes
- Edit-approved-BIP with re-review trigger — standard marketplace pattern; current lack forces full resubmit
- "Request changes" admin action (third moderation state) — Microsoft/SharePoint approval pattern; reduces coordinator abandonment from binary approve/reject
- Admin CSV export — table stakes on any admin panel; S-complexity

**Should have — v1.1 scope candidates:**

- Side-by-side BIP comparison (up to 3) — GoAbroad and GoOverseas both ship this
- Shareable BIP shortlist URL (no account required) — S-complexity; works alongside server-side accounts
- Coordinator listing performance metrics (view count, save count) — Airbnb Insights pattern; high coordinator retention value
- Green-travel + inclusion-support visual badges on /bips cards — UI-only; data fields exist
- Admin bulk approve/reject — M-complexity; admin productivity gain
- JSON-LD structured data on /bip/[slug] — S-complexity, high SEO leverage

**Confirmed anti-features (do not build):** BIP reviews/ratings, in-platform application submission, public API (use JSON-LD + CSV as interim), multilingual UI, grant simulator, community forum, push notifications.

**Defer to v1.2+:** Partner university invite/claim flow, admin partner reconciliation UI, AI-powered BIP matching, institutional email domain validation.

### Architecture

v1.1 is an integration, not a rewrite. Existing patterns (RSC, Server Actions for mutations, `getClaims()` everywhere, `createAdminClient` confinement, ISR) unchanged.

**New tables:** `saved_bips`, `bip_subscriptions`, `bip_alert_queue`, `bip_alert_deliveries`, `bip_edits`

**New migrations (5):** `00015_student_role` → `00016_saved_bips` → `00017_bip_subscriptions` → `00018_bip_edits_workflow` → `00019_alert_pipeline`

**New route group:** `app/(student)/` with student auth guard + chrome; student-dashboard + saved pages.

**New Edge Function:** `supabase/functions/send-bip-alerts/` — alert matcher + Resend batch sender.

**Modified components (key):**
- `profiles.role` CHECK — extend to include `'student'`
- `bips_insert_coordinator` RLS — add `app_metadata.role IN ('coordinator', 'admin')` guard (currently role-blind)
- `profiles_update_own_or_admin` RLS — role-stability WITH CHECK (prevents student self-promotion)
- `middleware.ts` — add `/student-dashboard` guard; block students from `/dashboard`
- `lib/actions/auth.ts` — accept `role` param in `signUpAction`; route students to `/student-dashboard`

### Critical Pitfalls

14 pitfalls documented in PITFALLS.md. Highest severity:

1. **Student JWT role timing — silently blocked saves** — `sync_role_to_app_metadata()` trigger fires after JWT issuance; for up to 1 hour post-signup, `app_metadata.role` is null. Any student-table INSERT RLS that checks `role = 'student'` silently fails. Prevention: use `auth.uid() = user_id` as primary INSERT guard on `saved_bips` and `bip_subscriptions`; force session refresh in `/auth/callback`.
2. **Student weakens coordinator middleware guards** — v1.0 conflates "authenticated" with "coordinator" on `/dashboard`. Adding students without updating `bips_insert_coordinator` RLS allows students to insert BIPs. Fix: tighten RLS WITH CHECK + middleware role guard in same migration.
3. **Edit-approved leaks content or makes BIP disappear** — reconciled below.
4. **Email alert double-send** — pg_cron has no exactly-once guarantee; without `bip_alert_deliveries` with `UNIQUE(bip_id, user_id)`, retries send duplicates. Must exist before first cron run.
5. **No unsubscribe mechanism** — Missing `List-Unsubscribe` header + unsubscribe URL risks Resend account suspension and domain reputation damage. Recovery cost: HIGH. Must ship with the first alert email.
6. **Account erasure cascade missing for v1.1 PII tables** — every new table must have `ON DELETE CASCADE` and be reviewed in `delete_my_account()` RPC (migration 00013). Not optional.

---

## Reconciled Recommendation: Edit-Approved-BIP with Re-Review

**The tension:** ARCHITECTURE.md proposes `published_snapshot` JSONB column + `pending_edit` status on the `bips` row, with public RLS extended to `status IN ('approved', 'pending_edit')` and snapshot coalescence at the query layer. PITFALLS.md (P10) warns that a naive status change to `pending_edit` removes the BIP from public view and recommends a shadow `bip_edits` table where `bips.status` stays `'approved'` throughout re-review.

**Decision: shadow `bip_edits` table (PITFALLS.md approach).**

Rationale:
- `bips.status` never changes during an edit cycle. Public RLS (`status = 'approved'`) needs no modification. Eliminates the entire class of "BIP disappears during re-review" bugs.
- Admin diff view is natural: admin reads `bip_edits.edit_data` (proposed delta) against live `bips` row. No snapshot coalescence at query layer.
- Audit log extension is clean: new `action_kind` values (`edit_submitted`, `edit_approved`, `edit_rejected`) inserted explicitly by admin Server Actions. The `log_bip_status_change()` trigger is unchanged (it only fires on `UPDATE OF status`, which never happens in this flow).
- RLS on `bip_edits` uses the standard USING + WITH CHECK discipline. Coordinators can update their own pending edit rows but WITH CHECK clamps `status` to `'pending'` — no self-approval (P12).

**Safeguards required regardless of approach:**
- `revalidatePath('/bip/${slug}')` + `revalidatePath('/bips')` in `approveEditAction` and `rejectEditAction` (not `submitEditAction`). Public page serves live approved BIP during re-review — ISR cache is correct. Revalidation required only on merge or rejection.
- `bip_status_history.action_kind` CHECK must gain new values before any edit Server Actions are written.
- `bip_edits` UPDATE policy must include both USING and WITH CHECK (P12).
- Slug is immutable after first approval (P13). Enforced in edit UI + merge Server Action.

---

## Cross-Cutting GDPR Rule

Every new PII-bearing table added in v1.1 must satisfy all three conditions at migration time (not as later cleanup):

1. FK to `auth.users` or `profiles` with `ON DELETE CASCADE`
2. Reviewed in `delete_my_account()` RPC (migration 00013) — either covered by cascade or added as explicit DELETE step
3. Enumerated in `/privacy` under a new "Data we collect" section

Applies to: `saved_bips`, `bip_subscriptions`, `bip_alert_deliveries`, `bip_edits`

---

## Implications for Roadmap

### Phase 1 (5): Student Auth + Role Model

**Rationale:** Every student-facing v1.1 feature requires an authenticated student identity. Also closes a latent security hole: adding `student` to `profiles.role` without updating `bips_insert_coordinator` RLS and middleware allows students to submit BIPs.

**Delivers:** `/register/student` page, student sign-in routing to `/student-dashboard`, `app/(student)/` route group + dashboard shell, role-stable profiles UPDATE policy, coordinator middleware guards tightened.

**Pitfalls to avoid:** P1 (JWT role timing — use `auth.uid() = user_id` for student INSERT RLS), P2 (profiles table audit — `university_id` must be nullable; onboarding must not trigger for students), P3 (middleware + `bips_insert_coordinator` RLS must be updated in same migration as role extension).

**Migration:** `00015_student_role.sql`

### Phase 2 (6): Saved BIPs Sync

**Rationale:** Depends on Phase 1. First visible student value. Establishes GDPR cascade pattern for subsequent phases.

**Delivers:** `saved_bips` table + RLS, Server Actions (`saveBipAction`, `unsaveBipAction`, `getSavedBipsAction`), `SavedBipCard` component, student dashboard saved section, localStorage → server migration on first sign-in.

**Pitfalls to avoid:** P4 (missing RLS indexes — `saved_bips_user_id_idx` and `saved_bips_bip_id_idx` in same migration), P14 (GDPR cascade — `ON DELETE CASCADE` FK; `delete_my_account()` RPC review; `/privacy` update).

**Migration:** `00016_saved_bips.sql`

### Phase 3 (7): Alert Subscriptions + Email Pipeline

**Rationale:** Depends on Phase 2. This is the single highest-value v1.1 feature — the re-engagement loop. Most complex phase: new table, new Edge Function, Postgres trigger, pg_cron schedule, Resend template, and several GDPR requirements that must all ship together. Do not build the alert email template before the unsubscribe infrastructure is in place.

**Delivers:** `bip_subscriptions` table + RLS + `consent_text` column, `bip_alert_queue` + `enqueue_new_bip_alert` trigger, `bip_alert_deliveries` idempotency table, `send-bip-alerts` Edge Function (chunked Resend batch sends), `BipAlertEmail.tsx` React Email template, `SubscriptionManager` component, public `/api/unsubscribe` route (signed HMAC token, no auth required), `List-Unsubscribe` header on all alert emails, `/privacy` update for subscriptions.

**Pitfalls to avoid:** P5 (idempotency table with `UNIQUE(bip_id, user_id)` before first cron run), P6 (chunk Resend sends in groups of 5 with 100ms delay; `Promise.allSettled` not `Promise.all`), P7 (`List-Unsubscribe` header + signed unsubscribe link in every alert email; public unsubscribe endpoint without auth), P8 (`consent_text` column on `bip_subscriptions`; `/privacy` update), P14 (all three new tables with `ON DELETE CASCADE`; `delete_my_account()` RPC updated).

**Migrations:** `00017_bip_subscriptions.sql`, `00019_alert_pipeline.sql`

**Research flag:** Needs closer attention during planning. `pg_net` requires enabling in `supabase/config.toml`. Local pg_cron cannot call a public URL — Edge Function must be invoked manually via `supabase functions serve` for end-to-end local testing.

### Phase 4 (8): Edit-Approved-BIP + Request-Changes Admin Action

**Rationale:** Independent of Phases 2-3. Can be parallelized or built sequentially after Phase 3. Classified P1 table stakes in FEATURES.md because the lack of an edit path is a coordinator churn risk.

**Delivers:** `bip_edits` shadow table + RLS (coordinator: own-pending only; admin: all), extended `bip_status_history.action_kind` CHECK, `submitEditAction` Server Action, `approveEditAction` + `rejectEditAction` admin Server Actions, coordinator edit page CTA ("Submit Edit for Review" when BIP is approved), admin review queue updated to show pending `bip_edits` rows, `BipEditDiff` component, `changes_requested` status value + coordinator notification for "request changes" admin action.

**Pitfalls to avoid:** P9 (`revalidatePath('/bip/[slug]')` in approve/reject actions, not submit), P10 (`bip_edits` shadow table; `bips.status` stays `'approved'` throughout), P11 (explicit `INSERT INTO bip_status_history` for `edit_approved`/`edit_rejected`), P12 (`bip_edits` UPDATE WITH CHECK clamps `status` to `'pending'`), P13 (slug immutable), P14 (`bip_edits` with `ON DELETE CASCADE`; `delete_my_account()` updated; `/privacy` updated).

**Migration:** `00018_bip_edits_workflow.sql`

### Suggested Scope Items (User to Prioritize)

| Feature | Complexity | Priority |
|---------|-----------|---------|
| Side-by-side BIP comparison (up to 3) | M | P2 — high student value |
| Admin CSV export | S | P1 — bundle with Phase 3 or 4 |
| Admin bulk approve/reject | M | P2 |
| Coordinator listing performance metrics | S | P2 |
| Green-travel + inclusion-support badges on /bips cards | S | P2 — UI-only |
| Shareable BIP shortlist URL (no account) | S | P2 |
| JSON-LD structured data on /bip/[slug] | S | P1 — bundle with Phase 3 or 4; high SEO leverage for low cost |

### Phase Ordering Rationale

- Phases 1 → 2 → 3 are strictly sequential: student auth creates the identity layer, saved BIPs establishes the first student data surface, alert pipeline depends on subscription data and student identity.
- Phase 4 is fully independent — coordinator and admin paths only. Parallelizable.
- GDPR cascade pattern established in Phase 2 must be treated as a checklist item on every subsequent new table migration.
- Do not build the alert email template before the unsubscribe infrastructure (P7 recovery cost: HIGH — domain reputation damage takes weeks to recover).

---

## Watch Out For

These pitfalls have HIGH recovery cost if skipped:

1. **Missing `List-Unsubscribe` header on alert emails** — Resend account suspension risk; domain reputation damage. Must ship with the first alert email.
2. **`bip_edits` UPDATE policy missing WITH CHECK** — coordinator self-approval via REST API. Apply USING + WITH CHECK discipline.
3. **Public BIP taken offline during re-review** — use shadow `bip_edits` table, not a `pending_edit` status change on the `bips` row.
4. **Account deletion failing with FK violation** — GDPR Article 17 breach. Wire `ON DELETE CASCADE` at table creation, not later.
5. **Alert double-send on cron retry** — `bip_alert_deliveries` idempotency table must exist before first production cron run.

---

## Open Questions for Requirements / Roadmap

| Question | Options | Recommendation |
|----------|---------|----------------|
| Phase 4 timing: v1.1 Phase 4, or defer to v1.2? | parallel / sequential after Phase 3 / v1.2 | After Phase 3 (sequential, single-developer) |
| Which scope items are in v1.1? | All 7, some, or defer | Bundle Admin CSV export + JSON-LD (S-complexity); defer comparison tool to its own phase |
| Magic-link only, or magic-link + password for students? | magic-link only vs both | Magic-link only for v1.1 (~40% lower abandonment) |
| Instant digest in v1.1? | instant vs daily/weekly only | Start with daily/weekly; instant later |
| Subscription limit per student? | unlimited vs cap | Cap at 5; enforce in Server Action + UI |
| Coordinator listing metrics: views only or views + saves? | views only vs both | Both from start (save count from `saved_bips` aggregation) |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All decisions verified against Supabase docs and live migrations; pg_cron GA Dec 2024; no new npm packages |
| Features | HIGH (table stakes) / MEDIUM (student engagement specifics) | Comparable platforms verified 2026-06-14; student behavior inferred from comparators |
| Architecture | HIGH | Live migration files read and cross-referenced with Supabase RLS / pg_cron / Edge Function docs |
| Pitfalls | HIGH | 14 pitfalls derived from live codebase + Supabase/Resend official docs |

**Overall confidence:** HIGH

### Gaps to Address

- **Student conversion rate** — re-engagement hypothesis inferred from comparable platforms; validate after first digest runs.
- **Resend free tier ceiling (100/day)** — Phase 3 plan should document the upgrade trigger (Resend Starter $20/mo for 5K/day).
- **`pg_net` local dev status** — confirm `supabase/config.toml` has `pg_net` enabled before Phase 3 planning.
- **Resend Audiences migration path** — manual `List-Unsubscribe` is correct for launch; evaluate Resend Audiences at >500 subscribers.

---

*Research completed: 2026-06-14*
*Ready for roadmap: yes*
*Milestone: BipHub v1.1 — Product Depth & Engagement*
