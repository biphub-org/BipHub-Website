'use client'

/**
 * Coordinator dashboard list-row card (DASH-03 / DASH-05 / D-10).
 *
 *   - Status badge from STATUS_BADGE_CLASSES literal lookup (Tailwind v4
 *     never-do compliance — no template literals, no dynamic class names).
 *   - Per-status action buttons: Edit/Delete (draft), Edit/Withdraw (pending),
 *     View public page (approved), View details (rejected).
 *   - Rejection reason callout rendered inline for status === 'rejected'.
 *     Phase 2 has no schema for the reason yet; placeholder copy reflects that.
 *   - The seed-data pill is intentionally NOT rendered — coordinator
 *     dashboards show the coordinator's own BIPs (CONTEXT.md "Specifics").
 */

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from '@/lib/utils/status'
import { DeleteDraftDialog } from '@/components/dashboard/DeleteDraftDialog'
import { WithdrawBipDialog } from '@/components/dashboard/WithdrawBipDialog'
import { reviseRejectedBipAction } from '@/lib/actions/bip-revise'
import type { CoordinatorBip } from '@/lib/queries/coordinatorBips'
import { cn } from '@/lib/utils/cn'
import { formatLongDate } from '@/lib/utils/dates'

function formatDate(iso: string | null): string {
  return formatLongDate(iso) ?? '—'
}

interface Props {
  bip: CoordinatorBip
}

export function DashboardBipCard({ bip }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const router = useRouter()
  const [isRevising, startRevise] = useTransition()

  // Revise a rejected BIP: transition it back to `draft` (server action), then
  // open the wizard so the coordinator can edit and re-submit. The edit route
  // only accepts draft/pending, so the transition MUST land before we navigate.
  function handleRevise() {
    startRevise(async () => {
      const result = await reviseRejectedBipAction(bip.id)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      router.push(`/dashboard/bips/${bip.id}/edit`)
    })
  }

  return (
    <article className="rounded-md border border-border bg-white shadow-sm p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        {/* Left column: title + university + (rejected) inline reason callout */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-ink truncate">
            {bip.title || 'Untitled BIP'}
          </h3>
          <p className="mt-1 text-sm text-muted truncate">
            {bip.host_university?.name ?? 'University not set'}
            {bip.host_city ? ` · ${bip.host_city}` : ''}
          </p>
          {bip.status === 'rejected' && (
            <div className="mt-3 border-l-4 border-eu-gold bg-eu-gold/5 rounded-r px-3 py-2">
              <p className="text-sm text-ink-2">
                <span className="font-semibold">Reason:</span>{' '}
                {bip.rejection_reason ??
                  'This BIP was rejected. The admin team will provide a reason in a future update.'}
              </p>
            </div>
          )}
        </div>

        {/* Right column: status badge + timestamp + per-status actions */}
        <div className="flex flex-col gap-3 md:items-end">
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold',
              STATUS_BADGE_CLASSES[bip.status],
            )}
          >
            {STATUS_LABELS[bip.status]}
          </span>
          <p className="text-xs text-muted">
            {bip.status === 'draft'
              ? `Last saved ${formatDate(bip.updated_at)}`
              : `Submitted ${formatDate(bip.created_at)}`}
          </p>
          <div className="flex flex-wrap gap-2">
            {bip.status === 'draft' && (
              <>
                <Link href={`/dashboard/bips/${bip.id}/edit`}>
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteOpen(true)}
                  className="text-status-rejected"
                >
                  Delete
                </Button>
              </>
            )}
            {bip.status === 'pending' && (
              <>
                <Link href={`/dashboard/bips/${bip.id}/edit`}>
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setWithdrawOpen(true)}
                  className="text-status-pending"
                >
                  Withdraw
                </Button>
              </>
            )}
            {bip.status === 'approved' && (
              <Link
                href={`/bip/${bip.slug}`}
                target="_blank"
                className="text-sm text-eu-blue hover:underline"
              >
                View public page →
              </Link>
            )}
            {bip.status === 'rejected' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRevise}
                disabled={isRevising}
                className="text-eu-blue"
              >
                {isRevising ? 'Reopening…' : 'Revise & resubmit'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <DeleteDraftDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        bipId={bip.id}
        bipTitle={bip.title}
      />
      <WithdrawBipDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        bipId={bip.id}
        bipTitle={bip.title}
      />
    </article>
  )
}
