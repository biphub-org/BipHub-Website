'use client'

/**
 * Step 5 — Preview & submit (SUBM-03 / SUBM-08).
 *
 * Renders the full BIP using the public-page components via the
 * `draftToBipDetail` adapter (Pitfall 4), so the coordinator sees exactly what
 * students will see on the public catalog once the BIP is approved:
 *   - `<InlineBipPreview>` — embedded, single-column (the wizard card is only
 *     ~696px wide; see that file for why the two-column grid can't fit).
 *   - `<FullPagePreview>`  — overlay, the wide two-column detail layout.
 *
 * Submit flow:
 *   1. Read `bipId` + `draft` from the wizard's Zustand store.
 *   2. Call `submitBipAction(bipId, draft, partners)` — re-validates server-
 *      side, finalizes the slug, writes partner rows, flips status='pending'
 *      (or straight to 'approved' when `mode="admin"` — admin direct-publish).
 *   3. On success: clearDraft() (resets local store + localStorage), fire a
 *      Sonner toast, redirect to `/dashboard?submitted=true` so the
 *      dashboard's mount-toast handshake (Plan 02-05) confirms receipt.
 *      In admin mode the toast confirms publication and redirects to
 *      `/admin/bips` instead.
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
import { usePreviewAttachments } from '@/components/forms/usePreviewAttachments'
import { submitBipAction } from '@/lib/actions/bip-submit'
import { InlineBipPreview } from '@/components/forms/InlineBipPreview'
import { FullPagePreview } from '@/components/forms/FullPagePreview'
import { WizardFooterSlot } from '@/components/forms/WizardFooterSlot'

interface Props {
  hostUniversity: { id: string; name: string; country: string }
  /**
   * Admin direct-publish: the admin "Add new BIP" page passes `mode="admin"`.
   * The server action publishes straight to `approved` (no review step), so
   * the banner, CTA, toast, and post-publish redirect all say "publish"
   * instead of "submit for review". Defaults to `'coordinator'`.
   */
  mode?: 'coordinator' | 'admin'
}

export function WizardStep5Preview({ hostUniversity, mode = 'coordinator' }: Props) {
  const router = useRouter()
  const { bipId, draft, clearDraft } = useBipDraft()
  const isAdmin = mode === 'admin'
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, startSubmit] = useTransition()

  const attachments = usePreviewAttachments(bipId)
  const previewBip = {
    ...draftToBipDetail(draft, {
      hostUniversity,
      bipId,
      slug: null,
      status: isAdmin ? 'approved' : 'pending',
      createdAt: new Date().toISOString(),
    }),
    attachments,
  }

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
        isAdmin
          ? 'Your BIP has been published and is now visible publicly.'
          : "Your BIP has been submitted for review. We'll notify you by email once it's been reviewed.",
        { duration: 5000 },
      )
      router.push(isAdmin ? '/admin/bips' : '/dashboard?submitted=true')
    })
  }

  return (
    <div className="space-y-6">
      {/* Preview banner — UI-SPEC line 300-307 */}
      <div className="flex flex-col gap-3 rounded-md border border-eu-blue/20 bg-eu-blue/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-eu-blue">
          {isAdmin
            ? 'This is a preview of your BIP. Publishing will make it visible publicly immediately — no review step.'
          : "This is a preview of your BIP. It won't be visible publicly until reviewed and approved by the BipHub team."}
        </p>
        <FullPagePreview bip={previewBip} />
      </div>

      {/* Single-column render of the public detail page — the wizard card is
          only ~696px wide, so the desktop two-column grid does not fit here.
          See InlineBipPreview for the full rationale; FullPagePreview above is
          the wide, two-column faithful render. */}
      <InlineBipPreview bip={previewBip} />

      {/* Below the preview, not above it: the submit button lives in the wizard
          footer, so a failure surfaces directly next to the control the user
          just pressed instead of off-screen at the top of the scroll area. */}
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <WizardFooterSlot>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          variant="gold"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isAdmin ? 'Publish BIP →' : 'Submit for review →'}
        </Button>
      </WizardFooterSlot>
    </div>
  )
}
