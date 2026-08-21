'use server'

/**
 * Bulk moderate Server Action (TOOL-02)
 *
 * Single action bulkModerateBips(ids, decision, note) that loops per-row
 * with per-row audit INSERT and per-row revalidatePath, returns
 * { succeeded, failed } with row-level errors (Key Decision 5).
 * Preserves the per-row audit + ISR contract from single approve/reject.
 *
 * No bulk WHERE id IN shortcut — that would silently skip history + revalidate.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validateTransition } from '@/lib/utils/status-transitions'
import type { BipStatus } from '@/lib/utils/status'
import { sendEmail } from '@/lib/email/send'
import { getNextPendingBip } from '@/lib/queries/adminBips'

type BulkDecision = 'approve' | 'reject'
type BulkResultItem = { id: string; error?: string }
export type BulkResult = { succeeded: BulkResultItem[]; failed: BulkResultItem[] }

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

export async function bulkModerateBips(
  ids: string[],
  decision: BulkDecision,
  note?: string,
): Promise<BulkResult> {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims as { sub?: string; app_metadata?: { role?: string } } | null
  if (authError || !claims?.sub) {
    return { succeeded: [], failed: ids.map((id) => ({ id, error: 'Your session has expired.' })) }
  }
  if (claims.app_metadata?.role !== 'admin') {
    return { succeeded: [], failed: ids.map((id) => ({ id, error: 'Forbidden.' })) }
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    return { succeeded: [], failed: [] }
  }
  if (ids.length > 50) {
    return {
      succeeded: [],
      failed: ids.map((id) => ({ id, error: 'Too many ids (max 50).' })),
    }
  }
  if (decision !== 'approve' && decision !== 'reject') {
    return { succeeded: [], failed: ids.map((id) => ({ id, error: 'Invalid decision.' })) }
  }
  if (decision === 'reject' && (!note || note.trim().length < 10)) {
    return {
      succeeded: [],
      failed: ids.map((id) => ({ id, error: 'Reason must be at least 10 characters.' })),
    }
  }
  if (decision === 'approve' && note && note.length > 500) {
    return {
      succeeded: [],
      failed: ids.map((id) => ({ id, error: 'Note must be at most 500 characters.' })),
    }
  }

  const succeeded: BulkResultItem[] = []
  const failed: BulkResultItem[] = []

  for (const rawId of ids) {
    const id = String(rawId)
    if (!isUuid(id)) {
      failed.push({ id, error: 'Invalid BIP id.' })
      continue
    }

    // 1. Read row (defense-in-depth + slug/title for revalidate/email)
    const { data: existing, error: readError } = await supabase
      .from('bips')
      .select('id, slug, title, status, created_by, profiles!created_by ( contact_email, full_name )')
      .eq('id', id)
      .maybeSingle()
    if (readError || !existing) {
      failed.push({ id, error: 'BIP not found.' })
      continue
    }

    const currentStatus = existing.status as BipStatus
    const targetStatus: BipStatus = decision === 'approve' ? 'approved' : 'rejected'

    // 2. State machine guard
    try {
      validateTransition(currentStatus, targetStatus, 'admin')
    } catch {
      failed.push({ id, error: `Cannot ${decision} from status ${currentStatus}.` })
      continue
    }

    const wasApproved = currentStatus === 'approved'

    // 3. UPDATE
    const { error: updateError } = await supabase
      .from('bips')
      .update({ status: targetStatus, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (updateError) {
      failed.push({ id, error: 'Failed to update.' })
      continue
    }

    // 4. Audit
    const { error: auditError } = await supabase.from('bip_status_history').insert({
      bip_id: id,
      from_status: currentStatus,
      to_status: targetStatus,
      actor_id: claims.sub,
      note: decision === 'approve' ? (note ?? null) : note!.trim(),
      action_kind: decision === 'approve' ? 'approve' : 'reject',
    })
    if (auditError) {
      console.error('[bulkModerateBips] audit insert failed:', auditError.message)
      // Don't roll back — DB write succeeded, audit is best-effort
    }

    // 5. ISR — per-row
    revalidatePath('/admin')
    revalidatePath('/bips')
    // For approve, always bust the detail; for reject, bust only if it was approved (was public)
    if (decision === 'approve' || wasApproved) {
      revalidatePath(`/bip/${(existing as { slug: string }).slug}`)
    }
    revalidatePath('/admin/bips')

    // 6. Email — per-row, fire-and-forget
    const profilesRaw = (existing as { profiles?: unknown }).profiles
    const profiles = Array.isArray(profilesRaw)
      ? (profilesRaw[0] as { contact_email?: string | null; full_name?: string | null } | undefined)
      : (profilesRaw as { contact_email?: string | null; full_name?: string | null } | undefined)
    const coordinatorEmail = profiles?.contact_email ?? null
    if (coordinatorEmail) {
      try {
        if (decision === 'approve') {
          await sendEmail(coordinatorEmail, {
            template: 'approval',
            props: {
              bipTitle: (existing as { title: string }).title,
              bipSlug: (existing as { slug: string }).slug,
              coordinatorName: profiles?.full_name ?? '',
              note: note,
            },
          })
        } else {
          await sendEmail(coordinatorEmail, {
            template: 'rejection',
            props: {
              bipTitle: (existing as { title: string }).title,
              bipId: id,
              reason: note!.trim(),
              coordinatorName: profiles?.full_name ?? '',
            },
          })
        }
      } catch (err) {
        console.error('[bulkModerateBips] email failed (non-blocking):', err)
      }
    }

    succeeded.push({ id })
  }

  return { succeeded, failed }
}
