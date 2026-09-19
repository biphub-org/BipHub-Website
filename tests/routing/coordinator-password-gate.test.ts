import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Invite-acceptance hole: clicking a coordinator invite link runs verifyOtp,
 * which establishes a FULL session before any password is set. An approved
 * coordinator who never sets a password must not reach /dashboard — the
 * dashboard layout bounces password-less sessions to /reset-password/update
 * until they do (signal: auth.users.encrypted_password via migration 00056).
 */

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')

const LAYOUT = readFileSync(join(root, 'app/(dashboard)/layout.tsx'), 'utf8')
const MIGRATION = readFileSync(
  join(root, 'supabase/migrations/00056_current_user_has_password.sql'),
  'utf8',
)
const UPDATE_PAGE = readFileSync(
  join(root, 'app/(auth)/reset-password/update/page.tsx'),
  'utf8',
)

describe('coordinator password gate', () => {
  it('dashboard layout checks current_user_has_password', () => {
    expect(LAYOUT).toContain('current_user_has_password')
  })

  it('dashboard layout bounces password-less sessions to /reset-password/update', () => {
    expect(LAYOUT).toContain("redirect('/reset-password/update')")
  })

  it('migration reads encrypted_password under SECURITY DEFINER', () => {
    expect(MIGRATION).toContain('encrypted_password')
    expect(MIGRATION).toContain('security definer')
  })

  it('migration grants execute to authenticated sessions', () => {
    expect(MIGRATION).toMatch(/grant execute.*to authenticated/s)
  })

  it('remediation page documents the invite first-password flow', () => {
    expect(UPDATE_PAGE).toContain('type=invite')
  })
})
