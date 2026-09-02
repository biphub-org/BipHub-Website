/**
 * RecentBipsTeaser — UI-SPEC line 331.
 *
 * Shown only when the catalog has zero approved BIPs.
 * NOT used in Phase 1 with the 20-BIP seed catalog (always ≥6),
 * but ships for runtime correctness when the catalog may be pruned.
 *
 * Copy from UI-SPEC Copywriting Contract line 226.
 */

import Link from 'next/link'
import { Eyebrow } from './Eyebrow'
import { cn } from '@/lib/utils/cn'

export function RecentBipsTeaser() {
  return (
    <section className="py-24 bg-white">
      <div className="mx-auto max-w-[1200px] px-4 md:px-6">
        <div className={cn(
          'mx-auto max-w-md rounded-lg bg-bg-soft p-12 text-center border border-border',
        )}>
          <Eyebrow className="mb-4 justify-center">Recently added</Eyebrow>
          <h3 className="text-[22px] font-bold text-ink" style={{ letterSpacing: '-0.3px' }}>
            Be among the first
          </h3>
          <p className="mt-3 text-[16px] text-muted leading-[1.6]">
            BipHub is brand new. We&apos;re listing the first BIPs from European universities —
            check back soon, or browse what&apos;s already available.
          </p>
          <Link
            href="/bips"
            className={cn(
              'mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-pill px-7 text-base font-semibold',
              'bg-eu-blue text-white border border-eu-blue transition-all duration-200 ease-out',
              'hover:bg-eu-blue-dark hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(0,51,153,0.25)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eu-blue focus-visible:ring-offset-2',
            )}
          >
            Browse all BIPs
          </Link>
        </div>
      </div>
    </section>
  )
}
