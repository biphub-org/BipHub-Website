# Stack Research

**Domain:** BipHub v1.1 — Product Depth & Engagement (additions to existing Next.js 15 + Supabase app)
**Researched:** 2026-06-14
**Confidence:** HIGH (all decisions verified against Context7/official docs)

---

> **Scope note:** This document covers ONLY the stack additions and changes required for v1.1 features. The locked v1.0 stack (Next.js 15.5.x, Supabase, Tailwind v4, shadcn/ui, Resend, RHF + Zod v3, motion, etc.) is not re-litigated here. See `.planning/milestones/v1.0-research/STACK.md` for the full prior stack rationale.

---

## Decision Summary

Three questions drive v1.1 stack research. All are decided:

| Question | Decision |
|----------|----------|
| Second auth audience (students) | Same `auth.users` table, differentiated by `app_metadata.role`. Custom Access Token Hook injects `user_role` into JWT for RLS. No separate auth project. |
| Email alert scheduling mechanism | **Supabase Cron (pg_cron) → Supabase Edge Function → Resend**. Stays inside the existing Supabase project. Zero new deploy targets. |
| Saved-search/subscription persistence | New `student_subscriptions` table in Postgres. Standard Supabase RLS. No new service. |

---

## Part A: Second Auth Audience — Student Accounts

### Architecture Decision: Single `auth.users` Table, Role in `app_metadata`

Supabase Auth has one `auth.users` table per project. All authenticated users live there regardless of audience. The right way to differentiate coordinators from students is **`app_metadata.role`**, not a separate auth project.

**Why `app_metadata`, not `user_metadata`:**
- `user_metadata` is writable by the authenticated user via `supabase.auth.updateUser()`. An RLS policy using it would let any user self-promote their role — a critical security hole.
- `app_metadata` is writable only by the service-role key and auth hooks. It is safe to use in RLS policies via `auth.jwt() -> 'app_metadata' ->> 'role'`.
- This is the pattern Supabase's own RBAC guide recommends (verified via Context7 against `supabase/auth` source).

**Three-role enum:**

```sql
CREATE TYPE public.app_role AS ENUM ('student', 'coordinator', 'admin');
```

This extends the existing two-role model (coordinator + admin) that v1.0 already uses implicitly (admins set via Supabase service-role, coordinators via institutional email gate).

### How the Existing Coordinator Gate Is Preserved

v1.0 uses a Server Action that validates the signup email domain against a list of `.ac.*`, `.edu`, `.university` TLDs before calling `supabase.auth.admin.createUser()`. That gate remains intact — it is **not** in a Supabase auth hook, it is in application code.

For students, the Server Action takes a different code path: no domain check, call `supabase.auth.signUp()` directly (standard email+password), then set `app_metadata.role = 'student'` via `supabase.auth.admin.updateUser()` immediately after creation.

This avoids any risk of the `before-user-created` hook accidentally blocking student signups while also blocking non-institutional coordinator signups. The gate stays in application logic where it is readable and testable.

### Custom Access Token Hook (new migration required)

To make the `user_role` claim appear in every JWT (so RLS policies can use it cheaply without a subquery):

```sql
-- supabase/migrations/XXXXXX_add_custom_access_token_hook.sql

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role    public.app_role NOT NULL DEFAULT 'student'
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Only auth admin can read this table (hook runs as auth admin)
CREATE POLICY "auth_admin_read" ON public.user_roles
  AS PERMISSIVE FOR SELECT
  TO supabase_auth_admin
  USING (true);

REVOKE ALL ON public.user_roles FROM authenticated, anon;
GRANT ALL ON public.user_roles TO supabase_auth_admin;

-- Hook function
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims   jsonb;
  user_role public.app_role;
BEGIN
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = (event->>'user_id')::uuid;

  claims := event->'claims';

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  ELSE
    claims := jsonb_set(claims, '{user_role}', '"student"'); -- default
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
```

Register in Supabase Dashboard: Authentication → Hooks → Custom Access Token → point to `public.custom_access_token_hook`.

### RLS Pattern for Student-Only vs Coordinator-Only Resources

```sql
-- Student can read/write their own saved BIPs
CREATE POLICY "student_own_bookmarks"
  ON public.student_bookmarks
  FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid()
    AND (auth.jwt() ->> 'user_role') = 'student'
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (auth.jwt() ->> 'user_role') = 'student'
  );

-- Coordinator gate unchanged: coordinator can write their own BIPs
-- (existing policy already checks created_by = auth.uid(); no change needed
--  but can optionally add: AND (auth.jwt() ->> 'user_role') = 'coordinator')
```

### getClaims() Compatibility

The existing `getClaims()` server-side helper already reads the JWT. After the hook is registered, `user_role` appears as a top-level claim on every token. Server Actions and RSC can read it with:

```typescript
const claims = await getClaims()
const role = claims?.user_role as 'student' | 'coordinator' | 'admin' | undefined
```

No new libraries needed. No changes to `@supabase/ssr` client factories.

### New Tables for Student Features

```sql
-- Saved BIPs (replaces localStorage; syncs across devices)
CREATE TABLE public.student_bookmarks (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bip_id     uuid NOT NULL REFERENCES public.bips(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, bip_id)
);
ALTER TABLE public.student_bookmarks ENABLE ROW LEVEL SECURITY;

-- Saved searches / alert subscriptions
CREATE TABLE public.student_subscriptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Nullable filters; null = "any"
  field_of_study text,        -- matches bips.field_of_study
  country        text,        -- ISO 3166-1 alpha-2
  -- Digest control
  frequency      text NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly')),
  last_sent_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.student_subscriptions ENABLE ROW LEVEL SECURITY;
```

Both tables need the standard student-only RLS policies (user_id = auth.uid() AND user_role = 'student').

---

## Part B: Email Alert Scheduling

### Decision: Supabase Cron (pg_cron) → Supabase Edge Function → Resend

**Chosen mechanism:** `pg_cron` schedules a daily/weekly job that calls `net.http_post()` targeting a Supabase Edge Function. The Edge Function queries `student_subscriptions`, finds matching new BIPs, batches per-subscriber, and sends via Resend.

**Why not Vercel Cron:**
- Vercel Cron on the Hobby plan is limited to **once per day, with hourly precision (±59 min)**. A daily digest is achievable, but weekly or "send at 08:00 UTC Tuesday" is not reliably schedulable. Pro plan ($20/mo) is required for sub-daily frequency.
- Vercel Cron invokes a **Next.js Route Handler** (a GET endpoint) — this means the scheduling logic lives in the Next.js app. The handler must then connect to Supabase to find subscribers and call Resend. It works, but adds a network hop and means local dev requires a public tunnel (ngrok/localtunnel) to test cron endpoints, which breaks the one-command local dev goal.
- If BipHub ever moves off Vercel, all scheduling would need rework. Keeping scheduling in Supabase is more portable.

**Why not Supabase Database Webhooks + Edge Function (event-driven):**
- Database Webhooks fire on row INSERT/UPDATE/DELETE. They are the right tool for "notify on a specific DB event" (e.g., revalidating the cache when a BIP is approved — already used in v1.0). They are not the right tool for "send a weekly digest." A digest is time-triggered, not event-triggered.

**Why not Supabase Queues (pgmq):**
- pgmq is a durable message queue for async job processing (e.g., fan-out, retry logic, producer/consumer). It is appropriate when you need guaranteed per-message delivery with retries and dead-letter queues. A digest email that runs once daily or weekly has none of that complexity — cron is simpler and correct.
- pgmq would be the right addition only if the product later needs per-event instant email (e.g., "alert me the moment a new BIP in my field is approved"). That is not a v1.1 requirement.

**Why Supabase Cron wins:**
- Supabase Cron (released Dec 2024; GA as of 2026) is a first-class managed product built on pg_cron. It runs inside the existing Supabase project — no new deploy target.
- Available on the free tier (pg_cron extension is available on all Supabase plans; Edge Function invocations are 500K/mo free).
- Jobs are visible, editable, and monitorable in the Supabase Dashboard (Integrations → Cron). Job run history is stored in `cron.job_run_details`.
- Max 8 concurrent jobs, max 10 minutes per job — well within digest email constraints.
- Zero impact on the one-command local dev setup: `supabase start` includes pg_cron locally. The Edge Function can be deployed and tested with `supabase functions serve`.

### Integration Points (exact)

**Step 1 — Enable extensions (migration):**

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;  -- HTTP from Postgres
```

**Step 2 — Schedule the digest job (migration or Dashboard):**

```sql
-- Run every day at 07:00 UTC; the Edge Function filters by subscription frequency
SELECT cron.schedule(
  'biphub-alert-digest',
  '0 7 * * *',  -- daily at 07:00 UTC
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url')
            || '/functions/v1/send-alert-digest',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_anon_key')
    ),
    body := jsonb_build_object('triggered_at', now())
  ) AS request_id;
  $$
);
```

Store the project URL and anon key in Supabase Vault (Dashboard → Vault) so they are not hardcoded in migration SQL.

**Step 3 — Edge Function `send-alert-digest` (Deno):**

```typescript
// supabase/functions/send-alert-digest/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { Resend } from 'npm:resend'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!  // service-role: bypass RLS to read all subscriptions
)
const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)

Deno.serve(async (req) => {
  const today = new Date()

  // 1. Find subscriptions due for a digest
  const { data: subs } = await supabase
    .from('student_subscriptions')
    .select('*, auth.users!inner(email)')
    .or(`frequency.eq.daily,and(frequency.eq.weekly,last_sent_at.lt.${sevenDaysAgo()})`)

  // 2. For each subscription, find new matching BIPs since last_sent_at
  // 3. Batch and send via Resend
  // 4. Update last_sent_at on sent subscriptions

  return new Response(JSON.stringify({ sent: subs?.length ?? 0 }), {
    headers: { 'Content-Type': 'application/json' }
  })
})

function sevenDaysAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString()
}
```

The Edge Function uses the **service-role key** (not anon key) so it can read `auth.users` email addresses and bypass RLS on `student_subscriptions`. This is the one correct use of the service-role key for a background job — the call is not exposed to user traffic.

**Step 4 — Email template:**

Reuse the existing `react-email` + Resend pattern from v1.0. Create `emails/AlertDigest.tsx` using `@react-email/components`. Render server-side in the Edge Function with `renderAsync()`.

### Alternatives Rejected

| Mechanism | Why Rejected |
|-----------|-------------|
| Vercel Cron (Hobby) | Once per day maximum, hourly precision only; not schedulable by weekday; requires Route Handler exposed to internet; breaks local dev without tunnel |
| Vercel Cron (Pro) | $20/mo upgrade with no other benefit for BipHub; scheduling stays in infra we already own |
| Database Webhooks | Event-driven, not time-driven; wrong tool for a digest |
| Supabase Queues (pgmq) | Fan-out/retry queue for per-message delivery; overkill for a daily batch digest |
| n8n / external automation | PROJECT.md explicitly excludes n8n; "single external integration doesn't justify a second deploy target"; integration count is 1 (Resend), not 3+ |
| cron-job.org / GitHub Actions | External services add a dependency outside the controlled stack; GitHub Actions is for CI, not production scheduling; any free external cron has no SLA |

---

## Part C: Saved-Search / Subscription Persistence and Digest Batching

No new libraries or services are needed. The design is:

**Persistence:** `student_subscriptions` table (schema above). A student can have multiple subscriptions (e.g., one for Engineering in France, one for Business in Germany). Each subscription is independent with its own `last_sent_at` timestamp.

**Matching query** (run inside Edge Function per subscription):

```sql
SELECT b.*
FROM public.bips b
WHERE b.status = 'approved'
  AND b.approved_at > $last_sent_at
  AND ($field_of_study IS NULL OR b.field_of_study = $field_of_study)
  AND ($country IS NULL OR EXISTS (
    SELECT 1 FROM public.universities u
    WHERE u.id = b.host_university_id
      AND u.country = $country
  ))
ORDER BY b.approved_at DESC
LIMIT 20;
```

**Batching:** The Edge Function collects all subscriptions due for sending, deduplicates BIPs per user (a student with two subscriptions matching the same BIP gets one email not two), and sends one Resend call per user. Resend's `batch` endpoint (`resend.batch.send([...])`) allows up to 100 emails per API call — sufficient for BipHub at launch scale.

**Digest cadence:** Students choose `daily` or `weekly` at subscription time. The cron job runs daily at 07:00 UTC. The Edge Function applies the `frequency` filter: daily subscriptions are sent if `last_sent_at < 24h ago`; weekly subscriptions are sent only on their weekday (or if `last_sent_at < 7 days ago`). This single daily cron covers both frequencies with no second schedule entry.

**Unsubscribe:** A signed unsubscribe link (HMAC of `subscription_id + user_id`) in every email calls a Next.js Route Handler that calls `supabase.auth.admin` to delete the subscription row. This is the one acceptable Route Handler for this feature (it must be public and URL-triggered, not a Server Action).

---

## New Stack Additions (net new for v1.1)

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Supabase Cron (pg_cron) | built-in (GA Dec 2024) | Schedule daily/weekly digest email jobs | Already in the Supabase project; no new deploy target; free tier included; Dashboard UI for monitoring; replaces need for Vercel Cron Pro |
| pg_net | built-in Supabase extension | HTTP POST from Postgres to Edge Function | Required companion to pg_cron for invoking Edge Functions; no install needed on hosted Supabase |
| Supabase Edge Functions (Deno) | built-in | Run alert digest logic server-side on a schedule | Existing Supabase project; 500K free invocations/mo; Deno runtime with npm/jsr imports; used for digest batching + Resend calls |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `resend` (Resend Node SDK) | ^6.x (already installed) | Send alert digest emails | Reused from v1.0; add `resend.batch.send()` for multi-recipient digests |
| `@react-email/components` (already installed) | latest | Alert digest email template | Reused from v1.0; new `AlertDigest.tsx` template needed |
| `standardwebhooks` | `1.0.0` (esm.sh) | Verify Supabase Auth hook signatures in Edge Functions | Needed if adding `before-user-created` hook or custom access token hook as Edge Function (optional: hook can also be a PL/pgSQL function, which needs no library) |

> `standardwebhooks` is only needed if the custom access token hook is implemented as an Edge Function. The PL/pgSQL implementation shown above requires no new library.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `supabase functions serve` | Local Edge Function dev | Already available via Supabase CLI; run alongside `supabase start + npm run dev` |
| Supabase Vault (Dashboard) | Store Edge Function secrets (project URL, keys) | Avoids hardcoding secrets in SQL migration files; required for `pg_net` → Edge Function auth pattern |

---

## Installation

No new npm packages are required. All v1.1 capabilities are provided by:
1. Supabase platform features already in the project (pg_cron, pg_net, Edge Functions, Vault)
2. npm packages already installed in v1.0 (resend, @react-email/components, @supabase/supabase-js, @supabase/ssr)

New artifacts needed:
- 2-3 new SQL migration files (user_roles table, custom_access_token_hook function, student_bookmarks table, student_subscriptions table, pg_cron schedule)
- 1 new Supabase Edge Function: `supabase/functions/send-alert-digest/`
- 1 new email template: `emails/AlertDigest.tsx`
- Updates to existing Server Actions: student signup path sets `app_metadata.role = 'student'`; coordinator signup path sets `app_metadata.role = 'coordinator'`

```bash
# No new npm installs needed for v1.1 core features.

# If using the Edge Function hook approach for custom access token (optional):
# standardwebhooks is imported as esm.sh URL inside the Deno function — no npm install.

# Scaffold new Edge Function:
npx supabase functions new send-alert-digest

# New migrations:
npx supabase migration new add_student_auth_role
npx supabase migration new add_student_tables
npx supabase migration new add_alert_cron_schedule
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Single `auth.users` table + `app_metadata.role` | Separate Supabase project for student auth | Only if the two audiences need completely isolated databases, separate billing, or different JWT issuers. BipHub students and coordinators share BIP data — isolation would require cross-project queries and is pointless complexity here. |
| `app_metadata.role` for RLS differentiation | Custom Postgres role per audience | Postgres roles (like `anon`, `authenticated`) are server-level; you cannot issue a Supabase JWT with a custom Postgres role unless you manage your own PostgREST config. Not supported on managed Supabase. |
| Custom Access Token Hook (PL/pgSQL) | Custom Access Token Hook (Edge Function) | The Edge Function variant is valid but adds Deno cold-start latency on every token issuance. PL/pgSQL runs in-process with no network call. Use Edge Function version only if the hook logic needs external API calls. |
| pg_cron → Edge Function → Resend | Supabase Realtime + client-side push | Realtime is for live data streams to connected browsers — it cannot reach offline users. Email is the correct channel for async notifications. |
| Daily cron at 07:00 UTC covering both daily+weekly | Two separate cron schedules (one daily, one weekly) | Two schedules work fine but add operational overhead. The single daily job with frequency-aware filtering is simpler to reason about and change. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `user_metadata` in RLS policies | User-writable; any authenticated user can self-elevate role | `app_metadata` (writable only by service-role / auth hooks) |
| `getSession()` server-side for role checks | Already in CLAUDE.md never-do list; does not validate JWT signature | `getClaims()` in middleware, RSC, Server Actions |
| Vercel Cron on Hobby plan for sub-daily frequency | Restricted to once per day, hourly precision (±59 min); cannot schedule by weekday | Supabase Cron (pg_cron) |
| `createAdminClient` inside the Next.js app for digest logic | CLAUDE.md: service-role key must not leave `lib/supabase/admin.ts` and `app/(admin)/`; digest is a background job not triggered by user request | Supabase Edge Function with service-role key set as a Supabase secret (never exposed to client) |
| n8n or any external workflow automation platform | PROJECT.md decision: excluded until integration count ≥ 3; adds second deploy target; breaks one-command local dev | Supabase Cron + Edge Function (zero additional infra) |
| Supabase Queues (pgmq) for the digest | Queue is for per-event fan-out with retries; time-triggered batch digest does not need a message queue | pg_cron schedule + Edge Function |
| Separate Supabase project for student auth | Would require cross-project queries to join student data with BIPs; doubles Supabase config; no isolation benefit | Same project, role differentiated by `app_metadata` |
| `before-user-created` hook for the coordinator email gate | The hook runs for ALL signups including students; using it for the coordinator domain-check would require detecting which signup flow is being used in the hook, which is fragile. The application-level gate in the Server Action is simpler and already works. | Server Action flow check before calling `supabase.auth.signUp()` |

---

## Version Compatibility

| Package / Feature | Compatible With | Notes |
|-------------------|-----------------|-------|
| Supabase Cron (pg_cron) | All Supabase plan tiers | Available via Dashboard Integration; cron jobs stored in `cron.job_run_details` |
| pg_net | All hosted Supabase plans | Required for HTTP calls from pg_cron; not available in local `supabase start` by default — use `supabase/config.toml` `[db.extensions]` to enable locally |
| Edge Functions (Deno) | Supabase free tier | 500K invocations/month free; daily digest at 1K subscribers = ~30K invocations/month — well within free tier |
| Custom Access Token Hook | `@supabase/ssr ^0.x` | Hook output is standard JWT; `getClaims()` reads JWT; no client library change needed |
| `resend` ^6.x | Supabase Edge Function (Deno) | Import as `npm:resend` inside Deno; already used in v1.0 server-side |
| `user_roles` table + RLS | Next.js 15 Server Actions | Claims available via `getClaims()`; no middleware change except adding `user_role` extraction |

---

## Local Dev Considerations

The one-command local dev constraint (`supabase start && npm run dev`) is preserved:

- `pg_cron` is bundled in `supabase start`. Schedules can be applied via `supabase db reset` (which runs migrations including `cron.schedule()` calls).
- `pg_net` requires explicit enabling in `supabase/config.toml`:
  ```toml
  [db.extensions]
  pg_net = true
  ```
- Edge Functions run locally with `supabase functions serve --env-file .env.local`. The local pg_cron cannot call a public URL, but developers can invoke the Edge Function manually via `curl` or the Supabase Studio interface during local development.
- The `RESEND_API_KEY` is already in `.env.local`. In local dev, email sending can be toggled off by checking `Deno.env.get('NODE_ENV') === 'development'` and logging instead of sending.

The CONTRIBUTING.md one-liner becomes:
```bash
npm run db:start && npm run db:reset && supabase functions serve --env-file .env.local & npm run dev
```
(or keep the Edge Function dev optional — it only matters when testing digest emails end-to-end)

---

## Sources

- Supabase Auth source (`/supabase/auth` Context7) — JWT `AccessTokenClaims` structure, `app_metadata` vs `user_metadata` security distinction (HIGH confidence)
- [Supabase Custom Claims & RBAC guide](https://supabase.com/docs/guides/api/custom-claims-and-role-based-access-control-rbac) — `custom_access_token_hook` PL/pgSQL pattern, `user_roles` table structure (HIGH confidence)
- [Supabase RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security) — `auth.jwt() -> 'app_metadata'` RLS policy pattern; `security definer` role-check functions (HIGH confidence)
- [Supabase Auth Hooks — before-user-created](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook) — domain restriction hook pattern; confirmed `app_metadata` is set before hook fires (HIGH confidence, Context7 verified)
- Vercel Cron docs (`/websites/vercel` Context7) — Hobby plan: once-per-day, hourly precision; Pro plan: per-minute precision; 100 cron jobs max per project; `CRON_SECRET` security header (HIGH confidence)
- [Supabase Cron product page](https://supabase.com/modules/cron) — GA Dec 2024; built on pg_cron; Dashboard UI; job run history; 8 concurrent job limit; 10-min job limit (HIGH confidence)
- [Supabase Cron blog post](https://supabase.com/blog/supabase-cron) — release announcement, confirmed free tier availability (HIGH confidence)
- Supabase Edge Functions scheduling docs (`/websites/supabase` Context7) — `pg_cron` + `pg_net` + Vault pattern for calling Edge Functions on schedule (HIGH confidence)
- [Supabase pricing](https://supabase.com/pricing) — Edge Functions 500K invocations/month free tier (HIGH confidence)
- [Supabase `send-emails` Edge Function example](https://supabase.com/docs/guides/functions/examples/send-emails) — Resend API call from Deno runtime (HIGH confidence)

---

*Stack research for: BipHub v1.1 — Product Depth & Engagement (stack additions only)*
*Researched: 2026-06-14*
