-- 00061_student_profile_changes_read.sql
-- Lets admins dismiss student profile-change notifications (mark as read).
--
--   - `read_at`: NULL = unread (shows in the /admin/students "Recent
--     profile changes" section + Students sidebar pill). Setting it removes
--     the notification; the row stays as history.
--   - Immutable otherwise: students still cannot UPDATE or DELETE, and the
--     admin UPDATE policy below is the only write path besides INSERT.
--
-- RLS (PITFALLS Pitfall 5: UPDATE policy MUST have BOTH using AND with
-- check — without WITH CHECK an admin could reassign student_id):
--   - Admin UPDATE (mark as read). No student UPDATE: the action server
--     function runs as the caller, so students are unaffected.

alter table public.student_profile_changes
  add column read_at timestamptz;

create index student_profile_changes_unread_idx
  on public.student_profile_changes (created_at desc)
  where read_at is null;

create policy "sp_changes_update_admin"
  on public.student_profile_changes for update
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
