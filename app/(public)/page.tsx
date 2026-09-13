/**
 * Homepage — DISC-01 through DISC-07.
 *
 * Async RSC that fetches all homepage data server-side, then passes typed props
 * to each section component. Client islands (EuropeMap, CategoriesBar, StatsSection)
 * receive pre-fetched data as props.
 *
 * Architecture: Pattern 1 from ARCHITECTURE.md — RSC data fetcher + client island props.
 *
 * revalidate = 3600: Next.js ISR — homepage data refreshes hourly without full rebuild.
 *
 * PITFALLS:
 *   Pitfall 11: EuropeMap loaded via dynamic({ ssr: false }) — never imported statically.
 *   Pitfall 12: StatsSection animation via LazyMotion (wrapped inside StatsSection).
 *   Pitfall 13: Choropleth tier fill classes are full string literals in lib/map/bins.ts.
 */

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import {
  getApprovedBipCount,
  getBipCountsByCountry,
  getBipCountsByField,
  getBipGrowthByMonth,
  getRecentBips,
  getStatsSnapshot,
} from '@/lib/queries/homepage'
import { Hero } from '@/components/home/Hero'
import { CategoriesBar } from '@/components/home/CategoriesBar'
import { StatsSection } from '@/components/home/StatsSection'
import { RecentBips } from '@/components/home/RecentBips'
import { SavedBipsHydrator } from '@/components/bip/SavedBipsHydrator'
import { HowItWorks } from '@/components/home/HowItWorks'
import { UniversityCTA } from '@/components/home/UniversityCTA'
import { Eyebrow } from '@/components/home/Eyebrow'
// EuropeMapWrapper is a 'use client' component that hosts the dynamic({ ssr: false }) import.
// Next.js 15 requires ssr:false dynamic() to live in a client component boundary.
import { EuropeMapWrapper } from '@/components/home/EuropeMapWrapper'
import { TopCountriesMobile } from '@/components/home/TopCountriesMobile'
// Plan 04-05 (FOUN-07): fires the post-deletion Sonner toast on /?deleted=1 and
// strips the param from the URL. Wrapped in <Suspense> because useSearchParams
// requires a Suspense boundary in Next.js 15.
import { AccountDeletedToastIsland } from '@/components/home/AccountDeletedToastIsland'

// 1-hour ISR: homepage data refreshes hourly without a full rebuild.
// Coordinate submits (Plan 02+) revalidatePath('/') explicitly.
export const revalidate = 3600

// Plan 04-03 (D-17): static OG image at /public/og-home.png. Dynamic
// opengraph-image.tsx is scoped to /bip/[slug] only; static pages get
// hand-rendered PNGs so / and /bips have zero runtime OG cost.
//
// metadataBase resolves the relative `/og-home.png` URL into an absolute
// URL for og:image meta tags. Falls back to localhost in dev.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: 'BipHub — The Erasmus+ BIP directory',
    description:
      'Free, open-source directory of Erasmus+ Blended Intensive Programmes across Europe.',
    url: '/',
    siteName: 'BipHub',
    images: [
      {
        url: '/og-home.png',
        width: 1200,
        height: 630,
        alt: 'BipHub — the Erasmus+ BIP directory',
      },
    ],
    type: 'website',
  },
}

export default async function HomePage() {
  const supabase = await createClient()

  // Parallel data fetching — all queries run concurrently via Promise.all
  const [count, countsByCountry, countsByField, recentBips, stats, growth] = await Promise.all([
    getApprovedBipCount(supabase),
    getBipCountsByCountry(supabase),
    getBipCountsByField(supabase),
    getRecentBips(supabase, 3),
    getStatsSnapshot(supabase),
    getBipGrowthByMonth(supabase),
  ])

  // First seed slug for UniversityCTA "See sample listing" CTA.
  // Use the most-recent approved BIP slug as a stable choice.
  const firstSampleSlug = recentBips[0]?.slug ?? 'sustainable-cities-munich-2026'

  return (
    <>
      {/* Hydrates the client saved-state store so RecentBips heart toggles work */}
      <SavedBipsHydrator />

      {/* FOUN-07: post-deletion toast island — fires on /?deleted=1, then strips
          the param. Renders null otherwise. Suspense is required because
          useSearchParams must be wrapped in Next.js 15. */}
      <Suspense fallback={null}>
        <AccountDeletedToastIsland />
      </Suspense>

      {/* DISC-01: Hero with gold underline accent */}
      <Hero />

      {/* DISC-02: Browse-by-country — choropleth on desktop, top-countries pill grid on mobile.
          The map is hidden below md because 29 microscopic countries + no touch hover doesn't
          serve discovery, and skipping the 1.2 MB chunk on mobile is a real LCP win. */}
      <section
        id="by-country"
        className="relative overflow-hidden bg-bg-soft py-16 border-t border-b border-border md:py-24"
        style={{
          // Faint blue dot grid — ties the three light sections (this, the
          // categories bar, and recent bips) together as one aesthetic family.
          backgroundImage:
            'radial-gradient(rgba(0, 51, 153, 0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div className="relative mx-auto max-w-[1200px] px-4 md:px-6">
          <div className="hidden md:block">
            <EuropeMapWrapper countsByCountry={countsByCountry} />
          </div>
          <div className="md:hidden">
            <TopCountriesMobile countsByCountry={countsByCountry} />
          </div>
        </div>
      </section>

      {/* DISC-03: 8-category field-of-study bar */}
      <CategoriesBar countsByField={countsByField} />

      {/* DISC-04: Live stats with count-up animation (LazyMotion inside StatsSection) */}
      <StatsSection stats={stats} growth={growth} />

      {/* DISC-05: Recent BIPs (teaser only when zero approved) */}
      <RecentBips totalApprovedCount={count} bips={recentBips} />

      {/* DISC-06 + DISC-07: Students "How it works" and Coordinators CTA shown
          side-by-side on lg+; stacked on mobile. A shared header frames the
          pair so the two cards read as one section, not two adverts. */}
      <section
        id="how-it-works"
        className="border-t border-border bg-bg-soft py-24"
        style={{
          backgroundImage:
            'radial-gradient(rgba(0, 51, 153, 0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div className="mx-auto max-w-[1200px] px-4 md:px-6">
          <div className="mx-auto mb-14 max-w-[720px] text-center">
            <Eyebrow className="mb-3">Get started</Eyebrow>
            <h2
              className="font-bold text-ink"
              style={{
                fontSize: 'clamp(30px, 4vw, 44px)',
                lineHeight: '1.1',
                letterSpacing: '-1px',
              }}
            >
              Students find. Coordinators list.
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-muted">
              One free, open-source platform for Erasmus+ Blended Intensive
              Programmes — whichever side you&apos;re on.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
            <HowItWorks />
            <UniversityCTA sampleSlug={firstSampleSlug} />
          </div>
        </div>
      </section>
    </>
  )
}
