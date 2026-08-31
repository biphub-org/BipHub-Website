'use client'

import { useRouter } from 'next/navigation'
import type { BipFilterState } from '@/lib/filters/parseSearchParams'
import { ISCED_FIELDS } from '@/lib/isced'
import { getCountryName } from '@/lib/countries'
import { IconX } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'

export function ClearFiltersButton() {
  const router = useRouter()
  return (
    <Button onClick={() => router.push('/bips')}>Clear filters</Button>
  )
}

export function BipFilterChips({ filters }: { filters: BipFilterState }) {
  const router = useRouter()

  const removeKey = (key: keyof BipFilterState, value?: string) => {
    const params = new URLSearchParams(window.location.search)
    if (value !== undefined && Array.isArray(filters[key])) {
      const next = (filters[key] as string[]).filter((v) => v !== value)
      if (next.length === 0) params.delete(key)
      else params.set(key, next.join(','))
    } else {
      params.delete(key)
    }
    router.push(params.toString() ? `/bips?${params}` : '/bips')
  }

  const chips: Array<{ key: keyof BipFilterState; value?: string; label: string }> = []
  filters.country?.forEach((c) =>
    chips.push({ key: 'country', value: c, label: getCountryName(c.toUpperCase()) }),
  )
  filters.field?.forEach((f) => {
    const def = ISCED_FIELDS.find((x) => x.id === f)
    if (def) chips.push({ key: 'field', value: f, label: def.label })
  })
  filters.lang?.forEach((l) =>
    chips.push({ key: 'lang', value: l, label: l.toUpperCase() }),
  )
  if (filters.status && filters.status !== 'any') {
    chips.push({ key: 'status', label: filters.status === 'open' ? 'Open' : 'Closed' })
  }
  filters.level?.forEach((l) =>
    chips.push({ key: 'level', value: l, label: l[0].toUpperCase() + l.slice(1) }),
  )
  if (filters.q) chips.push({ key: 'q', label: `"${filters.q}"` })

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c, i) => (
        <button
          key={i}
          onClick={() => removeKey(c.key, c.value)}
          className="inline-flex items-center gap-1 rounded-pill bg-eu-blue-50 text-eu-blue text-xs font-semibold px-3 py-1.5 hover:bg-eu-blue-100"
        >
          {c.label}
          <IconX size={14} aria-hidden="true" />
          <span className="sr-only">Remove filter</span>
        </button>
      ))}
      <button
        onClick={() => router.push('/bips')}
        className="text-xs text-muted hover:text-ink underline ml-2"
      >
        Clear all
      </button>
    </div>
  )
}
