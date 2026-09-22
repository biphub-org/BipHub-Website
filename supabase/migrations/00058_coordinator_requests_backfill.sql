-- 00058_coordinator_requests_backfill.sql
--
-- The hosted database received the coordinator_requests table out-of-band
-- (before 00054 was pushed), so `db push` of 00054 fails with
-- "relation coordinator_requests already exists". Live shape was verified
-- to already match the post-00055 state (no contact_email column), and the
-- request flow works end-to-end (anon INSERT + admin SELECT/UPDATE), so
-- 00054/00055 are marked applied via `migration repair` and this migration
-- re-asserts 00054's full end-state IDEMPOTENTLY to close any gap:
--   - RLS enabled (idempotent statement)
--   - partial unique index (IF NOT EXISTS)
--   - the three policies (DROP IF EXISTS + CREATE)
--   - the extended resolve_login_method (CREATE OR REPLACE preserves grants)
--
-- Every statement here is safe to run whether or not the object exists.

-- RLS (idempotent — no error when already enabled).
alter table public.coordinator_requests enable row level security;

-- One live request per email, case-insensitive.
create unique index if not exists coordinator_requests_pending_email_uidx
  on public.coordinator_requests (lower(email))
  where status = 'pending';

-- Request form is usable signed-out; rows invisible without admin role.
drop policy if exists "coordinator_requests_insert_public" on public.coordinator_requests;
create policy "coordinator_requests_insert_public"
  on public.coordinator_requests for insert
  to anon, authenticated
  with check (true);

drop policy if exists "coordinator_requests_select_admin" on public.coordinator_requests;
create policy "coordinator_requests_select_admin"
  on public.coordinator_requests for select
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "coordinator_requests_update_admin" on public.coordinator_requests;
create policy "coordinator_requests_update_admin"
  on public.coordinator_requests for update
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- resolve_login_method with the coordinator-request fallback (00054 end-state).
-- CREATE OR REPLACE preserves the anon/authenticated grants from 00047.
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
