-- 00046 — Detailed ISCED-F codes for BIP builder (Step 1).
-- Separate from bips.subject_areas (12 broad BipHub categories).
-- Stores the 4-digit ISCED codes (e.g. 0613) selected in Wizard Step 1.

alter table public.bips
  add column if not exists isced_codes text[] not null default '{}';

alter table public.bip_edits
  add column if not exists isced_codes text[] default '{}';
