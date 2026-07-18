-- 00022_bip_edits_builder_completion.sql
-- Mirror the four builder-completion columns from bips onto the bip_edits
-- shadow table so coordinator edits round-trip through admin re-review.
-- Nullable, no default, no CHECK (Zod validates at submit; matches 00017/00020
-- content-column convention). No RLS change (policies key on created_by/status).
alter table public.bip_edits
  add column virtual_sessions_count    integer,
  add column virtual_duration_notes    text,
  add column accommodation_notes       text,
  add column partner_institutions_only boolean;
