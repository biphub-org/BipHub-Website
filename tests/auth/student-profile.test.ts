import { describe, it, expect } from 'vitest'
import { parseStudentProfileMetadata } from '@/lib/auth/student-profile'

/**
 * user_metadata → profiles field mapping.
 *
 * Registration details ride in user_metadata until a session exists to write
 * them (callback materialization + first-sign-in backfill). This pins the
 * mapping so a key rename on either side cannot silently leave new students
 * with a bare profile despite holding their data.
 */
describe('parseStudentProfileMetadata', () => {
  it('maps full_name, country and university_id', () => {
    expect(
      parseStudentProfileMetadata({
        role: 'student',
        full_name: 'Jane Smith',
        country: 'DE',
        university_id: '123e4567-e89b-12d3-a456-426614174000',
      }),
    ).toEqual({
      fullName: 'Jane Smith',
      country: 'DE',
      universityId: '123e4567-e89b-12d3-a456-426614174000',
    })
  })

  it('trims the full name', () => {
    expect(
      parseStudentProfileMetadata({ full_name: '  Jane  ', country: 'DE' })?.fullName,
    ).toBe('Jane')
  })

  it('treats a missing university as null (still backfillable)', () => {
    expect(
      parseStudentProfileMetadata({ full_name: 'Jane', country: 'DE' }),
    ).toEqual({ fullName: 'Jane', country: 'DE', universityId: null })
    expect(
      parseStudentProfileMetadata({
        full_name: 'Jane',
        country: 'DE',
        university_id: null,
      })?.universityId,
    ).toBeNull()
  })

  it('returns null when name or country is missing (row stays bare)', () => {
    expect(parseStudentProfileMetadata({ country: 'DE' })).toBeNull()
    expect(parseStudentProfileMetadata({ full_name: 'Jane' })).toBeNull()
    expect(parseStudentProfileMetadata({})).toBeNull()
    expect(
      parseStudentProfileMetadata({ full_name: '  ', country: 'DE' }),
    ).toBeNull()
  })

  it('ignores non-string junk instead of crashing', () => {
    expect(
      parseStudentProfileMetadata({
        full_name: 42,
        country: ['DE'],
        university_id: 7,
      }),
    ).toBeNull()
  })
})
