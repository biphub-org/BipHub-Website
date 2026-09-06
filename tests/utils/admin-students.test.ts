import { describe, it, expect } from 'vitest'
import { formatAlertSummary, type AdminStudentAlerts } from '@/lib/queries/adminStudents'

function prefs(overrides: Partial<AdminStudentAlerts> = {}): AdminStudentAlerts {
  return {
    fields: [],
    countries: [],
    iscedCodes: [],
    frequency: 'weekly',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('formatAlertSummary', () => {
  it('always shows the capitalised frequency', () => {
    expect(formatAlertSummary(prefs())).toBe('Weekly')
    expect(formatAlertSummary(prefs({ frequency: 'daily' }))).toBe('Daily')
  })

  it('appends non-empty dimensions with singular/plural forms', () => {
    expect(
      formatAlertSummary(
        prefs({ fields: ['a', 'b'], countries: ['BE'], iscedCodes: ['0613', '0111', '0232'] }),
      ),
    ).toBe('Weekly · 2 fields · 1 country · 3 ISCED')
  })

  it('uses singular for a single field and plural countries', () => {
    expect(
      formatAlertSummary(prefs({ fields: ['a'], countries: ['BE', 'FR'] })),
    ).toBe('Weekly · 1 field · 2 countries')
  })

  it('omits empty dimensions', () => {
    expect(formatAlertSummary(prefs({ iscedCodes: ['0613'] }))).toBe('Weekly · 1 ISCED')
  })
})
