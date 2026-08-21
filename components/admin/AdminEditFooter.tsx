'use client'

/**
 * AdminEditFooter — Step 5 (preview) footer for the admin edit flow
 * (Plan 03-07 / ADMN-05 / 03-UI-SPEC.md "Admin Edit Contract").
 *
 * Replaces the coordinator-only `<WizardStep5Preview>` Submit button
 * with a three-action panel:
 *
 *   - **Save changes** (ghost) — calls `adminUpdateBipAction` with the
 *     live draft data from the Zustand store. On success: Sonner toast
 *     + push back to /admin/bips.
 *   - **Reject BIP** (outline destructive) — opens `RejectBipModal`
 *     (the same modal Plan 03-04 ships). Disabled unless the BIP is
 *     pending or approved (D-06 — admin may un-approve via reject).
 *   - **Approve BIP** (gold pill) — opens `ApproveBipModal` (Plan 03-03).
 *     Disabled unless the BIP is pending.
 *
 * **Live data binding (Plan 03-07 Option 1):** the footer reads the
 * current wizard draft directly from `useBipDraft()` rather than
 * receiving it via props. This avoids stale snapshots when the admin
 * edits Step 1-4 then arrives at Step 5 — the wizard's existing
 * `mergeDraft` mirrors every change into the store on blur, so
 * reading `store.draft` here always reflects the live edit.
 *
 * Admin actions panel parity: matches `AdminActionsPanel` (Plan 03-03 +
 * Plan 03-04) for the approve/reject affordances so the visual
 * vocabulary is consistent across review and edit surfaces.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Check, X, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApproveBipModal } from './ApproveBipModal'
import { RejectBipModal } from './RejectBipModal'
import { adminUpdateBipAction } from '@/lib/actions/admin-bips'
import { useBipDraft } from '@/lib/store/bip-draft'
import type { BipStatus } from '@/lib/utils/status'

interface Props {
  bipId: string
  bipTitle: string
  coordinatorName: string
  currentStatus: BipStatus
}

export function AdminEditFooter({
  bipId,
  bipTitle,
  coordinatorName,
  currentStatus,
}: Props) {
  const router = useRouter()
  const draft = useBipDraft((s) => s.draft)
  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Mirror AdminActionsPanel's gating (D-06):
  //   - Approve is only legal from `pending`.
  //   - Reject is legal from `pending` (standard) or `approved` (un-approve).
  const canApprove = currentStatus === 'pending'
  const canReject =
    currentStatus === 'pending' || currentStatus === 'approved'

  function handleSave() {
    startTransition(async () => {
      const result = await adminUpdateBipAction(bipId, draft)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Changes saved.')
      router.push('/admin/bips')
    })
  }

  return (
    <>
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-end mt-6">
        <Button
          variant="ghost"
          onClick={handleSave}
          disabled={isPending}
          className="bg-bg-soft text-ink rounded-pill px-5 py-3"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            <>
              <Save size={16} className="mr-2" aria-hidden />
              Save changes
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => setRejectOpen(true)}
          disabled={isPending || !canReject}
          className="border-status-rejected text-status-rejected bg-white hover:bg-red-50 rounded-pill px-5 py-3"
        >
          <X size={16} className="mr-2" aria-hidden />
          Reject BIP
        </Button>
        <Button
          onClick={() => setApproveOpen(true)}
          disabled={isPending || !canApprove}
          className="bg-eu-gold text-ink hover:bg-eu-gold-dark rounded-pill px-5 py-3 font-semibold"
        >
          <Check size={16} className="mr-2" aria-hidden />
          Approve BIP
        </Button>
      </div>

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
      />
    </>
  )
}
