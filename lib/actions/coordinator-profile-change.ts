'use server'

/**
 * Coordinator data-change Server Actions (migration 00059).
 *
 * A coordinator proposes new profile values; the row lands in
 * `coordinator_profile_change_requests` for admin review. NOTHING is written
 * to `profiles` here — the admin approve action applies the values.
 *
 *   - submitProfileChangeRequestAction(fd) — validate + INSERT pinned to
 *     status='pending' (RLS cp_change_insert_own). One live request per
 *     coordinator: a pre-check plus the partial unique index (23505 mapped
 *     to the same message) guard double submits.
 *   - withdrawProfileChangeRequestAction(requestId) — DELETE own pending row
 *     (RLS cp_change_delete_own_pending) so a typo can be re-filed.
 *
 * Auth: getClaims() — NEVER getSession (CLAUDE.md never-do).
 * Client: anon-key createClient — RLS scopes every write to the caller, so
 * no service-role import (CLAUDE.md never-do / eslint-enforced).
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { coordinatorProfileChangeSchema } from '@/lib/schemas/coordinator-profile-change'
import { sendEmail } from '@/lib/email/send'

type ActionResult = { error?: string; success?: true }

const ALREADY_PENDING =
  'You already have a data-change request under review. Withdraw it before filing a new one.'

export async function submitProfileChangeRequestAction(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = coordinatorProfileChangeSchema.safeParse({
    full_name: formData.get('full_name'),
    contact_email: formData.get('contact_email'),
    university_id: formData.get('university_id'),
    erasmus_code: formData.get('erasmus_code'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  if (authError || !authData?.claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }
  const userId = authData.claims.sub

  // One live request per coordinator — friendly message before the DB
  // unique index would reject the insert.
  const { data: live } = await supabase
    .from('coordinator_profile_change_requests')
    .select('id')
    .eq('coordinator_id', userId)
    .eq('status', 'pending')
    .maybeSingle()
  if (live) return { error: ALREADY_PENDING }

  // The requested university must exist (public read policy allows it).
  const { data: uni } = await supabase
    .from('universities')
    .select('id, name')
    .eq('id', parsed.data.university_id)
    .maybeSingle()
  if (!uni) {
    return {
      error: 'The selected university is no longer available. Please choose another.',
    }
  }

  // Current profile values for the admin notification: the email must
  // identify the coordinator by their ACTUAL (pre-change) data. Passing the
  // requested new values here made the admin email describe a coordinator
  // that doesn't exist yet.
  type CurrentProfileRow = {
    full_name: string | null
    contact_email: string | null
    erasmus_code: string | null
    university: { name: string } | Array<{ name: string }> | null
  }
  const { data: current } = await supabase
    .from('profiles')
    .select(
      'full_name, contact_email, erasmus_code, university:university_id ( name )',
    )
    .eq('id', userId)
    .maybeSingle()
  const currentRow = (current ?? null) as unknown as CurrentProfileRow | null
  const currentUniversity = Array.isArray(currentRow?.university)
    ? (currentRow?.university[0] ?? null)
    : (currentRow?.university ?? null)

  const { error } = await supabase
    .from('coordinator_profile_change_requests')
    .insert({
      coordinator_id: userId,
      status: 'pending',
      requested_full_name: parsed.data.full_name,
      requested_contact_email: parsed.data.contact_email,
      requested_university_id: parsed.data.university_id,
      requested_erasmus_code: parsed.data.erasmus_code,
    })
  if (error) {
    if (error.code === '23505') return { error: ALREADY_PENDING }
    console.error('[submitProfileChangeRequest] supabase error:', error.message)
    return { error: 'Something went wrong. Please try again.' }
  }

  // Admin notification so the inbox doesn't sit unseen (fire-and-forget per
  // D-11: the row already committed, email failures never roll it back).
  const adminRecipient = process.env.ADMIN_NOTIFICATION_EMAIL
  if (adminRecipient) {
    try {
      await sendEmail(adminRecipient, {
        template: 'profile-change-request-admin',
        props: {
          // Pre-change identity; fall back to the requested values only when
          // the profile row itself couldn't be read (it should always exist).
          coordinatorName:
            currentRow?.full_name ?? parsed.data.full_name,
          coordinatorEmail:
            currentRow?.contact_email ?? parsed.data.contact_email,
          universityName:
            currentUniversity?.name ??
            (currentRow
              ? ''
              : ((uni as { name?: string }).name ?? '')),
          erasmusCode:
            currentRow?.erasmus_code ?? parsed.data.erasmus_code,
          submittedAt: new Date().toISOString(),
        },
      })
    } catch (err) {
      console.error(
        '[submitProfileChangeRequest] admin notification email failed (non-blocking):',
        err,
      )
    }
  } else {
    console.warn(
      '[submitProfileChangeRequest] ADMIN_NOTIFICATION_EMAIL unset — skipping admin notification email',
    )
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function withdrawProfileChangeRequestAction(
  requestId: string,
): Promise<ActionResult> {
  if (!requestId) return { error: 'Missing request.' }

  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  if (authError || !authData?.claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }

  // RLS cp_change_delete_own_pending scopes this to the caller's own pending
  // row: no row → either missing, decided, or someone else's.
  const { error, count } = await supabase
    .from('coordinator_profile_change_requests')
    .delete({ count: 'exact' })
    .eq('id', requestId)
    .eq('coordinator_id', authData.claims.sub)
    .eq('status', 'pending')
  if (error) {
    console.error('[withdrawProfileChangeRequest] supabase error:', error.message)
    return { error: 'Failed to withdraw the request. Please try again.' }
  }
  if (!count) {
    return { error: 'This request can no longer be withdrawn.' }
  }

  revalidatePath('/dashboard/settings')
  return { success: true }
}
