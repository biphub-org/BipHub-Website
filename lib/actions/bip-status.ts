'use server'

/**
 * BIP status mutation Server Actions used by the coordinator dashboard.
 *
 *   - deleteDraftAction(bipId)   — hard-delete a draft BIP (T-02-05-02 mitigation)
 *   - withdrawBipAction(bipId)   — move a pending BIP back to draft (T-02-05-03 mitigation)
 *
 * Both actions:
 *   1. Validate via getClaims() (CLAUDE.md never-do — never the unvalidated
 *      session reader).
 *   2. Re-read the row server-side and re-check ownership + status. RLS already
 *      enforces ownership; the explicit checks defend against client bugs and
 *      provide clear UI error copy.
 *   3. Call revalidatePath('/dashboard') so the RSC list refreshes.
 *
 * Neither action uses the admin (service-role) client (CLAUDE.md never-do —
 * service role stays inside app/(admin)).
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ActionResult = { error?: string; success?: true }

export async function deleteDraftAction(bipId: string): Promise<ActionResult> {
  if (!bipId || typeof bipId !== 'string') return { error: 'Invalid request.' }

  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }

  const { data: existing, error: readError } = await supabase
    .from('bips')
    .select('id, status, created_by')
    .eq('id', bipId)
    .maybeSingle()
  if (readError || !existing) return { error: 'BIP not found.' }
  if (existing.created_by !== claims.sub) {
    return { error: 'You do not have permission to delete this BIP.' }
  }
  if (existing.status !== 'draft') {
    return { error: 'Only draft BIPs can be deleted.' }
  }

  const { error } = await supabase.from('bips').delete().eq('id', bipId)
  if (error) {
    console.error('[deleteDraftAction] supabase error:', error.message)
    return { error: 'Failed to delete draft. Please try again.' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function withdrawBipAction(bipId: string): Promise<ActionResult> {
  if (!bipId || typeof bipId !== 'string') return { error: 'Invalid request.' }

  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }

  const { data: existing, error: readError } = await supabase
    .from('bips')
    .select('id, status, created_by')
    .eq('id', bipId)
    .maybeSingle()
  if (readError || !existing) return { error: 'BIP not found.' }
  if (existing.created_by !== claims.sub) {
    return { error: 'You do not have permission to withdraw this BIP.' }
  }
  if (existing.status !== 'pending') {
    return { error: 'Only pending BIPs can be withdrawn.' }
  }

  const { error } = await supabase
    .from('bips')
    .update({ status: 'draft', updated_at: new Date().toISOString() })
    .eq('id', bipId)
  if (error) {
    console.error('[withdrawBipAction] supabase error:', error.message)
    return { error: 'Failed to withdraw BIP. Please try again.' }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
