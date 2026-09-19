import { describe, it, expect } from 'vitest'
import {
  findUserByEmail,
  isInviteAlreadyExistsError,
  shouldAdoptExistingAccount,
} from '@/lib/auth/coordinator-approve'

/**
 * Retry-safe coordinator approve (approve → invite sent, status update
 * failed → retry hits "already exists").
 *
 * The retry must adopt the existing account ONLY when it is a coordinator
 * (the first attempt created it) — never a student/admin account that
 * happens to share the email — and only for genuine already-exists invite
 * failures, never for other errors.
 */

describe('isInviteAlreadyExistsError', () => {
  it('matches the known Supabase already-exists wordings', () => {
    expect(isInviteAlreadyExistsError('User already registered')).toBe(true)
    expect(isInviteAlreadyExistsError('An account already exists')).toBe(true)
    expect(isInviteAlreadyExistsError('email exists')).toBe(true)
  })

  it('does not match unrelated failures or empty input', () => {
    expect(isInviteAlreadyExistsError('Failed to send email')).toBe(false)
    expect(isInviteAlreadyExistsError('rate limit exceeded')).toBe(false)
    expect(isInviteAlreadyExistsError('')).toBe(false)
    expect(isInviteAlreadyExistsError(null)).toBe(false)
    expect(isInviteAlreadyExistsError(undefined)).toBe(false)
  })
})

describe('shouldAdoptExistingAccount', () => {
  it('adopts only a coordinator account', () => {
    expect(shouldAdoptExistingAccount('coordinator')).toBe(true)
  })

  it('refuses student, admin, unknown and missing roles', () => {
    expect(shouldAdoptExistingAccount('student')).toBe(false)
    expect(shouldAdoptExistingAccount('admin')).toBe(false)
    expect(shouldAdoptExistingAccount('something-else')).toBe(false)
    expect(shouldAdoptExistingAccount(null)).toBe(false)
    expect(shouldAdoptExistingAccount(undefined)).toBe(false)
  })
})

describe('findUserByEmail', () => {
  const users = [
    { id: 'u1', email: 'Coord@University.edu' },
    { id: 'u2', email: 'other@example.com' },
  ]

  it('matches case-insensitively across a listUsers page', () => {
    expect(findUserByEmail(users, 'coord@university.edu')).toEqual(users[0])
    expect(findUserByEmail(users, '  COORD@UNIVERSITY.EDU ')).toEqual(users[0])
  })

  it('returns null when the email is absent or blank', () => {
    expect(findUserByEmail(users, 'missing@example.com')).toBeNull()
    expect(findUserByEmail([], 'coord@university.edu')).toBeNull()
    expect(findUserByEmail(users, '   ')).toBeNull()
  })
})
