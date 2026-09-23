import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminBipById } from '@/lib/queries/adminBips'
import { getBipTimeline } from '@/lib/queries/statusHistory'
import { BipTimeline } from '@/components/history/BipTimeline'

/**
 * Admin per-BIP history.
 *
 * Full audit timeline for one BIP — submit, approvals, rejections with the
 * admin note, change requests, edits, withdraws — oldest first. Includes
 * orphan rows that survive BIP deletion (bip_id NULL rows are listed on the
 * BIPs history tab; per-BIP view needs a live row for the title).
 *
 * Cache: `dynamic = 'force-dynamic'` — history must never be stale.
 */
export const dynamic = 'force-dynamic'

export default async function AdminBipHistoryPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const bip = await getAdminBipById(id)
  if (!bip) notFound()
  const entries = await getBipTimeline(id)

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-6">
      <Link href={`/admin/bips/${id}/review`} className="text-sm text-eu-blue hover:underline">
        ← Back to review
      </Link>
      <h1 className="mt-1 text-[22px] font-semibold text-ink">History: {bip.title}</h1>
      <p className="text-sm text-muted">
        {entries.length === 0
          ? 'No events yet'
          : `${entries.length} event${entries.length === 1 ? '' : 's'} total`}{' '}
        ·{' '}
        <Link href="/admin/history?tab=bips" className="text-eu-blue hover:underline">
          Full BIP log
        </Link>
      </p>

      <div className="mt-6 max-w-[720px]">
        <BipTimeline entries={entries} />
      </div>
    </div>
  )
}
