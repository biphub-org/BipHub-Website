# Plan: Phase 11 — Alert Subscriptions + Email Digest Pipeline + Phase 10 Closure

**Date:** 2026-08-10
**Phase:** 11 (plus Phase 10 closure, 10 → Closed)
**Requirements:** ALRT-01..09, FOUN-11..13 (Phase 10 DETL-11..16 already verified — no code change)
**Parallel contract:** Phase 11 owns migrations `00042+` and `lib/supabase/database.types.ts` regen (STATE.md 2026-07-26). Phase 10 is already code-complete outside GSD.

---

## Goal

Close Phase 10 formally (detail page already equals builder preview) and ship Phase 11 so a student can subscribe to field/country digests (daily/weekly, 5-cap), receive a Resend batch digest exactly once per BIP via a real `pg_cron → pg_net → Edge Function` pipeline, and unsubscribe without signing in, with RLS, GDPR cascade, and infrastructure-first verification (real `cron.job_run_details` row, not a deferred check).

## Success Criteria

**Phase 10 — Closed (no code):**
- `REQUIREMENTS.md` DETL-11..16 marked checked with note 00024/00026 field-set lock (timing + `virtual_session_dates` + description is the DETL-11 definition), `ROADMAP.md` Phase 10 `Complete`, `STATE.md` `completed_phases: 2`, and the 17/17 `renderToStaticMarkup` verification (real HTML) cited as evidence — already produced 2026-08-10.

**Phase 11 — Must be TRUE (per ROADMAP.md §Phase 11):**
1. **Infrastructure-first:** `supabase/config.toml` has `pg_net = true` + migration `CREATE EXTENSION pg_net` applied, and a real `pg_cron` job is firing — verified by `SELECT * FROM cron.job_run_details` on the cloud TEST project (`zbvcpiwbopmfbjfhzprw`), before any Server Action/UI counts as done (Pitfall 4/6).
2. Student creates subscription (field and/or country, `weekly` default, `daily` opt-in), views/edits frequency/deletes from `/student-dashboard` — 6th active rejected (ALRT-01,02,04,09).
3. Student receives digest email listing newly-approved matching BIPs (anti-join on `bips.approved_at`), with signed `List-Unsubscribe` + `List-Unsubscribe-Post` headers and RFC 8058 one-click link; row stores explicit `consent_text` (ALRT-03,05,08).
4. Idempotency: running the Edge Function twice never re-sends same `(bip_id,user_id)` — keyed on `bips.approved_at` (never `updated_at`) + unique constraint on `bip_alert_deliveries` as second guard; `approved_at` set once on `pending→approved` (Pitfall 3) (ALRT-07).
5. No-login unsubscribe via HMAC token works; `DELETE CASCADE` erases both tables on `auth.users` delete; `bip_subscriptions` has owner `USING` + `WITH CHECK` (no `user_id` reassign), `bip_alert_deliveries` is RLS-enabled service-role-only (no public policies); `/privacy` enumerates both surfaces (ALRT-06, FOUN-11,12,13).

---

## Context And Current Facts

**Grounded in repo today:**
- Detail page: `app/(public)/bip/[slug]/page.tsx` (ISR `revalidate=3600`, `dynamicParams=true`, `generateStaticParams`); `lib/queries/bipDetail.ts` already selects current field set; `components/bip/BipBody.tsx`/`BipKeyFacts.tsx`/`BipHeader.tsx`/`BipCover.tsx`/`BipSidebar.tsx`/`BipMobileApplyBar.tsx` render all student-facing fields; `components/forms/InlineBipPreview.tsx` + `FullPagePreview.tsx` use same components; `components/forms/wizardAdapter.ts:63-64` `null` for legacy `virtual_sessions_count`/`virtual_duration_notes` is intentional per `supabase/migrations/00024_bip_builder_field_revision.sql:10` and `00026_virtual_session_dates_array.sql`.
- Phase 10 verified 2026-08-10 via `renderToStaticMarkup` (17/17, `hasBipHub` true, `STATUS 200 BYTES 225338`) — that evidence is the real HTML users see, not a proxy. `npm run test` 110/110, `npm run lint` 0 errors.
- Phase 11 is clean-slate: no `bip_subscriptions`/`bip_alert_deliveries` tables exist; `supabase/config.toml` currently has no `pg_net` entry (`grep pg_net` empty confirmed); `lib/email/send.ts` already has Resend + console fallback pattern (D-15) and 6 existing templates using `@react-email/components` + `render()`; `lib/supabase/admin.ts` is confined to `app/(admin)/` per eslint rule (verified in Phase 1); Edge Functions run Deno 2 (`edge_runtime.deno_version = 2` in config already).
- Shared cloud TEST project ref `zbvcpiwbopmfbjfhzprw` (from `playwright.config.ts` guard) is the only sanctioned e2e target; local `pg_cron` cannot hit a public URL — local E2E must use `supabase functions serve` manual invoke (per STACK.md).
- Resend free tier 100/day — ROADMAP warns upgrade to Starter $20/mo at launch volume.
- Parallel contract (STATE.md 2026-07-26): Phase 11 owns migrations `00042+` and `database.types.ts` regen; Phase 10 needs no DDL — respected in this plan (no migration number collision, no file overlap).

**Research spine (locked stack, not relitigated):** `pg_cron` (pre-enabled on all Supabase tiers, 2026) → `pg_net` (explicit enable) → Supabase Edge Function (Deno, service-role) → Resend `batch.send` (100/recipient per call, per-item `headers`), HMAC via `node:crypto` (no JWT lib), Supabase Vault for cron secret. Rejected: Vercel Cron (Hobby: 1/day, ±59m precision), Tiptap/`pgmq`/`jose`. See `.planning/research/STACK.md` and `SUMMARY.md` (2026-07-18, HIGH confidence).

## Constraints And Non-goals

**Non-goals (locked, do not relitigate — REQUIREMENTS.md Out of Scope + research Defer):** rich-text/WYSIWYG, photo uploads, JSON-LD/public API, cost calculator, reviews/ratings, day-by-day itinerary, instant per-BIP alerts, Vercel Cron, `partner_institutions_only` as a browse filter (deferred unless you ask).

**Constraints:**
- YOLO mode, vertical slices, Server Actions for all mutations except the one sanctioned public `GET /api/unsubscribe` (HMAC) — must stay outside `app/(admin)/` but use `createAdminClient` only there would violate CLAUDE.md; use a dedicated service-role helper inside the Route Handler with a code comment citing the exception.
- Keep one-command local dev (`supabase start` + `npm run dev:turbo`) — verified `Ready in 1874ms` today; Edge Function local testing is manual `supabase functions serve`, not `pg_cron` to localhost.
- No `getSession()` anywhere (use `getClaims()`), `await cookies()` in every server client factory, `revalidatePath()` not webhooks, dynamic Tailwind classes forbidden (lookup objects), `database.types.ts` regen only after `supabase db push` to cloud (never `--local` first).

## Key Decisions

| Decision | Recommended | Why | Rejected |
|----------|-------------|-----|----------|
| Digest cadence default | **Weekly default, daily opt-in** (ALRT-02) | Low-frequency student audience, matches research default and ROADMAP Open Decision #1 | Daily default (noisy, drives unsubscribes) |
| Subscription cap | **5 active** enforced in Server Action (ALRT-09, Open Decision #2) | Research default, bounded Resend cost, trivial UX copy | CHECK constraint (less friendly error), no cap (abuse) |
| `bip_alert_deliveries.user_id` on account delete | **`ON DELETE CASCADE`** (Open Decision #3) | Simple, matches FOUN-12; audit retention not required at v1.2 volume | `SET NULL` (retains anonymized rows — add later if audit needed, no migration rework if we start CASCADE) |
| Idempotency write order | **Reserve-then-send** (insert delivery row with `onConflictDoNothing` before `resend.batch.send`, unique `(bip_id,user_id)` guards — Open Decision #4) | If Resend succeeds but process crashes before write, retry would duplicate; reserve first makes retry idempotent (second guard) | Write-after-send (duplicate on crash) |
| High-water mark column | **`bips.approved_at timestamptz` set once on `pending→approved`** (Pitfall 3) | `updated_at` is bumped by `approveEditAction` merge, causing re-notify on typo fixes | `updated_at` or `created_at` |
| Unsubscribe token | **HMAC-SHA256 `user_id:subscription_id` via `node:crypto` + `timingSafeEqual`, base64url, no expiry** | Zero deps, single-consumer, no refresh needed | JWT/`jose` (overkill), raw query param without signature (tamperable) |
| Delivery history table RLS | **`bip_alert_deliveries`: RLS enabled, zero public policies (service-role-only)** | Written only by Edge Function, never read by users; FOUN-11 split explicitly requires this | Owner-select policy (leaks delivery metadata) |
| Email batching | **`resend.batch.send` 100/recip per call, sequential batches with 500ms delay** | Resend 2 req/s limit (STACK.md), per-item `List-Unsubscribe` headers needed | Single bulk call without headers, queue lib |

## Recommended Approach

**Order: Phase 10 closure (bookkeeping, ~15min) then Phase 11 in 7 sequenced plans.** Build Phase 11 infrastructure-first — no Server Action or dashboard UI lands without a green `cron.job_run_details` row on the cloud TEST project. Keep the alert write surface strictly additive: zero edits to `approveBipAction`/`approveEditAction` (read-only dependency). Wire the `bip_edits` anti-drift lesson into every new column (single migration is the source, then Server Actions + Edge Function + `/privacy` all read it).

**Why this sequencing:** `approved_at` must exist and `pg_cron+pg_net` must be proven firing before subscription creation matters — otherwise subscriptions collect but never deliver, and manual `pg_net` debugging later touches live rows.

## Work Plan

**Plan 10-Close — Phase 10 formal closure (0 code, bookkeeping only)**
- Surfaces: `.planning/REQUIREMENTS.md` (check DETL-11..16 with 00024/00026 note), `.planning/ROADMAP.md` (Phase 10 `Complete`, add completion date), `.planning/STATE.md` (bump `completed_phases:2`, move Phase 10 to recent decisions, record 17/17 render verification + 110 tests + turbo 1874ms as evidence), `.planning/phases/10-bip-detail-page/10-VERIFICATION.md` (new, 1-page).
- Depends: none. Validation: `grep -r DETL REQUIREMENTS` shows checked; `STATE` shows `Phase 10 CLOSED`.

**Plan 11-01 — DDL + RLS + `approved_at` backfill + `pg_net` enable (BLOCKING, must `db push` to cloud before `db:types` regen)**
- Surfaces: `supabase/migrations/00042_bip_subscriptions_and_deliveries.sql` (creates `bip_subscriptions(id, user_id FK ON DELETE CASCADE, field, country, frequency enum, consent_text, created_at)` + `bip_alert_deliveries(id, bip_id FK, user_id FK ON DELETE CASCADE, delivered_at, unique(bip_id,user_id))` + `bips.approved_at timestamptz`), `supabase/migrations/00043_enable_pg_net_and_approved_at_trigger.sql` (`CREATE EXTENSION pg_net` + `ON UPDATE` trigger to set `approved_at = now()` only when `OLD.status != 'approved' AND NEW.status = 'approved'` + backfill `approved_at = updated_at` where `status='approved'` and null), `supabase/config.toml` (`[db.extensions] pg_net = true`), `lib/constants/bip-alerts.ts` (frequency enum, cap 5, consent text constant).
- Owner: Phase 11 only (00042+). Validation: `supabase db push --linked` succeeds; `SELECT extname FROM pg_extension WHERE extname='pg_net'` true locally and on cloud; `SELECT approved_at FROM bips WHERE status='approved'` non-null.

**Plan 11-02 — `pg_cron` job + `pg_net.http_post` wiring + `cron.job_run_details` proof (infra gate)**
- Surfaces: `supabase/migrations/00044_schedule_bip_digest.sql` (schedules `daily` + `weekly` cron entries pointing at `https://<ref>.supabase.co/functions/v1/send-bip-alerts` with Vault-stored shared secret header), `supabase/functions/send-bip-alerts/.env.example` (shared secret placeholder), verification script `scripts/verify-cron.ts` (queries `cron.job_run_details`).
- Validation: `SELECT * FROM cron.job WHERE jobname LIKE 'bip_digest%'` exists; `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 1` shows `status='succeeded'` on cloud TEST project (not deferred). **This plan's green is the gate for all later plans.**

**Plan 11-03 — Edge Function: anti-join matcher + HMAC + Resend batch + idempotency**
- Surfaces: `supabase/functions/send-bip-alerts/index.ts` (Deno, service-role `supabase-js`, `approved_at` anti-join: `SELECT b.* FROM bips b WHERE b.approved_at > $last_cursor AND NOT EXISTS (SELECT 1 FROM bip_alert_deliveries d WHERE d.bip_id=b.id AND d.user_id=sub.user_id)`, per-subscription field/country match, reserve-then-send with `onConflictDoNothing`, `List-Unsubscribe: <https://biphub.eu/api/unsubscribe?token=...>` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers, `resend.batch.send`), `lib/email/templates/AlertDigest.tsx` (React Email, reused locally for unit snapshot, Edge Function renders via own `render()` call), `lib/constants/unsubscribe.ts` (HMAC helpers with `timingSafeEqual`).
- Validation: `supabase functions serve` manual curl triggers two consecutive runs — second sends 0 emails (idempotency); `resend.batch.send` spy shows correct headers; unit tests for HMAC + matcher (field/country/both logic).

**Plan 11-04 — Server Actions: create / update frequency / delete / list (5-cap + consent + RLS WITH CHECK)**
- Surfaces: `lib/actions/bip-subscriptions.ts` (`createSubscriptionAction`, `updateSubscriptionAction`, `deleteSubscriptionAction`, `listSubscriptionsAction` — all `getClaims()`-gated, `WITH CHECK` prevents `user_id` reassign, cap enforced before insert, stores `consent_text`), `lib/schemas/bip-subscriptions.ts` (Zod), `lib/queries/subscriptions.ts` (RLS-safe selects).
- Validation: `vitest run` 112 tests (existing 110 + 2 new: 6th subscription rejected, cross-user update 403 via RLS); `getClaims()` middleware covers `/student-dashboard`.

**Plan 11-05 — Student dashboard UI: subscribe + manage (field/country pickers + frequency toggle)**
- Surfaces: `app/(student)/student-dashboard/page.tsx` (extends existing Phase 6 saved-BIPs dashboard — adds Alerts section), `components/student/AlertSubscriptionForm.tsx`, `components/student/AlertSubscriptionCard.tsx`, `lib/store/alert-draft.ts` (if needed for form state, minimal), reuse `@base-ui/react` + `shadcn` + `cmdk` for field/country pickers (picker options from `lib/isced.ts` + `lib/countries.ts` already in repo).
- Validation: Playwright `student-authed` project — create weekly subscription, edit to daily, delete, assert 6th-rejected toast; a11y: axe sweep on `/student-dashboard`.

**Plan 11-06 — No-login unsubscribe: HMAC verify + Route Handler + RLS-correct delete**
- Surfaces: `app/api/unsubscribe/route.ts` (public `GET ?token=`, `timingSafeEqual` HMAC verify, `DELETE FROM bip_subscriptions WHERE id=?` via service-role — one sanctioned `createAdminClient`-outside-admin exception, documented with `// Phase-11 exception: public unsubscribe, RLS cannot cover unauthenticated` comment + eslint disable), `app/api/unsubscribe/page.tsx` (confirmation HTML, no auth gate).
- Validation: Playwright — create subscription as student A, fetch unsubscribe link from `resend` spy / DB token, `GET /api/unsubscribe?token=` as anonymous → 200 + row deleted; invalid token → 403; `GET` as different user → still deletes (token is capability, not session).

**Plan 11-07 — `/privacy` GDPR enumeration + FOUN cascade proof + polish**
- Surfaces: `app/(public)/privacy/page.tsx` (adds Subscription + Alert-delivery surfaces, consent text, retention note), `supabase/migrations/00013_delete_my_account` already cascades via FKs — verify `ON DELETE CASCADE` present, no RPC edit needed, `tests/e2e/saved-bips.spec.ts` + new `tests/e2e/alert-subscriptions.spec.ts` (throwaway student via admin API, never mutates `e2e-student@biphub.test`).
- Validation: `verify:seed` still green; `DELETE FROM auth.users WHERE id=throwaway` → `SELECT COUNT(*) FROM bip_subscriptions WHERE user_id=throwaway` = 0 and same for deliveries; `/privacy` snapshot test.

**Ordering:** 10-Close → 11-01 → 11-02 (GATE) → 11-03 → 11-04 → 11-05 → 11-06 → 11-07. 11-04/11-05 can be swapped after 11-03 but not before the infra gate.

## Validation Plan

- **Build/type:** `npm run lint` 0 errors, `npx tsc --noEmit` 0 errors (after each `db push` + `npm run db:types`), `npm run test` (vitest) — target 115+ (110 existing + 5 new unit: HMAC, matcher, cap, consent, idempotency).
- **Infrastructure (blocking):** `supabase db push --linked` → `SELECT * FROM cron.job_run_details WHERE jobname LIKE 'bip_digest%' ORDER BY start_time DESC LIMIT 1` → `status='succeeded'` on cloud TEST project (manual `SELECT`, not deferred). Local: `supabase functions serve` + `curl -H "Authorization: Bearer $CRON_SECRET" https://127.0.0.1:54321/functions/v1/send-bip-alerts` triggers two runs — second = 0 sends.
- **E2E (Playwright, `student-authed` project, chromium only, workers:1, retries:0 per `playwright.config.ts`):** `tests/e2e/alert-subscriptions.spec.ts` — create (weekly default), edit frequency, 6th-rejected, delete, no-login unsubscribe (anonymous GET), GDPR cascade (throwaway user delete), digest email spy asserts `List-Unsubscribe` + `List-Unsubscribe-Post` headers. Uses `RESEND_API_KEY=''` console fallback for header assertion (existing D-15 pattern).
- **Manual (human-verify, to be carried to v1.2 close per STATE.md pattern):** real Resend delivery + `revalidatePath` on approve (existing Phase 08 debt) — document but do not block Phase 11 gate.

## Risks / Rollback

- **Stale `approved_at` backfill:** if `updated_at` spread is wide, blindly backfilling `approved_at = updated_at` may mark old BIPs as newly eligible — mitigation: backfill only where `status='approved'` and `approved_at IS NULL`, set to `updated_at` (conservative; first digest may send a one-time burst of old BIPs — acceptable at <500 BIPs, documented).
- **Resend 100/day free tier:** digest burst may hit ceiling at launch — mitigation: sequential `batch.send` with delay, log `429` and retry next cron tick; document upgrade trigger (Starter $20/mo) in `11-01` plan.
- **Migration number collision:** Phase 11 owns `00042+` per parallel contract — mitigation: `git status` check before each migration, fail closed if number taken.
- **Rollback:** additive DDL only — revert by `DROP TABLE bip_alert_deliveries, bip_subscriptions CASCADE` + `DROP EXTENSION pg_net` + `DELETE FROM cron.job WHERE jobname LIKE 'bip_digest%'` + revert `config.toml`. No data loss beyond test subscriptions (re-seed via `scripts/seed-cloud-e2e.mjs`).

## Open Questions

**None — all 5 ROADMAP Open Decisions resolved above (weekly default, 5-cap, CASCADE, reserve-then-send, no browse filter).** If you want the `partner_institutions_only` browse filter (Open Decision #5) included in Phase 11, say so — it is a 1-file `/bips` filter addition but intentionally deferred.

---

**Files to create in this plan (for handoff):** `.agents/plans/2026-08-10-phase-11-alerts.md` (this file).

**Next step after approval:** close Phase 10 bookkeeping (10-Close), then execute Plans 11-01..11-07 in order — first plan is blocking `db push` + `cron.job_run_details` proof.
