/**
 * Contact inbox routing — general inquiries go to contact@, technical
 * support to support@. Env vars override per-topic; ADMIN_NOTIFICATION_EMAIL
 * stays as the middle fallback.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveContactRecipient } from '@/lib/constants/contact'

describe('resolveContactRecipient', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('routes support topic to support@biphub.org by default', () => {
    expect(resolveContactRecipient('support')).toBe('support@biphub.org')
  })

  it('routes general and bip-listing topics to contact@biphub.org by default', () => {
    expect(resolveContactRecipient('general')).toBe('contact@biphub.org')
    expect(resolveContactRecipient('bip-listing')).toBe('contact@biphub.org')
  })

  it('honours SUPPORT_TO_EMAIL for the support topic only', () => {
    vi.stubEnv('SUPPORT_TO_EMAIL', 'help@example.org')
    expect(resolveContactRecipient('support')).toBe('help@example.org')
    expect(resolveContactRecipient('general')).toBe('contact@biphub.org')
  })

  it('honours CONTACT_TO_EMAIL for non-support topics only', () => {
    vi.stubEnv('CONTACT_TO_EMAIL', 'hello@example.org')
    expect(resolveContactRecipient('general')).toBe('hello@example.org')
    expect(resolveContactRecipient('support')).toBe('support@biphub.org')
  })

  it('falls back to ADMIN_NOTIFICATION_EMAIL when the topic inbox is unset', () => {
    vi.stubEnv('ADMIN_NOTIFICATION_EMAIL', 'admin@example.org')
    expect(resolveContactRecipient('support')).toBe('admin@example.org')
    expect(resolveContactRecipient('general')).toBe('admin@example.org')
  })
})
