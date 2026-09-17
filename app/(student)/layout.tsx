import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Toaster } from '@/components/ui/sonner'
import { StudentNav } from '@/components/student/StudentNav'

/**
 * (student) route-group layout — D-10 / STUD-03 / 05-UI-SPEC Surface 2.
 *
 * Layer 2 of the student route guard:
 *   - Layer 1: middleware.ts (3d) block — redirects unauthenticated + non-student
 *     at the edge. Implemented in Plan 05-02.
 *   - Layer 2 (this file): RSC re-checks getClaims() + role === 'student'.
 *     Defense-in-depth against middleware misconfiguration (D-10).
 *   - Layer 3: RLS — bips INSERT policy requires coordinator/admin role in JWT.
 *
 * Auth: getClaims() validates JWT signature (CLAUDE.md compliance — the
 * unvalidated session reader is forbidden server-side).
 *
 * No profile-complete gate: every student reaches the dashboard with whatever
 * profile data exists. Password registration plus the /auth/callback and
 * first-sign-in backfills fill it for new accounts; legacy and admin-created
 * rows may stay bare. Home university stays optional by design.
 *
 * Chrome (05-UI-SPEC.md Surface 2):
 *   - StudentNav: h-16 bar with logo, initials, sign-out.
 *   - EC disclaimer footer (CLAUDE.md never-do compliance).
 *   - Toaster scoped to the route group.
 */
export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // (1) Auth guard — defense-in-depth (middleware already redirected unauthenticated).
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) redirect('/register/student')
  const claims = data.claims

  // (2) Role guard — mirrors admin layout pattern (D-10).
  // Routes non-students to their correct home rather than a generic 403.
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role !== 'student') {
    redirect(
      role === 'admin' ? '/admin' : role === 'coordinator' ? '/dashboard' : '/register/student',
    )
  }

  // Deleted-user kick: getClaims() validates the JWT signature locally, so an
  // admin-deleted Auth user keeps a valid JWT until expiry — and the profiles
  // row cascades on delete, so a missing row is the anomaly signal. Confirm
  // authoritatively (one extra call, only on this rare path): if GoTrue no
  // longer knows the user, clear cookies via /auth/force-signout (an RSC
  // cannot clear cookies itself) instead of rendering a ghost session.
  const { data: selfProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', claims.sub)
    .maybeSingle()
  if (!selfProfile) {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) {
      console.log('[student layout] session user no longer exists; forcing sign-out')
      redirect('/auth/force-signout')
    }
  }

  // Extract email for the nav initials avatar.
  const email = typeof claims.email === 'string' ? claims.email : ''

  return (
    <div className="min-h-screen bg-bg-soft">
      <StudentNav email={email} />
      <main className="mx-auto max-w-[960px] px-4 md:px-6 py-12">{children}</main>
      {/* CLAUDE.md never-do: EC disclaimer must appear on every page */}
      <p className="mx-auto max-w-[960px] px-4 md:px-6 py-8 text-[11px] text-muted">
        Independent project — not affiliated with the European Commission
      </p>
      <Toaster position="bottom-right" richColors={false} closeButton />
    </div>
  )
}
