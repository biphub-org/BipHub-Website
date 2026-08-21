'use client'

/**
 * CompareToggle — checkbox island for BipCard (DISC-08).
 *
 * Renders a small checkbox + label "Compare" over the card. Uses
 * useCompareStore; caps at 3. When at cap and this id is not selected,
 * the checkbox is disabled with a helpful title. The toggle is placed
 * outside the card's <Link> (via absolute positioning in the card wrapper
 * — see BipGrid) so nested-interactive a11y is preserved.
 *
 * Tailwind classes are static literals (CLAUDE.md never-do).
 */

import { useEffect } from 'react'
import { useCompareStore } from '@/lib/store/compare'
import { cn } from '@/lib/utils/cn'

export function CompareToggle({ bipId, bipTitle }: { bipId: string; bipTitle: string }) {
  const ids = useCompareStore((s) => s.ids)
  const hydrated = useCompareStore((s) => s.hydrated)
  const hydrate = useCompareStore((s) => s.hydrate)
  const toggle = useCompareStore((s) => s.toggle)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const checked = ids.includes(bipId)
  const atCap = !checked && ids.length >= 3
  // Until hydrated, render enabled unchecked to avoid mismatch; hydration is fast.
  const disabled = hydrated ? atCap : false

  return (
    <label
      className={cn(
        'absolute left-3 top-[102px] inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-sm backdrop-blur-sm transition-colors',
        checked
          ? 'border-eu-blue bg-eu-blue text-white'
          : 'border-border bg-white/90 text-ink hover:border-eu-blue/40',
        disabled && !checked && 'opacity-50 cursor-not-allowed',
      )}
      aria-label={checked ? `Remove ${bipTitle} from compare` : `Add ${bipTitle} to compare`}
      title={
        atCap ? 'Compare is limited to 3 BIPs — remove one to add another.' : undefined
      }
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={() => {
          const ok = toggle(bipId)
          if (!ok) {
            // At cap — no-op, title already explains
          }
        }}
        className="h-3.5 w-3.5 accent-eu-blue"
        aria-label={checked ? `Remove ${bipTitle} from compare` : `Add ${bipTitle} to compare`}
      />
      Compare
    </label>
  )
}

export function CompareHydrator() {
  const hydrate = useCompareStore((s) => s.hydrate)
  useEffect(() => {
    hydrate()
  }, [hydrate])
  return null
}
