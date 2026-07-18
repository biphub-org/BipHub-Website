'use server'

/**
 * Admin BIP Server Actions (Phase 3).
 *
 *   - approveBipAction(bipId, note?)  — pending → approved (Plan 03-03, this file)
 *   - rejectBipAction(bipId, reason)  — pending|approved → rejected (Plan 03-04)
 *   - adminUpdateBipAction(...)       — admin edit (Plan 03-07)
 *
 * Sequence (D-11):
 *   1. getClaims() + role check
 *   2. Zod-validate input
 *   3. Read existing row (defense-in-depth)
 *   4. validateTransition() (state machine guard — T-03-03)
 *   5. UPDATE bips
 *   6. INSERT bip_status_history (action_kind = 'approve' or 'reject')
 *   7. revalidatePath('/bips') AND revalidatePath('/bip/[slug]')
 *   8. await sendEmail(...) wrapped in try/catch (fire-and-forget per D-11)
 *   9. redirect to next pending (or /admin)
 *
 * Auth: getClaims() — NEVER getSession (CLAUDE.md never-do).
 * Client: createClient (anon-key + admin JWT) — NEVER createAdminClient
 *   outside app/(admin)/** (CLAUDE.md never-do; eslint-enforced).
 */

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ApproveBipSchema, RejectBipSchema } from '@/lib/schemas/admin-bips'
import { fullBipSchema } from '@/lib/schemas/bip-wizard'
import { validateTransition } from '@/lib/utils/status-transitions'
import { getNextPendingBip } from '@/lib/queries/adminBips'
import { sendEmail } from '@/lib/email/send'
import type { BipStatus } from '@/lib/utils/status'
import type { BipDraftData, Step3PartnerDraft } from '@/lib/store/bip-draft'

export type ActionResult = { error?: string; success?: true }

/**
 * Approve a pending BIP (ADMN-03, ADMN-08, ADMN-09).
 *
 * On success this function calls `redirect(...)` (NEVER returns normally).
 * On failure it returns `{ error: string }` so the modal can surface the
 * message to the admin. Per Next.js semantics, `redirect` throws a
 * NEXT_REDIRECT control flow error — DO NOT wrap the entire body in a
 * try/catch that swallows it.
 */
export async function approveBipAction(
  bipId: string,
  note?: string,
): Promise<ActionResult> {
  // 1. Auth + role guard
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role !== 'admin') return { error: 'Forbidden.' }

  // 2. Zod validate (server-side re-validation per D-11)
  const parsed = ApproveBipSchema.safeParse({ bipId, note })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  // 3. Read existing row (defense-in-depth — also needed for slug, title,
  // and coordinator email; T-03-05 forces the recipient to come from the DB,
  // not the request body)
  const { data: existing, error: readError } = await supabase
    .from('bips')
    .select(
      'id, slug, title, status, created_by, profiles!created_by ( contact_email, full_name )',
    )
    .eq('id', parsed.data.bipId)
    .maybeSingle()
  if (readError || !existing) return { error: 'BIP not found.' }

  // 4. State machine guard (T-03-03)
  try {
    validateTransition(existing.status as BipStatus, 'approved', 'admin')
  } catch {
    return { error: `Cannot approve from status ${existing.status}.` }
  }

  // 5. UPDATE bips
  const { error: updateError } = await supabase
    .from('bips')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', parsed.data.bipId)
  if (updateError) {
    console.error('[approveBipAction] update error:', updateError.message)
    return { error: 'Failed to approve. Please try again.' }
  }

  // 6. Audit log
  // NOTE: the migration 00010 trigger ONLY logs coordinator-initiated transitions
  // (draft→pending, pending→draft, rejected→draft). Admin transitions are
  // logged explicitly here so the `note` field can be populated.
  const { error: auditError } = await supabase
    .from('bip_status_history')
    .insert({
      bip_id: parsed.data.bipId,
      from_status: existing.status,
      to_status: 'approved',
      actor_id: claims.sub,
      note: parsed.data.note ?? null,
      action_kind: 'approve',
    })
  if (auditError) {
    // Continue — the DB write already succeeded. The trigger does not fire
    // for admin transitions, so this is the canonical audit row; surface
    // the error in logs but do NOT roll back the approve.
    console.error('[approveBipAction] audit insert failed:', auditError.message)
  }

  // 7. ISR cache bust
  revalidatePath('/bips')
  revalidatePath(`/bip/${existing.slug}`)
  revalidatePath('/admin')

  // 8. Email send (fire-and-forget per D-11)
  // PostgREST may return embedded relations as an object or a single-element array.
  const profilesRaw = (existing as { profiles?: unknown }).profiles
  const profiles = Array.isArray(profilesRaw)
    ? (profilesRaw[0] as { contact_email?: string | null; full_name?: string | null } | undefined)
    : (profilesRaw as { contact_email?: string | null; full_name?: string | null } | undefined)
  const coordinatorEmail = profiles?.contact_email ?? null
  if (coordinatorEmail) {
    try {
      await sendEmail(coordinatorEmail, {
        template: 'approval',
        props: {
          bipTitle: existing.title,
          bipSlug: existing.slug,
          coordinatorName: profiles?.full_name ?? '',
          note: parsed.data.note,
        },
      })
    } catch (err) {
      // D-11: Resend outage must NOT roll back the DB writes.
      console.error('[approveBipAction] email send failed (non-blocking):', err)
    }
  } else {
    console.warn(
      '[approveBipAction] coordinator has no contact_email on profile; skipping email.',
    )
  }

  // 9. Auto-advance (D-05)
  const next = await getNextPendingBip(parsed.data.bipId)
  if (next) {
    redirect(`/admin/bips/${next.id}/review`)
  }
  redirect('/admin')
}

/**
 * Reject a BIP (ADMN-04, ADMN-08, ADMN-10).
 *
 * Allowed sources: pending (standard reject) or approved (un-approve per D-06).
 * The reason is REQUIRED (Zod min 10) and is rendered verbatim in:
 *   1. the rejection email body (RejectionEmail "Reviewer feedback" callout),
 *   2. the coordinator's dashboard card (via getLatestRejection / Plan task 3),
 *   3. the bip_status_history.note column (audit trail, action_kind='reject').
 *
 * On success this function calls `redirect(...)` (NEVER returns normally).
 * On failure it returns `{ error: string }` so the modal can surface the
 * message to the admin. Same NEXT_REDIRECT semantics as approveBipAction.
 */
export async function rejectBipAction(
  bipId: string,
  reason: string,
): Promise<ActionResult> {
  // 1. Auth + role guard
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role !== 'admin') return { error: 'Forbidden.' }

  // 2. Zod validate (server-side re-validation per D-11; T-03-04 mitigation)
  const parsed = RejectBipSchema.safeParse({ bipId, reason })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  // 3. Read existing row (defense-in-depth — also needed for slug, title,
  // and coordinator email; T-03-05 forces the recipient to come from the DB,
  // not the request body)
  const { data: existing, error: readError } = await supabase
    .from('bips')
    .select(
      'id, slug, title, status, created_by, profiles!created_by ( contact_email, full_name )',
    )
    .eq('id', parsed.data.bipId)
    .maybeSingle()
  if (readError || !existing) return { error: 'BIP not found.' }

  // 4. State machine guard (T-03-03) — only pending or approved sources allowed
  try {
    validateTransition(existing.status as BipStatus, 'rejected', 'admin')
  } catch {
    return { error: `Cannot reject from status ${existing.status}.` }
  }

  // Track whether this reject is an un-approve so we know to bust public ISR
  const wasApproved = existing.status === 'approved'

  // 5. UPDATE bips
  const { error: updateError } = await supabase
    .from('bips')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', parsed.data.bipId)
  if (updateError) {
    console.error('[rejectBipAction] update error:', updateError.message)
    return { error: 'Failed to reject. Please try again.' }
  }

  // 6. Audit log
  // NOTE: the migration 00010 trigger does NOT log admin transitions
  // (pending→approved, pending→rejected, approved→rejected). The Server
  // Action is the canonical audit writer for the reject — note=reason so
  // the coordinator dashboard (getLatestRejection) can render it back.
  const { error: auditError } = await supabase
    .from('bip_status_history')
    .insert({
      bip_id: parsed.data.bipId,
      from_status: existing.status,
      to_status: 'rejected',
      actor_id: claims.sub,
      note: parsed.data.reason,
      action_kind: 'reject',
    })
  if (auditError) {
    // Continue — the DB write succeeded. The trigger does not fire for
    // admin transitions, so this is the canonical audit row; surface the
    // error in logs but do NOT roll back the reject.
    console.error('[rejectBipAction] audit insert failed:', auditError.message)
  }

  // 7. ISR cache bust
  revalidatePath('/admin')
  if (wasApproved) {
    // Un-approve: the BIP was publicly listed — bust ISR so /bips and the
    // public detail page reflect the un-approved status (T-03-11 mitigation).
    revalidatePath('/bips')
    revalidatePath(`/bip/${existing.slug}`)
  }

  // 8. Email send (fire-and-forget per D-11)
  // PostgREST may return embedded relations as an object or a single-element array.
  const profilesRaw = (existing as { profiles?: unknown }).profiles
  const profiles = Array.isArray(profilesRaw)
    ? (profilesRaw[0] as { contact_email?: string | null; full_name?: string | null } | undefined)
    : (profilesRaw as { contact_email?: string | null; full_name?: string | null } | undefined)
  const coordinatorEmail = profiles?.contact_email ?? null
  if (coordinatorEmail) {
    try {
      await sendEmail(coordinatorEmail, {
        template: 'rejection',
        props: {
          bipTitle: existing.title,
          bipId: parsed.data.bipId,
          reason: parsed.data.reason,
          coordinatorName: profiles?.full_name ?? '',
        },
      })
    } catch (err) {
      // D-11: Resend outage must NOT roll back the DB writes.
      console.error('[rejectBipAction] email send failed (non-blocking):', err)
    }
  } else {
    console.warn(
      '[rejectBipAction] coordinator has no contact_email on profile; skipping email.',
    )
  }

  // 9. Auto-advance (D-05). If the source was 'approved' (un-approve), the
  // queue may not include this BIP at all — next pending is unrelated, which
  // is fine: the admin can keep working through the queue.
  const next = await getNextPendingBip(parsed.data.bipId)
  if (next) {
    redirect(`/admin/bips/${next.id}/review`)
  }
  redirect('/admin')
}

/**
 * Admin edit of any BIP (ADMN-05, ADMN-08, Plan 03-07).
 *
 * Differs from approve/reject in three important ways:
 *
 *   1. **Status is preserved** (D-18). The admin can edit a BIP in any
 *      status without changing it; `validateTransition` is NOT called
 *      because no transition occurs. The audit row records
 *      `from_status = to_status = existing.status`.
 *   2. **Slug is preserved**. Admin edits to an already-approved BIP
 *      must not invalidate the existing public URL (ISR cache key
 *      stability — T-03-16). `finalizeSlug` is not called.
 *   3. **No coordinator email** (D-18). Admin edits are trusted; the
 *      coordinator is not notified. The audit row provides the
 *      forensic trail (T-03-18 risk acceptance).
 *
 * `revalidatePath` fires unconditionally for /admin/bips and the edit
 * route itself. The public `/bips` listing and `/bip/[slug]` detail
 * pages are revalidated ONLY when the pre-image status was 'approved'
 * (T-03-11) — non-approved BIPs are not publicly visible, so busting
 * those caches would be wasted work.
 *
 * The wizard data is re-validated against `fullBipSchema` (the same
 * cross-field validator the coordinator submit path uses) before any
 * DB write (T-03-04 mitigation). The partner upsert mirrors
 * `submitBipAction`'s delete-then-insert flow exactly.
 */
export async function adminUpdateBipAction(
  bipId: string,
  data: BipDraftData,
): Promise<ActionResult> {
  // 1. Auth + role guard
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role !== 'admin') return { error: 'Forbidden.' }

  if (!bipId || typeof bipId !== 'string') {
    return { error: 'Invalid BIP id.' }
  }

  // 2. Read pre-image — needed for slug stability, audit row from_status,
  //    and the revalidatePath conditional. (Defense-in-depth read.)
  const { data: existing, error: readError } = await supabase
    .from('bips')
    .select('id, slug, title, status')
    .eq('id', bipId)
    .maybeSingle()
  if (readError || !existing) return { error: 'BIP not found.' }

  // 3. Validate wizard data (T-03-04). Same flat schema as the
  //    coordinator submit path so admin edits cannot bypass the
  //    cross-field rules (date ordering, URL XOR contact, etc.).
  const parsed = fullBipSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Validation failed.' }
  }

  // 4. Map wizard data → bips columns. Mirrors submitBipAction's update
  //    payload EXCEPT we do NOT touch `status` (D-18) or `slug` (T-03-16).
  const updatePayload = {
    title: parsed.data.title,
    external_bip_id: parsed.data.external_bip_id,
    target_group: parsed.data.target_group,
    subject_areas: parsed.data.subject_areas,
    subject_area: parsed.data.subject_areas[0],
    isced_f_code: parsed.data.subject_areas[0],
    description: parsed.data.description,
    learning_outcomes: parsed.data.learning_outcomes,
    virtual_component_description: parsed.data.virtual_component_description,
    virtual_timing: parsed.data.virtual_timing,
    virtual_session_date: parsed.data.virtual_session_date || null,
    host_city: parsed.data.host_city,
    physical_start_date: parsed.data.physical_start_date,
    physical_end_date: parsed.data.physical_end_date,
    application_deadline: parsed.data.application_deadline,
    ects_credits: parsed.data.ects_credits,
    max_participants: parsed.data.max_participants,
    study_levels: parsed.data.study_levels,
    language_of_instruction: parsed.data.language_of_instruction,
    language_level_min: parsed.data.language_level_min,
    fees: parsed.data.fees || null,
    eligibility_notes: parsed.data.eligibility_notes,
    how_to_apply_type: parsed.data.how_to_apply_type,
    how_to_apply_value:
      parsed.data.how_to_apply_type === 'url'
        ? (parsed.data.how_to_apply_url ?? null)
        : (parsed.data.contact_email ?? null),
    contact_name: parsed.data.contact_name || null,
    contact_email: parsed.data.contact_email || null,
    accommodation_notes: parsed.data.accommodation_notes || null,
    partner_institutions_only: parsed.data.partner_institutions_only ?? false,
    updated_at: new Date().toISOString(),
    // NOTE: status and slug are intentionally omitted (D-18, T-03-16).
  }

  const { error: updateError } = await supabase
    .from('bips')
    .update(updatePayload)
    .eq('id', bipId)
  if (updateError) {
    console.error('[adminUpdateBipAction] update error:', updateError.message)
    return { error: 'Failed to save changes. Please try again.' }
  }

  // 5. Partner upsert — same delete-then-insert pattern as submitBipAction.
  //    `partner_universities` lives on the wizard draft (not the
  //    fullBipSchema, which only validates flat bips columns); pull it
  //    off the raw `data` argument. An undefined partners array means
  //    "do not touch partner rows" — but the wizard always sends the
  //    full array on Step 5, so we always reconcile.
  const partners: Step3PartnerDraft[] = data.partner_universities ?? []
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
      console.error(
        '[adminUpdateBipAction] partner insert error:',
        partnerError.message,
      )
      // Non-fatal: bips row already updated. Surface a warning so the
      // admin can re-save partners via a second edit pass.
      return {
        error:
          'Changes saved, but partner list could not be updated. Re-open the BIP and save again to retry.',
      }
    }
  }

  // 6. Audit row — action_kind='admin_edit' is the new audit dimension
  //    introduced by Plan 03-07 (Phase 1 migration 00010 already
  //    whitelisted it in the action_kind CHECK constraint).
  //    from_status == to_status because no status transition occurs.
  const { error: auditError } = await supabase
    .from('bip_status_history')
    .insert({
      bip_id: bipId,
      from_status: existing.status,
      to_status: existing.status,
      actor_id: claims.sub,
      note: `Admin edit by ${
        (claims as { email?: string }).email ?? claims.sub
      }`,
      action_kind: 'admin_edit',
    })
  if (auditError) {
    // Continue — the DB write already succeeded; the audit row is a
    // forensic trail. Log the failure and move on (D-11 fire-and-forget
    // analog for non-critical writes).
    console.error(
      '[adminUpdateBipAction] audit insert failed:',
      auditError.message,
    )
  }

  // 7. ISR cache bust (D-18 conditional). Public surfaces are only
  //    revalidated when the pre-image status was 'approved' — non-
  //    approved BIPs are not publicly visible so the public list/detail
  //    pages have nothing to refresh.
  revalidatePath('/admin/bips')
  revalidatePath(`/admin/bips/${bipId}/edit`)
  if (existing.status === 'approved') {
    revalidatePath('/bips')
    revalidatePath(`/bip/${existing.slug}`)
  }

  // 8. D-18: NO coordinator email. The audit row is the forensic trail.

  return { success: true }
}
