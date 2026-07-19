'use server'

/**
 * BIP card-image Server Action.
 *
 * Uploads a single cover image for the listing card into the existing public
 * `bip-media` Storage bucket and returns its object path + public URL. The path
 * itself is persisted as a normal content field (`card_image_path`) through the
 * draft → submit → edit pipeline (bip-draft / bip-submit / bip-edits), NOT
 * written to `bips` here — that keeps approved-BIP edits flowing through admin
 * re-review instead of a direct (RLS-blocked) update.
 *
 * Auth: getClaims() only (CLAUDE.md never-do). RLS-bound anon client — never
 * createAdminClient here.
 */

import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { BIP_MEDIA_BUCKET, attachmentPublicUrl } from '@/lib/utils/attachments'

const MAX_BYTES = 10_485_760 // 10 MB — a card cover image should be modest.
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

export type CardImageResult =
  | { path: string; url: string }
  | { error: string }

/**
 * Upload a card cover image. FormData: `bipId`, `file`, optional `previousPath`
 * (the object being replaced — removed best-effort so replacements don't orphan).
 */
export async function uploadBipCardImageAction(
  formData: FormData,
): Promise<CardImageResult> {
  const bipId = String(formData.get('bipId') ?? '')
  const file = formData.get('file')
  const previousPath = String(formData.get('previousPath') ?? '')

  if (!bipId) return { error: 'Save your draft before uploading a card image.' }
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'No image selected.' }
  }
  if (file.size > MAX_BYTES) {
    return { error: 'Image is too large (max 10 MB).' }
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return { error: 'Unsupported image type. Use JPG, PNG, or WebP.' }
  }

  const supabase = await createClient()
  const { data: claimsData, error: authError } = await supabase.auth.getClaims()
  if (authError || !claimsData?.claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }
  const userId = claimsData.claims.sub

  // Ownership guard (defense-in-depth; storage RLS also enforces the path scope).
  const { data: bip } = await supabase
    .from('bips')
    .select('id, created_by')
    .eq('id', bipId)
    .maybeSingle()
  if (!bip || bip.created_by !== userId) {
    return { error: 'You do not have permission to set this BIP’s card image.' }
  }

  const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(0, 120)
  const storagePath = `${bipId}/card/${randomUUID()}-${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(BIP_MEDIA_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false })
  if (uploadError) {
    console.error('[uploadBipCardImageAction] storage error:', uploadError.message)
    return { error: 'Upload failed. Please try again.' }
  }

  // Best-effort cleanup of the replaced image (scoped to this BIP's folder).
  if (previousPath && previousPath.startsWith(`${bipId}/`) && previousPath !== storagePath) {
    await supabase.storage.from(BIP_MEDIA_BUCKET).remove([previousPath])
  }

  return { path: storagePath, url: attachmentPublicUrl(storagePath) }
}
