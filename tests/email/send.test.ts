/**
 * Email send wrapper tests — Phase 3 ADMN-09 (approval), ADMN-10 (rejection),
 * D-15 local-dev console fallback.
 *
 * Threat: T-03-05 — service-role key leakage / API key exposed to client.
 * Mitigation: `lib/email/send.ts` is server-only; D-15 fallback uses
 * console.log (no network) when RESEND_API_KEY is unset.
 *
 * Source: 03-CONTEXT.md D-15; 03-RESEARCH.md Pattern 5.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock react-email render — we don't need actual HTML for these tests
vi.mock('@react-email/components', async () => {
  const actual = await vi.importActual<typeof import('@react-email/components')>(
    '@react-email/components',
  )
  return { ...actual, render: vi.fn(async () => '<html>stub</html>') }
})

// Mock the Resend SDK so we never make network calls
const mockSend = vi.fn(async () => ({ data: { id: 'mock' }, error: null }))
vi.mock('resend', () => ({
  // Use a real function (not an arrow) so `new Resend(...)` works as a constructor
  Resend: function MockResend() {
    return { emails: { send: mockSend } }
  },
}))

describe('sendEmail (D-15 fallback)', () => {
  beforeEach(() => {
    vi.resetModules()
    mockSend.mockClear()
    mockSend.mockImplementation(async () => ({ data: { id: 'mock' }, error: null }))
    vi.unstubAllEnvs()
  })

  it('logs rendered HTML + recipient + subject to console when RESEND_API_KEY unset', async () => {
    vi.stubEnv('RESEND_API_KEY', '')
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const { sendEmail } = await import('@/lib/email/send')
    await sendEmail('alice@example.com', {
      template: 'approval',
      props: { bipTitle: 'Quantum BIP', bipSlug: 'quantum-bip', coordinatorName: 'Alice' },
    })
    expect(spy).toHaveBeenCalledWith(
      '[EMAIL DEV]',
      expect.objectContaining({
        to: 'alice@example.com',
        subject: 'Your BIP is live on BipHub',
      }),
    )
    expect(mockSend).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('calls resend.emails.send with from=BipHub <noreply@biphub.eu> when key set', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_fake_test_key')
    const { sendEmail } = await import('@/lib/email/send')
    await sendEmail('alice@example.com', {
      template: 'approval',
      props: { bipTitle: 'Quantum BIP', bipSlug: 'quantum-bip', coordinatorName: 'Alice' },
    })
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'BipHub <noreply@biphub.eu>',
        to: 'alice@example.com',
        subject: 'Your BIP is live on BipHub',
      }),
    )
  })

  it('uses ADMIN_REPLY_TO_EMAIL env var as replyTo when set', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_fake_test_key')
    vi.stubEnv('ADMIN_REPLY_TO_EMAIL', 'reply@biphub.eu')
    const { sendEmail } = await import('@/lib/email/send')
    await sendEmail('alice@example.com', {
      template: 'approval',
      props: { bipTitle: 'Q', bipSlug: 'q', coordinatorName: 'Alice' },
    })
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: 'reply@biphub.eu' }),
    )
  })

  it('defaults replyTo to noreply@biphub.eu when ADMIN_REPLY_TO_EMAIL unset', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_fake_test_key')
    vi.stubEnv('ADMIN_REPLY_TO_EMAIL', '')
    const { sendEmail } = await import('@/lib/email/send')
    await sendEmail('a@x.io', {
      template: 'approval',
      props: { bipTitle: 'Q', bipSlug: 'q', coordinatorName: 'A' },
    })
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: 'noreply@biphub.eu' }),
    )
  })

  it('uses dynamic subject "New BIP pending review: {title}" for admin-notification template', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_fake_test_key')
    const { sendEmail } = await import('@/lib/email/send')
    await sendEmail('admin@x.io', {
      template: 'admin-notification',
      props: {
        bipTitle: 'Quantum BIP',
        bipId: 'q1',
        coordinatorName: 'Alice',
        coordinatorUniversity: 'TU Delft',
        submittedAt: '2026-05-12T10:00:00Z',
      },
    })
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'New BIP pending review: Quantum BIP',
      }),
    )
  })

  it('uses static subject for approval and rejection templates', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_fake_test_key')
    const { sendEmail } = await import('@/lib/email/send')
    await sendEmail('a@x.io', {
      template: 'approval',
      props: { bipTitle: 'X', bipSlug: 'x', coordinatorName: 'A' },
    })
    expect(mockSend).toHaveBeenLastCalledWith(
      expect.objectContaining({
        subject: 'Your BIP is live on BipHub',
      }),
    )
    await sendEmail('a@x.io', {
      template: 'rejection',
      props: {
        bipTitle: 'X',
        bipId: 'x',
        coordinatorName: 'A',
        reason: 'x'.repeat(20),
      },
    })
    expect(mockSend).toHaveBeenLastCalledWith(
      expect.objectContaining({
        subject: 'Update needed on your BIP submission',
      }),
    )
  })

  it('does not swallow error when resend.emails.send rejects (fire-and-forget contract D-11 enforced at caller)', async () => {
    vi.stubEnv('RESEND_API_KEY', 're_fake_test_key')
    mockSend.mockRejectedValueOnce(new Error('Resend down'))
    const { sendEmail } = await import('@/lib/email/send')
    // sendEmail itself propagates the error so callers can log it.
    // The fire-and-forget guarantee is enforced by the Server Action wrapping
    // sendEmail in try/catch — NOT here.
    await expect(
      sendEmail('a@x.io', {
        template: 'approval',
        props: { bipTitle: 'Q', bipSlug: 'q', coordinatorName: 'A' },
      }),
    ).rejects.toThrow('Resend down')
  })
})
