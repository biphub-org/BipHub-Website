'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { ISCED_FIELDS } from '@/lib/isced'
import { ERASMUS_COUNTRIES } from '@/lib/countries'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'

type FilterState = {
  country?: string[]
  field?: string[]
  lang?: string[]
  dateFrom?: string
  dateTo?: string
  availability?: 'open' | 'closed' | 'any'
  level?: string[]
  partnerOnly?: 'exclude' | 'only'
}

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'German' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'it', label: 'Italian' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'sv', label: 'Swedish' },
] as const

const AVAILABILITY_OPTIONS = [
  { value: 'any', label: 'Any time' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
] as const

const LEVELS = ['bachelor', 'master', 'phd'] as const

function FilterDropdown({
  label,
  active,
  count,
  children,
}: {
  label: string
  active?: boolean
  count?: number
  children: React.ReactNode
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 rounded-full border px-3 text-sm font-medium gap-1.5 ${active ? 'border-eu-blue bg-eu-blue-50 text-eu-blue' : 'border-border bg-white text-ink hover:bg-bg-soft'}`}
          >
            {label}
            {count ? (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-eu-gold px-1 text-[10px] font-bold text-ink">
                {count}
              </span>
            ) : null}
            <ChevronDown size={14} className="opacity-60" aria-hidden />
          </Button>
        }
      />
      <PopoverContent className="w-[280px] p-3 max-h-[380px] overflow-y-auto" align="start">
        {children}
      </PopoverContent>
    </Popover>
  )
}

export function AdminBipsTopFilters({ filters, basePath }: { filters: FilterState; basePath: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  const update = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params)
    if (value === undefined || value === '') next.delete(key)
    else next.set(key, value)
    next.delete('page')
    startTransition(() => {
      router.push(next.toString() ? `${basePath}?${next}` : basePath)
    })
  }

  const toggleArray = (key: string, value: string, current: string[] | undefined) => {
    const set = new Set(current ?? [])
    if (set.has(value)) set.delete(value)
    else set.add(value)
    update(key, set.size === 0 ? undefined : Array.from(set).join(','))
  }

  const hasAnyActive =
    !!filters.country?.length ||
    !!filters.field?.length ||
    !!filters.lang?.length ||
    !!filters.dateFrom ||
    !!filters.dateTo ||
    (!!filters.availability && filters.availability !== 'any') ||
    !!filters.level?.length ||
    !!filters.partnerOnly

  return (
    <div className="border-b border-border bg-white px-6 py-3">
      <div className="mx-auto max-w-[1200px] flex flex-wrap items-center gap-2">
        {/* Country */}
        <FilterDropdown label="Country" active={!!filters.country?.length} count={filters.country?.length}>
          <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
            {[...ERASMUS_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
              <label key={c.code} className="flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-bg-soft">
                <input
                  type="checkbox"
                  checked={filters.country?.includes(c.code.toLowerCase()) ?? false}
                  onChange={() => toggleArray('country', c.code.toLowerCase(), filters.country)}
                  className="w-4 h-4 accent-eu-blue"
                />
                <span className="text-sm">{c.name}</span>
              </label>
            ))}
          </div>
        </FilterDropdown>

        {/* Field */}
        <FilterDropdown label="Field" active={!!filters.field?.length} count={filters.field?.length}>
          <div className="space-y-1">
            {[...ISCED_FIELDS].sort((a, b) => a.label.localeCompare(b.label)).map((f) => (
              <label key={f.id} className="flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-bg-soft">
                <input
                  type="checkbox"
                  checked={filters.field?.includes(f.id) ?? false}
                  onChange={() => toggleArray('field', f.id, filters.field)}
                  className="w-4 h-4 accent-eu-blue"
                />
                <span className="text-sm">{f.label}</span>
              </label>
            ))}
          </div>
        </FilterDropdown>

        {/* Language */}
        <FilterDropdown label="Language" active={!!filters.lang?.length} count={filters.lang?.length}>
          <div className="space-y-1">
            {LANGS.map((l) => (
              <label key={l.code} className="flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-bg-soft">
                <input
                  type="checkbox"
                  checked={filters.lang?.includes(l.code) ?? false}
                  onChange={() => toggleArray('lang', l.code, filters.lang)}
                  className="w-4 h-4 accent-eu-blue"
                />
                <span className="text-sm">{l.label}</span>
              </label>
            ))}
          </div>
        </FilterDropdown>

        {/* Dates */}
        <FilterDropdown label="Dates" active={!!filters.dateFrom || !!filters.dateTo}>
          <div className="space-y-3 p-1">
            <div>
              <label className="text-xs text-muted block mb-1">From</label>
              <input
                type="date"
                value={filters.dateFrom ?? ''}
                onChange={(e) => update('dateFrom', e.target.value || undefined)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md focus-visible:ring-2 focus-visible:ring-eu-blue outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-muted block mb-1">To</label>
              <input
                type="date"
                value={filters.dateTo ?? ''}
                onChange={(e) => update('dateTo', e.target.value || undefined)}
                className="w-full px-3 py-2 text-sm border border-border rounded-md focus-visible:ring-2 focus-visible:ring-eu-blue outline-none"
              />
            </div>
          </div>
        </FilterDropdown>

        {/* Availability */}
        <FilterDropdown label="Availability" active={!!filters.availability && filters.availability !== 'any'}>
          <div className="space-y-1">
            {AVAILABILITY_OPTIONS.map((o) => (
              <label key={o.value} className="flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-bg-soft">
                <input
                  type="radio"
                  name="availability"
                  checked={(filters.availability ?? 'any') === o.value}
                  onChange={() => update('availability', o.value === 'any' ? undefined : o.value)}
                  className="w-4 h-4 accent-eu-blue"
                />
                <span className="text-sm capitalize">{o.label}</span>
              </label>
            ))}
          </div>
        </FilterDropdown>

        {/* Level */}
        <FilterDropdown label="Level" active={!!filters.level?.length} count={filters.level?.length}>
          <div className="space-y-1">
            {LEVELS.map((l) => (
              <label key={l} className="flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-bg-soft">
                <input
                  type="checkbox"
                  checked={filters.level?.includes(l) ?? false}
                  onChange={() => toggleArray('level', l, filters.level)}
                  className="w-4 h-4 accent-eu-blue"
                />
                <span className="text-sm capitalize">{l}</span>
              </label>
            ))}
          </div>
        </FilterDropdown>

        {/* Access */}
        <FilterDropdown label="Access" active={!!filters.partnerOnly}>
          <div className="space-y-1">
            <label className="flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-bg-soft">
              <input
                type="radio"
                name="partnerOnly"
                checked={!filters.partnerOnly}
                onChange={() => update('partnerOnly', undefined)}
                className="w-4 h-4 accent-eu-blue"
              />
              <span className="text-sm">Show all</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-bg-soft">
              <input
                type="radio"
                name="partnerOnly"
                checked={filters.partnerOnly === 'exclude'}
                onChange={() => update('partnerOnly', 'exclude')}
                className="w-4 h-4 accent-eu-blue"
              />
              <span className="text-sm">Hide partner-only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-bg-soft">
              <input
                type="radio"
                name="partnerOnly"
                checked={filters.partnerOnly === 'only'}
                onChange={() => update('partnerOnly', 'only')}
                className="w-4 h-4 accent-eu-blue"
              />
              <span className="text-sm">Only partner-only</span>
            </label>
          </div>
        </FilterDropdown>

        {hasAnyActive && (
          <button
            onClick={() => router.push(basePath)}
            className="ml-1 inline-flex items-center gap-1 text-xs text-muted hover:text-ink underline"
          >
            <X size={12} aria-hidden /> Clear all
          </button>
        )}
      </div>
    </div>
  )
}
