/**
 * BIP-edit query functions (Phase 8 EDIT-01/EDIT-03/EDIT-06).
 *
 * Provides the read layer for:
 *   - Coordinator open-edit check (getOpenEditForBip) — D-09
 *   - Admin edit detail for diff view (getBipEditById) — D-07
 *   - Admin queue union — new submissions (getAdminPendingSubmissions) — D-08
 *   - Admin queue union — edit items (getAdminPendingEdits) — D-08
 *   - Latest changes-request note for new submissions (getLatestChangesRequest) — D-06a OQ#2 Option A
 *
 * Auth: getClaims() validates JWT signature — NEVER getSession (CLAUDE.md).
 * Client: createClient (anon-key + JWT) — NEVER createAdminClient here
 *   (this file lives in lib/queries/, not app/(admin)/ or lib/supabase/admin.ts).
 *
 * Trust boundaries:
 *   T-08-10: getOpenEditForBip relies on bip_edits_select_own RLS + getClaims
 *   T-08-11: admin queue functions return null/[] on non-admin JWT
 */
import { createClient } from '@/lib/supabase/server'
import { ADMIN_BIP_SELECT, type AdminBip } from '@/lib/queries/adminBips'
import type { BipDraftData } from '@/lib/store/bip-draft'
import type { BipStatus } from '@/lib/utils/status'
import { BIP_EDIT_CONTENT_COLUMNS } from '@/lib/constants/bip-edit-columns'

// ── Internal types ────────────────────────────────────────────────────────

type RawBipEditContentRow = {
  title: string | null
  subject_areas: string[] | null
  isced_f_code: string | null
  description: string | null
  learning_outcomes: string | null
  virtual_component_description: string | null
  virtual_timing: string | null
  host_city: string | null
  physical_start_date: string | null
  physical_end_date: string | null
  application_deadline: string | null
  ects_credits: number | null
  max_participants: number | null
  study_levels: string[] | null
  language_of_instruction: string | null
  language_level_min: string | null
  green_travel: boolean | null
  inclusion_support: boolean | null
  eligibility_notes: string | null
  how_to_apply_type: string | null
  how_to_apply_value: string | null
  contact_name: string | null
  contact_email: string | null
  partner_institutions: unknown
  virtual_sessions_count: number | null
  virtual_duration_notes: string | null
  accommodation_notes: string | null
  partner_institutions_only: boolean | null
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

// ── Internal helpers ──────────────────────────────────────────────────────

type RawPartnerInstitution = {
  university_id?: string | null
  name?: string
  country?: string
  isVerified?: boolean
}

/**
 * Map bip_edits.partner_institutions JSONB → BipDraftData.partner_universities[].
 * This is the contract shared by the diff view and coordinator edit form (D-07/D-09).
 */
function mapPartnerInstitutions(raw: unknown): BipDraftData['partner_universities'] {
  if (!Array.isArray(raw)) return []
  return (raw as RawPartnerInstitution[]).map((p) => ({
    university_id: p.university_id ?? null,
    name: p.name ?? '',
    country: p.country ?? '',
    isVerified: p.isVerified ?? false,
  }))
}

/**
 * Map a raw bip_edits content row to the BipDraftData wizard shape.
 * Mirrors the coordinatorBipById.ts mapping so the diff view and form
 * pre-fill share one data contract.
 */
function mapEditRowToBipDraftData(row: RawBipEditContentRow): BipDraftData {
  const isUrl = row.how_to_apply_type === 'url'
  return {
    title: row.title ?? undefined,
    subject_areas: row.subject_areas ?? undefined,
    description: row.description ?? undefined,
    learning_outcomes: row.learning_outcomes ?? undefined,
    virtual_component_description: row.virtual_component_description ?? undefined,
    virtual_timing:
      (row.virtual_timing as BipDraftData['virtual_timing']) ?? undefined,
    host_city: row.host_city ?? undefined,
    physical_start_date: row.physical_start_date ?? undefined,
    physical_end_date: row.physical_end_date ?? undefined,
    application_deadline: row.application_deadline ?? undefined,
    ects_credits: row.ects_credits ?? undefined,
    max_participants: row.max_participants ?? undefined,
    study_levels:
      (row.study_levels as BipDraftData['study_levels']) ?? undefined,
    language_of_instruction: row.language_of_instruction ?? undefined,
    language_level_min:
      (row.language_level_min as BipDraftData['language_level_min']) ?? undefined,
    green_travel: row.green_travel ?? false,
    inclusion_support: row.inclusion_support ?? false,
    eligibility_notes: row.eligibility_notes ?? undefined,
    how_to_apply_type:
      (row.how_to_apply_type as BipDraftData['how_to_apply_type']) ?? undefined,
    how_to_apply_url: isUrl ? (row.how_to_apply_value ?? undefined) : undefined,
    contact_name: row.contact_name ?? undefined,
    contact_email: !isUrl ? (row.contact_email ?? undefined) : undefined,
    partner_universities: mapPartnerInstitutions(row.partner_institutions),
    virtual_sessions_count: row.virtual_sessions_count ?? undefined,
    virtual_duration_notes: row.virtual_duration_notes ?? undefined,
    accommodation_notes: row.accommodation_notes ?? undefined,
    partner_institutions_only: row.partner_institutions_only ?? false,
  }
}

/**
 * Normalize a raw AdminBip-shaped DB row to the typed AdminBip.
 * Mirrors the private normalize() in adminBips.ts; duplicated here because
 * normalize() is not exported (we added export to ADMIN_BIP_SELECT only).
 */
function normalizeAdminBipRow(row: RawAdminBipRow): AdminBip {
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

// ── Public types ───────────────────────────────────────────────────────────

/**
 * Admin queue item for a bip_edits row joined to its parent bip.
 * Used by the admin queue RSC to render the "Edit" badge and link
 * to /admin/bip-edits/[id]/review.
 */
export type AdminBipEditItem = {
  id: string
  bip_id: string
  status: string
  created_at: string
  admin_note: string | null
  bip: AdminBip
}

/**
 * Full edit detail — proposed content mapped to the wizard shape for
 * diff view (D-07) and coordinator form pre-fill (D-09).
 */
export type BipEditDetail = {
  id: string
  bip_id: string
  status: string
  admin_note: string | null
  created_by: string | null
  data: BipDraftData
}

// ── Coordinator-scoped queries ─────────────────────────────────────────────

/**
 * Return the open (pending or changes_requested) bip_edits row for a BIP, or null.
 *
 * Coordinator-scoped (T-08-10): RLS bip_edits_select_own enforces ownership at
 * the DB layer. The getClaims() sub check provides application-level defense-in-depth.
 *
 * Called by getCoordinatorBipById to populate the openEdit sub-object.
 */
export async function getOpenEditForBip(bipId: string): Promise<BipEditDetail | null> {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) return null

  const { data, error } = await supabase
    .from('bip_edits')
    .select(BIP_EDIT_CONTENT_COLUMNS)
    .eq('bip_id', bipId)
    .in('status', ['pending', 'changes_requested'])
    .maybeSingle()

  if (error || !data) return null

  return {
    id: data.id,
    bip_id: data.bip_id,
    status: data.status,
    admin_note: data.admin_note,
    created_by: data.created_by,
    data: mapEditRowToBipDraftData(data as unknown as RawBipEditContentRow),
  }
}

// ── Admin-scoped queries ───────────────────────────────────────────────────

/**
 * Return full edit detail for the admin review page (diff + action panel).
 *
 * Admin-scoped (T-08-11): returns null for non-admin JWTs — defense-in-depth
 * even if the (admin) layout guard is bypassed.
 */
export async function getBipEditById(editId: string): Promise<BipEditDetail | null> {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) return null

  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role !== 'admin') return null

  const { data, error } = await supabase
    .from('bip_edits')
    .select(BIP_EDIT_CONTENT_COLUMNS)
    .eq('id', editId)
    .maybeSingle()

  if (error || !data) return null

  return {
    id: data.id,
    bip_id: data.bip_id,
    status: data.status,
    admin_note: data.admin_note,
    created_by: data.created_by,
    data: mapEditRowToBipDraftData(data as unknown as RawBipEditContentRow),
  }
}

/**
 * Admin queue — new submission items: bips with status pending or changes_requested.
 *
 * Admin-scoped (T-08-11): returns [] on non-admin JWT.
 * Extends the old getAdminPendingBips (only 'pending') to also include
 * 'changes_requested' so coordinator resubmissions appear in the queue.
 */
export async function getAdminPendingSubmissions(): Promise<AdminBip[]> {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) return []

  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role !== 'admin') return []

  const { data, error } = await supabase
    .from('bips')
    .select(ADMIN_BIP_SELECT)
    .in('status', ['pending', 'changes_requested'])
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[getAdminPendingSubmissions] supabase error:', error.message)
    return []
  }

  return (data ?? []).map((row) => normalizeAdminBipRow(row as unknown as RawAdminBipRow))
}

/**
 * Admin queue — edit items: bip_edits with status pending or changes_requested,
 * with parent bip data fetched separately and joined in-process (D-08).
 *
 * Admin-scoped (T-08-11): returns [] on non-admin JWT.
 *
 * Two-query approach: bip_edits metadata + bips data joined by bip_id.
 * Avoids complex nested PostgREST template-literal selects.
 */
export async function getAdminPendingEdits(): Promise<AdminBipEditItem[]> {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) return []

  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role !== 'admin') return []

  // Step 1: Fetch bip_edits rows
  const { data: editRows, error: editError } = await supabase
    .from('bip_edits')
    .select('id, bip_id, status, created_at, admin_note')
    .in('status', ['pending', 'changes_requested'])
    .order('created_at', { ascending: true })

  if (editError) {
    console.error('[getAdminPendingEdits] edit query error:', editError.message)
    return []
  }
  if (!editRows || editRows.length === 0) return []

  // Step 2: Fetch parent bips for display (using same ADMIN_BIP_SELECT shape)
  const bipIds = [...new Set(editRows.map((r) => r.bip_id))]
  const { data: bipRows, error: bipError } = await supabase
    .from('bips')
    .select(ADMIN_BIP_SELECT)
    .in('id', bipIds)

  if (bipError) {
    console.error('[getAdminPendingEdits] bip query error:', bipError.message)
    return []
  }

  const bipMap = new Map<string, AdminBip>(
    (bipRows ?? []).map((row) => [
      row.id as string,
      normalizeAdminBipRow(row as unknown as RawAdminBipRow),
    ]),
  )

  // Step 3: Merge
  return editRows
    .map((edit) => {
      const bip = bipMap.get(edit.bip_id)
      if (!bip) return null
      return {
        id: edit.id,
        bip_id: edit.bip_id,
        status: edit.status,
        created_at: edit.created_at,
        admin_note: edit.admin_note,
        bip,
      } satisfies AdminBipEditItem
    })
    .filter((item): item is AdminBipEditItem => item !== null)
}

/**
 * Latest "request changes" note for a new-submission BIP (D-06a Option A).
 *
 * Reads from bip_status_history where action_kind='request_changes'. Returns the
 * most recent admin note, or null. Used by the coordinator dashboard to display
 * the admin's feedback on a changes_requested new submission.
 */
export async function getLatestChangesRequest(bipId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) return null

  const { data, error } = await supabase
    .from('bip_status_history')
    .select('note')
    .eq('bip_id', bipId)
    .eq('action_kind', 'request_changes')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[getLatestChangesRequest] supabase error:', error.message)
    return null
  }
  return data?.note ?? null
}
