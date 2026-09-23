import { getCoordinatorHistoryFeed } from '@/lib/queries/statusHistory'
import { getCoordinatorBips } from '@/lib/queries/coordinatorBips'
import { BipTimeline } from '@/components/history/BipTimeline'
import { NewBipButton } from '@/components/dashboard/NewBipButton'
import { BIP_ACTION_KINDS, bipActionLabel } from '@/lib/history/labels'

/**
 * Coordinator history page (DASH history).
 *
 * Cross-BIP feed: every audit event on BIPs the caller owns, newest first.
 * Filters (all optional, GET params): BIP, event type, date range. Each BIP
 * chip links to its per-BIP timeline. The feed uses the full dashboard
 * width — cards, not a narrow centered column.
 *
 * History rows are immutable (no UPDATE/DELETE policies on
 * bip_status_history); deleting a draft from the dashboard removes the
 * card, never its surviving rows (admin-visible).
 *
 * Cache: `dynamic = 'force-dynamic'` — history must never be stale.
 */
export const dynamic = 'force-dynamic'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default async function DashboardHistoryPage(props: {
  searchParams: Promise<{ bip?: string; action?: string; from?: string; to?: string }>
}) {
  const sp = await props.searchParams
  const bips = await getCoordinatorBips()
  const bipIds = new Set(bips.map((b) => b.id))

  const bipId = sp.bip && bipIds.has(sp.bip) ? sp.bip : undefined
  const actionKind =
    sp.action && BIP_ACTION_KINDS.includes(sp.action) ? sp.action : undefined
  const from = sp.from && DATE_RE.test(sp.from) ? sp.from : undefined
  const to = sp.to && DATE_RE.test(sp.to) ? sp.to : undefined

  const entries = await getCoordinatorHistoryFeed({ bipId, actionKind, from, to })
  const filtered = bipId !== undefined || actionKind !== undefined || from !== undefined || to !== undefined

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border bg-white px-6 py-5 -mx-4 md:-mx-6">
        <div>
          <h1 className="text-[22px] font-semibold text-ink">History</h1>
          <p className="text-sm text-muted">
            {entries.length === 0
              ? 'No events match — submit your first BIP to start the trail'
              : `Every review event on your BIPs, newest first`}
          </p>
        </div>
        <NewBipButton />
      </div>

      <div className="mx-auto max-w-[1200px] px-4 md:px-6 py-6">
        <form
          method="get"
          action="/dashboard/history"
          className="mb-6 flex flex-wrap items-end gap-3 rounded-md border border-border bg-white px-4 py-3"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="history-bip" className="text-xs font-medium text-muted">
              BIP
            </label>
            <select
              id="history-bip"
              name="bip"
              defaultValue={bipId ?? ''}
              className="rounded-md border border-border bg-white px-3 py-1.5 text-sm text-ink"
            >
              <option value="">All BIPs</option>
              {bips.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="history-action" className="text-xs font-medium text-muted">
              Event type
            </label>
            <select
              id="history-action"
              name="action"
              defaultValue={actionKind ?? ''}
              className="rounded-md border border-border bg-white px-3 py-1.5 text-sm text-ink"
            >
              <option value="">All events</option>
              {BIP_ACTION_KINDS.map((a) => (
                <option key={a} value={a}>
                  {bipActionLabel(a)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="history-from" className="text-xs font-medium text-muted">
              From
            </label>
            <input
              id="history-from"
              name="from"
              type="date"
              defaultValue={from ?? ''}
              className="rounded-md border border-border bg-white px-3 py-1.5 text-sm text-ink"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="history-to" className="text-xs font-medium text-muted">
              To
            </label>
            <input
              id="history-to"
              name="to"
              type="date"
              defaultValue={to ?? ''}
              className="rounded-md border border-border bg-white px-3 py-1.5 text-sm text-ink"
            />
          </div>
          <button
            type="submit"
            className="rounded-full bg-eu-blue px-4 py-1.5 text-sm font-semibold text-white hover:bg-eu-blue-dark transition-colors"
          >
            Filter
          </button>
          {filtered ? (
            <a href="/dashboard/history" className="px-2 py-1.5 text-sm text-eu-blue hover:underline">
              Clear
            </a>
          ) : null}
        </form>

        <BipTimeline
          entries={entries}
          bipLinkBase="/dashboard/bips"
          emptyText="No history matches these filters. Submit a BIP and approvals, rejections, and change requests will appear here."
        />
      </div>
    </div>
  )
}
