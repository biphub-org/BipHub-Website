'use server'

/**
 * Duplicate BIP Server Action (SUBM-15).
 *
 * Clones an existing BIP owned by the current coordinator into a new `draft`.
 * The new draft is owned by the duplicator, gets a regenerated draft slug,
 * and records its lineage via `duplicated_from_bip_id` (ON DELETE SET NULL).
 *
 * Eligibility: `approved` | `rejected` | `changes_requested` only.
 * `draft` and `pending` are intentionally excluded — duplicating a draft would
 * create a fork with no review value, and duplicating a pending BIP would
 * sidestep the queue. The dashboard affordance is likewise gated on those three
 * statuses.
 *
 * Auth: `getClaims()` only — never getSession(), never createAdminClient.
 * RLS `bips_select_own_or_approved` + explicit `eq('created_by', claims.sub)`
 * defense-in-depth ensures a coordinator cannot duplicate another coordinator's
 * BIP by guessing an id. RLS handles the final gate; the explicit filter
 * gives a clear error UX.
 *
 * Slug: `generateDraftSlug(title)` — draft-{slug}-{uuid8}, sliced to 100.
 * The submit path will later finalize it to {slug}-{erasmus}-{year} on status
 * transition. Slug is NOT copied from the source — duplicate must be unique.
 *
 * Partner universities: reconciled after the bips insert. Failure returns a
 * `warning` (bip was created; partners can be re-added). No transaction
 * primitive in the JS client — accepted per submit/bip-draft precedent.
 *
 * Dates: copied verbatim per 2026-08-12 open-question resolution #2
 * ("Adjust dates for the new edition" hint, not +1y auto-bump). The
 * coordinator edits them in the wizard immediately after the redirect.
 */

import { createClient } from '@/lib/supabase/server'
import { ISCED_FIELDS } from '@/lib/isced'
import { generateDraftSlug } from '@/lib/utils/slug'

export type DuplicateBipResult =
  | { success: true; bipId: string; warning?: string }
  | { error: string }

const ALLOWED_STATUSES = new Set(['approved', 'rejected', 'changes_requested'])

export async function duplicateBipAction(sourceId: string): Promise<DuplicateBipResult> {
  const supabase = await createClient()
  const { data: claimsData, error: authError } = await supabase.auth.getClaims()
  if (authError || !claimsData?.claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }
  const userId = claimsData.claims.sub as string
  const role = (claimsData.claims as { app_metadata?: { role?: string } })?.app_metadata?.role
  if (role !== 'coordinator' && role !== 'admin') {
    return { error: 'Forbidden.' }
  }

  if (!sourceId || typeof sourceId !== 'string') {
    return { error: 'Invalid BIP id.' }
  }

  // Fetch the full source row, scoped to owned rows and allowed statuses.
  // Defense-in-depth: created_by + status whitelist even though RLS also gates.
  const { data: source, error: fetchError } = await supabase
    .from('bips')
    .select(
      `
      id, title, external_bip_id, target_group, subject_areas, subject_area, isced_f_code,
      description, learning_outcomes,
      virtual_component_description, virtual_timing, virtual_session_dates,
      virtual_sessions_count, virtual_duration_notes,
      host_city, physical_start_date, physical_end_date, application_deadline,
      ects_credits, max_participants, study_levels,
      language_of_instruction, language_level_min,
      fees, eligibility_notes,
      how_to_apply_type, how_to_apply_value, contact_name, contact_email, contact_phone,
      card_image_path,
      accommodation_notes, partner_institutions_only, green_travel, inclusion_support,
      host_university_id, status, created_by
    `,
    )
    .eq('id', sourceId)
    .eq('created_by', userId)
    .maybeSingle()

  if (fetchError) {
    console.error('[duplicateBipAction] fetch error:', fetchError.message)
    return { error: 'Could not load the BIP to duplicate. Please try again.' }
  }
  if (!source) {
    return { error: 'BIP not found or you do not have permission to duplicate it.' }
  }
  if (!ALLOWED_STATUSES.has(source.status as string)) {
    return { error: 'Only approved, rejected, or changes-requested BIPs can be duplicated.' }
  }

  const newSlug = generateDraftSlug(source.title ?? 'untitled')

  // Sanitize subject_areas: legacy seeds may contain 'computer-science' etc.
  // which are not in the current 12-field ISCED taxonomy — step1Schema would
  // reject them and block Save & continue on the duplicated draft.
  const validIds = new Set(ISCED_FIELDS.map((f) => f.id))
  const sanitizedAreas = Array.isArray(source.subject_areas)
    ? (source.subject_areas as string[]).filter((a) => (validIds as Set<string>).has(a))
    : []
  // Fallback to at least one valid area if filtering emptied the array (prevents min(1) failure).
  const finalAreas = sanitizedAreas.length > 0 ? sanitizedAreas : ['social-sciences']

  // Build the insert payload: copy all SUBM fields verbatim, reset lifecycle cols.
  const insertPayload: Record<string, unknown> = {
    slug: newSlug,
    title: source.title,
    external_bip_id: source.external_bip_id,
    target_group: source.target_group,
    subject_areas: finalAreas,
    subject_area: source.subject_area,
    isced_f_code: source.isced_f_code,
    description: source.description,
    learning_outcomes: source.learning_outcomes,
    virtual_component_description: source.virtual_component_description,
    virtual_timing: source.virtual_timing,
    virtual_session_dates: source.virtual_session_dates,
    virtual_sessions_count: source.virtual_sessions_count,
    virtual_duration_notes: source.virtual_duration_notes,
    host_city: source.host_city,
    physical_start_date: source.physical_start_date,
    physical_end_date: source.physical_end_date,
    application_deadline: source.application_deadline,
    ects_credits: source.ects_credits,
    max_participants: source.max_participants,
    study_levels: source.study_levels,
    language_of_instruction: source.language_of_instruction,
    language_level_min: source.language_level_min,
    fees: source.fees,
    eligibility_notes: source.eligibility_notes,
    how_to_apply_type: source.how_to_apply_type,
    how_to_apply_value: source.how_to_apply_value,
    contact_name: source.contact_name,
    contact_email: source.contact_email,
    contact_phone: source.contact_phone,
    card_image_path: source.card_image_path,
    accommodation_notes: source.accommodation_notes,
    partner_institutions_only: source.partner_institutions_only ?? false,
    green_travel: source.green_travel ?? false,
    inclusion_support: source.inclusion_support ?? false,
    host_university_id: source.host_university_id,
    status: 'draft' as const,
    is_seed: false,
    created_by: userId,
    duplicated_from_bip_id: source.id,
    // approved_at / published_at omitted — default NULL, correct for a draft
  }

  const { data: inserted, error: insertError } = await supabase
    .from('bips')
    .insert(insertPayload)
    .select('id')
    .single()

  if (insertError || !inserted) {
    console.error('[duplicateBipAction] insert error:', insertError?.message)
    // Unique violation on slug is astronomically rare (uuid8 suffix) — surface as retryable.
    if (insertError?.code === '23505') {
      return { error: 'Could not generate a unique slug. Please try again.' }
    }
    return { error: 'Could not duplicate the BIP. Please try again.' }
  }

  const newId = (inserted as { id: string }).id

  // Copy partner universities (if any). Mirror saveDraftAction's reconcile pattern
  // but simplified: source already has the canonical rows, so copy directly.
  let partnerWarning: string | undefined
  try {
    const { data: partnerRows, error: partnerFetchError } = await supabase
      .from('bip_partner_universities')
      .select('university_id, partner_name_raw, partner_country_raw, partner_erasmus_code_raw')
      .eq('bip_id', source.id)

    if (partnerFetchError) {
      console.error('[duplicateBipAction] partner fetch error:', partnerFetchError.message)
      partnerWarning = 'BIP duplicated, but partner universities could not be copied. You can re-add them in the editor.'
    } else if (partnerRows && partnerRows.length > 0) {
      const newPartnerRows = partnerRows.map((r) => ({
        bip_id: newId,
        university_id: r.university_id,
        partner_name_raw: r.partner_name_raw,
        partner_country_raw: r.partner_country_raw,
        partner_erasmus_code_raw: r.partner_erasmus_code_raw,
      }))
      const { error: partnerInsertError } = await supabase
        .from('bip_partner_universities')
        .insert(newPartnerRows)
      if (partnerInsertError) {
        console.error('[duplicateBipAction] partner insert error:', partnerInsertError.message)
        partnerWarning = 'BIP duplicated, but partner universities could not be copied. You can re-add them in the editor.'
      }
    }
  } catch (e) {
    console.error('[duplicateBipAction] partner copy threw:', e)
    partnerWarning = 'BIP duplicated, but partner universities could not be copied. You can re-add them in the editor.'
  }

  if (partnerWarning) {
    return { success: true, bipId: newId, warning: partnerWarning }
  }
  return { success: true, bipId: newId }
}
