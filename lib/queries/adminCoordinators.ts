/**
 * Admin coordinators query — view coordinators subpage.
 *
 * Auth: getClaims() validates JWT signature (CLAUDE.md — never getSession).
 * RLS: profiles_select_own_or_admin allows admin to read all coordinator rows.
 * No service-role client needed. Bip counts are grouped JS-side (v1 scale).
 */

import { createClient } from '@/lib/supabase/server'

export type AdminCoordinator = {
  id: string
  full_name: string | null
  contact_email: string | null
  erasmus_code: string | null
  university: { id: string; name: string; country: string } | null
  created_at: string
  updated_at: string
  bipCount: number
}

export type AdminCoordinatorsFilter = {
  q?: string
  country?: string[]
}

type RawUniversity =
  | { id: string; name: string; country: string }
  | Array<{ id: string; name: string; country: string }>
  | null

type RawRow = {
  id: string
  full_name: string | null
  contact_email: string | null
  erasmus_code: string | null
  university_id: string | null
  role: string
  created_at: string
  updated_at: string
  university: RawUniversity
}

function normalizeUniversity(raw: RawUniversity) {
  if (!raw) return null
  if (Array.isArray(raw)) return raw[0] ?? null
  return raw
}

export async function getAdminCoordinators(
  filter: AdminCoordinatorsFilter = {},
): Promise<AdminCoordinator[]> {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) return []
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role !== 'admin') return []

  const q = filter.q?.trim().toLowerCase() ?? ''
  const countries = filter.country?.map((c) => c.toUpperCase()).filter(Boolean) ?? []
  const doCountryFilter = countries.length > 0

  // Fetch all coordinators with optional country inner join
  const universityJoin = doCountryFilter
    ? 'university:university_id!inner ( id, name, country )'
    : 'university:university_id ( id, name, country )'

  let query = supabase
    .from('profiles')
    .select(`id, full_name, contact_email, erasmus_code, university_id, role, created_at, updated_at, ${universityJoin}`)
    .eq('role', 'coordinator')
    .order('created_at', { ascending: false })
    .limit(5000)

  if (doCountryFilter) {
    query = query.in('university.country', countries)
  }

  const { data, error } = await query
  if (error) {
    console.error('[getAdminCoordinators] supabase error:', error.message)
    return []
  }

  let rows = (data ?? []) as unknown as RawRow[]

  // Client-side search across name / email / university name (covers uni name that PostgREST or can't)
  if (q) {
    rows = rows.filter((r) => {
      const uni = normalizeUniversity(r.university)
      return (
        r.full_name?.toLowerCase().includes(q) ||
        r.contact_email?.toLowerCase().includes(q) ||
        uni?.name.toLowerCase().includes(q)
      )
    })
  }

  // BIP counts per coordinator (group in JS)
  const ids = rows.map((r) => r.id)
  const bipCountMap = new Map<string, number>()
  if (ids.length > 0) {
    const { data: bips, error: bipErr } = await supabase
      .from('bips')
      .select('created_by')
      .in('created_by', ids)
      .limit(5000)
    if (!bipErr && bips) {
      for (const row of bips as { created_by: string | null }[]) {
        if (!row.created_by) continue
        bipCountMap.set(row.created_by, (bipCountMap.get(row.created_by) ?? 0) + 1)
      }
    } else if (bipErr) {
      console.error('[getAdminCoordinators] bip count error:', bipErr.message)
    }
  }

  return rows.map((r) => ({
    id: r.id,
    full_name: r.full_name,
    contact_email: r.contact_email,
    erasmus_code: r.erasmus_code,
    university: normalizeUniversity(r.university),
    created_at: r.created_at,
    updated_at: r.updated_at,
    bipCount: bipCountMap.get(r.id) ?? 0,
  }))
}

export async function getAdminCoordinatorById(id: string): Promise<AdminCoordinator | null> {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (!claims?.sub) return null
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role !== 'admin') return null

  const { data, error } = await supabase
    .from('profiles')
    .select(`id, full_name, contact_email, erasmus_code, university_id, role, created_at, updated_at, university:university_id ( id, name, country )`)
    .eq('id', id)
    .eq('role', 'coordinator')
    .maybeSingle()

  if (error || !data) return null
  const row = data as unknown as RawRow

  const { count } = await supabase
    .from('bips')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', id)

  return {
    id: row.id,
    full_name: row.full_name,
    contact_email: row.contact_email,
    erasmus_code: row.erasmus_code,
    university: normalizeUniversity(row.university),
    created_at: row.created_at,
    updated_at: row.updated_at,
    bipCount: count ?? 0,
  }
}
