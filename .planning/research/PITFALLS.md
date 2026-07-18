# Pitfalls Research

**Domain:** EU Erasmus+ BIP directory — v1.2 additions to an existing Next.js 15.5 + Supabase + Resend + Vercel system
**Researched:** 2026-07-18
**Confidence:** HIGH (grounded in direct reads of `supabase/migrations/00017_bip_edits.sql`, `lib/queries/bipEdits.ts`, `lib/actions/admin-edit-bips.ts`, `lib/email/send.ts`, `scripts/verify-seed.ts`, `supabase/config.toml`, project MEMORY notes, KNOWN-BUGS.md, RETROSPECTIVE.md); MEDIUM (Supabase pg_cron/pg_net operational specifics, Resend batch-API limits — WebSearch/training-data informed, flagged per-item); HIGH (this project's own prior-milestone lessons — RLS USING+WITH CHECK, seed drift, e2e shared state — carried forward, not re-derived)

**Scope note:** This file extends `.planning/milestones/v1.1-research/PITFALLS.md` — it does not repeat that document's 14 pitfalls (student-JWT timing, `bip_edits` shadow-table shape, coordinator/admin route guards, missing RLS indexes, alert double-send basics, unsubscribe absence, GDPR consent recording, ISR staleness on edit, audit-log gaps, slug immutability, erasure-cascade gaps). Where a v1.1 pitfall recurs in a new, more specific form for v1.2 (e.g. digest idempotency, erasure cascade for new tables), this file cites the earlier pitfall by number and adds only what is new.

---

## Critical Pitfalls

### Pitfall 1: A New BIP-Model Field Is Wired Into the Wizard and Detail Page but Silently Dropped by the Edit-Approval Merge

**What goes wrong:**
The v1.2 builder work adds fields the schema already has but the UI doesn't (confirmed live: `virtual_sessions_count`, `virtual_duration_notes`, `accommodation_notes`, `partner_institutions_only` on `bips`, per `.planning/research/FEATURES.md`). A developer adds the field to the create wizard (`lib/schemas/bip-wizard.ts`, wizard step component, `submitBipAction`) and to the detail page renderer. Everything works for **new** BIP submissions. Then a coordinator edits an **already-approved** BIP and changes that new field. The edit is captured correctly in the wizard's Zustand draft and written to `bip_edits` via `submitEditAction` — but only if the column was also added to the `bip_edits` table (migration `00017_bip_edits.sql`) **and** to the two independent column-list literals that gate what actually gets read and merged: `BIP_EDIT_CONTENT_SELECT` in `lib/queries/bipEdits.ts` and `EDIT_CONTENT_SELECT` + `buildMergePayload()` in `lib/actions/admin-edit-bips.ts`. If any one of these four surfaces is missed, the admin's "approve edit" click succeeds, `bip_edits.status` flips to `approved`, the audit log records `approve_edit`, `revalidatePath` fires, the coordinator gets a "your edit is live" email — and the new field's value on the live `bips` row silently stays whatever it was before. There is no error, no failed query, no log line. The bug is invisible until someone compares the edit diff view to the live page.

**Why it happens:**
`bip_edits` is not "all bips columns automatically" — it is a hand-maintained shadow schema (currently 22 content columns, `partner_institutions` jsonb, deliberately excluding `slug` and `status`). Every column addition to `bips` for a coordinator-editable field requires four synchronized edits, not one migration. This is exactly the kind of drift the shadow-table design (chosen in v1.1 specifically to keep the public page live during re-review) makes structurally possible: the "proposed content" and "live content" schemas are two separate tables that must be kept congruent by hand, forever.

**How to avoid:**
- Treat "add a field to the BIP model" as a **checklist**, not a single migration: (1) `bips` column + CHECK constraint, (2) `bip_edits` column (same migration or immediately following one), (3) wizard Zod schema + step UI, (4) `BIP_EDIT_CONTENT_SELECT` (bipEdits.ts), (5) `EDIT_CONTENT_SELECT` + `buildMergePayload()` (admin-edit-bips.ts), (6) detail-page render, (7) all three seed sources (Pitfall 3), (8) `database.types.ts` regen (Pitfall 4).
- Collapse the duplicated column-list literal (Pitfall 2 below) into one shared constant so there is only one place to update, not two.
- Add a build-time or test-time assertion that `bip_edits` columns (minus `id`, `bip_id`, `created_by`, `status`, `admin_note`, `created_at`, `updated_at`) are a superset match against the coordinator-editable `bips` columns — even a simple Vitest that introspects both column lists from `database.types.ts` and diffs them catches this class of bug at CI time instead of in production.
- Write one Playwright spec per new field: edit an approved BIP's new field → admin approves → assert the live `/bip/[slug]` page shows the new value, not the pre-edit one. This is the only test that actually exercises the merge payload; unit tests on the wizard or the detail page alone will pass while this bug ships.

**Warning signs:**
- A migration adds a column to `bips` with no matching migration/`ALTER TABLE` on `bip_edits` in the same PR
- `buildMergePayload()` in `admin-edit-bips.ts` is not touched by a PR that adds a new coordinator-editable field
- Grep for the field name in `lib/actions/admin-edit-bips.ts` and `lib/queries/bipEdits.ts` returns zero hits after the wizard/detail-page work is "done"
- Manual test only exercises the **create** wizard, never the **edit-approved** path for the new field

**Phase to address:** Coordinator BIP-builder-completion phase — every new field task must include the `bip_edits`/merge-payload step as an explicit sub-task, not an assumed side effect of the wizard change.

---

### Pitfall 2: Two Independent Copies of the Same Column List Drift Apart

**What goes wrong:**
`lib/queries/bipEdits.ts` defines `BIP_EDIT_CONTENT_SELECT` (a 28-line SQL select-string literal) and `lib/actions/admin-edit-bips.ts` defines its own `EDIT_CONTENT_SELECT` — the same 22+ columns, copy-pasted rather than imported from one source (the file comment in `admin-edit-bips.ts` even says "mirrors BIP_EDIT_CONTENT_SELECT in bipEdits.ts"). A developer adding a field to one copy and forgetting the other produces two different failure modes depending on which copy was missed: if `bipEdits.ts`'s copy is missed, the admin diff view never shows the new field even though the merge would apply it correctly; if `admin-edit-bips.ts`'s copy is missed, the diff view shows the coordinator's proposed new value but approving the edit silently discards it (this is the concrete mechanism behind Pitfall 1).

**Why it happens:**
The comment documenting the duplication ("mirrors...") is an honest acknowledgment that this is copy-paste, not a shared import — likely done originally to avoid a cross-module import between a query file and an action file. That tradeoff was reasonable for 22 static fields; it becomes a liability the moment the field list needs to grow again in v1.2.

**How to avoid:**
Extract both literals into a single exported constant (e.g. `lib/constants/bip-edit-columns.ts`) imported by both `bipEdits.ts` and `admin-edit-bips.ts`, and reuse the same constant to derive `buildMergePayload()`'s key list programmatically (map over the field names instead of hand-listing every field a second time in the merge object). This turns "add a field in 3 places" into "add a field in 1 place, used in 3 places."

**Warning signs:**
- `grep -n "title, subject_areas, isced_f_code"` returns matches in more than one file
- A code review approves a `bip_edits`-column-adding PR that only touches one of the two files

**Phase to address:** Coordinator BIP-builder-completion phase, first plan — refactor before adding new fields, not after.

---

### Pitfall 3: New Fields Ship Without Touching Any of the Three Seed Sources — Wizard Bugs Go Untested

**What goes wrong:**
This project has **three** independent seed/fixture sources that must all reflect new BIP-model fields for the field to be meaningfully tested end-to-end: `supabase/seed.sql` (local dev, checked by `scripts/verify-seed.ts`), `supabase/seed.e2e.sql` (Playwright local path), and `scripts/seed-cloud-e2e.mjs` (Playwright cloud path — the one CI actually exercises, per the project's own recorded lesson that these two e2e files drifted and broke specs on 2026-07-17). A new field like `partner_institutions_only` or `virtual_sessions_count` can be added to the schema, wizard, and merge payload correctly, and still have zero seeded BIPs exercising it — meaning `verify-seed.ts`'s distribution checks don't cover it, and no Playwright fixture ever has the field set to a non-default value. The wizard bug (or the merge-payload bug from Pitfall 1) then ships to production undetected because nothing in CI ever creates or edits a BIP where the new field differs from its column default.

**Why it happens:**
Seed files are typically updated only when a bug is hit against them (as the retrospective documents for the two e2e files), not proactively when a schema field is added. There's no CI check that a new `bips`/`bip_edits` column appears in all three seed sources.

**How to avoid:**
- Every migration that adds a BIP-model field should be paired with an update to `supabase/seed.sql` (at least one seed BIP exercising a non-default value) and a `verify-seed.ts` assertion for the new field's distribution, mirroring the existing pattern for `subject_areas`/`green_travel`/`inclusion_support`.
- For `seed.e2e.sql` and `seed-cloud-e2e.mjs`: since these two already have a documented drift history, treat any BIP-model schema change as a trigger to run both `node scripts/seed-cloud-e2e.mjs` and a full `npx playwright test` before merging, not just at incident time.
- Consider a lightweight drift-check script (extending the existing `verify-seed.ts` pattern) that diffs the column set referenced by `seed.e2e.sql`'s INSERT statements against `seed-cloud-e2e.mjs`'s object literals — this was the exact gap that caused the 2026-07-17 incident and nothing currently prevents a recurrence for v1.2's new fields.

**Warning signs:**
- A schema migration for a new field has no corresponding diff in any of the three seed files
- `verify-seed.ts` has no check referencing the new column
- `seed.e2e.sql` and `seed-cloud-e2e.mjs` diverge in column coverage (check via `grep` for the new column name in both files after any schema change)

**Phase to address:** Coordinator BIP-builder-completion phase (new fields) and Alert Subscriptions phase (new subscription/delivery fixtures) — both introduce schema that needs seed coverage; treat as a standing checklist item, not phase-specific.

---

### Pitfall 4: `database.types.ts` Regenerated Against `--local` While the Actual Dev/Deploy Target Is the Shared Cloud Project

**What goes wrong:**
`package.json`'s `db:types` script runs `supabase gen types typescript --local > lib/supabase/database.types.ts`. But per this project's own recorded operational fact, local dev does not use a separate local Postgres — `.env.local` points at the shared **cloud** Supabase project, and the standing rule is "push migration to cloud → verify column → THEN deploy code." A developer who runs `supabase db reset` + `db:types` locally after writing a new migration gets types reflecting their local ephemeral DB (which did apply the new migration), but if that migration was never `supabase db push`ed to the cloud project, the app — which queries the cloud DB, not local — will 400 on the new column exactly as happened before (`42703 column does not exist`, the empty `/bips` incident from `subject_areas`). The types file will claim the column exists while the database the app actually talks to does not have it yet.

**Why it happens:**
`--local` is the natural default for a types-gen script and matches how most Supabase project templates document it. It is easy to forget that this project's dev/prod topology (documented in project memory, not in any README) makes `--local` and the actual runtime database two different instances that can drift out of sync in either direction.

**How to avoid:**
For every new migration touching `bips`, `bip_edits`, or new subscription/delivery tables in v1.2: push to cloud (`supabase db push`) **before** regenerating types and before merging any code that references the new column, exactly as the project's standing local-dev rule already states — the types-gen step should happen after the push, not instead of it. Consider changing `db:types` to target the linked cloud project directly (`supabase gen types typescript --linked`) so the generated types can never silently diverge from the database the app actually runs against.

**Warning signs:**
- A PR adds a migration and regenerates `database.types.ts` but has no corresponding "pushed to cloud" note/commit
- Local dev server 400s with `42703` on a column that "exists" in `database.types.ts`
- `supabase db push --dry-run` (or its cloud-linked equivalent) reports pending migrations at the point code referencing the new column is about to be deployed

**Phase to address:** Every phase in v1.2 that adds a migration (builder-completion, detail-page if it needs new denormalized columns, alert-subscriptions) — restate the "push before deploy" rule explicitly in each phase's plan, since it is currently only captured in agent memory, not in `CONTRIBUTING.md` or a pre-deploy checklist.

---

### Pitfall 5: Digest Cron and the Approve Action Race on "What Counts as Newly Approved"

**What goes wrong:**
The alert pipeline (carried-forward Phase 7) needs to determine "which BIPs became approved since the last digest run" to notify matching subscribers. If this is implemented as `WHERE bips.status = 'approved' AND updated_at > <high-water-mark>`, it collides with the **existing** `approveEditAction`/`approveBipAction` behavior: `updated_at` is also bumped by unrelated updates — most relevantly, `approveEditAction`'s merge payload (`buildMergePayload()`) sets `updated_at = new Date().toISOString()` on every edit-approval merge, even though the BIP has been `approved` and already publicly visible (and already alerted-on) since its original approval. A naive `updated_at`-based high-water mark will re-notify every subscriber for a BIP that simply had a coordinator edit merged in, producing the double-send/duplicate-alert problem the v1.1 research already flagged (v1.1 PITFALLS Pitfall 5) — but through a v1.2-specific new mechanism, not the originally-scoped one. Additionally, there's a genuine commit-visibility race: if the cron job's query runs concurrently with an in-flight `approveBipAction` transaction, the newly-approved row may or may not be visible depending on transaction isolation and exact timing — needs a monotonic, unambiguous marker.

**Why it happens:**
`updated_at` is the generic "something changed" timestamp reused across unrelated transitions (original approval, edit approval, any future field correction). Alert eligibility needs a marker for **"became publicly visible for the first time,"** which is a different, narrower event than "row was updated."

**How to avoid:**
Add a dedicated `bips.approved_at` (or `first_approved_at`) timestamp column, set once — only on the `pending → approved` (or `changes_requested → approved`) transition in `approveBipAction`/`bip-status.ts` — and explicitly **never** touched by `approveEditAction`'s merge payload. The digest cron's high-water mark query becomes `WHERE approved_at > last_alerted_at`, immune to edit-merge noise. Combine with the `bip_alert_deliveries` unique-`(bip_id, user_id)` idempotency table from v1.1 research as a second, independent line of defense — the timestamp prevents re-scanning, the unique constraint prevents re-sending even if the scan logic has a bug.

**Warning signs:**
- Alert-eligibility query filters on `updated_at`, not a dedicated `approved_at`/`first_approved_at` column
- `buildMergePayload()` (or any edit-merge path) sets a column the alert query also reads as its high-water mark
- Subscribers report receiving an alert for a BIP they already saw an alert for, correlated in time with an edit-approval event (not a genuinely new BIP)

**Phase to address:** Alert Subscriptions + Email Pipeline phase — schema design step, before the cron query is written; must be reviewed against every existing `bips.status`-mutating Server Action (`bip-submit.ts`, `bip-status.ts`, `bip-revise.ts`, `admin-bips.ts`, `admin-edit-bips.ts`) to confirm none of them incidentally bump the new marker.

---

### Pitfall 6: pg_cron Is Configured and Tested Differently Locally vs. on Cloud Supabase — "Works Locally" Is Not a Valid Signal

**What goes wrong:**
Supabase's `pg_cron` extension schedules jobs that typically invoke an Edge Function or call an external URL via `pg_net`. The project's own accumulated state (`STATE.md`, recorded before Phase 7 was deferred) already flags the core gap: **local `pg_cron` cannot call a public URL** — there is no public URL for a local Edge Function — so end-to-end local testing requires manually invoking the function (`supabase functions serve`) rather than letting the scheduled job fire. A team that builds and "verifies" the digest cron purely against local `supabase start` risks shipping a job definition that references the wrong function URL, wrong `Authorization` header (Edge Functions require a service-role or anon key in the request, which `pg_net`'s `net.http_post` must be configured to send), or a cron schedule string that's syntactically valid but semantically wrong (e.g. timezone assumptions — `pg_cron` schedules run in the **database session's configured timezone**, which for Supabase is UTC by default; a digest intended for "9am local time" needs explicit UTC-offset math, not a naive cron string).
This project also runs the shared **cloud** Supabase project for local dev (per the project's own memory notes) — meaning a real `pg_cron` job created via a migration and pushed to cloud will actually start firing against the shared dev/test database the moment it's pushed, potentially generating real (or fallback-logged) emails before the feature is feature-flagged or before the Server-Action side is ready, unless the job is disabled/scheduled far in the future during development.

**Why it happens:**
`pg_cron` + `pg_net` is infrastructure-as-SQL: the job definition lives in a migration, is deployed the same way any other migration is (`supabase db push`), and takes effect immediately on the shared cloud project — there is no separate "staging" cron environment to test against first, and no way to dry-run a scheduled job locally with full fidelity.

**How to avoid:**
- Enable and verify both `pg_cron` and `pg_net` extensions explicitly in a migration (`create extension if not exists pg_cron; create extension if not exists pg_net;`), and confirm they're enabled in the Supabase dashboard's Database → Extensions page for the cloud project (extensions must be turned on there independently of the migration in some Supabase project configurations).
- During development, schedule the job with `cron.schedule(...)` but keep it initially set to a very sparse or far-future cadence (or gated behind a `feature_flags` row / `enabled boolean` the job checks before doing any work) until the Server-Action/Edge-Function side is fully tested — do not let "push the migration" and "go live" be the same event.
- Test the actual job invocation path manually against cloud (`select cron.schedule(...)` then `select * from cron.job_run_details order by start_time desc limit 5;` to inspect real run outcomes) rather than relying on local `supabase start` behavior, which cannot exercise the public-URL invocation path at all.
- Log every cron-triggered run to a dedicated table (or rely on `cron.job_run_details`, which Supabase retains for a bounded window) so a silent failure (e.g. the Edge Function 500s) is observable — `pg_net` failures do not raise in a way that's visible without checking `net._http_response` or `cron.job_run_details.status`.

**Warning signs:**
- The cron job migration has never been exercised against the cloud project before being merged (only tested via manual Edge Function invocation)
- No `enabled`/feature-flag gate on the job — pushing the migration to cloud is the same action as "go live"
- No query against `cron.job_run_details` was run after the first scheduled fire to confirm success
- Digest emails are timed assuming local/CET time but the cron schedule string was written without a UTC offset

**Phase to address:** Alert Subscriptions + Email Pipeline phase — must be the first infrastructure task (before subscription UI), since the project has already flagged this as a Phase 7 prerequisite; do not let it become another deferred manual-verification item (see Pitfall 10 below).

---

### Pitfall 7: Resend's 100-Email/Day Free-Tier Ceiling Is a Digest-Killer, Not a Theoretical Concern

**What goes wrong:**
This project's own `STATE.md` already flags the number: Resend's free tier caps at 100 emails/day. A digest pipeline is structurally different from the existing transactional emails (one email per submit/approve/reject/edit action, naturally rate-limited by human action cadence) — a single popular BIP being approved can fan out to dozens of matching subscribers in one cron run, and multiple BIPs approved between digest runs compound linearly. At even modest catalogue growth (the target scale discussed in `PROJECT.md` is well past the "under 500 BIPs" search threshold), a single digest run can plausibly exceed 100 emails on a good day for university outreach, silently truncating or failing sends for the remainder once the daily cap is hit — and per the v1.1 research already on file, the existing `sendEmail()` fire-and-forget try/catch means a Resend 429/402 (over-limit) response is swallowed, not surfaced, so subscribers simply never receive their alert with zero operator visibility.

**Why it happens:**
The daily cap is a hard account-level limit, not a per-request rate limit that can be worked around with retries or backoff — once hit, no further sends succeed until the next UTC day, and the existing error-swallowing pattern (correct for transactional emails, where a failure just means "resend later is fine") hides this from anyone unless someone is watching the Resend dashboard.

**How to avoid:**
- Compute the realistic digest volume ceiling before building: (approved BIPs per digest window) × (average matching subscribers per BIP), and compare against 100/day. Document the threshold in the phase plan as an explicit "upgrade trigger," as `STATE.md` already anticipates (Resend Starter, $20/mo, 5K/day).
- Log per-digest-run send counts and failures to a durable table (extending the `bip_alert_deliveries` idempotency table from v1.1 research with a `status` column, also from that research) so a daily-cap breach is visible in the data, not just inferred from user complaints.
- Consider batching: Resend's batch-send API accepts multiple recipients per call up to its own per-call cap (verify current limit against Resend's API reference before implementing — this number changes across plans and has moved in the past; do not hardcode a training-data-remembered figure into code comments without checking `resend.com/docs` at implementation time). Batching reduces API-call count but does **not** raise the daily-email-count ceiling.
- Decide up front (as a phase-plan decision, not an incident-response one) whether the daily cap breach behavior is "queue and send tomorrow" or "hard fail and alert the admin inbox" — silently dropping sends must not be the default behavior inherited from the transactional fire-and-forget pattern.

**Warning signs:**
- No instrumentation exists to answer "how many alert emails did we send yesterday?"
- The digest job has no explicit handling path for a 429/quota-exceeded response distinct from a transient network failure
- Phase plan does not state the volume threshold at which Resend plan upgrade becomes necessary

**Phase to address:** Alert Subscriptions + Email Pipeline phase — capacity planning and failure-mode decision belong in the phase's design step, before the cron job ships to cloud.

---

### Pitfall 8: Signed Unsubscribe Token Has No Expiry, No Scope Binding, or No One-Click POST Support

**What goes wrong:**
The v1.1 research already specifies the core idea (HMAC-signed token, public unsubscribe endpoint, no auth required). Three specific implementation mistakes are common and each defeats part of the security/compliance goal:
1. **No expiry check** — if the token is `HMAC(secret, subscription_id + created_at)` with no expiry embedded or enforced, the token is valid forever. This is usually *fine* for the "click unsubscribe" use case (you want it to always work), but it means anyone who ever intercepts or logs the URL (browser history, email-client link-preview crawlers, shared-inbox scenarios) can unsubscribe that user at any future point — a low-severity but real annoyance/abuse vector with no mitigation if the token is a bare, non-expiring credential.
2. **No per-recipient/per-send scoping** — if the same token is reused across every digest email sent to that subscriber (rather than being tied to a specific send or rotated), and the HMAC input is guessable (e.g. sequential subscription IDs), an attacker can potentially construct valid unsubscribe URLs for other subscriptions without ever seeing an email, if the HMAC secret is weak or the input space is small. Mitigate by using the actual UUID `subscription_id` (already non-guessable) as the HMAC input, not a sequential integer.
3. **GET-only unsubscribe with no RFC 8058 one-click POST support** — Gmail/Yahoo's 2024+ bulk-sender requirements (which the v1.1 research already cites) require **both** a `List-Unsubscribe` header **and**, for true one-click compliance, a `List-Unsubscribe-Post: List-Unsubscribe=One-Click` header paired with an endpoint that accepts a POST with no user interaction — some mail clients now auto-fire the one-click POST during spam-filtering/prefetch, which means a GET-based unsubscribe link that mutates state on **any** request (including a prefetch or bot crawl) will unsubscribe users who never clicked anything. This is a subtle, high-consequence failure mode: mail client link-scanning security features (e.g. Outlook Safe Links, corporate email gateways) routinely GET-follow links in incoming email to check for malware — if that GET alone flips `subscriptions.active = false`, users are unsubscribed without ever seeing the email.

**How to avoid:**
- Support both mechanisms distinctly: the `List-Unsubscribe` header's URL should point to a page (GET, human-facing, shows a confirmation or a one-click confirm button) — not one that mutates state on GET. The separate `List-Unsubscribe-Post` mechanism (a `mailto:` or HTTPS POST target with body `List-Unsubscribe=One-Click`) is the one that should actually flip `active = false` immediately, and should be a **dedicated POST-only route**, since mail clients that support one-click unsubscribe send exactly that POST body and nothing else — safe to auto-process. If one-click POST support isn't in v1.2 scope, at minimum ensure the GET-based unsubscribe page requires an explicit confirm button click (not a bare link-visit-mutates-state pattern) to avoid the link-scanner false-positive problem — bare GET-mutates-state was an actual, widely-documented email deliverability incident pattern.
- Bind the token to the specific `subscription_id` (UUID, already non-guessable) and verify the HMAC server-side using a server-only secret (never expose the HMAC secret to the client, never derive it from anything guessable like `created_at` alone without the UUID).
- Decide explicitly whether the token expires. A reasonable default: tokens do not expire (unsubscribe should always work), but the confirmation page should show which subscription is being cancelled so a user recognizes what they're unsubscribing from, mitigating the "forever-valid, silently-processed" risk.

**Warning signs:**
- Visiting the unsubscribe URL with a plain `curl -I` (HEAD/GET, no confirm step) immediately flips `active = false`
- No distinction in the codebase between a `List-Unsubscribe` GET target and a `List-Unsubscribe-Post` handler
- HMAC input includes only a timestamp or a guessable identifier, not the subscription's UUID

**Phase to address:** Alert Subscriptions + Email Pipeline phase — unsubscribe mechanism design step, alongside the email template that first embeds the link.

---

### Pitfall 9: New PII-Bearing Tables (`subscriptions`, `bip_alert_deliveries`) Repeat the Public-Readable-By-Default and Missing-`WITH CHECK` Traps From Scratch

**What goes wrong:**
CLAUDE.md's two standing never-do items — "never create a table without `ENABLE ROW LEVEL SECURITY`" and "never write an UPDATE policy without both `USING` and `WITH CHECK`" — are project-wide rules precisely because every new table is a fresh opportunity to reintroduce them, and the existing `bip_edits` migration (00017) shows the team already applies this correctly when careful. The specific v1.2 risk: the alert-subscription tables need at least one UPDATE path a student can reach directly (e.g., pausing/resuming a subscription from the student dashboard) and the unsubscribe endpoint needs to UPDATE `subscriptions.active` **without an authenticated session at all** (the signed token is the credential, per Pitfall 8/v1.1 Pitfall 7). This second requirement is unusual for this codebase — every other UPDATE policy so far gates on `auth.uid()` from a JWT; the unsubscribe path has no JWT. If the unsubscribe route is naively implemented as `createClient()` (anon key + no session) attempting `UPDATE subscriptions SET active = false WHERE id = $1`, it will simply fail RLS (no policy matches an unauthenticated anon request), and the "fix" under time pressure is often to grant a dangerously broad anon UPDATE policy (`using (true)`) — which lets anyone flip any subscription's `active` state by guessing/enumerating IDs, or to route the unsubscribe action through `createAdminClient()` (service-role, bypasses RLS) called from a route outside the sanctioned `app/(admin)/` / `lib/supabase/admin.ts` boundary — both violate existing CLAUDE.md never-do items.

**Why it happens:**
Every prior authenticated-user table in this codebase assumes a JWT is present. The unsubscribe flow is the first genuinely anonymous-but-authorized-by-token mutation path in the system, and the existing RLS mental model (role/ownership checks against `auth.uid()`) doesn't map onto it directly.

**How to avoid:**
- Do not perform the unsubscribe UPDATE through the anon-key RLS path at all. Verify the HMAC token **in application code** (a Server Action or Route Handler, not client-side), and only then perform the mutation via a narrowly-scoped `SECURITY DEFINER` Postgres function (mirroring the `delete_my_account()` pattern already used in this codebase) that takes the subscription ID and a verified-token flag, rather than widening RLS or reaching for `createAdminClient()`. This keeps the "the token is the credential" logic entirely inside a single, auditable function, the same way `delete_my_account()` centralizes account erasure.
- For the student-dashboard pause/resume path (a real JWT is present), apply the standard `USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND <only mutable columns are being changed>)` pattern already established for other tables.
- Explicitly test (as this project already tests `bip_edits`' WITH CHECK): can a subscriber flip another subscriber's `active` flag by ID-guessing via the REST API? Can a subscriber self-escalate a delivery record's `status`?

**Warning signs:**
- Unsubscribe route imports `createAdminClient` outside `app/(admin)/` or `lib/supabase/admin.ts`
- Any RLS policy on `subscriptions` or `bip_alert_deliveries` uses `using (true)` for UPDATE
- `subscriptions` or `bip_alert_deliveries` table creation migration has no `ENABLE ROW LEVEL SECURITY` line (CLAUDE.md — Supabase tables are public-readable via anon key by default)

**Phase to address:** Alert Subscriptions + Email Pipeline phase — schema/RLS migration review step, before the unsubscribe route is built.

---

### Pitfall 10: New Alert Tables Are Not Added to `delete_my_account()` or `/privacy`, Repeating v1.1 Pitfall 14 in a New Shape

**What goes wrong:**
This is v1.1 PITFALLS Pitfall 14 recurring: `delete_my_account()` (migration 00013) is a hand-maintained `SECURITY DEFINER` RPC that explicitly anonymizes/deletes specific tables; it does not automatically pick up new tables. v1.2 adds at least two new PII-bearing tables (`subscriptions`, `bip_alert_deliveries`) plus possibly a `bip_edits`-adjacent extension for the new BIP-model fields. Each needs an explicit decision:
- `subscriptions`: should cascade-delete on account deletion (a subscription preference is not public data worth anonymizing-and-keeping, unlike an approved BIP listing).
- `bip_alert_deliveries`: less obvious — deleting delivery-audit rows on account deletion destroys the idempotency history needed to prove "we already sent this," but keeping them post-deletion retains a `user_id` FK that must resolve to `ON DELETE SET NULL` or `CASCADE`, not `RESTRICT` (which would block the whole `delete_my_account()` transaction with a hard FK violation, exactly as v1.1 Pitfall 14 describes for `saved_bips`/`subscriptions`).
If a new PII table has an FK to `profiles`/`auth.users` with the Postgres default `ON DELETE NO ACTION`/`RESTRICT`, a user attempting Article 17 erasure gets a hard failure mid-transaction — worse than v1.1's version of this bug because a partial delivery-history table is now involved, and the correct GDPR answer (delete vs. anonymize vs. retain-for-legitimate-interest) is genuinely less obvious for delivery-audit data than it was for `saved_bips`.

**Why it happens:**
Same root cause as v1.1 Pitfall 14: the RPC and the privacy documentation are not derived from a live table list — they are manually written and only get updated when someone remembers to update them alongside a new table.

**How to avoid:**
- For every new PII table added in v1.2, make the FK-cascade decision an explicit line item in the phase plan (not an afterthought): `subscriptions.user_id` → `ON DELETE CASCADE`. For `bip_alert_deliveries.user_id`, decide deliberately between `ON DELETE CASCADE` (simplicity, loses delivery-audit trail post-erasure) and `ON DELETE SET NULL` with the FK made nullable (retains aggregate delivery-count/idempotency history without retaining PII, since `bip_id` + a null `user_id` is not personally identifying) — the second option is more defensible under a "legitimate interest in operational delivery records" GDPR argument, but requires the unique `(bip_id, user_id)` idempotency constraint to tolerate a null `user_id` post-erasure without re-enabling a duplicate send (partial unique index or `NULLS NOT DISTINCT` handling needed).
- Update `/privacy` in the same PR that ships the new table — enumerate what's stored (subscription preferences, delivery timestamps), the legal basis, and the unsubscribe/deletion mechanism, mirroring the existing `/privacy` treatment of `saved_bips`.
- Add both new tables to the "Looks Done But Isn't" verification checklist (see below) before considering the phase complete.

**Warning signs:**
- New table's FK to `profiles`/`auth.users` has no explicit `ON DELETE` clause (defaults to `RESTRICT`/`NO ACTION`)
- `delete_my_account()` RPC source is unchanged in a PR that adds a new PII table
- `/privacy` page is unchanged in a PR that adds `subscriptions`/`bip_alert_deliveries`
- Calling `delete_my_account()` for a user with an active subscription throws a foreign-key violation instead of succeeding

**Phase to address:** Alert Subscriptions + Email Pipeline phase, schema step — cross-check against `delete_my_account()` and `/privacy` before the phase is marked done, same discipline already established (per PROJECT.md) for Phase 6's `saved_bips` cascade.

---

### Pitfall 11: Detail-Page Redesign Coincides With Builder Field Additions, Multiplying the ISR-Revalidation Surface Without a Corresponding Audit

**What goes wrong:**
The BIP detail page currently has roughly seven distinct call sites across the codebase that call `revalidatePath('/bip/[slug]')` (or its `/bips`/`/admin` siblings) after a mutation: `admin-bips.ts` (approve, listing-edit), `admin-edit-bips.ts` (approve-edit only — reject/request-changes deliberately skip it), `account.ts` (erasure/anonymization touches every affected slug). A detail-page redesign done in the same milestone as builder field additions creates two compounding risks: (1) if the redesign changes how the page is composed (e.g., splitting previously-inline data into a differently-cached sub-component, or changing the route segment/slug format), some of the seven existing `revalidatePath` call sites may target a path that no longer matches the new page's actual cache key, silently reintroducing v1.1 Pitfall 9 (stale ISR) for a subset of mutation paths that "used to work"; (2) new BIP-model fields rendered on the redesigned page are automatically covered by the *existing* full-page ISR ("whole page revalidates" model) as long as no one introduces per-component fetch caching or Partial Prerendering for the new sections — if a developer optimizes the redesign by adding a scoped `fetch()` cache or React `cache()` boundary around just the new fields "for performance," that boundary needs its own explicit revalidation tag, or the new fields will show stale data even after `revalidatePath('/bip/[slug]')` busts the rest of the page.

**Why it happens:**
`revalidatePath` operates on the page's cache entry as a whole under the current architecture; the moment any part of the redesign introduces finer-grained caching (a common temptation during a "redesign" pass, since redesigns often touch performance too), the implicit "one call busts everything" assumption that all seven existing call sites rely on breaks for just that piece.

**How to avoid:**
- Before starting the redesign, enumerate all seven-plus current `revalidatePath` call sites touching `/bip/[slug]` (`admin-bips.ts` lines ~119-121, ~251-252, ~474-475; `admin-edit-bips.ts` line ~266; `account.ts` line ~91) and confirm the redesign does not change the slug/route shape those calls target.
- If the redesign introduces any new per-segment caching (fetch-level `revalidate` options, `unstable_cache`, or PPR), add a corresponding explicit revalidation call at every one of the existing mutation call sites — do not assume the top-level `revalidatePath('/bip/[slug]')` cascades into finer-grained cache tags introduced later without an explicit tag-based invalidation (`revalidateTag`) alongside it.
- Re-run the existing "ISR bust on edit" / "ISR bust on merge" verification checklist items from v1.1 PITFALLS against the redesigned page before considering the detail-page phase done — a visual redesign passing without re-verifying ISR behavior is the most likely way this pitfall ships unnoticed (the page "looks right" on the first cached load either way).

**Warning signs:**
- Redesign PR introduces `unstable_cache`, a scoped `fetch()` with its own `revalidate` option, or PPR flags without a corresponding `revalidateTag`/`revalidatePath` update in the seven existing mutation call sites
- A new BIP-model field shows the pre-edit value immediately after an admin approves an edit, while other fields on the same page show the new value
- Slug/route segment format changes as part of the redesign without an audit of every hardcoded `` `/bip/${slug}` `` template literal across `lib/actions/`

**Phase to address:** BIP detail-page redesign phase — must include an explicit ISR-call-site audit task, cross-referenced against the builder-completion phase's new fields so both land coherently.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|-----------------|
| Keep two hand-copied `bip_edits` column-list literals instead of one shared constant | Avoids one cross-module import | Drift between `bipEdits.ts` and `admin-edit-bips.ts` silently drops new fields at merge time (Pitfall 1/2) | Never once a second field is added in v1.2 |
| Regenerate `database.types.ts` via `--local` without pushing the migration to cloud first | Faster local iteration loop | Types claim a column exists while the shared cloud DB the app actually queries 400s on it (Pitfall 4) | Never for a migration destined for cloud within the same work session |
| Use `updated_at` as the alert-digest high-water mark instead of a dedicated `approved_at` | No new column needed | Every edit-merge re-triggers alert emails for already-notified subscribers (Pitfall 5) | Never |
| Push a `pg_cron` migration straight to the shared cloud project with no `enabled` gate | Simpler migration, no flag plumbing | Job starts firing against the shared dev/test database immediately, before the Server Action side is ready (Pitfall 6) | Only if the job body is a true no-op until a companion migration flips it on |
| Route the unsubscribe mutation through `createAdminClient()` to sidestep RLS | Fast to ship, bypasses the anon-token-auth design problem | Violates the `app/(admin)/`-only service-role boundary (CLAUDE.md never-do); broad blast radius if ever reused elsewhere | Never |
| Skip updating `delete_my_account()`/`/privacy` when shipping `subscriptions`/`bip_alert_deliveries` | Ships the feature faster | FK violation on erasure (GDPR Art. 17 failure) or an incomplete privacy disclosure | Never |
| Add a per-field scoped cache during the detail-page redesign "for performance" without updating existing `revalidatePath` call sites | Marginal perf win on an already-ISR'd page | Reintroduces stale-content bugs the v1.1 Pitfall 9 fix already solved, for a page that "looks done" | Only with an explicit `revalidateTag` companion at every existing mutation call site |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| Supabase `pg_cron` + `pg_net` | Test only against local `supabase start`, which cannot invoke a public URL | Verify extensions enabled on the cloud project dashboard; test the real invocation path via `cron.job_run_details`, not local-only manual function calls |
| Supabase shared cloud dev DB + scheduled jobs | Assume pushing a cron migration is a safe no-op until "later" | A pushed `pg_cron` job starts firing against the shared dev/test database immediately; gate with an `enabled` flag or far-future schedule during development |
| Resend digest fan-out | Reuse the existing per-recipient `sendEmail()` loop pattern designed for one-at-a-time transactional sends | Batch and rate-limit deliberately (per v1.1 research Pitfall 6); track daily volume against the 100/day free-tier ceiling explicitly |
| `List-Unsubscribe` / `List-Unsubscribe-Post` (RFC 8058) | Ship a GET-only unsubscribe link that mutates state on visit | Separate the human-facing confirm page (GET) from the one-click machine-processed endpoint (POST-only, `List-Unsubscribe=One-Click` body) so mail-client link-scanners don't silently unsubscribe users |
| `bip_edits` shadow table + new BIP-model fields | Add a field to the wizard/detail page and assume `bip_edits`/merge payload "just works" | Explicitly extend `BIP_EDIT_CONTENT_SELECT`, `EDIT_CONTENT_SELECT`, and `buildMergePayload()` for every new coordinator-editable column (Pitfall 1) |
| `database.types.ts` regen + shared cloud dev DB | Run `db:types --local` as the source of truth for what "is deployed" | Push migration to cloud first (`supabase db push`), then regenerate types against the linked/cloud project, matching the project's own standing deploy-order rule |
| Playwright E2E + scheduled cron features | Assume the cron job "just runs" during test setup like other seeded state | Cron-driven digest behavior must be triggered explicitly in test setup (direct function/RPC invocation), not relied upon to fire on its real schedule during a test run |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Digest cron re-scans the entire `bips` table every run instead of using a high-water mark | Job duration grows linearly with total approved BIPs, not with new BIPs since last run | `approved_at > last_alerted_at` per-subscriber high-water mark (Pitfall 5), indexed on `approved_at` | At a few hundred approved BIPs, well within v1's target scale |
| `subscriptions`/`bip_alert_deliveries` missing indexes on `user_id`/`bip_id` (repeats v1.1 Performance Trap for `saved_bips`) | RLS-gated SELECT/UPDATE scans grow with total row count instead of per-user row count | `CREATE INDEX` on `user_id` and `bip_id` in the same migration as table creation | At a few hundred subscribers |
| `bip_alert_deliveries` unique-constraint check becomes a full-table scan without a supporting index | `ON CONFLICT DO NOTHING` upserts slow down as delivery history grows | The unique index on `(bip_id, user_id)` itself services this — confirm it isn't dropped/altered inadvertently when handling the nullable-`user_id`-post-erasure case (Pitfall 10) | At thousands of delivery rows if the index is ever weakened |
| Detail-page redesign adds new joined data (e.g. richer partner-institution details) without checking existing query shape | Detail-page RSC query time grows with new joins that weren't needed before | Profile the redesigned page's query plan before merging; reuse existing `ADMIN_BIP_SELECT`-style single-query patterns instead of N+1 fetches per new field | Noticeable at even moderate BIP-catalogue size given the multiple joins (host university, partner universities, coordinator profile) already in play |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Unsubscribe route bypasses RLS via `createAdminClient()` outside `app/(admin)/` | Service-role key exposed to a public, unauthenticated route surface; violates CLAUDE.md never-do | Verify the HMAC token in application code, then mutate via a narrowly-scoped `SECURITY DEFINER` function (mirrors `delete_my_account()`), never via the admin client from a public route |
| Unsubscribe token has no scoping to a non-guessable identifier | An attacker with a weak-HMAC-secret or sequential-ID scenario could unsubscribe other users | Use the subscription's UUID as the HMAC input; keep the HMAC secret server-only, never in a client bundle |
| One-click unsubscribe implemented as GET-mutates-state | Mail-client link-scanners/prefetchers silently unsubscribe users who never opened or clicked the email | Separate GET (human-facing, confirm-required) from POST (machine `List-Unsubscribe-Post`, safe to auto-process) |
| `subscriptions`/`bip_alert_deliveries` created without `ENABLE ROW LEVEL SECURITY` | Public-readable via anon key by default (CLAUDE.md never-do) — subscriber emails/preferences exposed | `ENABLE ROW LEVEL SECURITY` + explicit policies in the same migration as `CREATE TABLE`, no exceptions |
| UPDATE policy on `subscriptions` (student pause/resume) has `USING` but no `WITH CHECK` | A subscriber could reassign a subscription to another `user_id` or flip protected columns | Both `USING` and `WITH CHECK` on every UPDATE policy, per the CLAUDE.md never-do already applied correctly in `bip_edits` (00017) |
| `bip_alert_deliveries.user_id` FK defaults to `RESTRICT` | `delete_my_account()` transaction hard-fails with an FK violation, blocking GDPR Art. 17 erasure | Explicit `ON DELETE CASCADE` or `SET NULL` (with nullable column) decided deliberately, not left to the Postgres default |
| pg_cron job migration pushed to shared cloud DB with no `enabled` gate | Job fires against the shared dev/test project before the feature is ready, sending real/logged emails to real seeded test users | Gate with an `enabled` flag row or a deliberately far-future initial schedule until the companion Server Action code is live |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| New builder field (e.g. `partner_institutions_only`) added to the wizard but the edit-diff view doesn't render it | Admin approves an edit without seeing what actually changed for that field, defeating the purpose of the diff review | Diff view must derive its field list from the same shared constant as the merge payload (Pitfall 2's fix), so every editable field is automatically diffable |
| Coordinator submits a new field's value on an edit, admin approves, live page doesn't change (Pitfall 1) | Coordinator gets an "edit approved" email and finds the site unchanged — erodes trust in the edit flow entirely | Playwright coverage per new field (Pitfall 1's fix) catches this before it reaches a real coordinator |
| Unsubscribe confirmation page gives no context on what the user is cancelling | Student unsubscribes from all BIP alerts by mistake, or isn't sure it worked | Confirmation page names the specific subscription (field/country) being cancelled, with a clear success state |
| Digest email fails silently once the Resend daily cap is hit | Subscribers simply never receive an alert for a BIP they'd have wanted to know about, with no visibility to the team | Instrument send failures distinctly from successes (Pitfall 7); treat "quota exceeded" as an operational alert, not a swallowed error |

---

## "Looks Done But Isn't" Checklist

- [ ] **New BIP-model field:** appears in (1) `bips` migration, (2) `bip_edits` migration, (3) wizard schema + step UI, (4) shared column-list constant used by both `bipEdits.ts` and `admin-edit-bips.ts`, (5) `buildMergePayload()`, (6) detail-page render, (7) all three seed sources, (8) `verify-seed.ts` distribution check
- [ ] **Edit-merge round trip:** for every new field, a Playwright spec edits an approved BIP's new field, admin approves, and asserts the live `/bip/[slug]` page shows the new value — not just that the wizard/detail-page render correctly in isolation
- [ ] **`database.types.ts` freshness:** regenerated against the cloud/linked project (not stale `--local`) after every migration that's about to ship
- [ ] **Alert high-water mark:** digest query filters on a dedicated `approved_at`/`first_approved_at` column, confirmed untouched by `approveEditAction`'s merge payload
- [ ] **pg_cron real-environment test:** job has actually fired against the cloud project at least once, verified via `cron.job_run_details`, not only invoked manually via `supabase functions serve`
- [ ] **Resend volume math:** documented expected daily digest email volume vs. the 100/day free-tier ceiling, with an explicit upgrade-trigger threshold
- [ ] **Unsubscribe token security:** token is bound to the subscription's UUID (not a guessable ID), verified server-side, and the mutation runs through a `SECURITY DEFINER` function — not `createAdminClient()` from a public route
- [ ] **One-click unsubscribe safety:** GET-based link does not mutate state on mere visit; a separate POST-only path handles `List-Unsubscribe-Post`
- [ ] **RLS on new tables:** `subscriptions` and `bip_alert_deliveries` both have `ENABLE ROW LEVEL SECURITY` and every UPDATE policy has both `USING` and `WITH CHECK`
- [ ] **GDPR cascade:** `delete_my_account()` handles `subscriptions` and `bip_alert_deliveries` explicitly (cascade or deliberate anonymize decision), verified by actually calling the RPC for a user with an active subscription and confirming no FK violation
- [ ] **`/privacy` updated:** `subscriptions` and `bip_alert_deliveries` enumerated alongside existing `saved_bips`/`bip_edits` disclosures
- [ ] **ISR call-site audit:** every existing `revalidatePath('/bip/[slug]')` call site still targets the correct cache key after the detail-page redesign; any new scoped caching has an explicit companion `revalidateTag`/`revalidatePath`
- [ ] **Seed drift check:** `seed.e2e.sql` and `seed-cloud-e2e.mjs` re-diffed for column coverage after every schema change in this milestone, not just at incident time
- [ ] **E2E test isolation:** any new subscription/digest-related Playwright spec owns dedicated, disposable fixtures (mirrors the BUG-002 fix pattern) rather than scavenging shared seeded BIPs or subscriber rows

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|------------------|
| New field silently dropped by edit-merge (Pitfall 1) | MEDIUM | Backfill: for every `bip_edits` row with `status='approved'` after the bug window, diff the stored `edit_data`/columns against the live `bips` row for the affected field and re-apply manually; add the missing field to the merge payload; add regression test |
| `database.types.ts` drift from cloud (Pitfall 4) | LOW | Regenerate against the cloud project immediately; no data loss, just a build-time type mismatch until fixed |
| Alert digest double-sends via edit-merge `updated_at` collision (Pitfall 5) | MEDIUM | Add `approved_at` column, backfill from `bip_status_history`'s original `approve` event timestamps; send a brief "you may have received a duplicate alert" note if volume warrants it (mirrors v1.1's recovery guidance for double-sends) |
| pg_cron job fires prematurely against shared cloud DB (Pitfall 6) | MEDIUM | Immediately `cron.unschedule()` or flip the `enabled` gate off; audit `cron.job_run_details` and `bip_alert_deliveries` for any sends that went out during the premature window; notify affected recipients if real emails went out |
| Resend daily cap breached mid-digest (Pitfall 7) | LOW–MEDIUM | Queue the remaining recipients for the next UTC day (idempotency table already prevents re-sending to those already delivered); if it recurs, treat as the documented upgrade trigger and move to a paid Resend plan |
| Unsubscribe link auto-processed by a mail-client link-scanner (Pitfall 8) | HIGH | If real users were incorrectly unsubscribed, this is hard to detect after the fact without deliberate logging; requires re-opt-in outreach and a mechanism fix (GET/POST separation) before it recurs — treat any single confirmed incident as high-priority |
| New PII table causes FK violation on account erasure (Pitfall 10) | HIGH | Same as v1.1 Pitfall 14's recovery: GDPR Art. 17 breach risk; manual admin-panel deletion + direct DB fix short-term, correct the FK cascade in a follow-up migration |
| ISR call site missed after detail-page redesign (Pitfall 11) | LOW–MEDIUM | Add the missing `revalidatePath`/`revalidateTag` call; manually trigger revalidation for any BIPs edited during the gap window |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| New BIP-model field dropped at edit-merge (P1) | Coordinator BIP-builder-completion phase | Playwright: edit approved BIP's new field → admin approves → live page reflects new value |
| Duplicated column-list literal drift (P2) | Coordinator BIP-builder-completion phase, first plan | Single shared constant imported by both `bipEdits.ts` and `admin-edit-bips.ts`; grep confirms no second copy exists |
| Seed files not updated for new fields (P3) | Coordinator BIP-builder-completion + Alert Subscriptions phases | `verify-seed.ts` has an assertion for every new field; `seed.e2e.sql`/`seed-cloud-e2e.mjs` diffed for column-name parity |
| `database.types.ts` regenerated against stale `--local` (P4) | Every phase adding a migration | Types regenerated against cloud/linked project after `supabase db push`, confirmed before merge |
| Digest/edit-merge `updated_at` collision (P5) | Alert Subscriptions + Email Pipeline phase, schema step | Dedicated `approved_at` column exists and is confirmed untouched by `buildMergePayload()` |
| pg_cron local-vs-cloud test gap (P6) | Alert Subscriptions + Email Pipeline phase, first infra task | `cron.job_run_details` shows a real successful cloud-project run before the phase is marked done |
| Resend 100/day ceiling vs digest volume (P7) | Alert Subscriptions + Email Pipeline phase, design step | Volume math documented; failure-mode (queue vs. hard-fail) decided and instrumented |
| Unsubscribe token security + one-click POST (P8) | Alert Subscriptions + Email Pipeline phase, unsubscribe design step | Token bound to UUID; GET does not mutate state; dedicated POST path for one-click |
| RLS gaps on `subscriptions`/`bip_alert_deliveries` (P9) | Alert Subscriptions + Email Pipeline phase, schema/RLS review | Both tables have RLS enabled; every UPDATE policy has USING + WITH CHECK; unsubscribe mutation goes through a SECURITY DEFINER function, not `createAdminClient()` |
| GDPR cascade gap for new tables (P10) | Alert Subscriptions + Email Pipeline phase, schema step | `delete_my_account()` extended; `/privacy` updated; RPC call tested against a user with an active subscription |
| ISR call-site audit after detail-page redesign (P11) | BIP detail-page redesign phase | All existing `revalidatePath('/bip/[slug]')` call sites confirmed still correct; any new scoped caching has a companion invalidation call |

---

## Sources

- [BipHub v1.1 PITFALLS.md](../milestones/v1.1-research/PITFALLS.md) — baseline pitfalls this file extends (student-JWT timing, `bip_edits` shadow-table shape, alert double-send/rate-limit basics, unsubscribe absence, GDPR consent recording, ISR staleness on edit, audit-log gaps, slug immutability, erasure-cascade gaps for `saved_bips`/`subscriptions`)
- [BipHub RETROSPECTIVE.md](../RETROSPECTIVE.md) — v1.1 lessons: deferred manual UAT accumulating silently, e2e shared-state coupling (BUG-002), two-seed-file drift, resequencing deferred scope
- [BipHub KNOWN-BUGS.md](../KNOWN-BUGS.md) — BUG-001 (approved-edit wizard trapped by an RLS policy scoped to non-approved statuses) and BUG-002 (one flaky test cascading into four failures via shared seeded-BIP state) — both root-caused with file/line-level evidence
- [BipHub CLAUDE.md](../../CLAUDE.md) — standing never-do items: RLS on every table, USING+WITH CHECK on every UPDATE policy, `createAdminClient` scoping, `getClaims()` not `getSession()`, `revalidatePath` for ISR
- [BipHub project memory: local-dev-uses-cloud-supabase] — local dev/`.env.local` points at the shared cloud Supabase project; migrations must be pushed to cloud before code that references new columns is deployed
- [BipHub project memory: e2e-two-seed-files-must-stay-in-sync] — `supabase/seed.e2e.sql` vs `scripts/seed-cloud-e2e.mjs` drift incident (2026-07-17), four fixtures lost on a fresh cloud re-seed
- [BipHub `.planning/research/FEATURES.md` (v1.2, in progress)] — confirms four schema-present/UI-absent BIP fields (`virtual_sessions_count`, `virtual_duration_notes`, `accommodation_notes`, `partner_institutions_only`) plus a live `virtual_timing` enum/CHECK-constraint mismatch between wizard and DB
- [`supabase/migrations/00017_bip_edits.sql`](../../supabase/migrations/00017_bip_edits.sql) — current `bip_edits` shape (22 content columns + `partner_institutions` jsonb), RLS policies with correct USING+WITH CHECK pattern already applied
- [`lib/queries/bipEdits.ts`](../../lib/queries/bipEdits.ts) / [`lib/actions/admin-edit-bips.ts`](../../lib/actions/admin-edit-bips.ts) — the two independently-maintained column-list literals (`BIP_EDIT_CONTENT_SELECT`, `EDIT_CONTENT_SELECT`) and the `buildMergePayload()` function that is the concrete mechanism behind Pitfall 1
- [`lib/email/send.ts`](../../lib/email/send.ts) — existing fire-and-forget transactional email contract (D-11), template registry pattern to extend for digest emails
- [`scripts/verify-seed.ts`](../../scripts/verify-seed.ts) — existing distribution-check pattern to extend for new fields
- [`supabase/config.toml`](../../supabase/config.toml) — no `pg_cron`/`pg_net` extension currently configured; must be added for Phase 7/Alert-Subscriptions work
- [Supabase Cron Documentation](https://supabase.com/docs/guides/cron) — `pg_cron` scheduling model, `cron.job_run_details` observability table
- [Supabase pg_net Documentation](https://supabase.com/docs/guides/database/extensions/pg_net) — async HTTP calls from Postgres, used to invoke Edge Functions from cron jobs
- [Resend Usage Limits / Pricing](https://resend.com/docs/api-reference/rate-limit) — free-tier daily/monthly caps (verify current numbers at implementation time; the 100/day figure is already documented in this project's own `STATE.md`)
- [Gmail/Yahoo 2024+ Bulk Sender Requirements](https://resend.com/blog/gmail-and-yahoo-bulk-sending-requirements-for-2024) — `List-Unsubscribe` + one-click requirements for bulk senders
- [RFC 8058 — One-Click List-Unsubscribe](https://datatracker.ietf.org/doc/html/rfc8058) — `List-Unsubscribe-Post` header mechanics; POST-only processing to avoid link-scanner false positives
- [Next.js `revalidatePath`/`revalidateTag` documentation](https://nextjs.org/docs/app/api-reference/functions/revalidatePath) — scoped vs. path-level cache invalidation, relevant to the detail-page-redesign ISR audit (Pitfall 11)

---
*Pitfalls research for: BipHub v1.2 — completing the coordinator BIP builder, redesigning the BIP detail page, and shipping carried-forward Alert Subscriptions + Email Pipeline on the existing Next.js 15.5 + Supabase + Resend + Vercel system*
*Researched: 2026-07-18*
