'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createSubscriptionAction } from '@/lib/actions/bip-subscriptions'
import { ALERT_CONSENT_TEXT } from '@/lib/constants/bip-alerts'
import { ISCED_FIELDS } from '@/lib/isced'
import { ERASMUS_COUNTRIES } from '@/lib/countries'

export function AlertSubscriptionForm() {
  const router = useRouter()
  const [field, setField] = useState('')
  const [country, setCountry] = useState('')
  const [frequency, setFrequency] = useState<'weekly' | 'daily'>('weekly')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await createSubscriptionAction({ field: field || undefined, country: country || undefined, frequency })
      if ('error' in res && res.error) {
        toast.error(res.error)
      } else {
        toast.success('Alert subscription created')
        setField('')
        setCountry('')
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-white p-5 flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-ink">New alert</h3>
      <p className="text-xs text-muted">Choose a field and/or country. At least one is required. You’ll get a digest at your chosen frequency.</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink">Field of study</span>
          <select
            value={field}
            onChange={(e) => setField(e.target.value)}
            className="rounded-md border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="">Any field</option>
            {ISCED_FIELDS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink">Country</span>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-md border border-border bg-white px-3 py-2 text-sm">
            <option value="">Any country</option>
            {ERASMUS_COUNTRIES.map((c: { code: string; name: string }) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="frequency" value="weekly" checked={frequency === 'weekly'} onChange={() => setFrequency('weekly')} />
          Weekly (default)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="frequency" value="daily" checked={frequency === 'daily'} onChange={() => setFrequency('daily')} />
          Daily
        </label>
      </fieldset>

      <p className="text-[11px] text-muted leading-relaxed border rounded-md bg-bg-soft p-3">{ALERT_CONSENT_TEXT}</p>

      <Button type="submit" disabled={isPending} variant="primary" size="md">
        {isPending ? 'Creating…' : 'Create alert'}
      </Button>
    </form>
  )
}
