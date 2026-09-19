'use server'

/**
 * Coordinator access-request Server Action (public — no session required).
 *
 * A prospective coordinator submits their details + login email.
 * The row lands in `coordinator_requests` (migration 00054) for admin
 * review; NO auth account is created here, so there is deliberately no
 * session establishment and no redirect-to-dashboard.
 *
 * Guards:
 *   - Zod validation (coordinatorRequestSchema) server-side.
 *   - `resolve_login_method` RPC (anon-callable, SECURITY DEFINER): an email
 *     that already owns an account is sent to sign-in instead; an email with
 *     a live pending request gets the under-review message rather than a
 *     duplicate row (the partial unique index enforces the same invariant at
 *     the DB level — 23505 is mapped to the same message).
 *   - University existence is re-checked (public read policy allows it).
 */

import { createClient } from '@/lib/supabase/server'
import { coordinatorRequestSchema } from '@/lib/schemas/coordinator-request'
import { sendEmail } from '@/lib/email/send'

export async function submitCoordinatorRequestAction(
  formData: FormData,
): Promise<{ error?: string; success?: true }> {
  const parsed = coordinatorRequestSchema.safeParse({
    email: formData.get('email'),
    full_name: formData.get('full_name'),
    university_id: formData.get('university_id'),
    country: formData.get('country'),
    erasmus_code: formData.get('erasmus_code'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const supabase = await createClient()

  const { data: existing, error: rpcError } = await supabase.rpc(
    'resolve_login_method',
    { p_email: parsed.data.email },
  )
  if (rpcError) {
    console.error('[submitCoordinatorRequestAction] rpc error:', rpcError.message)
    return { error: 'Something went wrong. Please try again.' }
  }
  const method = existing as string | null
  if (method === 'student' || method === 'coordinator' || method === 'admin') {
    return { error: 'An account with this email already exists. Sign in instead?' }
  }
  if (method === 'pending') {
    return {
      error:
        'Your submission is already under review. We will email you once a decision is made.',
    }
  }

  const { data: uni } = await supabase
    .from('universities')
    .select('id')
    .eq('id', parsed.data.university_id)
    .maybeSingle()
  if (!uni) {
    return { error: 'The selected university is no longer available. Please choose another.' }
  }

  const { error } = await supabase.from('coordinator_requests').insert({
    email: parsed.data.email,
    full_name: parsed.data.full_name,
    university_id: parsed.data.university_id,
    country: parsed.data.country,
    erasmus_code: parsed.data.erasmus_code,
  })
  if (error) {
    // Partial unique index (one pending request per email): a double submit
    // or a re-file while the first is still live lands here.
    if (error.code === '23505') {
      return {
        error:
          'Your submission is already under review. We will email you once a decision is made.',
      }
    }
    console.error('[submitCoordinatorRequestAction] supabase error:', error.message)
    return { error: 'Something went wrong. Please try again.' }
  }

  // Post-insert courtesy emails (fire-and-forget per D-11): the request
  // row already committed above, so email failures are logged but never
  // roll back the submission.
  //
  // 1. Confirmation to the requester's email — the address reachable
  //    while the request is under review.
  try {
    await sendEmail(parsed.data.email, {
      template: 'coordinator-request-received',
      props: { fullName: parsed.data.full_name },
    })
  } catch (err) {
    console.error(
      '[submitCoordinatorRequestAction] requester confirmation email failed (non-blocking):',
      err,
    )
  }

  // 2. Admin notification so the inbox doesn't sit unseen. Recipient is
  //    server-side (ADMIN_NOTIFICATION_EMAIL) — the requester cannot
  //    influence it. When unset we warn and continue (same contract as
  //    submitBipAction's ADMN-11 notification).
  const adminRecipient = process.env.ADMIN_NOTIFICATION_EMAIL
  if (adminRecipient) {
    try {
      // Courtesy fetch for the email body — failure must NOT block the
      // already-committed submission; the template renders fallbacks.
      let universityName = ''
      const { data: uniRow } = await supabase
        .from('universities')
        .select('name')
        .eq('id', parsed.data.university_id)
        .maybeSingle()
      if (uniRow) universityName = (uniRow as { name?: string }).name ?? ''

      await sendEmail(adminRecipient, {
        template: 'coordinator-request-admin',
        props: {
          fullName: parsed.data.full_name,
          accountEmail: parsed.data.email,
          universityName,
          erasmusCode: parsed.data.erasmus_code ?? '',
          submittedAt: new Date().toISOString(),
        },
      })
    } catch (err) {
      console.error(
        '[submitCoordinatorRequestAction] admin notification email failed (non-blocking):',
        err,
      )
    }
  } else {
    console.warn(
      '[submitCoordinatorRequestAction] ADMIN_NOTIFICATION_EMAIL unset — skipping admin notification email',
    )
  }

  return { success: true }
}
