'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useEffect, useState, useTransition, useRef } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'
import { ERASMUS_COUNTRIES } from '@/lib/countries'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export function CoordinatorFilters({
  initialQ,
  initialCountry,
}: {
  initialQ: string
  initialCountry: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [q, setQ] = useState(initialQ)
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

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
      const next = params.toString()
      startTransition(() => {
        router.push(next ? `${pathname}?${next}` : pathname)
      })
    }, 300)
    return () => clearTimeout(id)
  }, [q, initialQ, searchParams, pathname, router])

  const hasCountry = initialCountry.length > 0

  const toggleCountry = (code: string) => {
    const set = new Set(initialCountry)
    if (set.has(code)) set.delete(code)
    else set.add(code)
    const params = new URLSearchParams(searchParams.toString())
    if (set.size === 0) params.delete('country')
    else params.set('country', Array.from(set).join(','))
    const next = params.toString()
    startTransition(() => {
      router.push(next ? `${pathname}?${next}` : pathname)
    })
  }

  const clearAll = () => {
    setQ('')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('q')
    params.delete('country')
    const next = params.toString()
    startTransition(() => {
      router.push(next ? `${pathname}?${next}` : pathname)
    })
  }

  const hasFilters = !!initialQ || hasCountry

  return (
    <div className="border-b border-border bg-white px-6 py-4">
      <div className="mx-auto max-w-[1200px] flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {/* Country popover */}
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-8 rounded-full border px-3 text-sm font-medium gap-1.5 ${hasCountry ? 'border-eu-blue bg-eu-blue-50 text-eu-blue' : 'border-border bg-white text-ink hover:bg-bg-soft'}`}
                >
                  Country
                  {hasCountry ? (
                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-eu-gold px-1 text-[10px] font-bold text-ink">
                      {initialCountry.length}
                    </span>
                  ) : null}
                  <ChevronDown size={14} className="opacity-60" aria-hidden />
                </Button>
              }
            />
            <PopoverContent className="w-[300px] p-3 max-h-[380px] overflow-y-auto" align="start">
              <p className="mb-2 text-xs font-semibold text-muted uppercase tracking-wide">Filter by university country</p>
              <div className="flex flex-col gap-1">
                {ERASMUS_COUNTRIES.map((c) => {
                  const active = initialCountry.includes(c.code)
                  return (
                    <label key={c.code} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-bg-soft cursor-pointer">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleCountry(c.code)}
                        className="h-4 w-4 accent-eu-blue"
                      />
                      <span className="flex-1 truncate text-ink">{c.name}</span>
                      <span className="text-xs text-muted">{c.code}</span>
                    </label>
                  )
                })}
              </div>
              {hasCountry && (
                <button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString())
                    params.delete('country')
                    const next = params.toString()
                    startTransition(() => router.push(next ? `${pathname}?${next}` : pathname))
                  }}
                  className="mt-3 text-xs font-medium text-eu-blue hover:underline"
                >
                  Clear country
                </button>
              )}
            </PopoverContent>
          </Popover>

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
                const next = params.toString()
                startTransition(() => router.push(next ? `${pathname}?${next}` : pathname))
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
