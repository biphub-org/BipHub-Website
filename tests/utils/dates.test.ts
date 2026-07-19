import { describe, it, expect } from 'vitest'
import { formatLongDate, formatLongDateRange, formatLongDates } from '@/lib/utils/dates'

describe('formatLongDate — "10th January 2026" form', () => {
  it('formats a mid-month date with the right ordinal', () => {
    expect(formatLongDate('2026-01-10')).toBe('10th January 2026')
  })

  it('uses st / nd / rd suffixes', () => {
    expect(formatLongDate('2026-02-01')).toBe('1st February 2026')
    expect(formatLongDate('2026-03-02')).toBe('2nd March 2026')
    expect(formatLongDate('2026-04-03')).toBe('3rd April 2026')
  })

  it('uses th for the 11-13 exceptions', () => {
    expect(formatLongDate('2026-05-11')).toBe('11th May 2026')
    expect(formatLongDate('2026-05-12')).toBe('12th May 2026')
    expect(formatLongDate('2026-05-13')).toBe('13th May 2026')
  })

  it('does not drift across timezones (UTC parse)', () => {
    expect(formatLongDate('2026-12-31')).toBe('31st December 2026')
  })

  it('accepts full ISO timestamps (drops the time component)', () => {
    expect(formatLongDate('2026-01-15T14:30:00Z')).toBe('15th January 2026')
    expect(formatLongDate('2026-01-15 14:30:00')).toBe('15th January 2026')
  })

  it('returns null for empty input and passes through unparseable strings', () => {
    expect(formatLongDate('')).toBeNull()
    expect(formatLongDate(null)).toBeNull()
    expect(formatLongDate('not-a-date')).toBe('not-a-date')
  })
})

describe('formatLongDateRange', () => {
  it('joins two dates with an en dash', () => {
    expect(formatLongDateRange('2026-09-01', '2026-09-10')).toBe(
      '1st September 2026 – 10th September 2026',
    )
  })

  it('falls back to a single endpoint when the other is missing', () => {
    expect(formatLongDateRange('2026-09-01', null)).toBe('1st September 2026')
    expect(formatLongDateRange(null, '2026-09-10')).toBe('10th September 2026')
  })

  it('returns null when both endpoints are empty', () => {
    expect(formatLongDateRange(null, null)).toBeNull()
    expect(formatLongDateRange('', '')).toBeNull()
  })
})

describe('formatLongDates — list joining', () => {
  it('joins multiple dates and drops blanks', () => {
    expect(formatLongDates(['2026-01-10', '', '2026-02-03'])).toBe(
      '10th January 2026, 3rd February 2026',
    )
  })

  it('returns null for empty / all-blank lists', () => {
    expect(formatLongDates([])).toBeNull()
    expect(formatLongDates(['', ''])).toBeNull()
    expect(formatLongDates(null)).toBeNull()
  })
})
