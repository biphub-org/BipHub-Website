import Link from 'next/link'
import { bipActionLabel } from '@/lib/history/labels'
import { formatLongDate } from '@/lib/utils/dates'

/**
 * BipTimeline — vertical event timeline for one BIP or a cross-BIP feed.
 *
 * Presentational server component. Accepts coordinator rows (BipHistoryRow /
 * CoordinatorFeedRow) and admin rows (AdminBipHistoryRow): every entry needs
 * action_kind + created_at; bip_title/bip_id are optional (feeds show a BIP
 * chip linking to the per-BIP view via `bipLinkBase`).
 *
 * Actor names come from the profiles join when the caller may read them;
 * otherwise the entry renders "BipHub team" — never blank, never an id.
 * The admin note (rejection reason, change request) renders in a gold
 * callout, mirroring the email visual contract.
 */
export type TimelineEntry = {
  id: string
  action_kind: string
  from_status: string | null
  to_status: string
  actor_name: string | null
  note: string | null
  created_at: string
  bip_id?: string | null
  bip_title?: string | null
}

export function BipTimeline({
  entries,
  bipLinkBase,
  emptyText = 'No history yet.',
}: {
  entries: TimelineEntry[]
  /** e.g. '/dashboard/bips' → links to `${base}/${bipId}/history`. Omit to hide BIP links. */
  bipLinkBase?: string
  emptyText?: string
}) {
  if (entries.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-bg-soft px-6 py-10 text-center">
        <p className="text-sm text-muted">{emptyText}</p>
      </div>
    )
  }

  return (
    <ol className="relative ml-2 border-l-2 border-border pl-6">
      {entries.map((entry) => {
        const date = formatLongDate(entry.created_at) ?? entry.created_at
        const showTransition =
          entry.from_status && entry.from_status !== entry.to_status
        return (
          <li key={entry.id} className="relative pb-6 last:pb-0">
            <span
              aria-hidden
              className="absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full bg-eu-blue ring-4 ring-eu-blue-50"
            />
            <div className="rounded-md border border-border bg-white px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-sm font-semibold text-ink">
                  {bipActionLabel(entry.action_kind)}
                </p>
                <time className="text-xs text-muted">{date}</time>
              </div>
              {entry.bip_title && entry.bip_id && bipLinkBase ? (
                <p className="mt-1 text-sm">
                  <Link
                    href={`${bipLinkBase}/${entry.bip_id}/history`}
                    className="font-medium text-eu-blue hover:underline"
                  >
                    {entry.bip_title}
                  </Link>
                </p>
              ) : null}
              {entry.bip_title && (!entry.bip_id || !bipLinkBase) ? (
                <p className="mt-1 text-sm font-medium text-ink-2">{entry.bip_title}</p>
              ) : null}
              <p className="mt-1 text-xs text-muted">
                {showTransition ? (
                  <>
                    {entry.from_status} → {entry.to_status} ·{' '}
                  </>
                ) : null}
                {entry.actor_name ?? 'BipHub team'}
              </p>
              {entry.note ? (
                <div className="mt-2 rounded-r-md border-l-4 border-eu-gold bg-bg-soft px-3 py-2">
                  <p className="whitespace-pre-wrap text-sm text-ink">{entry.note}</p>
                </div>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
