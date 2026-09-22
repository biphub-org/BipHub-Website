/**
 * Coordinator profile-change request queries (migration 00059).
 *
 *   - getMyProfileChangeRequests: the calling coordinator's own requests
 *     (pending first, then newest) for /dashboard/settings.
 *   - getAdminProfileChangeRequests: full inbox for admins, each row carrying
 *     the coordinator's CURRENT profile values so the review card can render
 *     a current → requested diff.
 *   - getPendingProfileChangeRequestCount: sidebar/inbox badge.
 *
 * Auth: getClaims() validates JWT signature (CLAUDE.md — never getSession).
 * RLS: cp_change_select_own / cp_change_select_admin scope every read.
 */

import { createClient } from '@/lib/supabase/server'

export type ProfileChangeStatus = 'pending' | 'approved' | 'declined'

export type UniversityRef = {
  id: string
  name: string
  country: string
} | null

export type MyProfileChangeRequest = {
  id: string
  status: ProfileChangeStatus
  requested_full_name: string
  requested_contact_email: string
  requested_erasmus_code: string | null
  requested_university: UniversityRef
  admin_note: string | null
  created_at: string
  reviewed_at: string | null
}

export type AdminProfileChangeRequest = MyProfileChangeRequest & {
  coordinator_id: string
  coordinator_email: string | null
  current_full_name: string | null
  current_contact_email: string | null
  current_erasmus_code: string | null
  current_university: UniversityRef
}

type RawUniversity =
  | { id: string; name: string; country: string }
  | Array<{ id: string; name: string; country: string }>
  | null

function normalizeUniversity(raw: RawUniversity): UniversityRef {
  if (!raw) return null
  if (Array.isArray(raw)) return raw[0] ?? null
  return raw
}

function toStatus(raw: string): ProfileChangeStatus {
  return raw === 'approved' || raw === 'declined' ? raw : 'pending'
}

async function getClaimsRole(): Promise<{
  sub: string
  role: string | undefined
} | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) return null
  const role = (data.claims as { app_metadata?: { role?: string } }).app_metadata
    ?.role
  return { sub: data.claims.sub, role }
}

const REQUEST_COLUMNS = `id, coordinator_id, status, requested_full_name,
  requested_contact_email, requested_erasmus_code, admin_note,
  created_at, reviewed_at,
  requested_university:requested_university_id ( id, name, country )`

export async function getMyProfileChangeRequests(): Promise<
  MyProfileChangeRequest[]
> {
  const claims = await getClaimsRole()
  if (!claims) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('coordinator_profile_change_requests')
    .select(REQUEST_COLUMNS)
    .eq('coordinator_id', claims.sub)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('[getMyProfileChangeRequests] supabase error:', error.message)
    return []
  }

  type Row = {
    id: string
    status: string
    requested_full_name: string
    requested_contact_email: string
    requested_erasmus_code: string | null
    requested_university: RawUniversity
    admin_note: string | null
    created_at: string
    reviewed_at: string | null
  }
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    status: toStatus(r.status),
    requested_full_name: r.requested_full_name,
    requested_contact_email: r.requested_contact_email,
    requested_erasmus_code: r.requested_erasmus_code,
    requested_university: normalizeUniversity(r.requested_university),
    admin_note: r.admin_note,
    created_at: r.created_at,
    reviewed_at: r.reviewed_at,
  }))
}

export async function getAdminProfileChangeRequests(
  status?: ProfileChangeStatus,
): Promise<AdminProfileChangeRequest[]> {
  const claims = await getClaimsRole()
  if (!claims || claims.role !== 'admin') return []

  const supabase = await createClient()
  let query = supabase
    .from('coordinator_profile_change_requests')
    .select(REQUEST_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(1000)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) {
    console.error('[getAdminProfileChangeRequests] supabase error:', error.message)
    return []
  }

  type Row = {
    id: string
    coordinator_id: string
    status: string
    requested_full_name: string
    requested_contact_email: string
    requested_erasmus_code: string | null
    requested_university: RawUniversity
    admin_note: string | null
    created_at: string
    reviewed_at: string | null
  }
  const rows = ((data ?? []) as unknown as Row[])

  // Current profile values come from a second query (JS-side join, mirroring
  // getAdminCoordinators) so the inbox never depends on an FK hint name.
  const profileMap = new Map<
    string,
    {
      full_name: string | null
      contact_email: string | null
      erasmus_code: string | null
      university: RawUniversity
    }
  >()
  const ids = [...new Set(rows.map((r) => r.coordinator_id))]
  if (ids.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select(
        'id, full_name, contact_email, erasmus_code, university:university_id ( id, name, country )',
      )
      .in('id', ids)
    if (profileError) {
      console.error(
        '[getAdminProfileChangeRequests] profile fetch error:',
        profileError.message,
      )
    } else {
      for (const p of (profiles ?? []) as unknown as Array<{
        id: string
        full_name: string | null
        contact_email: string | null
        erasmus_code: string | null
        university: RawUniversity
      }>) {
        profileMap.set(p.id, {
          full_name: p.full_name,
          contact_email: p.contact_email,
          erasmus_code: p.erasmus_code,
          university: p.university,
        })
      }
    }
  }

  return rows.map((r) => {
    const current = profileMap.get(r.coordinator_id) ?? null
    return {
      id: r.id,
      coordinator_id: r.coordinator_id,
      coordinator_email: current?.contact_email ?? null,
      status: toStatus(r.status),
      requested_full_name: r.requested_full_name,
      requested_contact_email: r.requested_contact_email,
      requested_erasmus_code: r.requested_erasmus_code,
      requested_university: normalizeUniversity(r.requested_university),
      admin_note: r.admin_note,
      created_at: r.created_at,
      reviewed_at: r.reviewed_at,
      current_full_name: current?.full_name ?? null,
      current_contact_email: current?.contact_email ?? null,
      current_erasmus_code: current?.erasmus_code ?? null,
      current_university: normalizeUniversity(current?.university ?? null),
    }
  })
}

export async function getPendingProfileChangeRequestCount(): Promise<number> {
  const claims = await getClaimsRole()
  if (!claims || claims.role !== 'admin') return 0

  const supabase = await createClient()
  const { count, error } = await supabase
    .from('coordinator_profile_change_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (error) {
    console.error(
      '[getPendingProfileChangeRequestCount] supabase error:',
      error.message,
    )
    return 0
  }
  return count ?? 0
}
