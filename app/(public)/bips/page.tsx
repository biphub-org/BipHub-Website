import { Suspense } from 'react'
import type { Metadata } from 'next'
import { parseSearchParams, PAGE_SIZE } from '@/lib/filters/parseSearchParams'
import { getBips } from '@/lib/queries/bips'
import { BipFiltersSidebar } from '@/components/bip/BipFiltersSidebar'
import { BipFiltersSidebarSkeleton } from '@/components/bip/BipFiltersSidebarSkeleton'
import { BipFiltersDrawer } from '@/components/bip/BipFiltersDrawer'
import { BipSearchBar } from '@/components/bip/BipSearchBar'
import { BipSortControl } from '@/components/bip/BipSortControl'
import { BipSortControlSkeleton } from '@/components/bip/BipSortControlSkeleton'
import { BipGrid } from '@/components/bip/BipGrid'
import { BipPagination } from '@/components/bip/BipPagination'
import { BipPaginationSkeleton } from '@/components/bip/BipPaginationSkeleton'
import { BipsEmptyState } from '@/components/bip/BipsEmptyState'
import { BipFilterChips } from '@/components/bip/BipFilterChips'

// PITFALLS Pitfall 14 — canonical points to /bips REGARDLESS of query params
// to prevent duplicate-content indexing of every filter combination.
//
// Plan 04-03 (D-17): static OG image at /public/og-bips.png. /bip/[slug]
// keeps its dynamic opengraph-image.tsx; static pages get hand-rendered
// PNGs so / and /bips have zero runtime OG cost.
//
// metadataBase resolves relative /og-bips.png into an absolute URL.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(SITE_URL),
    title: 'Browse all BIPs · BipHub',
    description:
      'Browse Erasmus+ Blended Intensive Programs across Europe. Filter by country, field of study, language, dates, ECTS credits, and study level.',
    alternates: { canonical: 'https://biphub.eu/bips' },
    openGraph: {
      title: 'Browse all BIPs · BipHub',
      description:
        'Browse Erasmus+ Blended Intensive Programmes across Europe. Filter by country, field of study, language, dates, ECTS credits, and study level.',
      url: '/bips',
      siteName: 'BipHub',
      images: [
        {
          url: '/og-bips.png',
          width: 1200,
          height: 630,
          alt: 'Browse all BIPs on BipHub',
        },
      ],
      type: 'website',
    },
  }
}

// ISR per ARCHITECTURE.md — revalidate hourly; revalidatePath() in Phase 3 admin actions
// busts the cache instantly on approve/reject.
export const revalidate = 3600

type SearchParamsRaw = { [k: string]: string | string[] | undefined }

export default async function BipsPage(props: {
  // Next.js 15: searchParams is a Promise — must await
  searchParams: Promise<SearchParamsRaw>
}) {
  const sp = await props.searchParams
  const filters = parseSearchParams(sp)
  const { rows, total, totalCountries } = await getBips(filters)

  const startIdx = (filters.page - 1) * PAGE_SIZE + 1
  const endIdx = Math.min(filters.page * PAGE_SIZE, total)
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Active-filter detection for chip row + clear-all button visibility
  const hasActiveFilters = Boolean(
    filters.country?.length ||
      filters.field?.length ||
      filters.lang?.length ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.ectsMin !== undefined ||
      filters.ectsMax !== undefined ||
      (filters.status && filters.status !== 'any') ||
      filters.level?.length ||
      filters.q,
  )

  return (
    <>
      {/* === Compact dark header band — same ink palette as other heroes,
            but the layout stays tool-page (one-line title + inline search). === */}
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
        {/* Sparse static gold accents */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-eu-gold"
          style={{ left: '10%', top: '30%', boxShadow: '0 0 10px rgba(255,204,0,0.7)' }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute h-1 w-1 rounded-full bg-eu-gold"
          style={{ left: '85%', top: '24%', boxShadow: '0 0 8px rgba(255,204,0,0.6)' }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute h-1 w-1 rounded-full bg-eu-gold"
          style={{ left: '78%', top: '72%', boxShadow: '0 0 8px rgba(255,204,0,0.6)' }}
        />

        <div className="relative mx-auto max-w-[1200px] px-4 lg:px-6 pt-[96px] pb-10 lg:pt-[112px] lg:pb-14">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
            <div className="md:flex-1">
              <h1
                className="font-bold text-white"
                style={{
                  fontSize: 'clamp(26px, 3.5vw, 36px)',
                  lineHeight: '1.1',
                  letterSpacing: '-0.8px',
                }}
              >
                Browse all BIPs
              </h1>
              <p className="mt-2 text-sm text-white/70">
                <strong className="font-semibold text-white">{total}</strong>{' '}
                {total === 1 ? 'programme' : 'programmes'} across{' '}
                <strong className="font-semibold text-white">
                  {totalCountries}
                </strong>{' '}
                {totalCountries === 1 ? 'country' : 'countries'} — search,
                filter, and shortlist below.
              </p>
            </div>

            <div className="w-full md:w-[400px] lg:w-[440px]">
              <Suspense fallback={<InlineSearchSkeleton />}>
                <BipSearchBar initialQ={filters.q ?? ''} variant="hero" />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      {/* === Body: filters + grid === */}
      <div className="container mx-auto max-w-[1200px] px-4 lg:px-6 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
          <aside className="hidden lg:block">
            {/* D-18: Suspense around useSearchParams consumer; stationary skeleton avoids CLS */}
            <Suspense fallback={<BipFiltersSidebarSkeleton />}>
              <BipFiltersSidebar filters={filters} />
            </Suspense>
          </aside>

          <div>
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-muted">
                  {total === 0
                    ? '0 results'
                    : total === 1
                      ? '1 result'
                      : `Showing ${startIdx}–${endIdx} of ${total}`}
                </p>
                <div className="flex items-center gap-3">
                  <div className="lg:hidden">
                    {/* Drawer renders BipFiltersSidebar internally; reuse the sidebar skeleton */}
                    <Suspense fallback={<BipFiltersSidebarSkeleton />}>
                      <BipFiltersDrawer filters={filters} totalResults={total} />
                    </Suspense>
                  </div>
                  <Suspense fallback={<BipSortControlSkeleton />}>
                    <BipSortControl initialSort={filters.sort} />
                  </Suspense>
                </div>
              </div>
              {hasActiveFilters && <BipFilterChips filters={filters} />}
            </div>

            {rows.length === 0 ? (
              <BipsEmptyState />
            ) : (
              <>
                <BipGrid bips={rows} />
                {totalPages > 1 && (
                  <div className="mt-12">
                    <Suspense fallback={<BipPaginationSkeleton />}>
                      <BipPagination currentPage={filters.page} totalPages={totalPages} />
                    </Suspense>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

/** Stationary skeleton matching the pill search-bar Suspense fallback so the
 *  layout doesn't jump as the client island hydrates. Tinted for dark surface. */
function InlineSearchSkeleton() {
  return (
    <div
      aria-hidden
      className="h-[48px] w-full rounded-full border border-white/15 bg-white/10"
    />
  )
}
