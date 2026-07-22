-- 00031_bip_media_bucket_ownership.sql
-- SECURITY FIX: the bip-media Storage INSERT policy (00025) was scoped only to
-- `owner = auth.uid()` — any authenticated account (including a zero-vetting
-- magic-link student) could upload up to 100 MB of arbitrary files into a PUBLIC
-- bucket, each getting a live CDN URL, completely decoupled from owning any BIP.
-- That is a free file-hosting / storage-cost abuse vector.
--
-- Both upload paths (uploadBipAttachmentAction, uploadBipCardImageAction) always
-- write to `${bipId}/...`, so the first path folder is the parent BIP id. Tie the
-- write policy to owning that BIP, mirroring bip_attachments_insert_own. Text
-- comparison (b.id::text = folder) avoids a uuid-cast error on malformed paths —
-- a non-matching / non-uuid folder simply fails the EXISTS and is denied.
--
-- Additive + idempotent: drop and recreate the object INSERT policy.

drop policy if exists "bip_media_insert_own" on storage.objects;

create policy "bip_media_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'bip-media'
    and owner = (select auth.uid())
    and exists (
      select 1 from public.bips b
      where b.id::text = (storage.foldername(name))[1]
        and b.created_by = (select auth.uid())
    )
  );
