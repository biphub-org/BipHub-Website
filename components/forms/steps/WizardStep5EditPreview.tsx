'use client'

/**
 * Step 5 — Preview & CTA for the approved-BIP edit flow (Phase 8 EDIT-01).
 *
 * Replaces WizardStep5Preview in the previewStep slot when a coordinator is
 * editing an already-approved BIP. Reads draft + partners from the Zustand
 * store (same as WizardStep5Preview) and calls the appropriate server action
 * based on the edit state determined by the RSC page:
 *
 *   'state-a'  — approved BIP, no open edit → submitEditAction(bipId, draft, partners)
 *   'state-b'  — approved BIP, open edit in pending → disabled "Edit in review"
 *   'state-c'  — open edit in changes_requested → resubmitEditAction(editId, draft, partners)
 *   'd06a'     — changes_requested BIP, no open edit → resubmitPendingBipAction(bipId, draft, partners)
 *
 * Toast copy is locked per UI-SPEC Surface 1 Copywriting Contract.
 * Error handling: inline Alert variant="destructive" above the CTA.
 *
 * CRITICAL for D-06a: resubmitPendingBipAction MUST receive the wizard draft +
 * partners (content edits preserved) — a status-only/no-arg call is forbidden
 * (08-07 plan constraint, 08-05 implementation contract).
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useBipDraft } from '@/lib/store/bip-draft'
import { draftToBipDetail } from '@/components/forms/wizardAdapter'
import { submitEditAction, resubmitEditAction, resubmitPendingBipAction } from '@/lib/actions/bip-edits'
import { BipBody } from '@/components/bip/BipBody'
import { BipSidebar } from '@/components/bip/BipSidebar'

export type EditPreviewState = 'state-a' | 'state-b' | 'state-c' | 'd06a'

interface Props {
  bipId: string
  editId?: string | null
  editState: EditPreviewState
  hostUniversity: { id: string; name: string; country: string }
}

export function WizardStep5EditPreview({
  bipId,
  editId,
  editState,
  hostUniversity,
}: Props) {
  const router = useRouter()
  const { draft } = useBipDraft()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const previewBip = draftToBipDetail(draft, {
    hostUniversity,
    bipId,
    slug: null,
    status: 'approved',
    createdAt: new Date().toISOString(),
  })

  function handleSubmitEdit() {
    setServerError(null)
    startTransition(async () => {
      const partners = draft.partner_universities ?? []
      const result = await submitEditAction(bipId, draft, partners)
      if ('error' in result) {
        setServerError(result.error)
        return
      }
      toast.success(
        'Edit submitted for review. The public page stays live while it\'s being reviewed.',
        { duration: 5000 },
      )
      router.refresh()
    })
  }

  function handleResubmitEdit() {
    if (!editId) {
      setServerError('Edit ID is missing. Please refresh the page and try again.')
      return
    }
    setServerError(null)
    startTransition(async () => {
      const partners = draft.partner_universities ?? []
      const result = await resubmitEditAction(editId, draft, partners)
      if ('error' in result) {
        setServerError(result.error)
        return
      }
      toast.success('Edit resubmitted. An admin will review it shortly.', {
        duration: 5000,
      })
      router.refresh()
    })
  }

  function handleResubmitPendingBip() {
    setServerError(null)
    startTransition(async () => {
      // D-06a CRITICAL: pass wizard draft + partners so revised content is
      // persisted — mirrors State C resubmitEditAction(editId, draft, partners).
      // A status-only/no-arg call is forbidden (plan constraint).
      const partners = draft.partner_universities ?? []
      const result = await resubmitPendingBipAction(bipId, draft, partners)
      if ('error' in result) {
        setServerError(result.error)
        return
      }
      toast.success('Edit resubmitted. An admin will review it shortly.', {
        duration: 5000,
      })
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      {/* Preview banner */}
      <div className="rounded-md border border-eu-blue/20 bg-eu-blue/5 px-4 py-3 text-sm text-eu-blue">
        This is a preview of your proposed changes. The public page stays
        unchanged until an admin approves this edit.
      </div>

      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>
            Your edit could not be submitted. Try again or contact support.
          </AlertDescription>
        </Alert>
      )}

      {/* Two-column preview matching public detail page */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div>
          <BipBody bip={previewBip} />
        </div>
        <BipSidebar bip={previewBip} />
      </div>

      {/* State A: Submit Edit for Review */}
      {editState === 'state-a' && (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleSubmitEdit}
            disabled={isPending}
            className="bg-eu-gold text-ink hover:bg-eu-gold/90 rounded-pill px-5 py-2 font-semibold w-full"
          >
            {isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            )}
            {isPending ? 'Submitting…' : 'Submit Edit for Review'}
          </Button>
        </div>
      )}

      {/* State B: disabled "Edit in review" — resubmit action NOT mounted */}
      {editState === 'state-b' && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            disabled
            className="rounded-pill px-5 py-2 w-full opacity-60 cursor-not-allowed"
          >
            Edit in review
          </Button>
        </div>
      )}

      {/* State C: Resubmit Edit (bip_edits row) */}
      {editState === 'state-c' && (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleResubmitEdit}
            disabled={isPending}
            className="bg-eu-gold text-ink hover:bg-eu-gold/90 rounded-pill px-5 py-2 font-semibold w-full"
          >
            {isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            )}
            {isPending ? 'Resubmitting…' : 'Resubmit Edit'}
          </Button>
        </div>
      )}

      {/* D-06a: Resubmit for new-submission changes_requested */}
      {editState === 'd06a' && (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleResubmitPendingBip}
            disabled={isPending}
            className="bg-eu-gold text-ink hover:bg-eu-gold/90 rounded-pill px-5 py-2 font-semibold w-full"
          >
            {isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            )}
            {isPending ? 'Resubmitting…' : 'Resubmit Edit'}
          </Button>
        </div>
      )}
    </div>
  )
}
