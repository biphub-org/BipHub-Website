/**
 * Coordinator dashboard data fetcher.
 *
 * Returns every BIP whose `created_by` matches the current authenticated user.
 * Defense-in-depth: the explicit `eq('created_by', claims.sub)` filter narrows
 * to owned rows even though RLS `bips_select_own_or_approved` would also allow
 * SELECTing approved BIPs (we want to exclude approved seed BIPs that someone
 * else created — the dashboard shows only the coordinator's own work).
 *
 * Auth: uses `getClaims()` (CLAUDE.md never-do compliance — never the
 * unvalidated session reader server-side).
 *
 * Phase 3 (D-09): `rejection_reason` is populated from the latest matching
 * row in `bip_status_history` (to_status='rejected', action_kind='reject',
 * note=admin's reason). Fetched in a single batched query for the rejected
 * BIPs after the main list query — keeps the dashboard render to two
 * round-trips total (often one, if the coordinator has no rejected BIPs).
 */
import { createClient } from '@/lib/supabase/server'
import { getLatestRejectionsByBipIds } from './statusHistory'

export type CoordinatorBipStatus = 'draft' | 'pending' | 'approved' | 'rejected'

export type CoordinatorBip = {
  id: string
  slug: string
  title: string
  status: CoordinatorBipStatus
  subject_areas: string[]
  host_city: string | null
  application_deadline: string | null
  physical_start_date: string | null
  updated_at: string
  created_at: string
  host_university: { id: string; name: string; country: string } | null
  rejection_reason: string | null
}

export async function getCoordinatorBips(): Promise<CoordinatorBip[]> {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) return []

  const { data, error } = await supabase
    .from('bips')
    .select(`
      id, slug, title, status, subject_areas, host_city,
      application_deadline, physical_start_date,
      updated_at, created_at,
      host_university:host_university_id ( id, name, country )
    `)
    .eq('created_by', claims.sub)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('[getCoordinatorBips] supabase error:', error.message)
    return []
  }

  const rows: CoordinatorBip[] = (data ?? []).map((row) => {
    // PostgREST may return the embedded relation as a single object or a
    // single-element array depending on the FK shape. Normalize defensively.
    const hostUniversity = Array.isArray(row.host_university)
      ? (row.host_university[0] ?? null)
      : (row.host_university ?? null)

    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      status: row.status as CoordinatorBipStatus,
      subject_areas: row.subject_areas ?? [],
      host_city: row.host_city,
      application_deadline: row.application_deadline,
      physical_start_date: row.physical_start_date,
      updated_at: row.updated_at,
      created_at: row.created_at,
      host_university: hostUniversity,
      // Populated below from bip_status_history for status='rejected' rows.
      rejection_reason: null,
    }
  })

  // Phase 3 D-09: wire the latest rejection reason from bip_status_history.
  // Only fetch when there is at least one rejected BIP — skip the round-trip
  // entirely for coordinators with no rejections.
  const rejectedIds = rows.filter((r) => r.status === 'rejected').map((r) => r.id)
  if (rejectedIds.length > 0) {
    const reasons = await getLatestRejectionsByBipIds(rejectedIds)
    for (const row of rows) {
      if (row.status === 'rejected') {
        row.rejection_reason = reasons.get(row.id) ?? null
      }
    }
  }

  return rows
}
