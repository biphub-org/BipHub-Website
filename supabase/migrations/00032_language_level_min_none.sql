-- 00032_language_level_min_none.sql
-- BUG FIX (silent save failure): the builder offers a "No requirement" language
-- option (LANGUAGE_LEVELS includes 'none' in lib/schemas/bip-wizard.ts; the option
-- is rendered in WizardStep2ProgramDetails), and bip-submit writes that value
-- straight through — but the DB CHECK from 00003 only allows A1..C2, so every save
-- that selects "No requirement" fails with a CHECK violation and an opaque
-- "Failed to submit" error.
--
-- Parallel to 00027, which added 'none' to the study_levels CHECK for staff mobility,
-- widen the language_level_min CHECK to accept 'none'. Additive + idempotent:
-- drop the auto-named inline constraint from 00003 and add a named one.

alter table public.bips
  drop constraint if exists bips_language_level_min_check;

alter table public.bips
  add constraint bips_language_level_min_check
    check (language_level_min in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'none'));
