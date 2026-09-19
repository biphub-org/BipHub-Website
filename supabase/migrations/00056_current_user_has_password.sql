-- 00056_current_user_has_password.sql
--
-- Invite-acceptance hole: clicking a coordinator invite link runs verifyOtp,
-- which establishes a FULL session before any password is set. With no other
-- gate, an approved coordinator who never sets a password can use /dashboard.
--
-- GoTrue leaves auth.users.encrypted_password empty ('') until the first
-- password is set (invite / magic-link / SSO users), so that column is the
-- authoritative signal. App code cannot read auth.users directly, hence this
-- SECURITY DEFINER helper (same pattern as 00047 resolve_login_method).
-- Returns false when there is no session or no auth row, so callers can
-- fail open (log + allow) rather than lock everyone out if the function
-- itself errors.

create or replace function public.current_user_has_password()
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select coalesce(
    (select u.encrypted_password <> '' from auth.users u where u.id = auth.uid()),
    false
  );
$$;

revoke all on function public.current_user_has_password() from public;
grant execute on function public.current_user_has_password() to authenticated, service_role;
