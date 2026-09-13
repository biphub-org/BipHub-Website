import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GUIDES } from '@/lib/content/guides'

/**
 * Guard: nav order, guide coverage, and no stale /what-is-a-bip links.
 *
 * The standalone /what-is-a-bip route was folded into the guides hub
 * (/guides/what-is-a-bip) with a permanent redirect in next.config.ts.
 * This test pins:
 *   1. StickyNav link order (About → Browse BIPs → Guides → Coming Soon → Contact).
 *   2. Every GUIDES registry entry has a real page file (and no orphan
 *      top-level what-is-a-bip route sneaks back in).
 *   3. No stale "/what-is-a-bip" route strings survive in app/ or
 *      components/ — the redirect exists for external links/SEO, not as an
 *      excuse for internal ones. (Matches the exact-quoted bare path, so
 *      slugs like getGuide('what-is-a-bip'), "/guides/what-is-a-bip", and
 *      prose about the old route do not trip it.)
 */

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    if (entry === 'node_modules') return []
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.(tsx?|mdx?)$/.test(entry) ? [full] : []
  })
}

describe('nav + guides routing guard', () => {
  it('lists nav links in the agreed order with no standalone explainer entry', () => {
    const nav = readFileSync(
      join(root, 'components', 'home', 'StickyNav.tsx'),
      'utf8',
    )
    const hrefs = [...nav.matchAll(/\{\s*href:\s*'([^']+)'/g)].map((m) => m[1])
    expect(hrefs).toEqual([
      '/about',
      '/bips',
      '/guides',
      '/coming-soon',
      '/contact',
    ])
  })

  it('ships a page file for every guide slug and no top-level what-is-a-bip route', () => {
    const missing = GUIDES.map((g) => g.slug).filter(
      (slug) =>
        !existsSync(join(root, 'app', '(public)', 'guides', slug, 'page.tsx')),
    )
    expect(missing).toEqual([])
    expect(
      existsSync(join(root, 'app', '(public)', 'what-is-a-bip')),
      'standalone route removed — the explainer lives at /guides/what-is-a-bip',
    ).toBe(false)
  })

  it('has no stale bare /what-is-a-bip links in app/ or components/', () => {
    const stale: string[] = []
    for (const dir of ['app', 'components']) {
      for (const file of sourceFiles(join(root, dir))) {
        const text = readFileSync(file, 'utf8')
        if (/(['"])\/what-is-a-bip\1/.test(text)) {
          stale.push(file.split(root)[1])
        }
      }
    }
    expect(
      stale,
      'retarget to /guides/what-is-a-bip — the next.config.ts redirect is for external links only',
    ).toEqual([])
  })
})
