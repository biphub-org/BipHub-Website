-- 00024_bip_builder_field_revision.sql
-- Coordinator BIP-builder field revision (v1.2 / Phase 10 field-set lock).
--
-- Adds four new content columns to `bips`, widens/loosens two CHECK constraints,
-- and mirrors the four new content columns onto the `bip_edits` shadow table so
-- coordinator edits round-trip through admin re-review (FOUN-14 / anti-Pitfall-1).
--
-- Additive + idempotent (add column if not exists / drop constraint if exists),
-- matching the 00009/00022 convention. No data is dropped; the legacy
-- green_travel / inclusion_support / virtual_sessions_count / virtual_duration_notes
-- columns are retained (simply no longer surfaced by the builder).

-- 1. New bips content columns.
--    external_bip_id : official Erasmus+ BIP code (required at submit via Zod;
--                      nullable here so partial drafts still auto-save).
--    target_group    : who the BIP is for — students / staff / both.
--    fees            : free-text fee information (mirrors eligibility_notes shape).
--    virtual_session_date : the date the virtual session runs (replaces the old
--                      virtual_sessions_count + virtual_duration_notes pair in the UI).
alter table public.bips
  add column if not exists external_bip_id      text,
  add column if not exists target_group         text,
  add column if not exists fees                 text,
  add column if not exists virtual_session_date date;

-- 2. target_group whitelist. Nullable so partial drafts save; enforced non-null
--    at submit by Zod. Values mirror lib/schemas/bip-wizard.ts TARGET_GROUPS.
alter table public.bips
  drop constraint if exists bips_target_group_check;
alter table public.bips
  add constraint bips_target_group_check
    check (target_group is null or target_group in ('students', 'staff', 'students_staff'));

-- 3. Widen max_participants 1..30 -> 1..100 (drop the auto-named inline CHECK from
--    00003, re-add with the new bound). Nullable-safe for partial drafts.
alter table public.bips
  drop constraint if exists bips_max_participants_check;
alter table public.bips
  add constraint bips_max_participants_check
    check (max_participants is null or max_participants between 1 and 100);

-- 4. Add 'vocational' to the allowed study_levels set (EQF 5 in the UI).
alter table public.bips
  drop constraint if exists bips_study_levels_valid;
alter table public.bips
  add constraint bips_study_levels_valid
    check (study_levels <@ array['bachelor', 'master', 'phd', 'vocational']::text[]);

-- 5. Mirror the four new content columns onto bip_edits (no CHECK on content
--    columns — Zod validates at submit; matches 00017/00022 convention).
alter table public.bip_edits
  add column if not exists external_bip_id      text,
  add column if not exists target_group         text,
  add column if not exists fees                 text,
  add column if not exists virtual_session_date date;
