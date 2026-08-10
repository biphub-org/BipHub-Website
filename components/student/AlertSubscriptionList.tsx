'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { updateSubscriptionAction, deleteSubscriptionAction } from '@/lib/actions/bip-subscriptions'
import { ISCED_FIELD_BY_ID } from '@/lib/isced'
import { getCountryName } from '@/lib/countries'

type Sub = {
  id: string
  field: string | null
  country: string | null
  frequency: string
  created_at: string
}

function fieldLabel(id: string | null): string | null {
  if (!id) return null
  const entry = (ISCED_FIELD_BY_ID as Record<string, { label: string }>)[id]
  if (entry?.label) return entry.label
  return id.charAt(0).toUpperCase() + id.slice(1)
}

function countryLabel(code: string | null): string | null {
  if (!code) return null
  return getCountryName(code)
}

export function AlertSubscriptionList({ subscriptions }: { subscriptions: Sub[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const confirmSub = confirmId ? subscriptions.find((s) => s.id === confirmId) ?? null : null

  if (subscriptions.length === 0) {
    return <p className="text-sm text-muted">No alert subscriptions yet. Create one above.</p>
  }

  return (
    <ul className="flex flex-col gap-3">
      {subscriptions.map((sub) => (
        <li key={sub.id} className="rounded-lg border border-border bg-white p-4 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-ink">
              {fieldLabel(sub.field) ? `Field: ${fieldLabel(sub.field)}` : ''} {fieldLabel(sub.field) && countryLabel(sub.country) ? ' · ' : ''} {countryLabel(sub.country) ? `Country: ${countryLabel(sub.country)}` : ''}
              {!sub.field && !sub.country ? 'Alert' : ''}
            </p>
            <span className="text-xs px-2 py-1 rounded-full bg-eu-blue-50 text-eu-blue capitalize">{sub.frequency}</span>
          </div>
          <div className="flex gap-2">
            <select
              value={sub.frequency}
              onChange={(e) =>
                startTransition(async () => {
                  const res = await updateSubscriptionAction(sub.id, e.target.value)
                  if (res && 'error' in res && res.error) toast.error(res.error)
                  else {
                    toast.success('Frequency updated')
                    router.refresh()
                  }
                })
              }
              disabled={isPending}
              className="rounded-md border border-border bg-white px-2 py-1 text-xs"
            >
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
            </select>
            <Button
              variant="secondary"
              size="sm"
              disabled={isPending}
              onClick={() => setConfirmId(sub.id)}
            >
              Delete
            </Button>
          </div>
        </li>
      ))}
      <Dialog open={!!confirmId} onOpenChange={(open) => { if (!open) setConfirmId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete alert?</DialogTitle>
            <DialogDescription className="text-ink-2">
              {confirmSub
                ? `This will stop ${confirmSub.frequency} digests for ${[fieldLabel(confirmSub.field) && `field ${fieldLabel(confirmSub.field)}`, countryLabel(confirmSub.country) && `country ${countryLabel(confirmSub.country)}`].filter(Boolean).join(' · ') || 'this alert'}. You can recreate it anytime.`
                : 'This will delete the alert and stop future digests.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-white border-0">
            <Button variant="outline" onClick={() => setConfirmId(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  if (!confirmSub) return
                  const res = await deleteSubscriptionAction(confirmSub.id)
                  if (res && 'error' in res && res.error) toast.error(res.error)
                  else {
                    toast.success('Alert deleted')
                    setConfirmId(null)
                    router.refresh()
                  }
                })
              }
            >
              {isPending ? 'Deleting…' : 'Delete alert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ul>
  )
}
