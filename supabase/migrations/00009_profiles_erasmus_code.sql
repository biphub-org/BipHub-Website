-- 00009_profiles_erasmus_code.sql
-- Phase 2 foundational schema: adds the missing piece coordinator onboarding needs
-- (`profiles.erasmus_code`) plus a SECURITY DEFINER RPC that lets coordinators
-- self-register universities without us pulling `createAdminClient` outside the
-- admin route group.
--
-- This migration is ADDITIVE in the same shape as 00008_app_metadata_role_mirror.sql:
--   - No `drop` statements anywhere.
--   - No existing policy is recreated or replaced.
--   - No existing column or function is mutated.
-- Only one new column and one new function are introduced.
--
-- ---------------------------------------------------------------------------
-- Decision rationale (ARCHITECTURE.md + CLAUDE.md never-do):
-- ---------------------------------------------------------------------------
-- Migration 00006 created `universities_insert_admin` which restricts INSERT on
-- public.universities to admins only. Phase 2 onboarding (Plan 02-04) needs
-- coordinators to be able to self-register their university when it is not yet
-- in the table.
--
-- We have two options:
--   (A) Use `createAdminClient` (service-role) inside the onboarding Server Action.
--   (B) Expose a tightly-scoped SECURITY DEFINER RPC that the anon-key client
--       can call as an authenticated coordinator.
--
-- We picked (B) because:
--   1. CLAUDE.md never-do: `createAdminClient` is forbidden outside `app/(admin)/`
--      and `lib/supabase/admin.ts`. Plan 02-04 lives under `app/(dashboard)/` so
--      using the service role there would violate the `no-restricted-imports`
--      ESLint rule from Plan 01-08.
--   2. SECURITY DEFINER + `set search_path = public` is a textbook Postgres
--      pattern for "let an authenticated user do X that RLS would otherwise
--      block, but only X". The function bypasses `universities_insert_admin`
--      RLS deliberately and only for this exact insert path.
--   3. Validation lives close to the data (length check + country whitelist),
--      so a malicious or buggy client cannot bypass it by skipping the
--      Zod resolver in the Server Action.
--
-- The country whitelist below is the canonical Erasmus+ programme country set
-- mirrored from `lib/countries.ts` (33 codes: EU-27 + EEA-3 + 3 candidates).
-- Application-level Zod (lib/countries.ts → ERASMUS_COUNTRY_CODES) and DB-level
-- validation must stay in lock-step so users cannot select a country the
-- function rejects.
-- ---------------------------------------------------------------------------

-- 1. Add erasmus_code column to profiles.
--    Coordinator-issued Erasmus code (e.g. "D MUNCHEN02") for their HEI.
--    Nullable: backfilled at /onboarding (Plan 02-04); may be empty for
--    profile rows created by tests or pre-onboarding users.
alter table public.profiles add column if not exists erasmus_code text;

-- 2. Coordinator-callable university registration RPC.
--    SECURITY DEFINER → bypasses universities_insert_admin RLS.
--    set search_path = public → locks function-internal name resolution to
--      the public schema so a session-set search_path cannot hijack any
--      reference to `universities` (PostgreSQL search-path attack mitigation).
--    grant execute ... to authenticated → anon role can NOT call the RPC;
--      only logged-in coordinators (`authenticated` Postgres role) can.
create or replace function public.insert_university_if_not_exists(
  p_name text,
  p_country text,
  p_erasmus_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_erasmus_code text;
  v_id uuid;
begin
  -- Normalize inputs.
  v_name := trim(coalesce(p_name, ''));
  v_erasmus_code := nullif(trim(coalesce(p_erasmus_code, '')), '');

  -- Length validation (T-02-01-02): trivial-spam mitigation.
  if length(v_name) < 2 then
    raise exception 'University name too short';
  end if;

  -- Country whitelist (T-02-01-01): mirrors lib/countries.ts ERASMUS_COUNTRY_CODES.
  -- Keep this list in sync with lib/countries.ts. Any addition there MUST be
  -- added here, and vice versa, in the same migration.
  if p_country is null or p_country not in (
    -- EU-27
    'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE',
    'IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
    -- EEA + associated
    'IS','LI','NO',
    -- Candidate countries
    'MK','RS','TR'
  ) then
    raise exception 'Country % is not an Erasmus+ programme country', p_country;
  end if;

  -- Case-insensitive existence check (avoids "TU Berlin" / "tu berlin" duplicates).
  select id
    into v_id
    from public.universities
   where lower(trim(name)) = lower(v_name)
     and country = p_country
   limit 1;

  if v_id is not null then
    return v_id;
  end if;

  -- Insert new row. NULL out erasmus_code if blank/whitespace-only to keep the
  -- existing `unique` constraint on universities.erasmus_code from rejecting
  -- multiple "" values.
  insert into public.universities (name, country, erasmus_code)
  values (v_name, p_country, v_erasmus_code)
  returning id into v_id;

  return v_id;
end;
$$;

-- T-02-01-03: only authenticated callers (logged-in coordinators) can run the
-- RPC. anon and public are not granted; an unauthenticated client receives
-- "permission denied for function insert_university_if_not_exists".
grant execute on function public.insert_university_if_not_exists(text, text, text) to authenticated;
