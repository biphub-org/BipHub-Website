import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Forced sign-out — clears session cookies server-side, then lands on /login.
 *
 * Used by the (student) layout guard when the session's Auth user no longer
 * exists (e.g. admin-deleted while signed in): a Server Component cannot
 * clear cookies itself, so the layout redirects here and this Route Handler
 * performs the signOut (cookie writes ARE allowed here). Without it, the
 * stale-but-valid-signature JWT would bounce straight back into the app.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export async function GET() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  console.log('[auth/force-signout] cleared stale session')
  return NextResponse.redirect(`${SITE_URL}/login`)
}
