'use client'

/**
 * AdminActionsPanel — sticky right-column panel on the admin review page
 * (Plan 03-03 + 03-04 / 03-UI-SPEC.md; extended Plan 08-08 / 08-UI-SPEC.md Surface 4).
 *
 * Three CTAs (Phase 8):
 *   - Approve BIP / Approve Edit (gold pill) — opens ApproveBipModal for new
 *     submissions; calls approveEditAction(editId) directly for edit rows.
 *     Enabled when status==='pending'.
 *   - Request Changes (amber outline) — opens RequestChangesBipModal (required note).
 *     Enabled ONLY when status==='pending' — matches the requestChangesEditAction
 *     server-side guard (WARNING-1 fix; disabled button prevents error-toast mismatch).
 *   - Reject BIP / Reject Edit (red outline) — opens RejectBipModal with isEdit branch.
 *     Enabled when status in ('pending','approved') for submissions;
 *     status==='pending' for edits.
 *
 * Helper text is contextual: different copy for new submissions vs edit rows.
 */

import { useState, useTransition } from 'react'
import { Check, MessageSquare, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApproveBipModal } from './ApproveBipModal'
import { RejectBipModal } from './RejectBipModal'
import { RequestChangesBipModal } from './RequestChangesBipModal'
import { approveEditAction } from '@/lib/actions/admin-edit-bips'
import type { BipStatus } from '@/lib/utils/status'

interface Props {
  bipId: string
  bipTitle: string
  coordinatorName: string
  currentStatus: BipStatus
  nextPendingId?: string | null
  /** Phase 8: true → "Approve Edit" / "Reject Edit" labels + edit-mode actions */
  isEdit?: boolean
  /** Phase 8: the bip_edits.id — required when isEdit=true */
  editId?: string
}

export function AdminActionsPanel({
  bipId,
  bipTitle,
  coordinatorName,
  currentStatus,
  nextPendingId,
  isEdit = false,
  editId,
}: Props) {
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [requestChangesOpen, setRequestChangesOpen] = useState(false)
  const [approveError, setApproveError] = useState<string | null>(null)
  const [isApproving, startApproveTransition] = useTransition()

  // ── Enabled gates (WARNING-1: gates MUST match action guards in 08-05) ──
  const canApprove = currentStatus === 'pending'
  // canRequestChanges: pending ONLY — matches requestChangesEditAction guard (status==='pending').
  // Do NOT also enable on changes_requested; action would return an error → broken UX.
  const canRequestChanges = currentStatus === 'pending'
  // canReject: new submissions allow un-approve via Reject (D-06); edits: pending only.
  const canReject = isEdit
    ? currentStatus === 'pending'
    : currentStatus === 'pending' || currentStatus === 'approved'

  function handleEditApprove() {
    if (!editId) return
    setApproveError(null)
    startApproveTransition(async () => {
      const result = await approveEditAction(editId)
      // approveEditAction redirects on success; we only reach here on { error }.
      if (result?.error) {
        setApproveError(result.error)
      }
    })
  }

  const approveLabel = isEdit ? 'Approve Edit' : 'Approve BIP'
  const rejectLabel = isEdit ? 'Reject Edit' : 'Reject BIP'

  return (
    <div className="bg-white border border-border rounded-md p-6 shadow-sm sticky top-20">
      <h2 className="text-[22px] font-semibold text-ink mb-4">Admin actions</h2>
      <div className="flex flex-col gap-3">
        {/* Approve */}
        {isEdit ? (
          <Button
            className="w-full bg-eu-gold text-ink hover:bg-eu-gold/90 rounded-pill"
            onClick={handleEditApprove}
            disabled={!canApprove || isApproving}
          >
            <Check size={16} className="mr-2" aria-hidden />
            {isApproving ? 'Approving…' : approveLabel}
          </Button>
        ) : (
          <Button
            className="w-full bg-eu-gold text-ink hover:bg-eu-gold/90 rounded-pill"
            onClick={() => setApproveOpen(true)}
            disabled={!canApprove}
          >
            <Check size={16} className="mr-2" aria-hidden />
            {approveLabel}
          </Button>
        )}

        {/* Request Changes (Phase 8 — NEW) */}
        <Button
          variant="outline"
          className="w-full border-status-pending text-status-pending bg-white hover:bg-status-pending-bg rounded-pill"
          onClick={() => setRequestChangesOpen(true)}
          disabled={!canRequestChanges}
        >
          <MessageSquare size={16} className="mr-2" aria-hidden />
          Request Changes
        </Button>

        {/* Reject */}
        <Button
          variant="outline"
          className="w-full border-status-rejected text-status-rejected bg-white hover:bg-red-50 rounded-pill"
          onClick={() => setRejectOpen(true)}
          disabled={!canReject}
        >
          <X size={16} className="mr-2" aria-hidden />
          {rejectLabel}
        </Button>
      </div>

      {/* Approve error (edit mode only — inline because there's no modal) */}
      {approveError ? (
        <p className="mt-3 text-sm text-status-rejected" role="alert">
          {approveError}
        </p>
      ) : null}

      {/* Contextual helper text */}
      <div className="mt-4 bg-bg-soft rounded-sm px-3 py-2">
        <p className="text-sm text-muted">
          {isEdit
            ? 'Approving merges the edit into the live BIP immediately. Requesting changes returns the edit to the coordinator. Rejecting discards the edit; the live BIP stays unchanged.'
            : 'Approving publishes the BIP. Requesting changes returns it to the coordinator with your note. Rejecting permanently declines this submission.'}
        </p>
      </div>

      {/* Status hints */}
      {!canApprove && !canReject ? (
        <p className="mt-3 text-xs text-muted">
          This item is no longer actionable (current status:{' '}
          <strong>{currentStatus}</strong>).
        </p>
      ) : !canApprove && !isEdit ? (
        <p className="mt-3 text-xs text-muted">
          Current status: <strong>{currentStatus}</strong>. Approve is disabled;
          Reject acts as un-approve.
        </p>
      ) : nextPendingId ? (
        <p className="mt-3 text-xs text-muted">
          After this action you&apos;ll be taken to the next pending item.
        </p>
      ) : (
        <p className="mt-3 text-xs text-muted">
          {isEdit
            ? 'This is the last pending edit in the queue.'
            : 'This is the last pending BIP in the queue.'}
        </p>
      )}

      {/* Modals */}
      <ApproveBipModal
        open={approveOpen}
        onOpenChange={setApproveOpen}
        bipId={bipId}
        bipTitle={bipTitle}
        coordinatorName={coordinatorName}
      />
      <RejectBipModal
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        bipId={bipId}
        bipTitle={bipTitle}
        coordinatorName={coordinatorName}
        isEdit={isEdit}
        editId={editId}
      />
      <RequestChangesBipModal
        open={requestChangesOpen}
        onOpenChange={setRequestChangesOpen}
        bipId={bipId}
        editId={editId}
        bipTitle={bipTitle}
        coordinatorName={coordinatorName}
        isEdit={isEdit}
      />
    </div>
  )
}
