-- 00010_bip_status_history.sql
-- Phase 3 — Append-only audit log for BIP status transitions (ADMN-08).
--
-- Schema source: 03-CONTEXT.md D-07.
-- RLS source:    03-CONTEXT.md D-08.
--
-- Security notes:
--   * No UPDATE or DELETE policies are defined — audit immutability (D-08).
--   * `bip_id` and `actor_id` use ON DELETE SET NULL so the audit trail
--     survives BIP or profile deletion (T-03-07 mitigation: repudiation).
--   * INSERT is admin-only via the regular `createServerClient` — RLS
--     enforces this; `createAdminClient` is NOT needed (CLAUDE.md
--     never-do: service-role isolation).

create table public.bip_status_history (
  id          uuid primary key default gen_random_uuid(),
  bip_id      uuid references public.bips(id) on delete set null,
  from_status text,
  to_status   text not null,
  actor_id    uuid references public.profiles(id) on delete set null,
  note        text,
  action_kind text not null check (
    action_kind in ('submit','approve','reject','resubmit','admin_edit','withdraw')
  ),
  created_at  timestamptz not null default now()
);

-- Indexes for common access patterns
create index bip_status_history_bip_id_created_at_idx
  on public.bip_status_history (bip_id, created_at desc);
create index bip_status_history_action_kind_created_at_idx
  on public.bip_status_history (action_kind, created_at desc);

alter table public.bip_status_history enable row level security;

-- SELECT: admins see all; coordinators see history rows for their own BIPs.
create policy "bsh_select_own_or_admin"
  on public.bip_status_history for select
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or exists (
      select 1 from public.bips
      where bips.id = bip_status_history.bip_id
        and bips.created_by = (select auth.uid())
    )
  );

-- INSERT: admin-only. Server Actions that perform coordinator-initiated
-- transitions (submit, resubmit, withdraw) MUST be executed with the
-- admin role bypass OR rewritten as DB triggers. For Phase 3, the only
-- coordinator-side insert is `submit` (Plan 03-05 extends the existing
-- submitBipAction via a trigger OR a parallel admin-role audit insert).
-- See follow-up note below.
create policy "bsh_insert_admin"
  on public.bip_status_history for insert
  to authenticated
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Coordinator-initiated audit inserts (submit / withdraw / resubmit):
-- These are written by a trigger on `bips` so the coordinator's JWT does
-- NOT need INSERT privilege on bip_status_history. The trigger runs with
-- the table owner's privileges (postgres) and is SECURITY DEFINER.
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

create trigger bips_status_change_audit
  after insert or update of status on public.bips
  for each row
  execute function public.log_bip_status_change();

-- Lock down the function: only the trigger should call it.
revoke execute on function public.log_bip_status_change() from public, anon, authenticated;
