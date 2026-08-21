'use client'

/**
 * TwoTabConflictDialog — non-dismissible conflict resolution modal (SUBM-06).
 *
 * Surfaces when `saveDraftAction` returns `{ error: 'conflict' }` (optimistic
 * lock mismatch on `updated_at`). Plumbed in via the wizard's
 * `renderConflictDialog` render-prop slot.
 *
 * Non-dismissible behaviour (UI-SPEC line 250-260):
 *   - Escape key, outside-click, and the X button are all blocked. The user
 *     MUST pick Reload (loses local changes, picks up the other tab's state)
 *     or Overwrite (wins the race, the other tab's changes are lost).
 *
 * Implementation note: the dialog primitives in `components/ui/dialog.tsx`
 * wrap `@base-ui/react/dialog` (NOT Radix). The Radix-style props
 * `onEscapeKeyDown` / `onPointerDownOutside` / `onInteractOutside` do not
 * exist on @base-ui's `<Popup>` — the equivalent contract is:
 *   - `disablePointerDismissal={true}` on `<Dialog>` blocks outside-click.
 *   - Intercepting `onOpenChange(next, eventDetails)` lets us cancel the
 *     escape-key path via `eventDetails.cancel()` and the X-button path
 *     similarly. `eventDetails.reason` carries `'escapeKey'`,
 *     `'outsidePress'`, `'closePress'`.
 *   - `showCloseButton={false}` removes the X button entirely so users
 *     cannot close via the chrome.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  onReload: () => void
  onOverwrite: () => void
}

export function TwoTabConflictDialog({ open, onReload, onOverwrite }: Props) {
  return (
    <Dialog
      open={open}
      // Block all built-in dismiss paths. The dialog can only close because
      // the wizard reset `conflictOpen` after Reload or Overwrite handlers ran.
      disablePointerDismissal
      onOpenChange={(next, eventDetails) => {
        // If anything tries to *close* the dialog (escape, outside, X click),
        // cancel the event. Internal opens (next === true) flow through.
        if (next === false) {
          // Equivalent of Radix `onEscapeKeyDown(e => e.preventDefault())`
          // and `onPointerDownOutside(e => e.preventDefault())` —
          // see file-level comment for the API mapping.
          eventDetails.cancel()
        }
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Draft updated in another tab</DialogTitle>
          <DialogDescription>
            Your draft was changed in another browser tab. What would you like to do?
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            onClick={onReload}
            variant="primary"
            className="w-full"
          >
            Reload to get latest
          </Button>
          <Button
            type="button"
            onClick={onOverwrite}
            variant="ghost"
            // red-700 (#b91c1c ≈ 5.9:1 on white) instead of status-rejected
            // (#dc2626 ≈ 4.5:1, only just clears AA) so the destructive label
            // stays comfortably legible now the grey footer band is gone.
            className="w-full text-red-700 hover:bg-red-50 hover:text-red-800"
          >
            Overwrite with this version
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
