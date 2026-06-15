/**
 * BipCard — UI-SPEC line 332.
 *
 * Pure RSC (no client islands in this file).
 *
 * HTML structure (UI-SPEC Structural Note lines 324-351):
 *   <div card outer — group, hover classes>         ← carries hover/translate/shadow
 *     <Link href="/bip/{slug}" — block child>       ← wraps header + body
 *       <div gradient header relative>              ← 140px, gradient bg
 *         {country pill} {deadline pill}
 *       </div>
 *       <div card body>                             ← field tag, title, university, meta
 *         ...
 *       </div>
 *     </Link>
 *     <SaveToggleIsland absolute right-3 top-[102px] />  ← SIBLING of Link, NOT inside it
 *   </div>
 *
 * The island is positioned `absolute right-3 top-[102px]` (within the 140px header, lower-right
 * — 140 - 44/2 ≈ 118, but top-[102px] puts the 44px button centered near the bottom of the header).
 * It is a SIBLING of the Link so the 44px <button> is NEVER a DOM descendant of the <a>.
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
import { SaveToggleIsland } from '@/components/bip/SaveToggleIsland'
import { cn } from '@/lib/utils/cn'

/** 3 gradient variants for the card header — keyed by bip.id mod 3 */
const GRADIENT_VARIANTS = [
  'bg-[linear-gradient(135deg,#003399_0%,#1a4dab_100%)]',
  'bg-[linear-gradient(135deg,#1a4dab_0%,#6884cc_100%)]',
  'bg-[linear-gradient(135deg,#002270_0%,#003399_100%)]',
] as const

interface BipCardProps {
  bip: BipWithRelations
  initialSaved: boolean
  isStudent: boolean
}

export function BipCard({ bip, initialSaved, isStudent }: BipCardProps) {
  const gradientClass = GRADIENT_VARIANTS[hashId(bip.id) % 3]
  const country = bip.host_university?.country ?? ''
  const countryName = country ? getCountryName(country) : ''
  const fieldLabel = bip.subject_area
    ? (ISCED_FIELD_BY_ID[bip.subject_area as keyof typeof ISCED_FIELD_BY_ID]?.label ?? bip.subject_area)
    : null

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
          {/* Field tag chip */}
          {fieldLabel && (
            <span className="mb-2 inline-flex self-start rounded-sm bg-eu-blue-50 px-2 py-0.5 text-[12px] font-medium text-eu-blue">
              {fieldLabel}
            </span>
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
        </div>
      </Link>

      {/*
       * === SaveToggleIsland — SIBLING of the Link, NEVER inside it ===
       *
       * Positioned absolute against the card <div> (which is `relative`).
       * top-[102px]: places the 44px button centred over the lower portion of
       * the 140px gradient header (102 + 44/2 = 124px from top — clearly within
       * the header). right-3 avoids the deadline pill at top-3 right-3.
       *
       * The button is NOT a DOM descendant of the <a> — invalid HTML avoided.
       * (UI-SPEC Structural Note; HTML spec; Pitfall 1 in 06-RESEARCH.md)
       */}
      <SaveToggleIsland
        className="absolute right-3 top-[102px] z-10"
        bipId={bip.id}
        bipTitle={bip.title}
        initialSaved={initialSaved}
        isStudent={isStudent}
        displayStyle="icon"
      />
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
