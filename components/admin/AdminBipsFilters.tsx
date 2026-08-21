'use client'

/**
 * AdminBipsFilters — URL-synced filter chrome for /admin/bips
 * (D-19 / ADMN-06 / 03-UI-SPEC.md All-Listings Contract).
 *
 * Six status tabs (All / Draft / Pending / Approved / Rejected / Changes Requested)
 * plus a free-text search input. Tab state is reflected in `?status=...`
 * (with `all` clearing the param for clean URLs). Search input is
 * debounced 300ms (matches Phase 1 BipSearchBar pattern) and reflected
 * in `?q=...`.
 *
 * Improvements (Phase 12 pre-13):
 *  - Adds missing `changes_requested` tab (5 → 6, was a gap after Phase 8)
 *  - Line variant tabs for admin clarity (underline active, not muted pill)
 *  - Search syncs with initialQ on back/forward; clear-X inside input;
 *    Enter flushes debounce; Clear filters pill when any filter active
 *  - Sticky, backdrop-blur bar with subtle shadow; scrollable tabs on mobile
 *  - Uses EU palette only (ink/eu-blue/border), no purple/aurora/glass
 *
 * Server component reads the same searchParams and re-queries via
 * getAdminBips — the client just steers navigation, never holds the
 * canonical data.
 */

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useEffect, useState, useTransition, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'changes_requested', label: 'Changes requested' },
] as const

type StatusTabValue = (typeof STATUS_TABS)[number]['value']

interface Props {
  initialStatus: StatusTabValue
  initialQ: string
}

export function AdminBipsFilters({ initialStatus, initialQ }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [q, setQ] = useState(initialQ)
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep local q in sync when URL changes via back/forward or external
  // navigation (without this, typing "foo" then clicking a tab would leave
  // the input stale after the router push).
  useEffect(() => {
    setQ(initialQ)
  }, [initialQ])

  // Debounced search update (300ms — matches Phase 1 BipSearchBar)
  useEffect(() => {
    // Skip the initial render if q matches the URL — prevents a
    // redundant push on mount that would add a history entry.
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
    // We deliberately only react to the user's typed value; `searchParams`
    // is a moving target that would force-flush the debouncer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  function handleStatusChange(next: string | number | null) {
    if (next === null) return
    const value = String(next)
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all') params.delete('status')
    else params.set('status', value)
    const queryStr = params.toString()
    startTransition(() => {
      router.push(queryStr ? `${pathname}?${queryStr}` : pathname)
    })
  }

  function clearSearch() {
    setQ('')
    inputRef.current?.focus()
    const params = new URLSearchParams(searchParams.toString())
    params.delete('q')
    const next = params.toString()
    startTransition(() => {
      router.push(next ? `${pathname}?${next}` : pathname, { scroll: false })
    })
  }

  function clearAllFilters() {
    setQ('')
    startTransition(() => {
      router.push(pathname, { scroll: false })
    })
  }

  const hasActiveFilters = initialStatus !== 'all' || initialQ.length > 0
  const hasSearch = q.length > 0

  return (
    <div className="sticky top-0 z-10 border-b border-border bg-white/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/90 shadow-sm">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Tabs — line variant for admin clarity; scrollable on mobile */}
        <div className="-mx-1 overflow-x-auto scrollbar-none">
          <Tabs value={initialStatus} onValueChange={handleStatusChange}>
            <TabsList variant="line" className="w-max gap-1">
              {STATUS_TABS.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="whitespace-nowrap px-3 py-1.5 text-sm"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Search + clear */}
        <div className="flex w-full items-center gap-2 md:ml-auto md:max-w-[360px]">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              size={16}
              aria-hidden
            />
            <Input
              ref={inputRef}
              type="search"
              placeholder="Search title, university, city…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // Flush debounce immediately on Enter
                  const params = new URLSearchParams(searchParams.toString())
                  const trimmed = q.trim()
                  if (trimmed) params.set('q', trimmed)
                  else params.delete('q')
                  const next = params.toString()
                  startTransition(() => {
                    router.push(next ? `${pathname}?${next}` : pathname)
                  })
                }
                if (e.key === 'Escape' && hasSearch) {
                  clearSearch()
                }
              }}
              className="h-9 rounded-full border-border bg-white pl-9 pr-9 text-sm placeholder:text-muted-2 focus-visible:border-eu-blue focus-visible:ring-2 focus-visible:ring-eu-blue/20"
              aria-label="Search BIPs"
            />
            {hasSearch && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-bg-soft hover:text-ink transition-colors"
                aria-label="Clear search"
              >
                <X size={14} aria-hidden />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="shrink-0 rounded-full border-border bg-white text-sm font-medium text-ink hover:bg-bg-soft"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Active filter summary — subtle, only when filtered */}
      {hasActiveFilters && (
        <div className="mx-auto mt-3 max-w-[1200px] flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <span className="font-medium text-ink-2">Filters:</span>
          {initialStatus !== 'all' && (
            <span className="inline-flex items-center rounded-full border border-border bg-bg-soft px-2.5 py-0.5 font-medium text-ink">
              {STATUS_TABS.find((t) => t.value === initialStatus)?.label ?? initialStatus}
            </span>
          )}
          {initialQ && (
            <span className="inline-flex max-w-[240px] items-center truncate rounded-full border border-border bg-bg-soft px-2.5 py-0.5 font-medium text-ink">
              “{initialQ}”
            </span>
          )}
          <span className="ml-1 text-muted-2">· URL is shareable</span>
        </div>
      )}
    </div>
  )
}
