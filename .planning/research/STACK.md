# Stack Research

**Domain:** BipHub v1.2 — Coordinator BIP Builder completion, BIP detail-page redesign, Alert Subscriptions + Email Pipeline (carried from v1.1 Phase 7)
**Researched:** 2026-07-18
**Confidence:** HIGH (Supabase Cron / Vercel Cron / Resend facts verified against 2026 official docs and changelogs; builder/detail-page findings verified against live wizard code)

> **Scope note:** This document covers ONLY stack additions/changes for v1.2. The locked v1.0/v1.1 stack (Next.js 15.5.x LTS, Supabase Auth + RLS, Tailwind v4 + shadcn/ui on @base-ui/react, Zod v3 + RHF, `motion`, Resend transactional email, Server Actions, `getClaims()`, native Postgres FTS) is not re-litigated. See `.planning/milestones/v1.1-research/STACK.md` for that rationale and `CLAUDE.md` for the never-do list.

---

## Headline Answer

**The scheduling question is resolved: Supabase Cron (`pg_cron`) → Supabase Edge Function → Resend, not Vercel Cron.** This was already the correct call in the v1.1 research (2026-06-14) and 2026-07-18 verification confirms it is now an *easier* call than before: as of 2026, every Supabase project — free, pro, team — ships with `pg_cron` enabled by default (no extension-enable step required on hosted projects; local dev via `supabase start` still bundles it). Vercel Cron on Hobby remains capped at once-per-day with ±59-minute precision, which cannot express a same-day daily+weekly hybrid digest without living entirely inside a Next.js Route Handler that then has to reach back into Supabase anyway — architecturally worse, not simpler.

**No new npm packages are required for the alert pipeline.** HMAC signing uses Node's built-in `node:crypto`. Digest batching uses the `resend` SDK already installed (`^6.12.3`). The one genuinely new artifact is a Supabase Edge Function (Deno), which is a new *deploy surface* inside the existing Supabase project, not a new *service*.

**The builder and detail-page work need almost no new stack.** The wizard already uses typed, separate long-form fields (`description`, `learning_outcomes`, `virtual_component_description`, `eligibility_notes`, `accommodation_notes`) with plain `Textarea` + RHF + Zod v3 — this is the correct "structured content" pattern for BipHub and should be extended, not replaced with a rich-text editor. Partner management (Step 3) already supports registered + free-text partners. No media/upload library is needed — v1.0's no-photo-uploads decision should be respected in v1.2 (see below).

---

## Recommended Stack

### Core Technologies (net new for v1.2)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `pg_cron` | built-in Postgres extension, enabled by default on all Supabase tiers as of 2026 | Schedules the daily digest job | Zero setup on hosted Supabase (confirmed 2026: free/pro/team all ship it pre-enabled); `supabase start` bundles it locally; max 8 concurrent jobs / 10 min per job is far beyond BipHub's digest workload |
| `pg_net` | built-in Supabase Postgres extension, must be explicitly enabled | Fires the HTTP POST from `pg_cron` to the Edge Function | Required companion — `pg_cron` itself cannot make HTTP calls; enable via `CREATE EXTENSION IF NOT EXISTS pg_net;` in a migration and `[db.extensions] pg_net = true` in `supabase/config.toml` for local parity |
| Supabase Edge Functions (Deno 2) | built-in, matches `edge_runtime.deno_version = 2` already set in `supabase/config.toml` | Runs the digest-matching + Resend-send logic on a schedule, using the service-role key | Correct home for a background job that must bypass RLS to read all subscriptions and `auth.users` emails — this must never happen inside the Next.js app (CLAUDE.md: `createAdminClient` confined to `app/(admin)/`); an Edge Function is a separate, non-user-triggered execution context, so the service-role key never touches request-scoped code |
| `node:crypto` (Node built-in, no install) | Node 20+ (bundled with Next.js 15.5 runtime) | HMAC-SHA256 signing of unsubscribe tokens | Zero new dependency; `crypto.createHmac('sha256', secret).update(payload).digest('base64url')` plus `crypto.timingSafeEqual` for constant-time comparison is the whole implementation — no need for `jose` or a JWT library for a single-purpose, short-lived, non-refreshable token |
| Supabase Vault (Dashboard feature, no install) | built-in | Stores `SUPABASE_ANON_KEY` / project URL used inside the `pg_net.http_post` call so secrets never live in migration SQL | Already the correct pattern per v1.1 research; unchanged in 2026 |

### Supporting Libraries (already installed — reused, not new)

| Library | Version (from `package.json`) | Purpose | Notes |
|---------|-------------------------------|---------|-------|
| `resend` | `^6.12.3` | `resend.batch.send([...])` for the digest; per-item `headers` for `List-Unsubscribe` / `List-Unsubscribe-Post` | Confirmed (2026 docs): batch endpoint accepts up to 100 emails/call, each with its own `headers` object — exactly what per-subscriber signed unsubscribe links need. Default account rate limit is 2 requests/second; a sequential loop with a small delay between batch calls is sufficient at BipHub's scale — do not add a queueing library for this |
| `@react-email/components` | `^1.0.12` (via `react-email` ^6.1.1) | New `AlertDigest.tsx` template, rendered with `render()` exactly as `lib/email/send.ts` already does for the 6 existing templates | Reuse the existing `lib/email/send.ts` pattern (subject resolution switch, dev-mode console fallback) as far as possible; the Edge Function needs its own thin Deno-side render call (see Integration Points) since `lib/email/send.ts` is a Next.js-only server module and cannot be imported into Deno |
| `@supabase/supabase-js` | `^2.105.4` in the Next.js app; `jsr:@supabase/supabase-js@2` inside the Edge Function | Service-role client inside the Edge Function to read `bip_subscriptions` + `auth.users` bypassing RLS | Standard Deno import path for Supabase-authored Edge Functions; no version pin conflict with the Next.js app's `^2.105.4` since they run in separate runtimes |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `supabase functions serve --env-file .env.local` | Local Edge Function dev | Local `pg_cron` cannot reach a public URL, so end-to-end digest testing locally means invoking the function manually (`curl` or Supabase Studio) rather than waiting for the schedule — document this in the phase plan so it isn't mistaken for a bug |
| `npx supabase functions new send-bip-alerts` | Scaffolds the Edge Function directory | One-time, run when the phase starts |

---

## Part A: Scheduling Mechanism — pg_cron vs Vercel Cron (resolved)

| Criterion | Supabase Cron (`pg_cron`) | Vercel Cron |
|---|---|---|
| Setup cost (2026) | Zero — pre-enabled on every plan tier, hosted and local | Zero to configure `vercel.json`, but... |
| Frequency on the plan BipHub is on (Hobby/Free-tier posture) | Any cron expression; `pg_cron`'s own limit is 8 concurrent jobs / 10 min each | **Hard-capped at once per day** on Hobby; sub-daily requires Pro ($20/mo, confirmed still true 2026) |
| Timing precision | Exact, to the second (Postgres scheduler) | Hobby jobs may fire **anywhere within the target hour** (±59 min) — unacceptable for "digest sent at a predictable time" UX expectations, and irrelevant-but-real if a "sent Tuesdays" weekly cadence is ever wanted |
| Where the logic lives | Inside the Supabase project (Edge Function) — reads/writes Postgres directly, no network hop to a second platform | Inside a Next.js Route Handler — requires a public GET endpoint that then calls back into Supabase; adds a hop and, for local testing, requires an ngrok/localtunnel-style public URL, which the project's one-command local dev goal (`supabase start && npm run dev`) does not support |
| Second deploy target? | No — stays inside the existing `supabase/functions/` directory, deployed with the same `supabase functions deploy` step | No new deploy target either, technically, since it's still Vercel — but it *does* require a `CRON_SECRET` header check in the Route Handler and correctly excluding that route from any auth middleware, which is an easy place to introduce a public-write bug |
| Portability | If BipHub ever changes hosts, cron logic ships with the Supabase project, unaffected | Cron logic is Vercel-specific; a host migration means rewriting the trigger mechanism |
| 2026 confirmation | GA, all tiers, per [Supabase Cron docs](https://supabase.com/docs/guides/cron) and [Supabase Cron module page](https://supabase.com/modules/cron) | Hobby once-daily limit and ±59-min imprecision confirmed current via [Vercel Cron Jobs docs](https://vercel.com/docs/cron-jobs) (2026); the Jan-2026 change raised the *job count* cap to 100/project on every plan, but did **not** change the once-daily frequency cap on Hobby |

**Decision: `pg_cron` → `pg_net` → Supabase Edge Function → Resend.** Nothing in the 2026 verification changes the v1.1 research's conclusion; if anything it strengthens it, since `pg_cron` no longer needs even the tier check that v1.1 research implicitly assumed.

**Rejected alternatives (unchanged from v1.1 research, still correct):**

| Mechanism | Why still rejected |
|---|---|
| Vercel Cron (Pro, $20/mo) | Buys sub-daily/precise scheduling BipHub doesn't need — the daily-cron-with-frequency-filter pattern below covers daily *and* weekly cadences from a single schedule |
| Supabase Database Webhooks | Event-triggered (row INSERT/UPDATE), not time-triggered; wrong tool for "send at 07:00 UTC" |
| Supabase Queues (`pgmq`) | Durable retry/fan-out queue — correct for future "instant alert the moment a BIP is approved," not for a batch digest that runs once a day |
| `n8n` / external cron (`cron-job.org`, GitHub Actions) | PROJECT.md Out-of-Scope: `n8n` explicitly excluded until integration count ≥ 3 (still 1: Resend). GitHub Actions is CI infra, not production scheduling with an SLA. Any third-party cron pinger is a dependency outside the controlled stack for no benefit over the already-free `pg_cron` |

### Integration Points

**1. Enable `pg_net` (migration):**

```sql
-- supabase/migrations/000XX_alert_pipeline_extensions.sql
create extension if not exists pg_net;
```

Local dev: add to `supabase/config.toml`:

```toml
[db.extensions]
pg_net = true
```

(`pg_cron` needs no equivalent entry — it is pre-enabled.)

**2. Schedule the digest job (migration):**

```sql
select cron.schedule(
  'biphub-alert-digest',
  '0 7 * * *',  -- daily at 07:00 UTC; the Edge Function applies frequency filtering
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
            || '/functions/v1/send-bip-alerts',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'edge_function_secret')
    ),
    body := jsonb_build_object('triggered_at', now())
  ) as request_id;
  $$
);
```

Store `project_url` and a dedicated `edge_function_secret` (NOT the anon key — see below) in Supabase Vault via the Dashboard.

**Why not the anon key as the Authorization bearer:** the anon key is public (it ships in the client bundle already). Using it to authorize the cron→function call means anyone could invoke `send-bip-alerts` directly and trigger a spurious digest run. Generate a dedicated random secret, store it in Vault, and have the Edge Function's first line check `req.headers.get('Authorization') === \`Bearer ${Deno.env.get('CRON_SHARED_SECRET')}\``, returning 401 otherwise.

**3. Edge Function `supabase/functions/send-bip-alerts/index.ts` (Deno):**

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { Resend } from 'npm:resend'
import { render } from 'npm:@react-email/components'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // bypasses RLS — correct use, background job only
)
const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)

Deno.serve(async (req) => {
  if (req.headers.get('Authorization') !== `Bearer ${Deno.env.get('CRON_SHARED_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // 1. Find subscriptions due today (daily: always; weekly: last_sent_at < 7d ago or null)
  // 2. Per subscriber, find matching approved BIPs since last_sent_at, dedup across
  //    that subscriber's multiple subscriptions (one email per user, not per subscription)
  // 3. Reserve delivery rows BEFORE sending (idempotency — see Part B)
  // 4. resend.batch.send([...]) in chunks (Resend batch max 100/call; ~2 req/sec account limit)
  // 5. Mark delivery rows sent; update subscriptions.last_sent_at

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

---

## Part B: Idempotent Delivery Tracking — exactly once per (BIP, subscriber)

**Table:**

```sql
create table public.bip_alert_deliveries (
  id            uuid primary key default gen_random_uuid(),
  bip_id        uuid not null references public.bips(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  created_at    timestamptz not null default now(),
  sent_at       timestamptz,
  unique (bip_id, user_id)
);
alter table public.bip_alert_deliveries enable row level security;
-- No student-facing policy needed: only the service-role Edge Function reads/writes this table.
-- Do NOT grant anon/authenticated any access — RLS enabled with zero policies = fully locked.
```

**Reserve-then-send pattern** (this is the part that actually makes delivery idempotent — a `UNIQUE` constraint alone is not enough if you insert *after* sending):

```sql
-- Inside the Edge Function, per (bip, user) candidate pair:
insert into public.bip_alert_deliveries (bip_id, user_id, status)
values ($1, $2, 'pending')
on conflict (bip_id, user_id) do nothing
returning id;
-- If no row is returned, a delivery already exists (sent, or a previous/concurrent
-- cron run reserved it) — skip. Only send if a row WAS returned.
```

After the Resend call resolves, `update ... set status = 'sent', sent_at = now() where id = $reservation_id`. If the Resend call throws, either leave `status = 'pending'` for a bounded retry window on the *next* cron run (simplest, and safe — the `UNIQUE` constraint means a retry can only ever re-attempt rows still stuck at `pending`, never double-send a `sent` row) or set `status = 'failed'` and alert via logs. Given BipHub's launch scale, "leave pending, let the next daily run retry" is sufficient — no dead-letter queue needed (reinforces why `pgmq` is unneeded, per Part A).

This directly satisfies the milestone requirement: "digest emails delivered exactly once per (BIP, subscriber) pair."

---

## Part C: Signed Unsubscribe Tokens (no login required)

**Token construction — `node:crypto`, zero new dependency:**

```typescript
// lib/security/unsubscribe-token.ts (imported by both the Next.js app and,
// via a Deno-compatible copy or duplicated logic, the Edge Function —
// see note below on sharing the secret)
import { createHmac, timingSafeEqual } from 'node:crypto'

const SECRET = process.env.UNSUBSCRIBE_TOKEN_SECRET! // separate from Supabase/Resend keys

export function signUnsubscribeToken(subscriptionId: string): string {
  const payload = `${subscriptionId}`
  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url')
  return `${Buffer.from(payload).toString('base64url')}.${sig}`
}

export function verifyUnsubscribeToken(token: string): string | null {
  const [payloadB64, sig] = token.split('.')
  if (!payloadB64 || !sig) return null
  const payload = Buffer.from(payloadB64, 'base64url').toString('utf8')
  const expected = createHmac('sha256', SECRET).update(payload).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return payload // the subscription_id
}
```

**Why not a JWT library (`jose`, `jsonwebtoken`):** a JWT's value is standardized claims (`exp`, `iss`, `aud`) and multi-consumer verification. This token has exactly one consumer (BipHub's own unsubscribe endpoint) and one purpose (identify a subscription row). A raw HMAC is simpler, has zero dependency surface, and is trivially portable between the Next.js runtime and the Deno Edge Function runtime (both have `crypto.subtle` / `node:crypto`-compatible HMAC). Do not add `jose` for this.

**No expiry needed by design:** unlike a password-reset link, an unsubscribe link's value doesn't decay — it should keep working for the lifetime of the subscription so a digest email from three months ago still unsubscribes correctly. Do not add a TTL/expiry check here (that would be a UX bug: "this unsubscribe link has expired" is a real complaint pattern with other products). If the token needs to be invalidated, delete the underlying `bip_subscriptions` row — the token becomes meaningless once the row is gone (endpoint does a `select ... where id = $subscription_id`, not found = already unsubscribed, idempotent no-op with a 200).

**Endpoint — this is the one legitimate Route Handler in the app, not a Server Action:**

Server Actions require the Next.js action-invocation protocol (a POST with a special encoded header from React's client runtime) — mail clients and manually-clicked email links cannot trigger them. Two HTTP methods are required on the same public path, because 2026 Gmail/Yahoo bulk-sender rules (confirmed still in force) require **RFC 8058 one-click unsubscribe**, which mail clients satisfy by auto-POSTing `List-Unsubscribe-Post: List-Unsubscribe=One-Click` **without any user interaction** — this must not show a confirmation page, and must not require JavaScript:

```
app/api/unsubscribe/route.ts
  GET  ?token=...   → human clicked the link in the email body; verify token,
                       delete/deactivate the subscription, render a plain
                       confirmation (no JS required — this can be a redirect
                       to a static confirmation page)
  POST ?token=...    → RFC 8058 one-click target for automated mail-client
                       unsubscribe; verify token, delete/deactivate, return
                       200 with no body — must succeed with zero cookies/JS
```

Both handlers call the same underlying `unsubscribeBySubscriptionId()` helper (in `lib/actions/` or a shared `lib/subscriptions.ts`, not `'use server'` — plain utility, same pattern as `lib/email/send.ts`). This is a documented, narrow exception to the "Server Actions for all mutations" rule — the rule exists to keep coordinator/admin writes off unauthenticated API surfaces; a public, token-authenticated, single-purpose unsubscribe endpoint is a different threat model (equivalent to a password-reset link) and is the only way to satisfy RFC 8058.

**Email headers (Resend batch, per-recipient):**

```typescript
resend.batch.send(subscribers.map((s) => ({
  from: 'BipHub <noreply@biphub.eu>',
  to: s.email,
  subject: '...',
  html: renderedHtml,
  headers: {
    'List-Unsubscribe': `<${siteUrl}/api/unsubscribe?token=${signUnsubscribeToken(s.subscriptionId)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  },
})))
```

Confirmed (2026 Resend docs): the batch endpoint accepts a `headers` object per individual email in the batch array, not just at the top level — this is exactly what's needed since every recipient's unsubscribe token differs.

---

## Part D: Alert Subscription Data Model (extends, doesn't replace, v1.1 research design)

The v1.1 research already designed `bip_subscriptions` / `student_subscriptions` with `field_of_study`, `country`, `frequency`, `last_sent_at`. Two v1.2-specific additions the milestone context calls out:

- **`consent_text`** column on the subscription table, capturing the exact copy the student agreed to at signup time (GDPR record-of-consent, not just a boolean) — `text not null`, populated by the Server Action, not client-editable after creation.
- **Cap of 5 subscriptions per student** (v1.1 research's own open-question recommendation) — enforce in the `createSubscriptionAction` Server Action with a `count(*)` check before insert, not only via a `CHECK` constraint (Postgres can't easily count sibling rows in a `CHECK`); optionally back it with a `before insert` trigger for defense-in-depth against non-Server-Action writes (there shouldn't be any, given RLS, but the trigger is cheap insurance).

GDPR cascade discipline (unchanged, still non-negotiable per CLAUDE.md and PROJECT.md pattern): `bip_subscriptions` and `bip_alert_deliveries` both need `references auth.users(id) on delete cascade`, review in `delete_my_account()` (migration `00013`), and enumeration in `/privacy`.

---

## Part E: Coordinator BIP Builder Completion — mostly "no new stack"

Read `components/forms/BipSubmissionWizard.tsx` and its four step components. Findings:

- **Long-form/structured content is already correctly modeled** as separate typed `Textarea` fields (`description`, `learning_outcomes`, `virtual_component_description`, `eligibility_notes`, `accommodation_notes`), not a single blob. **Do not introduce a rich-text/WYSIWYG editor (Tiptap, Lexical, Quill) for v1.2.** Reasons: (1) it adds a new dependency plus a sanitization surface (any HTML-emitting editor requires `rehype-sanitize`/`DOMPurify`-equivalent on render or you have a stored-XSS hole on a public detail page); (2) BipHub's own design ethos is "cards everywhere, no tables," i.e. clean structured fields over free-form documents; (3) the existing multi-field structure is *more* useful for the detail-page redesign than a single rich blob would be, since each field can get its own card/section. If the product genuinely needs inline emphasis (bold/lists) inside `description`, the minimal safe addition — not required for v1.2, flag as a later "should have" — is a constrained Markdown subset rendered with `react-markdown` + `remark-gfm`, with `rehype-sanitize`'s default schema (allow-list, not deny-list). Do not add this speculatively; ship plain text with `white-space: pre-wrap` rendering first.
- **Media/photo uploads: respect the v1.0 decision** ("University photo uploads" is explicitly Out of Scope in `PROJECT.md` — gradient placeholders for v1). Flag for the requirements phase rather than silently deciding: if this milestone's scoping conversation decides to revisit it, the correct addition is **Supabase Storage** (already `enabled = true` in `supabase/config.toml`, zero new service) with a dedicated bucket + storage RLS policies, `next/image` `remotePatterns` config for the Supabase Storage domain, and a small client-side resize step before upload (e.g. `browser-image-compression`, ~15KB, if avoiding server-side image processing) — but this is **not** recommended stack work to start now; it directly contradicts a locked decision and should go back to the user, not be built speculatively.
- **Multi-partner management is already solid** (`WizardStep3Partners.tsx`): registered-university combobox + free-text fallback with an "(unverified)" suffix, dedup against the host university, dedup against already-added partners. No new library needed. If the builder-completion work wants partner reordering (drag handles), that's a `@dnd-kit/sortable`-sized addition (~11KB) — only add if the requirements phase actually specifies reordering matters; do not add speculatively.
- **Client validation**: continues to use RHF + Zod v3 (`@hookform/resolvers` `^3.10.0`) per step, exactly as today. "Completing" the builder is a matter of writing more Zod schemas/refinements for whatever new fields the requirements phase defines (e.g., cross-field refinements like Step 4's exactly-one-of-URL-or-contact pattern already demonstrates) — not a new validation library.
- **Draft persistence**: already implemented end-to-end (Zustand store + localStorage + debounced `saveDraftAction` with `updated_at` optimistic locking + the `TwoTabConflictDialog`). New fields just need to be added to `BipDraftData` (Zustand store type) and the corresponding step's Zod schema and DB migration column — no architectural change.

**Net new npm packages for the builder: none**, unless the requirements phase explicitly asks for photo uploads (reopening a locked decision) or partner drag-reordering (new UX requirement) — both flagged above as decisions to route back to the user, not stack additions to make unilaterally.

---

## Part F: BIP Detail Page Redesign — rendering only

- Mostly a Server Component rendering exercise against whatever the finalized builder's field set is. **No new stack** for the "render structured content" half — the existing per-field textarea data maps naturally to per-field cards/sections (reinforcing the recommendation in Part E to keep fields separate rather than collapsing into one rich-text blob).
- **JSON-LD / structured data for SEO is explicitly deferred** per `PROJECT.md`: *"Deferred to a later milestone: Public read API + JSON-LD/SEO ('data layer for devs') — postponed until the product has a real audience worth serving via API."* This directly contradicts the v1.1 research's earlier P1 suggestion to bundle JSON-LD with an S-complexity phase — that recommendation has since been superseded by the PROJECT.md scoping decision made at v1.1 close. **Do not add JSON-LD/schema.org markup in v1.2** unless the user explicitly reopens that scope decision; note the conflict for the requirements author.
- If the detail page needs richer meta/OG tag updates to reflect new builder fields (e.g., a different summary line in the OG image), that reuses the existing `opengraph-image.tsx` dynamic route from v1.0 Phase 1 — no new library.

---

## Installation

```bash
# No new npm installs required for v1.2's alert pipeline, builder, or detail page.

# New Edge Function scaffold:
npx supabase functions new send-bip-alerts

# New migrations (illustrative — exact numbering follows current head, 00021_public_table_grants.sql):
npx supabase migration new alert_pipeline_extensions   # pg_net + cron.schedule
npx supabase migration new bip_subscriptions            # table + RLS + consent_text
npx supabase migration new bip_alert_deliveries          # idempotency table + RLS (locked, no policies)

# Only if the requirements phase reopens the no-photo-uploads decision:
# npm install browser-image-compression
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| `pg_cron` → Edge Function → Resend | Vercel Cron (Pro, $20/mo) | Only if BipHub later needs sub-minute or highly precise multi-schedule cron across many unrelated jobs where staying inside Postgres becomes awkward — not the case here |
| Single daily `pg_cron` job with frequency-aware filtering in the Edge Function | Two separate schedules (one daily, one weekly) | Only if daily and weekly digests ever need materially different matching logic, not just a different `last_sent_at` cutoff — adds operational overhead for no current benefit |
| `node:crypto` HMAC for unsubscribe tokens | `jose` (signed JWT) | Only if the token needs to carry multiple claims consumed by more than one service, or needs a standard expiry/refresh model — not the case for a single-purpose unsubscribe link |
| Reserve-then-send idempotency (`INSERT ... ON CONFLICT DO NOTHING RETURNING id`, send only if a row comes back) | `pgmq` durable queue with retries/dead-letter | Only if BipHub adds instant (non-digest) per-event alerting later — a "the moment a BIP is approved" push notification is a genuinely different, event-triggered problem that pg_cron cannot solve |
| Plain typed `Textarea` fields for long-form content | `react-markdown` + `remark-gfm` + `rehype-sanitize` constrained Markdown | Only if the requirements phase confirms coordinators need inline formatting (bold/lists) inside a field — ship plain text first, add Markdown only on demonstrated need |
| No media/upload library | Supabase Storage + `next/image` `remotePatterns` + `browser-image-compression` | Only if the user explicitly overturns the v1.0 no-photo-uploads decision during v1.2 requirements scoping |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Vercel Cron for the digest schedule | Hobby: once-per-day hard cap + ±59-min imprecision (confirmed current, 2026); Pro ($20/mo) buys nothing BipHub needs; requires a public Route Handler that breaks one-command local dev without a tunnel | `pg_cron` (pre-enabled on every Supabase tier in 2026) → `pg_net` → Edge Function |
| Supabase Queues (`pgmq`) for the digest | Built for per-event fan-out with retries/dead-letter; a once-daily batch digest has none of that complexity | `pg_cron` schedule + reserve-then-send idempotency pattern (Part B) |
| `n8n` or any external cron/workflow platform | PROJECT.md: explicitly excluded until integration count ≥ 3 (still 1: Resend); adds a second deploy target; breaks one-command local dev | Supabase Cron + Edge Function |
| Anon key as the `pg_net → Edge Function` bearer token | Anon key is public (ships in the client bundle) — using it to authorize the cron call lets anyone trigger a digest run by hitting the function URL directly | A dedicated random shared secret stored in Supabase Vault, checked inside the Edge Function |
| JWT library (`jose`, `jsonwebtoken`) for the unsubscribe token | Unnecessary complexity/dependency for a single-consumer, non-expiring, single-claim token | `node:crypto` HMAC (`createHmac` + `timingSafeEqual`) |
| A Server Action for the unsubscribe endpoint | Server Actions cannot be invoked by a mail client's automated POST (RFC 8058 one-click) or a plain clicked link without the Next.js action-invocation protocol | A narrowly-scoped public Route Handler (`app/api/unsubscribe/route.ts`) with GET + POST, token-authenticated — the one documented exception to the "Server Actions for all mutations" rule |
| Expiring the unsubscribe token (TTL/`exp` claim) | A "this unsubscribe link has expired" failure mode is a real user complaint pattern and defeats the purpose of a permanent opt-out mechanism | No expiry — token validity is tied to the underlying subscription row existing; deleting the row is the invalidation mechanism |
| Rich-text/WYSIWYG editor (Tiptap, Lexical, Quill, Slate) for BIP description fields | New dependency + a stored-XSS sanitization surface on a public page; contradicts BipHub's existing clean, structured multi-field content model which the detail-page redesign should lean into, not abandon | Keep separate typed `Textarea` fields; render with `white-space: pre-wrap`; add constrained sanitized Markdown only if the requirements phase demonstrates a real need |
| Adding photo/media upload speculatively | Directly contradicts the locked v1.0 "no university photo uploads" decision in `PROJECT.md` Out of Scope | If reopened by the user: Supabase Storage (already enabled) + RLS + `next/image` remote patterns — but only after an explicit scope decision, not unilaterally in this research |
| JSON-LD / schema.org structured data in v1.2 | `PROJECT.md` explicitly defers "Public read API + JSON-LD/SEO" to a later milestone — this supersedes the earlier v1.1-research suggestion to bundle it here | Leave for the deferred milestone; flag the superseded recommendation for the requirements author |
| A second, JS-dependent confirmation page as the *only* unsubscribe path | Fails RFC 8058 one-click compliance (Gmail/Yahoo bulk-sender rules, confirmed still enforced 2026) which requires an automatable, no-interaction POST endpoint | Route Handler exposing both GET (human click → confirmation) and POST (automated one-click, 200 no-body) on the same signed-token path |

---

## Version Compatibility

| Package / Feature | Compatible With | Notes |
|--------------------|------------------|-------|
| `pg_cron` (all Supabase tiers, 2026 GA) | Postgres 17 (matches `db.major_version = 17` in `supabase/config.toml`) | No action needed to enable on hosted or local |
| `pg_net` | Requires explicit `CREATE EXTENSION` + local `[db.extensions] pg_net = true` | Not yet present in this repo's migrations or `config.toml` — first artifact of this milestone |
| Supabase Edge Functions (Deno 2) | `edge_runtime.deno_version = 2` already set in `supabase/config.toml` | No config change needed |
| `resend` `^6.12.3` | Batch endpoint + per-item `headers` (List-Unsubscribe / List-Unsubscribe-Post) | Already installed; confirmed current (2026) API supports both features without a version bump |
| `node:crypto` | Node 20+ runtime under Next.js 15.5.18 | No install; available in both the Next.js server runtime and (as `crypto.subtle`/Deno-compatible HMAC) inside the Edge Function if the token verification logic needs to run there too (e.g., if the Edge Function itself needs to validate anything token-signed — not currently required, since verification happens in the Next.js Route Handler) |
| React Hook Form `^7.75.0` + `@hookform/resolvers` `^3.10.0` + Zod `^3.25.76` | Unchanged; builder-completion schemas are additive | Zod v4 remains excluded per CLAUDE.md locked decision — no change here |

---

## Sources

- [Supabase Cron docs](https://supabase.com/docs/guides/cron) — job types, 8-concurrent/10-min limits (HIGH confidence)
- [Supabase Cron module page](https://supabase.com/modules/cron) — 2026 confirmation that `pg_cron` ships enabled on free/pro/team tiers (HIGH confidence)
- [Supabase Cron blog post](https://supabase.com/blog/supabase-cron) — release history (HIGH confidence)
- [Vercel Cron Jobs docs](https://vercel.com/docs/cron-jobs) and [Usage & Pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) — Hobby once-daily cap, ±59-min imprecision, UTC-only, confirmed current 2026 (HIGH confidence)
- [Vercel changelog — 100 cron jobs per project on every plan](https://vercel.com/changelog/cron-jobs-now-support-100-per-project-on-every-plan) — Jan 2026 change to job *count*, not frequency (HIGH confidence)
- [Resend Send Batch Emails API reference](https://resend.com/docs/api-reference/emails/send-batch-emails) — 100/call batch limit, per-item `headers` object confirmed via direct fetch (HIGH confidence)
- Resend rate-limit community/engineering write-ups (2 req/sec default account limit) — (MEDIUM confidence, cross-referenced against Resend's own batch-emails blog post: [Introducing the Batch Emails API](https://resend.com/blog/introducing-the-batch-emails-api))
- [List-Unsubscribe / RFC 8058 one-click reference (smtpedia)](https://smtpedia.com/list-unsubscribe-header/) — Gmail/Yahoo bulk-sender rule confirmation for 2026 (MEDIUM confidence, single source but consistent with well-established Feb 2024 Google/Yahoo bulk-sender requirements referenced across multiple independent sources)
- `.planning/milestones/v1.1-research/STACK.md` — prior pg_cron/Vercel Cron decision and rationale this document builds on and re-verifies (HIGH confidence, internal)
- Live repo inspection: `components/forms/BipSubmissionWizard.tsx`, `components/forms/steps/WizardStep3Partners.tsx`, `components/forms/steps/WizardStep4ApplicationInfo.tsx`, `lib/email/send.ts`, `supabase/migrations/00003_bips_full_schema.sql`, `supabase/config.toml`, `package.json` — confirms current field structure, no rich-text/media libraries present, no `pg_cron`/`pg_net` enabled yet, no `crypto`/HMAC pattern yet established (HIGH confidence, primary source)
- `.planning/PROJECT.md` — confirms locked no-photo-uploads decision and the JSON-LD/public-API deferral that supersedes v1.1 research's earlier suggestion (HIGH confidence, internal)

---

*Stack research for: BipHub v1.2 — Coordinator BIP Builder + BIP Detail Page + Alert Subscriptions/Email Pipeline (stack additions only)*
*Researched: 2026-07-18*
