'use server'

/**
 * BIP attachment Server Actions (builder item #18).
 *
 * Coordinators can attach optional media/documents (images, PDFs, short videos)
 * to a BIP. Files live in the public `bip-media` Storage bucket; one
 * `bip_attachments` row is written per object (migration 00025). Attachments
 * attach directly to the parent `bips` row and become publicly visible once the
 * BIP is approved (RLS gates SELECT on bips.status = 'approved').
 *
 * Auth: getClaims() only (CLAUDE.md never-do). All writes are RLS-bound via the
 * anon-key client — never createAdminClient here.
 */

import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { BIP_MEDIA_BUCKET, attachmentPublicUrl } from '@/lib/utils/attachments'

const BUCKET = BIP_MEDIA_BUCKET
const MAX_BYTES = 104_857_600 // 100 MB — mirrors the bucket file_size_limit.
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'video/quicktime',
])

export type BipAttachment = {
  id: string
  bip_id: string
  storage_path: string
  file_name: string
  mime_type: string
  size_bytes: number | null
  kind: 'image' | 'video' | 'document'
  url: string
}

function kindFor(mime: string): 'image' | 'video' | 'document' {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  return 'document'
}

/**
 * Upload one file and record it against a BIP.
 * FormData: `bipId` (string), `file` (File).
 */
export async function uploadBipAttachmentAction(
  formData: FormData,
): Promise<{ attachment: BipAttachment } | { error: string }> {
  const bipId = String(formData.get('bipId') ?? '')
  const file = formData.get('file')
  if (!bipId) return { error: 'Save your draft before uploading files.' }
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'No file selected.' }
  }
  if (file.size > MAX_BYTES) {
    return { error: 'File is too large (max 100 MB).' }
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return { error: 'Unsupported file type. Use images, PDF, or video.' }
  }

  const supabase = await createClient()
  const { data: claimsData, error: authError } = await supabase.auth.getClaims()
  if (authError || !claimsData?.claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }
  const userId = claimsData.claims.sub

  // Ownership guard (defense-in-depth; RLS also enforces it on insert).
  const { data: bip } = await supabase
    .from('bips')
    .select('id, created_by')
    .eq('id', bipId)
    .maybeSingle()
  if (!bip || bip.created_by !== userId) {
    return { error: 'You do not have permission to attach files to this BIP.' }
  }

  const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(0, 120)
  const storagePath = `${bipId}/${randomUUID()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false })
  if (uploadError) {
    console.error('[uploadBipAttachmentAction] storage error:', uploadError.message)
    return { error: 'Upload failed. Please try again.' }
  }

  const { data: row, error: insertError } = await supabase
    .from('bip_attachments')
    .insert({
      bip_id: bipId,
      created_by: userId,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
      kind: kindFor(file.type),
    })
    .select('id, bip_id, storage_path, file_name, mime_type, size_bytes, kind')
    .single()
  if (insertError || !row) {
    // Best-effort cleanup of the orphaned object.
    await supabase.storage.from(BUCKET).remove([storagePath])
    console.error('[uploadBipAttachmentAction] insert error:', insertError?.message)
    return { error: 'Could not record the upload. Please try again.' }
  }

  return {
    attachment: {
      id: row.id,
      bip_id: row.bip_id,
      storage_path: row.storage_path,
      file_name: row.file_name,
      mime_type: row.mime_type,
      size_bytes: row.size_bytes,
      kind: row.kind,
      url: attachmentPublicUrl(row.storage_path),
    },
  }
}

/** List attachments for a BIP (owner/admin see all; RLS handles visibility). */
export async function listBipAttachmentsAction(
  bipId: string,
): Promise<BipAttachment[]> {
  if (!bipId) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bip_attachments')
    .select('id, bip_id, storage_path, file_name, mime_type, size_bytes, kind')
    .eq('bip_id', bipId)
    .order('created_at', { ascending: true })
  if (error) {
    console.error('[listBipAttachmentsAction] error:', error.message)
    return []
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    bip_id: row.bip_id,
    storage_path: row.storage_path,
    file_name: row.file_name,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    kind: row.kind,
    url: attachmentPublicUrl(row.storage_path),
  }))
}

/** Delete an attachment (row + storage object). Owner-scoped via RLS. */
export async function deleteBipAttachmentAction(
  attachmentId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: claimsData, error: authError } = await supabase.auth.getClaims()
  if (authError || !claimsData?.claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }

  const { data: row } = await supabase
    .from('bip_attachments')
    .select('id, storage_path')
    .eq('id', attachmentId)
    .maybeSingle()
  if (!row) return { error: 'Attachment not found.' }

  const { error: delError } = await supabase
    .from('bip_attachments')
    .delete()
    .eq('id', attachmentId)
  if (delError) {
    console.error('[deleteBipAttachmentAction] delete error:', delError.message)
    return { error: 'Could not delete the file. Please try again.' }
  }
  // Remove the storage object (best-effort; the row is already gone).
  await supabase.storage.from(BUCKET).remove([row.storage_path])
  return { success: true }
}
