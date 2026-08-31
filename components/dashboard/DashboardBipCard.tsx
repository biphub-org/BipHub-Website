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
import { duplicateBipAction } from '@/lib/actions/bip-duplicate'

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
  const [isDuplicating, startDuplicate] = useTransition()

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

  function handleDuplicate() {
    startDuplicate(async () => {
      const result = await duplicateBipAction(bip.id)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
      const maybeWarning = (result as { warning?: string }).warning
      if (maybeWarning) {
        toast.warning(maybeWarning)
      } else {
        toast.success('BIP duplicated — adjust the dates for the new edition.')
      }
      router.push(`/dashboard/bips/${result.bipId}/edit`)
    })
  }

  const canDuplicate =
    bip.status === 'approved' || bip.status === 'rejected' || bip.status === 'changes_requested'

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
          {(bip.status === 'approved' || bip.status === 'changes_requested') && (
            <Link
              href={`/bip/${bip.slug}`}
              target="_blank"
              className="mt-3 inline-block text-sm text-eu-blue hover:underline"
            >
              View public page →
            </Link>
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
          {bip.openEditStatus === 'pending' && (
            <span className="inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold bg-amber-50 text-amber-700 border-amber-200">
              Edit in review
            </span>
          )}
          {bip.openEditStatus === 'changes_requested' && (
            <span className="inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold bg-amber-50 text-amber-700 border-amber-200">
              Changes requested
            </span>
          )}
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
            {(bip.status === 'approved' || bip.status === 'changes_requested') && (
              <>
                <Link href={`/dashboard/bips/${bip.id}/edit`}>
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                </Link>
                {canDuplicate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDuplicate}
                    disabled={isDuplicating}
                    className="text-muted hover:text-ink"
                    aria-label={`Duplicate ${bip.title}`}
                  >
                    {isDuplicating ? 'Duplicating…' : 'Duplicate'}
                  </Button>
                )}
              </>
            )}
            {bip.status === 'rejected' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRevise}
                  disabled={isRevising}
                  className="text-eu-blue"
                >
                  {isRevising ? 'Reopening…' : 'Revise & resubmit'}
                </Button>
                {canDuplicate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDuplicate}
                    disabled={isDuplicating}
                    className="text-muted hover:text-ink"
                    aria-label={`Duplicate ${bip.title}`}
                  >
                    {isDuplicating ? 'Duplicating…' : 'Duplicate'}
                  </Button>
                )}
              </>
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
