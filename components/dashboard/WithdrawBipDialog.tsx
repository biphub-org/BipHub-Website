'use client'

/**
 * Withdraw-BIP confirmation modal (DASH-06).
 *
 * Withdrawing a pending BIP moves it back to draft so the coordinator can
 * keep editing. Reversible — uses status-pending (amber) styling, NOT the
 * destructive red used for delete.
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
import { withdrawBipAction } from '@/lib/actions/bip-status'

interface Props {
  open: boolean
  onOpenChange: (next: boolean) => void
  bipId: string
  bipTitle: string
}

export function WithdrawBipDialog({ open, onOpenChange, bipId, bipTitle }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await withdrawBipAction(bipId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('BIP withdrawn back to draft.')
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw from review?</DialogTitle>
          <DialogDescription>
            &ldquo;{bipTitle || 'Untitled BIP'}&rdquo; will be moved back to Draft. You
            can re-submit it after making edits.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Keep pending
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-status-pending text-white hover:bg-status-pending/90"
          >
            {isPending ? 'Withdrawing…' : 'Withdraw BIP'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
