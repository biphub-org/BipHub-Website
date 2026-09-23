'use server'

/**
 * Coordinator access-request review actions (admin only).
 *
 * Lives under app/(admin)/ because approving an account needs the
 * service-role client (auth.admin.inviteUserByEmail + profiles upsert).
 * Importing createAdminClient anywhere else is an eslint error
 * (CLAUDE.md never-do; PITFALLS Pitfall 7).
 *
 * Approve: creates the auth account and sends the Supabase invite email —
 * the link lands on /auth/callback?type=invite, which routes to
 * /reset-password/update where the coordinator sets their initial password.
 * The request's details are materialised into profiles so the coordinator
 * lands on /dashboard ready to work on first sign-in.
 *
 * Reject: marks the request rejected and emails the decision notice to the
 * requester (the /login status lookup remains as a fallback).
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import {
  findUserByEmail,
  isInviteAlreadyExistsError,
  shouldAdoptExistingAccount,
} from '@/lib/auth/coordinator-approve'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

type ReviewResult = { error?: string; success?: true }

/** Defense-in-depth: the (admin) layout already guards, re-check here. */
async function requireAdminId(): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) return null
  const role = (data.claims as { app_metadata?: { role?: string } }).app_metadata
    ?.role
  if (role !== 'admin') return null
  return data.claims.sub
}

export async function approveCoordinatorRequestAction(
  requestId: string,
): Promise<ReviewResult> {
  const adminId = await requireAdminId()
  if (!adminId) return { error: 'Forbidden.' }
  if (!requestId) return { error: 'Missing request.' }

  const admin = createAdminClient()
  const { data: req, error: fetchError } = await admin
    .from('coordinator_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle()
  if (fetchError || !req) {
    console.error('[approveCoordinatorRequest] fetch error:', fetchError?.message)
    return { error: 'Request not found.' }
  }
  if (req.status !== 'pending') {
    return { error: `This request is already ${req.status}.` }
  }

  // Creates the auth user (handle_new_user materialises the bare coordinator
  // profiles row) and dispatches the set-password invite through the
  // Supabase mailer (Inbucket locally; configured SMTP in production).
  const { data: invited, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(req.email, {
      // full_name personalises the invite email template (.Data.full_name);
      // role drives handle_new_user. Neither is trusted downstream — the
      // profile row is upserted from the request details in completeApproval.
      data: { role: 'coordinator', full_name: req.full_name },
      redirectTo: `${SITE_URL}/auth/callback?type=invite`,
    })
  if (inviteError || !invited.user) {
    // Retry-safety: the first attempt may have created the account and then
    // failed before marking the request approved (status update, profile
    // upsert, crash). The retry's invite then fails with "already exists" —
    // adopt that account and complete the approval instead of stranding the
    // request in `pending` forever.
    if (isInviteAlreadyExistsError(inviteError?.message)) {
      return tryAdoptExistingAccount(admin, requestId, adminId, req)
    }
    console.error('[approveCoordinatorRequest] invite error:', inviteError?.message)
    return { error: 'Failed to create the account. Please try again.' }
  }

  return completeApproval(admin, requestId, adminId, req, invited.user.id)
}

export async function rejectCoordinatorRequestAction(
  requestId: string,
): Promise<ReviewResult> {
  const adminId = await requireAdminId()
  if (!adminId) return { error: 'Forbidden.' }
  if (!requestId) return { error: 'Missing request.' }

  const admin = createAdminClient()
  const { data: req, error: fetchError } = await admin
    .from('coordinator_requests')
    .select('id, status, email, full_name')
    .eq('id', requestId)
    .maybeSingle()
  if (fetchError || !req) {
    console.error('[rejectCoordinatorRequest] fetch error:', fetchError?.message)
    return { error: 'Request not found.' }
  }
  if (req.status !== 'pending') {
    return { error: `This request is already ${req.status}.` }
  }

  const now = new Date().toISOString()
  const { error: statusError } = await admin
    .from('coordinator_requests')
    .update({ status: 'rejected', reviewed_by: adminId, reviewed_at: now, updated_at: now })
    .eq('id', requestId)
  if (statusError) {
    console.error('[rejectCoordinatorRequest] status error:', statusError.message)
    return { error: 'Failed to update the request. Please try again.' }
  }

  // Decision notice to the requester (fire-and-forget per D-11: the status
  // already committed, email failure never rolls it back). Previously a
  // rejection was silent — the requester only discovered it on sign-in.
  if (req.email) {
    try {
      await sendEmail(req.email, {
        template: 'coordinator-request-rejected',
        props: { fullName: req.full_name ?? '' },
      })
    } catch (err) {
      console.error('[rejectCoordinatorRequest] email send failed (non-blocking):', err)
    }
  }

  revalidatePath('/admin/coordinators/requests')
  revalidatePath('/admin/coordinators')
  return { success: true }
}

/**
 * Delete a DECIDED access request (admin cleanup).
 *
 * Decided-only guard: pending rows are the live queue — Reject (which emails
 * the requester) is the way to clear those, never silent deletion.
 *
 * Safe to delete: nothing references coordinator_requests (no inbound FKs);
 * the audit trail survives in activity_log snapshots + the admin history
 * tabs. Side effect to know: deleting a rejected request means the address
 * resolves to 'unknown' on /login (instead of "not approved") and the
 * requester may file a fresh request. Approved rows are safe — the account
 * already exists, so sign-in keeps working.
 */
export async function deleteCoordinatorRequestAction(
  requestId: string,
): Promise<ReviewResult> {
  const adminId = await requireAdminId()
  if (!adminId) return { error: 'Forbidden.' }
  if (!requestId) return { error: 'Missing request.' }

  const admin = createAdminClient()
  const { data: req, error: fetchError } = await admin
    .from('coordinator_requests')
    .select('id, status')
    .eq('id', requestId)
    .maybeSingle()
  if (fetchError || !req) {
    console.error('[deleteCoordinatorRequest] fetch error:', fetchError?.message)
    return { error: 'Request not found.' }
  }
  if (req.status === 'pending') {
    return { error: 'Only decided requests can be deleted. Reject it first to notify the requester.' }
  }

  const { error: deleteError } = await admin
    .from('coordinator_requests')
    .delete()
    .eq('id', requestId)
  if (deleteError) {
    console.error('[deleteCoordinatorRequest] delete error:', deleteError.message)
    return { error: 'Failed to delete the request. Please try again.' }
  }

  revalidatePath('/admin/coordinators/requests')
  revalidatePath('/admin/coordinators')
  return { success: true }
}

type AdminClient = ReturnType<typeof createAdminClient>

type CoordinatorRequestDetails = {
  email: string
  full_name: string
  university_id: string | null
  erasmus_code: string | null
}

/**
 * Shared finish for both approve paths: mark the request approved, backfill
 * the coordinator profile from the request details, revalidate the inbox.
 */
async function completeApproval(
  admin: AdminClient,
  requestId: string,
  adminId: string,
  req: CoordinatorRequestDetails,
  userId: string,
): Promise<ReviewResult> {
  const now = new Date().toISOString()
  const { error: statusError } = await admin
    .from('coordinator_requests')
    .update({ status: 'approved', reviewed_by: adminId, reviewed_at: now, updated_at: now })
    .eq('id', requestId)
  if (statusError) {
    console.error('[approveCoordinatorRequest] status error:', statusError.message)
    return { error: 'Account created, but the request status could not be updated.' }
  }

  // Fill in the coordinator profile from the request details so the
  // dashboard profile-complete gate passes on first sign-in. The request's
  // single email becomes the profile contact email. Best-effort: the
  // request is already approved, so a failure here only logs — the
  // coordinator sees an actionable error at submit time.
  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: userId,
      full_name: req.full_name,
      contact_email: req.email,
      university_id: req.university_id,
      erasmus_code: req.erasmus_code,
      role: 'coordinator',
    },
    { onConflict: 'id' },
  )
  if (profileError) {
    console.error('[approveCoordinatorRequest] profile error:', profileError.message)
  }

  revalidatePath('/admin/coordinators/requests')
  revalidatePath('/admin/coordinators')
  return { success: true }
}

/** Paginated lookup of an auth user id by email (listUsers has no filter). */
async function findAuthUserIdByEmail(
  admin: AdminClient,
  email: string,
): Promise<string | null> {
  const perPage = 100
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    })
    if (error || !data) {
      console.error('[approveCoordinatorRequest] adopt list error:', error?.message)
      return null
    }
    const match = findUserByEmail(data.users, email)
    if (match) return match.id
    if (data.users.length < perPage) break
  }
  return null
}

/**
 * Already-exists retry path: adopt the existing account when it is a
 * coordinator (i.e. the first approve attempt created it) and complete the
 * approval. Any other role — student, admin, missing — is refused so a
 * retry can never hijack an unrelated account.
 */
async function tryAdoptExistingAccount(
  admin: AdminClient,
  requestId: string,
  adminId: string,
  req: CoordinatorRequestDetails,
): Promise<ReviewResult> {
  const userId = await findAuthUserIdByEmail(admin, req.email)
  if (!userId) {
    console.error('[approveCoordinatorRequest] adopt: no auth user for', req.email)
    return { error: 'An account with this email already exists.' }
  }

  const { data: profile, error: profileFetchError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  if (profileFetchError || !shouldAdoptExistingAccount(profile?.role)) {
    console.error(
      '[approveCoordinatorRequest] adopt refused: role=',
      profile?.role ?? null,
    )
    return { error: 'An account with this email already exists.' }
  }

  // The invite email went out on the first attempt; nothing to re-send.
  // Approving here unblocks the coordinator at the already-sent link.
  return completeApproval(admin, requestId, adminId, req, userId)
}
