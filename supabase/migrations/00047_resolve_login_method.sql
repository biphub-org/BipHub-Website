-- 00047_resolve_login_method.sql
-- Unified email-first login: resolve which auth method an email should use.
-- SECURITY DEFINER so anon/authenticated can check without service-role key.
-- Returns 'student' | 'coordinator' | 'admin' | null (unknown email).
-- No PII leaked beyond role; caller already knows the email it queried.

create or replace function public.resolve_login_method(p_email text)
returns text
language plpgsql
security definer
set search_path = public, auth
stable
as $$
declare
  v_role text;
begin
  if p_email is null or btrim(p_email) = '' then
    return null;
  end if;

  select p.role into v_role
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower(btrim(p_email))
  limit 1;

  return v_role;
end;
$$;

revoke all on function public.resolve_login_method(text) from public;
grant execute on function public.resolve_login_method(text) to anon, authenticated, service_role;
