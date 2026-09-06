'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useEffect, useState, useTransition, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'

type AlertsFilter = 'all' | 'on' | 'off'

const ALERT_OPTIONS: ReadonlyArray<{ value: AlertsFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'on', label: 'Alerts on' },
  { value: 'off', label: 'Alerts off' },
]

const PILL_BASE =
  'h-8 rounded-full border px-3 text-sm font-medium transition'
const PILL_ACTIVE = 'border-eu-blue bg-eu-blue-50 text-eu-blue'
const PILL_RESTING = 'border-border bg-white text-ink hover:bg-bg-soft'

export function StudentFilters({
  initialQ,
  initialAlerts,
}: {
  initialQ: string
  initialAlerts: AlertsFilter
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [q, setQ] = useState(initialQ)
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function pushParams(params: URLSearchParams) {
    const next = params.toString()
    startTransition(() => {
      router.push(next ? `${pathname}?${next}` : pathname)
    })
  }

  useEffect(() => {
    setQ(initialQ)
  }, [initialQ])

  // Debounced q sync (300ms)
  useEffect(() => {
    if (q === initialQ) return
    const id = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      const trimmed = q.trim()
      if (trimmed) params.set('q', trimmed)
      else params.delete('q')
      pushParams(params)
    }, 300)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, initialQ, searchParams, pathname, router])

  const setAlerts = (value: AlertsFilter) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') params.delete('alerts')
    else params.set('alerts', value)
    pushParams(params)
  }

  const clearAll = () => {
    setQ('')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('q')
    params.delete('alerts')
    pushParams(params)
  }

  const hasFilters = !!initialQ || initialAlerts !== 'all'

  return (
    <div className="border-b border-border bg-white px-6 py-4">
      <div className="mx-auto max-w-[1200px] flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5" role="group" aria-label="Filter by alert status">
            {ALERT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setAlerts(opt.value)}
                aria-pressed={initialAlerts === opt.value}
                className={cn(PILL_BASE, initialAlerts === opt.value ? PILL_ACTIVE : PILL_RESTING)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {hasFilters && (
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-muted hover:text-ink"
            >
              <X size={12} aria-hidden />
              Clear filters
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-[360px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const params = new URLSearchParams(searchParams.toString())
                const trimmed = q.trim()
                if (trimmed) params.set('q', trimmed)
                else params.delete('q')
                pushParams(params)
              }
              if (e.key === 'Escape') {
                setQ('')
                inputRef.current?.blur()
              }
            }}
            placeholder="Search by name, email or university"
            className="h-9 rounded-full border-border bg-white pl-9 pr-9 text-sm"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              aria-label="Clear search"
            >
              <X size={16} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
