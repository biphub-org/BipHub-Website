-- 00049_bip_alert_preferences_isced.sql
-- Add ISCED codes as a separate alert dimension, distinct from the 12 BipHub study fields.
-- Order in UI: Countries first, Fields second, ISCED third.

alter table public.bip_alert_preferences
  add column if not exists isced_codes text[] not null default '{}';

create index if not exists bip_alert_preferences_isced_codes_gin on public.bip_alert_preferences using gin (isced_codes);

-- Expand the at-least-one-dimension check to include isced_codes.
-- Drop the old check by name if it exists (auto-generated name varies), recreate with known name.
-- Postgres names the check from the table definition; we use a new explicit constraint.
do $$
begin
  -- Remove any existing single-dimension check that only covered fields/countries.
  -- The constraint from 00048 is unnamed in some dumps, so try both.
  alter table public.bip_alert_preferences drop constraint if exists bip_alert_preferences_check;
  alter table public.bip_alert_preferences drop constraint if exists bip_alert_preferences_fields_countries_check;
exception when others then null;
end $$;

alter table public.bip_alert_preferences
  add constraint bip_alert_preferences_at_least_one
  check (
    array_length(fields, 1) is not null
    or array_length(countries, 1) is not null
    or array_length(isced_codes, 1) is not null
  );
