'use client'

/**
 * AdminBipCard — pending queue row card (ADMN-02 / 03-UI-SPEC.md Pending Queue).
 *
 * Variant of DashboardBipCard with admin-relevant fields exposed:
 *   - Coordinator name + university (admin needs this; coordinator's own card
 *     never shows it because they're always looking at their own work).
 *   - Host city + physical date range.
 *   - "Submitted N days ago" timestamp derived from `created_at`.
 *   - Status pill via STATUS_BADGE_CLASSES lookup (Tailwind v4 compliance —
 *     CLAUDE.md never-do; no template-literal Tailwind classes).
 *   - "Review →" pill button linking to /admin/bips/[id]/review (404 stub
 *     until Plan 03-03 lands the review page; vertical-slice seam).
 *
 * Marked 'use client' consistent with DashboardBipCard (UI parity); pure
 * presentational — no state, no Server Action calls.
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from '@/lib/utils/status'
import { cn } from '@/lib/utils/cn'
import { formatLongDateRange } from '@/lib/utils/dates'
import type { AdminBip } from '@/lib/queries/adminBips'

// ── Edit badge (T-08-18): literal class string — no template literals (Tailwind v4 / CLAUDE.md)
const EDIT_BADGE_CLASSES =
  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-eu-blue-50 text-eu-blue border-eu-blue-light'

function daysAgo(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)))
}

function formatRange(start: string | null, end: string | null): string {
  if (!start || !end) return 'Dates TBD'
  return formatLongDateRange(start, end) ?? 'Dates TBD'
}

export type { AdminBip }

interface AdminBipCardProps {
  bip: AdminBip
  /** 'edit' → show Edit badge and use editId for the review link; 'submission' or omitted → no badge */
  kind?: 'submission' | 'edit'
  /**
   * For edit items: the bip_edits.id used to construct the review link
   * (/admin/bip-edits/[editId]/review). Required when kind==='edit'.
   */
  reviewHref?: string
}

export function AdminBipCard({ bip, kind, reviewHref }: AdminBipCardProps) {
  const submittedAgo = daysAgo(bip.created_at)
  const submittedLabel =
    submittedAgo === 0
      ? 'Submitted today'
      : `Submitted ${submittedAgo} day${submittedAgo === 1 ? '' : 's'} ago`

  return (
    <article className="rounded-md border border-border bg-white shadow-sm p-5 hover:border-border-strong hover:shadow-md transition">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-ink truncate">
            {bip.title || 'Untitled BIP'}
          </h3>
          <p className="mt-1 text-sm text-muted truncate">
            {bip.coordinator_name ?? 'Unknown coordinator'}
            {bip.coordinator_university ? ` · ${bip.coordinator_university}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
            <span>{bip.host_city ?? 'City TBD'}</span>
            <span aria-hidden>·</span>
            <span>{formatRange(bip.physical_start_date, bip.physical_end_date)}</span>
            <span aria-hidden>·</span>
            <span>{submittedLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold',
              STATUS_BADGE_CLASSES[bip.status],
            )}
          >
            {STATUS_LABELS[bip.status]}
          </span>
          {/* Edit type badge — D-08 / T-08-18: literal class string, no concat */}
          {kind === 'edit' && (
            <span className={EDIT_BADGE_CLASSES}>Edit</span>
          )}
          <Link href={reviewHref ?? `/admin/bips/${bip.id}/review`}>
            <Button variant="primary" size="sm">
              Review →
            </Button>
          </Link>
        </div>
      </div>
    </article>
  )
}
