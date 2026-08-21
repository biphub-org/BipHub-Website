import { StickyNav } from '@/components/home/StickyNav'
import { Footer } from '@/components/home/Footer'
import { Toaster } from '@/components/ui/sonner'
import { createClient } from '@/lib/supabase/server'

/**
 * Public route-group layout — wraps all pages in the (public) group
 * with the StickyNav and Footer chrome.
 *
 * Routes in scope: /, /bips, /bip/[slug]
 *
 * The skip-link provides keyboard users a shortcut past the nav (FOUN-03).
 * INFO-03 compliance: Footer renders the mandatory EC disclaimer on every page.
 *
 * Toaster (Plan 01-07): single Sonner instance for the entire public route group.
 * Used by ShareButton's clipboard-fallback confirmation toast.
 *
 * Phase 2 addition (D-15): fetch session claims server-side via getClaims() and
 * pass `hasClaims` + `initials` to <StickyNav> so the nav adapts without a
 * client-side flash. Single profile fetch (.maybeSingle()) avoids throwing for
 * coordinators who just signed up but have not completed onboarding yet.
 *
 * Initials derivation:
 *   1. profiles.full_name → first letter of first two words.
 *   2. fallback to first two chars of email local part.
 *   3. "··" if neither is available (defensive; distinct from "??" so QA can
 *      verify the fallback fires).
 */
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  // CRITICAL: getClaims() validates the JWT signature; the unvalidated session
  // reader is forbidden per CLAUDE.md.
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims ?? null

  let initials: string | null = null
  const hasClaims = Boolean(claims)
  const role = (claims as unknown as { app_metadata?: { role?: string } } | null)?.app_metadata?.role ?? null
  const dashboardHref = role === 'admin' ? '/admin' : role === 'student' ? '/student-dashboard' : '/dashboard'

  if (claims?.sub) {
    // Profile name first; fall back to email.
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', claims.sub)
      .maybeSingle()

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

    initials = fromName || fromEmail || '··'
  }

  return (
    <>
      <a href="#main" className="skip-link">Skip to main content</a>
      <StickyNav hasClaims={hasClaims} initials={initials} dashboardHref={dashboardHref} dashboardLabel={role === 'admin' ? 'Admin' : 'Dashboard'} />
      <main id="main" className="min-h-[calc(100vh-68px)]">
        {children}
      </main>
      <Footer />
      <Toaster
        position="bottom-right"
        richColors={false}
        closeButton
      />
    </>
  )
}
