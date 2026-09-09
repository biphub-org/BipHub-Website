-- 00053_admin_export_audit.sql
--
-- Append-only audit log for admin CSV exports (GET /admin/export.csv).
--
-- Why: coordinator/student CSV exports contain personal data at scale. Every
-- export records who triggered it, when, which dataset and columns were
-- exported, how many rows left the system, and which filters scoped the
-- export. No UI — a durable server-side table is enough. This is a
-- security-and-accountability control (GDPR Art 5(2)), not a policy text.
--
-- Append-only by design (mirrors bip_status_history, 00010): SELECT and
-- INSERT policies for role='admin' only, no UPDATE or DELETE policies, so
-- rows are immutable once written. admin_id uses ON DELETE SET NULL so the
-- audit trail survives admin account deletion.

create table if not exists public.admin_export_log (
  id         uuid primary key default gen_random_uuid(),
  admin_id   uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  entity     text not null check (entity in ('bips', 'coordinators', 'students', 'analytics')),
  columns    text[] not null default '{}',
  row_count  integer not null default 0,
  filters    jsonb not null default '{}'::jsonb
);

alter table public.admin_export_log enable row level security;

drop policy if exists "admin_export_log_select_admin" on public.admin_export_log;
create policy "admin_export_log_select_admin"
  on public.admin_export_log for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "admin_export_log_insert_admin" on public.admin_export_log;
create policy "admin_export_log_insert_admin"
  on public.admin_export_log for insert
  to authenticated
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create index if not exists admin_export_log_admin_id_idx on public.admin_export_log (admin_id);
create index if not exists admin_export_log_created_at_idx on public.admin_export_log (created_at desc);
