import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * PKCE code-exchange handler.
 *
 * Called by Supabase verification + recovery emails. The link contains a one-time
 * `code` plus an optional `type` discriminator (we use `type=recovery` for password
 * reset; `type=magiclink` for student magic-link sign-in; signup verification carries
 * no `type`).
 *
 * Routing contract:
 *   - signup verification (no type)        → /onboarding (D-07)
 *   - password recovery  (type=recovery)   → /reset-password/update
 *   - student magic link (type=magiclink)  → /student-dashboard (D-04)
 *   - exchange failure / missing code      → /login?error=verification_failed (non-student)
 *                                         → /register/student?error=expired (type=magiclink)
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
  const type = searchParams.get('type')

  if (!code) {
    console.error('[auth/callback] no code in querystring')
    const errDest = type === 'magiclink'
      ? `${SITE_URL}/register/student?error=expired`
      : `${SITE_URL}/login?error=verification_failed&reason=no_code`
    return NextResponse.redirect(errDest)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    // Surface the real Supabase error to Vercel logs + a sanitized hint to the URL.
    // Most common: missing code_verifier cookie (signup happened in a different
    // browser/profile than the one that clicked the email link).
    console.error('[auth/callback] exchangeCodeForSession failed:', {
      status: error.status,
      name: error.name,
      message: error.message,
    })
    if (type === 'magiclink') {
      // STUD-01 / SC-2: student stale link → friendly expired state on the entry page
      return NextResponse.redirect(`${SITE_URL}/register/student?error=expired`)
    }
    const reason = encodeURIComponent(error.message ?? 'exchange_failed').slice(0, 120)
    return NextResponse.redirect(`${SITE_URL}/login?error=verification_failed&reason=${reason}`)
  }

  const destination =
    type === 'recovery'    ? `${SITE_URL}/reset-password/update`
    : type === 'magiclink' ? `${SITE_URL}/student-dashboard`
                           : `${SITE_URL}/onboarding`
  return NextResponse.redirect(destination)
}
