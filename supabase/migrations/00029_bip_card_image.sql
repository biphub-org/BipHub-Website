-- 00029_bip_card_image.sql
-- Optional cover image for the BIP listing card.
--
-- Coordinators can upload a card image in the builder; the file lives in the
-- existing public `bip-media` Storage bucket and the object path is stored in
-- `card_image_path`. The public <BipCard> renders it over the gradient header
-- when present. Mirrored onto `bip_edits` so edits to an approved BIP's card
-- image round-trip through admin re-review (FOUN-14 / anti-Pitfall-1).
--
-- Additive + idempotent (add column if not exists), matching the
-- 00024/00026/00028 convention. Nullable — the field is optional.

alter table public.bips
  add column if not exists card_image_path text;

alter table public.bip_edits
  add column if not exists card_image_path text;
