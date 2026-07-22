-- 00033_ects_credits_allow_low.sql
-- Relax the ects_credits CHECK. The original 00003 constraint required
-- `ects_credits >= 3` (the typical BIP award), but a BIP can legitimately carry
-- 0, 1, or 2 ECTS. Widen the floor to 0 (still non-negative). The wizard Zod
-- schema (lib/schemas/bip-wizard.ts) is aligned to `.min(0).max(30)`.
--
-- Additive + idempotent: drop the auto-named inline constraint from 00003 and add
-- a named one.

alter table public.bips
  drop constraint if exists bips_ects_credits_check;

alter table public.bips
  add constraint bips_ects_credits_check
    check (ects_credits >= 0);
