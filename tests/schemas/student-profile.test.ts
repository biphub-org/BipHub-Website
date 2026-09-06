import { describe, it, expect } from 'vitest'
import { studentProfileSchema } from '@/lib/schemas/profile'
import { studentRegisterSchema } from '@/lib/schemas/auth'

const UNI_ID = '123e4567-e89b-12d3-a456-426614174000'

const validProfile = {
  full_name: 'Jane Smith',
  country: 'BE',
  university_id: UNI_ID,
}

const validRegistration = {
  ...validProfile,
  email: 'jane@example.be',
  password: 'Password!123',
  confirmPassword: 'Password!123',
}

describe('studentProfileSchema', () => {
  it('accepts a complete profile with university', () => {
    const result = studentProfileSchema.safeParse(validProfile)
    expect(result.success).toBe(true)
  })

  it('accepts a profile without university (optional)', () => {
    const result = studentProfileSchema.safeParse({
      full_name: 'Jane Smith',
      country: 'FR',
      university_id: '',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.university_id).toBeUndefined()
  })

  it('rejects a missing full name', () => {
    const result = studentProfileSchema.safeParse({ ...validProfile, full_name: 'J' })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown country code', () => {
    const result = studentProfileSchema.safeParse({ ...validProfile, country: 'XX' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty country', () => {
    const result = studentProfileSchema.safeParse({ ...validProfile, country: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a malformed university id', () => {
    const result = studentProfileSchema.safeParse({ ...validProfile, university_id: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })
})

describe('studentRegisterSchema', () => {
  it('accepts a complete registration', () => {
    expect(studentRegisterSchema.safeParse(validRegistration).success).toBe(true)
  })

  it('rejects a registration without personal details', () => {
    const noDetails = { ...validRegistration, full_name: undefined, country: undefined }
    expect(studentRegisterSchema.safeParse(noDetails).success).toBe(false)
  })

  it('rejects mismatched passwords', () => {
    const result = studentRegisterSchema.safeParse({
      ...validRegistration,
      confirmPassword: 'Different!123',
    })
    expect(result.success).toBe(false)
  })
})
