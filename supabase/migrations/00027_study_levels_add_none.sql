-- 00027_study_levels_add_none.sql
-- Add 'none' (staff mobility — no study level) to the allowed study_levels set.
--
-- The BIP builder's Study level field gains a fifth option, "None (Staff)",
-- for staff-only programmes that carry no student EQF level. Widen the
-- `bips_study_levels_valid` CHECK to accept it. Additive + idempotent
-- (drop-if-exists then re-add), matching the 00024 convention. bip_edits has
-- no CHECK on study_levels (content columns are Zod-validated at submit).

alter table public.bips
  drop constraint if exists bips_study_levels_valid;
alter table public.bips
  add constraint bips_study_levels_valid
    check (study_levels <@ array['vocational', 'bachelor', 'master', 'phd', 'none']::text[]);
