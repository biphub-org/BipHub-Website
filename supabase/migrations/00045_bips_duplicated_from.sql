-- 00045_bips_duplicated_from.sql
-- Phase 12.1: Duplicate BIP lineage (SUBM-15/16)
--
-- Adds a nullable self-referential FK so a coordinator can duplicate an
-- existing BIP (approved/rejected/changes_requested) into a new draft.
-- The new draft records its source via duplicated_from_bip_id; the
-- Edition N signal (SUBM-16) is *derived* via a recursive CTE helper in
-- lib/queries/bipDetail.ts — no stored counter, no double-write.
-- ON DELETE SET NULL ensures GDPR deletion of the source never cascades
-- to the clone (prevents data loss; edition degrades gracefully to 1).

alter table public.bips
  add column if not exists duplicated_from_bip_id uuid
    references public.bips(id) on delete set null;

create index if not exists bips_duplicated_from_bip_id_idx
  on public.bips(duplicated_from_bip_id);

comment on column public.bips.duplicated_from_bip_id is
  'Phase 12 duplicate lineage — points to the source BIP this draft was cloned from; NULL for originals; FK ON DELETE SET NULL so source deletion does not delete the clone.';
