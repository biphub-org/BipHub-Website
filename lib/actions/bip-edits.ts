'use server'

/**
 * Coordinator BIP-edit Server Actions (Phase 8 EDIT-01).
 *
 *   - submitEditAction(bipId, draft, partners)         — create bip_edits row for approved BIP
 *   - resubmitEditAction(editId, draft, partners)      — update existing bip_edits row
 *   - resubmitPendingBipAction(bipId, draft, partners) — new-submission D-06a content+status resubmit
 *
 * Authorization: getClaims() + ownership check + BIP must be 'approved' / edit in right state.
 * No revalidatePath — the public page is deliberately untouched until an admin approves (D-01/EDIT-02).
 *
 * Auth: getClaims() — NEVER getSession (CLAUDE.md never-do).
 * Client: createClient (anon-key + coordinator JWT) — never createAdminClient.
 * Slug: intentionally excluded from every insert/update payload (D-10/EDIT-09).
 */

import { createClient } from '@/lib/supabase/server'
import { fullBipSchema } from '@/lib/schemas/bip-wizard'
import type { BipDraftData, Step3PartnerDraft } from '@/lib/store/bip-draft'

export type EditActionResult = { success: true; editId?: string } | { error: string }

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Map a validated FullBipValues object to the 22 editable content columns that
 * are shared between bip_edits rows and the bips merge payload.
 * Slug is intentionally EXCLUDED (D-10/EDIT-09).
 * status is intentionally EXCLUDED (callers set status explicitly).
 */
function buildContentPayload(data: {
  title: string
  subject_areas: string[]
  description: string
  learning_outcomes: string
  virtual_component_description: string
  virtual_timing: string
  host_city: string
  physical_start_date: string
  physical_end_date: string
  application_deadline: string
  ects_credits: number
  max_participants: number
  study_levels: string[]
  language_of_instruction: string
  language_level_min: string
  green_travel: boolean
  inclusion_support: boolean
  eligibility_notes?: string
  how_to_apply_type: string
  how_to_apply_url?: string
  contact_name?: string
  contact_email?: string
}) {
  return {
    title: data.title,
    // subject_areas is the canonical multi-field set. isced_f_code is kept
    // mirrored to the first field (shared column present on both bip_edits and
    // bips); subject_area (bips-only) is not set here to keep the payload valid
    // for bip_edits inserts.
    subject_areas: data.subject_areas,
    isced_f_code: data.subject_areas[0] ?? null,
    description: data.description,
    learning_outcomes: data.learning_outcomes,
    virtual_component_description: data.virtual_component_description,
    virtual_timing: data.virtual_timing,
    host_city: data.host_city,
    physical_start_date: data.physical_start_date,
    physical_end_date: data.physical_end_date,
    application_deadline: data.application_deadline,
    ects_credits: data.ects_credits,
    max_participants: data.max_participants,
    study_levels: data.study_levels,
    language_of_instruction: data.language_of_instruction,
    language_level_min: data.language_level_min,
    green_travel: data.green_travel,
    inclusion_support: data.inclusion_support,
    eligibility_notes: data.eligibility_notes ?? '',
    how_to_apply_type: data.how_to_apply_type,
    how_to_apply_value:
      data.how_to_apply_type === 'url'
        ? (data.how_to_apply_url ?? null)
        : (data.contact_email ?? null),
    contact_name: data.contact_name || null,
    contact_email: data.contact_email || null,
    // NOTE: slug intentionally omitted (D-10 / EDIT-09)
  }
}

// ── Coordinator Server Actions ────────────────────────────────────────────────

/**
 * Create a bip_edits row for an already-approved BIP (EDIT-01 / D-01).
 *
 * Guards:
 *   1. Caller must own the BIP (created_by === userId) — T-08-12 first layer.
 *   2. BIP status must be 'approved' — edits are only for the live-listed path.
 *   3. At most one open edit per BIP (D-03) — application-layer + partial unique index.
 *
 * No revalidatePath: the public page deliberately stays unchanged until admin
 * approves the edit (D-01 / EDIT-02 / SC1).
 *
 * Trigger 00019 logs 'submit_edit' to bip_status_history automatically.
 */
export async function submitEditAction(
  bipId: string,
  draft: BipDraftData,
  partners: Step3PartnerDraft[] = [],
): Promise<EditActionResult> {
  // 1. Auth + role guard
  const supabase = await createClient()
  const { data: claimsData, error: authError } = await supabase.auth.getClaims()
  if (authError || !claimsData?.claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }
  const userId = claimsData.claims.sub

  // Role guard: only coordinator or admin may create edits (T-08-12)
  const role = (claimsData.claims as { app_metadata?: { role?: string } })?.app_metadata?.role
  if (role !== 'coordinator' && role !== 'admin') {
    return { error: 'Forbidden.' }
  }

  // 2. Server-side full re-validation (T-08-12 content guard)
  const parsed = fullBipSchema.safeParse(draft)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Validation failed.' }
  }

  // 3. Defense-in-depth read-back: ownership + approved status guard
  const { data: bip } = await supabase
    .from('bips')
    .select('id, status, created_by, slug')
    .eq('id', bipId)
    .maybeSingle()
  if (!bip) return { error: 'BIP not found.' }
  if (bip.created_by !== userId) {
    return { error: 'You do not have permission to edit this BIP.' }
  }
  if (bip.status !== 'approved') {
    return { error: 'Only approved BIPs can have edits submitted.' }
  }

  // 4. One-open-edit guard (D-03 / application-layer — also enforced by partial unique index)
  const { data: existingEdit } = await supabase
    .from('bip_edits')
    .select('id, status')
    .eq('bip_id', bipId)
    .in('status', ['pending', 'changes_requested'])
    .maybeSingle()
  if (existingEdit) {
    return { error: 'An edit is already under review.' }
  }

  // 5. INSERT bip_edits row — slug intentionally excluded from payload (D-10/EDIT-09)
  const { data: newEdit, error: insertError } = await supabase
    .from('bip_edits')
    .insert({
      bip_id: bipId,
      created_by: userId,
      status: 'pending',
      ...buildContentPayload(parsed.data),
      partner_institutions: JSON.stringify(partners),
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('[submitEditAction] insert error:', insertError.message)
    return { error: 'Failed to submit edit. Please try again.' }
  }

  // No revalidatePath — the public /bip/[slug] page stays unchanged (D-01/EDIT-02).
  // Trigger 00019 (log_bip_edit_status_change) writes 'submit_edit' audit row.

  return { success: true, editId: newEdit.id }
}

/**
 * Resubmit an existing bip_edits row that is in 'changes_requested' state (D-05).
 *
 * Reuses the same edit row — keeps the D-03 one-open-edit constraint intact
 * and the admin queue clean. Content edits made during the changes_requested
 * loop are preserved (NOT a status-only update).
 *
 * Trigger 00019 logs 'resubmit_edit' to bip_status_history automatically.
 */
export async function resubmitEditAction(
  editId: string,
  draft: BipDraftData,
  partners: Step3PartnerDraft[] = [],
): Promise<EditActionResult> {
  // 1. Auth + role guard
  const supabase = await createClient()
  const { data: claimsData, error: authError } = await supabase.auth.getClaims()
  if (authError || !claimsData?.claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }
  const userId = claimsData.claims.sub

  const role = (claimsData.claims as { app_metadata?: { role?: string } })?.app_metadata?.role
  if (role !== 'coordinator' && role !== 'admin') {
    return { error: 'Forbidden.' }
  }

  // 2. Server-side full re-validation
  const parsed = fullBipSchema.safeParse(draft)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Validation failed.' }
  }

  // 3. UPDATE bip_edits: status → pending + fresh content fields
  //    WHERE created_by = userId (ownership) AND status = 'changes_requested' (idempotency guard)
  //    RLS bip_edits_update_own_resubmit enforces the same pre/post-image predicates.
  const { error: updateError } = await supabase
    .from('bip_edits')
    .update({
      status: 'pending',
      ...buildContentPayload(parsed.data),
      partner_institutions: JSON.stringify(partners),
      updated_at: new Date().toISOString(),
    })
    .eq('id', editId)
    .eq('created_by', userId)
    .eq('status', 'changes_requested') // idempotency guard

  if (updateError) {
    console.error('[resubmitEditAction] update error:', updateError.message)
    return { error: 'Failed to resubmit edit. Please try again.' }
  }

  // No revalidatePath — the public page is untouched until admin approves (D-01/EDIT-02).
  // Trigger 00019 logs 'resubmit_edit' automatically.

  return { success: true, editId }
}

/**
 * New-submission changes_requested → pending resubmit (D-06a BLOCKER fix).
 *
 * This is NOT a bip_edits action — it operates on the `bips` row itself for a
 * new submission that has been in 'changes_requested' state. The coordinator has
 * revised the content and clicks "Resubmit".
 *
 * CRITICAL: writes ALL editable content columns AND status='pending' in a single
 * UPDATE — a status-only variant is FORBIDDEN here because it discards the
 * coordinator's content edits made during the changes_requested loop.
 *
 * The bips_update_own_changes_requested_to_pending RLS policy (migration 00018)
 * authorizes this UPDATE: USING (own + status='changes_requested'), WITH CHECK
 * (own + status='pending'). The combined content+status update satisfies WITH CHECK
 * because the post-image status is 'pending'.
 *
 * Partners are reconciled via the canonical delete-then-insert (bip_partner_universities).
 * The 00018 trigger returns early for this transition so the Server Action is NOT
 * the canonical audit writer — the trigger handles 'resubmit' automatically.
 */
export async function resubmitPendingBipAction(
  bipId: string,
  draft: BipDraftData,
  partners: Step3PartnerDraft[] = [],
): Promise<EditActionResult> {
  // 1. Auth + role guard
  const supabase = await createClient()
  const { data: claimsData, error: authError } = await supabase.auth.getClaims()
  if (authError || !claimsData?.claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }
  const userId = claimsData.claims.sub

  const role = (claimsData.claims as { app_metadata?: { role?: string } })?.app_metadata?.role
  if (role !== 'coordinator' && role !== 'admin') {
    return { error: 'Forbidden.' }
  }

  // 2. Server-side full re-validation (mirrors submitBipAction / reviseRejectedBipAction)
  const parsed = fullBipSchema.safeParse(draft)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Validation failed.' }
  }

  // 3. Defense-in-depth read-back: ownership + changes_requested status guard
  const { data: bip } = await supabase
    .from('bips')
    .select('id, status, created_by')
    .eq('id', bipId)
    .maybeSingle()
  if (!bip) return { error: 'BIP not found.' }
  if (bip.created_by !== userId) {
    return { error: 'You do not have permission to resubmit this BIP.' }
  }
  if (bip.status !== 'changes_requested') {
    return { error: 'Only BIPs in changes_requested state can be resubmitted.' }
  }

  // 4. Single UPDATE: ALL editable content columns + status='pending' together.
  //    This passes bips_update_own_changes_requested_to_pending WITH CHECK because
  //    the post-image status is 'pending'. Slug intentionally excluded (D-10/EDIT-09).
  //    WHERE status='changes_requested' provides idempotency guard.
  const { error: updateError } = await supabase
    .from('bips')
    .update({
      status: 'pending',
      ...buildContentPayload(parsed.data),
      updated_at: new Date().toISOString(),
      // NOTE: slug intentionally omitted (D-10 / EDIT-09)
    })
    .eq('id', bipId)
    .eq('created_by', userId)
    .eq('status', 'changes_requested') // idempotency guard

  if (updateError) {
    console.error('[resubmitPendingBipAction] update error:', updateError.message)
    return { error: 'Failed to resubmit. Please try again.' }
  }

  // 5. Partner reconciliation — delete-then-insert (mirrors submitBipAction)
  //    bip_partner_universities for the bips row (not bip_edits JSONB).
  await supabase.from('bip_partner_universities').delete().eq('bip_id', bipId)

  const partnerRows = partners.map((p) =>
    p.isVerified && p.university_id
      ? {
          bip_id: bipId,
          university_id: p.university_id,
          partner_name_raw: null,
          partner_country_raw: null,
          partner_erasmus_code_raw: null,
        }
      : {
          bip_id: bipId,
          university_id: null,
          partner_name_raw: `${p.name} (unverified)`,
          partner_country_raw: p.country || null,
          partner_erasmus_code_raw: null,
        },
  )

  if (partnerRows.length > 0) {
    const { error: partnerError } = await supabase
      .from('bip_partner_universities')
      .insert(partnerRows)
    if (partnerError) {
      console.error('[resubmitPendingBipAction] partner insert error:', partnerError.message)
      // BIP is already pending — partners can be fixed on next edit.
      return {
        error: 'BIP resubmitted but partners could not be saved. Edit the BIP to add partners.',
      }
    }
  }

  // No revalidatePath — the BIP is not publicly visible until it reaches 'approved' (D-01).
  // The 00018 trigger logs 'resubmit' to bip_status_history for changes_requested → pending.

  return { success: true }
}
