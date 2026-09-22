import { describe, it, expect } from 'vitest'
import { extractAuthDisplayFields, resolveAdminUserDisplay } from '@/lib/auth/admin-user-display'

const CONFIRMED = '2026-02-01T10:00:00Z'

describe('resolveAdminUserDisplay', () => {
  it('prefers the profile name when present', () => {
    expect(
      resolveAdminUserDisplay({
        kind: 'student',
        profileName: 'Ada Lovelace',
        authName: 'Other Name',
        emailConfirmedAt: CONFIRMED,
      }),
    ).toEqual({ name: 'Ada Lovelace', unverified: false })
  })

  it('falls back to the auth-record name for bare (unverified) profiles', () => {
    expect(
      resolveAdminUserDisplay({
        kind: 'student',
        profileName: null,
        authName: 'Grace Hopper',
        emailConfirmedAt: null,
      }),
    ).toEqual({ name: 'Grace Hopper', unverified: true })
  })

  it('treats blank names as missing', () => {
    expect(
      resolveAdminUserDisplay({
        kind: 'coordinator',
        profileName: '   ',
        authName: '  Edsger Dijkstra  ',
        emailConfirmedAt: CONFIRMED,
      }),
    ).toEqual({ name: 'Edsger Dijkstra', unverified: false })
  })

  it('keeps the Unnamed fallback per kind when no name exists anywhere', () => {
    expect(
      resolveAdminUserDisplay({
        kind: 'student',
        profileName: null,
        authName: null,
        emailConfirmedAt: null,
      }),
    ).toEqual({ name: 'Unnamed student', unverified: true })
    expect(
      resolveAdminUserDisplay({
        kind: 'coordinator',
        profileName: null,
        authName: undefined,
        emailConfirmedAt: CONFIRMED,
      }),
    ).toEqual({ name: 'Unnamed coordinator', unverified: false })
  })

  it('extracts each metadata field independently', () => {
    expect(
      extractAuthDisplayFields({
        full_name: '  Ada Lovelace  ',
        country: 'GB',
        university_id: 'uni-1',
      }),
    ).toEqual({ name: 'Ada Lovelace', country: 'GB', universityId: 'uni-1' })
  })

  it('treats blank or non-string metadata values as missing, per field', () => {
    expect(
      extractAuthDisplayFields({ full_name: '   ', country: 42, university_id: '' }),
    ).toEqual({ name: null, country: null, universityId: null })
    expect(extractAuthDisplayFields(null)).toEqual({
      name: null,
      country: null,
      universityId: null,
    })
    expect(extractAuthDisplayFields(undefined)).toEqual({
      name: null,
      country: null,
      universityId: null,
    })
  })

  it('keeps a lone name when other metadata fields are absent', () => {
    // Coordinator invites carry only { role } — a name alone must display.
    expect(extractAuthDisplayFields({ role: 'coordinator' })).toEqual({
      name: null,
      country: null,
      universityId: null,
    })
    expect(extractAuthDisplayFields({ full_name: 'Solo Name' })).toEqual({
      name: 'Solo Name',
      country: null,
      universityId: null,
    })
  })

  it('marks unconfirmed emails unverified even when the profile is complete', () => {
    // e.g. an invited coordinator who has not accepted yet
    expect(
      resolveAdminUserDisplay({
        kind: 'coordinator',
        profileName: 'Katherine Johnson',
        authName: null,
        emailConfirmedAt: null,
      }),
    ).toEqual({ name: 'Katherine Johnson', unverified: true })
  })
})
