-- 00016_saved_bips.sql
-- Phase 6 (Saved BIPs Sync). New PII table linking a student (auth.users) to
-- the BIPs they have saved. Server-side, synced across devices (STUD-05).
--
-- Decisions:
--   D-06   Authoritative DDL from ARCHITECTURE.md 166-204 / 06-RESEARCH.md 498-539.
--          Own-only CRUD (insert/select/delete) + admin read. NO UPDATE policy —
--          save/unsave is insert/delete only (CLAUDE.md USING+WITH CHECK rule N/A here).
--   FOUN-09 GDPR cascade is FK-driven: user_id references auth.users(id) ON DELETE
--          CASCADE means the existing delete_my_account() RPC (00013, `delete from
--          auth.users`) removes every saved_bips row automatically. Do NOT add
--          saved_bips deletion logic to the RPC.
--
-- RLS predicate note (06-RESEARCH.md Pitfall 2): own-data policies use
-- (select auth.uid()) = user_id — NOT an app_metadata.role check. Any authenticated
-- user (incl. coordinators/admins) may save BIPs; the UI scopes the affordance to
-- students. Indexes (06-RESEARCH.md Pitfall 3) are required in THIS file.

create table public.saved_bips (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  bip_id     uuid not null references public.bips(id) on delete cascade,
  saved_at   timestamptz not null default now(),
  unique (user_id, bip_id)
);

alter table public.saved_bips enable row level security;

create index saved_bips_user_id_idx on public.saved_bips (user_id);
create index saved_bips_bip_id_idx on public.saved_bips (bip_id);

create policy "saved_bips_select_own"
  on public.saved_bips for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "saved_bips_insert_own"
  on public.saved_bips for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "saved_bips_delete_own"
  on public.saved_bips for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "saved_bips_select_admin"
  on public.saved_bips for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
