import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DeleteAccountDialog } from '@/components/dashboard/DeleteAccountDialog'
import { CoordinatorPasswordSection } from '@/components/dashboard/CoordinatorPasswordSection'
import { CoordinatorDataChangeForm } from '@/components/dashboard/CoordinatorDataChangeForm'
import { PendingProfileChangeCard } from '@/components/dashboard/PendingProfileChangeCard'
import { getMyProfileChangeRequests } from '@/lib/queries/profileChangeRequests'
import { searchUniversitiesAction } from '@/lib/actions/universities'

/**
 * /dashboard/settings.
 *
 *   - Profile section: read-only snapshot of the coordinator's current
 *     details + a "data change" request form. Coordinators cannot edit the
 *     profile directly — the form files a row in
 *     `coordinator_profile_change_requests` (migration 00059) and an admin
 *     approves or declines it from /admin/coordinators/data-changes.
 *   - Password section: self-service reset link emailed to the
 *     coordinator's own login address (AUTH-05a2). No approval request —
 *     a plain Supabase recovery link.
 *   - Danger zone: account deletion (FOUN-07 / D-07).
 *
 * The (dashboard) layout already gates this route with getClaims() +
 * password check. The page-level getClaims() call is defence-in-depth
 * (Phase 2 pattern); claims.email feeds the delete dialog so the
 * coordinator can match it verbatim.
 */
export const metadata = {
  title: 'Settings · BipHub',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) {
    redirect('/login')
  }
  const claims = data.claims
  const accountEmail = typeof claims.email === 'string' ? claims.email : ''

  const [{ data: profile }, initialUniversities, changeRequests] =
    await Promise.all([
      supabase
        .from('profiles')
        .select(
          'full_name, contact_email, erasmus_code, university:university_id ( id, name, country )',
        )
        .eq('id', claims.sub)
        .maybeSingle(),
      searchUniversitiesAction(''),
      getMyProfileChangeRequests(),
    ])

  type ProfileRow = {
    full_name: string | null
    contact_email: string | null
    erasmus_code: string | null
    university: { id: string; name: string; country: string } | Array<{ id: string; name: string; country: string }> | null
  }
  const row = (profile ?? null) as unknown as ProfileRow | null
  const currentUniversity = Array.isArray(row?.university)
    ? (row?.university[0] ?? null)
    : (row?.university ?? null)

  const pending = changeRequests.find((r) => r.status === 'pending') ?? null
  const latestDecided =
    changeRequests.find((r) => r.status !== 'pending') ?? null

  return (
    <div className="py-12">
      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Settings</h1>
        <p className="mt-2 text-muted">Manage your account.</p>
      </header>

      <section
        aria-labelledby="profile-heading"
        className="rounded-lg border border-border bg-white p-6"
      >
        <h2 id="profile-heading" className="text-lg font-semibold text-ink">
          Profile
        </h2>
        <p className="mt-1 text-sm text-muted">
          Your details as they appear on your BIPs. Changes need admin
          approval — send a data-change request below.
        </p>

        <dl className="mt-5 space-y-2 border-t border-border pt-5 text-sm">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
            <dt className="w-32 shrink-0 text-muted">Full name</dt>
            <dd className="font-medium text-ink">{row?.full_name ?? '—'}</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
            <dt className="w-32 shrink-0 text-muted">Contact email</dt>
            <dd className="font-medium text-ink">{row?.contact_email ?? '—'}</dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
            <dt className="w-32 shrink-0 text-muted">University</dt>
            <dd className="font-medium text-ink">
              {currentUniversity
                ? `${currentUniversity.name} · ${currentUniversity.country}`
                : '—'}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
            <dt className="w-32 shrink-0 text-muted">Erasmus code</dt>
            <dd className="font-medium text-ink">{row?.erasmus_code ?? '—'}</dd>
          </div>
        </dl>

        <div className="mt-6 border-t border-border pt-6">
          <h3 className="text-base font-semibold text-ink">
            Request a data change
          </h3>
          {pending ? (
            <div className="mt-4">
              <PendingProfileChangeCard request={pending} />
            </div>
          ) : (
            <>
              {latestDecided && (
                <p
                  className={`mt-4 rounded-md border px-4 py-3 text-sm ${
                    latestDecided.status === 'approved'
                      ? 'border-green-200 bg-green-50 text-green-900'
                      : 'border-red-200 bg-red-50 text-red-900'
                  }`}
                >
                  Your last request was {latestDecided.status}
                  {latestDecided.admin_note
                    ? ` — admin note: ${latestDecided.admin_note}`
                    : '.'}
                </p>
              )}
              <div className="mt-4 max-w-[560px]">
                <CoordinatorDataChangeForm
                  initialUniversities={initialUniversities}
                  defaults={{
                    full_name: row?.full_name ?? '',
                    contact_email: row?.contact_email ?? '',
                    university_id: currentUniversity?.id ?? '',
                    erasmus_code: row?.erasmus_code ?? '',
                  }}
                />
              </div>
            </>
          )}
        </div>
      </section>

      <section
        aria-labelledby="password-heading"
        className="mt-6 rounded-lg border border-border bg-white p-6"
      >
        <h2 id="password-heading" className="text-lg font-semibold text-ink">
          Password
        </h2>
        <div className="mt-4">
          <CoordinatorPasswordSection accountEmail={accountEmail} />
        </div>
      </section>

      <section
        aria-labelledby="danger-zone-heading"
        className="mt-6 rounded-lg border border-red-200 bg-red-50/50 p-6"
      >
        <h2
          id="danger-zone-heading"
          className="text-lg font-semibold text-red-900"
        >
          Danger zone
        </h2>
        <p className="mt-2 text-sm text-red-900/80">
          Deleting your account is permanent. Approved BIPs you submitted will
          remain published in the public Erasmus+ directory, but anonymized:
          your name and contact email will be removed. Drafts, pending, and
          rejected submissions are deleted entirely. There is no grace period.
        </p>
        <div className="mt-6">
          <DeleteAccountDialog accountEmail={accountEmail} />
        </div>
      </section>
    </div>
  )
}
