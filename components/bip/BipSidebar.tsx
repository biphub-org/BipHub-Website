'use client'

import {
  Award,
  CalendarDays,
  Languages,
  MapPin,
  Signal,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { BipDetail } from '@/lib/queries/bipDetail'
import { DeadlineBadge } from '@/components/bip/DeadlineBadge'
import { BipApplyCta } from '@/components/bip/BipApplyCta'
import { ShareButton } from '@/components/bip/ShareButton'
import { formatLongDateRange } from '@/lib/utils/dates'

/**
 * BipSidebar — sticky 340px right column at lg+ (D-09 / UI-SPEC line 357).
 *
 * Renders:
 *   - Deadline countdown chip (DeadlineBadge)
 *   - Apply CTA button (full sidebar width, BipApplyCta)        ← public mode only
 *   - Save button slot (saveButton prop)                        ← public mode only
 *   - Key facts list (ECTS / Dates / Language / CEFR / City) — DETL-05
 *   - Action row: ShareButton                                   ← public mode only
 *
 * Sticky offset: top-[88px] accounts for 68px StickyNav + 20px breathing room.
 * Hidden on mobile (hidden lg:block) — mobile uses BipMobileApplyBar.
 *
 * Mode (Plan 03-03):
 *   - 'public' (default): unchanged Phase 1 behaviour.
 *   - 'admin-review': suppresses the Apply CTA AND the Share action row —
 *     admins viewing a pending submission must not be able to apply from
 *     inside the review surface.
 *
 * saveButton prop (Plan 06-02): rendered below the Apply CTA in public mode.
 * The caller (page.tsx RSC) constructs the BipSaveButton and passes it as
 * a ReactNode slot so BipSidebar never imports action plumbing directly.
 */
export type BipSidebarMode = 'public' | 'admin-review'

type StatTileProps = {
  icon: LucideIcon
  value: string
  label: string
}

/**
 * A single glanceable fact. The value carries the weight (large, bold); the
 * label sits under it as a quiet eyebrow. Long values (e.g. a spelled-out
 * language) step down a size so they never wrap inside the 340px column.
 */
function StatTile({
  icon: Icon,
  value,
  label,
  span,
}: StatTileProps & { span?: boolean }) {
  return (
    <div
      className={`rounded-lg bg-bg-soft px-3 py-3 ${span ? 'col-span-2' : ''}`}
    >
      <Icon
        size={15}
        strokeWidth={1.9}
        className="text-eu-blue"
        aria-hidden="true"
      />
      <p
        className={`mt-1.5 font-bold leading-none tracking-tight text-ink ${
          value.length > 4 ? 'text-lg' : 'text-2xl'
        }`}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
    </div>
  )
}

/** A fact whose value is prose-shaped (a date range, a city) — icon + row. */
function FactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <dt className="flex shrink-0 items-center gap-2 text-muted">
        <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
        {label}
      </dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  )
}

export function BipSidebar({
  bip,
  mode = 'public',
  saveButton,
}: {
  bip: BipDetail
  mode?: BipSidebarMode
  saveButton?: React.ReactNode
}) {
  const isAdminReview = mode === 'admin-review'
  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/bip/${bip.slug}`
      : `https://biphub.eu/bip/${bip.slug}`

  const host = bip.host_university
  const datesLine =
    formatLongDateRange(bip.physical_start_date, bip.physical_end_date) ?? 'TBC'

  const targetGroupLabel: Record<string, string> = {
    students: 'Students',
    staff: 'Staff',
    students_staff: 'Students/Staff',
  }

  // Only facts that read as a glanceable value get a tile. Anything missing is
  // dropped rather than rendered as '–' — an empty tile is visual noise.
  const stats: StatTileProps[] = [
    bip.ects_credits != null && {
      icon: Award,
      value: String(bip.ects_credits),
      label: 'ECTS credits',
    },
    // DETL-15 participant capacity
    bip.max_participants != null && {
      icon: Users,
      value: String(bip.max_participants),
      label: 'Max places',
    },
    bip.language_of_instruction && {
      icon: Languages,
      value: bip.language_of_instruction.toUpperCase(),
      label: 'Language',
    },
    // DETL-05 CEFR language level
    bip.language_level_min && {
      icon: Signal,
      value: bip.language_level_min,
      label: 'Min level',
    },
  ].filter(Boolean) as StatTileProps[]

  return (
    <aside
      aria-label="Key facts"
      className="hidden lg:block sticky top-[88px] self-start"
    >
      <div className="bg-white border border-border rounded-lg p-6 shadow-sm">
        {/* Deadline chip */}
        <DeadlineBadge deadline={bip.application_deadline} />

        {/* Apply CTA — full sidebar width. Suppressed in admin-review mode. */}
        {!isAdminReview && (
          <div className="mt-4">
            <BipApplyCta bip={bip} fullWidth />
          </div>
        )}

        {/* Save button slot — rendered below Apply CTA, suppressed in admin-review mode. */}
        {!isAdminReview && saveButton && (
          <div className="mt-2">
            {saveButton}
          </div>
        )}

        {/* Key facts — short numeric/code values become scannable stat tiles;
            longer text values (dates, city, audience) stay as icon-led rows,
            since a date range can't be read at a glance as a numeral. */}
        <div className="mt-6 pt-6 border-t border-border">
          <h2 className="mb-3 text-sm font-bold text-ink">Key facts</h2>

          {stats.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {stats.map((stat, i) => (
                <StatTile
                  key={stat.label}
                  {...stat}
                  // An odd count would leave a half-width gap — let the last
                  // tile span the row instead.
                  span={stats.length % 2 === 1 && i === stats.length - 1}
                />
              ))}
            </div>
          )}

          <dl className={stats.length > 0 ? 'mt-4 space-y-2.5' : 'space-y-2.5'}>
            <FactRow icon={CalendarDays} label="Dates" value={datesLine} />
            <FactRow
              icon={MapPin}
              label="City"
              value={bip.host_city ?? host?.city ?? '–'}
            />
            {bip.target_group && (
              <FactRow
                icon={UserRound}
                label="Open to"
                value={targetGroupLabel[bip.target_group] ?? bip.target_group}
              />
            )}
          </dl>
        </div>

        {/* Action row: Share. Suppressed in admin-review mode. */}
        {!isAdminReview && (
          <div className="mt-6 pt-6 border-t border-border">
            <ShareButton title={bip.title} url={url} />
          </div>
        )}
      </div>
    </aside>
  )
}
