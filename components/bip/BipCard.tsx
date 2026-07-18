/**
 * BipCard — UI-SPEC line 332.
 *
 * Pure RSC (no client islands in this file).
 *
 * HTML structure:
 *   <div card outer — group, hover classes>         ← carries hover/translate/shadow
 *     <Link href="/bip/{slug}" — block child>       ← wraps header + body
 *       <div gradient header relative>              ← 140px, gradient bg
 *         {country pill} {deadline pill}
 *       </div>
 *       <div card body>                             ← field tag, title, university, meta,
 *         ...                                          "Learn more →" affordance
 *       </div>
 *     </Link>
 *   </div>
 *
 * Visual:
 *   - 1px border, 16px radius (rounded-lg), overflow-hidden
 *   - 140px gradient header (3 variants keyed off bip.id mod 3)
 *   - Country flag pill top-left, gold deadline pill top-right
 *   - Body: field tag chip, 2-line clamped title, university name, meta row
 *   - Hover: border → eu-blue, translateY(-2px), shadow-md (CSS only, reduced-motion safe)
 */

import Link from 'next/link'
import {
  IconCalendar,
  IconAward,
  IconLanguage,
} from '@tabler/icons-react'
import type { BipWithRelations } from '@/lib/types/bip'
import { getCountryName } from '@/lib/countries'
import { ISCED_FIELD_BY_ID } from '@/lib/isced'
import { CountryFlag } from '@/components/ui/country-flag'
import { cn } from '@/lib/utils/cn'

/** 3 gradient variants for the card header — keyed by bip.id mod 3 */
const GRADIENT_VARIANTS = [
  'bg-[linear-gradient(135deg,#003399_0%,#1a4dab_100%)]',
  'bg-[linear-gradient(135deg,#1a4dab_0%,#6884cc_100%)]',
  'bg-[linear-gradient(135deg,#002270_0%,#003399_100%)]',
] as const

interface BipCardProps {
  bip: BipWithRelations
}

export function BipCard({ bip }: BipCardProps) {
  const gradientClass = GRADIENT_VARIANTS[hashId(bip.id) % 3]
  const country = bip.host_university?.country ?? ''
  const countryName = country ? getCountryName(country) : ''
  const fieldLabels = (bip.subject_areas ?? []).map(
    (id) =>
      ISCED_FIELD_BY_ID[id as keyof typeof ISCED_FIELD_BY_ID]?.label ??
      id.replace(/-/g, ' '),
  )

  const deadlineFormatted = bip.application_deadline
    ? formatDeadline(bip.application_deadline)
    : null

  const isExpired = bip.application_deadline
    ? new Date(bip.application_deadline) < new Date()
    : false

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-lg border border-border overflow-hidden bg-white',
        'transition-all duration-200 ease',
        'hover:border-eu-blue hover:-translate-y-0.5 hover:shadow-md',
      )}
    >
      {/* === Block-level Link covering the full card (header + body) === */}
      <Link
        href={`/bip/${bip.slug}`}
        className="flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eu-blue focus-visible:ring-offset-2"
      >
        {/* === Gradient header === */}
        <div className={cn('relative h-[140px] flex-shrink-0', gradientClass)}>
          {/* Country flag pill — top-left */}
          {country && (
            <span
              className={cn(
                'absolute left-3 top-3 flex items-center gap-1.5 rounded-pill px-2.5 py-1',
                'bg-white/90 text-[11px] font-semibold text-ink backdrop-blur-sm',
              )}
            >
              <CountryFlag code={country} width={16} />
              {countryName}
            </span>
          )}

          {/* Top-right: deadline pill */}
          {deadlineFormatted && (
            <span
              className={cn(
                'absolute right-3 top-3 rounded-pill px-2.5 py-1 text-[11px] font-semibold',
                isExpired
                  ? 'bg-white/70 text-muted'
                  : 'bg-eu-gold text-ink',
              )}
            >
              {isExpired ? 'Closed' : deadlineFormatted}
            </span>
          )}
        </div>

        {/* === Card body === */}
        <div className="flex flex-1 flex-col p-5 pt-4">
          {/* Partner-institutions-only badge — restrained amber, reuses status-pending token */}
          {bip.partner_institutions_only && (
            <span className="mb-2 inline-flex w-fit rounded-pill border border-status-pending bg-status-pending-bg px-2.5 py-1 text-[11px] font-semibold text-status-pending">
              Partner institutions only
            </span>
          )}

          {/* Field tag chips — one per field of study */}
          {fieldLabels.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
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

          {/* BIP title — 2-line clamp */}
          <h4
            className="mb-1 line-clamp-2 text-[16px] font-semibold leading-[1.35] text-ink"
            style={{ letterSpacing: '-0.3px' }}
          >
            {bip.title}
          </h4>

          {/* University name — 1 line, muted */}
          {bip.host_university && (
            <p className="mb-auto text-[13px] text-muted line-clamp-1">
              {bip.host_university.name}
              {bip.host_university.city && ` · ${bip.host_university.city}`}
            </p>
          )}

          {/* Meta row — calendar / ECTS / language — with top separator */}
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-[13px] text-muted">
            {(bip.physical_start_date || bip.physical_end_date) && (
              <MetaItem
                icon={<IconCalendar size={14} className="text-eu-blue" aria-hidden="true" />}
                label={formatDateRange(bip.physical_start_date, bip.physical_end_date)}
              />
            )}
            {bip.ects_credits && (
              <MetaItem
                icon={<IconAward size={14} className="text-eu-blue" aria-hidden="true" />}
                label={`${bip.ects_credits} ECTS`}
              />
            )}
            {bip.language_of_instruction && (
              <MetaItem
                icon={<IconLanguage size={14} className="text-eu-blue" aria-hidden="true" />}
                label={bip.language_of_instruction.toUpperCase()}
              />
            )}
          </div>

          {/* Learn more affordance — bottom-right of the card */}
          <div className="mt-3 flex items-center justify-end">
            <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-eu-blue">
              Learn more
              <span
                aria-hidden="true"
                className="transition-transform duration-200 ease-out group-hover:translate-x-0.5"
              >
                →
              </span>
            </span>
          </div>
        </div>
      </Link>
    </div>
  )
}

function MetaItem({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
}) {
  return (
    <span className="flex items-center gap-1">
      {icon}
      {label}
    </span>
  )
}

/** Format deadline as "15 Jan 2026" or similar short form */
function formatDeadline(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/** Format a date range for the meta row */
function formatDateRange(start: string | null, end: string | null): string {
  const fmt = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    } catch {
      return d
    }
  }
  if (start && end) return `${fmt(start)} – ${fmt(end)}`
  if (start) return fmt(start)
  if (end) return fmt(end)
  return ''
}

/** Stable numeric hash of a UUID string for gradient variant selection */
function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}
