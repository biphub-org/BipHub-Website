import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { Toaster } from '@/components/ui/sonner'
import { DashboardNav } from '@/components/dashboard/DashboardNav'

/**
 * Dashboard route-group layout (AUTH-07 / D-05 / D-12).
 *
 * Two-stage server-side guard:
 *
 *   1. Auth guard — defense-in-depth. Plan 02-03 middleware already redirects
 *      unauthenticated requests to /login, but we re-check here so an attacker
 *      who somehow bypasses the matcher cannot reach a dashboard RSC.
 *      Uses getClaims() (validates JWT signature) — the unvalidated session
 *      reader is forbidden per CLAUDE.md.
 *
 *   2. Profile-complete gate — D-05. If the coordinator's profiles row is
 *      missing required fields AND we are NOT already on /onboarding, redirect
 *      there. The /onboarding exemption uses the `x-pathname` header injected
 *      by Plan 02-03 middleware — this defeats the infinite-redirect loop
 *      pitfall (PITFALLS Pitfall 2).
 *
 * Profile-complete definition (D-05 + UI-SPEC):
 *   full_name && university_id && contact_email && erasmus_code
 *   (country is implied by `universities.country`; not stored on profiles).
 *
 * Layout chrome (D-12 / INFO-03):
 *   - <DashboardNav>: logo + breadcrumb + initials + Sign out form. RSC.
 *   - INFO-03 disclaimer rendered inline (no public Footer in dashboard).
 *   - Toaster instance scoped to this route group.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // (1) Auth guard.
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) redirect('/login')
  const claims = data.claims
  const role = (claims as unknown as { app_metadata?: { role?: string } })?.app_metadata?.role
  if (role === 'admin') redirect('/admin')

  // (2) Profile-complete gate.
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''
  const isOnboarding = pathname.startsWith('/onboarding')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, university_id, contact_email, erasmus_code')
    .eq('id', claims.sub)
    .maybeSingle()

  const isComplete = Boolean(
    profile?.full_name &&
      profile?.university_id &&
      profile?.contact_email &&
      profile?.erasmus_code,
  )

  if (!isComplete && !isOnboarding) {
    redirect('/onboarding')
  }

  // Initials derivation: full_name → email local-part → "··" sentinel.
  const fromName = profile?.full_name
    ? profile.full_name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
    : null
  const emailLocal =
    typeof claims.email === 'string' ? claims.email.split('@')[0] : null
  const fromEmail = emailLocal ? emailLocal.slice(0, 2).toUpperCase() : null
  const initials = fromName || fromEmail || '··'

  return (
    <div className="min-h-screen bg-bg-soft">
      <DashboardNav initials={initials} fullName={profile?.full_name ?? ''} />
      <main className="mx-auto max-w-[1200px] px-4 md:px-6">{children}</main>
      <p className="mx-auto max-w-[1200px] px-4 md:px-6 py-8 text-[11px] text-muted">
        Independent project — not affiliated with the European Commission
      </p>
      <Toaster position="bottom-right" richColors={false} closeButton />
    </div>
  )
}
