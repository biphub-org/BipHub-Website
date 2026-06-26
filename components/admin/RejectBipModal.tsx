'use client'

/**
 * RejectBipModal — admin rejection confirmation modal (ADMN-04 / 03-UI-SPEC.md).
 *
 * - Shows the BIP title verbatim in a red-bordered callout block.
 * - Required reason textarea: min 10, max 1000 (RejectBipSchema enforced
 *   client-side via RHF + zodResolver AND server-side via safeParse).
 * - Confirm Button is disabled until form is valid (`!form.formState.isValid`).
 * - Calls `rejectBipAction` (or `rejectEditAction` in edit mode) inside
 *   `useTransition`. On success the action redirects, so reaching the
 *   "toast.success + onOpenChange(false)" line implies redirect was queued
 *   but not yet flushed — the toast still appears on the destination page.
 * - On `{ error }`, surfaces a destructive Alert inside the modal.
 *
 * Phase 8 edit-mode extension (08-08-PLAN "small edit branch"):
 *   - isEdit=true + editId: title/button become "Reject Edit"; uses
 *     RejectEditSchema (field: `note`) and calls rejectEditAction(editId, note).
 *   - isEdit=false (default): title/button remain "Reject BIP"; uses
 *     RejectBipSchema (field: `reason`) and calls rejectBipAction(bipId, reason).
 *
 * Important Next.js semantics: Both actions call `redirect()` on success,
 * which throws a `NEXT_REDIRECT` Error. React's useTransition catches it
 * silently and performs the navigation. Do NOT wrap the call in a try/catch —
 * that would swallow the redirect.
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
import { RejectBipSchema, type RejectBipInput } from '@/lib/schemas/admin-bips'
import { RejectEditSchema, type RejectEditInput } from '@/lib/schemas/bip-edits'
import { rejectBipAction } from '@/lib/actions/admin-bips'
import { rejectEditAction } from '@/lib/actions/admin-edit-bips'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  bipId: string
  bipTitle: string
  coordinatorName: string
  /** Phase 8: true → shows "Reject Edit" and calls rejectEditAction(editId, note) */
  isEdit?: boolean
  /** Phase 8: required when isEdit=true; the bip_edits.id */
  editId?: string
}

export function RejectBipModal({
  open,
  onOpenChange,
  bipId,
  bipTitle,
  coordinatorName,
  isEdit = false,
  editId,
}: Props) {
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Always call both hooks (React rules); select which one is active at runtime.
  const submissionForm = useForm<RejectBipInput>({
    resolver: zodResolver(RejectBipSchema),
    mode: 'onChange',
    defaultValues: { bipId, reason: '' },
  })
  const editRejectForm = useForm<RejectEditInput>({
    resolver: zodResolver(RejectEditSchema),
    mode: 'onChange',
    defaultValues: { editId: editId ?? '', note: '' },
  })

  const reasonValue = submissionForm.watch('reason') ?? ''
  const noteValue = editRejectForm.watch('note') ?? ''
  const charCount = isEdit ? noteValue.length : reasonValue.length
  const fieldError = isEdit
    ? editRejectForm.formState.errors.note?.message
    : submissionForm.formState.errors.reason?.message

  function handleSubmissionConfirm(data: RejectBipInput) {
    setServerError(null)
    startTransition(async () => {
      const result = await rejectBipAction(data.bipId, data.reason)
      // rejectBipAction redirects on success; we only reach here on { error }.
      if (result?.error) {
        setServerError(result.error)
        return
      }
      // Success branch — only reachable if action ever changes to return success
      // without redirect; currently unreachable in normal flow.
      toast.success(
        `BIP rejected. Email sent to ${coordinatorName || 'the coordinator'}.`,
      )
      onOpenChange(false)
    })
  }

  function handleEditConfirm(data: RejectEditInput) {
    setServerError(null)
    startTransition(async () => {
      const result = await rejectEditAction(data.editId, data.note)
      // rejectEditAction redirects on success; we only reach here on { error }.
      if (result?.error) {
        setServerError(result.error)
        return
      }
      toast.success(
        `Edit rejected. Email sent to ${coordinatorName || 'the coordinator'}.`,
      )
      onOpenChange(false)
    })
  }

  const title = isEdit ? 'Reject Edit' : 'Reject BIP'
  const description = isEdit
    ? "You're about to reject this edit:"
    : "You're about to reject:"
  const confirmLabel = isEdit ? 'Reject Edit' : 'Reject BIP'
  const rejectingLabel = 'Rejecting…'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-[22px] font-semibold text-ink">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-bg-soft border-l-4 border-status-rejected rounded-r px-4 py-3 mb-4">
          <p className="text-base font-semibold text-ink">
            {bipTitle || 'Untitled BIP'}
          </p>
        </div>

        {isEdit ? (
          <form
            onSubmit={editRejectForm.handleSubmit(handleEditConfirm)}
            className="flex flex-col gap-2"
          >
            <Label
              htmlFor="reject-reason"
              className="text-sm font-semibold text-ink"
            >
              Reason (required, shown to the coordinator)
            </Label>
            <Textarea
              id="reject-reason"
              rows={4}
              maxLength={1000}
              {...editRejectForm.register('note')}
              placeholder="Explain what needs to change before this edit can be approved. Be specific — the coordinator will see this verbatim and use it to revise their submission."
              aria-invalid={!!fieldError}
            />
            <p className="text-xs text-muted text-right">
              {charCount}/1000 characters
            </p>
            {fieldError ? (
              <p className="text-sm text-status-rejected" role="alert">
                {fieldError}
              </p>
            ) : null}
            <p className="text-sm text-muted">
              This reason will be included in the rejection email and shown on
              the coordinator&apos;s dashboard.
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
                disabled={isPending || !editRejectForm.formState.isValid}
                className="bg-status-rejected text-white hover:bg-red-700 rounded-pill px-5 py-2 font-semibold"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    {rejectingLabel}
                  </>
                ) : (
                  confirmLabel
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
              htmlFor="reject-reason"
              className="text-sm font-semibold text-ink"
            >
              Reason (required, shown to the coordinator)
            </Label>
            <Textarea
              id="reject-reason"
              rows={4}
              maxLength={1000}
              {...submissionForm.register('reason')}
              placeholder="Explain what needs to change before this BIP can be approved. Be specific — the coordinator will see this verbatim and use it to revise their submission."
              aria-invalid={!!fieldError}
            />
            <p className="text-xs text-muted text-right">
              {charCount}/1000 characters
            </p>
            {fieldError ? (
              <p className="text-sm text-status-rejected" role="alert">
                {fieldError}
              </p>
            ) : null}
            <p className="text-sm text-muted">
              This reason will be included in the rejection email and shown on
              the coordinator&apos;s dashboard.
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
                className="bg-status-rejected text-white hover:bg-red-700 rounded-pill px-5 py-2 font-semibold"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    {rejectingLabel}
                  </>
                ) : (
                  confirmLabel
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
