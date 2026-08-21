/**
 * Status history queries (Phase 3 — D-09).
 *
 * Reads bip_status_history rows. RLS policy bsh_select_own_or_admin
 * (migration 00010) enforces:
 *   - admins: see all rows
 *   - coordinators: see rows where bip_id matches a BIP they own
 *
 * Defense-in-depth: getClaims() is invoked here even though RLS is the
 * primary authorization layer — the auth check returns null on session
 * failure so callers degrade gracefully instead of leaking generic
 * Supabase errors.
 *
 * Auth: getClaims() — NEVER getSession (CLAUDE.md never-do).
 * Client: createClient (anon-key) — NEVER createAdminClient (out of scope).
 */
import { createClient } from '@/lib/supabase/server'

export type LatestRejection = { reason: string | null; created_at: string } | null

/**
 * Latest rejection (most recent to_status='rejected' row) for a single BIP.
 *
 * Returns null if there is no rejection in the audit history, or if the
 * caller's session is invalid. The `note` column carries the admin's
 * verbatim reason (action_kind='reject' written by rejectBipAction).
 */
export async function getLatestRejection(bipId: string): Promise<LatestRejection> {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  if (authError || !authData?.claims?.sub) return null

  const { data, error } = await supabase
    .from('bip_status_history')
    .select('note, created_at')
    .eq('bip_id', bipId)
    .eq('to_status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[getLatestRejection] supabase error:', error.message)
    return null
  }
  return data ? { reason: data.note, created_at: data.created_at } : null
}

/**
 * Batched version for the coordinator dashboard. Returns a map of
 * bipId → latest rejection reason. Fetches all matching history rows
 * for the given bipIds in one query and reduces in JS (avoids N+1).
 * Coordinator RLS already scopes to their own BIPs.
 *
 * The rows are pre-sorted desc by created_at, so the first hit per
 * bip_id in the reduce wins (most recent rejection).
 */
export async function getLatestRejectionsByBipIds(
  bipIds: string[],
): Promise<Map<string, string>> {
  if (bipIds.length === 0) return new Map()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('bip_status_history')
    .select('bip_id, note, created_at')
    .eq('to_status', 'rejected')
    .in('bip_id', bipIds)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getLatestRejectionsByBipIds] supabase error:', error.message)
    return new Map()
  }

  const out = new Map<string, string>()
  for (const row of data ?? []) {
    if (!row.bip_id || !row.note) continue
    if (out.has(row.bip_id)) continue // first row per bip_id wins (already sorted desc)
    out.set(row.bip_id, row.note)
  }
  return out
}
