-- 00017_bip_edits.sql
-- Phase 8 (Edit-Approved + Request-Changes). Stores proposed-content edits for
-- already-approved BIPs pending admin re-review (EDIT-01/EDIT-02/D-01).
--
-- Decisions:
--   D-01/D-02 bip_edits table model; full proposed content; BIP identifier excluded (D-10).
--   D-03   Partial unique index: at most one open edit per BIP
--          (status IN ('pending','changes_requested')).
--   D-04   admin_note on same row; no separate reviews table.
--   D-14   ENABLE ROW LEVEL SECURITY; coordinator self-CRUD; admin select/update;
--          UPDATE policies with both USING and WITH CHECK (CLAUDE.md never-do).
--   FOUN-09 created_by references auth.users(id) ON DELETE CASCADE — GDPR/orphan-free.
--          Intentionally NOT public.profiles: direct FK to auth.users ensures cascade
--          fires when the account is hard-deleted via delete_my_account() RPC
--          (08-RESEARCH.md Pitfall 11).

create table public.bip_edits (
  id           uuid primary key default gen_random_uuid(),
  bip_id       uuid not null references public.bips(id) on delete cascade,
  created_by   uuid references auth.users(id) on delete cascade,  -- FOUN-09; NOT profiles
  status       text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'changes_requested')),
  admin_note   text,  -- D-04: note from admin for rejected/changes_requested

  -- Full proposed content (D-02) — all editable BIP fields, BIP identifier excluded (D-10).
  -- No CHECK constraints on content columns; Zod validates at submit time (avoids
  -- the virtual_timing enum mismatch between DB and wizard).
  title                         text,
  isced_f_code                  text,
  description                   text,
  learning_outcomes             text,
  virtual_component_description text,
  virtual_timing                text,
  host_city                     text,
  physical_start_date           date,
  physical_end_date             date,
  application_deadline          date,
  ects_credits                  integer,
  max_participants              integer,
  study_levels                  text[],
  language_of_instruction       text,
  language_level_min            text,
  green_travel                  boolean,
  inclusion_support             boolean,
  eligibility_notes             text,
  how_to_apply_type             text,
  how_to_apply_value            text,
  contact_name                  text,
  contact_email                 text,
  -- Partner institutions as JSONB (avoids a bip_edit_partner_universities join table).
  -- Shape: [{ university_id: string|null, name: string, country: string, isVerified: boolean }]
  partner_institutions          jsonb not null default '[]'::jsonb,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- D-03: at most one open edit per BIP.
-- A partial unique index on (bip_id) WHERE status IN ('pending','changes_requested')
-- enforces the invariant at the DB level — a second INSERT or UPDATE that would
-- produce a second open row for the same bip_id will be rejected.
create unique index bip_edits_one_open_per_bip
  on public.bip_edits (bip_id)
  where status in ('pending', 'changes_requested');

-- Performance indexes
create index bip_edits_bip_id_idx on public.bip_edits (bip_id);
create index bip_edits_created_by_idx on public.bip_edits (created_by);
create index bip_edits_status_created_at_idx on public.bip_edits (status, created_at);

-- D-14: ENABLE ROW LEVEL SECURITY on every new table (CLAUDE.md never-do).
alter table public.bip_edits enable row level security;

-- Policy 1: Coordinator can SELECT own edits (any status — for dashboard display).
create policy "bip_edits_select_own"
  on public.bip_edits for select
  to authenticated
  using ((select auth.uid()) = created_by);

-- Policy 2: Coordinator can INSERT new edits.
-- WITH CHECK pins post-image status to 'pending': coordinator cannot self-approve
-- by passing status='approved' (T-08-03 / D-14 mitigation).
create policy "bip_edits_insert_own"
  on public.bip_edits for insert
  to authenticated
  with check (
    (select auth.uid()) = created_by
    and status = 'pending'
  );

-- Policy 3: Coordinator can UPDATE own edit only when admin has requested changes,
-- and only to transition back to 'pending' (resubmit loop — D-05).
-- CLAUDE.md never-do: UPDATE policies MUST have both USING and WITH CHECK.
-- USING = pre-image predicate (source state must be 'changes_requested').
-- WITH CHECK = post-image predicate (target state must be 'pending').
create policy "bip_edits_update_own_resubmit"
  on public.bip_edits for update
  to authenticated
  using (
    (select auth.uid()) = created_by
    and status = 'changes_requested'
  )
  with check (
    (select auth.uid()) = created_by
    and status = 'pending'
  );

-- Policy 4: Admin can SELECT all bip_edits (for review queue + diff view).
create policy "bip_edits_select_admin"
  on public.bip_edits for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Policy 5: Admin can UPDATE any bip_edits row (approve/reject/request_changes).
-- CLAUDE.md never-do: UPDATE policies MUST have both USING and WITH CHECK.
create policy "bip_edits_update_admin"
  on public.bip_edits for update
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
