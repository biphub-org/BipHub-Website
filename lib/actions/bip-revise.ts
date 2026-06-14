'use server'

/**
 * Coordinator "revise rejected BIP" Server Action — closes the resubmit gap
 * surfaced by the v1.0 milestone audit (cross-phase Seam 3).
 *
 * Why this exists:
 *   A rejected BIP cannot be opened in the wizard directly — `getCoordinatorBipById`
 *   whitelists draft/pending, and the deployed RLS `bips_update_own_editable`
 *   (migration 00011) clamps the post-image of every coordinator edit-save to
 *   `status='draft'`. So the only legal way back into the editing flow is the
 *   explicit, audited transition `rejected → draft`. This action performs exactly
 *   that one move; the coordinator then revises in the wizard and re-submits via
 *   `submitBipAction` (draft → pending, authorized by migration 00012).
 *
 * Authorization layers (mirrors submitBipAction's trust boundary):
 *   - `getClaims()` — JWT-validated identity (CLAUDE.md never-do: never the
 *     unvalidated session reader server-side).
 *   - Defense-in-depth read-back of `created_by` + `status` even though RLS
 *     `bips_update_own_editable` already enforces ownership + the source status.
 *   - `validateTransition('rejected','draft','coordinator')` — application-layer
 *     state-machine guard.
 *
 * The migration 00010 audit trigger logs this UPDATE as `action_kind='resubmit'`,
 * so the round-trip is recorded in `bip_status_history`.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validateTransition } from '@/lib/utils/status-transitions'

export type ReviseBipResult =
  | { success: true; bipId: string }
  | { error: string }

export async function reviseRejectedBipAction(
  bipId: string,
): Promise<ReviseBipResult> {
  const supabase = await createClient()
  const { data: claimsData, error: authError } = await supabase.auth.getClaims()
  if (authError || !claimsData?.claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }
  const userId = claimsData.claims.sub

  // Defense-in-depth ownership + status read-back (RLS also enforces both).
  const { data: existing } = await supabase
    .from('bips')
    .select('id, status, created_by')
    .eq('id', bipId)
    .maybeSingle()
  if (!existing) return { error: 'BIP not found.' }
  if (existing.created_by !== userId) {
    return { error: 'You do not have permission to revise this BIP.' }
  }
  if (existing.status !== 'rejected') {
    return { error: 'Only rejected BIPs can be revised.' }
  }

  // Application-layer state-machine guard — never trust the read-back alone.
  try {
    validateTransition('rejected', 'draft', 'coordinator')
  } catch {
    return { error: 'This BIP cannot be revised.' }
  }

  // The one legal coordinator move on a rejected row: status → draft. RLS
  // `bips_update_own_editable` (00011) authorizes it (USING own + rejected,
  // WITH CHECK status='draft'). The status='rejected' guard keeps the write
  // idempotent — a concurrent revise updates 0 rows the second time.
  const { error: updateError } = await supabase
    .from('bips')
    .update({ status: 'draft', updated_at: new Date().toISOString() })
    .eq('id', bipId)
    .eq('created_by', userId)
    .eq('status', 'rejected')
  if (updateError) {
    console.error('[reviseRejectedBipAction] update error:', updateError.message)
    return { error: 'Failed to reopen this BIP. Please try again.' }
  }

  // Bust the dashboard cache so the BIP moves out of the Rejected tab into Draft.
  revalidatePath('/dashboard')
  return { success: true, bipId }
}
