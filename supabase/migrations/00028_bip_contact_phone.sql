-- 00028_bip_contact_phone.sql
-- Optional coordinator phone number for the "Coordinator contact" apply channel.
--
-- Adds `contact_phone` to `bips` and mirrors it onto the `bip_edits` shadow
-- table so coordinator edits round-trip through admin re-review
-- (FOUN-14 / anti-Pitfall-1). Additive + idempotent (add column if not exists),
-- matching the 00024/00026 convention. Nullable — the field is optional.

alter table public.bips
  add column if not exists contact_phone text;

alter table public.bip_edits
  add column if not exists contact_phone text;
