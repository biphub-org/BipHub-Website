import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dashboardForRole } from '@/lib/auth/redirect'

/**
 * Guard: signed-in users must never render the sign-in/register pages —
 * typing /login or /register in the URL included.
 *
 * Enforcement is page-level (the middleware matcher excludes the auth
 * routes to avoid the post-login redirect loop, so middleware cannot do
 * it). Every page under /login and /register* must call redirectIfSignedIn()
 * before rendering. This test pins both the role→destination mapping and
 * the per-page wiring so a future edit cannot silently drop the bounce.
 */

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')

const GUARDED_PAGES = [
  'app/(auth)/login/page.tsx',
  'app/(auth)/register/page.tsx',
  'app/(auth)/register/coordinator/page.tsx',
  'app/(auth)/register/student/page.tsx',
]

describe('redirectIfSignedIn role mapping', () => {
  it('sends students to their dashboard', () => {
    expect(dashboardForRole('student')).toBe('/student-dashboard')
  })

  it('sends admins to the admin area', () => {
    expect(dashboardForRole('admin')).toBe('/admin')
  })

  it('sends coordinators (and unknown roles) to the coordinator dashboard', () => {
    expect(dashboardForRole('coordinator')).toBe('/dashboard')
    expect(dashboardForRole(undefined)).toBe('/dashboard')
  })
})

describe('auth pages bounce signed-in users', () => {
  for (const page of GUARDED_PAGES) {
    it(`${page} calls redirectIfSignedIn`, () => {
      const source = readFileSync(join(root, page), 'utf8')
      expect(source).toContain('redirectIfSignedIn')
    })
  }
})
