/**
 * Admin BIP queries (Phase 3 / ADMN-02).
 *
 * Auth: getClaims() validates JWT signature (CLAUDE.md compliance — the
 *   unvalidated session reader is forbidden server-side).
 *
 * Client: anon-key server client (`createClient` from lib/supabase/server).
 *   The admin RLS `bips_select_own_or_approved` admin clause returns all
 *   rows when JWT `app_metadata.role = 'admin'`, so the service-role
 *   bypass is unnecessary here AND would violate the CLAUDE.md scope rule
 *   (service-role client only inside app/(admin)/ and lib/supabase/admin.ts;
 *   this file lives in lib/queries/).
 *
 * Plan 03-03 + 03-06 + 03-07 will extend this module with
 * `getAdminBipById`, `getAdminBips` (all-listings), and analytics.
 */
import { createClient } from '@/lib/supabase/server'
import { getBipById } from '@/lib/queries/bipDetail'
import type { BipDetail } from '@/lib/queries/bipDetail'
import type { BipStatus } from '@/lib/utils/status'
import type { BipDraftData } from '@/lib/store/bip-draft'

export type AdminBip = {
  id: string
  slug: string
  title: string
  status: BipStatus
  host_city: string | null
  physical_start_date: string | null
  physical_end_date: string | null
  created_at: string
  updated_at: string
  host_university: { id: string; name: string; country: string } | null
  coordinator_name: string | null
  coordinator_university: string | null
}

type RawHostUniversity =
  | { id: string; name: string; country: string }
  | Array<{ id: string; name: string; country: string }>
  | null

type RawCoordinatorUniversity =
  | { name: string }
  | Array<{ name: string }>
  | null

type RawCoordinator =
  | { full_name: string | null; university: RawCoordinatorUniversity }
  | Array<{ full_name: string | null; university: RawCoordinatorUniversity }>
  | null

type RawAdminBipRow = {
  id: string
  slug: string
  title: string
  status: string
  host_city: string | null
  physical_start_date: string | null
  physical_end_date: string | null
  created_at: string
  updated_at: string
  host_university: RawHostUniversity
  coordinator: RawCoordinator
}

function normalize(row: RawAdminBipRow): AdminBip {
  const hostUniversity = Array.isArray(row.host_university)
    ? (row.host_university[0] ?? null)
    : (row.host_university ?? null)

  const coordinator = Array.isArray(row.coordinator)
    ? (row.coordinator[0] ?? null)
    : (row.coordinator ?? null)

  const coordinatorUniversity = coordinator?.university ?? null
  const coordinatorUniversityResolved = Array.isArray(coordinatorUniversity)
    ? (coordinatorUniversity[0] ?? null)
    : coordinatorUniversity

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status as BipStatus,
    host_city: row.host_city,
    physical_start_date: row.physical_start_date,
    physical_end_date: row.physical_end_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
    host_university: hostUniversity,
    coordinator_name: coordinator?.full_name ?? null,
    coordinator_university: coordinatorUniversityResolved?.name ?? null,
  }
}

export const ADMIN_BIP_SELECT = `
  id, slug, title, status, host_city,
  physical_start_date, physical_end_date,
  created_at, updated_at,
  host_university:host_university_id ( id, name, country ),
  coordinator:profiles!created_by ( full_name, university:university_id ( name ) )
`

/**
 * Return all pending BIPs in FIFO order (oldest first per D-02).
 *
 * Empty array on auth failure — the UI then renders the "No pending BIPs"
 * empty state, which is also the correct outcome for a non-admin who
 * somehow reached this code path (defense in depth via RLS).
 */
export async function getAdminPendingBips(): Promise<AdminBip[]> {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) return []

  const { data, error } = await supabase
    .from('bips')
    .select(ADMIN_BIP_SELECT)
    .eq('status', 'pending')
    .order('created_at', { ascending: true }) // FIFO per D-02

  if (error) {
    console.error('[getAdminPendingBips] supabase error:', error.message)
    return []
  }
  return (data ?? []).map((row) => normalize(row as unknown as RawAdminBipRow))
}

/**
 * Full BIP detail for admin review (Plan 03-03).
 *
 * Delegates to `getBipById` so BipBody / BipSidebar / BipHeader render
 * against the same `BipDetail` shape as the public detail page. The
 * admin RLS clause on `bips_select_own_or_approved` returns all rows
 * when the JWT carries `app_metadata.role = 'admin'`, so no service-role
 * bypass is required (CLAUDE.md never-do compliance).
 *
 * Auth: getClaims() validates the JWT signature; non-admin callers get
 * null on the role check below — defense in depth even if the route
 * group's layout guard is bypassed.
 */
export async function getAdminBipById(bipId: string): Promise<BipDetail | null> {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) return null

  // Role guard — RLS would also strip non-admin reads of pending/rejected/draft
  // rows, but make the contract explicit here so future callers can't accidentally
  // surface admin-only data on a public surface.
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role !== 'admin') return null

  return getBipById(bipId)
}

export type AdminBipsFilter = {
  status?: 'all' | 'draft' | 'pending' | 'approved' | 'rejected'
  q?: string
}

/**
 * All-listings admin query (D-19 / ADMN-06).
 *
 * Returns every BIP the admin RLS clause permits (i.e. all rows when
 * the JWT carries `app_metadata.role = 'admin'`). Supports a status
 * filter (matching the 5 status tabs) and a free-text search that
 * reuses the Phase 1 `search_vector` tsvector + unaccent infrastructure
 * (see `lib/filters/buildSupabaseQuery.ts`).
 *
 * Empty array on auth failure — defensive only; layout guard makes
 * this branch unreachable in normal flow.
 */
export async function getAdminBips(
  filter: AdminBipsFilter = {},
): Promise<AdminBip[]> {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) return []

  let query = supabase
    .from('bips')
    .select(ADMIN_BIP_SELECT)
    .order('updated_at', { ascending: false })

  if (filter.status && filter.status !== 'all') {
    query = query.eq('status', filter.status)
  }

  const q = filter.q?.trim()
  if (q && q.length > 0) {
    // Reuse search_vector + websearch parser from Phase 1 (BROW-09)
    query = query.textSearch('search_vector', q, {
      type: 'websearch',
      config: 'english',
    })
  }

  const { data, error } = await query
  if (error) {
    console.error('[getAdminBips] supabase error:', error.message)
    return []
  }
  return (data ?? []).map((row) => normalize(row as unknown as RawAdminBipRow))
}

/**
 * Return the next pending BIP after the just-actioned one (D-05 auto-advance).
 * Excludes `excludeId` so the immediately-actioned BIP is not returned.
 *
 * Used by Plan 03-03 (approve) and Plan 03-04 (reject) to redirect the admin
 * straight to the next item in the queue after an approve/reject action.
 */
export async function getNextPendingBip(
  excludeId: string,
): Promise<{ id: string; title: string } | null> {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getClaims()
  if (!authData?.claims?.sub) return null

  const { data, error } = await supabase
    .from('bips')
    .select('id, title')
    .eq('status', 'pending')
    .neq('id', excludeId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[getNextPendingBip] supabase error:', error.message)
    return null
  }
  return data ?? null
}

export type AdminBipForEdit = {
  id: string
  data: BipDraftData
  updatedAt: string
  hostUniversity: {
    id: string
    name: string
    country: string
    erasmus_code: string | null
  } | null
  status: BipStatus
  title: string
  coordinatorName: string
} | null

/**
 * Admin edit-mode query (ADMN-05, Plan 03-07).
 *
 * Mirrors `getCoordinatorBipById` but:
 *   - Drops the `created_by` ownership filter (admin edits any BIP).
 *   - Drops the draft|pending status whitelist (admin edits any status).
 *   - Returns the additional metadata the AdminEditFooter needs
 *     (title, coordinatorName, status) so the page doesn't need a
 *     second roundtrip.
 *
 * Auth: getClaims() validates the JWT signature; non-admin callers
 * get null on the role check (defense in depth — the (admin) layout
 * already gates, but the contract is explicit here).
 *
 * Round-trip behaviour matches the coordinator query exactly:
 *   - `how_to_apply_value` split back into url vs contact branches
 *   - free-text partner `(unverified)` suffix stripped on read
 */
export async function getAdminBipForEdit(
  id: string,
): Promise<AdminBipForEdit> {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) return null

  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role !== 'admin') return null

  const { data, error } = await supabase
    .from('bips')
    .select(`
      id, slug, status, updated_at,
      title, external_bip_id, target_group, subject_areas, description, learning_outcomes,
      virtual_component_description, virtual_timing, virtual_session_dates, host_city,
      physical_start_date, physical_end_date, application_deadline,
      ects_credits, max_participants, study_levels,
      language_of_instruction, language_level_min,
      fees, eligibility_notes,
      how_to_apply_type, how_to_apply_value, contact_name, contact_email, contact_phone,
      card_image_path,
      host_university:host_university_id ( id, name, country, erasmus_code ),
      coordinator:profiles!created_by ( full_name ),
      partners:bip_partner_universities (
        id, university_id, partner_name_raw, partner_country_raw, partner_erasmus_code_raw,
        university:university_id ( id, name, country, erasmus_code )
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null

  const status = data.status as BipStatus
  const isUrl = data.how_to_apply_type === 'url'

  type EmbeddedUni = {
    id: string
    name: string
    country: string
    erasmus_code: string | null
  } | null
  const hostUniversity: EmbeddedUni = Array.isArray(data.host_university)
    ? (data.host_university[0] ?? null)
    : ((data.host_university as EmbeddedUni) ?? null)

  type EmbeddedCoordinator =
    | { full_name: string | null }
    | { full_name: string | null }[]
    | null
  const coordinatorRaw = data.coordinator as EmbeddedCoordinator
  const coordinator = Array.isArray(coordinatorRaw)
    ? (coordinatorRaw[0] ?? null)
    : coordinatorRaw

  type EmbeddedPartner = {
    id: string
    university_id: string | null
    partner_name_raw: string | null
    partner_country_raw: string | null
    partner_erasmus_code_raw: string | null
    university:
      | { id: string; name: string; country: string; erasmus_code: string | null }
      | { id: string; name: string; country: string; erasmus_code: string | null }[]
      | null
  }
  const partnerRows = (data.partners ?? []) as EmbeddedPartner[]

  const draft: BipDraftData = {
    title: data.title ?? undefined,
    external_bip_id: data.external_bip_id ?? undefined,
    target_group:
      (data.target_group as BipDraftData['target_group']) ?? undefined,
    subject_areas: data.subject_areas ?? undefined,
    description: data.description ?? undefined,
    learning_outcomes: data.learning_outcomes ?? undefined,
    virtual_component_description:
      data.virtual_component_description ?? undefined,
    virtual_timing:
      (data.virtual_timing as BipDraftData['virtual_timing']) ?? undefined,
    virtual_session_dates: data.virtual_session_dates ?? undefined,
    host_city: data.host_city ?? undefined,
    physical_start_date: data.physical_start_date ?? undefined,
    physical_end_date: data.physical_end_date ?? undefined,
    application_deadline: data.application_deadline ?? undefined,
    ects_credits: data.ects_credits ?? undefined,
    max_participants: data.max_participants ?? undefined,
    study_levels:
      (data.study_levels as BipDraftData['study_levels']) ?? undefined,
    language_of_instruction: data.language_of_instruction ?? undefined,
    language_level_min:
      (data.language_level_min as BipDraftData['language_level_min']) ??
      undefined,
    fees: data.fees ?? undefined,
    eligibility_notes: data.eligibility_notes ?? undefined,
    how_to_apply_type:
      (data.how_to_apply_type as BipDraftData['how_to_apply_type']) ??
      undefined,
    how_to_apply_url: isUrl
      ? (data.how_to_apply_value ?? undefined)
      : undefined,
    contact_name: data.contact_name ?? undefined,
    contact_email: !isUrl ? (data.contact_email ?? undefined) : undefined,
    contact_phone: !isUrl ? (data.contact_phone ?? undefined) : undefined,
    card_image_path: data.card_image_path ?? undefined,
    partner_universities: partnerRows.map((p) => {
      const uniRel = Array.isArray(p.university)
        ? (p.university[0] ?? null)
        : p.university
      if (uniRel && p.university_id) {
        return {
          university_id: p.university_id,
          name: uniRel.name,
          country: uniRel.country,
          erasmus_code: uniRel.erasmus_code ?? null,
          isVerified: true,
        }
      }
      const rawName = p.partner_name_raw ?? ''
      const cleanName = rawName.replace(/\s*\(unverified\)\s*$/, '').trim()
      return {
        university_id: null,
        name: cleanName,
        country: p.partner_country_raw ?? '',
        erasmus_code: p.partner_erasmus_code_raw ?? null,
        isVerified: false,
      }
    }),
  }

  return {
    id: data.id,
    data: draft,
    updatedAt: data.updated_at,
    hostUniversity,
    status,
    title: data.title ?? '',
    coordinatorName: coordinator?.full_name ?? '',
  }
}
