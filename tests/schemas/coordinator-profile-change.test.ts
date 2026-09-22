import { describe, it, expect } from 'vitest'
import { coordinatorProfileChangeSchema } from '@/lib/schemas/coordinator-profile-change'

/**
 * Coordinator data-change request contract (migration 00059):
 *   - A coordinator proposes new profile values (full name, contact email,
 *     university, Erasmus code); nothing is written to `profiles` until an
 *     admin approves.
 *   - `contact_email` here is the public contact shown on BIPs — it never
 *     changes the auth sign-in email.
 */

const validChange = {
  full_name: 'Dr. Jane Smith',
  contact_email: 'jane.smith@university.edu',
  university_id: '123e4567-e89b-12d3-a456-426614174000',
  erasmus_code: 'D MUNCHEN02',
}

describe('coordinatorProfileChangeSchema', () => {
  it('accepts a full profile-change payload', () => {
    const parsed = coordinatorProfileChangeSchema.safeParse(validChange)
    expect(parsed.success).toBe(true)
  })

  it('lowercases the contact email', () => {
    const parsed = coordinatorProfileChangeSchema.safeParse({
      ...validChange,
      contact_email: 'Jane.Smith@University.EDU',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.contact_email).toBe('jane.smith@university.edu')
    }
  })

  it('rejects a short display name', () => {
    expect(
      coordinatorProfileChangeSchema.safeParse({ ...validChange, full_name: 'J' })
        .success,
    ).toBe(false)
  })

  it('rejects an invalid contact email', () => {
    expect(
      coordinatorProfileChangeSchema.safeParse({
        ...validChange,
        contact_email: 'not-an-email',
      }).success,
    ).toBe(false)
  })

  it('rejects a non-UUID university', () => {
    expect(
      coordinatorProfileChangeSchema.safeParse({
        ...validChange,
        university_id: 'nope',
      }).success,
    ).toBe(false)
  })

  it('rejects a short Erasmus code', () => {
    expect(
      coordinatorProfileChangeSchema.safeParse({ ...validChange, erasmus_code: 'x' })
        .success,
    ).toBe(false)
  })

  it('carries no role/status/country fields — approval metadata lives server-side', () => {
    const parsed = coordinatorProfileChangeSchema.safeParse(validChange)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect('role' in parsed.data).toBe(false)
      expect('status' in parsed.data).toBe(false)
      expect('country' in parsed.data).toBe(false)
    }
  })
})
