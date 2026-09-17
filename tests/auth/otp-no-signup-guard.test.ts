import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Guard: magic-link OTP must never create users. signInWithOtpAction runs
 * with shouldCreateUser:false so unknown emails get a "no account" error
 * pointing at registration — there is no complete-profile flow to fill the
 * bare profiles auto-creation would leave behind.
 *
 * If someone flips the flag back, new OTP users silently land on the
 * dashboard with empty profiles. This pins the wiring (repo convention:
 * source-content guards like auth-redirect-guard).
 */

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')

describe('magic-link OTP never creates users', () => {
  it('signInWithOtpAction sets shouldCreateUser:false (and nowhere true)', () => {
    const source = readFileSync(join(root, 'lib/actions/auth.ts'), 'utf8')
    expect(source).toContain('shouldCreateUser: false')
    expect(source).not.toContain('shouldCreateUser: true')
  })

  it('unknown OTP emails get a no-account error, not a silent success', () => {
    const source = readFileSync(join(root, 'lib/actions/auth.ts'), 'utf8')
    expect(source).toMatch(/No account found/)
  })
})
