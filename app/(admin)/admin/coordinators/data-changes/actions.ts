'use server'

/**
 * Coordinator data-change review actions (admin only, migration 00059).
 *
 *   - approveProfileChangeRequestAction(requestId, note?) — mark approved,
 *     apply the requested values to the coordinator's profiles row, email
 *     the coordinator.
 *   - declineProfileChangeRequestAction(requestId, note?) — mark declined
 *     with the admin note; the profiles row stays untouched; email the
 *     coordinator.
 *
 * Auth: getClaims() + role=admin re-check (the (admin) layout already
 * guards; defence-in-depth per Phase 2 pattern).
 * Client: anon-key createClient — the admin JWT satisfies
 * cp_change_update_admin + profiles_update_own_or_admin. Only the delete
 * action uses the service-role client (this file lives under app/(admin)/,
 * so the eslint boundary allows it): no admin DELETE RLS policy exists on
 * purpose, keeping the anon client to pending rows only.
 * Email: fire-and-forget try/catch per D-11 — a Resend outage must NOT roll
 * back the committed verdict.
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { profileChangeReviewSchema } from '@/lib/schemas/coordinator-profile-change'
import { sendEmail } from '@/lib/email/send'

type ReviewResult = { error?: string; success?: true }

async function requireAdminId(): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) return null
  const role = (data.claims as { app_metadata?: { role?: string } }).app_metadata
    ?.role
  if (role !== 'admin') return null
  return data.claims.sub
}

type ChangeRequestRow = {
  id: string
  coordinator_id: string
  status: string
  requested_full_name: string
  requested_contact_email: string
  requested_university_id: string | null
  requested_erasmus_code: string | null
}

async function loadPendingRequest(
  requestId: string,
): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; req: ChangeRequestRow } | { error: string }> {
  const supabase = await createClient()
  const { data: req, error: fetchError } = await supabase
    .from('coordinator_profile_change_requests')
    .select(
      'id, coordinator_id, status, requested_full_name, requested_contact_email, requested_university_id, requested_erasmus_code',
    )
    .eq('id', requestId)
    .maybeSingle()
  if (fetchError || !req) {
    console.error('[profileChangeReview] fetch error:', fetchError?.message)
    return { error: 'Request not found.' }
  }
  const row = req as unknown as ChangeRequestRow
  if (row.status !== 'pending') {
    return { error: `This request is already ${row.status}.` }
  }
  return { supabase, req: row }
}

function revalidateInbox() {
  revalidatePath('/admin/coordinators/data-changes')
  revalidatePath('/admin/coordinators')
}

export async function approveProfileChangeRequestAction(
  requestId: string,
  note?: string,
): Promise<ReviewResult> {
  const adminId = await requireAdminId()
  if (!adminId) return { error: 'Forbidden.' }

  const parsed = profileChangeReviewSchema.safeParse({ requestId, note })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const loaded = await loadPendingRequest(parsed.data.requestId)
  if ('error' in loaded) return { error: loaded.error }
  const { supabase, req } = loaded
  const now = new Date().toISOString()

  // 1. Apply the requested values to the coordinator's profile. The admin
  //    JWT satisfies profiles_update_own_or_admin; role/id are untouched so
  //    no escalation or reassignment is possible through this path.
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: req.requested_full_name,
      contact_email: req.requested_contact_email,
      university_id: req.requested_university_id,
      erasmus_code: req.requested_erasmus_code,
      updated_at: now,
    })
    .eq('id', req.coordinator_id)
  if (profileError) {
    console.error('[approveProfileChange] profile error:', profileError.message)
    return { error: 'Failed to update the profile. Please try again.' }
  }

  // 2. Mark the request approved (kept as decision history).
  const { error: statusError } = await supabase
    .from('coordinator_profile_change_requests')
    .update({
      status: 'approved',
      admin_note: parsed.data.note ?? null,
      reviewed_by: adminId,
      reviewed_at: now,
      updated_at: now,
    })
    .eq('id', req.id)
  if (statusError) {
    console.error('[approveProfileChange] status error:', statusError.message)
    return { error: 'Profile updated, but the request status could not be saved.' }
  }

  revalidateInbox()
  revalidatePath('/dashboard/settings')

  try {
    await sendEmail(req.requested_contact_email, {
      template: 'profile-change-approved',
      props: {
        coordinatorName: req.requested_full_name,
        adminNote: parsed.data.note ?? '',
      },
    })
  } catch (err) {
    console.error('[approveProfileChange] email send failed (non-blocking):', err)
  }

  return { success: true }
}

export async function declineProfileChangeRequestAction(
  requestId: string,
  note?: string,
): Promise<ReviewResult> {
  const adminId = await requireAdminId()
  if (!adminId) return { error: 'Forbidden.' }

  const parsed = profileChangeReviewSchema.safeParse({ requestId, note })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const loaded = await loadPendingRequest(parsed.data.requestId)
  if ('error' in loaded) return { error: loaded.error }
  const { supabase, req } = loaded
  const now = new Date().toISOString()

  // Profiles row stays untouched — decline only records the verdict + note.
  const { error: statusError } = await supabase
    .from('coordinator_profile_change_requests')
    .update({
      status: 'declined',
      admin_note: parsed.data.note ?? null,
      reviewed_by: adminId,
      reviewed_at: now,
      updated_at: now,
    })
    .eq('id', req.id)
  if (statusError) {
    console.error('[declineProfileChange] status error:', statusError.message)
    return { error: 'Failed to update the request. Please try again.' }
  }

  revalidateInbox()
  revalidatePath('/dashboard/settings')

  try {
    await sendEmail(req.requested_contact_email, {
      template: 'profile-change-declined',
      props: {
        coordinatorName: req.requested_full_name,
        adminNote: parsed.data.note ?? '',
      },
    })
  } catch (err) {
    console.error('[declineProfileChange] email send failed (non-blocking):', err)
  }

  return { success: true }
}

/**
 * Delete a DECIDED data-change request (admin cleanup).
 *
 * Decided-only guard: pending rows are the live queue — Decline (which
 * emails the coordinator the admin note) is the way to clear those, never
 * silent deletion.
 *
 * Safe to delete: the verdict was already applied (approved) or recorded as
 * no-op (declined), and the audit trail survives in activity_log snapshots
 * + the admin history tabs.
 */
export async function deleteProfileChangeRequestAction(
  requestId: string,
): Promise<ReviewResult> {
  const adminId = await requireAdminId()
  if (!adminId) return { error: 'Forbidden.' }
  if (!requestId) return { error: 'Missing request.' }

  // Service-role delete (see module contract above): the row is re-read and
  // must be decided — a forged pending id lands on the guard, never the
  // delete.
  const admin = createAdminClient()
  const { data: req, error: fetchError } = await admin
    .from('coordinator_profile_change_requests')
    .select('id, status')
    .eq('id', requestId)
    .maybeSingle()
  if (fetchError || !req) {
    console.error('[deleteProfileChange] fetch error:', fetchError?.message)
    return { error: 'Request not found.' }
  }
  if ((req as { status?: string }).status === 'pending') {
    return { error: 'Only decided requests can be deleted. Decline it first to notify the coordinator.' }
  }

  const { error: deleteError } = await admin
    .from('coordinator_profile_change_requests')
    .delete()
    .eq('id', requestId)
  if (deleteError) {
    console.error('[deleteProfileChange] delete error:', deleteError.message)
    return { error: 'Failed to delete the request. Please try again.' }
  }

  revalidateInbox()
  return { success: true }
}
