-- 00015_student_role.sql
-- Extends the role model to include 'student', closes two RLS security holes
-- (FOUN-07 role self-escalation, FOUN-08 BIP insert by any authenticated user),
-- and installs the Custom Access Token Hook so a brand-new student's first JWT
-- carries the correct app_metadata.role at issuance time.
--
-- Security decisions implemented:
--   D-05  profiles.role CHECK extended to ('coordinator','admin','student')
--   D-06  Custom Access Token Hook (PL/pgSQL, in-process) injects role at JWT issuance
--   D-07  handle_new_user trigger materialises the profiles row on auth.users INSERT;
--          coalesce(raw_user_meta_data->>'role','coordinator') preserves coordinator default
--   D-09  profiles_update_own_or_admin WITH CHECK: role column immutable for non-admins (FOUN-07)
--   D-12  bips_insert_coordinator requires role IN ('coordinator','admin') (FOUN-08)
--
-- STRIDE / Threat Register (05-PLAN.md):
--   T-05-01  EoP: role self-escalation via profiles UPDATE → fixed by D-09
--   T-05-02  EoP: student BIP insert via bips INSERT → fixed by D-12 + belt-and-suspenders in bip-submit.ts
--   T-05-03  Spoofing / null-role: first JWT has no role → fixed by D-06 + D-07
--   T-05-04  EoP: direct invocation of hook fn → revoke from public,anon,authenticated
--   T-05-05  Tampering: re-issued magic link overwrites existing role → on conflict do nothing

-- ============================================================
-- (1) Extend profiles.role CHECK to include 'student'  (D-05)
-- ============================================================

alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('coordinator', 'admin', 'student'));

-- ============================================================
-- (2) handle_new_user trigger  (D-07)
-- Materialises a profiles row in the SAME transaction as the auth.users INSERT
-- so the Custom Access Token Hook can read profiles.role at first JWT issuance.
-- coalesce(raw_user_meta_data->>'role','coordinator') defaults to coordinator
-- when the signup flow passes no data.role (existing coordinator signUp behaviour).
-- on conflict do nothing: a re-issued magic link on an existing email never
-- overwrites that account's role (D-07 one-role-per-account invariant, T-05-05).
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'coordinator')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- (3) Custom Access Token Hook  (D-06)
-- Fires inside the Supabase Auth engine before the JWT is signed.
-- Reads profiles.role and injects it into claims.app_metadata.role,
-- guaranteeing the first token carries the correct role (closes Pitfall 1).
-- Function is STABLE: reads DB state, does not modify it.
-- Grants scoped exclusively to supabase_auth_admin (T-05-04).
-- This hook is ADDITIVE to the existing sync_role_to_app_metadata() trigger
-- (00002/00008). The trigger keeps raw_app_meta_data in sync; the hook
-- guarantees the first JWT has the role even before the trigger has run.
-- ============================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims    jsonb;
  user_role text;
begin
  select role into user_role
    from public.profiles
   where id = (event->>'user_id')::uuid;

  claims := event->'claims';

  if jsonb_typeof(claims->'app_metadata') is null then
    claims := jsonb_set(claims, '{app_metadata}', '{}');
  end if;

  if user_role is not null then
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role));
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from public, anon, authenticated;
grant select on table public.profiles to supabase_auth_admin;

-- ============================================================
-- (4) Tighten bips_insert_coordinator  (D-12 / FOUN-08)
-- Current policy (00006) only checks auth.uid() = created_by.
-- With the student role, any authenticated user could insert a BIP row.
-- Replacement requires role IN ('coordinator','admin') in addition to
-- ownership — belt-and-suspenders alongside the Server Action assertion
-- added to lib/actions/bip-submit.ts (T-05-02).
-- ============================================================

drop policy if exists "bips_insert_coordinator" on public.bips;

create policy "bips_insert_coordinator"
  on public.bips for insert
  to authenticated
  with check (
    (select auth.uid()) = created_by
    and (select auth.jwt() -> 'app_metadata' ->> 'role') in ('coordinator', 'admin')
  );

-- ============================================================
-- (5) Role-stable profiles_update_own_or_admin  (D-09 / FOUN-07)
-- Current policy (00006) WITH CHECK only enforces row identity (id = auth.uid())
-- — it does NOT prevent a user from changing their own role column.
-- A student could send PATCH /rest/v1/profiles?id=eq.{id} with role='coordinator'.
-- Replacement WITH CHECK: for non-admins the proposed post-image role must equal
-- the current DB role, making role self-escalation structurally impossible.
-- Admins bypass via the OR branch.
-- CLAUDE.md never-do: UPDATE policy MUST have BOTH USING and WITH CHECK.
-- ============================================================

drop policy if exists "profiles_update_own_or_admin" on public.profiles;

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  to authenticated
  using (
    (select auth.uid()) = id
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    (
      (select auth.uid()) = id
      and role = (select role from public.profiles where id = (select auth.uid()))
    )
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
