'use client'

/**
 * ApproveBipModal — confirmation modal for admin approve (ADMN-03 / 03-UI-SPEC.md).
 *
 * - Shows the BIP title verbatim in a gold-bordered callout block.
 * - Optional 500-char note textarea; passed through to ApprovalEmail.
 * - Calls `approveBipAction` inside `useTransition`. On success the action
 *   redirects to the next pending BIP (or /admin), so reaching the
 *   "toast.success + onOpenChange(false)" line implies redirect was queued
 *   but not yet flushed — the toast is still useful because it appears on
 *   the next page.
 * - On `{ error }`, surfaces a destructive Alert inside the modal.
 *
 * Important Next.js semantics: `approveBipAction` calls `redirect()` on
 * success, which throws a `NEXT_REDIRECT` Error. React's useTransition
 * catches it silently and performs the navigation. Do NOT wrap the call
 * in a try/catch around the action — that would swallow the redirect.
 */

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { approveBipAction } from '@/lib/actions/admin-bips'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  bipId: string
  bipTitle: string
  coordinatorName: string
}

export function ApproveBipModal({
  open,
  onOpenChange,
  bipId,
  bipTitle,
  coordinatorName,
}: Props) {
  const [note, setNote] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    setServerError(null)
    startTransition(async () => {
      const result = await approveBipAction(bipId, note.trim() || undefined)
      // approveBipAction redirects on success; we only reach here on { error }.
      if (result?.error) {
        setServerError(result.error)
        return
      }
      // Success branch (only reachable if the action future-changes to return success
      // without redirect — currently unreachable in normal flow).
      toast.success(
        `BIP approved. Email sent to ${coordinatorName || 'the coordinator'}.`,
      )
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-[22px] font-semibold text-ink">
            Approve BIP
          </DialogTitle>
          <DialogDescription className="text-sm text-muted">
            You&apos;re about to approve:
          </DialogDescription>
        </DialogHeader>

        <div className="bg-bg-soft border-l-4 border-eu-gold rounded-r px-4 py-3 mb-4">
          <p className="text-base font-semibold text-ink">
            {bipTitle || 'Untitled BIP'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="approve-note" className="text-sm font-semibold text-ink">
            Note for the coordinator (optional)
          </Label>
          <Textarea
            id="approve-note"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder='Add a short congratulatory note or context (e.g. "Great work — looking forward to seeing the outcomes.")'
          />
          <p className="text-xs text-muted text-right">
            {note.length}/500 characters
          </p>
          <p className="text-sm text-muted">
            If set, this note will appear in the approval email under &ldquo;Note
            from the BipHub team&rdquo;.
          </p>
        </div>

        {serverError ? (
          <Alert variant="destructive" className="mt-3">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter className="mt-4 flex gap-3 justify-end">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-eu-gold text-ink hover:bg-eu-gold/90 rounded-pill px-5 py-2 font-semibold"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Approving…
              </>
            ) : (
              'Approve BIP'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
