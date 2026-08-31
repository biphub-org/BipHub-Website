'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { saveAlertPreferencesAction, clearAlertPreferencesAction } from '@/lib/actions/bip-subscriptions'
import { ALERT_CONSENT_TEXT } from '@/lib/constants/bip-alerts'
import { ISCED_FIELDS } from '@/lib/isced'
import { ISCED_CODES } from '@/lib/isced-codes'
import { ERASMUS_COUNTRIES } from '@/lib/countries'
import { CountryFlag } from '@/components/ui/country-flag'

type InitialPrefs = {
  fields: string[]
  countries: string[]
  iscedCodes: string[]
  frequency: string
} | null

export function AlertPreferencesForm({ initial }: { initial: InitialPrefs }) {
  const router = useRouter()
  const [fields, setFields] = useState<string[]>(initial?.fields ?? [])
  const [countries, setCountries] = useState<string[]>(initial?.countries ?? [])
  const [iscedCodes, setIscedCodes] = useState<string[]>(initial?.iscedCodes ?? [])
  const [iscedQuery, setIscedQuery] = useState('')
  const [frequency, setFrequency] = useState<'weekly' | 'daily'>(
    (initial?.frequency as 'weekly' | 'daily') ?? 'weekly',
  )
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setFields(initial?.fields ?? [])
    setCountries(initial?.countries ?? [])
    setIscedCodes(initial?.iscedCodes ?? [])
    setFrequency((initial?.frequency as 'weekly' | 'daily') ?? 'weekly')
  }, [initial])

  function toggleField(id: string) {
    setFields((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function toggleCountry(code: string) {
    const upper = code.toUpperCase()
    setCountries((prev) => (prev.includes(upper) ? prev.filter((x) => x !== upper) : [...prev, upper]))
  }

  function toggleIsced(code: string) {
    setIscedCodes((prev) => (prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]))
  }

  const filteredIsced = useMemo(() => {
    const q = iscedQuery.trim().toLowerCase()
    if (!q) return ISCED_CODES
    return ISCED_CODES.filter((c) => c.code.toLowerCase().includes(q) || c.label.toLowerCase().includes(q))
  }, [iscedQuery])

  const hasSelection = fields.length > 0 || countries.length > 0 || iscedCodes.length > 0

  function handleApply() {
    if (!hasSelection) {
      toast.error('Choose at least one field, country or ISCED code')
      return
    }
    startTransition(async () => {
      const res = await saveAlertPreferencesAction({ fields, countries, iscedCodes, frequency })
      if ('error' in res && res.error) toast.error(res.error)
      else {
        toast.success('Alert preferences saved')
        router.refresh()
      }
    })
  }

  function handleClear() {
    if (!initial) return
    startTransition(async () => {
      const res = await clearAlertPreferencesAction()
      if ('error' in res && res.error) toast.error(res.error)
      else {
        toast.success('Alerts cleared')
        setFields([])
        setCountries([])
        setIscedCodes([])
        setIscedQuery('')
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Countries — first */}
      <div>
        <h3 className="text-sm font-semibold text-ink">Countries</h3>
        <p className="mt-1 text-xs text-muted">Select any number — leave empty if you only want field or ISCED alerts.</p>
        <div className="mt-3 max-h-[240px] overflow-auto rounded-md border border-border bg-white p-2">
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {ERASMUS_COUNTRIES.map((c) => {
              const checked = countries.includes(c.code)
              return (
                <label key={c.code} className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer ${checked ? 'bg-eu-blue-50 text-eu-blue' : 'hover:bg-bg-soft text-ink'}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCountry(c.code)}
                    className="h-4 w-4 accent-eu-blue"
                  />
                  <CountryFlag code={c.code} width={18} />
                  <span>{c.name}</span>
                  <span className="ml-auto text-xs text-muted">{c.code}</span>
                </label>
              )
            })}
          </div>
        </div>
        {countries.length > 0 && (
          <p className="mt-2 text-xs text-muted">{countries.length} {countries.length === 1 ? 'country' : 'countries'} selected</p>
        )}
      </div>

      {/* 2. Fields of study — second */}
      <div>
        <h3 className="text-sm font-semibold text-ink">Fields of study</h3>
        <p className="mt-1 text-xs text-muted">BipHub 12 categories — select any number.</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ISCED_FIELDS.map((f) => {
            const checked = fields.includes(f.id)
            return (
              <label key={f.id} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${checked ? 'border-eu-blue bg-eu-blue-50 text-eu-blue' : 'border-border bg-white text-ink hover:bg-bg-soft'}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleField(f.id)}
                  className="h-4 w-4 accent-eu-blue"
                />
                <span className="text-sm">{f.label}</span>
              </label>
            )
          })}
        </div>
      </div>

      {/* 3. ISCED codes — third, searchable 174 */}
      <div>
        <h3 className="text-sm font-semibold text-ink">ISCED codes</h3>
        <p className="mt-1 text-xs text-muted">Detailed ISCED-F 2013 codes (e.g. 0613) — search by code or label, select any number.</p>
        <div className="mt-3 flex flex-col gap-2">
          <Input
            placeholder="Search ISCED codes… (e.g. 0613 or Software)"
            value={iscedQuery}
            onChange={(e) => setIscedQuery(e.target.value)}
            className="h-9"
          />
          <div className="max-h-[260px] overflow-auto rounded-md border border-border bg-white p-2">
            <div className="flex flex-col gap-1">
              {filteredIsced.map((c) => {
                const checked = iscedCodes.includes(c.code)
                return (
                  <label key={c.code} className={`flex items-start gap-2 rounded px-2 py-1.5 text-sm cursor-pointer ${checked ? 'bg-eu-blue-50 text-eu-blue' : 'hover:bg-bg-soft text-ink'}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleIsced(c.code)}
                      className="mt-0.5 h-4 w-4 accent-eu-blue"
                    />
                    <span className="font-mono text-xs font-semibold shrink-0 pt-0.5">{c.code}</span>
                    <span className="text-sm leading-snug">{c.label}</span>
                  </label>
                )
              })}
              {filteredIsced.length === 0 && (
                <p className="px-2 py-3 text-center text-sm text-muted">No ISCED codes match &quot;{iscedQuery}&quot;</p>
              )}
            </div>
          </div>
          <p className="text-xs text-muted">{iscedCodes.length} selected · {filteredIsced.length} of {ISCED_CODES.length} shown</p>
        </div>
      </div>

      <fieldset className="flex gap-4">
        <legend className="sr-only">Frequency</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="alert-frequency" value="weekly" checked={frequency === 'weekly'} onChange={() => setFrequency('weekly')} />
          Weekly (default)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="frequency" value="daily" checked={frequency === 'daily'} onChange={() => setFrequency('daily')} />
          Daily
        </label>
      </fieldset>

      <p className="text-[11px] text-muted leading-relaxed border rounded-md bg-bg-soft p-3">{ALERT_CONSENT_TEXT}</p>

      <div className="flex gap-2">
        <Button onClick={handleApply} disabled={isPending} variant="primary" size="md" className="flex-1">
          {isPending ? 'Saving…' : 'Apply'}
        </Button>
        {initial && (
          <Button onClick={handleClear} disabled={isPending} variant="outline" size="md">
            Clear alerts
          </Button>
        )}
      </div>
      {!hasSelection && <p className="text-xs text-amber-600">Choose at least one field, country or ISCED code before applying.</p>}
    </div>
  )
}
