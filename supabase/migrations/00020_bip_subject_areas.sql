-- 00020_bip_subject_areas.sql
-- Allow a BIP to carry MULTIPLE fields of study (was a single scalar).
--
-- Mirrors the existing `study_levels text[]` multi-value facet: a not-null
-- array defaulting to '{}', filtered via array overlap (see
-- lib/filters/buildSupabaseQuery.ts) and backed by a GIN index.
--
-- The legacy scalar `subject_area` and `isced_f_code` columns are LEFT IN PLACE
-- (still written as subject_areas[0] on submit) so nothing unseen breaks. The
-- app reads `subject_areas` exclusively after this migration.

alter table public.bips
  add column subject_areas text[] not null default '{}';

-- Backfill the array from the existing single field id.
update public.bips
  set subject_areas = array[subject_area]
  where subject_area is not null
    and cardinality(subject_areas) = 0;

-- Field-of-study filter (BROW-03) now uses array overlap; GIN supports `&&`.
create index bips_subject_areas_gin_idx
  on public.bips using gin (subject_areas);

-- Proposed-edit rows (Phase 8) carry the same multi-field content. Nullable
-- (no default) to mirror the other bip_edits content columns; backfilled from
-- the legacy scalar so any open edits keep their field.
alter table public.bip_edits
  add column subject_areas text[];

update public.bip_edits
  set subject_areas = array[isced_f_code]
  where isced_f_code is not null
    and subject_areas is null;
