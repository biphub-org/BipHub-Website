import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCountryName } from '@/lib/countries'

/**
 * GET /admin/export.csv — admin-guarded CSV export
 *
 * Extended to support five user-requested export scopes:
 *  1. Filtered BIPs — respects ALL admin/bips filters (status, q, country, field, lang, dates, availability, level)
 *  2. Selected BIPs — via `ids` param (comma-separated UUIDs). When present, restricts to those IDs (intersected with admin RLS).
 *  3. Coordinator profiles — via `entity=coordinators` (alias `dataset`). Exports profiles with role=coordinator.
 *  4. Student data — via `entity=students`. Exports profiles with role=student
 *     plus saved-BIP counts and alert-preference columns. Supports q, alerts
 *     (on/off) and ids params mirroring the /admin/students filters.
 *  5. Analytics snapshot — via `entity=analytics`. Exports category,metric,value
 *     rows: overview totals, BIPs by status, BIPs by host country.
 *
 * Query params (BIPs):
 *  - status, q, country, field, lang, dateFrom, dateTo, availability, level, ids
 *  - entity: 'bips' (default) | 'coordinators' | 'students' | 'analytics'
 *
 * Auth: getClaims() + role='admin' — defense in depth; RLS also scopes.
 */

const VALID_STATUSES = new Set([
  'all',
  'draft',
  'pending',
  'approved',
  'rejected',
  'changes_requested',
])

const VALID_AVAILABILITY = new Set(['open', 'closed', 'any'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function escapeCsv(value: string | null | undefined): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function parseCsvParam(sp: URLSearchParams, key: string): string[] | undefined {
  const raw = sp.get(key)
  if (!raw) return undefined
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  // Also support repeated keys ?country=DE&country=FR → getAll already merged by URLSearchParams.get but we handle getAll separately via caller
  return parts.length ? parts : undefined
}

function csvDownload(csv: string, filename: string): NextResponse {
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

/** PostgREST "column does not exist" — the DB is behind local migrations. */
function isMissingColumnError(error: { message: string }): boolean {
  return /column .* does not exist/i.test(error.message)
}

function parseIds(sp: URLSearchParams): string[] | null {
  // Support ids=id1,id2 and repeated ?ids=id1&ids=id2
  const all = sp.getAll('ids').flatMap((v) => v.split(',').map((s) => s.trim())).filter(Boolean)
  // Also support alias `selected` and `id`
  const alt = sp.getAll('selected').flatMap((v) => v.split(',').map((s) => s.trim())).filter(Boolean)
  const merged = [...all, ...alt]
  if (merged.length === 0) return null
  // Validate UUIDs, cap at 500 to avoid URL abuse
  const valid = merged.filter((id) => UUID_RE.test(id)).slice(0, 500)
  return valid.length ? valid : null
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims as { sub?: string; app_metadata?: { role?: string } } | null
  if (authError || !claims?.sub) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  if (claims.app_metadata?.role !== 'admin') {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const sp = req.nextUrl.searchParams
  const entityRaw = (sp.get('entity') ?? sp.get('dataset') ?? 'bips').toLowerCase()
  const entity =
    entityRaw === 'coordinators' || entityRaw === 'coordinator' || entityRaw === 'profiles'
      ? 'coordinators'
      : entityRaw === 'students' || entityRaw === 'student'
        ? 'students'
        : entityRaw === 'analytics'
          ? 'analytics'
          : 'bips'

  const today = new Date().toISOString().slice(0, 10)

  // ── Coordinators export ──────────────────────────────────────────────
  if (entity === 'coordinators') {
    const ids = parseIds(sp)
    const q = sp.get('q')?.trim() ?? ''
    const countryParam = parseCsvParam(sp, 'country')
    const doCountryFilter = !!countryParam?.length

    // Build profiles query — admin can read all via RLS
    const universityJoin = doCountryFilter
      ? 'university:university_id!inner ( name, country )'
      : 'university:university_id ( name, country )'

    let query = supabase
      .from('profiles')
      .select(`id, full_name, contact_email, university_id, role, created_at, updated_at, erasmus_code, ${universityJoin}`)
      .eq('role', 'coordinator')
      .order('created_at', { ascending: false }).limit(5000)

    if (ids) {
      query = query.in('id', ids)
    } else {
      if (q) {
        // Sanitize q for ilike — escape % and _
        const safe = q.replace(/[%_]/g, '\\$&')
        query = query.or(`full_name.ilike.%${safe}%,contact_email.ilike.%${safe}%`)
      }
      if (doCountryFilter) {
        const upper = countryParam!.map((c) => c.toUpperCase())
        // PostgREST embedded filter: university.country
        query = query.in('university.country', upper)
      }
    }

    const { data, error } = await query
    if (error) {
      console.error('[GET /admin/export.csv] coordinators query error:', error.message)
      return new NextResponse('Failed to fetch', { status: 500 })
    }

    type Row = {
      id: string
      full_name: string | null
      contact_email: string | null
      university_id: string | null
      role: string
      created_at: string
      updated_at: string
      erasmus_code: string | null
      university: { name: string; country: string } | { name: string; country: string }[] | null
    }
    const rows = (data ?? []) as unknown as Row[]

    const header = [
      'id',
      'full_name',
      'contact_email',
      'university_name',
      'university_country',
      'university_id',
      'erasmus_code',
      'role',
      'created_at',
      'updated_at',
    ]

    const lines = [header.map(escapeCsv).join(',')]
    for (const r of rows) {
      const uni = Array.isArray(r.university) ? r.university[0] : r.university
      lines.push(
        [
          r.id,
          r.full_name ?? '',
          r.contact_email ?? '',
          uni?.name ?? '',
          uni?.country ?? '',
          r.university_id ?? '',
          r.erasmus_code ?? '',
          r.role ?? '',
          r.created_at ?? '',
          r.updated_at ?? '',
        ]
          .map(escapeCsv)
          .join(','),
      )
    }

    const csv = lines.join('\n')
    const suffix = ids ? `selected-${ids.length}` : q || doCountryFilter ? 'filtered' : 'all'
    const filename = `biphub-coordinators-${suffix}-${today}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  // ── Students export ──────────────────────────────────────────────────
  if (entity === 'students') {
    const ids = parseIds(sp)
    const q = sp.get('q')?.trim() ?? ''
    const alertsRaw = (sp.get('alerts') ?? 'all').toLowerCase()
    const alertsFilter = alertsRaw === 'on' || alertsRaw === 'off' ? alertsRaw : 'all'

    const FULL_SELECT =
      'id, full_name, contact_email, country, created_at, updated_at, university:university_id ( name, country )'
    const LEGACY_SELECT = 'id, full_name, contact_email, created_at, updated_at'

    const applyProfileFilters = <T>(qb: T): T => {
      // Typed loosely: PostgREST query builder chaining preserves its own type.
      const b = qb as unknown as {
        in: (col: string, vals: string[]) => unknown
        or: (expr: string) => unknown
      }
      if (ids) b.in('id', ids)
      else if (q) {
        const safe = q.replace(/[%_]/g, '\\$&')
        b.or(`full_name.ilike.%${safe}%,contact_email.ilike.%${safe}%`)
      }
      return qb
    }

    const profileQuery = applyProfileFilters(
      supabase
        .from('profiles')
        .select(FULL_SELECT)
        .eq('role', 'student')
        .order('created_at', { ascending: false })
        .limit(5000),
    )
    let { data, error } = await profileQuery

    if (error && isMissingColumnError(error)) {
      console.warn(
        '[GET /admin/export.csv] profiles.country missing — migration 00050 not applied; exporting students without country/university.',
      )
      const legacyQuery = applyProfileFilters(
        supabase
          .from('profiles')
          .select(LEGACY_SELECT)
          .eq('role', 'student')
          .order('created_at', { ascending: false })
          .limit(5000),
      )
      const retry = await legacyQuery
      data = retry.data as typeof data
      error = retry.error
    }

    if (error) {
      console.error('[GET /admin/export.csv] students query error:', error.message)
      return new NextResponse('Failed to fetch', { status: 500 })
    }

    type StudentRow = {
      id: string
      full_name: string | null
      contact_email: string | null
      country?: string | null
      created_at: string
      updated_at: string
      university?: { name: string; country: string } | { name: string; country: string }[] | null
    }
    const rows = (data ?? []) as unknown as StudentRow[]
    const studentIds = rows.map((r) => r.id)

    // Alert preferences (batch) — missing table (00048 not applied) degrades
    // to "no alerts" rather than failing the export.
    type PrefsRow = {
      user_id: string
      fields: string[] | null
      countries: string[] | null
      isced_codes: string[] | null
      frequency: string
    }
    const prefsMap = new Map<string, PrefsRow>()
    const savedCountMap = new Map<string, number>()
    if (studentIds.length > 0) {
      const { data: prefs, error: prefsErr } = await supabase
        .from('bip_alert_preferences')
        .select('user_id, fields, countries, isced_codes, frequency')
        .in('user_id', studentIds)
        .limit(5000)
      if (!prefsErr && prefs) {
        for (const row of prefs as unknown as PrefsRow[]) prefsMap.set(row.user_id, row)
      } else if (prefsErr) {
        console.warn('[GET /admin/export.csv] alert prefs unavailable:', prefsErr.message)
      }

      // Saved-BIP counts (group JS-side, v1 scale)
      const { data: saved, error: savedErr } = await supabase
        .from('saved_bips')
        .select('user_id')
        .in('user_id', studentIds)
        .limit(5000)
      if (!savedErr && saved) {
        for (const row of saved as Array<{ user_id: string }>) {
          savedCountMap.set(row.user_id, (savedCountMap.get(row.user_id) ?? 0) + 1)
        }
      } else if (savedErr) {
        console.error('[GET /admin/export.csv] saved count error:', savedErr.message)
      }
    }

    let filtered = rows
    if (alertsFilter === 'on') filtered = rows.filter((r) => prefsMap.has(r.id))
    if (alertsFilter === 'off') filtered = rows.filter((r) => !prefsMap.has(r.id))

    const header = [
      'id',
      'full_name',
      'contact_email',
      'country',
      'home_university_name',
      'home_university_country',
      'role',
      'created_at',
      'updated_at',
      'saved_count',
      'alerts_on',
      'alert_frequency',
      'alert_fields',
      'alert_countries',
      'alert_isced_codes',
    ]

    const lines = [header.map(escapeCsv).join(',')]
    for (const r of filtered) {
      const uniRaw = r.university ?? null
      const uni = Array.isArray(uniRaw) ? uniRaw[0] : uniRaw
      const prefs = prefsMap.get(r.id) ?? null
      lines.push(
        [
          r.id,
          r.full_name ?? '',
          r.contact_email ?? '',
          r.country ?? '',
          uni?.name ?? '',
          uni?.country ?? '',
          'student',
          r.created_at ?? '',
          r.updated_at ?? '',
          String(savedCountMap.get(r.id) ?? 0),
          prefs ? 'true' : 'false',
          prefs?.frequency ?? '',
          (prefs?.fields ?? []).join(';'),
          (prefs?.countries ?? []).join(';'),
          (prefs?.isced_codes ?? []).join(';'),
        ]
          .map(escapeCsv)
          .join(','),
      )
    }

    const suffix = ids
      ? `selected-${ids.length}`
      : q || alertsFilter !== 'all'
        ? 'filtered'
        : 'all'
    return csvDownload(lines.join('\n'), `biphub-students-${suffix}-${today}.csv`)
  }

  // ── Analytics export ─────────────────────────────────────────────────
  if (entity === 'analytics') {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: totalBips } = await supabase
      .from('bips')
      .select('id', { count: 'exact', head: true })
    const { count: totalStudents } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'student')
    const { count: totalCoordinators } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'coordinator')
    const { count: submissionsThisMonth } = await supabase
      .from('bip_status_history')
      .select('id', { count: 'exact', head: true })
      .eq('action_kind', 'submit')
      .gte('created_at', startOfMonth.toISOString())

    // Students with alerts — missing table (00048 not applied) omits the row.
    let studentsWithAlerts: number | null = null
    {
      const { count, error: prefsErr } = await supabase
        .from('bip_alert_preferences')
        .select('user_id', { count: 'exact', head: true })
      if (!prefsErr) studentsWithAlerts = count ?? 0
      else console.warn('[GET /admin/export.csv] alert prefs unavailable:', prefsErr.message)
    }

    // BIPs by status (group JS-side, v1 scale)
    const statusTally = new Map<string, number>()
    {
      const { data: statusRows, error: statusErr } = await supabase
        .from('bips')
        .select('status')
        .limit(10000)
      if (!statusErr && statusRows) {
        for (const row of statusRows as Array<{ status: string }>) {
          statusTally.set(row.status, (statusTally.get(row.status) ?? 0) + 1)
        }
      } else if (statusErr) {
        console.error('[GET /admin/export.csv] status tally error:', statusErr.message)
      }
    }

    // Approved BIPs by host country (group JS-side)
    const countryTally = new Map<string, number>()
    {
      const { data: countryRows, error: countryErr } = await supabase
        .from('bips')
        .select('host_university:host_university_id ( country )')
        .eq('status', 'approved')
        .limit(10000)
      if (!countryErr && countryRows) {
        for (const row of countryRows as unknown as Array<{
          host_university: { country: string | null } | Array<{ country: string | null }> | null
        }>) {
          const hu = Array.isArray(row.host_university) ? row.host_university[0] : row.host_university
          if (!hu?.country) continue
          countryTally.set(hu.country, (countryTally.get(hu.country) ?? 0) + 1)
        }
      } else if (countryErr) {
        console.error('[GET /admin/export.csv] country tally error:', countryErr.message)
      }
    }

    const lines = [['category', 'metric', 'value'].map(escapeCsv).join(',')]
    const push = (category: string, metric: string, value: string | number) => {
      lines.push([category, metric, String(value)].map(escapeCsv).join(','))
    }

    push('overview', 'total_bips', totalBips ?? 0)
    push('overview', 'submissions_this_month', submissionsThisMonth ?? 0)
    push('overview', 'total_students', totalStudents ?? 0)
    push('overview', 'total_coordinators', totalCoordinators ?? 0)
    if (studentsWithAlerts !== null) push('overview', 'students_with_alerts', studentsWithAlerts)

    for (const status of ['draft', 'pending', 'approved', 'rejected', 'changes_requested']) {
      push('bips_by_status', status, statusTally.get(status) ?? 0)
    }

    const countries = Array.from(countryTally.entries()).sort((a, b) => b[1] - a[1])
    for (const [code, count] of countries) {
      push('bips_by_country', `${code} — ${getCountryName(code)}`, count)
    }

    return csvDownload(lines.join('\n'), `biphub-analytics-${today}.csv`)
  }

  // ── BIPs export ──────────────────────────────────────────────────────
  const rawStatus = sp.get('status') ?? 'all'
  const status = VALID_STATUSES.has(rawStatus) ? rawStatus : 'all'
  const q = sp.get('q')?.trim() ?? ''
  const ids = parseIds(sp)

  // Extended filters (same as getAdminBips)
  const country = parseCsvParam(sp, 'country')
  const field = parseCsvParam(sp, 'field')
  const lang = parseCsvParam(sp, 'lang')
  const level = parseCsvParam(sp, 'level')
  const dateFrom = sp.get('dateFrom')?.trim() || undefined
  const dateTo = sp.get('dateTo')?.trim() || undefined
  const availabilityRaw = sp.get('availability')?.trim().toLowerCase()
  const availability = availabilityRaw && VALID_AVAILABILITY.has(availabilityRaw) ? availabilityRaw : undefined

  // Support repeated keys for arrays (country=DE&country=FR)
  // URLSearchParams.get merges only first; we merge getAll for those keys
  function mergeRepeated(key: string, current: string[] | undefined): string[] | undefined {
    const allVals = sp.getAll(key).flatMap((v) => v.split(',').map((s) => s.trim()).filter(Boolean))
    if (allVals.length === 0) return current
    // deduplicate, lowercase for country/field/lang/level as appropriate
    const merged = current ? [...current, ...allVals] : allVals
    const deduped = Array.from(new Set(merged.map((s) => s.toLowerCase())))
    // Filter empty
    return deduped.length ? deduped : undefined
  }
  // If repeated keys were used, sp.get returns first only, so enrich
  const countryMerged = mergeRepeated('country', country?.map((s) => s.toLowerCase()))
  const fieldMerged = mergeRepeated('field', field?.map((s) => s.toLowerCase()))
  const langMerged = mergeRepeated('lang', lang?.map((s) => s.toLowerCase()))
  const levelMerged = mergeRepeated('level', level?.map((s) => s.toLowerCase()))

  const countryFinal = countryMerged?.map((c) => c.toLowerCase())
  const fieldFinal = fieldMerged?.map((f) => f.toLowerCase())
  const langFinal = langMerged?.map((l) => l.toLowerCase())
  const levelFinal = levelMerged?.map((l) => l.toLowerCase())

  // Build query — same select as AdminBip plus csv-needed fields
  const needsCountryJoin = !!countryFinal?.length
  const hostJoin = needsCountryJoin
    ? 'host_university:host_university_id!inner ( name, country )'
    : 'host_university:host_university_id ( name, country )'

  let query = supabase
    .from('bips')
    .select(
      `id, slug, title, status, created_by, created_at, physical_start_date, physical_end_date, application_deadline, ects_credits, language_of_instruction, study_levels, subject_areas, host_city, partner_institutions_only, ${hostJoin}`,
    )
    .order('updated_at', { ascending: false }).limit(10000)

  if (ids) {
    query = query.in('id', ids)
  } else {
    if (status !== 'all') {
      query = query.eq('status', status)
    }
    if (countryFinal?.length) {
      const upper = countryFinal.map((c) => c.toUpperCase())
      query = query.in('host_university.country', upper)
    }
    if (fieldFinal?.length) {
      query = query.overlaps('subject_areas', fieldFinal)
    }
    if (langFinal?.length) {
      query = query.in('language_of_instruction', langFinal)
    }
    if (dateFrom) query = query.gte('physical_start_date', dateFrom)
    if (dateTo) query = query.lte('physical_start_date', dateTo)
    if (availability === 'open') {
      query = query.gte('application_deadline', today)
    } else if (availability === 'closed') {
      query = query.lt('application_deadline', today)
    }
    if (levelFinal?.length) {
      query = query.overlaps('study_levels', levelFinal)
    }
    if (q) {
      query = query.textSearch('search_vector', q, { type: 'websearch', config: 'english' })
    }
  }

  const { data, error } = await query
  if (error) {
    console.error('[GET /admin/export.csv] query error:', error.message)
    return new NextResponse('Failed to fetch', { status: 500 })
  }

  const rows = (data ?? []) as Array<{
    id: string
    slug: string
    title: string
    status: string
    created_by: string | null
    created_at: string
    physical_start_date: string | null
    physical_end_date: string | null
    application_deadline: string | null
    ects_credits: number | null
    language_of_instruction: string | null
    study_levels: string[] | null
    subject_areas: string[] | null
    host_city: string | null
    partner_institutions_only: boolean | null
    host_university: { name: string; country: string } | { name: string; country: string }[] | null
  }>

  const header = [
    'id',
    'slug',
    'title',
    'host_university',
    'country',
    'field',
    'status',
    'created_by',
    'created_at',
    'physical_start_date',
    'host_city',
    'physical_end_date',
    'application_deadline',
    'ects_credits',
    'language_of_instruction',
    'study_levels',
    'partner_institutions_only',
  ]

  const lines = [header.map(escapeCsv).join(',')]
  for (const r of rows) {
    const host = Array.isArray(r.host_university) ? r.host_university[0] : r.host_university
    const fieldVal = (r.subject_areas ?? [])[0] ?? ''
    const levels = (r.study_levels ?? []).join(';')
    lines.push(
      [
        r.id,
        r.slug,
        r.title,
        host?.name ?? '',
        host?.country ?? '',
        fieldVal,
        r.status,
        r.created_by ?? '',
        r.created_at,
        r.physical_start_date ?? '',
        r.host_city ?? '',
        r.physical_end_date ?? '',
        r.application_deadline ?? '',
        r.ects_credits != null ? String(r.ects_credits) : '',
        r.language_of_instruction ?? '',
        levels,
        r.partner_institutions_only ? 'true' : 'false',
      ]
        .map(escapeCsv)
        .join(','),
    )
  }

  const csv = lines.join('\n')
  let suffix: string
  if (ids) suffix = `selected-${ids.length}`
  else if (q || countryFinal?.length || fieldFinal?.length || langFinal?.length || dateFrom || dateTo || availability || levelFinal?.length || status !== 'all')
    suffix = `filtered-${status}`
  else suffix = `${status}`

  const filename = `biphub-bips-${suffix}-${today}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
