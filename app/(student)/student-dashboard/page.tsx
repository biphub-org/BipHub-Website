import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { getSavedBipsCount } from '@/lib/queries/savedBips'
import { DeleteAccountDialog } from '@/components/dashboard/DeleteAccountDialog'
import { StudentChangePasswordForm } from '@/components/student/StudentChangePasswordForm'
import { StudentProfileForm } from '@/components/student/StudentProfileForm'
import { LegacySweepIsland } from '@/components/student/LegacySweepIsland'
import { AlertPreferencesForm } from '@/components/student/AlertPreferencesForm'
import { searchUniversitiesAction } from '@/lib/actions/universities'

/**
 * /student-dashboard — D-14 minimal-but-real shell (STUD-03 / 05-UI-SPEC Surface 2).
 *
 * The (student)/layout.tsx already validated auth + role; this page handles content.
 * It re-calls createClient() + getClaims() to read the email (JWT claim) and fetches
 * profiles.full_name for the greeting (may be NULL for student profiles).
 *
 * Structure:
 *   1. Welcome section — h1 greeting + "Signed in as {email}" sub-line
 *   2. Explore card — "Browse Erasmus+ BIPs" + "Browse BIPs →" CTA
 *   3. Saved BIPs summary card
 *   4. Alert preferences card
 *   5. Profile card — edit name, country, home university in place
 *   6. Account card — email + change password + delete
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

  // Fetch the student profile: full_name for the greeting (falls back to
  // "Welcome back" without a name component when NULL) plus country and
  // university_id to prefill the editable Profile card below.
  let firstName: string | null = null
  let profileFullName = ''
  let profileCountry = ''
  let profileUniversityId = ''
  if (claims?.sub) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, country, university_id')
      .eq('id', claims.sub)
      .maybeSingle()

    const row = (profile ?? {}) as {
      full_name?: string | null
      country?: string | null
      university_id?: string | null
    }
    profileFullName = row.full_name ?? ''
    profileCountry = row.country ?? ''
    profileUniversityId = row.university_id ?? ''

    if (row.full_name) {
      // Extract the first word of full_name (UI-SPEC welcome logic)
      firstName = row.full_name.trim().split(/\s+/)[0] ?? null
    }
  }

  const initialUniversities = await searchUniversitiesAction('')

  return (
    <div className="flex flex-col gap-8">
      {/* 1. Welcome section */}
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.3px] text-ink">
          {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
        </h1>
        <p className="mt-1 text-sm text-muted">Signed in as {email}</p>
      </div>

      {/* 2. Explore card */}
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

      {/* 3. Saved BIPs summary card */}
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

      {/* 4. Alert preferences — single Apply, multi-select fields/countries, no limits */}
      <div className="rounded-lg border border-border bg-white shadow-sm p-6 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-ink">Alert preferences</h2>
        <p className="text-sm text-muted">Choose any fields and/or countries you want alerts for and hit Apply. No limits — update anytime.</p>
        <AlertPreferencesSection />
      </div>

      {/* 5. Profile — edit name, country, home university in place */}
      <div className="rounded-lg border border-border bg-white shadow-sm p-6 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-ink">Profile</h2>
        <p className="text-sm text-muted">
          Update your name, country of residence, or home university anytime.
        </p>
        <StudentProfileForm
          mode="edit"
          initialFullName={profileFullName}
          initialCountry={profileCountry}
          initialUniversityId={profileUniversityId}
          initialUniversities={initialUniversities}
        />
      </div>

      {/* 6. Account — single combined section at the end, with change password + delete */}
      <div className="rounded-lg border border-border bg-white shadow-sm p-6 flex flex-col gap-4">
        <h2 className="text-base font-semibold text-ink">Account</h2>
        <p className="text-sm text-ink-2">{email}</p>

        <StudentChangePasswordForm />

        <div className="border-t border-border pt-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-ink">Delete account</h3>
          <p className="text-sm text-muted">
            Permanently delete your account and associated data. This cannot be undone.
          </p>
          <div className="pt-1">
            <DeleteAccountDialog accountEmail={email} />
          </div>
        </div>
      </div>

      {/* STUD-06 / D-02 — one-time legacy localStorage sweep; renders null */}
      <LegacySweepIsland />
    </div>
  )
}

async function AlertPreferencesSection() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims as unknown as { sub?: string } | undefined
  const userId = claims?.sub
  if (!userId) return <p className="text-sm text-muted">Sign in to manage alerts.</p>
  const { data } = await supabase
    .from('bip_alert_preferences')
    .select('fields, countries, isced_codes, frequency')
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) return <AlertPreferencesForm initial={null} />
  const row = data as unknown as Record<string, unknown>
  return (
    <AlertPreferencesForm
      initial={{
        fields: (row.fields as string[]) ?? [],
        countries: (row.countries as string[]) ?? [],
        iscedCodes: (row.isced_codes as string[]) ?? [],
        frequency: (row.frequency as string) ?? 'weekly',
      }}
    />
  )
}
