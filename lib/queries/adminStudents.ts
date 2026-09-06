/**
 * Admin students query — view students subpage + student detail.
 *
 * Mirrors lib/queries/adminCoordinators.ts:
 *   - Auth: getClaims() validates JWT signature (CLAUDE.md — never getSession).
 *   - RLS: profiles_select_own_or_admin + bip_alert_preferences_select_admin +
 *     saved_bips_select_admin let an admin read all three via the anon client.
 *     No service-role client needed (CLAUDE.md never-do).
 *   - Counts are grouped JS-side (v1 scale).
 */

import { createClient } from '@/lib/supabase/server'

export type AdminStudentAlerts = {
  fields: string[]
  countries: string[]
  iscedCodes: string[]
  frequency: string
  updatedAt: string
}

export type AdminStudent = {
  id: string
  fullName: string | null
  contactEmail: string | null
  country: string | null
  university: { id: string; name: string; country: string } | null
  createdAt: string
  savedCount: number
  alerts: AdminStudentAlerts | null
}

export type AdminSavedBip = {
  id: string
  slug: string
  title: string
  status: string
  savedAt: string
}

export type AdminStudentDetail = AdminStudent & {
  savedBips: AdminSavedBip[]
}

export type AdminStudentsFilter = {
  q?: string
  /** 'all' (default) | 'on' (has alert prefs) | 'off' (no alert prefs) */
  alerts?: 'all' | 'on' | 'off'
}

type RawUniversity =
  | { id: string; name: string; country: string }
  | Array<{ id: string; name: string; country: string }>
  | null

function normalizeUniversity(raw: RawUniversity) {
  if (!raw) return null
  if (Array.isArray(raw)) return raw[0] ?? null
  return raw
}

type RawStudentRow = {
  id: string
  full_name: string | null
  contact_email: string | null
  country: string | null
  created_at: string
  university: RawUniversity
}

const FULL_PROFILE_SELECT =
  'id, full_name, contact_email, country, created_at, university:university_id ( id, name, country )'
const LEGACY_PROFILE_SELECT = 'id, full_name, contact_email, created_at'

/**
 * PostgREST "column does not exist" — the connected DB is behind local
 * migrations (e.g. 00050 not applied yet). Callers fall back to the legacy
 * column set instead of failing the whole page.
 */
function isMissingColumnError(error: { message: string }): boolean {
  return /column .* does not exist/i.test(error.message)
}

type RawPrefsRow = {
  user_id: string
  fields: string[] | null
  countries: string[] | null
  isced_codes: string[] | null
  frequency: string
  updated_at: string
}

function normalizeAlerts(row: RawPrefsRow): AdminStudentAlerts {
  return {
    fields: row.fields ?? [],
    countries: row.countries ?? [],
    iscedCodes: row.isced_codes ?? [],
    frequency: row.frequency,
    updatedAt: row.updated_at,
  }
}

/**
 * One-line summary for the list card chip, e.g. "Weekly · 2 fields · 1 country".
 * Dimensions with zero selections are omitted; frequency is always shown and
 * capitalised. Pure — unit-tested.
 */
export function formatAlertSummary(alerts: AdminStudentAlerts): string {
  const parts: string[] = [
    alerts.frequency.charAt(0).toUpperCase() + alerts.frequency.slice(1),
  ]
  if (alerts.fields.length > 0) {
    parts.push(`${alerts.fields.length} field${alerts.fields.length === 1 ? '' : 's'}`)
  }
  if (alerts.countries.length > 0) {
    parts.push(
      `${alerts.countries.length} countr${alerts.countries.length === 1 ? 'y' : 'ies'}`,
    )
  }
  if (alerts.iscedCodes.length > 0) {
    parts.push(`${alerts.iscedCodes.length} ISCED`)
  }
  return parts.join(' · ')
}

async function requireAdmin(): Promise<ReturnType<typeof createClient> | null> {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) return null
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role !== 'admin') return null
  return supabase
}

export async function getAdminStudents(
  filter: AdminStudentsFilter = {},
): Promise<AdminStudent[]> {
  const supabase = await requireAdmin()
  if (!supabase) return []

  const q = filter.q?.trim().toLowerCase() ?? ''
  const alertsFilter = filter.alerts ?? 'all'

  const full = await supabase
    .from('profiles')
    .select(FULL_PROFILE_SELECT)
    .eq('role', 'student')
    .order('created_at', { ascending: false })
    .limit(5000)
  let data: typeof full.data = full.data
  let error = full.error

  if (error && isMissingColumnError(error)) {
    console.warn(
      '[getAdminStudents] profiles.country is missing — apply supabase/migrations/00050_student_profile_country.sql. Falling back without country/university.',
    )
    const legacy = await supabase
      .from('profiles')
      .select(LEGACY_PROFILE_SELECT)
      .eq('role', 'student')
      .order('created_at', { ascending: false })
      .limit(5000)
    data = legacy.data as typeof full.data
    error = legacy.error
  }

  if (error) {
    console.error('[getAdminStudents] supabase error:', error.message)
    return []
  }

  let rows = (data ?? []) as unknown as RawStudentRow[]

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

  const ids = rows.map((r) => r.id)
  const alertsMap = new Map<string, AdminStudentAlerts>()
  const savedCountMap = new Map<string, number>()

  if (ids.length > 0) {
    const { data: prefs, error: prefsErr } = await supabase
      .from('bip_alert_preferences')
      .select('user_id, fields, countries, isced_codes, frequency, updated_at')
      .in('user_id', ids)
      .limit(5000)
    if (!prefsErr && prefs) {
      for (const row of prefs as unknown as RawPrefsRow[]) {
        alertsMap.set(row.user_id, normalizeAlerts(row))
      }
    } else if (prefsErr) {
      console.error('[getAdminStudents] alert prefs error:', prefsErr.message)
    }

    const { data: saved, error: savedErr } = await supabase
      .from('saved_bips')
      .select('user_id')
      .in('user_id', ids)
      .limit(5000)
    if (!savedErr && saved) {
      for (const row of saved as Array<{ user_id: string }>) {
        savedCountMap.set(row.user_id, (savedCountMap.get(row.user_id) ?? 0) + 1)
      }
    } else if (savedErr) {
      console.error('[getAdminStudents] saved count error:', savedErr.message)
    }
  }

  const students: AdminStudent[] = rows.map((r) => ({
    id: r.id,
    fullName: r.full_name,
    contactEmail: r.contact_email,
    country: r.country ?? null,
    university: normalizeUniversity(r.university ?? null),
    createdAt: r.created_at,
    savedCount: savedCountMap.get(r.id) ?? 0,
    alerts: alertsMap.get(r.id) ?? null,
  }))

  if (alertsFilter === 'on') return students.filter((s) => s.alerts !== null)
  if (alertsFilter === 'off') return students.filter((s) => s.alerts === null)
  return students
}

export async function getAdminStudentById(id: string): Promise<AdminStudentDetail | null> {
  const supabase = await requireAdmin()
  if (!supabase) return null

  const full = await supabase
    .from('profiles')
    .select(FULL_PROFILE_SELECT)
    .eq('id', id)
    .eq('role', 'student')
    .maybeSingle()
  let profile: typeof full.data = full.data
  let profileErr = full.error

  if (profileErr && isMissingColumnError(profileErr)) {
    console.warn(
      '[getAdminStudentById] profiles.country is missing — apply supabase/migrations/00050_student_profile_country.sql. Falling back without country/university.',
    )
    const legacy = await supabase
      .from('profiles')
      .select(LEGACY_PROFILE_SELECT)
      .eq('id', id)
      .eq('role', 'student')
      .maybeSingle()
    profile = legacy.data as typeof full.data
    profileErr = legacy.error
  }

  if (profileErr || !profile) return null
  const row = profile as unknown as RawStudentRow

  const { data: prefs } = await supabase
    .from('bip_alert_preferences')
    .select('user_id, fields, countries, isced_codes, frequency, updated_at')
    .eq('user_id', id)
    .maybeSingle()

  const { data: saved, count } = await supabase
    .from('saved_bips')
    .select(
      'saved_at, bips:bip_id ( id, slug, title, status )',
      { count: 'exact' },
    )
    .eq('user_id', id)
    .order('saved_at', { ascending: false })
    .limit(500)

  type SavedRow = {
    saved_at: string
    bips: { id: string; slug: string; title: string; status: string } | null
  }
  const savedBips: AdminSavedBip[] = ((saved ?? []) as unknown as SavedRow[])
    .filter((r) => r.bips !== null)
    .map((r) => ({
      id: (r.bips as NonNullable<SavedRow['bips']>).id,
      slug: (r.bips as NonNullable<SavedRow['bips']>).slug,
      title: (r.bips as NonNullable<SavedRow['bips']>).title,
      status: (r.bips as NonNullable<SavedRow['bips']>).status,
      savedAt: r.saved_at,
    }))

  return {
    id: row.id,
    fullName: row.full_name,
    contactEmail: row.contact_email,
    country: row.country ?? null,
    university: normalizeUniversity(row.university ?? null),
    createdAt: row.created_at,
    savedCount: count ?? savedBips.length,
    alerts: prefs ? normalizeAlerts(prefs as unknown as RawPrefsRow) : null,
    savedBips,
  }
}
