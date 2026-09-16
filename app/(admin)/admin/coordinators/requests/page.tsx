import Link from 'next/link'
import { ArrowLeft, Inbox } from 'lucide-react'
import { getAdminCoordinatorRequests } from '@/lib/queries/adminCoordinatorRequests'
import { CoordinatorRequestCard } from '@/components/admin/CoordinatorRequestCard'

export const dynamic = 'force-dynamic'

/**
 * /admin/coordinators/requests — coordinator access-request inbox.
 *
 * Pending requests render with Approve / Reject (approving creates the auth
 * account and sends the set-password invite). Decided requests stay visible
 * below as history.
 */
export default async function CoordinatorRequestsPage() {
  const requests = await getAdminCoordinatorRequests()
  const pending = requests.filter((r) => r.status === 'pending')
  const decided = requests.filter((r) => r.status !== 'pending')

  return (
    <div>
      <div className="border-b border-border bg-white px-6 py-5">
        <Link
          href="/admin/coordinators"
          className="inline-flex items-center gap-1.5 text-sm text-eu-blue hover:underline mb-2"
        >
          <ArrowLeft size={14} aria-hidden />
          Back to coordinators
        </Link>
        <h1 className="text-[22px] font-semibold text-ink">Coordinator requests</h1>
        <p className="text-sm text-muted">
          {pending.length} pending · {decided.length} decided
        </p>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 lg:px-6 py-6 flex flex-col gap-8">
        <section aria-label="Pending requests">
          <h2 className="text-base font-semibold text-ink mb-3">
            Pending {pending.length > 0 ? `(${pending.length})` : ''}
          </h2>
          {pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-8 py-12 rounded-md border border-dashed border-border bg-bg-soft">
              <Inbox className="mb-3 text-muted" size={28} aria-hidden />
              <p className="text-sm text-muted">No pending requests.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pending.map((r) => (
                <CoordinatorRequestCard key={r.id} request={r} />
              ))}
            </div>
          )}
        </section>

        {decided.length > 0 && (
          <section aria-label="Decided requests">
            <h2 className="text-base font-semibold text-ink mb-3">
              Decided ({decided.length})
            </h2>
            <div className="flex flex-col gap-3">
              {decided.map((r) => (
                <CoordinatorRequestCard key={r.id} request={r} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
