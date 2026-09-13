import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Guard: shipped code must never reference the old
 * `biphub-website.vercel.app` host. The production site lives at
 * https://biphub.org — a stale fallback leaks into password-reset links,
 * sitemap.xml, and robots.txt whenever NEXT_PUBLIC_SITE_URL is unset.
 */

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..')
const SCAN_DIRS = ['app', 'lib', 'components', 'supabase', 'emails'].map((d) =>
  join(repoRoot, d),
)
const SCAN_FILES = [join(repoRoot, 'middleware.ts')]
// Split so this guard file itself never matches its own pattern.
const OLD_HOST = ['biphub-website', 'vercel', 'app'].join('.')

function sourceFiles(dir: string): string[] {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return []
  }
  return entries.flatMap((entry) => {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.(tsx?|ts|sql|toml)$/.test(entry) ? [full] : []
  })
}

describe('production host guard', () => {
  it('has no biphub-website.vercel.app reference in shipped code', () => {
    const files = [...SCAN_FILES, ...SCAN_DIRS.flatMap(sourceFiles)].filter(
      (f) => !f.endsWith('no-vercel-host-guard.test.ts'),
    )
    const offenders = files.filter((file) =>
      readFileSync(file, 'utf8').includes(OLD_HOST),
    )
    expect(
      offenders.map((f) => f.split(repoRoot)[1]),
      'stale vercel.app host leaks into reset links/sitemap/robots; use https://biphub.org',
    ).toEqual([])
  })
})
