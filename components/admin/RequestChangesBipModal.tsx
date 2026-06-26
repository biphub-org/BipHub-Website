'use client'

/**
 * RequestChangesBipModal — admin request-changes confirmation modal (Phase 8 EDIT-06).
 *
 * Mirrors RejectBipModal structure exactly (per 08-PATTERNS.md), with amber
 * styling in place of red and a gold-bordered BIP callout.
 *
 * Two modes controlled by `isEdit`:
 *   - isEdit=false (default): new-submission path — uses RequestChangesBipSchema,
 *     calls requestChangesBipAction(bipId, note). bips.status → changes_requested.
 *   - isEdit=true: bip_edits path — uses RequestChangesEditSchema,
 *     calls requestChangesEditAction(editId, note). bip_edits.status → changes_requested.
 *
 * The action guard for requestChangesEditAction is status==='pending' ONLY (08-05).
 * The button is disabled in AdminActionsPanel when status!=='pending', so this
 * modal is only reachable from a pending edit — no mismatch risk.
 *
 * Next.js semantics: Both Server Actions call redirect() on success; useTransition
 * catches the NEXT_REDIRECT throw silently. Do NOT wrap in try/catch.
 */

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import {
  RequestChangesEditSchema,
  RequestChangesBipSchema,
  type RequestChangesEditInput,
  type RequestChangesBipInput,
} from '@/lib/schemas/bip-edits'
import {
  requestChangesEditAction,
  requestChangesBipAction,
} from '@/lib/actions/admin-edit-bips'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The bips.id — used in non-edit (new-submission) mode */
  bipId: string
  /** The bip_edits.id — used in edit mode (isEdit=true) */
  editId?: string
  bipTitle: string
  coordinatorName: string
  /** true → bip_edits path (requestChangesEditAction); false → bips path (requestChangesBipAction) */
  isEdit?: boolean
}

export function RequestChangesBipModal({
  open,
  onOpenChange,
  bipId,
  editId,
  bipTitle,
  coordinatorName,
  isEdit = false,
}: Props) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Always call both hooks (React rules); use each in its own JSX branch.
  const editForm = useForm<RequestChangesEditInput>({
    resolver: zodResolver(RequestChangesEditSchema),
    mode: 'onChange',
    defaultValues: { editId: editId ?? '', note: '' },
  })
  const submissionForm = useForm<RequestChangesBipInput>({
    resolver: zodResolver(RequestChangesBipSchema),
    mode: 'onChange',
    defaultValues: { bipId, note: '' },
  })

  // Individual watch calls — avoids union-type resolution issues on shared form ref.
  const editNoteValue: string = editForm.watch('note') ?? ''
  const submissionNoteValue: string = submissionForm.watch('note') ?? ''
  const editNoteError = editForm.formState.errors.note?.message
  const submissionNoteError = submissionForm.formState.errors.note?.message

  function handleEditConfirm(data: RequestChangesEditInput) {
    setServerError(null)
    startTransition(async () => {
      const result = await requestChangesEditAction(data.editId, data.note)
      // requestChangesEditAction redirects on success; we only reach here on { error }.
      if (result?.error) {
        setServerError(result.error)
        return
      }
      toast.success(
        `Changes requested. ${coordinatorName || 'Coordinator'} will be notified.`,
      )
      onOpenChange(false)
    })
  }

  function handleSubmissionConfirm(data: RequestChangesBipInput) {
    setServerError(null)
    startTransition(async () => {
      const result = await requestChangesBipAction(data.bipId, data.note)
      // requestChangesBipAction redirects on success; we only reach here on { error }.
      if (result?.error) {
        setServerError(result.error)
        return
      }
      toast.success(
        `Changes requested. ${coordinatorName || 'Coordinator'} will be notified.`,
      )
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-[22px] font-semibold text-ink">
            Request Changes
          </DialogTitle>
          <DialogDescription className="text-sm text-muted">
            You&apos;re about to request changes to:
          </DialogDescription>
        </DialogHeader>

        {/* Gold-border BIP callout — amber framing per UI-SPEC Surface 5 */}
        <div className="bg-bg-soft border-l-4 border-eu-gold rounded-r px-4 py-3 mb-4">
          <p className="text-sm font-semibold text-ink">{bipTitle || 'Untitled BIP'}</p>
        </div>

        {isEdit ? (
          <form
            onSubmit={editForm.handleSubmit(handleEditConfirm)}
            className="flex flex-col gap-2"
          >
            <Label
              htmlFor="request-changes-note"
              className="text-sm font-semibold text-ink"
            >
              Note for the coordinator (required)
            </Label>
            <Textarea
              id="request-changes-note"
              rows={4}
              maxLength={1000}
              {...editForm.register('note')}
              placeholder="Explain clearly what needs to change. The coordinator will see this note on their dashboard and in their email — be specific about what to revise."
              aria-invalid={!!editNoteError}
            />
            <p className="text-xs text-muted text-right">
              {editNoteValue.length}/1000 characters
            </p>
            {editNoteError ? (
              <p className="text-sm text-status-pending" role="alert">
                {editNoteError}
              </p>
            ) : null}
            <p className="text-sm text-muted">
              This note will appear on the coordinator&apos;s dashboard and in
              the notification email.
            </p>

            {serverError ? (
              <Alert variant="destructive" className="mt-3">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            ) : null}

            <DialogFooter className="mt-4 flex gap-3 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !editForm.formState.isValid}
                className="bg-status-pending text-white hover:bg-amber-700 rounded-pill px-5 py-2 font-semibold"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Requesting…
                  </>
                ) : (
                  'Request Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form
            onSubmit={submissionForm.handleSubmit(handleSubmissionConfirm)}
            className="flex flex-col gap-2"
          >
            <Label
              htmlFor="request-changes-note"
              className="text-sm font-semibold text-ink"
            >
              Note for the coordinator (required)
            </Label>
            <Textarea
              id="request-changes-note"
              rows={4}
              maxLength={1000}
              {...submissionForm.register('note')}
              placeholder="Explain clearly what needs to change. The coordinator will see this note on their dashboard and in their email — be specific about what to revise."
              aria-invalid={!!submissionNoteError}
            />
            <p className="text-xs text-muted text-right">
              {submissionNoteValue.length}/1000 characters
            </p>
            {submissionNoteError ? (
              <p className="text-sm text-status-pending" role="alert">
                {submissionNoteError}
              </p>
            ) : null}
            <p className="text-sm text-muted">
              This note will appear on the coordinator&apos;s dashboard and in
              the notification email.
            </p>

            {serverError ? (
              <Alert variant="destructive" className="mt-3">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            ) : null}

            <DialogFooter className="mt-4 flex gap-3 justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !submissionForm.formState.isValid}
                className="bg-status-pending text-white hover:bg-amber-700 rounded-pill px-5 py-2 font-semibold"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Requesting…
                  </>
                ) : (
                  'Request Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
