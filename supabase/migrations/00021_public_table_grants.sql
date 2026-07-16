-- 00021_public_table_grants.sql
-- Make table/sequence privileges EXPLICIT instead of relying on Supabase's
-- implicit default privileges.
--
-- Why: RLS policies (00006 etc.) gate which ROWS a role sees, but a role still
-- needs a table-level GRANT to touch the table at all. The hosted project got
-- these grants automatically when it was created, so cloud works. A fresh local
-- DB (`supabase start` in CI) no longer receives them, so every anon/authenticated
-- read failed with `42501 permission denied for table bips/universities/bip_edits`
-- and the whole e2e suite went red. Granting here makes CI + any fresh reset
-- match cloud; on cloud this migration is an idempotent no-op.
--
-- Scope: TABLES and SEQUENCES only. Function privileges are managed explicitly
-- per-migration (00008/00010/00013/00015/00019 revoke execute from anon/
-- authenticated as a security measure) — we must NOT blanket-grant functions
-- here or we would undo that hardening. RLS remains the row-level gate; these
-- grants are deliberately broad and RLS-gated, exactly as the Supabase default.

grant usage on schema public to anon, authenticated, service_role;

-- Tables ---------------------------------------------------------------------
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- Sequences (identity/serial columns; RLS does not apply to sequences) --------
grant usage, select on all sequences in schema public to anon, authenticated;
grant all on all sequences in schema public to service_role;

-- Future tables/sequences created by later migrations get the same grants
-- automatically, so this class of failure cannot recur.
alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated;
alter default privileges in schema public
  grant all on sequences to service_role;
