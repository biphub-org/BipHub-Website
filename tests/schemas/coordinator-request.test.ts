import { describe, it, expect } from 'vitest'
import { coordinatorRequestSchema } from '@/lib/schemas/coordinator-request'
import { mapLoginMethod } from '@/lib/auth/login-method'

/**
 * Coordinator access-request contract (migration 00054):
 *   - The request carries the coordinator details + login email, no password.
 *   - The unified login maps RPC results to steps, including the
 *     "submission under review" states.
 */

const validRequest = {
  email: 'coord@university.edu',
  full_name: 'Dr. Jane Smith',
  university_id: '123e4567-e89b-12d3-a456-426614174000',
  country: 'DE',
  erasmus_code: 'D MUNCHEN02',
}

describe('coordinatorRequestSchema', () => {
  it('accepts the coordinator details plus the login email', () => {
    const parsed = coordinatorRequestSchema.safeParse(validRequest)
    expect(parsed.success).toBe(true)
  })

  it('lowercases the login email', () => {
    const parsed = coordinatorRequestSchema.safeParse({
      ...validRequest,
      email: 'Coord@University.EDU',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.email).toBe('coord@university.edu')
  })

  it('rejects a missing login email', () => {
    expect(
      coordinatorRequestSchema.safeParse({ ...validRequest, email: undefined })
        .success,
    ).toBe(false)
  })

  it('rejects an invalid login email', () => {
    expect(
      coordinatorRequestSchema.safeParse({ ...validRequest, email: 'not-an-email' })
        .success,
    ).toBe(false)
  })

  it('inherits the profile validations (name, university, erasmus code)', () => {
    expect(
      coordinatorRequestSchema.safeParse({ ...validRequest, full_name: 'J' }).success,
    ).toBe(false)
    expect(
      coordinatorRequestSchema.safeParse({ ...validRequest, university_id: 'nope' })
        .success,
    ).toBe(false)
    expect(
      coordinatorRequestSchema.safeParse({ ...validRequest, erasmus_code: 'x' })
        .success,
    ).toBe(false)
  })

  it('has no contact_email field — email is the single address', () => {
    const parsed = coordinatorRequestSchema.safeParse(validRequest)
    expect(parsed.success).toBe(true)
    if (parsed.success) expect('contact_email' in parsed.data).toBe(false)
  })
})

describe('mapLoginMethod', () => {
  it('maps account roles to password login', () => {
    expect(mapLoginMethod('student')).toBe('password')
    expect(mapLoginMethod('coordinator')).toBe('password')
    expect(mapLoginMethod('admin')).toBe('password')
  })

  it('maps request states to their review steps', () => {
    expect(mapLoginMethod('pending')).toBe('pending')
    expect(mapLoginMethod('rejected')).toBe('rejected')
    expect(mapLoginMethod('approved')).toBe('approved')
  })

  it('maps missing/garbage results to unknown', () => {
    expect(mapLoginMethod(null)).toBe('unknown')
    expect(mapLoginMethod(undefined)).toBe('unknown')
    expect(mapLoginMethod('')).toBe('unknown')
    expect(mapLoginMethod('superadmin')).toBe('unknown')
  })
})
