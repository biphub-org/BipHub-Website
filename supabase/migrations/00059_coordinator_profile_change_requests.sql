-- 00059_coordinator_profile_change_requests.sql
-- Coordinator "data change" requests: coordinators cannot edit their profile
-- directly from the dashboard; they file a request and an admin approves or
-- declines it, at which point the profile is updated (approve) or left
-- untouched (decline).
--
-- Table design (mirrors bip_edits D-14 + coordinator_requests 00054):
--   - One row per request; approved/declined rows stay as decision history.
--   - `coordinator_id` references auth.users(id) ON DELETE CASCADE (FOUN-09):
--     deleting the account via delete_my_account() removes the requests, and
--     the FK never dangles on a removed profiles row.
--   - Partial unique index on (coordinator_id) WHERE pending: one live
--     request per coordinator. A declined coordinator may file again.
--   - `reviewed_by` points at the deciding admin's profiles row.
--
-- RLS (PITFALLS Pitfall 4: enable immediately; Pitfall 5: UPDATE needs
-- BOTH using AND with check):
--   - Coordinator SELECT/INSERT own rows (INSERT pinned to status='pending'
--     so a coordinator cannot self-approve).
--   - Coordinator DELETE own pending rows (withdraw a request to re-file
--     after a typo — otherwise the partial unique index would strand them).
--   - No coordinator UPDATE: resubmission goes through withdraw + re-file.
--   - SELECT/UPDATE are admin-wide. No public (anon) access: the authorship
--     of every row is an authenticated coordinator by construction.

create table public.coordinator_profile_change_requests (
  id uuid primary key default gen_random_uuid(),
  coordinator_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined')),
  requested_full_name text not null,
  requested_contact_email text not null,
  requested_university_id uuid references public.universities(id) on delete set null,
  requested_erasmus_code text,
  admin_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- PITFALLS Pitfall 4: enable RLS immediately
alter table public.coordinator_profile_change_requests enable row level security;

-- One live request per coordinator
create unique index coordinator_profile_change_pending_uidx
  on public.coordinator_profile_change_requests (coordinator_id)
  where status = 'pending';

create index coordinator_profile_change_coordinator_idx
  on public.coordinator_profile_change_requests (coordinator_id);
create index coordinator_profile_change_status_created_at_idx
  on public.coordinator_profile_change_requests (status, created_at);

-- Coordinator can read their own requests (any status — for settings display)
create policy "cp_change_select_own"
  on public.coordinator_profile_change_requests for select
  to authenticated
  using ((select auth.uid()) = coordinator_id);

-- Coordinator can file a request; WITH CHECK pins post-image status to
-- 'pending' so a coordinator cannot self-approve via status='approved'.
create policy "cp_change_insert_own"
  on public.coordinator_profile_change_requests for insert
  to authenticated
  with check (
    (select auth.uid()) = coordinator_id
    and status = 'pending'
  );

-- Coordinator can withdraw their own pending request (typo recovery).
create policy "cp_change_delete_own_pending"
  on public.coordinator_profile_change_requests for delete
  to authenticated
  using (
    (select auth.uid()) = coordinator_id
    and status = 'pending'
  );

-- Admin can read all requests (inbox + diff view)
create policy "cp_change_select_admin"
  on public.coordinator_profile_change_requests for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- PITFALLS Pitfall 5: UPDATE policy MUST have BOTH using AND with check
create policy "cp_change_update_admin"
  on public.coordinator_profile_change_requests for update
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
