'use client'

/**
 * CompareBar — sticky bottom bar on /bips when 1-3 BIPs are selected (DISC-08).
 *
 * Reads from useCompareStore (hydrated from localStorage). Shows count,
 * Clear, and Compare CTA. The Compare link builds the shareable URL
 * `?ids=a,b,c` — the sole source of truth for the compare page (no server
 * table, works incognito). The bar is hidden when 0 selected; the button
 * is disabled when <2 (needs 2-3 to compare per DISC-08).
 */

import Link from 'next/link'
import { useEffect } from 'react'
import { useCompareStore } from '@/lib/store/compare'
import { Button } from '@/components/ui/button'

export function CompareBar() {
  const ids = useCompareStore((s) => s.ids)
  const hydrated = useCompareStore((s) => s.hydrated)
  const hydrate = useCompareStore((s) => s.hydrate)
  const clear = useCompareStore((s) => s.clear)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  if (!hydrated || ids.length === 0) return null

  const canCompare = ids.length >= 2
  const idsParam = ids.join(',')
  const href = `/bips/compare?ids=${encodeURIComponent(idsParam)}`

  return (
    <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-border bg-white px-4 py-2.5 shadow-lg flex items-center gap-3 max-w-[90vw]">
      <span className="text-sm font-medium text-ink whitespace-nowrap">
        {ids.length} selected
        <span className="ml-1 text-xs text-muted font-normal">
          ({ids.length}/3)
        </span>
      </span>
      <button
        onClick={clear}
        className="text-xs text-muted hover:text-ink underline whitespace-nowrap"
      >
        Clear
      </button>
      {canCompare ? (
        <Link
          href={href}
          className="inline-flex items-center rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-white hover:bg-ink/90 whitespace-nowrap"
        >
          Compare {ids.length}
        </Link>
      ) : (
        <span className="inline-flex items-center rounded-full bg-border px-4 py-1.5 text-xs font-semibold text-muted whitespace-nowrap">
          Select {2 - ids.length} more to compare
        </span>
      )}
    </div>
  )
}
