import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /admin/export.csv — admin-guarded CSV export
 *
 * Extended to support three user-requested export scopes:
 *  1. Filtered BIPs — respects ALL admin/bips filters (status, q, country, field, lang, dates, availability, level, partnerOnly)
 *  2. Selected BIPs — via `ids` param (comma-separated UUIDs). When present, restricts to those IDs (intersected with admin RLS).
 *  3. Coordinator profiles — via `entity=coordinators` (alias `dataset`). Exports profiles with role=coordinator.
 *
 * Query params (BIPs):
 *  - status, q, country, field, lang, dateFrom, dateTo, availability, level, partnerOnly, ids
 *  - entity: 'bips' (default) | 'coordinators'
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
  const entity = entityRaw === 'coordinators' || entityRaw === 'coordinator' || entityRaw === 'profiles' ? 'coordinators' : 'bips'

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
  const partnerOnlyRaw = sp.get('partnerOnly')?.trim().toLowerCase()
  const partnerOnly = partnerOnlyRaw === 'exclude' || partnerOnlyRaw === 'only' ? partnerOnlyRaw : undefined

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
    if (partnerOnly === 'exclude') {
      query = query.eq('partner_institutions_only', false)
    } else if (partnerOnly === 'only') {
      query = query.eq('partner_institutions_only', true)
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
  else if (q || countryFinal?.length || fieldFinal?.length || langFinal?.length || dateFrom || dateTo || availability || levelFinal?.length || partnerOnly || status !== 'all')
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
