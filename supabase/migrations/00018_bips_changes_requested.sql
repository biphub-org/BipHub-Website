-- 00018_bips_changes_requested.sql
-- Phase 8 (Edit-Approved + Request-Changes). Extends the bips state machine with
-- the 'changes_requested' status for the new-submission re-review loop (D-06a).
--
-- Decisions:
--   D-06a  'changes_requested' is a new bips.status value for new-submission path
--          (admin sends the BIP back to coordinator with a note, without rejecting).
--          The public read policy from 00001 stays unchanged: using (status='approved').
--          changes_requested BIPs are NOT publicly visible — same as pending/draft.
--   D-14   New coordinator UPDATE policy bips_update_own_changes_requested_to_pending
--          follows the split-policy pattern from 00012 (USING=pre, WITH CHECK=post).
--          Both USING and WITH CHECK present (CLAUDE.md never-do).
--
-- Also extends log_bip_status_change() (00010) for the two new bips transitions:
--   pending → changes_requested : trigger returns early; Server Action writes audit row with note.
--   changes_requested → pending : trigger writes 'resubmit' audit row (coordinator-initiated).
--
-- Do NOT touch the public-approved-read policy from 00001 — EDIT-02 guarantee.

-- Step 1: extend bips.status CHECK to include 'changes_requested'.
-- PostgreSQL names the inline CHECK from 00001 as 'bips_status_check'.
alter table public.bips
  drop constraint if exists bips_status_check,
  add constraint bips_status_check
    check (status in ('draft', 'pending', 'approved', 'rejected', 'changes_requested'));

-- Step 2: coordinator policy for changes_requested → pending resubmit (D-06a).
-- Mirrors the bips_update_own_to_pending pattern from 00012.
-- USING constrains pre-image to 'changes_requested'; WITH CHECK constrains post-image to 'pending'.
create policy "bips_update_own_changes_requested_to_pending"
  on public.bips for update
  to authenticated
  using (
    (select auth.uid()) = created_by
    and status = 'changes_requested'
  )
  with check (
    (select auth.uid()) = created_by
    and status = 'pending'
  );

-- Step 3: extend log_bip_status_change() for the new bips transitions.
-- Full function body is reproduced (create or replace) so the trigger remains wired.
-- Existing branches are unchanged. Two elsif clauses are added before the final else.
create or replace function public.log_bip_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action_kind text;
begin
  -- Only log when status actually changes
  if (tg_op = 'INSERT' and new.status is not null) then
    v_action_kind := 'submit';  -- initial create from wizard step 5 path
    if (new.status = 'draft') then
      return new;  -- draft create from wizard step 1 is NOT logged
    end if;
  elsif (tg_op = 'UPDATE' and old.status is distinct from new.status) then
    -- Identify the action_kind from the (from, to) tuple
    if (old.status = 'draft' and new.status = 'pending') then
      v_action_kind := 'submit';
    elsif (old.status = 'rejected' and new.status = 'draft') then
      v_action_kind := 'resubmit';
    elsif (old.status = 'pending' and new.status = 'draft') then
      v_action_kind := 'withdraw';
    -- Phase 8 additions:
    elsif (old.status = 'pending' and new.status = 'changes_requested') then
      -- Admin-initiated; Server Action writes its own explicit audit row with the note.
      -- Return early without double-logging (Option B from 08-RESEARCH.md Pitfall 8).
      return new;
    elsif (old.status = 'changes_requested' and new.status = 'pending') then
      v_action_kind := 'resubmit';  -- coordinator resubmit after changes requested
    else
      -- admin transitions (pending→approved/rejected, approved→rejected)
      -- are logged by the Server Action itself with explicit `note` text;
      -- the trigger should NOT double-log them.
      return new;
    end if;
  else
    return new;
  end if;

  insert into public.bip_status_history
    (bip_id, from_status, to_status, actor_id, action_kind)
  values
    (new.id, case when tg_op = 'UPDATE' then old.status else null end, new.status, (select auth.uid()), v_action_kind);

  return new;
end;
$$;
