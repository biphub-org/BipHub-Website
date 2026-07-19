-- 00026_virtual_session_dates_array.sql
-- Multiple virtual-session dates for the BIP builder.
--
-- The builder's single `virtual_session_date` (date) is replaced in the UI by a
-- required-first + optional-additional list of dates. Storage moves to a
-- `virtual_session_dates` (date[]) column on both `bips` and the `bip_edits`
-- shadow table so coordinator edits round-trip through admin re-review
-- (FOUN-14 / anti-Pitfall-1).
--
-- Additive + idempotent (add column if not exists), matching the
-- 00024/00025 convention. No data is dropped; the legacy singular
-- `virtual_session_date` column is retained and back-filled into the new array.

-- 1. New array column on bips + bip_edits.
alter table public.bips
  add column if not exists virtual_session_dates date[];

alter table public.bip_edits
  add column if not exists virtual_session_dates date[];

-- 2. Back-fill the array from the legacy singular column where present and the
--    array is still unset (idempotent — safe to re-run).
update public.bips
  set virtual_session_dates = array[virtual_session_date]
  where virtual_session_date is not null
    and virtual_session_dates is null;

update public.bip_edits
  set virtual_session_dates = array[virtual_session_date]
  where virtual_session_date is not null
    and virtual_session_dates is null;
