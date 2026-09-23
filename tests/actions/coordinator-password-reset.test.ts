import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Coordinator self-service password reset (AUTH-05a2).
 *
 * One click in /dashboard/settings emails a Supabase recovery link to the
 * caller's OWN login email (fixed server-side from claims — no email input,
 * no enumeration oracle, no admin approval request). The link lands on the
 * shared recovery flow, which redirects back to /dashboard.
 */

const { mockCreateClient, mockResetPasswordForEmail } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockResetPasswordForEmail: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

import { sendOwnPasswordResetAction } from '@/lib/actions/auth'

function stubClient(claims: unknown) {
  return {
    auth: {
      getClaims: vi.fn().mockResolvedValue(
        claims ? { data: { claims }, error: null } : { data: null, error: { message: 'no session' } },
      ),
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  }
}

const CLAIMS = { sub: 'coord-1', email: 'coord@uni.edu', app_metadata: { role: 'coordinator' } }

beforeEach(() => {
  vi.resetAllMocks()
  vi.unstubAllEnvs()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

describe('sendOwnPasswordResetAction', () => {
  it('emails the recovery link to the caller’s own address', async () => {
    vi.stubEnv('EMAIL_SENDING_ENABLED', 'true')
    mockCreateClient.mockResolvedValue(stubClient(CLAIMS))
    mockResetPasswordForEmail.mockResolvedValue({ error: null })

    await expect(sendOwnPasswordResetAction()).resolves.toEqual({ success: true })
    expect(mockResetPasswordForEmail).toHaveBeenCalledOnce()
    const [email, opts] = mockResetPasswordForEmail.mock.calls[0] as [
      string,
      { redirectTo: string },
    ]
    expect(email).toBe('coord@uni.edu')
    expect(opts.redirectTo).toContain('/auth/callback?type=recovery')
  })

  it('refuses without a session and sends nothing', async () => {
    vi.stubEnv('EMAIL_SENDING_ENABLED', 'true')
    mockCreateClient.mockResolvedValue(stubClient(null))

    await expect(sendOwnPasswordResetAction()).resolves.toEqual({
      error: 'Your session has expired. Please sign in again.',
    })
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('returns an honest error (not fake success) while sending is paused', async () => {
    vi.stubEnv('EMAIL_SENDING_ENABLED', '')
    mockCreateClient.mockResolvedValue(stubClient(CLAIMS))

    const result = await sendOwnPasswordResetAction()
    expect(result.error).toMatch(/temporarily paused/)
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('surfaces send failures instead of silent success', async () => {
    vi.stubEnv('EMAIL_SENDING_ENABLED', 'true')
    mockCreateClient.mockResolvedValue(stubClient(CLAIMS))
    mockResetPasswordForEmail.mockResolvedValue({ error: { message: 'smtp down' } })

    const result = await sendOwnPasswordResetAction()
    expect(result.error).toMatch(/couldn't send/)
  })
})
