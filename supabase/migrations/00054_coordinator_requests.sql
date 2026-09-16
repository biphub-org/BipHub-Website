-- 00054_coordinator_requests.sql
-- Coordinator access-request inbox: coordinators no longer self-register with
-- a password. They submit a request (onboarding details + login email), an
-- admin approves or rejects, and approved coordinators set their password
-- via a Supabase invite link.
--
-- Table design:
--   - One row per request; rejected/approved rows stay as decision history.
--   - Partial unique index on lower(email) WHERE pending: one live request
--     per email, case-insensitive. A rejected requester may file again.
--   - `reviewed_by` points at the deciding admin's profiles row.
--
-- RLS (PITFALLS Pitfall 4: enable immediately):
--   - INSERT is public (anon + authenticated): the request form is usable
--     signed-out. WITH CHECK (true) — abuse surface is one row per email,
--     and rows are invisible without the admin role (no public SELECT, so
--     the inbox cannot be enumerated).
--   - SELECT/UPDATE are admin-only. UPDATE carries BOTH using AND with
--     check (CLAUDE.md never-do).
--
-- resolve_login_method (00047) is extended: when no auth account matches the
-- email, the latest request status is returned ('pending' | 'approved' |
-- 'rejected') so the unified login can explain "under review" instead of
-- "no account found". Account roles still take precedence. Privileges are
-- preserved by CREATE OR REPLACE; the anon/authenticated grants from 00047
-- remain in force.

create table public.coordinator_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  contact_email text not null,
  university_id uuid references public.universities(id) on delete set null,
  country text,
  erasmus_code text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- PITFALLS Pitfall 4: enable RLS immediately
alter table public.coordinator_requests enable row level security;

create unique index coordinator_requests_pending_email_uidx
  on public.coordinator_requests (lower(email))
  where status = 'pending';

create policy "coordinator_requests_insert_public"
  on public.coordinator_requests for insert
  to anon, authenticated
  with check (true);

create policy "coordinator_requests_select_admin"
  on public.coordinator_requests for select
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- PITFALLS Pitfall 5: UPDATE policy MUST have BOTH using AND with check
create policy "coordinator_requests_update_admin"
  on public.coordinator_requests for update
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create or replace function public.resolve_login_method(p_email text)
returns text
language plpgsql
security definer
set search_path = public, auth
stable
as $$
declare
  v_role text;
  v_request_status text;
begin
  if p_email is null or btrim(p_email) = '' then
    return null;
  end if;

  select p.role into v_role
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower(btrim(p_email))
  limit 1;

  if v_role is not null then
    return v_role;
  end if;

  -- No account for this email: surface the latest coordinator request so
  -- sign-in can answer "under review" / "rejected" / "approved".
  select r.status into v_request_status
  from public.coordinator_requests r
  where lower(r.email) = lower(btrim(p_email))
  order by r.created_at desc
  limit 1;

  return v_request_status;
end;
$$;
