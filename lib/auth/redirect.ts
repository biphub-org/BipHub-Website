import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Already-authenticated bounce for the sign-in/register pages.
 *
 * A signed-in user must never see /login or /register* (typing the URL
 * directly included). Call at the top of those RSC pages — getClaims()
 * validates the JWT signature server-side (CLAUDE.md never-do: never the
 * unvalidated session reader).
 *
 * Mirrors the middleware (3c) defense-in-depth branch, which only fires if
 * the matcher is ever expanded to cover the auth routes (today they are
 * excluded to avoid the post-login redirect loop, so the page-level guard
 * is the enforcing layer).
 */
export function dashboardForRole(
  role: string | undefined,
): '/student-dashboard' | '/admin' | '/dashboard' {
  if (role === 'student') return '/student-dashboard'
  if (role === 'admin') return '/admin'
  return '/dashboard'
}

export async function redirectIfSignedIn(): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) return
  const role = (data.claims as { app_metadata?: { role?: string } })
    .app_metadata?.role
  redirect(dashboardForRole(role))
}
