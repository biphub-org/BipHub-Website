/**
 * Admin coordinator-requests query — access-request review inbox.
 *
 * Auth: getClaims() validates JWT signature (CLAUDE.md — never getSession).
 * RLS: coordinator_requests_select_admin allows admin to read all rows.
 * No service-role client needed for reads.
 */

import { createClient } from '@/lib/supabase/server'

export type CoordinatorRequestStatus = 'pending' | 'approved' | 'rejected'

export type AdminCoordinatorRequest = {
  id: string
  email: string
  full_name: string
  country: string | null
  erasmus_code: string | null
  university: { id: string; name: string; country: string } | null
  status: CoordinatorRequestStatus
  created_at: string
  reviewed_at: string | null
}

type RawUniversity =
  | { id: string; name: string; country: string }
  | Array<{ id: string; name: string; country: string }>
  | null

type RawRow = {
  id: string
  email: string
  full_name: string
  country: string | null
  erasmus_code: string | null
  status: string
  created_at: string
  reviewed_at: string | null
  university: RawUniversity
}

function normalizeUniversity(raw: RawUniversity) {
  if (!raw) return null
  if (Array.isArray(raw)) return raw[0] ?? null
  return raw
}

async function requireAdminRole(): Promise<boolean> {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) return false
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  return role === 'admin'
}

export async function getAdminCoordinatorRequests(
  status?: CoordinatorRequestStatus,
): Promise<AdminCoordinatorRequest[]> {
  if (!(await requireAdminRole())) return []

  const supabase = await createClient()
  let query = supabase
    .from('coordinator_requests')
    .select(
      `id, email, full_name, country, erasmus_code, status, created_at, reviewed_at,
       university:university_id ( id, name, country )`,
    )
    .order('created_at', { ascending: false })
    .limit(1000)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) {
    console.error('[getAdminCoordinatorRequests] supabase error:', error.message)
    return []
  }

  return ((data ?? []) as unknown as RawRow[]).map((r) => ({
    id: r.id,
    email: r.email,
    full_name: r.full_name,
    country: r.country,
    erasmus_code: r.erasmus_code,
    university: normalizeUniversity(r.university),
    status: (r.status === 'approved' || r.status === 'rejected' ? r.status : 'pending') as CoordinatorRequestStatus,
    created_at: r.created_at,
    reviewed_at: r.reviewed_at,
  }))
}

export async function getPendingCoordinatorRequestCount(): Promise<number> {
  if (!(await requireAdminRole())) return 0

  const supabase = await createClient()
  const { count, error } = await supabase
    .from('coordinator_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (error) {
    console.error('[getPendingCoordinatorRequestCount] supabase error:', error.message)
    return 0
  }
  return count ?? 0
}
