import { Skeleton } from '@/components/ui/skeleton'
import { BipFiltersSidebarSkeleton } from '@/components/bip/BipFiltersSidebarSkeleton'
import { BipSortControlSkeleton } from '@/components/bip/BipSortControlSkeleton'

/**
 * Route-level loading skeleton for /bips.
 *
 * Mirrors the live page (app/(public)/bips/page.tsx) post-redesign:
 *   1. Compact dark hero band (#0a1735 + radial gradients, pt-[96px] to clear
 *      the fixed 68px StickyNav) with title/subtitle blocks + the pill search.
 *   2. Body grid [240px_1fr] reusing the same sidebar + sort skeletons the
 *      live page's Suspense boundaries render, so loading → page causes no jump.
 *
 * Hero placeholders are stationary white-tint blocks (calm on the dark surface,
 * matching the page's InlineSearchSkeleton); body cards pulse via <Skeleton>.
 */
export default function BipsLoading() {
  return (
    <>
      {/* === Compact dark hero band (matches page.tsx) === */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundColor: '#0a1735',
          backgroundImage: [
            'radial-gradient(ellipse 65% 50% at 50% 0%, rgba(0, 51, 153, 0.55) 0%, transparent 60%)',
            'radial-gradient(ellipse 50% 50% at 92% 100%, rgba(255, 204, 0, 0.18) 0%, transparent 65%)',
          ].join(', '),
        }}
      >
        <div className="relative mx-auto max-w-[1200px] px-4 lg:px-6 pt-[96px] pb-10 lg:pt-[112px] lg:pb-14">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
            <div className="md:flex-1">
              {/* h1 "Browse all BIPs" placeholder */}
              <div
                aria-hidden
                className="h-8 w-60 rounded-md bg-white/15 lg:h-9"
              />
              {/* subtitle placeholder (two short lines) */}
              <div aria-hidden className="mt-3 space-y-2">
                <div className="h-4 w-80 max-w-full rounded bg-white/10" />
                <div className="h-4 w-56 max-w-full rounded bg-white/10" />
              </div>
            </div>

            {/* pill search placeholder — matches BipSearchBar variant="hero" */}
            <div className="w-full md:w-[400px] lg:w-[440px]">
              <div
                aria-hidden
                className="h-[48px] w-full rounded-full border border-white/15 bg-white/10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* === Body: filters + grid (matches page.tsx) === */}
      <div className="container mx-auto max-w-[1200px] px-4 lg:px-6 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
          <aside className="hidden lg:block">
            <BipFiltersSidebarSkeleton />
          </aside>

          <div>
            {/* result-count + sort row */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <Skeleton className="h-4 w-36" />
              <BipSortControlSkeleton />
            </div>

            {/* card grid — matches BipGrid (3 cols) + BipCard shape */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col overflow-hidden rounded-lg border border-border bg-white"
                >
                  {/* gradient header */}
                  <Skeleton className="h-[140px] w-full rounded-none" />
                  {/* body */}
                  <div className="flex flex-1 flex-col p-5 pt-4">
                    <Skeleton className="mb-2 h-5 w-24 rounded-sm" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="mt-1 h-4 w-3/4" />
                    <Skeleton className="mt-3 h-3 w-1/2" />
                    {/* meta row with separator */}
                    <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-3 w-10" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
