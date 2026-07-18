-- 00023_fix_profiles_update_recursion.sql
-- Fix: infinite recursion (Postgres 42P17) in the profiles UPDATE policy.
--
-- Root cause
--   Migration 00015 (D-09 / FOUN-07) hardened profiles_update_own_or_admin to
--   make the `role` column immutable for non-admins. Its WITH CHECK compared the
--   proposed role against a self-SELECT ON THE SAME TABLE:
--
--       role = (select role from public.profiles where id = (select auth.uid()))
--
--   Referencing public.profiles inside a policy ON public.profiles re-invokes the
--   policy set recursively, which Postgres aborts with
--   `42P17 infinite recursion detected in policy for relation "profiles"`.
--
--   Because handle_new_user (00015 D-07) materialises the profiles row at signup,
--   the onboarding save (lib/actions/profile.ts saveProfileAction upsert) always
--   runs as INSERT ... ON CONFLICT DO UPDATE — hitting the UPDATE WITH CHECK and
--   therefore failing 500 for every coordinator completing their profile. Automated
--   tests missed it because they seed profiles with the service role, which bypasses
--   RLS entirely.
--
-- Fix
--   Compare the proposed role against auth.jwt() -> 'app_metadata' ->> 'role'
--   instead of a self-SELECT. app_metadata.role is server-controlled: it is
--   mirrored from profiles.role by sync_role_to_app_metadata() (00002) and injected
--   into the JWT by the Custom Access Token Hook (00015 D-06). It cannot be modified
--   by the user, so role self-escalation (T-05-01 / FOUN-07) stays structurally
--   impossible — and it is the SAME trusted claim this policy's USING clause and
--   every admin branch across the RLS set already read. No table self-reference, no
--   recursion.
--
--   Security equivalence:
--     - coordinator saving own profile, role unchanged  -> role == jwt role  -> allowed
--     - non-admin sets role='admin'                      -> 'admin' != jwt role -> blocked
--     - admin edits any profile                          -> admin OR-branch      -> allowed
--
-- CLAUDE.md never-do: UPDATE policy MUST declare BOTH USING and WITH CHECK.

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
      and role = (select auth.jwt() -> 'app_metadata' ->> 'role')
    )
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
