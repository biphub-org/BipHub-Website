-- 00025_bip_media_uploads.sql
-- Optional program media/document uploads for the BIP builder (builder item #18).
--
-- Creates a PUBLIC `bip-media` storage bucket (images, PDFs, and short videos)
-- plus a `bip_attachments` table that records one row per uploaded object.
-- Attachments attach directly to the parent `bips` row (NOT routed through the
-- bip_edits shadow flow) and become publicly visible once the parent BIP is
-- approved — the SELECT policy gates visibility on bips.status = 'approved'
-- (owner + admin can always see their own).
--
-- CLAUDE.md never-do: every new table ENABLE ROW LEVEL SECURITY with policies.

-- 1. Public bucket. file_size_limit accommodates short promo videos (100 MB).
--    allowed_mime_types is enforced by Storage on upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bip-media',
  'bip-media',
  true,
  104857600, -- 100 MB
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Attachment registry.
create table if not exists public.bip_attachments (
  id           uuid primary key default gen_random_uuid(),
  bip_id       uuid not null references public.bips(id) on delete cascade,
  created_by   uuid references auth.users(id) on delete set null,
  storage_path text not null,               -- object path within the bip-media bucket
  file_name    text not null,               -- original filename for display/download
  mime_type    text not null,
  size_bytes   bigint,
  kind         text not null default 'document'
    check (kind in ('image', 'video', 'document')),
  created_at   timestamptz not null default now()
);

create index if not exists bip_attachments_bip_id_idx on public.bip_attachments (bip_id);

alter table public.bip_attachments enable row level security;

-- SELECT: public sees attachments of approved BIPs; owner + admin see their own/all.
create policy "bip_attachments_select_public_or_owner"
  on public.bip_attachments for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.bips b
      where b.id = bip_attachments.bip_id and b.status = 'approved'
    )
    or created_by = (select auth.uid())
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- INSERT: coordinator who owns the parent BIP, tagging the row with their uid.
create policy "bip_attachments_insert_own"
  on public.bip_attachments for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1 from public.bips b
      where b.id = bip_attachments.bip_id
        and b.created_by = (select auth.uid())
    )
  );

-- DELETE: the uploader can remove their own attachment rows.
create policy "bip_attachments_delete_own"
  on public.bip_attachments for delete
  to authenticated
  using (created_by = (select auth.uid()));

-- 3. Storage object policies for the public bip-media bucket.
--    Public buckets serve reads via the CDN, but an explicit SELECT policy keeps
--    the authenticated REST path working too. Writes are owner-scoped.
create policy "bip_media_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'bip-media');

create policy "bip_media_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'bip-media' and owner = (select auth.uid()));

create policy "bip_media_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'bip-media' and owner = (select auth.uid()));
