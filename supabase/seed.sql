-- BipHub seed catalog — intentionally empty.
-- All demo BIPs and seeded emails have been removed per user request.
-- `supabase db reset` will now create an empty BIPs table (universities remain via ECHE catalog migration).
-- To re-seed, restore from git history: git show HEAD:supabase/seed.sql

-- Idempotent cleanup: remove any legacy seeded rows if this file is applied on a DB that still has them.
delete from public.bip_partner_universities
  where bip_id in (select id from public.bips where is_seed = true);

delete from public.bips where is_seed = true;
