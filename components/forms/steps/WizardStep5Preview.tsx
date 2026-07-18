'use client'

/**
 * Step 5 — Preview & submit (SUBM-03 / SUBM-08).
 *
 * Renders the full BIP using the public-page components `<BipBody>` and
 * `<BipSidebar>` via the `draftToBipDetail` adapter (Pitfall 4), so the
 * coordinator sees exactly what students will see on the public catalog
 * once the BIP is approved.
 *
 * Submit flow:
 *   1. Read `bipId` + `draft` from the wizard's Zustand store.
 *   2. Call `submitBipAction(bipId, draft, partners)` — re-validates server-
 *      side, finalizes the slug, writes partner rows, flips status='pending'.
 *   3. On success: clearDraft() (resets local store + localStorage), fire a
 *      Sonner toast, redirect to `/dashboard?submitted=true` so the
 *      dashboard's mount-toast handshake (Plan 02-05) confirms receipt.
 *   4. On error: surface inline alert; the draft data stays put so the user
 *      can navigate back to edit and retry.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useBipDraft } from '@/lib/store/bip-draft'
import { draftToBipDetail } from '@/components/forms/wizardAdapter'
import { submitBipAction } from '@/lib/actions/bip-submit'
import { BipBody } from '@/components/bip/BipBody'
import { BipSidebar } from '@/components/bip/BipSidebar'

interface Props {
  hostUniversity: { id: string; name: string; country: string }
}

export function WizardStep5Preview({ hostUniversity }: Props) {
  const router = useRouter()
  const { bipId, draft, clearDraft } = useBipDraft()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, startSubmit] = useTransition()

  const previewBip = draftToBipDetail(draft, {
    hostUniversity,
    bipId,
    slug: null,
    status: 'pending',
    createdAt: new Date().toISOString(),
  })

  function handleSubmit() {
    if (!bipId) {
      setServerError(
        'Please save your draft before submitting. Go back to Step 1 and complete a field to trigger auto-save.',
      )
      return
    }
    setServerError(null)
    startSubmit(async () => {
      const result = await submitBipAction(
        bipId,
        draft,
        draft.partner_universities ?? [],
      )
      if ('error' in result) {
        setServerError(result.error)
        return
      }
      clearDraft()
      toast.success(
        "Your BIP has been submitted for review. We'll notify you by email once it's been reviewed.",
        { duration: 5000 },
      )
      router.push('/dashboard?submitted=true')
    })
  }

  return (
    <div className="space-y-6">
      {/* Preview banner — UI-SPEC line 300-307 */}
      <div className="rounded-md border border-eu-blue/20 bg-eu-blue/5 px-4 py-3 text-sm text-eu-blue">
        This is a preview of your BIP. It won&apos;t be visible publicly until
        reviewed and approved by the BipHub team.
      </div>

      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      {/* Two-column layout matching public detail page (Phase 1 Plan 01-07). */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="min-w-0">
          <BipBody bip={previewBip} />
        </div>
        <BipSidebar bip={previewBip} />
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          variant="gold"
          size="lg"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit for review →
        </Button>
      </div>
    </div>
  )
}
