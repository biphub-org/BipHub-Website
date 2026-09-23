import Link from 'next/link'
import { getAdminBipHistoryFeed, getActivityFeed, resolveActivityCategory } from '@/lib/queries/activityLog'
import { BipTimeline } from '@/components/history/BipTimeline'
import { ActivityCard } from '@/components/history/ActivityCard'
import { HistoryPagination } from '@/components/history/HistoryPagination'
import { bipActionLabel, activityActionLabel, BIP_ACTION_KINDS as BIP_ACTIONS } from '@/lib/history/labels'

/**
 * Admin history hub (ADMN history).
 *
 * Three separate logs, one page, tabbed via `?tab=`:
 *   - BIPs:         full bip_status_history feed (all BIPs, incl. orphan rows
 *                   from deleted BIPs) with action filter.
 *   - Coordinators: people-activity feed (requests, profile changes, accounts).
 *   - Students:     people-activity feed (profiles, alerts, accounts).
 *
 * People tabs add a name/email search box. Everything is paginated cards —
 * no tables. History rows are immutable (no UPDATE/DELETE policies); user
 * and BIP cards are deleted from their own pages, never here.
 *
 * Cache: `dynamic = 'force-dynamic'` — history must never be stale.
 */
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

type Tab = 'bips' | 'coordinators' | 'students'

const TABS: Array<{ id: Tab; label: string; href: string }> = [
  { id: 'bips', label: 'BIPs', href: '/admin/history?tab=bips' },
  { id: 'coordinators', label: 'Coordinators', href: '/admin/history?tab=coordinators' },
  { id: 'students', label: 'Students', href: '/admin/history?tab=students' },
]

const PEOPLE_ACTIONS: Record<Exclude<Tab, 'bips'>, string[]> = {
  coordinators: [
    'account_created',
    'account_deleted',
    'coordinator_request_filed',
    'coordinator_request_approved',
    'coordinator_request_rejected',
    'profile_change_requested',
    'profile_change_approved',
    'profile_change_declined',
  ],
  students: [
    'account_created',
    'account_deleted',
    'student_profile_updated',
    'alerts_subscribed',
    'alerts_updated',
    'alerts_cleared',
  ],
}

const TAB_ACTIVE =
  'rounded-full bg-eu-blue px-4 py-1.5 text-sm font-semibold text-white'
const TAB_RESTING =
  'rounded-full border border-border bg-white px-4 py-1.5 text-sm font-medium text-ink-2 hover:text-ink hover:bg-bg-soft transition-colors'

function pageHref(base: Record<string, string>, page: number): string {
  const sp = new URLSearchParams({ ...base, page: String(page) })
  return `/admin/history?${sp.toString()}`
}

export default async function AdminHistoryPage(props: {
  searchParams: Promise<{ tab?: string; page?: string; q?: string; action?: string }>
}) {
  const sp = await props.searchParams
  const tab: Tab =
    sp.tab === 'coordinators' || sp.tab === 'students' ? sp.tab : 'bips'
  const page = Math.max(1, Number(sp.page) || 1)

  if (tab === 'bips') {
    const action = sp.action && BIP_ACTIONS.includes(sp.action) ? sp.action : undefined
    const { rows, total } = await getAdminBipHistoryFeed(page, PAGE_SIZE, action)
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const base = { tab, ...(action ? { action } : {}) }

    return (
      <div className="max-w-[1200px] mx-auto px-6 py-6">
        <h1 className="text-[22px] font-semibold text-ink">History</h1>
        <p className="text-sm text-muted">
          {total === 0 ? 'No events yet' : `${total} BIP event${total === 1 ? '' : 's'} total`}
        </p>

        <nav aria-label="History logs" className="mt-4 flex gap-2">
          {TABS.map((t) => (
            <Link key={t.id} href={t.href} className={t.id === tab ? TAB_ACTIVE : TAB_RESTING}>
              {t.label}
            </Link>
          ))}
        </nav>

        <form method="get" action="/admin/history" className="mt-4 flex flex-wrap items-center gap-2">
          <input type="hidden" name="tab" value="bips" />
          <label htmlFor="history-action" className="text-sm text-muted">
            Action
          </label>
          <select
            id="history-action"
            name="action"
            defaultValue={action ?? ''}
            className="rounded-md border border-border bg-white px-3 py-1.5 text-sm text-ink"
          >
            <option value="">All actions</option>
            {BIP_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {bipActionLabel(a)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-full bg-eu-blue px-4 py-1.5 text-sm font-semibold text-white hover:bg-eu-blue-dark transition-colors"
          >
            Filter
          </button>
        </form>

        <div className="mt-6">
          <BipTimeline
            entries={rows}
            bipLinkBase="/admin/bips"
            emptyText="No BIP events match this filter."
          />
        </div>

        <HistoryPagination
          page={page}
          totalPages={totalPages}
          prevHref={page > 1 ? pageHref(base, page - 1) : null}
          nextHref={page < totalPages ? pageHref(base, page + 1) : null}
        />
      </div>
    )
  }

  // Tab ids are plural; the column stores the singular role value.
  const category = resolveActivityCategory(tab) ?? 'coordinator'
  const validActions = PEOPLE_ACTIONS[tab]
  const action = sp.action && validActions.includes(sp.action) ? sp.action : undefined
  const q = sp.q?.trim() || undefined
  const { rows, total } = await getActivityFeed({
    category,
    action,
    search: q,
    page,
    pageSize: PAGE_SIZE,
  })
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const base = { tab, ...(action ? { action } : {}), ...(q ? { q } : {}) }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-6">
      <h1 className="text-[22px] font-semibold text-ink">History</h1>
      <p className="text-sm text-muted">
        {total === 0
          ? 'No events yet'
          : `${total} ${tab} event${total === 1 ? '' : 's'} total`}
      </p>

      <nav aria-label="History logs" className="mt-4 flex gap-2">
        {TABS.map((t) => (
          <Link key={t.id} href={t.href} className={t.id === tab ? TAB_ACTIVE : TAB_RESTING}>
            {t.label}
          </Link>
        ))}
      </nav>

      <form method="get" action="/admin/history" className="mt-4 flex flex-wrap items-center gap-2">
        <input type="hidden" name="tab" value={tab} />
        <label htmlFor="history-q" className="sr-only">
          Search by name or email
        </label>
        <input
          id="history-q"
          name="q"
          type="search"
          defaultValue={q ?? ''}
          placeholder="Search name or email…"
          className="rounded-md border border-border bg-white px-3 py-1.5 text-sm text-ink placeholder:text-muted"
        />
        <label htmlFor="history-action" className="sr-only">
          Action
        </label>
        <select
          id="history-action"
          name="action"
          defaultValue={action ?? ''}
          className="rounded-md border border-border bg-white px-3 py-1.5 text-sm text-ink"
        >
          <option value="">All actions</option>
          {validActions.map((a) => (
            <option key={a} value={a}>
              {activityActionLabel(a)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-full bg-eu-blue px-4 py-1.5 text-sm font-semibold text-white hover:bg-eu-blue-dark transition-colors"
        >
          Filter
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="mt-6 rounded-md border border-dashed border-border bg-bg-soft px-6 py-10 text-center">
          <p className="text-sm text-muted">No events match this filter.</p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {rows.map((entry) => (
            <ActivityCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      <HistoryPagination
        page={page}
        totalPages={totalPages}
        prevHref={page > 1 ? pageHref(base, page - 1) : null}
        nextHref={page < totalPages ? pageHref(base, page + 1) : null}
      />
    </div>
  )
}
