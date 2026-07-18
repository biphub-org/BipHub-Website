# Project Research Summary

**Project:** BipHub v1.2 — Coordinator BIP Builder Completion + BIP Detail Page + Alert Subscriptions/Email Pipeline (carried from v1.1 Phase 7)
**Domain:** Erasmus+ BIP directory — completing an existing coordinator content model, redesigning its public detail page, and shipping a deferred student-facing digest-email pipeline
**Researched:** 2026-07-18
**Confidence:** HIGH

## Executive Summary

This is not greenfield research — it is an integration study against a live, working Next.js 15.5 + Supabase system that shipped v1.0 and v1.1 already. All four research passes converge on the same headline finding: "complete the coordinator BIP builder" has a concrete, code-grounded definition, not a vague scoping question. Direct inspection of `supabase/migrations/00003_bips_full_schema.sql` against the wizard, the `bip_edits` shadow table, the admin diff view, and the detail-page query found four columns (`virtual_sessions_count`, `virtual_duration_notes`, `accommodation_notes`, `partner_institutions_only`) that exist in the schema and seed data but are wired into none of the seven layers that make a `bips` field actually usable end-to-end, plus a fifth field (`max_participants`) that the wizard collects but the public page never renders. Layered on top are two live data-integrity bugs discovered by direct code inspection, not inference: the wizard's `virtual_timing` enum (`before`/`after`/`concurrent`) doesn't match the DB CHECK constraint's five values (`before`/`during`/`after`/`before_and_after`/`mixed`), so selecting "concurrent" fails silently at save; and `max_participants`'s wizard floor of 5 doesn't match the documented Erasmus+ domain rule of min 10.

The recommended approach is a strictly-sequenced pair of phases (builder completion, then detail-page redesign) followed by, or run in parallel with, an independently-buildable alert pipeline. Builder completion must precede the detail page because the detail page's actual deliverable — deciding how to lay out these newly-wired fields — cannot be finalized while the field set is still in flux; this is a mechanical dependency on the finalized `BipDetail` type and `.select()` strings, not a soft preference. The alert pipeline, by contrast, shares no files, tables, or Server Actions with the builder/detail-page pair (it reads the *output* of `approveBipAction`/`approveEditAction` — `bips.status = 'approved'` — without modifying either action) and can be planned or built before, after, or interleaved with the other two workstreams. No new npm packages are required anywhere in this milestone: the alert pipeline reuses `node:crypto` for HMAC tokens and the already-installed `resend` SDK's batch endpoint, and `pg_cron`/`pg_net` are Supabase-native primitives, not new services.

The primary risk is procedural, not technical: this codebase has already demonstrated (via the very four orphaned columns this milestone exists to fix) that a `bips` field is trivially added to some layers and silently forgotten in others, with zero runtime error to signal the gap. The second-highest risk is specific to the alert pipeline's idempotency and timing design — using the wrong high-water-mark column (`updated_at`, which edit-merges bump) would silently re-notify subscribers on every coordinator typo fix. Both risks have concrete, already-designed mitigations documented below and should be treated as acceptance criteria, not aspirational best practice.

## Key Findings

### Recommended Stack

No new stack for v1.2. The builder-completion and detail-page workstreams need zero new libraries — the wizard's existing pattern of separate typed `Textarea`/`Input` fields validated with RHF + Zod v3 is the correct, already-proven approach and should be extended, not replaced with a rich-text editor. The alert pipeline needs one new *deploy surface* (a Supabase Edge Function, Deno 2, already matching `edge_runtime.deno_version = 2` in `supabase/config.toml`) but zero new npm packages: HMAC signing uses Node's built-in `node:crypto` (`createHmac` + `timingSafeEqual`), and the digest send uses the already-installed `resend` `^6.12.3` package's batch endpoint (`resend.batch.send`, up to 100 recipients/call, per-item `headers` for `List-Unsubscribe`).

**Core technologies (net new, all for the alert pipeline):**
- `pg_cron` — schedules the digest job; pre-enabled on every Supabase tier (free/pro/team) as of 2026, zero setup cost, confirmed against current Supabase docs
- `pg_net` — fires the HTTP POST from `pg_cron` to the Edge Function; must be explicitly enabled (`CREATE EXTENSION IF NOT EXISTS pg_net;` + `[db.extensions] pg_net = true` in `supabase/config.toml`) — confirm this is enabled before phase planning locks scope; it is not currently present in the repo's config
- Supabase Edge Functions (Deno 2) — runs the anti-join matcher + Resend send loop with the service-role key, in a runtime context outside the `app/(admin)/`-confined `createAdminClient` boundary by construction
- `node:crypto` — HMAC-SHA256 signing of unsubscribe tokens, zero new dependency
- Supabase Vault — stores the dedicated cron-to-function shared secret (never the anon key) and any other secrets the `pg_net.http_post` call needs

**Locked scheduling decision:** `pg_cron` to `pg_net` to Supabase Edge Function to Resend, not Vercel Cron. Vercel Cron's Hobby tier is hard-capped at once-per-day with +/-59-minute imprecision and would require a public Route Handler that breaks the project's one-command local dev goal without a tunnel. This was already the correct call in v1.1 research and 2026 re-verification only strengthens it (pg_cron now ships pre-enabled on every tier, removing even the extension-enable step v1.1 assumed).

**Explicitly rejected for this milestone:** rich-text/WYSIWYG editors (Tiptap/Lexical/Quill — new dependency + stored-XSS sanitization surface, contradicts the existing clean multi-field content model), Supabase Queues/`pgmq` (built for event fan-out with retries, not a once-daily batch), any JWT library for the unsubscribe token (`jose`/`jsonwebtoken` — unnecessary for a single-consumer, non-expiring, single-claim token), and photo/media upload libraries (would reopen a locked v1.0 scope decision, not a unilateral stack call).

### Expected Features

**Must have (table stakes, P1):**
- Fix the `virtual_timing` wizard/DB enum mismatch — currently a live bug blocking any coordinator who selects "concurrent"
- Fix `max_participants` floor (5 to 10) to match the documented Erasmus+ funding-eligibility rule
- Wire `virtual_sessions_count` + `virtual_duration_notes` into wizard Step 2 + detail page
- Wire `partner_institutions_only` into wizard (Step 3 or 4) + detail page + `/bips` card badge — closes a real discovery-trust gap (students currently can't tell a listing is closed to them until they email the coordinator)
- Wire `accommodation_notes` into wizard Step 4 + a new "Practical information" detail-page section
- Resolve the green-travel/inclusion-support badge suppression with corrected (sending-institution, not host-programme) framing — data is collected but shown nowhere today
- Alert Subscriptions core pipeline (ALRT-01..08): field + country + "both" criteria matching, idempotent digest, signed no-login unsubscribe, explicit consent capture, dashboard subscription management

**Should have (competitive differentiators, P2 — do not block v1.2 launch):**
- "Duplicate this BIP" — clone a prior BIP's fields into a new draft; depends on builder completion (cloning a BIP missing fields propagates the gap forever); BIPs are annually recurring, so this has strong retention value
- Field-level guidance/microcopy in the wizard nudging coordinators toward richer content
- "Program maturity" / "Nth edition" signal — the correct trust-proxy substitute for reviews/ratings, depends on "duplicate this BIP" providing a predecessor link
- Weekly digest as the default cadence, daily as an explicit opt-in upgrade (not the reverse) — matches BipHub's low-frequency-visit student audience

**Defer / permanent anti-features — lock these so they aren't re-litigated in planning:**
- Rich-text/WYSIWYG editor for description fields — contradicts the existing structured multi-field model; add constrained sanitized Markdown only on demonstrated need, never speculatively
- University/coordinator photo uploads — explicit v1.0 `PROJECT.md` Out-of-Scope item, unchanged; gradient placeholders remain correct for v1.2
- JSON-LD/schema.org structured data / public read API — explicitly deferred by `PROJECT.md` to a later milestone ("data layer for devs," postponed until there's a real audience); this supersedes an earlier v1.1-research suggestion to bundle JSON-LD here — do not add it in v1.2
- Structured cost/funding calculator — permanent anti-feature; grant amounts are set annually per National Agency across 29 programme countries and BipHub cannot maintain that data
- BIP reviews/ratings — permanent anti-feature; institutional-politics and moderation-burden risk; "program maturity" signal is the correct substitute, not an interim one
- Structured day-by-day itinerary builder — format mismatch for 5-30 day programs; free text remains correct

### Architecture Approach

v1.2 is an integration document, not a rewrite: the Next.js 15 App Router route-group layout, RLS-everywhere pattern, `getClaims()`-only auth, `createAdminClient` confinement, Server-Actions-for-all-mutations, and `revalidatePath()` ISR-bust strategy are all shipped, correct, and untouched. The work is scoped to three concrete integration points.

**Major components:**
1. **BIP builder completion** — four new `bips`/`bip_edits` columns must propagate through all seven existing layers (schema/`bip_edits` mirror, wizard Zod schema, `BipDraftData` Zustand store type, wizard step UI, four Server-Action call sites — `submitBipAction`, `adminUpdateBipAction`, `bip-edits.ts`'s `buildContentPayload`, `admin-edit-bips.ts`'s `buildMergePayload`/`EDIT_CONTENT_SELECT`/`RawEditRow` — the admin diff view's `FIELDS` array, and `bipDetail.ts`'s `BipDetail` type + both `.select()` strings). No new tables; pure "wire up dead schema," low-risk but high-surface-area (touches ~10 files across 4 layers).
2. **BIP detail page** — a rendering/UX exercise against the finalized builder field set. No ISR-strategy change (`revalidate = 3600`, `dynamicParams = true`, `generateStaticParams`, and existing `revalidatePath` calls in `approveBipAction`/`approveEditAction` are all already correct). The only correctness gap is the query not selecting the new fields yet.
3. **Alert subscriptions + email pipeline** — two new tables (`bip_subscriptions`, `bip_alert_deliveries`), a stateless anti-join query run by a scheduled Edge Function (no queue table, no trigger on `bips`), a `SECURITY DEFINER` unsubscribe RPC called from the one sanctioned public Route Handler exception to "Server Actions for all mutations." Requires zero changes to `approveBipAction`/`approveEditAction` — a BIP becomes alert-eligible the instant `status = 'approved'` is true, which those actions already produce.

### Critical Pitfalls

1. **A new BIP-model field is wired into the wizard and detail page but silently dropped by the edit-approval merge** — the existing 22-field `bip_edits` shadow schema is hand-maintained across two independently-copied column-list literals (`BIP_EDIT_CONTENT_SELECT` in `bipEdits.ts`, `EDIT_CONTENT_SELECT`/`buildMergePayload()` in `admin-edit-bips.ts`) plus the wizard and the diff view. Missing any one of these four surfaces produces no error — the admin's "approve edit" succeeds, the audit log records it, the coordinator gets a success email, and the live page silently keeps the old value. Prevention: treat every new field as a checklist across all seven layers (not a single migration), collapse the duplicated column-list literal into one shared constant, and write one Playwright spec per new field that edits an approved BIP, has the admin approve, and asserts the live page reflects the new value — not just that the wizard/detail page render correctly in isolation.
2. **`database.types.ts` regenerated against `--local` while the actual dev/deploy target is the shared cloud Supabase project** — this project's local dev points at a shared cloud DB, not a separate local Postgres; running `db:types --local` after a migration that hasn't been pushed to cloud yet produces types claiming a column exists that the app's actual queries will 400 on (`42703 column does not exist`) — this has already happened once (the `subject_areas` empty-`/bips` incident). Always `supabase db push` before regenerating types, for every migration in this milestone.
3. **Digest cron and the approve action race on "what counts as newly approved"** — using `updated_at` as the alert high-water mark collides with `approveEditAction`'s merge payload, which bumps `updated_at` on every edit-merge even though the BIP has been approved and already alerted-on. This re-triggers duplicate alert emails on unrelated coordinator typo fixes. Prevention: a dedicated `bips.approved_at` column, set once on the `pending to approved` transition and never touched by the edit-merge path, combined with the `bip_alert_deliveries` unique-`(bip_id, user_id)` constraint as a second, independent line of defense.
4. **pg_cron is untestable locally and local dev IS the shared cloud database** — local `pg_cron` cannot reach a public URL, so end-to-end digest testing locally means manually invoking the Edge Function (`supabase functions serve`), not waiting for the schedule. Compounding this, a `pg_cron` job pushed via migration starts firing against the shared cloud dev/test database immediately — there is no separate staging cron environment. Prevention: gate the job behind an `enabled` flag or a deliberately far-future schedule until the Server-Action/Edge-Function side is fully tested; verify real firing via `cron.job_run_details` on the cloud project before considering the phase done.
5. **New fields ship without touching any of the three seed sources, so wizard bugs go untested** — `supabase/seed.sql`, `supabase/seed.e2e.sql`, and `scripts/seed-cloud-e2e.mjs` are three independently-maintained fixture sources, and the latter two already drifted once (2026-07-17, the incident behind BUG-002 and the "e2e two seed files must stay in sync" project memory). A new field can be fully wired in code and still have zero seeded BIPs exercising a non-default value, so nothing in CI catches a regression. Every migration adding a BIP-model or subscription/delivery field should be paired with updates to all three seed sources plus a `verify-seed.ts` assertion.

## Implications for Roadmap

Based on research, the milestone decomposes into two dependency-ordered phases plus one independent phase:

### Phase A: Coordinator BIP Builder Completion + BIP Detail Page
**Rationale:** These two workstreams are a hard-dependency pair, not just a suggested order. The detail page's actual deliverable — laying out the newly-wired fields — cannot be finalized while the field set is still in flux; this is a mechanical dependency on the finalized `BipDetail` type and `.select()` strings, confirmed by direct code inspection, not a scheduling preference. Bundling them into one phase (or two tightly-sequenced plans within one phase) avoids a phase boundary that would otherwise force an artificial "detail page for a partial field set" intermediate state.
**Delivers:** A BIP data model that is fully expressed end-to-end (wizard to draft store to submit/edit/admin-merge to diff view to detail page), the two live data-integrity bugs (`virtual_timing` enum, `max_participants` floor) fixed, and a redesigned public detail page rendering all five newly-completed fields plus the corrected green-travel/inclusion-support framing.
**Addresses:** All P1 builder/detail-page items from Feature Landscape — the four orphaned columns, `max_participants` exposure, the two bug fixes, and the green-travel badge resolution.
**Avoids:** Pitfall 1 (field silently dropped at edit-merge) via an explicit seven-layer checklist and per-field Playwright coverage; Pitfall 2 (duplicated column-list literal drift) via consolidating into one shared constant before adding new fields; Pitfall 11 (ISR call-site audit) by enumerating all `revalidatePath('/bip/[slug]')` call sites before the redesign and confirming none are broken by route/caching changes.

### Phase B: Alert Subscriptions + Email Pipeline (carried from v1.1 Phase 7)
**Rationale:** Fully independent of Phase A — shares no files, tables, or Server Actions except a read-only observation that `approveBipAction`/`approveEditAction` already produce the `status = 'approved'` state the digest query depends on. Can be planned and built before, during, or after Phase A.
**Delivers:** `bip_subscriptions` + `bip_alert_deliveries` tables with RLS, a `pg_cron`-scheduled Edge Function running a stateless anti-join digest (daily + weekly cadence via two schedules, one function), signed no-login unsubscribe via a `SECURITY DEFINER` RPC called from a public GET+POST Route Handler (RFC 8058 one-click compliant), dashboard subscription management, and GDPR consent capture.
**Uses:** `pg_cron` (pre-enabled), `pg_net` (must be enabled — pre-planning check), Supabase Edge Functions (Deno 2), `node:crypto` HMAC, existing `resend` batch endpoint — no new npm packages.
**Implements:** The stateless anti-join architecture (no queue table, no trigger on `bips`, zero changes to approve actions) with `bip_alert_deliveries` as the sole idempotency source of truth, write-after-confirmed-send (never reserve-then-send with a pre-emptive claim before the send succeeds).
**Avoids:** Pitfall 5 (digest/edit-merge `updated_at` collision) via a dedicated `approved_at` marker column, confirmed untouched by any edit-merge path; Pitfall 6 (pg_cron local-vs-cloud test gap) via an `enabled` gate and real cloud-project verification via `cron.job_run_details`; Pitfall 8 (unsubscribe token security / one-click POST) via UUID-bound HMAC tokens and separate GET (human, confirm-required) / POST (machine one-click, immediate) handlers; Pitfall 9 (RLS gaps on new PII tables) via the `SECURITY DEFINER` RPC pattern already proven by `delete_my_account()`, never `createAdminClient()` from a public route; Pitfall 10 (GDPR cascade gap) via `ON DELETE CASCADE` FKs to `auth.users` decided at table-creation time, requiring no changes to `delete_my_account()`.

### Phase Ordering Rationale

- Phase A must precede or bundle ahead of any detail-page work because of the mechanical (not preferential) dependency described above — this is the single hardest sequencing constraint in the milestone, confirmed independently by FEATURES.md, ARCHITECTURE.md, and PROJECT.md's own stated intent ("Finish the coordinator BIP builder... which unblocks designing the BIP detail page").
- The two live data-integrity bugs (`virtual_timing` enum, `max_participants` floor) should be fixed in the same pass as the new Step 2 fields, not as a separate cleanup phase — they live in the same file (`step2Schema`) and the same DB row; shipping new fields on top of a known-broken validator compounds the debugging surface.
- Phase B has zero technical coupling to Phase A and can be sequenced anywhere in the roadmap without re-litigating scope; the only reason PROJECT.md's narrative puts it last is product prioritization (builder/detail-page work was judged higher-value first), not a technical constraint.
- Within Phase B, infrastructure verification (pg_cron/pg_net enablement, real cloud-project cron firing) should be the first task, not the last — the project has already flagged this as a Phase 7 prerequisite that must not become another deferred manual-verification item.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase B (Alert Subscriptions)** — the anti-join matcher query, digest chunking/rate-limiting against Resend's account limits, and the `enabled`-gate rollout pattern for a cloud-shared `pg_cron` job all have enough moving parts (and enough already-identified pitfalls: P5, P6, P7, P8, P9, P10) that a `/gsd-research-phase` pass focused on Edge Function implementation details and the exact RLS/RPC wiring is worth doing even though the architecture is already fully designed here.

Phases with standard patterns (skip research-phase):
- **Phase A (Builder + Detail Page)** — the pattern for adding a coordinator-editable field is already fully established and documented (seven layers, enumerated file-by-file in ARCHITECTURE.md); this is repetition of an existing, proven pattern, not new architecture. Standard Zod/RHF/Server-Action patterns apply throughout.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Supabase Cron/Edge Functions/Resend batch-API facts verified against 2026 official docs and changelogs; builder/detail-page findings verified directly against live wizard and schema code |
| Features | HIGH (gap analysis) / MEDIUM (external benchmarking) | The builder/detail-page gap is grounded in direct schema/wizard/component inspection, not inference. External "what makes a program listing good" comparisons (Carnegie Mellon, NAFSA, GoAbroad/GoOverseas) are WebSearch-verified but not BIP-specific — no single authoritative source exists for the exact EU short-mobility format |
| Architecture | HIGH | Based on reading every live migration (00001-00021), all relevant Server Actions, the wizard schema, the diff view, and the detail-page query, plus the already-vetted v1.1 alert-pipeline design this document simplifies and re-confirms |
| Pitfalls | HIGH (project-specific) / MEDIUM (external cron/Resend operational specifics) | Project-specific pitfalls (seed drift, shared cloud dev DB, RLS patterns) are grounded in this project's own recorded incidents (BUG-002, the `subject_areas` empty-`/bips` incident) and MEMORY.md. Supabase pg_cron/pg_net and Resend rate-limit specifics are WebSearch/training-data informed and flagged as such where the exact numbers matter (e.g., Resend's daily-cap figure should be re-verified against `resend.com/docs` at implementation time, not hardcoded from this research) |

**Overall confidence:** HIGH

### Gaps to Address

- **Per-subscription cap:** research recommends 5 subscriptions per student (carried from v1.1 research's own open-question resolution), enforced in the Server Action via a `count(*)` check before insert, not a `CHECK` constraint (Postgres can't count sibling rows in a CHECK). This should be confirmed as a requirement, not silently assumed.
- **Digest cadence default:** research recommends `weekly` as the default with `daily` as an explicit opt-in upgrade, based on BipHub's low-frequency-visit student audience (checked once every few weeks per prior user-behavior analysis). Should be locked as a requirement rather than left as a UI default decided ad hoc during implementation.
- **Unsubscribe UX — per-subscription vs. manage-all:** the researched design supports both (a header-level `List-Unsubscribe`/one-click link scoped to the specific subscription that produced a digest item, plus dashboard-based manage-all as an additional convenience) — the requirements phase should confirm this dual-path approach rather than assume only one is needed.
- **`bip_alert_deliveries.user_id` post-erasure FK strategy:** ARCHITECTURE.md specifies `ON DELETE CASCADE` (simple, loses delivery-audit trail post-erasure); PITFALLS.md's Pitfall 10 raises `ON DELETE SET NULL` with a nullable column as the more GDPR-defensible alternative (retains aggregate delivery-count/idempotency history without retaining PII) but notes it requires the unique `(bip_id, user_id)` constraint to tolerate a null `user_id` without re-enabling duplicate sends. This is a genuine open design decision the requirements phase should resolve explicitly, not inherit by default.
- **UX placement of the newly-wired fields:** `partner_institutions_only` reads naturally as either a Step 3 (Partners) or Step 4 (Application Info) field — ARCHITECTURE.md flags this as a UX judgment call for the roadmap/requirements phase, not an architecture blocker. Similarly, whether `accommodation_notes` is rendered under a narrowly-scoped "Accommodation" label or a broader "Practical information" section (bundling accommodation + visa + local cost expectations) is a requirements-level naming/scope decision.
- **pg_net enablement:** confirmed not currently present in `supabase/config.toml` or any migration — must be added as an explicit pre-planning check before Phase B scope is locked, not discovered mid-implementation.

## Sources

### Primary (HIGH confidence)
- Live repo inspection: `supabase/migrations/00001`-`00021` (full read), `lib/schemas/bip-wizard.ts`, `lib/store/bip-draft.ts`, `lib/actions/bip-submit.ts`, `admin-bips.ts`, `bip-edits.ts`, `admin-edit-bips.ts`, `lib/queries/bipDetail.ts`, `bipEdits.ts`, `components/admin/BipEditDiffView.tsx`, `components/forms/BipSubmissionWizard.tsx` and step components, `components/bip/BipHeader.tsx`/`BipBody.tsx`/`BipSidebar.tsx`, `lib/email/send.ts`, `scripts/verify-seed.ts`, `supabase/config.toml`, `package.json`
- `.planning/PROJECT.md`, `.planning/STATE.md`, `CLAUDE.md` — v1.2 scope framing, locked stack decisions, out-of-scope list, never-do items
- Supabase Cron docs and Supabase Cron module page — 2026 confirmation pg_cron ships enabled on all tiers
- Vercel Cron Jobs docs — Hobby once-daily cap, +/-59-min imprecision confirmed current 2026
- Resend Send Batch Emails API reference — batch limits, per-item headers confirmed
- RFC 8058 — One-Click List-Unsubscribe
- `.planning/milestones/v1.1-research/ARCHITECTURE.md`, `PITFALLS.md`, `SUMMARY.md` — prior, already-vetted alert-pipeline design this milestone's research simplifies and re-confirms
- BipHub `KNOWN-BUGS.md`, `RETROSPECTIVE.md`, project MEMORY.md notes (`local-dev-uses-cloud-supabase`, `e2e-two-seed-files-must-stay-in-sync`) — this project's own recorded incidents grounding the pitfalls analysis

### Secondary (MEDIUM confidence)
- WebSearch: study-abroad program page best practices (Carnegie Mellon, NAFSA, CollegeData) — general guidance, not BIP-specific, used to validate the "practical information"/workload-transparency feature gaps
- WebSearch: GDPR consent/unsubscribe best practices (ComplyDog, TermsFeed, 4TM) — consistent across independent sources on two-click unsubscribe and separate-consent requirements
- Resend rate-limit figures (2 req/sec default account limit, 100/day free-tier ceiling) — cross-referenced against Resend's own blog posts but should be re-verified at implementation time per PITFALLS.md's own caution

### Tertiary (LOW confidence)
- None flagged — all findings in this research cycle were either grounded in direct code inspection or corroborated by multiple independent external sources.

---
*Research completed: 2026-07-18*
*Ready for roadmap: yes*
