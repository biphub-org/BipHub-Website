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
import { formatLongDateRange } from '@/lib/utils/dates'

/**
 * BipKeyFacts — the ECTS / places / language / level / dates / city block.
 *
 * Rendered TWICE by design, never at the same time:
 *   - inside BipSidebar at lg+ (the sidebar is `hidden lg:block`)
 *   - inline under the header below lg, where the sidebar doesn't exist
 *
 * Before this was extracted the facts lived only in the sidebar, so on a phone
 * ECTS, language, level, capacity, dates and city appeared nowhere on the page
 * — the mobile bar carries only the deadline and the Apply/Save actions.
 *
 * Facts are split by the SHAPE of their value: short ones become stat tiles
 * (readable at a glance), prose-shaped ones (a date range, a city) stay as
 * rows, because a date range can't be read as a numeral.
 *
 * No hooks — stays a server component when the mobile copy is rendered from
 * the RSC page.
 */

type StatTileProps = {
  icon: LucideIcon
  value: string
  label: string
}

export function BipKeyFacts({
  bip,
  className,
}: {
  bip: BipDetail
  className?: string
}) {
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
    <div className={className}>
      <h2 className="mb-3 text-sm font-bold text-ink">Key facts</h2>

      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {stats.map((stat, i) => (
            <StatTile
              key={stat.label}
              {...stat}
              // An odd count would leave a half-width gap — let the last tile
              // span the row instead.
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
  )
}

/**
 * A single glanceable fact. The value carries the weight (large, bold); the
 * label sits under it as a quiet eyebrow. Long values (e.g. a spelled-out
 * language) step down a size so they never wrap in the 340px sidebar.
 */
function StatTile({
  icon: Icon,
  value,
  label,
  span,
}: StatTileProps & { span?: boolean }) {
  return (
    // Matches the mockup's `.stat:hover` — a small lift and a background step.
    // Non-interactive by design, so the tint stays subtle rather than reading
    // as a click target.
    <div
      className={`group rounded-lg bg-bg-soft px-3 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:bg-eu-blue-50 ${span ? 'col-span-2' : ''}`}
    >
      <Icon
        size={15}
        strokeWidth={1.9}
        className="text-eu-blue transition-transform duration-200 group-hover:scale-110"
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
