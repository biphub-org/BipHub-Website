-- 00042_bip_subscriptions_and_deliveries.sql
-- Phase 11 (Alert Subscriptions). Two new PII tables + approved_at marker.
--
-- Decisions:
--   ALRT-01  Subscriptions match field and/or country (at least one required).
--   ALRT-02  Frequency weekly (default) / daily.
--   ALRT-08  Consent text captured at creation (explicit).
--   ALRT-09  5-cap enforced in Server Action, not CHECK (plan 11-04).
--   ALRT-07  Idempotency via bips.approved_at + unique(bip_id,user_id) on deliveries.
--   FOUN-11  RLS: bip_subscriptions owner USING + WITH CHECK (no user_id reassign);
--            bip_alert_deliveries RLS enabled, no public policies (service-role only).
--   FOUN-12  ON DELETE CASCADE for both tables (FK to auth.users).
--   Pitfall 3 Approved_at set once on pending→approved, never bumped by edit-merge.

-- 1. approved_at marker on bips (high-water mark for digest anti-join).
alter table public.bips
  add column if not exists approved_at timestamptz;

-- 2. bip_subscriptions — student digest subscriptions.
create table if not exists public.bip_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  field        text,
  country      text check (country is null or char_length(country) = 2),
  frequency    text not null default 'weekly' check (frequency in ('weekly','daily')),
  consent_text text not null,
  created_at   timestamptz not null default now(),
  -- at least one of field/country must be set (ALRT-01)
  check (field is not null or country is not null)
);

alter table public.bip_subscriptions enable row level security;

create index if not exists bip_subscriptions_user_id_idx on public.bip_subscriptions (user_id);
create index if not exists bip_subscriptions_field_idx on public.bip_subscriptions (field);
create index if not exists bip_subscriptions_country_idx on public.bip_subscriptions (country);

-- Owner-only policies (authenticated). WITH CHECK prevents user_id reassignment (CLAUDE.md).
drop policy if exists "bip_subscriptions_select_own" on public.bip_subscriptions;
create policy "bip_subscriptions_select_own"
  on public.bip_subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "bip_subscriptions_insert_own" on public.bip_subscriptions;
create policy "bip_subscriptions_insert_own"
  on public.bip_subscriptions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "bip_subscriptions_update_own" on public.bip_subscriptions;
create policy "bip_subscriptions_update_own"
  on public.bip_subscriptions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "bip_subscriptions_delete_own" on public.bip_subscriptions;
create policy "bip_subscriptions_delete_own"
  on public.bip_subscriptions for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "bip_subscriptions_select_admin" on public.bip_subscriptions;
create policy "bip_subscriptions_select_admin"
  on public.bip_subscriptions for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 3. bip_alert_deliveries — idempotency log (service-role only, written by Edge Function).
create table if not exists public.bip_alert_deliveries (
  id           uuid primary key default gen_random_uuid(),
  bip_id       uuid not null references public.bips(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  unique (bip_id, user_id)
);

alter table public.bip_alert_deliveries enable row level security;

create index if not exists bip_alert_deliveries_user_id_idx on public.bip_alert_deliveries (user_id);
create index if not exists bip_alert_deliveries_bip_id_idx on public.bip_alert_deliveries (bip_id);

-- Intentionally NO public policies — service-role only (FOUN-11). RLS is enabled
-- so anon/authenticated cannot read/write; Edge Function uses service_role key.

-- 4. Backfill approved_at for already-approved BIPs (conservative: updated_at).
update public.bips
  set approved_at = updated_at
  where status = 'approved'
    and approved_at is null;
