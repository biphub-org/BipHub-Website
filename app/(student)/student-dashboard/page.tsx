import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { signOutStudentAction } from '@/lib/actions/auth'
import { getSavedBipsCount } from '@/lib/queries/savedBips'
import { DeleteAccountDialog } from '@/components/dashboard/DeleteAccountDialog'
import { LegacySweepIsland } from '@/components/student/LegacySweepIsland'
import { AlertSubscriptionForm } from '@/components/student/AlertSubscriptionForm'
import { AlertSubscriptionList } from '@/components/student/AlertSubscriptionList'

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

  // Count saved BIPs for the dashboard summary card (lightweight HEAD query).
  const savedCount = claims?.sub ? await getSavedBipsCount(claims.sub) : 0

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
        {/* Delete-my-account control — verbatim DeleteAccountDialog reuse (D-04) */}
        <div className="border-t border-border mt-3 pt-3">
          <DeleteAccountDialog accountEmail={email} />
        </div>
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

      {/* 4. Saved BIPs summary card — replaces coming-soon paragraph (STUD-08 / UI-SPEC Surface 4) */}
      <div className="rounded-lg border border-border bg-white shadow-sm p-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Saved BIPs</h2>
          <Link
            href="/student-dashboard/saved"
            className="text-sm font-medium text-eu-blue hover:underline"
          >
            View all →
          </Link>
        </div>
        <p className="text-sm text-muted">
          {savedCount === 0 ? 'No saved BIPs yet.' : `${savedCount} BIP${savedCount === 1 ? '' : 's'} saved`}
        </p>
      </div>

      {/* Phase 11 — Alert subscriptions (ALRT-01/02/04/09) */}
      <div className="rounded-lg border border-border bg-white shadow-sm p-6 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-ink">Alert subscriptions</h2>
        <p className="text-sm text-muted">Get a digest when new BIPs match your field or country. Weekly by default, daily if you prefer. Up to 5 active.</p>
        {/* Server-fetched list + client form/list */}
        {/* We fetch subscriptions server-side so the page is never empty on first paint */}
        <AlertSubscriptionSection />
        <AlertSubscriptionForm />
      </div>

      {/* STUD-06 / D-02 — one-time legacy localStorage sweep; renders null */}
      <LegacySweepIsland />
    </div>
  )
}

async function AlertSubscriptionSection() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = (claimsData?.claims as any)?.sub
  if (!userId) return <p className="text-sm text-muted">Sign in to manage alerts.</p>
  const { data } = await supabase
    .from('bip_subscriptions')
    .select('id, field, country, frequency, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  return <AlertSubscriptionList subscriptions={(data as any) ?? []} />
}
