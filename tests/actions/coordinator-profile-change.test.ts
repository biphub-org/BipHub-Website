import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Admin notification email for profile data-change requests.
 *
 * Regression: submitProfileChangeRequestAction filled the admin email with
 * the REQUESTED (new) values, so the admin saw a coordinator identity that
 * doesn't exist yet. The email must carry the coordinator's ACTUAL
 * (pre-change) profile data — the requested values live in the
 * data-changes inbox diff.
 */

const { mockCreateClient, mockSendEmail, mockRevalidatePath } = vi.hoisted(
  () => ({
    mockCreateClient: vi.fn(),
    mockSendEmail: vi.fn(),
    mockRevalidatePath: vi.fn(),
  }),
)

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

vi.mock('@/lib/email/send', () => ({
  sendEmail: mockSendEmail,
}))

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}))

import { submitProfileChangeRequestAction } from '@/lib/actions/coordinator-profile-change'

const CURRENT_PROFILE = {
  full_name: 'Current Name',
  contact_email: 'current@uni.edu',
  erasmus_code: 'CUR CODE01',
  university: { name: 'Current University' },
}

function stubClient() {
  const from = vi.fn((table: string) => {
    const q: Record<string, unknown> = {}
    q.select = vi.fn(() => q)
    q.eq = vi.fn(() => q)
    q.insert = vi.fn().mockResolvedValue({ error: null })
    if (table === 'profiles') {
      q.maybeSingle = vi
        .fn()
        .mockResolvedValue({ data: CURRENT_PROFILE, error: null })
    } else if (table === 'universities') {
      q.maybeSingle = vi
        .fn()
        .mockResolvedValue({
          data: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Requested University',
          },
          error: null,
        })
    } else {
      // coordinator_profile_change_requests live-check: none pending
      q.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    }
    return q
  })
  return {
    auth: {
      getClaims: vi
        .fn()
        .mockResolvedValue({ data: { claims: { sub: 'user-1' } }, error: null }),
    },
    from,
  }
}

function requestedForm(): FormData {
  const fd = new FormData()
  fd.set('full_name', 'Requested Name')
  fd.set('contact_email', 'requested@uni.edu')
  fd.set('university_id', '123e4567-e89b-12d3-a456-426614174000')
  fd.set('erasmus_code', 'REQ CODE02')
  return fd
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('ADMIN_NOTIFICATION_EMAIL', 'admin@biphub.eu')
  mockCreateClient.mockResolvedValue(stubClient())
  mockSendEmail.mockResolvedValue(undefined)
})

describe('submitProfileChangeRequestAction admin email', () => {
  it('sends the coordinator CURRENT profile data, not the requested values', async () => {
    const result = await submitProfileChangeRequestAction(requestedForm())

    expect(result).toEqual({ success: true })
    expect(mockSendEmail).toHaveBeenCalledOnce()
    const [recipient, payload] = mockSendEmail.mock.calls[0] as [
      string,
      { template: string; props: Record<string, string> },
    ]
    expect(recipient).toBe('admin@biphub.eu')
    expect(payload.template).toBe('profile-change-request-admin')
    expect(payload.props.coordinatorName).toBe('Current Name')
    expect(payload.props.coordinatorEmail).toBe('current@uni.edu')
    expect(payload.props.universityName).toBe('Current University')
    expect(payload.props.erasmusCode).toBe('CUR CODE01')
    // The requested (new) values must NOT leak into the identity fields.
    for (const value of Object.values(payload.props)) {
      expect(String(value)).not.toContain('Requested')
    }
    expect(payload.props.coordinatorEmail).not.toContain('requested@uni.edu')
  })
})
