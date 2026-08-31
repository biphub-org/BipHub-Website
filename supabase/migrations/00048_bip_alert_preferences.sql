-- 00048_bip_alert_preferences.sql
-- Replace per-row subscriptions (bip_subscriptions, 5-cap, single field/country)
-- with a single preferences row per student: multiple fields + multiple countries.
-- ALRT new model: No subscriptions, no limits. Student picks any combination
-- of countries / ISCED fields and hits Apply. One row per user, upsert.

-- 1. New preferences table — single row per user, arrays for multi-select.
create table if not exists public.bip_alert_preferences (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  fields       text[] not null default '{}',
  countries    text[] not null default '{}',
  frequency    text not null default 'weekly' check (frequency in ('weekly','daily')),
  consent_text text not null,
  updated_at   timestamptz not null default now(),
  -- at least one of fields or countries must be non-empty
  check (
    array_length(fields, 1) is not null or array_length(countries, 1) is not null
  )
);

alter table public.bip_alert_preferences enable row level security;

create index if not exists bip_alert_preferences_fields_gin on public.bip_alert_preferences using gin (fields);
create index if not exists bip_alert_preferences_countries_gin on public.bip_alert_preferences using gin (countries);

-- Owner-only policies (mirrors bip_subscriptions). WITH CHECK prevents user_id reassignment.
drop policy if exists "bip_alert_preferences_select_own" on public.bip_alert_preferences;
create policy "bip_alert_preferences_select_own"
  on public.bip_alert_preferences for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "bip_alert_preferences_insert_own" on public.bip_alert_preferences;
create policy "bip_alert_preferences_insert_own"
  on public.bip_alert_preferences for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "bip_alert_preferences_update_own" on public.bip_alert_preferences;
create policy "bip_alert_preferences_update_own"
  on public.bip_alert_preferences for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "bip_alert_preferences_delete_own" on public.bip_alert_preferences;
create policy "bip_alert_preferences_delete_own"
  on public.bip_alert_preferences for delete
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "bip_alert_preferences_select_admin" on public.bip_alert_preferences;
create policy "bip_alert_preferences_select_admin"
  on public.bip_alert_preferences for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- 2. Migrate existing subscriptions into the new model by merging per-user rows.
-- For each user, union all field values and all country values into arrays,
-- keeping the most recent frequency (by max created_at) and earliest consent.
insert into public.bip_alert_preferences (user_id, fields, countries, frequency, consent_text, updated_at)
select
  user_id,
  coalesce(array_agg(distinct field) filter (where field is not null), '{}'),
  coalesce(array_agg(distinct upper(country)) filter (where country is not null), '{}'),
  (array_agg(frequency order by created_at desc))[1],
  min(consent_text),
  max(created_at)
from public.bip_subscriptions
group by user_id
on conflict (user_id) do nothing;
