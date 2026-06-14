# Architecture Research

**Domain:** v1.1 integration — multi-audience auth/roles, student data model, BIP alert pipeline, edit-with-re-review state machine
**Researched:** 2026-06-14
**Confidence:** HIGH — based on reading live migrations, Server Actions, and existing RLS policies; cross-referenced with Supabase docs on pg_cron and Auth

---

## Context: This Is an Integration Document

v1.1 does not replace the existing architecture. The Next.js 15 App Router route group structure, Supabase RLS pattern, Server Actions for all mutations, `getClaims()` everywhere, `createAdminClient` confinement, and ISR strategy are all unchanged. This document describes only what must be added or modified.

---

## Workstream A: Multi-Audience Auth and Role Model

### The Core Problem

v1.0 has two roles: `coordinator` (default on signup) and `admin` (set via service-role trigger). Coordinator signup is open — any email signs up and then provides university details via the onboarding flow. There is no institutional email gate in the code. What v1.0 does **not** have is a `student` role.

v1.1 requires students to sign up without the university onboarding requirement that coordinators go through. The email gate issue in the research prompt is actually about separating the **UI and onboarding path**, not about imposing an email domain filter (which v1.0 never had).

### Role Model Decision: Three Roles on One `profiles` Table

Add `'student'` as a third valid value for `profiles.role`. No separate table needed. The existing `sync_role_to_app_metadata()` trigger (migration 00002) mirrors `profiles.role` into `auth.users.raw_app_meta_data.role` on every INSERT or UPDATE — students automatically get `app_metadata.role = 'student'` in their JWT.

**Migration required:** Extend the `profiles.role` CHECK constraint.

```sql
-- Migration: drop the existing constraint and add a broader one
alter table public.profiles
  drop constraint profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('coordinator', 'admin', 'student'));
```

The `bips_insert_coordinator` RLS policy (migration 00006) currently has no role restriction — it allows any authenticated user whose `created_by = auth.uid()`. This inadvertently permits students to insert BIPs. Fix this by tightening the insert policy to coordinators and admins only:

```sql
-- Migration: tighten bips_insert_coordinator
drop policy if exists "bips_insert_coordinator" on public.bips;

create policy "bips_insert_coordinator"
  on public.bips for insert
  to authenticated
  with check (
    (select auth.uid()) = created_by
    and (select auth.jwt() -> 'app_metadata' ->> 'role') in ('coordinator', 'admin')
  );
```

### Signup Routing: Student vs Coordinator

Two separate signup pages drive two different onboarding paths. Same `signUpAction` Server Action, different `role` parameter passed in the form:

```
/register/student    → signUpAction with role='student'
                       → creates profiles row: role='student', university_id=NULL (never required)
                       → redirects to /student-dashboard (or /explore as the student home)

/register/coordinator → signUpAction with role='coordinator' (existing path, renamed from /register)
                        → creates profiles row: role='coordinator'
                        → redirects to /onboarding (fill in university details)
```

The `signUpAction` must accept a `role` parameter and pass it to the `profiles` insert:

```typescript
// lib/actions/auth.ts modification — existing signUpAction gains role param
const role = formData.get('role') === 'student' ? 'student' : 'coordinator'
// after supabase.auth.signUp() succeeds, insert profile with this role
await supabase.from('profiles').insert({ id: userId, role })
```

**Privilege escalation prevention:** Students cannot self-promote to coordinator or admin because:
1. `profiles_update_own_or_admin` has `WITH CHECK (auth.uid() = id ...)` — the row identity check prevents changing any column on another user's row, but it does NOT prevent a student changing their own `role`. A role-locking fix is needed.

**Required RLS fix for profiles UPDATE policy (migration 00008 addendum or new migration):**

```sql
-- Migration: prevent users from changing their own role column
-- Replace profiles_update_own_or_admin with a role-stable variant

drop policy if exists "profiles_update_own_or_admin" on public.profiles;

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  to authenticated
  using (
    (select auth.uid()) = id
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    -- Non-admins: can update own row but CANNOT change the role column
    (
      (select auth.uid()) = id
      and id = (select auth.uid())
      and role = (select role from public.profiles where id = (select auth.uid()))
    )
    -- Admins: can update any row including role changes
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
```

Note: the subquery `select role from public.profiles where id = (select auth.uid())` in the WITH CHECK reads the **current** role from the DB and asserts the UPDATE cannot change it. Only admins (who take the OR branch) can change the `role` column. This closes the privilege escalation path.

### Middleware Route Guard Changes

The middleware currently gates `/dashboard` (coordinator) and `/admin`. Add `/student-dashboard` (or whatever the student area is named):

```typescript
// middleware.ts additions
if (pathname.startsWith('/student-dashboard')) {
  if (!user) return NextResponse.redirect(new URL('/register/student', request.url))
  // students AND coordinators AND admins can visit; no role gate needed beyond auth
}

// The existing /dashboard guard should also check role != 'student'
// to prevent students from landing on the coordinator dashboard
if (pathname.startsWith('/dashboard') && !pathname.startsWith('/student-dashboard')) {
  if (!user) return NextResponse.redirect(new URL('/login', request.url))
  const role = user.app_metadata?.role
  if (role === 'student') return NextResponse.redirect(new URL('/student-dashboard', request.url))
}
```

### New Route Group

Add `app/(student)/` route group with its own layout (auth guard, student chrome):

```
app/
└── (student)/
    ├── layout.tsx              ← Auth guard (student role); redirect non-students to /dashboard
    └── student-dashboard/
        ├── page.tsx            ← Student home: saved BIPs, active subscriptions, recent alerts
        └── saved/
            └── page.tsx        ← Full saved BIPs list (server-side, not localStorage)
```

### Summary: New vs Modified — Auth/Role

| Component | New or Modified | Notes |
|-----------|----------------|-------|
| `profiles.role` CHECK constraint | MODIFIED | Add `'student'` as valid value |
| `bips_insert_coordinator` RLS policy | MODIFIED | Restrict to coordinator/admin roles explicitly |
| `profiles_update_own_or_admin` RLS policy | MODIFIED | Add role-stability clause in WITH CHECK |
| `lib/actions/auth.ts signUpAction` | MODIFIED | Accept `role` param; two paths |
| `app/(auth)/register/page.tsx` | MODIFIED | Becomes coordinator register; links to student register |
| `app/(auth)/register/student/page.tsx` | NEW | Student signup form |
| `app/(student)/layout.tsx` | NEW | Student auth guard + chrome |
| `app/(student)/student-dashboard/page.tsx` | NEW | Student home |
| `middleware.ts` | MODIFIED | Add student-dashboard guard + coordinator path role check |
| `sync_role_to_app_metadata()` trigger | UNCHANGED | Already handles any role value |

---

## Workstream B: Data Model for `saved_bips` and `saved_searches`

### Migration from `localStorage` Bookmarks

v1.0 bookmarks live in `localStorage['biphub:bookmarks']` as a Zustand store. v1.1 adds server-side persistence for students only. The localStorage store is kept as the anonymous/pre-signup fallback and for non-student users who happen to bookmark. On student login, the migration path is: read localStorage bookmarks → upsert to `saved_bips` → clear localStorage.

### `saved_bips` Table

```sql
create table public.saved_bips (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  bip_id     uuid not null references public.bips(id) on delete cascade,
  saved_at   timestamptz not null default now(),
  unique (user_id, bip_id)
);

alter table public.saved_bips enable row level security;

-- Students (and coordinators) can read their own saved BIPs
create policy "saved_bips_select_own"
  on public.saved_bips for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Students/coordinators can save BIPs for themselves only
create policy "saved_bips_insert_own"
  on public.saved_bips for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Students/coordinators can unsave BIPs they saved
create policy "saved_bips_delete_own"
  on public.saved_bips for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Admins can read all saved BIPs (for moderation/analytics)
create policy "saved_bips_select_admin"
  on public.saved_bips for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
```

No UPDATE policy is needed — save/unsave is insert/delete only.

### `bip_subscriptions` Table (Alert Preferences)

Named `bip_subscriptions` not `saved_searches` to avoid confusion with browser URL state. Each row is one alert criterion. A student can have multiple subscriptions (e.g., one for `subject_area = 'engineering'` + one for `country = 'DE'`).

```sql
create table public.bip_subscriptions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  -- Filter criteria (any combination; NULL means "match any value for this field")
  subject_area   text,                          -- ISCED group id or NULL
  country        text,                          -- ISO 3166-1 alpha-2 or NULL
  -- Delivery preferences
  digest_freq    text not null default 'weekly'
    check (digest_freq in ('instant', 'daily', 'weekly')),
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.bip_subscriptions enable row level security;

create policy "subscriptions_select_own"
  on public.bip_subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "subscriptions_insert_own"
  on public.bip_subscriptions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "subscriptions_update_own"
  on public.bip_subscriptions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "subscriptions_delete_own"
  on public.bip_subscriptions for delete
  to authenticated
  using ((select auth.uid()) = user_id);
```

### New vs Modified — Data Model

| Component | New or Modified | Notes |
|-----------|----------------|-------|
| `saved_bips` table + RLS | NEW | Full CRUD for self; admin read |
| `bip_subscriptions` table + RLS | NEW | Alert preferences per student |
| Zustand `useBookmarkStore` | MODIFIED | Add server-sync on login; keep localStorage for anon |
| `lib/actions/saved-bips.ts` | NEW | `saveBipAction`, `unsaveBipAction`, `getSavedBipsAction` |
| `lib/actions/subscriptions.ts` | NEW | `upsertSubscriptionAction`, `deleteSubscriptionAction` |

---

## Workstream C: New-BIP Alert Pipeline

### Pipeline Shape

The alert pipeline must match subscriptions to newly-approved BIPs and send digest emails. The key decision is where the matching logic lives and what triggers it.

**Chosen architecture: Postgres trigger on approval writes to a `bip_alert_queue` table; pg_cron calls a Supabase Edge Function on a schedule to process the queue and send Resend batch emails.**

This fits the "one external service (Resend)" constraint, keeps the Next.js app stateless, uses infrastructure already in place (Supabase, Resend), and avoids a second deploy target (n8n explicitly deferred to v2 per PROJECT.md).

### `bip_alert_queue` Table

```sql
create table public.bip_alert_queue (
  id           uuid primary key default gen_random_uuid(),
  bip_id       uuid not null references public.bips(id) on delete cascade,
  queued_at    timestamptz not null default now(),
  processed_at timestamptz,                     -- NULL = pending; set when digest runs
  batch_id     uuid                             -- set when digest job claims this row
);

alter table public.bip_alert_queue enable row level security;

-- Only Edge Function (service-role) and admin may read/write the queue
-- No authenticated RLS policies needed — queue is internal plumbing
-- Service-role bypasses RLS; standard authenticated users should never touch this table
-- Adding a deny-all policy as a safety net
create policy "alert_queue_no_access"
  on public.bip_alert_queue for all
  to authenticated
  using (false);
```

### Trigger: Approval Event → Queue

The trigger fires when `bips.status` transitions to `'approved'`. It inserts the BIP id into `bip_alert_queue`. The trigger runs in the same transaction as the approval, so if the approval rolls back the queue row rolls back too.

```sql
create or replace function public.enqueue_new_bip_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only enqueue on the approved→live transition
  if (tg_op = 'UPDATE'
      and old.status is distinct from new.status
      and new.status = 'approved') then
    insert into public.bip_alert_queue (bip_id)
    values (new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger bips_enqueue_alert
  after update of status on public.bips
  for each row
  execute function public.enqueue_new_bip_alert();

revoke execute on function public.enqueue_new_bip_alert() from public, anon, authenticated;
```

### Matcher and Digest: Edge Function

A Supabase Edge Function `send-bip-alerts` (in `supabase/functions/send-bip-alerts/index.ts`) runs on schedule. It:

1. Reads unprocessed rows from `bip_alert_queue` (using service-role key — bypasses the deny-all RLS).
2. For each queued BIP, reads `subject_area` and `country` from `bips`.
3. Queries `bip_subscriptions` to find matching subscribers (`subject_area` matches OR is NULL; `country` matches OR is NULL; `active = true`).
4. Deduplicates by user (one digest per user per run, even if multiple BIPs match multiple subscriptions).
5. Sends one Resend email per matching user (using the Resend API key from Edge Function env vars).
6. Marks processed rows with `processed_at = now()` and a `batch_id`.

The Edge Function uses `createClient` with the service-role key (from `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`). This is the correct use of the service-role key — inside a server-side Edge Function, not inside the Next.js app.

**pg_cron schedule:**

```sql
-- Run alert digest daily at 08:00 UTC
select cron.schedule(
  'bip-alert-digest',
  '0 8 * * *',
  $$
    select net.http_post(
      url := current_setting('app.edge_function_url') || '/send-bip-alerts',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);
```

The Edge Function URL and service-role key are stored as Postgres config vars (`alter database postgres set app.edge_function_url = '...'`), set via the Supabase dashboard or migrations. This avoids hardcoding secrets in SQL.

**Instant digest variant:** For `digest_freq = 'instant'` subscribers, the trigger can directly call pg_net to invoke the Edge Function without waiting for the cron job. This is an optional optimization — start with `daily` as the default and only implement instant if the product requires it.

### Pipeline Data Flow

```
approveBipAction (Server Action)
  → UPDATE bips SET status='approved'
    → bips_enqueue_alert trigger fires
      → INSERT INTO bip_alert_queue (bip_id)

pg_cron (daily 08:00 UTC)
  → pg_net HTTP POST → supabase/functions/send-bip-alerts
    → service-role client reads bip_alert_queue WHERE processed_at IS NULL
    → for each bip_id:
        reads bips(subject_area, country, slug, title)
        queries bip_subscriptions WHERE
          (subject_area = bip.subject_area OR subject_area IS NULL)
          AND (country = bip.country OR country IS NULL)
          AND active = true
    → dedup by user_id
    → for each matched user:
        reads profiles(contact_email, full_name)
        calls Resend API with BipAlertEmail template
    → marks queue rows processed_at = now()
```

### New vs Modified — Alert Pipeline

| Component | New or Modified | Notes |
|-----------|----------------|-------|
| `bip_alert_queue` table | NEW | Internal queue; deny-all RLS |
| `enqueue_new_bip_alert()` trigger | NEW | Fires on `status → 'approved'` |
| `supabase/functions/send-bip-alerts/` | NEW | Edge Function; matcher + Resend sender |
| `lib/email/templates/BipAlertEmail.tsx` | NEW | React Email template for alert digest |
| `lib/email/send.ts` | MODIFIED | Add `'bip-alert'` variant to `EmailPayload` union |
| pg_cron schedule SQL | NEW | Migration or dashboard config |
| `approveBipAction` | UNCHANGED | Trigger handles enqueueing automatically |

---

## Workstream D: Edit-Approved-BIP with Re-Review

### State Machine Analysis

The existing state machine (from migrations 00011 and 00012) is:

```
draft → pending   (submitBipAction; policy bips_update_own_to_pending)
pending → draft   (withdraw; trigger logs)
rejected → draft  (revise; bips_update_own_editable USING clause)
pending → approved (approveBipAction; bips_update_admin)
pending → rejected (rejectBipAction; bips_update_admin)
approved → rejected (un-approve; rejectBipAction; bips_update_admin)
```

v1.1 requires a coordinator to edit an approved BIP and submit it for re-review. The product question is: does the live approved BIP stay visible while the edit is in review, or does it disappear? The answer must be: **the live BIP stays visible.** An academic institution's BIP going dark during a 48-hour review window would break student discovery. Therefore, a **draft-plus-published split** is the correct model.

### Chosen Design: `published_snapshot` Column + `pending_edit` Status

Add a `published_snapshot` JSONB column to `bips` that holds the last approved version's data. When a coordinator edits an approved BIP:

1. The current approved content is saved to `published_snapshot` (written by a trigger or Server Action before the update).
2. The BIP status transitions from `approved` to `pending_edit`.
3. The live public URL (`/bip/[slug]`) serves the `published_snapshot` content — not the pending edit.
4. When an admin approves the edit, the `published_snapshot` is cleared, and the row becomes the live version.
5. When an admin rejects the edit, the content is rolled back from `published_snapshot` and the BIP returns to `approved`.

**Schema change:**

```sql
-- Migration: add pending_edit status + published_snapshot
alter table public.bips
  add column published_snapshot jsonb;

-- Extend the action_kind CHECK on bip_status_history
alter table public.bip_status_history
  drop constraint bip_status_history_action_kind_check;

alter table public.bip_status_history
  add constraint bip_status_history_action_kind_check
  check (action_kind in (
    'submit', 'approve', 'reject', 'resubmit', 'admin_edit', 'withdraw',
    'submit_edit', 'approve_edit', 'reject_edit'  -- new for v1.1
  ));

-- The status column itself uses a TEXT type with a CHECK constraint in 00001
-- (or is unconstrained). Verify and extend if needed:
-- alter table public.bips add constraint bips_status_check
--   check (status in ('draft','pending','approved','rejected','pending_edit'));
-- (Only needed if 00001 has an explicit status CHECK — check migration 00001 first)
```

### RLS Policy Changes for `pending_edit`

The coordinator UPDATE policy must allow editing an `approved` BIP (to initiate re-review):

```sql
-- Migration: extend bips_update_own_editable to include 'approved' source
drop policy if exists "bips_update_own_editable" on public.bips;

create policy "bips_update_own_editable"
  on public.bips for update
  to authenticated
  using (
    (select auth.uid()) = created_by
    and status in ('draft', 'pending', 'rejected', 'approved')
  )
  with check (
    (select auth.uid()) = created_by
    -- Post-image status can be draft (edit/withdraw), pending (submit),
    -- or pending_edit (submit approved BIP edit). Cannot self-approve.
    and status in ('draft', 'pending', 'pending_edit')
  );
```

The existing `bips_update_own_to_pending` policy (00012) allows `draft → pending`. A parallel policy is needed for `approved → pending_edit`:

```sql
create policy "bips_update_own_to_pending_edit"
  on public.bips for update
  to authenticated
  using (
    (select auth.uid()) = created_by
    and status = 'approved'
  )
  with check (
    (select auth.uid()) = created_by
    and status = 'pending_edit'
  );
```

The admin UPDATE policy (`bips_update_admin`) requires no change — it already allows any status transition.

### Public Read: Serving the Snapshot While in `pending_edit`

The public read policy currently returns rows where `status = 'approved'`. With `pending_edit`, the live BIP row is no longer `approved` — but it must still appear on `/bips` and `/bip/[slug]`.

Change the public select policy to include `pending_edit`:

```sql
-- Migration: extend public BIP visibility to include pending_edit rows
drop policy if exists "bips_select_approved_public" on public.bips;

create policy "bips_select_approved_public"
  on public.bips for select
  to anon
  using (status in ('approved', 'pending_edit'));
```

The RSC queries in `/bips/page.tsx` and `/bip/[slug]/page.tsx` must be updated to serve `published_snapshot` content when `status = 'pending_edit'`. A database view is the cleanest way to expose merged content:

```sql
create or replace view public.bips_public_view as
  select
    id, slug, title,
    -- When pending_edit, serve snapshot fields; otherwise serve live fields
    case when status = 'pending_edit' and published_snapshot is not null
         then (published_snapshot ->> 'description')
         else description end as description,
    -- ... repeat for all public-facing columns ...
    case when status = 'pending_edit' then 'approved' else status end as display_status,
    status as actual_status,
    -- All other columns that are always served live (non-content metadata):
    host_university_id, subject_area, country, physical_start_date,
    physical_end_date, application_deadline, ects_credits, language_of_instruction,
    study_levels, green_travel, inclusion_support, how_to_apply_type,
    how_to_apply_value, contact_name, contact_email, published_at
  from public.bips
  where status in ('approved', 'pending_edit');
```

Alternatively — and more practically given the large number of columns — the RSC query can coalesce in application code:

```typescript
// In lib/queries/bips.ts — public BIP query
// For public display, serve snapshot content when pending_edit
const displayData = bip.status === 'pending_edit' && bip.published_snapshot
  ? { ...bip, ...bip.published_snapshot }
  : bip
```

The application-code approach is simpler to maintain; the view is cleaner for RLS inheritance. Use the application-code approach for v1.1 since the view would need its own RLS policies.

### Snapshot Mechanism

The `published_snapshot` is written by the `submitEditAction` Server Action (new) when the coordinator submits the edit:

```typescript
// lib/actions/bip-submit-edit.ts (NEW)
export async function submitEditAction(bipId: string): Promise<ActionResult> {
  // 1. getClaims() + ownership check
  // 2. Read existing approved BIP row
  // 3. Build snapshot from current column values (all public-facing content fields)
  const snapshot = {
    title: existing.title,
    description: existing.description,
    // ... all content columns
  }
  // 4. UPDATE: status = 'pending_edit', published_snapshot = snapshot
  await supabase.from('bips').update({
    status: 'pending_edit',
    published_snapshot: snapshot,
    updated_at: new Date().toISOString(),
  }).eq('id', bipId)
  // 5. Log audit: action_kind = 'submit_edit'
  // 6. No ISR revalidation needed (public URL still serves snapshot)
}
```

### Admin Approve-Edit and Reject-Edit Actions

`approveEditAction` (variant of `approveBipAction`):
- Validates `pending_edit → approved` transition.
- Clears `published_snapshot` (sets to NULL).
- Sets `status = 'approved'`, updates `published_at`.
- `revalidatePath('/bip/${slug}')` and `revalidatePath('/bips')` to bust ISR so live content updates.
- Logs audit: `action_kind = 'approve_edit'`.
- Sends coordinator email: "Your BIP edit is live."

`rejectEditAction` (variant of `rejectBipAction`):
- Validates `pending_edit → approved` rollback.
- Restores content columns from `published_snapshot`.
- Sets `status = 'approved'`, clears `published_snapshot`.
- `revalidatePath` as above (content may have been partially changed before snapshot — bust to be safe).
- Logs audit: `action_kind = 'reject_edit'`.
- Sends coordinator email: "Your BIP edit was not approved — here is the feedback."

The existing `bips_update_admin` policy covers both of these writes — no RLS change needed for admin transitions.

### ISR / `revalidatePath` Behavior During `pending_edit`

| Event | `revalidatePath` calls | Public impact |
|-------|----------------------|---------------|
| Coordinator submits edit (`approved → pending_edit`) | None | ISR still serves the last approved cache. If cache expires, RSC query hits DB and serves `published_snapshot` — same content. |
| Admin approves edit (`pending_edit → approved`) | `/bips`, `/bip/[slug]`, `/admin` | New content goes live. |
| Admin rejects edit (`pending_edit → approved` rollback) | `/bips`, `/bip/[slug]`, `/admin` | Reverted content (same as before edit). Bust to ensure snapshot coalescence is cleared from RSC. |

### Audit Log Changes

The `bip_status_history` trigger (`log_bip_status_change` in migration 00010) currently handles coordinator-initiated transitions. The `pending_edit` transitions are all coordinator-or-admin-initiated and should be added to the trigger's coordinator-handled set:

```sql
-- In log_bip_status_change() trigger function, extend the elsif chain:
elsif (old.status = 'approved' and new.status = 'pending_edit') then
  v_action_kind := 'submit_edit';
-- 'pending_edit' → 'approved' and 'pending_edit' → 'approved' (rollback) are
-- admin transitions — logged by Server Actions, not the trigger.
```

The Server Actions for approve-edit and reject-edit write audit rows explicitly (same pattern as `approveBipAction` and `rejectBipAction` today).

### Admin Panel Changes

The admin review queue currently shows `status = 'pending'`. It must also show `status = 'pending_edit'`. A visual distinction in the queue card ("edit" vs "new submission") helps admins triage:

```typescript
// components/admin/ReviewQueue.tsx — MODIFIED
// Filter: status in ('pending', 'pending_edit')
// BipReviewCard: show 'Edit' badge when status === 'pending_edit'
// For 'pending_edit' cards: show diff view (pending content vs published_snapshot)
```

The diff view (pending edit vs. snapshot) is a new component needed by the admin review panel.

### New vs Modified — Edit-with-Re-Review

| Component | New or Modified | Notes |
|-----------|----------------|-------|
| `bips.published_snapshot` column | NEW | JSONB snapshot of approved content |
| `bip_status_history.action_kind` CHECK | MODIFIED | Add `submit_edit`, `approve_edit`, `reject_edit` |
| `bips_update_own_editable` RLS policy | MODIFIED | Add `'approved'` to USING; add `'pending_edit'` to WITH CHECK |
| `bips_update_own_to_pending_edit` RLS policy | NEW | Parallels `bips_update_own_to_pending` |
| `bips_select_approved_public` RLS policy | MODIFIED | Include `'pending_edit'` in `status in (...)` |
| `log_bip_status_change()` trigger | MODIFIED | Add `approved → pending_edit` branch |
| `lib/actions/bip-submit-edit.ts` | NEW | `submitEditAction` |
| `lib/actions/admin-bips.ts` | MODIFIED | Add `approveEditAction`, `rejectEditAction` |
| `lib/queries/bips.ts` | MODIFIED | Snapshot coalescence for public queries |
| `app/(coordinator)/dashboard/bips/[id]/edit/page.tsx` | MODIFIED | Show "Submit Edit for Review" when status='approved' |
| `app/(admin)/admin/page.tsx` | MODIFIED | Include `pending_edit` in queue query |
| `components/admin/ReviewQueue.tsx` | MODIFIED | Visual distinction for `pending_edit` rows |
| `components/admin/BipEditDiff.tsx` | NEW | Shows pending content vs. snapshot side-by-side |
| `revalidatePath` in admin actions | MODIFIED | Add approve-edit / reject-edit bust paths |

---

## System Overview (v1.1 Integration)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        VERCEL EDGE / CDN                                  │
│  Static assets, ISR-cached pages, middleware execution                    │
├──────────────────────────────────────────────────────────────────────────┤
│                      NEXT.JS 15 APP ROUTER                                │
│                                                                           │
│  ┌───────────────┐  ┌──────────────┐  ┌───────────┐  ┌───────────┐       │
│  │  (public)     │  │   (auth)     │  │(dashboard)│  │  (admin)  │       │
│  │ RSC/ISR       │  │ /login       │  │ coord.    │  │ review    │       │
│  │ snapshot-     │  │ /register    │  │ dashboard │  │ queue     │       │
│  │ aware queries │  │ /register/   │  │           │  │ (incl.    │       │
│  │               │  │ student (NEW)│  │           │  │ pend_edit)│       │
│  └───────┬───────┘  └──────┬───────┘  └─────┬─────┘  └─────┬─────┘       │
│          │                 │                 │               │            │
│  ┌───────┴─────────────────┴─────────────────┴───────────────┴──────────┐  │
│  │    (student) NEW — saved BIPs, subscriptions, alert preferences      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  middleware.ts — student-dashboard guard + coordinator role check  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Server Actions (lib/actions/)                                     │  │
│  │  EXISTING: signIn/signUp/signOut, saveDraft, submit, approve,      │  │
│  │            reject, adminUpdate                                     │  │
│  │  NEW: signUpStudent, saveBip, unsaveBip,                           │  │
│  │       upsertSubscription, deleteSubscription,                      │  │
│  │       submitEdit, approveEdit, rejectEdit                          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────────┤
│                         SUPABASE                                          │
│  ┌────────────────────────────────────────────────────────────────┐      │
│  │  Postgres                                                      │      │
│  │  EXISTING: bips, universities, profiles,                       │      │
│  │            bip_partner_universities, bip_status_history        │      │
│  │  NEW: saved_bips, bip_subscriptions, bip_alert_queue           │      │
│  │  MODIFIED: bips.published_snapshot (col), bips.status (enum),  │      │
│  │            profiles.role (CHECK), 5 RLS policies updated       │      │
│  └────────────────────────────────────────────────────────────────┘      │
│  ┌────────────────────────────────────────────────────────────────┐      │
│  │  pg_cron                                                       │      │
│  │  NEW: 'bip-alert-digest' job (daily 08:00 UTC)                 │      │
│  │       invokes Edge Function via pg_net HTTP POST               │      │
│  └────────────────────────────────────────────────────────────────┘      │
│  ┌────────────────────────────────────────────────────────────────┐      │
│  │  Edge Functions                                                │      │
│  │  NEW: send-bip-alerts (matcher + digest sender)                │      │
│  └────────────────────────────────────────────────────────────────┘      │
├──────────────────────────────────────────────────────────────────────────┤
│                    EXTERNAL SERVICES                                      │
│  Resend — EXISTING: approval, rejection, admin-notification emails       │
│            NEW: BipAlertEmail digest template                            │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Component Inventory: New vs Modified

### New Tables

| Table | Purpose | RLS Summary |
|-------|---------|-------------|
| `saved_bips` | Server-side BIP bookmarks per user | own-only CRUD; admin read |
| `bip_subscriptions` | Alert preferences per student | own-only CRUD |
| `bip_alert_queue` | Internal queue for alert pipeline | deny-all authenticated; service-role via Edge Function |

### New Migrations

| Migration | Purpose |
|-----------|---------|
| `00015_student_role.sql` | Extend `profiles.role` CHECK; fix `bips_insert_coordinator`; fix `profiles_update_own_or_admin` role-stability |
| `00016_saved_bips.sql` | `saved_bips` table + RLS |
| `00017_bip_subscriptions.sql` | `bip_subscriptions` table + RLS |
| `00018_pending_edit_state.sql` | `bips.published_snapshot` col; extend `bip_status_history` action_kind CHECK; new RLS policies; extend `log_bip_status_change` trigger |
| `00019_alert_queue.sql` | `bip_alert_queue` table; `enqueue_new_bip_alert` trigger; pg_cron schedule |

### New Server Actions

| File | Exports |
|------|---------|
| `lib/actions/saved-bips.ts` | `saveBipAction`, `unsaveBipAction`, `getSavedBipsAction` |
| `lib/actions/subscriptions.ts` | `upsertSubscriptionAction`, `deleteSubscriptionAction` |
| `lib/actions/bip-submit-edit.ts` | `submitEditAction` |

### Modified Server Actions

| File | Change |
|------|--------|
| `lib/actions/auth.ts` | Accept `role` param in `signUpAction`; route students to `/student-dashboard` in `signInAction` profile check |
| `lib/actions/admin-bips.ts` | Add `approveEditAction`, `rejectEditAction` exports |

### New Route Files

| Path | Purpose |
|------|---------|
| `app/(auth)/register/student/page.tsx` | Student signup form |
| `app/(student)/layout.tsx` | Student area auth guard + chrome |
| `app/(student)/student-dashboard/page.tsx` | Student home: saved BIPs + subscriptions |
| `app/(student)/student-dashboard/saved/page.tsx` | Full saved BIPs list |
| `supabase/functions/send-bip-alerts/index.ts` | Edge Function: alert matcher + sender |

### Modified Route Files

| Path | Change |
|------|--------|
| `app/(auth)/register/page.tsx` | Coordinator-specific; add link to `/register/student` |
| `middleware.ts` | Add student-dashboard guard; tighten coordinator path |
| `app/(dashboard)/dashboard/bips/[id]/edit/page.tsx` | Show "Submit Edit for Review" CTA when status='approved' |
| `app/(admin)/admin/page.tsx` | Include `pending_edit` in review queue query |
| `components/admin/ReviewQueue.tsx` | Visual badge for `pending_edit` items |

### New Components

| Component | Purpose |
|-----------|---------|
| `components/student/SavedBipCard.tsx` | Saved BIP display with unsave action |
| `components/student/SubscriptionManager.tsx` | Alert preference UI |
| `components/admin/BipEditDiff.tsx` | Side-by-side snapshot vs pending content diff |
| `lib/email/templates/BipAlertEmail.tsx` | React Email template for alert digest |

---

## Architectural Patterns (v1.1 Additions)

### Pattern 1: Role-Parameterized Signup with Single Server Action

One `signUpAction` handles both student and coordinator signups, keyed on a hidden `role` field in the form. The profile insert uses the validated role. Post-signup redirect diverges based on role. This keeps auth logic in one place while supporting multiple audiences.

### Pattern 2: Transactional Queue via Postgres Trigger

The alert queue is written by a Postgres trigger (not a Server Action) so that the enqueue is part of the same transaction as the BIP approval. If the approval fails, no alert is enqueued. This is more reliable than calling a Server Action post-commit that could fail silently.

### Pattern 3: Edge Function as Alert Processor

The alert digest runs in a Supabase Edge Function (Deno runtime) invoked by pg_cron. This keeps the heavy matching and batch email logic outside the Next.js request lifecycle, avoids Vercel function timeout constraints, and allows the digest to run independently of user requests.

### Pattern 4: Snapshot Coalescence at Query Layer

Rather than a Postgres view, the `published_snapshot` coalescence (serving snapshot content when `status = 'pending_edit'`) is done in `lib/queries/bips.ts`. This keeps RLS reasoning simple and avoids view permission complexity. The RSC pages call the query helper, not raw Supabase selects, so the coalescence is applied consistently.

### Pattern 5: Parallel Status Paths in RLS

The coordinator UPDATE path uses three separate policies working with OR semantics:
- `bips_update_own_editable` — allow edit of own draft/pending/rejected/approved BIPs, but clamp post-image to draft/pending/pending_edit
- `bips_update_own_to_pending` — allow specific draft → pending promotion
- `bips_update_own_to_pending_edit` — allow specific approved → pending_edit promotion

This avoids a single mega-policy that is hard to audit, and makes each allowed transition explicit and testable in isolation.

---

## Anti-Patterns to Avoid

### Anti-Pattern: Using `getSession()` for Role Checks in Student Areas

The student area requires the same `getClaims()` discipline as the rest of the app. `getSession()` does not validate JWT signatures and would allow a crafted cookie to bypass the student-vs-coordinator routing logic.

### Anti-Pattern: Calling the Alert Matcher in a Server Action

Running the subscription matching synchronously inside `approveBipAction` would add DB query time to the admin's review cycle and could hit Vercel's function timeout if many subscribers match. The trigger-plus-queue-plus-Edge-Function architecture decouples the approval from the fan-out.

### Anti-Pattern: Reading `published_snapshot` as Source of Truth for Admin

Admins must see the **pending (in-review) content**, not the snapshot. The admin review route must query the live `bips` row columns, not the snapshot, so the reviewer sees what is being proposed. The snapshot is only used by the public-facing RSC pages.

### Anti-Pattern: Storing the Student Auth Path Behind the Same `/register` Route

A single `/register` page would need to branch on form state to determine which onboarding path to follow. This creates a cluttered UX and makes the role assignment conditional on client-side logic. Separate `/register` and `/register/student` routes are cleaner and allow each page to be independently A/B tested or linked from different CTAs.

### Anti-Pattern: Adding `pending_edit` to the Coordinator's Own `bips_select_own_or_approved` Policy Without Checking Ownership

The existing `bips_select_own_or_approved` policy for `authenticated` role shows a coordinator their own BIPs at any status — `pending_edit` is already covered by the `created_by = auth.uid()` branch. No change needed there.

---

## Build Order (Dependency-Ordered)

These workstreams have the following dependencies:

- **Student accounts must come first** — `saved_bips` and `bip_subscriptions` require the `student` role to exist and the `profiles.role` constraint to include it. The student dashboard is meaningless without auth.
- **`saved_bips` requires student accounts** — the table references `auth.users`; the UI requires the student route group.
- **`bip_subscriptions` requires student accounts** — same dependency chain.
- **Alert pipeline requires `bip_subscriptions`** — the matcher queries subscriptions. The trigger and Edge Function can be built independently of the UI but need the table to exist.
- **Edit-with-re-review is independent** of the student workstream — it touches coordinator and admin paths only. Can be built in parallel with the student workstream.

### Suggested Phase Order

```
Phase 1: Student Auth + Role Model
  - Migration 00015 (profiles.role; RLS fixes)
  - /register/student page
  - Modified signUpAction (role param)
  - Modified signInAction (student routing)
  - (student) route group + layout
  - Student dashboard shell
  - Middleware guard changes

Phase 2: Saved BIPs (depends on Phase 1)
  - Migration 00016 (saved_bips table + RLS)
  - lib/actions/saved-bips.ts
  - SavedBipCard + student dashboard saved section
  - localStorage → server migration on login

Phase 3: Alert Subscriptions + Pipeline (depends on Phase 2)
  - Migration 00017 (bip_subscriptions table + RLS)
  - Migration 00019 (bip_alert_queue + trigger + pg_cron)
  - lib/actions/subscriptions.ts
  - SubscriptionManager component
  - supabase/functions/send-bip-alerts Edge Function
  - BipAlertEmail template

Phase 4: Edit-Approved-with-Re-Review (parallel from Phase 1)
  - Migration 00018 (published_snapshot; status; RLS; trigger changes)
  - submitEditAction
  - approveEditAction + rejectEditAction (in admin-bips.ts)
  - Query layer snapshot coalescence
  - Admin queue: include pending_edit; BipEditDiff component
  - Coordinator edit page: "Submit Edit" CTA when status='approved'
```

Phases 1-3 are sequential (student chain). Phase 4 is independent and can be executed in parallel by a separate developer, or sequentially after Phase 3. A single-developer team should complete Phase 4 last.

---

## Integration Points

### External Services (v1.1 additions)

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Resend (existing) | `lib/email/send.ts` extended with `'bip-alert'` template | Called from Edge Function, not Server Action, for digest |
| Supabase pg_cron | SQL schedule via migration; invokes Edge Function via pg_net | Available on all Supabase plans including free tier |
| Supabase Edge Functions | `supabase/functions/send-bip-alerts/index.ts` | Deno runtime; uses SUPABASE_SERVICE_ROLE_KEY from Edge Function env |

### Internal Boundaries (v1.1 additions)

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Approval trigger → alert queue | Postgres trigger (same transaction) | No Server Action involvement |
| pg_cron → Edge Function | pg_net HTTP POST | Service-role key stored as Postgres config var |
| Edge Function → Supabase DB | `createClient` with service-role key | Correct use of service-role outside Next.js app |
| Edge Function → Resend | Direct Resend SDK call | `RESEND_API_KEY` from Deno.env |
| Student UI → saved_bips | Server Actions only | No direct browser Supabase client writes for mutations |
| Coordinator edit → pending_edit | Server Action `submitEditAction` | Writes snapshot + status in one UPDATE |
| Admin approve-edit → ISR | `revalidatePath` in `approveEditAction` | Same pattern as existing `approveBipAction` |

---

## Sources

- Supabase RLS documentation — [Row Level Security Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- Supabase Cron — [Schedule Recurring Jobs](https://supabase.com/docs/guides/cron)
- Supabase pg_cron extension — [pg_cron Docs](https://supabase.com/docs/guides/database/extensions/pg_cron)
- Supabase Edge Functions scheduling — [Schedule Functions](https://supabase.com/docs/guides/functions/schedule-functions)
- pg_net for HTTP from Postgres — [pg_net Docs](https://supabase.com/docs/guides/database/extensions/pg_net)
- Existing v1.0 architecture — `.planning/milestones/v1.0-research/ARCHITECTURE.md`
- Live migrations `00006`, `00010`, `00011`, `00012` — current RLS and trigger implementation
- Live `lib/actions/admin-bips.ts` — current approve/reject/admin-edit pattern
- Live `lib/actions/auth.ts` — current signup/signin flow

---
*Architecture research for: BipHub v1.1 — integration of student auth, saved BIPs, alert pipeline, edit-with-re-review*
*Researched: 2026-06-14*
