-- 00062_activity_log.sql
--
-- People-activity audit log (coordinator + student + admin-account events) +
-- survival hardening for the existing per-domain history tables.
--
-- Context: bip_status_history (00010/00019) already gives coordinators an
-- append-only BIP lifecycle log and admins a full BIP feed. What was missing:
--   (a) any record of NON-bip activity (account created/deleted, access
--       requests + decisions, profile/profile-change activity, alert
--       subscriptions) for the admin history logs, and
--   (b) survival: student_profile_changes.student_id and
--       coordinator_profile_change_requests.coordinator_id are
--       ON DELETE CASCADE, so deleting a user wiped their history.
--
-- Design (mirrors 00010/00019 precedent):
--   * New append-only `activity_log` table. No UPDATE/DELETE policies —
--     history cannot be deleted, matching bip_status_history (D-08).
--   * Coordinator/student-initiated events are written by SECURITY DEFINER
--     triggers (table owner privileges, bypass RLS) so no JWT privilege is
--     needed — including the ANON public access-request form.
--   * Every trigger body is exception-guarded: an audit write must NEVER
--     break the write that caused it.
--   * actor/target FKs are ON DELETE SET NULL with text snapshots
--     (target_email/target_name) so rows stay readable after the user,
--     BIP, or university is deleted (T-03-07 repudiation pattern).
--   * Listing cards (BIPs, users) remain deletable from the dashboards —
--     only the history rows are immortal.
--
-- Action vocabulary (category.action):
--   coordinator.account_created / account_deleted
--   coordinator.coordinator_request_filed / _approved / _rejected
--   coordinator.profile_change_requested / _approved / _declined
--   student.account_created / account_deleted
--   student.student_profile_updated
--   student.alerts_subscribed / alerts_updated / alerts_cleared
--   admin.account_created / account_deleted

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('coordinator', 'student', 'admin')),
  action text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  target_email text,
  target_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_log_category_created_at_idx
  on public.activity_log (category, created_at desc);
create index activity_log_target_created_at_idx
  on public.activity_log (target_user_id, created_at desc);
create index activity_log_action_created_at_idx
  on public.activity_log (action, created_at desc);

alter table public.activity_log enable row level security;

-- SELECT: admins only. Coordinators read BIP history from
-- bip_status_history (bsh_select_own_or_admin); students get no history UI.
create policy "activity_log_select_admin"
  on public.activity_log for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- INSERT: admins only (manual/backfill writes). Trigger functions run as the
-- table owner and bypass RLS, so user-initiated events need no JWT privilege.
create policy "activity_log_insert_admin"
  on public.activity_log for insert
  to authenticated
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ── Trigger 1: account created / deleted (profiles INSERT/DELETE) ──────────
-- Covers student sign-up, coordinator approval materialisation, and both
-- self-deletion (delete_my_account) and admin removal (admin_delete_user):
-- both RPCs delete auth.users, which cascades to profiles, firing DELETE.
create or replace function public.log_account_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category text;
  v_is_self boolean;
begin
  if (tg_op = 'INSERT') then
    if (new.role not in ('coordinator', 'student', 'admin')) then
      return new;
    end if;
    begin
      insert into public.activity_log
        (category, action, actor_id, target_user_id, target_email, target_name, metadata)
      values
        (new.role, 'account_created',
         new.id, new.id, new.contact_email, new.full_name,
         jsonb_build_object('role', new.role));
    exception when others then
      -- Audit must never break sign-up / approval.
      null;
    end;
    return new;
  end if;

  -- DELETE: the profile row is gone after this statement — snapshot everything.
  if (old.role not in ('coordinator', 'student', 'admin')) then
    return old;
  end if;
  v_category := old.role;
  -- auth.uid() is the caller even inside the DEFINER RPCs: self-deletion
  -- when the caller deletes their own account.
  v_is_self := ((select auth.uid()) is not distinct from old.id);
  begin
    insert into public.activity_log
      (category, action, actor_id, target_user_id, target_email, target_name, metadata)
    values
      (v_category, 'account_deleted',
       (select auth.uid()), null, old.contact_email, old.full_name,
       jsonb_build_object('role', old.role, 'deleted_by_self', v_is_self));
  exception when others then
    null;
  end;
  return old;
end;
$$;

create trigger activity_log_account
  after insert or delete on public.profiles
  for each row execute function public.log_account_activity();

-- ── Trigger 2: coordinator access requests (filed + decided) ───────────────
create or replace function public.log_coordinator_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    begin
      insert into public.activity_log
        (category, action, actor_id, target_user_id, target_email, target_name, metadata)
      values
        ('coordinator', 'coordinator_request_filed',
         null, null, new.email, new.full_name,
         jsonb_build_object('request_id', new.id, 'university_id', new.university_id));
    exception when others then
      null;
    end;
    return new;
  end if;

  -- UPDATE: only the pending → decided transition is an activity.
  if (old.status is distinct from new.status
      and old.status = 'pending'
      and new.status in ('approved', 'rejected')) then
    begin
      insert into public.activity_log
        (category, action, actor_id, target_user_id, target_email, target_name, metadata)
      values
        ('coordinator', 'coordinator_request_' || new.status,
         new.reviewed_by, null, new.email, new.full_name,
         jsonb_build_object('request_id', new.id));
    exception when others then
      null;
    end;
  end if;
  return new;
end;
$$;

create trigger activity_log_coordinator_request
  after insert or update of status on public.coordinator_requests
  for each row execute function public.log_coordinator_request();

-- ── Trigger 3: coordinator profile data-change requests ────────────────────
create or replace function public.log_profile_change_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    begin
      insert into public.activity_log
        (category, action, actor_id, target_user_id, target_email, target_name, metadata)
      values
        ('coordinator', 'profile_change_requested',
         new.coordinator_id, new.coordinator_id,
         new.requested_contact_email, new.requested_full_name,
         jsonb_build_object('request_id', new.id));
    exception when others then
      null;
    end;
    return new;
  end if;

  if (old.status is distinct from new.status
      and old.status = 'pending'
      and new.status in ('approved', 'declined')) then
    begin
      insert into public.activity_log
        (category, action, actor_id, target_user_id, target_email, target_name, metadata)
      values
        ('coordinator', 'profile_change_' || new.status,
         new.reviewed_by, new.coordinator_id,
         new.requested_contact_email, new.requested_full_name,
         jsonb_build_object('request_id', new.id));
    exception when others then
      null;
    end;
  end if;
  return new;
end;
$$;

create trigger activity_log_profile_change_request
  after insert or update of status on public.coordinator_profile_change_requests
  for each row execute function public.log_profile_change_request();

-- ── Trigger 4: student profile edits ───────────────────────────────────────
create or replace function public.log_student_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_name text;
begin
  begin
    select p.contact_email, p.full_name into v_email, v_name
    from public.profiles p where p.id = new.student_id;
  exception when others then
    v_email := null;
    v_name := null;
  end;
  begin
    insert into public.activity_log
      (category, action, actor_id, target_user_id, target_email, target_name, metadata)
    values
      ('student', 'student_profile_updated',
       new.student_id, new.student_id, v_email, v_name,
       jsonb_build_object('changes', new.changes));
  exception when others then
    null;
  end;
  return new;
end;
$$;

create trigger activity_log_student_profile_change
  after insert on public.student_profile_changes
  for each row execute function public.log_student_profile_change();

-- ── Trigger 5: BIP alert preferences (subscribe / update / clear) ──────────
create or replace function public.log_alert_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_action text;
  v_row record;
  v_email text;
  v_name text;
begin
  if (tg_op = 'DELETE') then
    v_uid := old.user_id;
    v_action := 'alerts_cleared';
    v_row := old;
  else
    v_uid := new.user_id;
    v_action := case when tg_op = 'INSERT' then 'alerts_subscribed' else 'alerts_updated' end;
    v_row := new;
  end if;
  begin
    select p.contact_email, p.full_name into v_email, v_name
    from public.profiles p where p.id = v_uid;
  exception when others then
    v_email := null;
    v_name := null;
  end;
  begin
    insert into public.activity_log
      (category, action, actor_id, target_user_id, target_email, target_name, metadata)
    values
      ('student', v_action, v_uid, v_uid, v_email, v_name,
       jsonb_build_object(
         'fields', v_row.fields,
         'countries', v_row.countries,
         'frequency', v_row.frequency));
  exception when others then
    null;
  end;
  if (tg_op = 'DELETE') then
    return old;
  end if;
  return new;
end;
$$;

create trigger activity_log_alert_preferences
  after insert or update or delete on public.bip_alert_preferences
  for each row execute function public.log_alert_preferences();

-- Lock down the functions: only triggers should call them.
revoke execute on function public.log_account_activity() from public, anon, authenticated;
revoke execute on function public.log_coordinator_request() from public, anon, authenticated;
revoke execute on function public.log_profile_change_request() from public, anon, authenticated;
revoke execute on function public.log_student_profile_change() from public, anon, authenticated;
revoke execute on function public.log_alert_preferences() from public, anon, authenticated;

-- ── Survival hardening: history must survive user deletion ─────────────────
-- student_profile_changes.student_id: CASCADE → SET NULL (rows stay readable
-- via the changes diff + the activity_log snapshot).
alter table public.student_profile_changes alter column student_id drop not null;
alter table public.student_profile_changes
  drop constraint if exists student_profile_changes_student_id_fkey;
alter table public.student_profile_changes
  add constraint student_profile_changes_student_id_fkey
  foreign key (student_id) references auth.users(id) on delete set null;

-- coordinator_profile_change_requests.coordinator_id: CASCADE → SET NULL.
alter table public.coordinator_profile_change_requests alter column coordinator_id drop not null;
alter table public.coordinator_profile_change_requests
  drop constraint if exists coordinator_profile_change_requests_coordinator_id_fkey;
alter table public.coordinator_profile_change_requests
  add constraint coordinator_profile_change_requests_coordinator_id_fkey
  foreign key (coordinator_id) references auth.users(id) on delete set null;

-- ── Backfill: history starts populated for pre-migration rows ──────────────
-- Existing accounts → account_created (role-guarded so the category CHECK
-- can never abort the migration on an unexpected role value).
insert into public.activity_log
  (category, action, actor_id, target_user_id, target_email, target_name, metadata, created_at)
select
  p.role, 'account_created',
  p.id, p.id, p.contact_email, p.full_name,
  jsonb_build_object('role', p.role, 'backfilled', true),
  p.created_at
from public.profiles p
where p.role in ('coordinator', 'student', 'admin');

-- Existing access requests → filed (+ decided where applicable).
insert into public.activity_log
  (category, action, actor_id, target_user_id, target_email, target_name, metadata, created_at)
select
  'coordinator', 'coordinator_request_filed',
  null, null, r.email, r.full_name,
  jsonb_build_object('request_id', r.id, 'backfilled', true),
  r.created_at
from public.coordinator_requests r;

insert into public.activity_log
  (category, action, actor_id, target_user_id, target_email, target_name, metadata, created_at)
select
  'coordinator', 'coordinator_request_' || r.status,
  r.reviewed_by, null, r.email, r.full_name,
  jsonb_build_object('request_id', r.id, 'backfilled', true),
  coalesce(r.reviewed_at, r.created_at)
from public.coordinator_requests r
where r.status in ('approved', 'rejected');

-- Existing profile data-change requests → requested (+ decided).
insert into public.activity_log
  (category, action, actor_id, target_user_id, target_email, target_name, metadata, created_at)
select
  'coordinator', 'profile_change_requested',
  c.coordinator_id, c.coordinator_id,
  c.requested_contact_email, c.requested_full_name,
  jsonb_build_object('request_id', c.id, 'backfilled', true),
  c.created_at
from public.coordinator_profile_change_requests c;

insert into public.activity_log
  (category, action, actor_id, target_user_id, target_email, target_name, metadata, created_at)
select
  'coordinator', 'profile_change_' || c.status,
  c.reviewed_by, c.coordinator_id,
  c.requested_contact_email, c.requested_full_name,
  jsonb_build_object('request_id', c.id, 'backfilled', true),
  coalesce(c.reviewed_at, c.created_at)
from public.coordinator_profile_change_requests c
where c.status in ('approved', 'declined');

-- Existing student profile edits → student_profile_updated.
insert into public.activity_log
  (category, action, actor_id, target_user_id, target_email, target_name, metadata, created_at)
select
  'student', 'student_profile_updated',
  s.student_id, s.student_id, p.contact_email, p.full_name,
  jsonb_build_object('changes', s.changes, 'backfilled', true),
  s.created_at
from public.student_profile_changes s
left join public.profiles p on p.id = s.student_id;

-- Existing alert preferences → alerts_subscribed.
insert into public.activity_log
  (category, action, actor_id, target_user_id, target_email, target_name, metadata, created_at)
select
  'student', 'alerts_subscribed',
  a.user_id, a.user_id, p.contact_email, p.full_name,
  jsonb_build_object(
    'fields', a.fields,
    'countries', a.countries,
    'frequency', a.frequency,
    'backfilled', true),
  a.updated_at
from public.bip_alert_preferences a
left join public.profiles p on p.id = a.user_id;
