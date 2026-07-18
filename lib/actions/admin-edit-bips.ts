'use server'

/**
 * Admin BIP-edit Server Actions (Phase 8 EDIT-03/04/05/06).
 *
 *   - approveEditAction(editId)              — merge bip_edits → bips + revalidatePath + email
 *   - rejectEditAction(editId, note)         — mark edit rejected; bips unchanged; email
 *   - requestChangesEditAction(editId, note) — mark edit changes_requested + audit + email
 *   - requestChangesBipAction(bipId, note)   — new-submission changes_requested path + audit + email
 *
 * 9-step sequence (mirrors admin-bips.ts D-11):
 *   1. getClaims() + role=admin check
 *   2. Zod safeParse
 *   3. Read existing bip_edits row (+ parent bips row for slug/coordinator)
 *   4. Inline transition check
 *   5. UPDATE bip_edits (+ UPDATE bips for approve-edit only)
 *   6. INSERT bip_status_history (explicit — trigger won't fire for admin transitions on bip_edits)
 *   7. revalidatePath (approveEditAction only — D-13)
 *   8. sendEmail (fire-and-forget try/catch — D-11)
 *   9. redirect to /admin
 *
 * Auth: getClaims() — NEVER getSession (CLAUDE.md never-do).
 * Client: createClient (anon-key + admin JWT) — NEVER createAdminClient outside
 *   app/(admin)/ and lib/supabase/admin.ts (CLAUDE.md never-do / eslint-enforced).
 * Slug: intentionally excluded from merge payload (D-10/EDIT-09).
 */

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  ApproveEditSchema,
  RejectEditSchema,
  RequestChangesEditSchema,
  RequestChangesBipSchema,
} from '@/lib/schemas/bip-edits'
import { validateTransition } from '@/lib/utils/status-transitions'
import { sendEmail } from '@/lib/email/send'
import type { BipStatus } from '@/lib/utils/status'
import { BIP_EDIT_CONTENT_COLUMNS } from '@/lib/constants/bip-edit-columns'

// ── Internal types ────────────────────────────────────────────────────────────

type AdminActionResult = { error: string }

type RawEditRow = {
  id: string
  bip_id: string
  status: string
  admin_note: string | null
  created_by: string | null
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

type RawPartnerInstitution = {
  university_id?: string | null
  name?: string
  country?: string
  isVerified?: boolean
}

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Build the merge payload to copy from bip_edits → bips on approve.
 * 26 content columns; slug OMITTED (D-10/EDIT-09); status OMITTED (bips stays 'approved').
 */
function buildMergePayload(editRow: RawEditRow) {
  return {
    title: editRow.title,
    // Copy the canonical multi-field set into bips; keep the legacy scalars
    // (subject_area, isced_f_code) mirrored to the first field.
    subject_areas: editRow.subject_areas ?? [],
    subject_area: editRow.subject_areas?.[0] ?? editRow.isced_f_code,
    isced_f_code: editRow.subject_areas?.[0] ?? editRow.isced_f_code,
    description: editRow.description,
    learning_outcomes: editRow.learning_outcomes,
    virtual_component_description: editRow.virtual_component_description,
    virtual_timing: editRow.virtual_timing,
    host_city: editRow.host_city,
    physical_start_date: editRow.physical_start_date,
    physical_end_date: editRow.physical_end_date,
    application_deadline: editRow.application_deadline,
    ects_credits: editRow.ects_credits,
    max_participants: editRow.max_participants,
    study_levels: editRow.study_levels,
    language_of_instruction: editRow.language_of_instruction,
    language_level_min: editRow.language_level_min,
    green_travel: editRow.green_travel,
    inclusion_support: editRow.inclusion_support,
    eligibility_notes: editRow.eligibility_notes,
    how_to_apply_type: editRow.how_to_apply_type,
    how_to_apply_value: editRow.how_to_apply_value,
    contact_name: editRow.contact_name,
    contact_email: editRow.contact_email,
    virtual_sessions_count: editRow.virtual_sessions_count,
    virtual_duration_notes: editRow.virtual_duration_notes,
    accommodation_notes: editRow.accommodation_notes,
    partner_institutions_only: editRow.partner_institutions_only ?? false,
    updated_at: new Date().toISOString(),
    // NOTE: slug intentionally omitted (D-10 / EDIT-09)
    // NOTE: status intentionally omitted — bips.status stays 'approved'
  }
}

/**
 * Normalize PostgREST profiles embedded relation (may return object or array).
 * Mirrors the pattern in admin-bips.ts (lines 124-129).
 */
function extractProfiles(
  raw: unknown,
): { contact_email?: string | null; full_name?: string | null } | undefined {
  const profilesRaw = (raw as { profiles?: unknown }).profiles
  return Array.isArray(profilesRaw)
    ? (profilesRaw[0] as { contact_email?: string | null; full_name?: string | null } | undefined)
    : (profilesRaw as { contact_email?: string | null; full_name?: string | null } | undefined)
}

// ── Admin Server Actions ──────────────────────────────────────────────────────

/**
 * Approve a bip_edits row — merge content into parent bips, bust ISR, email coordinator.
 *
 * Merge payload copies the 26 edit content columns into bips; slug is EXCLUDED
 * (D-10/EDIT-09 dual guard); bips.status stays 'approved' throughout.
 *
 * On success calls redirect('/admin') — NEVER returns normally.
 * On failure returns { error } so the action panel can surface the message.
 */
export async function approveEditAction(editId: string): Promise<AdminActionResult> {
  // 1. Auth + role guard
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role !== 'admin') return { error: 'Forbidden.' }

  // 2. Zod validate
  const parsed = ApproveEditSchema.safeParse({ editId })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  // 3. Read bip_edits row + parent bips row
  const { data: editRow, error: editReadError } = await supabase
    .from('bip_edits')
    .select(BIP_EDIT_CONTENT_COLUMNS)
    .eq('id', parsed.data.editId)
    .maybeSingle()
  if (editReadError || !editRow) return { error: 'Edit not found.' }

  const { data: bip, error: bipReadError } = await supabase
    .from('bips')
    .select('id, slug, title, status, profiles!created_by ( contact_email, full_name )')
    .eq('id', editRow.bip_id)
    .maybeSingle()
  if (bipReadError || !bip) return { error: 'Parent BIP not found.' }

  // 4. Transition guard — only pending edits can be approved
  if (editRow.status !== 'pending') {
    return { error: `Cannot approve from status ${editRow.status}.` }
  }

  // 5a. UPDATE bips — merge content from bip_edits (slug + status intentionally omitted)
  const { error: bipsUpdateError } = await supabase
    .from('bips')
    .update(buildMergePayload(editRow as RawEditRow))
    .eq('id', editRow.bip_id)
  if (bipsUpdateError) {
    console.error('[approveEditAction] bips update error:', bipsUpdateError.message)
    return { error: 'Failed to apply edit. Please try again.' }
  }

  // 5b. UPDATE bip_edits — mark edit approved
  const { error: editUpdateError } = await supabase
    .from('bip_edits')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', parsed.data.editId)
  if (editUpdateError) {
    console.error('[approveEditAction] edit status update error:', editUpdateError.message)
    // Continue — bips update already committed; edit status is secondary.
  }

  // 5c. Partner reconciliation — parse partner_institutions JSONB → bip_partner_universities
  //     Delete-then-insert mirrors submitBipAction (T-02-07-07 risk accepted; small N).
  const partnerRaw = Array.isArray(editRow.partner_institutions)
    ? (editRow.partner_institutions as RawPartnerInstitution[])
    : []
  await supabase.from('bip_partner_universities').delete().eq('bip_id', editRow.bip_id)
  const partnerRows = partnerRaw.map((p) =>
    p.isVerified && p.university_id
      ? {
          bip_id: editRow.bip_id,
          university_id: p.university_id,
          partner_name_raw: null,
          partner_country_raw: null,
          partner_erasmus_code_raw: null,
        }
      : {
          bip_id: editRow.bip_id,
          university_id: null,
          partner_name_raw: `${p.name ?? ''} (unverified)`,
          partner_country_raw: p.country ?? null,
          partner_erasmus_code_raw: null,
        },
  )
  if (partnerRows.length > 0) {
    const { error: partnerError } = await supabase
      .from('bip_partner_universities')
      .insert(partnerRows)
    if (partnerError) {
      console.error('[approveEditAction] partner insert error:', partnerError.message)
      // Non-fatal — content merge already committed. Admin can re-edit if needed.
    }
  }

  // 6. Audit log — explicit insert (trigger does NOT fire for admin transitions on bip_edits)
  const { error: auditError } = await supabase.from('bip_status_history').insert({
    bip_id: editRow.bip_id,
    from_status: 'pending',
    to_status: 'approved',
    actor_id: claims.sub,
    note: null,
    action_kind: 'approve_edit',
  })
  if (auditError) {
    console.error('[approveEditAction] audit insert failed:', auditError.message)
    // Continue — DB write already succeeded; audit is non-fatal (D-11 analog).
  }

  // 7. ISR cache bust — D-13 (approve-edit only)
  revalidatePath(`/bip/${bip.slug}`)
  revalidatePath('/bips')
  revalidatePath('/admin')

  // 8. Email send (fire-and-forget per D-11)
  const profiles = extractProfiles(bip)
  const coordinatorEmail = profiles?.contact_email ?? null
  if (coordinatorEmail) {
    try {
      await sendEmail(coordinatorEmail, {
        template: 'edit-approved',
        props: {
          bipTitle: bip.title,
          bipSlug: bip.slug,
          coordinatorName: profiles?.full_name ?? '',
        },
      })
    } catch (err) {
      // D-11: Resend outage must NOT roll back the DB writes.
      console.error('[approveEditAction] email send failed (non-blocking):', err)
    }
  } else {
    console.warn('[approveEditAction] coordinator has no contact_email on profile; skipping email.')
  }

  // 9. Redirect to admin queue
  redirect('/admin')
}

/**
 * Reject a bip_edits row — mark rejected; bips content stays unchanged (EDIT-05).
 *
 * Allowed source statuses: 'pending' or 'changes_requested' (admin may reject
 * an edit that was already returned for changes).
 * The live BIP page is NOT revalidated — the coordinator's last approved content stays.
 *
 * On success calls redirect('/admin').
 * On failure returns { error }.
 */
export async function rejectEditAction(
  editId: string,
  note: string,
): Promise<AdminActionResult> {
  // 1. Auth + role guard
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role !== 'admin') return { error: 'Forbidden.' }

  // 2. Zod validate
  const parsed = RejectEditSchema.safeParse({ editId, note })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  // 3. Read bip_edits row + parent bips
  const { data: editRow, error: editReadError } = await supabase
    .from('bip_edits')
    .select('id, bip_id, status, created_by')
    .eq('id', parsed.data.editId)
    .maybeSingle()
  if (editReadError || !editRow) return { error: 'Edit not found.' }

  const { data: bip, error: bipReadError } = await supabase
    .from('bips')
    .select('id, slug, title, profiles!created_by ( contact_email, full_name )')
    .eq('id', editRow.bip_id)
    .maybeSingle()
  if (bipReadError || !bip) return { error: 'Parent BIP not found.' }

  // 4. Transition guard — only pending or changes_requested edits can be rejected
  if (editRow.status !== 'pending' && editRow.status !== 'changes_requested') {
    return { error: `Cannot reject from status ${editRow.status}.` }
  }

  // 5. UPDATE bip_edits only — bips content stays unchanged (EDIT-05)
  const { error: updateError } = await supabase
    .from('bip_edits')
    .update({
      status: 'rejected',
      admin_note: parsed.data.note,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.editId)
  if (updateError) {
    console.error('[rejectEditAction] edit update error:', updateError.message)
    return { error: 'Failed to reject edit. Please try again.' }
  }

  // 6. Audit log
  const { error: auditError } = await supabase.from('bip_status_history').insert({
    bip_id: editRow.bip_id,
    from_status: editRow.status,
    to_status: 'rejected',
    actor_id: claims.sub,
    note: parsed.data.note,
    action_kind: 'reject_edit',
  })
  if (auditError) {
    console.error('[rejectEditAction] audit insert failed:', auditError.message)
  }

  // 7. NO revalidatePath — the live BIP page is unchanged (EDIT-05 / SC4)

  // 8. Email send (fire-and-forget per D-11)
  const profiles = extractProfiles(bip)
  const coordinatorEmail = profiles?.contact_email ?? null
  if (coordinatorEmail) {
    try {
      await sendEmail(coordinatorEmail, {
        template: 'edit-rejected',
        props: {
          bipTitle: bip.title,
          bipSlug: bip.slug,
          coordinatorName: profiles?.full_name ?? '',
          adminNote: parsed.data.note,
        },
      })
    } catch (err) {
      console.error('[rejectEditAction] email send failed (non-blocking):', err)
    }
  } else {
    console.warn('[rejectEditAction] coordinator has no contact_email on profile; skipping email.')
  }

  // 9. Redirect
  redirect('/admin')
}

/**
 * Request changes on a bip_edits row (D-05 / D-06 / EDIT-06).
 *
 * Source guard: editRow.status must be 'pending'.
 * This matches the 08-08 canRequestChanges button-enabled gate so there is no
 * error-toast-vs-disabled-button mismatch (consistent UX).
 *
 * The admin note is written to bip_edits.admin_note (D-04) and stored
 * in bip_status_history.note (D-12 Option A) for coordinator dashboard display.
 *
 * On success calls redirect('/admin').
 * On failure returns { error }.
 */
export async function requestChangesEditAction(
  editId: string,
  note: string,
): Promise<AdminActionResult> {
  // 1. Auth + role guard
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role !== 'admin') return { error: 'Forbidden.' }

  // 2. Zod validate
  const parsed = RequestChangesEditSchema.safeParse({ editId, note })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  // 3. Read bip_edits row + parent bips
  const { data: editRow, error: editReadError } = await supabase
    .from('bip_edits')
    .select('id, bip_id, status, created_by')
    .eq('id', parsed.data.editId)
    .maybeSingle()
  if (editReadError || !editRow) return { error: 'Edit not found.' }

  const { data: bip, error: bipReadError } = await supabase
    .from('bips')
    .select('id, slug, title, profiles!created_by ( contact_email, full_name )')
    .eq('id', editRow.bip_id)
    .maybeSingle()
  if (bipReadError || !bip) return { error: 'Parent BIP not found.' }

  // 4. Transition guard — only pending edits can receive a request-changes verdict.
  //    Mirrors the 08-08 AdminActionsPanel canRequestChanges gate: status==='pending'.
  if (editRow.status !== 'pending') {
    return { error: `Cannot request changes from status ${editRow.status}.` }
  }

  // 5. UPDATE bip_edits: status → changes_requested + note on the row (D-04)
  const { error: updateError } = await supabase
    .from('bip_edits')
    .update({
      status: 'changes_requested',
      admin_note: parsed.data.note,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.editId)
  if (updateError) {
    console.error('[requestChangesEditAction] edit update error:', updateError.message)
    return { error: 'Failed to request changes. Please try again.' }
  }

  // 6. Audit log — action_kind='request_changes' (D-12)
  const { error: auditError } = await supabase.from('bip_status_history').insert({
    bip_id: editRow.bip_id,
    from_status: 'pending',
    to_status: 'changes_requested',
    actor_id: claims.sub,
    note: parsed.data.note,
    action_kind: 'request_changes',
  })
  if (auditError) {
    console.error('[requestChangesEditAction] audit insert failed:', auditError.message)
  }

  // 7. NO revalidatePath — bips content is untouched; public page unchanged

  // 8. Email send (fire-and-forget per D-11)
  const profiles = extractProfiles(bip)
  const coordinatorEmail = profiles?.contact_email ?? null
  if (coordinatorEmail) {
    try {
      await sendEmail(coordinatorEmail, {
        template: 'edit-changes-requested',
        props: {
          bipTitle: bip.title,
          bipSlug: bip.slug,
          coordinatorName: profiles?.full_name ?? '',
          adminNote: parsed.data.note,
        },
      })
    } catch (err) {
      console.error('[requestChangesEditAction] email send failed (non-blocking):', err)
    }
  } else {
    console.warn(
      '[requestChangesEditAction] coordinator has no contact_email on profile; skipping email.',
    )
  }

  // 9. Redirect
  redirect('/admin')
}

/**
 * Request changes on a NEW-SUBMISSION BIP (D-06a pending → changes_requested path).
 *
 * A brand-new submission has no bip_edits row — changes_requested is a bips status value
 * (D-06a asymmetry). The admin note lives in bip_status_history (Option A — D-12/OQ#2).
 *
 * The 00018 trigger returns early for pending → changes_requested, so THIS action is
 * the sole audit writer — no double-log risk.
 *
 * On success calls redirect('/admin').
 * On failure returns { error }.
 */
export async function requestChangesBipAction(
  bipId: string,
  note: string,
): Promise<AdminActionResult> {
  // 1. Auth + role guard
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role !== 'admin') return { error: 'Forbidden.' }

  // 2. Zod validate
  const parsed = RequestChangesBipSchema.safeParse({ bipId, note })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  // 3. Read bips row + coordinator profile
  const { data: bip, error: bipReadError } = await supabase
    .from('bips')
    .select('id, slug, title, status, profiles!created_by ( contact_email, full_name )')
    .eq('id', parsed.data.bipId)
    .maybeSingle()
  if (bipReadError || !bip) return { error: 'BIP not found.' }

  // 4. State machine guard (T-03-03 analog)
  try {
    validateTransition(bip.status as BipStatus, 'changes_requested', 'admin')
  } catch {
    return { error: `Cannot request changes from status ${bip.status}.` }
  }

  // 5. UPDATE bips: status → changes_requested
  //    Note is NOT stored on the bips row — it lives in bip_status_history (D-12/OQ#2 Option A).
  const { error: updateError } = await supabase
    .from('bips')
    .update({ status: 'changes_requested', updated_at: new Date().toISOString() })
    .eq('id', parsed.data.bipId)
  if (updateError) {
    console.error('[requestChangesBipAction] bips update error:', updateError.message)
    return { error: 'Failed to request changes. Please try again.' }
  }

  // 6. Audit log — explicit insert (the 00018 trigger returns early for this transition).
  //    Note lives here so coordinator can retrieve it via getLatestChangesRequest (D-12 Option A).
  const { error: auditError } = await supabase.from('bip_status_history').insert({
    bip_id: parsed.data.bipId,
    from_status: 'pending',
    to_status: 'changes_requested',
    actor_id: claims.sub,
    note: parsed.data.note,
    action_kind: 'request_changes',
  })
  if (auditError) {
    console.error('[requestChangesBipAction] audit insert failed:', auditError.message)
  }

  // 7. NO revalidatePath — BIP was not publicly visible (pending status never renders on /bips)

  // 8. Email send (fire-and-forget per D-11)
  const profiles = extractProfiles(bip)
  const coordinatorEmail = profiles?.contact_email ?? null
  if (coordinatorEmail) {
    try {
      await sendEmail(coordinatorEmail, {
        template: 'edit-changes-requested',
        props: {
          bipTitle: bip.title,
          bipSlug: bip.slug,
          coordinatorName: profiles?.full_name ?? '',
          adminNote: parsed.data.note,
        },
      })
    } catch (err) {
      console.error('[requestChangesBipAction] email send failed (non-blocking):', err)
    }
  } else {
    console.warn(
      '[requestChangesBipAction] coordinator has no contact_email on profile; skipping email.',
    )
  }

  // 9. Redirect
  redirect('/admin')
}
