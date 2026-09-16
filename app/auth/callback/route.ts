import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { backfillStudentProfileFromMetadata } from '@/lib/auth/student-profile'

/**
 * Email verification + recovery callback.
 *
 * Supports TWO link formats:
 *
 *   1. Token-hash (OTP) — `?token_hash=...&type=...` → `verifyOtp()`.
 *      DEVICE-INDEPENDENT: the whole token travels in the link, so NO PKCE
 *      code_verifier cookie is required. A user can confirm from a different
 *      browser/device than the one they signed up on (sign up on a laptop,
 *      click the email on a phone). This is the format the "Confirm signup"
 *      email template should use:
 *        {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup
 *
 *   2. PKCE code — `?code=...` → `exchangeCodeForSession()`.
 *      SAME-BROWSER ONLY (needs the code_verifier cookie set at signup). Retained
 *      for backward compatibility and for any flow still issuing a `?code=` link
 *      (password recovery + student magic link, until their templates migrate).
 *
 * Routing contract (by `type`):
 *   - signup verification (type=signup / none) → role-aware: students (with
 *     profile materialised from user_metadata; signInAction backfills as a
 *     safety net for link formats that never reach this callback) →
 *     /student-dashboard, coordinators → /onboarding (D-07)
 *   - password recovery   (type=recovery)      → /reset-password/update
 *   - coordinator invite  (type=invite)        → /reset-password/update
 *     (set the initial password for the approved account)
 *   - student magic link  (type=magiclink)     → /student-dashboard (D-04)
 *   - failure / missing token                  → /login?error=verification_failed
 *                                              → /register/student?error=expired (magiclink)
 *
 * Open-redirect safety (T-02-02-10 / T-05-08): the destination is built from the
 * server-controlled `NEXT_PUBLIC_SITE_URL` plus a hard-coded path; `type` selects
 * among a fixed set of destinations — user-supplied query strings cannot inject an
 * arbitrary host.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  // Failure destination: student magic-link stays on its own friendly entry page;
  // everything else surfaces on /login with a sanitized reason hint.
  const failDest = (reason: string) =>
    type === 'magiclink'
      ? `${SITE_URL}/register/student?error=expired`
      : `${SITE_URL}/login?error=verification_failed&reason=${encodeURIComponent(reason).slice(0, 120)}`

  if (!code && !tokenHash) {
    console.error('[auth/callback] no code or token_hash in querystring')
    return NextResponse.redirect(failDest('no_token'))
  }

  const supabase = await createClient()

  let error
  const method = tokenHash ? 'verifyOtp' : 'exchangeCodeForSession'
  if (tokenHash) {
    // Token-hash (OTP) verification — no code_verifier cookie needed.
    // `type` selects the OTP kind (signup / recovery / magiclink / email_change);
    // default to 'email' which covers a plain signup confirmation.
    const otpType = (type ?? 'email') as EmailOtpType
    ;({ error } = await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash }))
  } else {
    // PKCE code exchange (same-browser). Guarded by the check above, so `code`
    // is non-null here.
    ;({ error } = await supabase.auth.exchangeCodeForSession(code as string))
  }

  if (error) {
    // Surface the real Supabase error to Vercel logs + a sanitized hint to the URL.
    // Common token-hash failure: expired/already-used link. Common PKCE failure:
    // missing code_verifier cookie (email clicked in a different browser/device).
    console.error('[auth/callback] verification failed:', {
      method,
      type: type ?? null,
      status: error.status,
      name: error.name,
      message: error.message,
    })
    return NextResponse.redirect(failDest(error.message ?? 'verification_failed'))
  }

  console.log('[auth/callback] verified:', { method, type: type ?? null })

  if (type === 'recovery' || type === 'invite') {
    return NextResponse.redirect(`${SITE_URL}/reset-password/update`)
  }
  if (type === 'magiclink') {
    return NextResponse.redirect(`${SITE_URL}/student-dashboard`)
  }

  // Signup verification (type=signup / email / none): students land on their
  // dashboard with the registration details materialised; coordinators
  // continue to onboarding to complete their profile (D-07).
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims as
    | { sub?: string; app_metadata?: { role?: string } }
    | undefined
  if (claims?.sub && claims?.app_metadata?.role === 'student') {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (user) {
      const status = await backfillStudentProfileFromMetadata(
        supabase,
        user.id,
        user.email ?? null,
        (user.user_metadata ?? {}) as Record<string, unknown>,
      )
      console.log('[auth/callback] student backfill:', status)
    } else {
      console.log('[auth/callback] student backfill skipped: no user after verify')
    }
    return NextResponse.redirect(`${SITE_URL}/student-dashboard`)
  }

  console.log(
    '[auth/callback] non-student signup, role:',
    claims?.app_metadata?.role ?? null,
  )
  return NextResponse.redirect(`${SITE_URL}/onboarding`)
}
