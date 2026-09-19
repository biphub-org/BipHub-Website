import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isOrphanedSession } from '@/lib/auth/deleted-session'

/**
 * Deleted-account kick: JWTs are stateless, so a manually-deleted auth user
 * keeps passing getClaims() until token expiry. Middleware confirms the user
 * still exists via getUser() on account routes and clears the dead session.
 *
 * The helper kicks ONLY on a positive gone-signal and fails OPEN otherwise —
 * a transient Auth outage must not log out every signed-in user.
 */

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')

describe('isOrphanedSession', () => {
  it('keeps sessions whose user row exists', () => {
    expect(isOrphanedSession({ id: 'u1' }, null)).toBe(false)
    expect(
      isOrphanedSession({ id: 'u1' }, { message: 'boom', status: 500 }),
    ).toBe(false)
  })

  it('kicks on GoTrue’s deleted-user message', () => {
    expect(
      isOrphanedSession(null, {
        message: 'User from sub claim in JWT does not exist',
        status: 401,
      }),
    ).toBe(true)
  })

  it('kicks on the observed live signal: 403 user_not_found', () => {
    expect(
      isOrphanedSession(null, {
        message: 'User from sub claim in JWT does not exist',
        status: 403,
        code: 'user_not_found',
      }),
    ).toBe(true)
  })

  it('kicks on 401/403/404 with no user even without the message', () => {
    expect(isOrphanedSession(null, { message: '', status: 401 })).toBe(true)
    expect(isOrphanedSession(null, { message: '', status: 403 })).toBe(true)
    expect(isOrphanedSession(null, { message: '', status: 404 })).toBe(true)
  })

  it('fails open on transient failures and empty results', () => {
    expect(isOrphanedSession(null, { message: 'fetch failed', status: 500 })).toBe(false)
    expect(isOrphanedSession(null, { message: 'rate limited', status: 429 })).toBe(false)
    expect(isOrphanedSession(null, null)).toBe(false)
    expect(isOrphanedSession(undefined, undefined)).toBe(false)
  })
})

describe('middleware deleted-account wiring', () => {
  const source = readFileSync(join(root, 'middleware.ts'), 'utf8')

  it('confirms the user server-side via getUser', () => {
    expect(source).toContain('auth.getUser()')
  })

  it('decides with isOrphanedSession and bounces to /login', () => {
    expect(source).toContain('isOrphanedSession')
    expect(source).toContain("new URL('/login', request.url)")
  })

  it('clears the dead sb-* session cookies on the redirect', () => {
    expect(source).toContain("startsWith('sb-')")
  })
})
