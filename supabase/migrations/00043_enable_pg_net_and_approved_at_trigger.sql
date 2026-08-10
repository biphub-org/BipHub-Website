-- 00043_enable_pg_net_and_approved_at_trigger.sql
-- Enable pg_net (HTTP from pg_cron → Edge Function) and make approved_at
-- authoritative: set once on pending→approved, never touched by edit-merge.
--
-- pg_net is a built-in Supabase Postgres extension — must be explicitly enabled
-- (CREATE EXTENSION + supabase/config.toml [db.extensions] pg_net = true for local parity).
-- pg_cron itself is pre-enabled on all Supabase tiers as of 2026 (STACK.md).

-- 1. pg_net extension (idempotent).
create extension if not exists pg_net with schema extensions;

-- 2. Trigger to set approved_at only on the pending→approved transition.
--    edit-merge (approveEditAction) updates other columns but never moves status
--    from non-approved to approved, so this trigger does not fire on edit-merge.
create or replace function public.set_approved_at()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if old.status is distinct from 'approved' and new.status = 'approved' then
    new.approved_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists bips_set_approved_at on public.bips;

create trigger bips_set_approved_at
  before update of status on public.bips
  for each row
  execute function public.set_approved_at();

-- 3. Ensure config.toml enables pg_net locally — this migration enables it in DB;
--    config.toml is updated separately (see plan 11-01) so `supabase start` parity holds.
--    No DDL needed here beyond the extension.
