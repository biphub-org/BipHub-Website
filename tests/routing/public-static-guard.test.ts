import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Guard: no page under app/(public) may opt into `force-static`.
 *
 * app/(public)/layout.tsx reads the auth session per request (getClaims())
 * to render the StickyNav signed-in state. `force-static` makes Next.js
 * prerender the whole route at build time with empty cookies, baking the
 * LOGGED-OUT nav into the production HTML. The session cookie itself stays
 * valid, so /dashboard keeps working — the exact prod-only symptom pair of
 * "opening any content page signs me out, yet the dashboard still loads".
 * `next dev` never prerenders, which is why it only reproduces in production.
 */

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = join(here, '..', '..', 'app', '(public)')

function pageFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return pageFiles(full)
    return /^page\.tsx?$/.test(entry) ? [full] : []
  })
}

const FORCE_STATIC = /export\s+const\s+dynamic\s*=\s*['"]force-static['"]/

describe('public route rendering guard', () => {
  it('has no force-static page under app/(public)', () => {
    const offenders = pageFiles(publicDir).filter((file) =>
      FORCE_STATIC.test(readFileSync(file, 'utf8')),
    )
    expect(
      offenders.map((f) => f.split('app')[1]),
      'force-static bakes logged-out nav into prod HTML; use per-request rendering so the auth-aware (public) layout sees cookies',
    ).toEqual([])
  })
})
