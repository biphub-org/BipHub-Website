-- 00034_universities_eche_fields.sql
-- Adds the columns the ECHE catalog import (00035) populates, so the
-- `universities` table can hold the official reference data alongside the
-- hand-seeded rows.
--
-- Additive + idempotent (add column if not exists), matching the
-- 00009/00024 convention. No data is dropped.
--
--   legal_name    : the institution's official legal name as published in the
--                   ECHE list (often ALL CAPS / de-accented). Kept for search
--                   and disambiguation; `name` holds the readable display form.
--   oid           : Organisation ID (E10xxxxxx) from the EU registration system
--                   — the modern institution identifier alongside erasmus_code.
--   eche_end_date : when the institution's current Erasmus charter expires.
--   source        : provenance. 'eche' = imported from the official list;
--                   'manual' = hand-seeded or coordinator-created via the
--                   insert_university_if_not_exists RPC (00009). Defaults to
--                   'manual' so existing + future RPC rows are labelled
--                   correctly; the 00035 upsert stamps 'eche' on catalog rows.

alter table public.universities
  add column if not exists legal_name    text,
  add column if not exists oid           text,
  add column if not exists eche_end_date date,
  add column if not exists source        text not null default 'manual';

-- Fast lookups by OID (partner reconciliation / future EWP joins).
create index if not exists universities_oid_idx
  on public.universities (oid)
  where oid is not null;

-- Reconcile the one mis-coded row BEFORE the 00035 catalog upsert. The original
-- hand-seed used 'F PARIS004' for Sorbonne Université, which is not a real ECHE
-- code — the correct one is 'F PARIS468'. Rename in place so the catalog upsert
-- MERGES into this existing row (preserving its id and any BIP FK references)
-- rather than leaving a duplicate Sorbonne. No-op on a fresh DB (row absent);
-- the NOT EXISTS guard avoids a unique-constraint error in the unlikely case
-- both codes already exist.
update public.universities
   set erasmus_code = 'F PARIS468'
 where erasmus_code = 'F PARIS004'
   and not exists (
     select 1 from public.universities where erasmus_code = 'F PARIS468'
   );
