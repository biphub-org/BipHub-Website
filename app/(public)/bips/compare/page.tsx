import Link from 'next/link'
import type { Metadata } from 'next'
import { getBipById } from '@/lib/queries/bipDetail'
import { BipApplyCta } from '@/components/bip/BipApplyCta'
import { BipKeyFacts } from '@/components/bip/BipKeyFacts'
import { getCountryName } from '@/lib/countries'
import { ISCED_FIELD_BY_ID } from '@/lib/isced'
import { IconChevronLeft } from '@tabler/icons-react'

export const revalidate = 3600
export const dynamicParams = true

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<Metadata> {
  const sp = await searchParams
  const raw = typeof sp.ids === 'string' ? sp.ids : Array.isArray(sp.ids) ? sp.ids[0] : ''
  const count = raw ? raw.split(',').filter(Boolean).length : 0
  return {
    title: count ? `Compare ${count} BIPs · BipHub` : 'Compare BIPs · BipHub',
    description: 'Compare Erasmus+ Blended Intensive Programs side-by-side.',
  }
}

function CompareCard({ bip }: { bip: NonNullable<Awaited<ReturnType<typeof getBipById>>> }) {
  const host = bip.host_university
  const countryName = host?.country ? getCountryName(host.country) : ''
  const fieldLabels = (bip.subject_areas ?? []).map(
    (id) => ISCED_FIELD_BY_ID[id as keyof typeof ISCED_FIELD_BY_ID]?.label ?? id.replace(/-/g, ' '),
  )

  return (
    <article className="flex flex-col rounded-lg border border-border bg-white overflow-hidden shadow-sm">
      <div className="p-6 flex-1">
        <h2 className="text-lg font-bold text-ink leading-tight line-clamp-2" style={{ letterSpacing: '-0.3px' }}>
          <Link href={`/bip/${bip.slug}`} className="hover:underline hover:text-eu-blue">
            {bip.title}
          </Link>
        </h2>
        {host && (
          <p className="mt-1 text-sm text-muted">
            {host.name}
            {(bip.host_city || countryName) && ` · ${[bip.host_city, countryName].filter(Boolean).join(', ')}`}
          </p>
        )}
        {bip.partner_institutions_only && (
          <span className="mt-2 inline-flex rounded-full border border-status-pending bg-status-pending-bg px-2.5 py-1 text-[11px] font-semibold text-status-pending">
            Partner institutions only
          </span>
        )}
        {fieldLabels.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {fieldLabels.map((label) => (
              <span
                key={label}
                className="inline-flex rounded-sm bg-eu-blue-50 px-2 py-0.5 text-[12px] font-medium capitalize text-eu-blue"
              >
                {label}
              </span>
            ))}
          </div>
        )}
        <div className="mt-4">
          <BipKeyFacts bip={bip} />
        </div>
        {bip.description && (
          <p className="mt-4 text-sm text-ink-2 line-clamp-3">{bip.description.slice(0, 220)}</p>
        )}
        {bip.accommodation_notes && (
          <div className="mt-4 rounded-md bg-eu-blue-50/60 p-3">
            <p className="text-xs font-semibold text-ink mb-1">Accommodation</p>
            <p className="text-sm text-ink-2 line-clamp-3">{bip.accommodation_notes}</p>
          </div>
        )}
      </div>
      <div className="border-t border-border bg-white p-4">
        <BipApplyCta bip={bip} />
        <Link
          href={`/bip/${bip.slug}`}
          className="mt-3 inline-flex w-full justify-center text-sm font-semibold text-eu-blue hover:underline"
        >
          View details →
        </Link>
      </div>
    </article>
  )
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const rawIds = typeof sp.ids === 'string' ? sp.ids : Array.isArray(sp.ids) ? sp.ids[0] ?? '' : ''
  const ids = rawIds
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)

  if (ids.length === 0) {
    return (
      <div className="container mx-auto max-w-[1200px] px-4 lg:px-6 py-10">
        <h1 className="text-2xl font-bold text-ink">Compare BIPs</h1>
        <p className="mt-2 text-sm text-muted">No BIPs selected. Go to the catalog, tick 2–3 cards, then compare.</p>
        <Link href="/bips" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-eu-blue hover:underline">
          <IconChevronLeft size={16} aria-hidden="true" />
          Browse all BIPs
        </Link>
      </div>
    )
  }

  if (ids.length === 1) {
    return (
      <div className="container mx-auto max-w-[1200px] px-4 lg:px-6 py-10">
        <h1 className="text-2xl font-bold text-ink">Compare BIPs</h1>
        <p className="mt-2 text-sm text-muted">Select at least 2 BIPs to compare. You have 1 selected.</p>
        <p className="mt-1 text-xs text-muted">Add more from the catalog — your selection persists.</p>
        <Link href="/bips" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-eu-blue hover:underline">
          <IconChevronLeft size={16} aria-hidden="true" />
          Browse all BIPs
        </Link>
      </div>
    )
  }

  // Enforce max 3 — URL is the authority; extra ids beyond 3 are silently ignored.
  const deduped = Array.from(new Set(ids))
  if (deduped.length !== ids.length) {
    // deduped but still within cap — continue
  }

  const bips = (
    await Promise.all(deduped.map((id) => getBipById(id)))
  ).filter((b): b is NonNullable<typeof b> => b !== null)

  if (bips.length === 0) {
    return (
      <div className="container mx-auto max-w-[1200px] px-4 lg:px-6 py-10">
        <h1 className="text-2xl font-bold text-ink">Compare BIPs</h1>
        <p className="mt-2 text-sm text-muted">No matching BIPs found for the selected ids. They may have been removed or are no longer published.</p>
        <Link href="/bips" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-eu-blue hover:underline">
          <IconChevronLeft size={16} aria-hidden="true" />
          Browse all BIPs
        </Link>
      </div>
    )
  }

  const shareUrl =
    typeof process.env.NEXT_PUBLIC_SITE_URL === 'string' && process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/bips/compare?ids=${encodeURIComponent(deduped.join(','))}`
      : `/bips/compare?ids=${encodeURIComponent(deduped.join(','))}`

  const cols = bips.length === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3'

  return (
    <div className="container mx-auto max-w-[1200px] px-4 lg:px-6 py-8 lg:py-10">
      <Link
        href="/bips"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-eu-blue mb-6"
      >
        <IconChevronLeft size={16} aria-hidden="true" />
        All BIPs
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight" style={{ letterSpacing: '-0.6px' }}>
            Compare {bips.length} BIPs
          </h1>
          <p className="mt-1 text-sm text-muted">Side-by-side view — share this URL to share the shortlist. No sign-in required.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden md:inline text-xs text-muted">Shareable URL:</span>
          <code className="rounded bg-border px-2 py-1 text-xs text-ink max-w-[280px] truncate">{shareUrl}</code>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${cols} gap-6`}>
        {bips.map((bip) => (
          <CompareCard key={bip.id} bip={bip} />
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-muted">Compare is limited to 3 BIPs. This page is public — anyone with the link sees the same comparison.</p>
    </div>
  )
}
