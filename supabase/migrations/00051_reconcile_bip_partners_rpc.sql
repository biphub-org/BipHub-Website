-- 00051_reconcile_bip_partners_rpc.sql
--
-- Atomic partner-set replacement for bip_partner_universities.
--
-- Why: every writer (saveDraftAction, submitBipAction, resubmitPendingBipAction,
-- adminUpdateBipAction, approveEditAction merge) used delete-then-insert as two
-- separate PostgREST calls. If the INSERT failed after the DELETE committed,
-- all partners were silently lost (T-02-07-07 risk acceptance). This function
-- performs both statements in a single transaction: any failure rolls back
-- the whole replacement, so partners can never be left half-deleted.
--
-- SECURITY INVOKER (deliberately NOT definer, unlike
-- insert_university_if_not_exists in 00009): the inner DELETE/INSERT execute
-- as the caller, so the ownership + status RLS policies (00006, 00052) keep
-- applying. A coordinator calling this on someone else's BIP — or on a live
-- (approved) BIP once 00052 lands — gets a denial and a full rollback.
-- set search_path = public locks name resolution (same attack mitigation as
-- 00009). Only the authenticated role may execute; anon callers fail RLS
-- anyway (no uid), but the grant keeps the surface explicit.
--
-- Payload: p_partners is a JSON array of row objects with keys
-- university_id (uuid string or null), partner_name_raw, partner_country_raw,
-- partner_erasmus_code_raw. Extra keys (e.g. bip_id) are ignored; p_bip_id is
-- authoritative. The partner_identifies_someone CHECK still applies per row —
-- a row with neither university_id nor partner_name_raw aborts everything.

create or replace function public.reconcile_bip_partners(p_bip_id uuid, p_partners jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from public.bip_partner_universities where bip_id = p_bip_id;

  insert into public.bip_partner_universities
    (bip_id, university_id, partner_name_raw, partner_country_raw, partner_erasmus_code_raw)
  select
    p_bip_id,
    nullif(x ->> 'university_id', '')::uuid,
    nullif(x ->> 'partner_name_raw', ''),
    nullif(x ->> 'partner_country_raw', ''),
    nullif(x ->> 'partner_erasmus_code_raw', '')
  from jsonb_array_elements(coalesce(p_partners, '[]'::jsonb)) as x;
end;
$$;

-- Only logged-in users may call the RPC (anon receives
-- "permission denied for function reconcile_bip_partners").
grant execute on function public.reconcile_bip_partners(uuid, jsonb) to authenticated;
