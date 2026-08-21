'use client'

/**
 * Delete-draft confirmation modal (DASH-04).
 *
 * Calls `deleteDraftAction` inside `useTransition`. Errors render via
 * `toast.error`; success closes the dialog and `revalidatePath('/dashboard')`
 * (server-side) refreshes the list.
 */

import { useTransition } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { deleteDraftAction } from '@/lib/actions/bip-status'

interface Props {
  open: boolean
  onOpenChange: (next: boolean) => void
  bipId: string
  bipTitle: string
}

export function DeleteDraftDialog({ open, onOpenChange, bipId, bipTitle }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteDraftAction(bipId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Draft deleted.')
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this draft?</DialogTitle>
          <DialogDescription>
            This will permanently delete &ldquo;{bipTitle || 'Untitled BIP'}&rdquo;. This
            cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Keep draft
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-status-rejected text-white hover:bg-status-rejected/90"
          >
            {isPending ? 'Deleting…' : 'Delete draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
