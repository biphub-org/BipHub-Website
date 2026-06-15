import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { signOutStudentAction } from '@/lib/actions/auth'

/**
 * /student-dashboard — D-14 minimal-but-real shell (STUD-03 / 05-UI-SPEC Surface 2).
 *
 * The (student)/layout.tsx already validated auth + role; this page handles content.
 * It re-calls createClient() + getClaims() to read the email (JWT claim) and fetches
 * profiles.full_name for the greeting (may be NULL for student profiles).
 *
 * Structure:
 *   1. Welcome section — h1 greeting + "Signed in as {email}" sub-line
 *   2. Account card — email + secondary Sign out
 *   3. Explore card — "Browse Erasmus+ BIPs" + "Browse BIPs →" CTA
 *   4. Coming-soon plain paragraph (no Card wrapper, no placeholder cards)
 *
 * NO Saved-BIPs or Alerts placeholder cards (deferred to Phase 6/7 per D-14).
 */

export const metadata: Metadata = {
  title: 'Student dashboard · BipHub',
}

export default async function StudentDashboardPage() {
  const supabase = await createClient()

  // Re-read claims for email (layout already validated auth + role; this is
  // a content read, not an auth check — layout is the authoritative guard).
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims
  const email = typeof claims?.email === 'string' ? claims.email : ''

  // Fetch profiles.full_name for the greeting. Students have full_name = NULL
  // in Phase 5 (no student profile completion flow), so the greeting falls
  // back to "Welcome back" without a name component.
  let firstName: string | null = null
  if (claims?.sub) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', claims.sub)
      .maybeSingle()

    if (profile?.full_name) {
      // Extract the first word of full_name (UI-SPEC welcome logic)
      firstName = profile.full_name.trim().split(/\s+/)[0] ?? null
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* 1. Welcome section */}
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.3px] text-ink">
          {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
        </h1>
        <p className="mt-1 text-sm text-muted">Signed in as {email}</p>
      </div>

      {/* 2. Account card */}
      <div className="rounded-lg border border-border bg-white shadow-sm p-6 flex flex-col gap-3">
        <h2 className="text-base font-semibold text-ink">Account</h2>
        <p className="text-sm text-ink-2">{email}</p>
        <form action={signOutStudentAction}>
          <button
            type="submit"
            aria-label="Sign out of BipHub"
            className="text-sm text-muted hover:text-ink p-2 -m-2 min-h-[44px] inline-flex items-center"
          >
            Sign out
          </button>
        </form>
      </div>

      {/* 3. Explore card */}
      <div className="rounded-lg border border-border bg-white shadow-sm p-6 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-ink">Browse Erasmus+ BIPs</h2>
        <p className="text-sm text-muted">
          Discover programmes matched to your field and availability.
        </p>
        <div>
          <Button asChild variant="primary" size="md">
            <Link href="/bips">Browse BIPs →</Link>
          </Button>
        </div>
      </div>

      {/* 4. Coming-soon plain paragraph — NO Card wrapper, no icon, no badge (D-14) */}
      <p className="text-sm text-muted mt-0">
        Saved BIPs and alert subscriptions are coming in a future update.
      </p>
    </div>
  )
}
