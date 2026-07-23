import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getBipBySlug, getAllPublishedSlugs } from '@/lib/queries/bipDetail'
import { getCountryName } from '@/lib/countries'
import { formatLongDate, formatLongDateRange } from '@/lib/utils/dates'
import { BipHeader } from '@/components/bip/BipHeader'
import { BipCover } from '@/components/bip/BipCover'
import { BipBody } from '@/components/bip/BipBody'
import { BipSidebar } from '@/components/bip/BipSidebar'
import { BipMobileApplyBar } from '@/components/bip/BipMobileApplyBar'
import { BipSaveButton } from '@/components/bip/BipSaveButton'
import { SavedBipsHydrator } from '@/components/bip/SavedBipsHydrator'
import { IconChevronLeft } from '@tabler/icons-react'
import Link from 'next/link'

/**
 * ISR — revalidate every hour. Phase 3 admin approve/reject calls
 * revalidatePath('/bip/{slug}') to bust the cache immediately.
 *
 * NOTE: 'force-dynamic' ensures cookies() is available for the Supabase
 * client. The revalidate value is respected by Next.js for cache duration.
 * When running with generateStaticParams, pre-rendered pages are served
 * statically; dynamicParams=true allows non-pre-rendered slugs to be served
 * via SSR/ISR at request time.
 */
export const revalidate = 3600

/**
 * Allow dynamic params not pre-rendered by generateStaticParams to be
 * served via ISR fallback (not a 404). Required for non-seed BIPs added
 * after build time, and for dev/CI environments where generateStaticParams
 * returns [] (no Supabase available at build time).
 */
export const dynamicParams = true

/**
 * Pre-render all approved BIPs at build time.
 * Remaining live BIPs (added after build) use ISR fallback.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await getAllPublishedSlugs()
  return slugs.map((slug) => ({ slug }))
}

/**
 * generateMetadata — returns title, description (≤155 chars), canonical URL,
 * and OpenGraph metadata. The colocated opengraph-image.tsx is auto-discovered
 * by Next.js 15 and injected as og:image automatically.
 *
 * UI-SPEC line 287-288: title and description templates.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const bip = await getBipBySlug(slug)

  if (!bip) {
    return { title: 'BIP not found · BipHub' }
  }

  const host = bip.host_university
  const countryName = host?.country ? getCountryName(host.country) : ''
  const dateRange =
    formatLongDateRange(bip.physical_start_date, bip.physical_end_date) ?? ''
  const deadlineText = bip.application_deadline
    ? `Apply by ${formatLongDate(bip.application_deadline)}.`
    : ''

  const descriptionFull = [
    `${bip.title} at ${host?.name ?? ''}`,
    `(${[bip.host_city, countryName].filter(Boolean).join(', ')}).`,
    bip.ects_credits ? `${bip.ects_credits} ECTS,` : '',
    bip.language_of_instruction ?? '',
    dateRange ? `${dateRange}.` : '',
    deadlineText,
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 155)

  const pageTitle = `${bip.title} — ${host?.name ?? ''} · BipHub`

  return {
    title: pageTitle,
    description: descriptionFull,
    alternates: {
      canonical: `https://biphub.eu/bip/${slug}`,
    },
    openGraph: {
      title: pageTitle,
      description: descriptionFull,
      type: 'article',
    },
  }
}

/**
 * /bip/[slug] — async RSC page.
 *
 * Layout: 2-column desktop (1fr + 340px sticky sidebar) / single-column mobile.
 * Mobile: sticky-bottom Apply bar via <BipMobileApplyBar>.
 *
 * Architecture:
 *   - getBipBySlug fetches BIP + host_university + partners in ONE query (Pitfall 21)
 *   - notFound() triggers not-found.tsx → <BipNotFound> when slug doesn't resolve
 *   - ISR revalidate=3600 keeps cache fresh; Phase 3 admin actions call revalidatePath()
 */
export default async function BipDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const bip = await getBipBySlug(slug)

  if (!bip) {
    notFound()
  }

  // Per-user saved state is hydrated client-side by <SavedBipsHydrator /> so this
  // detail route stays cookie-free and ISR-cached (D-bip-02-03). The save button
  // renders from its SSR fallback (unsaved) until the store hydrates.
  const saveButton = (
    <BipSaveButton bipId={bip.id} bipTitle={bip.title} />
  )

  return (
    <>
      <SavedBipsHydrator />
      <div className="container mx-auto max-w-[1200px] px-4 lg:px-6 py-8 lg:py-12 pb-24 lg:pb-12">
        {/* Breadcrumb — UI-SPEC line 268 */}
        <Link
          href="/bips"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-eu-blue mb-6 transition-colors"
        >
          <IconChevronLeft size={16} aria-hidden="true" />
          All BIPs
        </Link>

        {/* Hero cover image (full-width, above the two-column layout) */}
        <BipCover bip={bip} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 lg:gap-12">
          <div>
            <BipHeader bip={bip} />
            <BipBody bip={bip} />
          </div>
          <BipSidebar bip={bip} saveButton={saveButton} />
        </div>
      </div>

      {/* Mobile sticky bottom Apply bar — hidden at lg+ (D-10) */}
      <div className="lg:hidden">
        <BipMobileApplyBar bip={bip} saveButton={saveButton} />
      </div>
    </>
  )
}
