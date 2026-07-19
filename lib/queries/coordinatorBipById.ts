/**
 * Coordinator edit-mode query (DASH-03 / DASH-04 / Phase 8 EDIT-01).
 *
 * Fetches a single BIP by id and reshapes it into the wizard's flat
 * `BipDraftData` so Plan 02-07's edit page can hydrate the wizard via
 * `hydrateFromServer`.
 *
 * Phase 8 extensions (Pitfall 1):
 *   - Status whitelist extended to include 'approved' and 'changes_requested'.
 *   - Returns an `openEdit` sub-object populated from `bip_edits` when an open
 *     edit exists (status approved or changes_requested with an edit row).
 *   - `openEdit.data` is the proposed content (BipDraftData) that pre-fills the
 *     coordinator edit form; `data` remains the LIVE bips content (diff reference).
 *
 * Authorization (defense-in-depth):
 *   - `getClaims()` for JWT-validated user identity.
 *   - Explicit `eq('created_by', claims.sub)` filter — RLS
 *     `bips_select_own_or_approved` would also surface approved BIPs by
 *     other coordinators, which we do NOT want on the edit route.
 *   - Status whitelist: draft, pending, approved, changes_requested are editable /
 *     edit-initializable. Rejected BIPs remain inaccessible via this route.
 *
 * Round-trip behaviour:
 *   - `how_to_apply_value` is split back into `how_to_apply_url` (when
 *     `how_to_apply_type === 'url'`) or left as the contact email path.
 *   - Free-text partners' `(unverified)` suffix is stripped on read so the
 *     wizard's chip list shows the bare name; submit re-applies it via
 *     `submitBipAction`.
 *
 * Auth: uses `getClaims()` (CLAUDE.md never-do compliance — never the
 * unvalidated session reader server-side).
 */
import { createClient } from '@/lib/supabase/server'
import { getOpenEditForBip } from '@/lib/queries/bipEdits'
import type { BipDraftData } from '@/lib/store/bip-draft'

export type CoordinatorBipForEdit = {
  id: string
  data: BipDraftData
  updatedAt: string
  hostUniversity: {
    id: string
    name: string
    country: string
    erasmus_code: string | null
  } | null
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'changes_requested'
  /** The open bip_edits row, if any (Phase 8). */
  openEdit?: {
    id: string
    status: 'pending' | 'changes_requested'
    admin_note: string | null
    data: BipDraftData
  } | null
} | null

export async function getCoordinatorBipById(
  id: string,
): Promise<CoordinatorBipForEdit> {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) return null

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
      accommodation_notes, partner_institutions_only, card_image_path,
      host_university:host_university_id ( id, name, country, erasmus_code ),
      partners:bip_partner_universities (
        id, university_id, partner_name_raw, partner_country_raw, partner_erasmus_code_raw,
        university:university_id ( id, name, country, erasmus_code )
      )
    `)
    .eq('id', id)
    .eq('created_by', claims.sub)
    .maybeSingle()

  if (error || !data) return null

  // Phase 8 Pitfall 1: whitelist extended to include 'approved' and 'changes_requested'.
  // 'rejected' is intentionally excluded — rejected BIPs have no edit flow.
  if (!['draft', 'pending', 'approved', 'changes_requested'].includes(data.status)) return null
  const status = data.status as 'draft' | 'pending' | 'approved' | 'changes_requested'

  // Split how_to_apply_value back into url vs contact_email branches.
  const isUrl = data.how_to_apply_type === 'url'

  // PostgREST may return embedded relations either as a single object or a
  // single-element array depending on the FK shape — normalize both shapes.
  type EmbeddedUni = {
    id: string
    name: string
    country: string
    erasmus_code: string | null
  } | null
  const hostUniversity: EmbeddedUni = Array.isArray(data.host_university)
    ? (data.host_university[0] ?? null)
    : ((data.host_university as EmbeddedUni) ?? null)

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
      (data.how_to_apply_type as BipDraftData['how_to_apply_type']) ?? undefined,
    how_to_apply_url: isUrl
      ? (data.how_to_apply_value ?? undefined)
      : undefined,
    contact_name: data.contact_name ?? undefined,
    contact_email: !isUrl
      ? (data.contact_email ?? undefined)
      : undefined,
    contact_phone: !isUrl ? (data.contact_phone ?? undefined) : undefined,
    accommodation_notes: data.accommodation_notes ?? undefined,
    card_image_path: data.card_image_path ?? undefined,
    partner_institutions_only: data.partner_institutions_only ?? false,
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
      // Legacy free-text partner (pre-revision data) — strip the `(unverified)`
      // suffix on round-trip so the wizard's chip list shows the bare name.
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

  // Phase 8: For approved or changes_requested BIPs, fetch the open bip_edits row
  // so the coordinator form can pre-fill from the proposed content (D-09).
  let openEdit: CoordinatorBipForEdit extends null ? never : NonNullable<CoordinatorBipForEdit>['openEdit'] = null

  if (status === 'approved' || status === 'changes_requested') {
    const editDetail = await getOpenEditForBip(id)
    if (editDetail && (editDetail.status === 'pending' || editDetail.status === 'changes_requested')) {
      openEdit = {
        id: editDetail.id,
        status: editDetail.status as 'pending' | 'changes_requested',
        admin_note: editDetail.admin_note,
        data: editDetail.data,
      }
    }
  }

  return {
    id: data.id,
    data: draft,
    updatedAt: data.updated_at,
    hostUniversity,
    status,
    openEdit,
  }
}
