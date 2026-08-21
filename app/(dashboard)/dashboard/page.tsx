/**
 * Coordinator dashboard (DASH-01..DASH-06).
 *
 * Async RSC. Fetches the current coordinator's BIPs server-side via RLS-aware
 * query, then hands the list to the client `<DashboardBipList />` for tab
 * filtering. The "+ Submit a BIP" gold pill (D-11) lives in the header at all
 * times so a coordinator can start a new submission from any state.
 *
 * The (dashboard) route group's layout (Plan 02-04) provides the chrome,
 * profile-complete gate, and Toaster. This page assumes those are mounted.
 */
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { DashboardBipList } from '@/components/dashboard/DashboardBipList'
import { getCoordinatorBips } from '@/lib/queries/coordinatorBips'

export default async function DashboardPage(props: {
  searchParams: Promise<{ status?: string; submitted?: string }>
}) {
  const sp = await props.searchParams
  const bips = await getCoordinatorBips()

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border bg-white px-6 py-5 -mx-4 md:-mx-6">
        <div>
          <h1 className="text-[22px] font-semibold text-ink">Your BIPs</h1>
          <p className="text-sm text-muted">
            {bips.length === 0
              ? 'No BIPs yet'
              : `${bips.length} BIP${bips.length === 1 ? '' : 's'} total`}
          </p>
        </div>
        <Link href="/dashboard/bips/new">
          <Button variant="gold" size="md" className="font-semibold">
            + Submit a BIP
          </Button>
        </Link>
      </div>

      <DashboardBipList
        bips={bips}
        initialStatus={sp.status ?? 'all'}
        showSubmittedToast={sp.submitted === 'true'}
      />
    </div>
  )
}
