import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
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
 * Profile-complete gate: students registered before personal details existed
 * have empty profiles. If full_name or country is missing AND we are NOT
 * already on /student-dashboard/complete-profile, redirect there. The path
 * exemption uses the `x-pathname` header (same pattern as the coordinator
 * /onboarding exemption in (dashboard)/layout.tsx) to avoid a redirect loop.
 * Home university stays optional by design — it is NOT part of completeness.
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

  // Profile-complete gate — students with no full_name or country finish
  // /student-dashboard/complete-profile first. Exempt that path via the
  // x-pathname header (mirrors the coordinator /onboarding exemption).
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''
  const isCompletionPage = pathname.startsWith('/student-dashboard/complete-profile')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, country')
    .eq('id', claims.sub)
    .maybeSingle()

  const studentProfile = (profile ?? {}) as {
    full_name?: string | null
    country?: string | null
  }
  const isComplete = Boolean(studentProfile.full_name && studentProfile.country)

  if (!isComplete && !isCompletionPage) {
    redirect('/student-dashboard/complete-profile')
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
