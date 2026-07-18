# Architecture Research

**Domain:** v1.2 integration — completing the coordinator BIP-builder data model, the BIP detail page that depends on it, and the carried-forward alert subscription + email digest pipeline
**Researched:** 2026-07-18
**Confidence:** HIGH — based on reading every live migration (00001-00021), all `lib/actions/*.ts` Server Actions touching `bips`/`bip_edits`, `lib/schemas/bip-wizard.ts`, `lib/queries/bipDetail.ts`, `BipEditDiffView.tsx`, and the v1.1 research corpus (ARCHITECTURE/PITFALLS/SUMMARY) that already vetted the alert-pipeline design once before it was deferred.

---

## Context: This Is an Integration Document, Not a Rewrite

v1.2 does not touch the Next.js 15 App Router route-group layout, the RLS-everywhere pattern, `getClaims()`-only auth, `createAdminClient` confinement to `app/(admin)/`, Server-Actions-for-all-mutations, or the `revalidatePath()` ISR-bust strategy. All of that is shipped and correct. This document describes only what must be added or modified for the three v1.2 workstreams:

- **Workstream 1 — Complete the BIP builder.** Four `bips` columns exist in the database and seed data but are wired into *none* of: the wizard schema, the wizard UI, `submitBipAction`, `adminUpdateBipAction`, the `bip_edits` shadow table, `buildContentPayload`/`buildMergePayload`, `BipEditDiffView`, or the public detail page. A fifth field (`max_participants`) is captured by the wizard but never rendered publicly. This is "dead schema" that must become a live, edit-flow-safe field set.
- **Workstream 2 — BIP detail page.** Depends on Workstream 1's finished field set (cannot finalize detail-page layout while fields are still being added).
- **Workstream 3 — Alert Subscriptions + Email Pipeline.** Two new tables (`bip_subscriptions`, `bip_alert_deliveries`), a scheduled digest job, a signed no-login unsubscribe route. Fully independent of Workstreams 1-2; hooks into the *existing* `approveBipAction`/`approveEditAction` by reading their result (`bips.status = 'approved'`), not by modifying them.

---

## Workstream 1: Completing the BIP Builder Data Model

### The Gap, Precisely

`supabase/migrations/00003_bips_full_schema.sql` added 12 Erasmus+ fields to `bips` at v1.0. Four of them were never connected end-to-end:

| Column | Type | In `bips`? | In wizard (`bip-wizard.ts` / `BipDraftData`)? | In `bip_edits` (00017)? | In `BipEditDiffView`? | In `BipDetail` query / detail page? |
|---|---|---|---|---|---|---|
| `virtual_sessions_count` | integer | Yes (00003) | **No** | **No** | **No** | **No** |
| `virtual_duration_notes` | text | Yes (00003) | **No** | **No** | **No** | **No** |
| `accommodation_notes` | text | Yes (00003) | **No** | **No** | **No** | **No** |
| `partner_institutions_only` | boolean, default `false` | Yes (00003) | **No** | **No** | **No** | **No** |
| `max_participants` | integer | Yes | **Yes** (step 2) | **Yes** (00017) | Documented as intentionally absent (comment: "not exposed in BipDetail") | **No** |

Confirmed by direct grep: these four column names appear only in `00003_bips_full_schema.sql`, `supabase/seed.sql`, and the generated `database.types.ts` — nowhere in `lib/schemas/`, `lib/store/bip-draft.ts`, `lib/actions/`, or `components/`. Students cannot see them, coordinators cannot set them, and admins cannot review them in the diff. This is exactly the "complete the model" scope of v1.2.

There is no evidence of an unbuilt "structured schedule" requirement beyond these two scalar fields (`virtual_sessions_count` int + `virtual_duration_notes` text). **Recommendation: do not add a new related table for scheduling.** A `bip_sessions` child table (per-session date/time rows) would be a genuine differentiator but there is no requirement or seed-data shape suggesting BIPs need more than "N virtual sessions, described in prose" — adding a join table here is scope creep against the "cards everywhere, simple data model" ethos and would ripple through the wizard, `bip_edits`, the diff view, and the detail page a second time. Ship the two scalar columns; revisit a structured schedule table only if a future requirement (e.g., a per-session calendar view) demands it.

### Required Changes, Layer by Layer

Every one of these four (five, counting `max_participants`) fields must propagate through **all six layers** that already exist for the 18 fields that do work, or the same "half-wired field" bug recurs. The 22-content-column convention (`lib/actions/bip-edits.ts` line 27 comment: "the 22 editable content columns") becomes 26 once these are added.

**1. Schema — new migration (additive, `00022_bip_builder_completion.sql`):**

```sql
-- bips already has these columns (00003) — nothing to add there.
-- bip_edits needs the same four columns added, mirroring the bips shape,
-- nullable with no default (matches the existing bip_edits convention —
-- Zod validates at submit time, not a DB CHECK, per 00017's own comment
-- "No CHECK constraints on content columns; Zod validates at submit time").

alter table public.bip_edits
  add column virtual_sessions_count integer,
  add column virtual_duration_notes text,
  add column accommodation_notes    text,
  add column partner_institutions_only boolean;
```

No RLS changes needed — `bip_edits` RLS policies (00017) gate on `created_by`/`status`, not on column names; adding columns to an existing table does not require new policies.

**2. Wizard schema (`lib/schemas/bip-wizard.ts`):** add the four fields to `step2Schema` (they sit naturally alongside `virtual_timing`, `virtual_component_description`, `max_participants`) **and** to `fullBipSchema` (the flat cross-field-validated schema `submitBipAction`, `adminUpdateBipAction`, and both `bip-edits.ts` actions all rely on). `partner_institutions_only` is a boolean (`.default(false)`, matching `green_travel`/`inclusion_support`'s pattern in `step4Schema`); `virtual_sessions_count` is `z.coerce.number().int().min(1).optional()`; `virtual_duration_notes` and `accommodation_notes` are free-text, optional, capped (`.max(500)`-class limits, matching `eligibility_notes`).

**3. Draft store (`lib/store/bip-draft.ts`):** add the four fields to `BipDraftData`. This is the single type that flows through the wizard, `submitBipAction`, `bip-edits.ts`, and `BipEditDiffView` (`getProposed`), so this is the load-bearing type change — get it right once and every downstream consumer is type-checked against it.

**4. Wizard UI (`components/forms/steps/WizardStep2ProgramDetails.tsx`):** add form fields for `virtual_sessions_count` + `virtual_duration_notes` (natural fit alongside the existing virtual-component fields) and `accommodation_notes` (fits alongside `host_city`/dates — physical-mobility logistics). `partner_institutions_only` reads more naturally as a checkbox in `WizardStep3Partners.tsx` ("This BIP is only open to students from partner institutions") since it's a partner-related eligibility flag, not a programme-detail field — this is a UX judgment call for the roadmap/requirements phase, not an architecture blocker.

**5. Server Actions — four call sites, all following the established pattern of "flat field list repeated with a comment warning to keep in sync":**
   - `lib/actions/bip-submit.ts`: add to the inline `submitSchema` object and to `updatePayload`.
   - `lib/actions/admin-bips.ts` (`adminUpdateBipAction`): add to `updatePayload`.
   - `lib/actions/bip-edits.ts` (`buildContentPayload`): add to the returned object and to the function's parameter type.
   - `lib/actions/admin-edit-bips.ts` (`buildMergePayload`, `EDIT_CONTENT_SELECT`, `RawEditRow`): add to all three — this is the merge-on-approve path, easy to miss one of the three and get a silent `undefined` merged into `bips`.

**6. Diff view (`components/admin/BipEditDiffView.tsx`):** add four `FieldDef` entries to the `FIELDS` array (pattern already established — `getLive: (b) => ..., getProposed: (d) => ...`). Reuse `fmtBool` for `partner_institutions_only`.

**7. Detail-page data layer (`lib/queries/bipDetail.ts`):** add all five fields (`max_participants` too) to the `BipDetail` type and to both `getBipBySlug`'s and `getBipById`'s `.select()` strings — these two queries currently duplicate the same column list verbatim (a known duplication risk already present before v1.2; do not fix it as a drive-by in this workstream, just keep both in sync as the existing pattern requires).

**8. Detail-page rendering (`components/bip/BipBody.tsx` / `BipSidebar.tsx` — Workstream 2's territory):** actually display the five fields. This is the hard dependency: Workstream 2 cannot finalize its layout until this field set is locked, because these are exactly the kind of "where does this go visually" decisions a detail-page redesign phase is supposed to make.

### Anti-Pattern to Avoid: Adding Fields to Only Some Layers

The existing bug is proof this happens by default — 00003 added the columns in Phase 1 and nothing since has touched them. The fix is procedural as much as architectural: any plan that adds a new `bips` content field must include a checklist task touching all seven of the locations above (schema/bip_edits mirror, wizard schema, draft store type, wizard UI, the four Server-Action call sites, diff view, detail query). Recommend the phase plan for Workstream 1 literally enumerate these seven locations as acceptance criteria rather than "add the fields" as a single vague task.

### New vs Modified — BIP Builder Completion

| Component | New or Modified | Notes |
|---|---|---|
| `bip_edits` table | MODIFIED (new migration `00022`) | 4 new nullable columns mirroring `bips` |
| `lib/schemas/bip-wizard.ts` (`step2Schema`, `fullBipSchema`) | MODIFIED | 4 new fields, 1 already-present field (`max_participants`) unaffected here |
| `lib/store/bip-draft.ts` (`BipDraftData`) | MODIFIED | Load-bearing type — every consumer type-checks against it |
| `components/forms/steps/WizardStep2ProgramDetails.tsx` | MODIFIED | 3 of 4 new fields |
| `components/forms/steps/WizardStep3Partners.tsx` | MODIFIED | `partner_institutions_only` checkbox (UX call) |
| `lib/actions/bip-submit.ts` | MODIFIED | `submitSchema` + `updatePayload` |
| `lib/actions/admin-bips.ts` (`adminUpdateBipAction`) | MODIFIED | `updatePayload` |
| `lib/actions/bip-edits.ts` (`buildContentPayload`) | MODIFIED | New-edit submit path |
| `lib/actions/admin-edit-bips.ts` (`buildMergePayload`, `EDIT_CONTENT_SELECT`, `RawEditRow`) | MODIFIED | Merge-on-approve path — 3 call sites in one file |
| `components/admin/BipEditDiffView.tsx` (`FIELDS`) | MODIFIED | 4 new `FieldDef` rows |
| `lib/queries/bipDetail.ts` (`BipDetail`, both `.select()` strings) | MODIFIED | Adds all 5 fields (incl. `max_participants`) |

No brand-new tables. No RLS policy changes (existing `bip_edits` policies are column-agnostic). This workstream is pure "wire up dead schema," which is why it is low-risk but high-surface-area (touches 10 files across 4 layers).

---

## Workstream 2: BIP Detail Page

### Dependency on Workstream 1

The existing `/bip/[slug]` page (`app/(public)/bip/[slug]/page.tsx`) already has the correct ISR shape: `export const revalidate = 3600`, `export const dynamicParams = true`, `generateStaticParams` pre-rendering all approved slugs via a cookie-free direct REST fetch (works outside request scope at build time), and `approveBipAction`/`approveEditAction` already call `revalidatePath('/bip/${slug}')` on the transitions that change public content. **None of this needs to change.** The v1.2 "BIP detail page" work is a data-completeness and layout problem, not an ISR-strategy problem.

The only correctness gap is `getBipBySlug`/`getBipById` not selecting the full field set (see Workstream 1 §7). Once that lands, the detail-page phase is a rendering/UX exercise: deciding where `virtual_sessions_count`, `virtual_duration_notes`, `accommodation_notes`, `partner_institutions_only`, and `max_participants` appear in `BipHeader`/`BipBody`/`BipSidebar`.

### No New Data-Flow Changes

- `getBipBySlug` continues to be RLS-gated by the anon-key `bips_select_approved_public`-class policy (only `status = 'approved'` rows visible to anonymous users) — unchanged.
- `getBipById` continues to serve the coordinator-preview and admin-review paths — unchanged.
- No new query functions are needed; the existing two functions just grow their `.select()` string.
- `SavedBipsHydrator` / `BipSaveButton` (student save-state) are orthogonal to this workstream and untouched.

### Build-Order Implication

Workstream 2 (detail page) **cannot start in earnest until Workstream 1's field set is locked** — not because of a technical blocker (adding fields to a `.select()` string is trivial) but because the detail-page phase's actual deliverable is a *layout decision* for these fields, and that decision needs the final field list, not a partial one. This is the "unblocks BIP detail-page design" relationship already recorded in `PROJECT.md`'s Key Decisions table — this research confirms the mechanism, not just the intent.

---

## Workstream 3: Alert Subscriptions + Email Pipeline

### Design Simplification vs the v1.1-Era Draft

The v1.1 research cycle (`.planning/milestones/v1.1-research/ARCHITECTURE.md`) proposed a three-table design: `bip_alert_queue` (populated by a trigger on `bips.status → 'approved'`) plus `bip_subscriptions` plus an implied deliveries log. The v1.1 `SUMMARY.md`/`PITFALLS.md` (written the same day, reconciling the two research passes) already simplified this to a **high-water-mark + deliveries-anti-join** design and dropped the queue/trigger entirely for the alert pipeline (the trigger-based approach was retained only for the *unrelated* `bip_edits` audit-log problem, not for alerts). This document adopts that simplification and goes one step further: **no queue table and no trigger on `bips` are needed at all.**

**Recommended design: a stateless anti-join query, run by a scheduled Edge Function, with `bip_alert_deliveries` as the sole source of idempotency truth.**

```sql
-- Conceptual shape of the matcher query (runs inside the Edge Function,
-- service-role client, once per (subscription, digest_freq) batch):

select b.id, b.slug, b.title, b.subject_areas, u.country
from public.bips b
join public.universities u on u.id = b.host_university_id
where b.status = 'approved'
  and (sub.subject_area is null or sub.subject_area = any(b.subject_areas))
  and (sub.country      is null or sub.country      = u.country)
  and not exists (
    select 1 from public.bip_alert_deliveries d
    where d.bip_id = b.id and d.user_id = sub.user_id
  );
```

Why this is correct and sufficient at BipHub's scale: the project's own stack decision already caps itself at "no external search service needed below 500 BIPs" (`CLAUDE.md`). A full anti-join over `bips × active subscriptions` at that scale is a non-issue; it needs no queue, no trigger, no high-water-mark column, and — critically — **requires zero modification to `approveBipAction` or `approveEditAction`.** A BIP becomes alert-eligible the instant `status = 'approved'` is true, which is already the exact condition those two Server Actions produce today. The "hook point" the milestone context asks about is not a new code path in `admin-bips.ts` — it is simply that the *next scheduled digest run's query* will now find the row. This is the correct application of the existing "Anti-Pattern: Calling the Alert Matcher in a Server Action" lesson already documented in the v1.1 research: decoupling by polling a stable predicate (`status = 'approved'` minus `already delivered`) is strictly simpler than decoupling via a trigger-fed queue, and avoids adding a write to the hot admin-approve path.

One subtlety worth flagging for the roadmap: `approveEditAction` (the `bip_edits` merge-on-approve path) also leaves `bips.status = 'approved'` throughout — it never transitions status. Since the anti-join keys on "approved and not yet delivered to this user," a BIP that has already been delivered once (from its original approval) will **not** re-trigger an alert when a later content edit is merged. This is the correct product behavior (coordinators editing typos should not spam re-alert every subscriber) and requires no special-casing — it falls out of the design for free.

### New Table: `bip_subscriptions`

```sql
create table public.bip_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  subject_area  text,                          -- ISCED field id (lib/isced.ts), NULL = any field
  country       text,                          -- ISO 3166-1 alpha-2, NULL = any country
  digest_freq   text not null default 'weekly'
    check (digest_freq in ('daily', 'weekly')),
  active        boolean not null default true,
  consent_text  text not null,                 -- server-composed at creation time (GDPR Art. 7 audit trail)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.bip_subscriptions enable row level security;

create index bip_subscriptions_user_id_idx on public.bip_subscriptions (user_id);
create index bip_subscriptions_active_freq_idx
  on public.bip_subscriptions (digest_freq) where active = true;

create policy "bip_subscriptions_select_own"
  on public.bip_subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "bip_subscriptions_insert_own"
  on public.bip_subscriptions for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- USING + WITH CHECK both present (CLAUDE.md never-do).
create policy "bip_subscriptions_update_own"
  on public.bip_subscriptions for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "bip_subscriptions_delete_own"
  on public.bip_subscriptions for delete to authenticated
  using ((select auth.uid()) = user_id);
```

This follows the exact pattern `saved_bips` (00016) already established: FK directly to `auth.users` (not `profiles`) for GDPR-cascade correctness (00016's own comment explains why — direct `auth.users` FK means `delete_my_account()`'s `delete from auth.users` cascades automatically without RPC changes), `auth.uid() = user_id` as the sole ownership predicate (not an `app_metadata.role` check), and required indexes on the RLS-predicate column shipped in the same migration.

**One thing that has changed since the v1.1-era pitfalls research was written and is now moot:** that research's Pitfall 1 ("student role does not propagate to the JWT immediately") assumed the only role-mirroring mechanism was the post-insert trigger. Migration `00015_student_role.sql` (already shipped) added a **Custom Access Token Hook** that injects `app_metadata.role` at first-JWT-issuance time, before the trigger even runs. The staleness window Pitfall 1 warned about no longer exists for new signups. This does not change the recommendation (`auth.uid() = user_id` is still the correct primary predicate — it's simpler and it works regardless of role-claim timing), but the roadmap/requirements phase should not treat "JWT role staleness" as an open risk for v1.2 the way v1.1 planning did.

### New Table: `bip_alert_deliveries`

```sql
create table public.bip_alert_deliveries (
  id       uuid primary key default gen_random_uuid(),
  bip_id   uuid not null references public.bips(id) on delete cascade,
  user_id  uuid not null references auth.users(id) on delete cascade,
  status   text not null default 'sent' check (status in ('sent', 'failed')),
  sent_at  timestamptz not null default now(),
  unique (bip_id, user_id)
);

alter table public.bip_alert_deliveries enable row level security;

create index bip_alert_deliveries_user_id_idx on public.bip_alert_deliveries (user_id);
create index bip_alert_deliveries_bip_id_idx  on public.bip_alert_deliveries (bip_id);

-- Students may view their own delivery history (GDPR Art. 15 transparency) —
-- no INSERT/UPDATE/DELETE policy for `authenticated` is defined here.
create policy "bip_alert_deliveries_select_own"
  on public.bip_alert_deliveries for select to authenticated
  using ((select auth.uid()) = user_id);
```

**Important RLS/grants interaction to get right:** migration `00021_public_table_grants.sql` runs `alter default privileges in schema public grant select, insert, update, delete on tables to authenticated`, which means every future table — including this one — automatically receives a blanket `GRANT INSERT/UPDATE/DELETE` to the `authenticated` role. This is **not** a hole: in Postgres, `ENABLE ROW LEVEL SECURITY` plus the *absence* of a permissive policy for a given command means that command is denied for that role regardless of the table-level `GRANT`. Only `service_role` (which bypasses RLS entirely by Postgres/Supabase convention, independent of any policy) can write to `bip_alert_deliveries`. Do not add a redundant "deny-all" policy — it is unnecessary and the v1.1-era `ARCHITECTURE.md` draft's `alert_queue_no_access` policy pattern was solving a problem that migration `00021` (written later, in the actual codebase) already prevents structurally. Simply defining zero INSERT/UPDATE/DELETE policies is correct and sufficient.

**Delivery-write timing (idempotency correctness):** insert the delivery row **after** a confirmed-successful Resend response, not before the send attempt. This makes the anti-join naturally retry-safe: a failed send leaves no delivery row, so the next scheduled run's anti-join will pick the (bip, user) pair up again automatically — no separate retry queue needed. The `unique (bip_id, user_id)` constraint plus `on conflict do nothing` on the insert is the race-safety net for two overlapping cron fires, not the primary retry mechanism.

### Scheduling: pg_cron → Edge Function → Resend (Locked, Unchanged from v1.1 Research)

This decision was already made and verified against Supabase docs during v1.1 research and remains correct:

- **Vercel Cron is not viable**: Hobby plan is once-per-day with ±59 min precision and a 10-second execution timeout — insufficient for a chunked, rate-limited send loop.
- **Supabase Cron (`pg_cron`) → `pg_net` HTTP POST → Supabase Edge Function** gives a 150-second execution budget, is free-tier, and lives inside the already-provisioned Supabase project (no second deploy target, consistent with the CLAUDE.md/PROJECT.md decision to keep Resend as the only external integration).
- The Edge Function is also the **only** correct place for the service-role client in this workstream. `CLAUDE.md`'s never-do ("never use `createAdminClient` outside `app/(admin)/` and `lib/supabase/admin.ts`") governs the Next.js codebase; a Supabase Edge Function is a separate Deno runtime outside that boundary by construction, so `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` inside `supabase/functions/send-bip-alerts/index.ts` does not violate the rule — it is the same pattern the rule exists to protect (service-role access only in a trusted, non-client-reachable server context), just relocated to the runtime built for exactly this purpose.

**Two scheduled jobs, one Edge Function, a body parameter distinguishing cadence:**

```sql
-- Daily-subscriber digest: every day
select cron.schedule(
  'bip-alert-digest-daily', '0 8 * * *',
  $$ select net.http_post(
       url := current_setting('app.edge_function_url') || '/send-bip-alerts',
       headers := jsonb_build_object(
         'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
         'Content-Type', 'application/json'),
       body := '{"digest_freq":"daily"}'::jsonb
     ); $$
);

-- Weekly-subscriber digest: Mondays only
select cron.schedule(
  'bip-alert-digest-weekly', '0 8 * * 1',
  $$ select net.http_post(
       url := current_setting('app.edge_function_url') || '/send-bip-alerts',
       headers := jsonb_build_object(
         'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
         'Content-Type', 'application/json'),
       body := '{"digest_freq":"weekly"}'::jsonb
     ); $$
);
```

Edge Function `supabase/functions/send-bip-alerts/index.ts`:
1. Read `digest_freq` from the request body.
2. `select * from bip_subscriptions where active = true and digest_freq = $1`.
3. For each subscription, run the anti-join matcher query above.
4. Group all new matches **per user** (a user may hold several subscriptions matching several BIPs in one run — send exactly one digest email per user per run, not one per subscription-match).
5. Chunk sends 5 at a time with a 100ms delay, `Promise.allSettled` (not `Promise.all`) — this is the existing v1.1 pitfalls research's Pitfall 6 finding (Resend's 5 req/sec team-wide limit) and remains directly applicable; the current `lib/email/send.ts` fire-and-forget pattern is correct for single transactional sends and must **not** be reused unmodified inside this loop.
6. On confirmed success per user: `insert into bip_alert_deliveries (bip_id, user_id) values (...) on conflict do nothing` for every BIP included in that user's digest.
7. Local dev note (unchanged from v1.1 research, still true): local `pg_cron` cannot reach a public URL, so end-to-end local testing requires `supabase functions serve` invoked manually — this is a testing-process note for the phase plan, not an architecture change.

### Signed, No-Login Unsubscribe

**Route:** `app/api/unsubscribe/route.ts` (public route handler, not inside any authed route group — `GET` only, no `getClaims()` call).

**Token design:** `token = HMAC-SHA256(secret, subscription_id)` where `secret` is a server-only env var (e.g. `UNSUBSCRIBE_TOKEN_SECRET`, never exposed to the client). The token is **computed on demand**, not stored — every alert email footer link and every `List-Unsubscribe` header embeds `https://biphub.eu/api/unsubscribe?sid=<subscription_id>&token=<hmac>`. Verification recomputes the HMAC server-side and compares in constant time before trusting `sid`.

**Privileged write without `createAdminClient`:** the route cannot use a coordinator/student session (there is none — the whole point is no-login) and must not import `createAdminClient` (that boundary is `app/(admin)/`-only per `CLAUDE.md`). The correct pattern, already proven in this codebase by `delete_my_account()` (migration `00013`, `SECURITY DEFINER`, callable via the anon-key client, reads its own authorization signal — there `auth.uid()`, here the pre-verified HMAC token — internally):

```sql
create or replace function public.unsubscribe_bip_subscription(p_subscription_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bip_subscriptions
    set active = false, updated_at = now()
    where id = p_subscription_id;
end;
$$;

revoke all on function public.unsubscribe_bip_subscription(uuid) from public, authenticated;
grant execute on function public.unsubscribe_bip_subscription(uuid) to anon;
```

The route handler: (1) recompute and verify the HMAC against the query-string token — **this is the sole authorization check, done in application code before the RPC call**; (2) on success, call the RPC through the ordinary anon-key `createClient()` (never `createAdminClient`); (3) render a graceful "you're unsubscribed" or "link already used / invalid" page — never a 500 on a bad/reused token (matches the v1.1 UX-pitfalls finding on this exact failure mode). Grant `EXECUTE` to `anon` only, and note the RPC intentionally trusts its caller completely (no `auth.uid()` check inside it) — the security boundary is entirely the HMAC verification that happens before the RPC is ever called, so the route handler must never skip that check or short-circuit it in a dev/test branch.

### GDPR Cascade — Already Correct by Construction

Both new tables FK `user_id` directly to `auth.users(id) on delete cascade` (the same pattern `saved_bips` and `bip_edits.created_by` already use, and the same reasoning: `delete_my_account()`'s final step, `delete from auth.users where id = caller`, cascades through every table with this FK shape automatically). **No changes to the `delete_my_account()` RPC (migration `00013`) are required** — this is a direct consequence of following the established FK convention at table-creation time, not something that needs separate wiring. The only non-schema GDPR obligation is documentary: add a "Email alerts" data-surface paragraph to `/privacy` (the ongoing FOUN-10 obligation already flagged in `STATE.md`), covering what's stored (`subject_area`, `country`, `digest_freq`, `consent_text`, delivery history) and the unsubscribe mechanism.

### Email Template + `lib/email/send.ts` Integration

Add one new `EmailPayload` union member (`'bip-alert-digest'`) following the exact pattern the six existing templates already use (`ApprovalEmail`, `RejectionEmail`, `EditApprovalEmail`, etc. — each is a `React.createElement` branch plus a `resolveSubject` case). Two things this new template needs that none of the existing six do:

1. **A `List-Unsubscribe` header** (and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` for one-click compliance) passed through to `resend.emails.send({..., headers: {...}})` — `sendEmail()`'s current signature has no `headers` param; it needs one, defaulting to none for the existing five transactional templates (which are correctly exempt — GDPR treats them as legitimate-interest transactional mail, not marketing).
2. **A list-of-BIPs body**, not a single-BIP body — every existing template renders one BIP/one outcome; the digest renders N matched BIPs grouped by the subscription(s) that matched them, each with its own unsubscribe-this-subscription link (in addition to the header-level one-click link, which should unsubscribe the *specific* subscription that produced that item, not all of a user's subscriptions at once — a user may have several).

### New vs Modified — Alert Pipeline

| Component | New or Modified | Notes |
|---|---|---|
| `bip_subscriptions` table + RLS + indexes | NEW | `auth.users` FK cascade; own-only CRUD; USING+WITH CHECK on UPDATE |
| `bip_alert_deliveries` table + RLS + indexes | NEW | Idempotency source of truth; select-own only; service-role writes (no policy needed for that) |
| `unsubscribe_bip_subscription()` RPC | NEW | `SECURITY DEFINER`; `EXECUTE` granted to `anon` only; trusts caller (HMAC checked before call) |
| `app/api/unsubscribe/route.ts` | NEW | Public, unauthenticated, HMAC-verified |
| `supabase/functions/send-bip-alerts/index.ts` | NEW | Matcher + chunked Resend sender; service-role client (Edge Function context, not `app/(admin)/`) |
| pg_cron schedules (`bip-alert-digest-daily`, `bip-alert-digest-weekly`) | NEW | Two jobs, same function, `digest_freq` body param |
| `lib/email/send.ts` (`EmailPayload`, `sendEmail` headers param) | MODIFIED | New `'bip-alert-digest'` variant; adds optional `headers` passthrough |
| `lib/email/templates/BipAlertDigestEmail.tsx` | NEW | Multi-BIP body; per-item + header-level unsubscribe links |
| `components/student/SubscriptionManager.tsx` | NEW | Student-dashboard CRUD UI for subscriptions (≤5 cap enforced in Server Action + UI, per prior research's open-question resolution) |
| `lib/actions/subscriptions.ts` | NEW | `createSubscriptionAction`, `updateSubscriptionAction`, `deleteSubscriptionAction` — server-composed `consent_text`, never client-supplied |
| `approveBipAction` / `approveEditAction` (`admin-bips.ts`, `admin-edit-bips.ts`) | **UNCHANGED** | The anti-join design means the alert-eligibility "hook" is implicit in `status = 'approved'` — no code changes to either action |
| `delete_my_account()` RPC (00013) | **UNCHANGED** | FK-cascade-driven; correct by construction per the established pattern |
| `/privacy` page | MODIFIED | New "Email alerts" data-surface section |

---

## System Overview (v1.2 Integration)

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         VERCEL EDGE / CDN                                  │
│  Static assets, ISR-cached /bip/[slug] (revalidate=3600, unchanged)        │
├───────────────────────────────────────────────────────────────────────────┤
│                       NEXT.JS 15 APP ROUTER                                 │
│                                                                             │
│  ┌───────────────┐  ┌──────────────┐  ┌───────────┐  ┌───────────┐        │
│  │  (public)     │  │  (student)   │  │(dashboard)│  │  (admin)  │        │
│  │ /bip/[slug]   │  │ subscription │  │ wizard    │  │ review    │        │
│  │ +5 completed  │  │ manager NEW  │  │ steps 2/3 │  │ + diff    │        │
│  │ fields (W2)   │  │              │  │ +4 fields │  │ +4 fields │        │
│  └───────┬───────┘  └──────┬───────┘  └─────┬─────┘  └─────┬─────┘        │
│          │                 │                 │              │             │
│  ┌───────┴─────────────────┴─────────────────┴──────────────┴──────────┐  │
│  │  app/api/unsubscribe/route.ts  NEW — public, HMAC-verified, no auth │  │
│  └───────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────┐   │
│  │  Server Actions (lib/actions/)                                     │   │
│  │  MODIFIED: submitBipAction, adminUpdateBipAction, bip-edits.ts,     │   │
│  │            admin-edit-bips.ts (all: +4 fields, W1)                 │   │
│  │  NEW: subscriptions.ts (create/update/delete)                      │   │
│  │  UNCHANGED: approveBipAction, approveEditAction (W3 hook is        │   │
│  │             implicit — status='approved' is already their output) │   │
│  └───────────────────────────────────────────────────────────────────┘   │
├───────────────────────────────────────────────────────────────────────────┤
│                          SUPABASE                                          │
│  ┌───────────────────────────────────────────────────────────────────┐    │
│  │  Postgres                                                         │    │
│  │  MODIFIED: bip_edits (+4 cols, W1)                                │    │
│  │  NEW: bip_subscriptions, bip_alert_deliveries (W3)                │    │
│  │  NEW: unsubscribe_bip_subscription() SECURITY DEFINER RPC         │    │
│  │  UNCHANGED: bips, delete_my_account(), all approve/reject RLS     │    │
│  └───────────────────────────────────────────────────────────────────┘    │
│  ┌───────────────────────────────────────────────────────────────────┐    │
│  │  pg_cron: bip-alert-digest-daily (daily) + -weekly (Mondays)      │    │
│  │  → pg_net HTTP POST → Edge Function                               │    │
│  └───────────────────────────────────────────────────────────────────┘    │
│  ┌───────────────────────────────────────────────────────────────────┐    │
│  │  Edge Functions: send-bip-alerts NEW — anti-join matcher +        │    │
│  │  chunked Resend sender + delivery-row writer (service-role)       │    │
│  └───────────────────────────────────────────────────────────────────┘    │
├───────────────────────────────────────────────────────────────────────────┤
│                       EXTERNAL SERVICES                                    │
│  Resend — EXISTING 6 templates unchanged; NEW BipAlertDigestEmail with    │
│           List-Unsubscribe header (new sendEmail() headers param)         │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Anti-Patterns to Avoid

### Anti-Pattern: Reintroducing the Queue+Trigger Design for Alerts

The v1.1-era `ARCHITECTURE.md` draft proposed a `bip_alert_queue` table populated by a trigger on `bips.status → 'approved'`. This is unnecessary complexity now that the anti-join-against-`bip_alert_deliveries` design is available: it adds a table, a trigger, and a write on the hot admin-approve path for no correctness benefit at this project's scale. Do not resurrect it for v1.2.

### Anti-Pattern: Writing the Delivery Row Before Confirming Send Success

If `bip_alert_deliveries` is written *before* the Resend call (to "claim" the send early against concurrent cron fires), a failed send permanently marks that (bip, user) pair as delivered — the user never receives the email and there is no retry path short of a manual DB fix. Always write on confirmed success; let the `unique` constraint (not pre-emptive locking) handle the rare double-invocation race.

### Anti-Pattern: Adding a New `bips` Field to Only Some of the Seven Layers

Demonstrated by the four already-orphaned columns this milestone exists to fix. Any future field addition should be checked against all seven layers enumerated in Workstream 1 as a matter of process, not architecture — but it is worth stating here because it is the direct cause of the work this milestone must do.

### Anti-Pattern: Using `createAdminClient` in the Unsubscribe Route or the Digest Cron Path

Both need privileged writes without a coordinator/admin session. The correct answer in both cases is a narrowly-scoped `SECURITY DEFINER` Postgres function (unsubscribe) or a Supabase Edge Function with its own service-role client (digest) — never importing `lib/supabase/admin.ts` from inside `app/api/` or any non-`(admin)` route.

### Anti-Pattern: Trusting Client-Supplied `consent_text`

GDPR Article 7's audit-trail value comes from the *server* recording what the user actually consented to, derived from validated `subject_area`/`country`/`digest_freq` inputs — not from a free-text field the client could tamper with. Compose `consent_text` inside `createSubscriptionAction` from the validated Zod-parsed values, never accept it as a request parameter.

---

## Build Order (Dependency-Ordered)

```
Workstream 1: Complete the BIP Builder Model
  - Migration 00022 (bip_edits: +4 columns)
  - lib/schemas/bip-wizard.ts (step2Schema + fullBipSchema: +4 fields)
  - lib/store/bip-draft.ts (BipDraftData: +4 fields)
  - WizardStep2ProgramDetails.tsx / WizardStep3Partners.tsx UI
  - lib/actions/bip-submit.ts, admin-bips.ts, bip-edits.ts, admin-edit-bips.ts
    (submitSchema/updatePayload/buildContentPayload/buildMergePayload/
     EDIT_CONTENT_SELECT/RawEditRow — 4 fields x 4 call sites)
  - components/admin/BipEditDiffView.tsx (+4 FieldDef rows)
  - lib/queries/bipDetail.ts (BipDetail + both .select() strings: +5 fields
    incl. max_participants)

Workstream 2: BIP Detail Page (STRICT DEPENDENCY on Workstream 1)
  - Cannot finalize layout until Workstream 1's field set is locked in
    BipDetail — this is a hard sequencing dependency, not just a suggestion
  - components/bip/BipBody.tsx / BipSidebar.tsx / BipHeader.tsx — render the
    5 newly-wired fields
  - No ISR/data-flow changes — revalidate=3600 + dynamicParams=true +
    generateStaticParams unchanged; revalidatePath calls in approveBipAction/
    approveEditAction already correct

Workstream 3: Alert Subscriptions + Email Pipeline (INDEPENDENT — no
  technical dependency on Workstreams 1-2; can be built in parallel or
  sequenced last per the product narrative in PROJECT.md)
  - Migration 00023: bip_subscriptions table + RLS + indexes
  - Migration 00024: bip_alert_deliveries table + RLS + indexes +
    unsubscribe_bip_subscription() SECURITY DEFINER RPC
  - lib/actions/subscriptions.ts (create/update/delete, server-composed
    consent_text)
  - components/student/SubscriptionManager.tsx
  - app/api/unsubscribe/route.ts (HMAC verify + RPC call via anon client)
  - lib/email/send.ts (headers param; 'bip-alert-digest' EmailPayload variant)
  - lib/email/templates/BipAlertDigestEmail.tsx
  - supabase/functions/send-bip-alerts/index.ts (anti-join matcher +
    chunked Resend sender + delivery writer)
  - pg_cron schedules (daily + weekly), pg_net enablement check in
    supabase/config.toml (confirm before first local end-to-end test —
    local pg_cron cannot reach a public URL; use `supabase functions serve`)
  - /privacy update (new "Email alerts" data-surface section)
  - approveBipAction / approveEditAction: NO CHANGES — verify this
    explicitly as a plan acceptance criterion (the temptation to "wire in"
    an alert hook here should be resisted; it is intentionally implicit)
```

Recommended phase sequencing for the roadmap: **Workstream 1 → Workstream 2** as one phase pair (hard dependency), with **Workstream 3** as a separate phase that can be planned and executed independently — before, after, or interleaved, since it shares no files, tables, or Server Actions with Workstreams 1-2 except the read-only observation that `approveBipAction`/`approveEditAction` already produce the state the digest query depends on.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---|---|---|
| Resend (existing) | `lib/email/send.ts` gains a `headers` param + `'bip-alert-digest'` template | Existing 6 templates unaffected; digest is the first template needing `List-Unsubscribe` |
| Supabase pg_cron | Two SQL schedules (`daily`, `weekly`), same target Edge Function, `digest_freq` body param | Free tier; already the locked v1.1-research decision, re-confirmed here |
| Supabase Edge Functions | `supabase/functions/send-bip-alerts/index.ts` | Deno runtime; 150s timeout; correct home for the service-role client in this workstream |
| Supabase `pg_net` | HTTP bridge from `pg_cron` to the Edge Function | Confirm enabled in `supabase/config.toml` before Phase planning locks scope — not currently present in the repo's config, must be added |

### Internal Boundaries

| Boundary | Communication | Notes |
|---|---|---|
| `approveBipAction`/`approveEditAction` → alert eligibility | **Implicit** (shared read of `bips.status`) | No function call, no trigger, no queue write — deliberately decoupled |
| Digest Edge Function → Postgres | Service-role `createClient`, direct table reads/writes | Bypasses RLS by design (trusted, non-client-reachable context) |
| Digest Edge Function → Resend | Direct SDK call, chunked + rate-limited | Not the existing fire-and-forget `sendEmail()` loop pattern — needs its own chunking wrapper |
| Unsubscribe route → `bip_subscriptions` | Anon-key client + `SECURITY DEFINER` RPC | HMAC check happens in the route handler, never inside the RPC |
| Wizard/edit/admin-edit Server Actions → `bips`/`bip_edits` | Direct Supabase calls (unchanged pattern) | Only the *field list* grows; the auth/validation/audit-log sequence is untouched |
| `BipDetail` query → detail page rendering | Existing `getBipBySlug`/`getBipById` | Only the `.select()` string and TS type grow |

---

## Sources

- Live migrations `00001`-`00021` (full read) — `bips`/`bip_edits`/`saved_bips` schema, RLS policy shapes, `delete_my_account()` RPC, the `00021` default-privileges grant that makes redundant deny-all policies unnecessary
- Live `lib/actions/admin-bips.ts`, `bip-edits.ts`, `admin-edit-bips.ts`, `bip-submit.ts`, `saved-bips.ts` — current approve/reject/edit/merge/save Server Action patterns
- Live `lib/schemas/bip-wizard.ts`, `lib/store/bip-draft.ts`, `components/admin/BipEditDiffView.tsx`, `lib/queries/bipDetail.ts` — confirmed the exact four orphaned columns and the one under-exposed field (`max_participants`)
- `.planning/milestones/v1.1-research/ARCHITECTURE.md`, `PITFALLS.md`, `SUMMARY.md` — prior, already-vetted alert-pipeline and edit-flow research; this document adopts and simplifies the alert design, and confirms the `bip_edits` shadow-table decision from that cycle is unaffected by v1.2
- `CLAUDE.md` — `createAdminClient` confinement, RLS never-do items, locked stack decisions
- `.planning/PROJECT.md`, `.planning/STATE.md` — v1.2 scope framing, confirmation that Phase 7 (alerts) was fully deferred with zero migrations written
- Supabase Cron — [Schedule Recurring Jobs](https://supabase.com/docs/guides/cron)
- Supabase Edge Functions — [Limits](https://supabase.com/docs/guides/functions/limits) (150s timeout vs Vercel Hobby's 10s)
- Resend — [Rate Limits](https://resend.com/docs/api-reference/rate-limit) (5 req/sec/team); [Gmail/Yahoo 2024 bulk sender requirements](https://resend.com/blog/gmail-and-yahoo-bulk-sending-requirements-for-2024) (List-Unsubscribe header)

---
*Architecture research for: BipHub v1.2 — completing the coordinator BIP builder, the BIP detail page, and the carried-forward alert subscription + email pipeline*
*Researched: 2026-07-18*
