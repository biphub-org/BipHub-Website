-- 00060_student_profile_changes.sql
-- Audit log of student profile edits (student dashboard → admin visibility).
--
-- Unlike coordinator data changes (00059, request + approve flow), student
-- edits apply immediately. This table records WHAT changed (before → after
-- per field, as JSONB) so the admin dashboard can notify: a "Recent profile
-- changes" section on /admin/students plus a 7-day count pill on the
-- Students sidebar entry. The admin notification email (D-11
-- fire-and-forget) remains the push channel; this table is the durable one.
--
--   - One row per saved edit that actually changed something (the action
--     skips untouched saves and first-time setups).
--   - `student_id` references auth.users(id) ON DELETE CASCADE (FOUN-09).
--   - `changes`: [{ label, before, after }] — display strings resolved
--     server-side (country codes → names, university ids → names).
--   - Immutable history: INSERT (own rows) + admin SELECT only. No UPDATE
--     or DELETE policies.
--
-- RLS (PITFALLS Pitfall 4: enable immediately):
--   - Student INSERT own rows (WITH CHECK pins student_id to auth.uid()).
--   - Admin SELECT all rows (inbox + badge count).
--   - No public (anon) access.

create table public.student_profile_changes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  changes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- PITFALLS Pitfall 4: enable RLS immediately
alter table public.student_profile_changes enable row level security;

create index student_profile_changes_student_idx
  on public.student_profile_changes (student_id);
create index student_profile_changes_created_at_idx
  on public.student_profile_changes (created_at desc);

-- Student records their own change rows.
create policy "sp_changes_insert_own"
  on public.student_profile_changes for insert
  to authenticated
  with check (
    (select auth.uid()) = student_id
  );

-- Admin can read all change rows (inbox + badge count).
create policy "sp_changes_select_admin"
  on public.student_profile_changes for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
