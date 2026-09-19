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
 * Reject: marks the request rejected. The requester learns the outcome the
 * next time they enter their email on /login (resolve_login_method returns
 * the latest request status).
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
      data: { role: 'coordinator' },
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
    .select('id, status')
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
