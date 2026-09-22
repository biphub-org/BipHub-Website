'use client'

/**
 * RemoveUserSection — danger-zone card + confirmation modal for admin
 * removal of a student or coordinator account.
 *
 * Calls `removeUserAction` inside `useTransition`. On `{ error }` surfaces a
 * destructive Alert inside the modal; on `{ success }` toasts and navigates
 * back to the directory list (`returnTo`).
 *
 * Consequences (match the `admin_delete_user` RPC, 00057):
 *   - approved BIPs by this user are anonymized (kept in the directory)
 *   - their non-public BIPs are permanently deleted
 *   - saved BIPs, subscriptions and alert preferences are removed
 *   - the action cannot be undone
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { removeUserAction } from '@/lib/actions/admin-users'

interface Props {
  userId: string
  displayName: string
  email: string | null
  kind: 'student' | 'coordinator'
  returnTo: '/admin/students' | '/admin/coordinators'
}

export function RemoveUserSection({ userId, displayName, email, kind, returnTo }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    setServerError(null)
    startTransition(async () => {
      const result = await removeUserAction(userId)
      if (result?.error) {
        setServerError(result.error)
        return
      }
      toast.success(`${displayName} has been removed.`)
      setOpen(false)
      router.push(returnTo)
      router.refresh()
    })
  }

  return (
    <>
      <div className="rounded-md border border-red-200 bg-white p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <Trash2 size={16} className="text-red-600" aria-hidden />
          Danger zone
        </h2>
        <p className="mt-1 text-sm text-muted">
          Permanently remove this {kind} account. Their approved BIPs stay in
          the directory with contact details removed; everything else is deleted.
        </p>
        <Button
          variant="destructive"
          className="mt-4"
          onClick={() => {
            setServerError(null)
            setOpen(true)
          }}
        >
          Remove user
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[22px] font-semibold text-ink">
              Remove user
            </DialogTitle>
            <DialogDescription>
              Remove <span className="font-semibold text-ink">{displayName}</span>
              {email ? (
                <>
                  {' '}({email})
                </>
              ) : null}{' '}
              from BipHub? This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <ul className="list-disc space-y-1 rounded-md bg-bg-soft px-4 py-3 pl-9 text-sm text-muted">
            <li>Their approved BIPs stay listed, with contact details removed.</li>
            <li>Their draft, pending and rejected BIPs are permanently deleted.</li>
            <li>Their saved BIPs, subscriptions and alert preferences are removed.</li>
          </ul>

          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
              {isPending && <Loader2 size={14} className="animate-spin" aria-hidden />}
              Remove user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
