import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBipTimeline } from '@/lib/queries/statusHistory'
import { BipTimeline } from '@/components/history/BipTimeline'
import { BIP_ACTION_KINDS, bipActionLabel } from '@/lib/history/labels'

/**
 * Coordinator per-BIP history (DASH history).
 *
 * Full audit timeline for one owned BIP: submit, approvals, rejections with
 * the admin note, change requests, edits, withdraws — oldest first.
 * Optional event-type + date-range filters (GET params). Ownership is
 * checked explicitly (created_by === caller) on top of RLS: the timeline
 * query alone must never decide visibility.
 *
 * Cache: `dynamic = 'force-dynamic'` — history must never be stale.
 */
export const dynamic = 'force-dynamic'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

async function getOwnedBip(id: string): Promise<{ id: string; title: string } | null> {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  if (authError || !authData?.claims?.sub) return null
  const { data, error } = await supabase
    .from('bips')
    .select('id, title, created_by')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  if ((data as { created_by?: string }).created_by !== authData.claims.sub) return null
  return { id: (data as { id: string }).id, title: (data as { title: string }).title }
}

export default async function BipHistoryPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ action?: string; from?: string; to?: string }>
}) {
  const { id } = await props.params
  const sp = await props.searchParams
  const bip = await getOwnedBip(id)
  if (!bip) notFound()

  const actionKind =
    sp.action && BIP_ACTION_KINDS.includes(sp.action) ? sp.action : undefined
  const from = sp.from && DATE_RE.test(sp.from) ? sp.from : undefined
  const to = sp.to && DATE_RE.test(sp.to) ? sp.to : undefined
  const filtered = actionKind !== undefined || from !== undefined || to !== undefined

  const entries = await getBipTimeline(id, { actionKind, from, to })

  return (
    <div>
      <div className="flex items-center justify-between border-b border-border bg-white px-6 py-5 -mx-4 md:-mx-6">
        <div>
          <Link href="/dashboard/history" className="text-sm text-eu-blue hover:underline">
            ← All history
          </Link>
          <h1 className="mt-1 text-[22px] font-semibold text-ink">History: {bip.title}</h1>
          <p className="text-sm text-muted">
            {entries.length === 0
              ? 'No events match'
              : `${entries.length} event${entries.length === 1 ? '' : 's'} total`}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 md:px-6 py-6">
        <form
          method="get"
          className="mb-6 flex flex-wrap items-end gap-3 rounded-md border border-border bg-white px-4 py-3"
        >
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
            <a
              href={`/dashboard/bips/${id}/history`}
              className="px-2 py-1.5 text-sm text-eu-blue hover:underline"
            >
              Clear
            </a>
          ) : null}
        </form>

        <BipTimeline entries={entries} />
      </div>
    </div>
  )
}
