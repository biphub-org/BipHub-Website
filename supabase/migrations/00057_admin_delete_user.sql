-- 00057_admin_delete_user.sql
-- Admin-driven user removal (students + coordinators).
--
-- The (student) layout + /auth/force-signout already handle the ghost session
-- of an admin-deleted user; this RPC is the missing removal primitive.
--
-- Semantics mirror public.delete_my_account (00013) so self-deletion and
-- admin-removal leave the directory in the same shape:
--   1. Anonymize approved BIPs owned by the target (contact_name='—',
--      contact_email=NULL) — directory content survives, PII is removed.
--   2. Hard-delete the target's non-public BIPs. Unlike delete_my_account
--      (written before 00018), this also covers 'changes_requested', which
--      is likewise non-public; leaving it orphaned (created_by SET NULL)
--      would strand an ownerless row in the admin queue.
--   3. Delete the auth.users row. The FK cascade chain then fires:
--        - profiles.id ON DELETE CASCADE → profiles row removed
--        - surviving bips.created_by ON DELETE SET NULL → anonymized
--          approved BIPs survive
--        - bip_status_history.actor_id / coordinator_requests.reviewed_by /
--          admin_export_audit.admin_id ON DELETE SET NULL → audit preserved
--        - saved_bips / bip_subscriptions / deliveries / alert preferences /
--          bip_edits(created_by) ON DELETE CASCADE → user-owned rows removed
--
-- Security properties:
--   - SECURITY DEFINER with set search_path = public, auth, pg_temp prevents
--     search-path-injection privilege escalation.
--   - Caller must carry app_metadata.role = 'admin' in the JWT; the function
--     reads auth.jwt()/auth.uid() internally — NO caller parameter, so the
--     caller cannot spoof admin rights.
--   - Only 'student'/'coordinator' targets are removable: admin accounts
--     (including the caller's own) are rejected, protecting the admin set.
--   - Atomic: any failure mid-flight rolls back the entire chain.
--   - EXECUTE granted to 'authenticated' only; revoked from public and anon.
--     (Admins are authenticated users; the JWT claim is the gate.)

create or replace function public.admin_delete_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  caller_role text;
  target_role text;
begin
  caller_role := (select auth.jwt() -> 'app_metadata' ->> 'role');
  if caller_role is distinct from 'admin' then
    raise exception 'admin_delete_user: forbidden' using errcode = '42501';
  end if;

  if target_user_id is null then
    raise exception 'admin_delete_user: missing target' using errcode = '22004';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'admin_delete_user: cannot remove your own account'
      using errcode = '42501';
  end if;

  select role into target_role from public.profiles where id = target_user_id;
  if not found then
    raise exception 'admin_delete_user: user not found' using errcode = '02000';
  end if;
  if target_role not in ('student', 'coordinator') then
    raise exception 'admin_delete_user: only student and coordinator accounts can be removed'
      using errcode = '42501';
  end if;

  -- Step 1: anonymize approved BIPs (preserve directory content; remove PII).
  update public.bips
    set contact_name  = '—',
        contact_email = null
    where created_by = target_user_id
      and status = 'approved';

  -- Step 2: hard-delete non-public BIPs (cascade removes partner rows).
  delete from public.bips
    where created_by = target_user_id
      and status in ('draft', 'pending', 'rejected', 'changes_requested');

  -- Step 3: delete the auth.users row. Cascades remove the profiles row;
  -- bips.created_by / bip_status_history.actor_id are set NULL.
  delete from auth.users where id = target_user_id;
end;
$$;

-- Lock down execution.
revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;
