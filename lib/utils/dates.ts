/**
 * Human-friendly date formatting for BIP content.
 *
 * `formatLongDate` renders an ISO date (YYYY-MM-DD) as "10th January 2026" —
 * day-of-month with an ordinal suffix, full month name, four-digit year.
 *
 * Dates are parsed as UTC midnight (split-on-'-', Date.UTC) so the rendered
 * day never drifts by a timezone offset — the same discipline as
 * `lib/utils/deadline.ts`.
 */

/** Ordinal suffix for a day-of-month: 1 -> "st", 2 -> "nd", 3 -> "rd", 11 -> "th". */
function ordinalSuffix(day: number): string {
  const mod100 = day % 100
  if (mod100 >= 11 && mod100 <= 13) return 'th'
  switch (day % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

/**
 * Format an ISO date string as "10th January 2026".
 * Returns null for empty/nullish input; returns the raw string unchanged if it
 * is not a parseable YYYY-MM-DD value.
 */
export function formatLongDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  // Accept both plain dates ("2026-01-10") and ISO timestamps
  // ("2026-01-10T14:30:00Z") — keep only the calendar-date portion.
  const datePart = dateStr.split(/[T ]/)[0]
  const parts = datePart.split('-').map(Number)
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return dateStr
  const [year, month, day] = parts
  const date = new Date(Date.UTC(year, month - 1, day))
  const monthName = date.toLocaleDateString('en-GB', {
    month: 'long',
    timeZone: 'UTC',
  })
  return `${day}${ordinalSuffix(day)} ${monthName} ${year}`
}

/**
 * Format a start–end date range as "10th January 2026 – 3rd February 2026".
 * Falls back to whichever endpoint is present; returns null when both are empty.
 */
export function formatLongDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  const from = formatLongDate(start)
  const to = formatLongDate(end)
  if (from && to) return `${from} – ${to}`
  return from ?? to ?? null
}

/**
 * Format a list of ISO dates as a single "10th January 2026, 3rd February 2026"
 * string. Empty/nullish entries are dropped; returns null when nothing remains.
 */
export function formatLongDates(
  dates: Array<string | null | undefined> | null | undefined,
): string | null {
  if (!dates || dates.length === 0) return null
  const formatted = dates
    .map((d) => formatLongDate(d))
    .filter((d): d is string => Boolean(d))
  return formatted.length > 0 ? formatted.join(', ') : null
}
