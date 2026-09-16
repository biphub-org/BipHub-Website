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
 * The request's onboarding details are materialised into profiles so the
 * dashboard profile-complete gate passes on first sign-in.
 *
 * Reject: marks the request rejected. The requester learns the outcome the
 * next time they enter their email on /login (resolve_login_method returns
 * the latest request status).
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
    const msg = (inviteError?.message ?? '').toLowerCase()
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      return { error: 'An account with this email already exists.' }
    }
    console.error('[approveCoordinatorRequest] invite error:', inviteError?.message)
    return { error: 'Failed to create the account. Please try again.' }
  }

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
  // dashboard profile-complete gate passes on first sign-in. Best-effort:
  // the request is already approved, so a failure here only logs — the
  // coordinator completes anything missing via /onboarding.
  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: invited.user.id,
      full_name: req.full_name,
      contact_email: req.contact_email,
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
