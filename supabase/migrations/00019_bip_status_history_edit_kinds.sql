-- 00019_bip_status_history_edit_kinds.sql
-- Phase 8 (Edit-Approved + Request-Changes). Extends bip_status_history with new
-- edit-specific action_kind values (D-12/EDIT-08) and adds a SECURITY DEFINER
-- trigger on bip_edits to log coordinator-initiated transitions without requiring
-- admin-role INSERT privilege on bip_status_history (Pitfall 7).
--
-- Decisions:
--   D-12   action_kind CHECK extended with 5 new values:
--            submit_edit    — coordinator submits an edit for an approved BIP
--            resubmit_edit  — coordinator resubmits after changes_requested on bip_edits
--            approve_edit   — admin approves the edit (merge into bips occurs)
--            reject_edit    — admin rejects the edit (bips unchanged)
--            request_changes — admin requests changes on a new submission OR edit
--   Pitfall 7 The existing bsh_insert_admin RLS policy allows INSERT only when
--            app_metadata.role='admin'. Coordinator-initiated audit writes (submit_edit,
--            resubmit_edit) MUST come from a SECURITY DEFINER trigger that runs as
--            postgres, bypassing the role check. Admin audit rows are still written
--            explicitly by Server Actions (admin JWT passes bsh_insert_admin).
--   Pitfall 8 Double-logging prevention: trigger handles ONLY coordinator-initiated
--            transitions (submit_edit, resubmit_edit). Admin transitions return early
--            so the trigger never fires for those paths.

-- Step 1: extend action_kind CHECK with Phase 8 edit kinds.
-- PostgreSQL names the inline CHECK from 00010 as 'bip_status_history_action_kind_check'.
alter table public.bip_status_history
  drop constraint if exists bip_status_history_action_kind_check,
  add constraint bip_status_history_action_kind_check
    check (action_kind in (
      'submit', 'approve', 'reject', 'resubmit', 'admin_edit', 'withdraw',
      -- Phase 8 edit kinds (D-12):
      'submit_edit',      -- coordinator submits edit for approved BIP
      'resubmit_edit',    -- coordinator resubmits after changes_requested on bip_edits
      'approve_edit',     -- admin approves edit (merge occurs)
      'reject_edit',      -- admin rejects edit
      'request_changes'   -- admin requests changes on new submission OR edit
    ));

-- Step 2: SECURITY DEFINER trigger function for bip_edits coordinator transitions.
-- Runs as postgres so it can INSERT into bip_status_history despite bsh_insert_admin RLS.
-- Only handles coordinator-initiated transitions (submit_edit, resubmit_edit).
-- Admin transitions (approve_edit, reject_edit, request_changes) are logged explicitly
-- by the Server Action (same pattern as the existing bips trigger in 00010).
create or replace function public.log_bip_edit_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action_kind text;
begin
  if (tg_op = 'INSERT' and new.status = 'pending') then
    v_action_kind := 'submit_edit';  -- coordinator submits new edit for approved BIP
  elsif (tg_op = 'UPDATE' and old.status is distinct from new.status) then
    if (old.status = 'changes_requested' and new.status = 'pending') then
      v_action_kind := 'resubmit_edit';  -- coordinator resubmits after changes requested
    else
      -- admin transitions logged explicitly by Server Action; trigger returns early
      return new;
    end if;
  else
    return new;
  end if;

  insert into public.bip_status_history
    (bip_id, from_status, to_status, actor_id, action_kind)
  values
    (new.bip_id,
     case when tg_op = 'UPDATE' then old.status else null end,
     new.status,
     (select auth.uid()),
     v_action_kind);

  return new;
end;
$$;

-- Step 3: attach the trigger to bip_edits.
create trigger bip_edits_status_change_audit
  after insert or update of status on public.bip_edits
  for each row
  execute function public.log_bip_edit_status_change();

-- Step 4: prevent direct calls to the function from unprivileged roles.
-- Only the trigger (running as postgres) should invoke it.
revoke execute on function public.log_bip_edit_status_change() from public, anon, authenticated;
