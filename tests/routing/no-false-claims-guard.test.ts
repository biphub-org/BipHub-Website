import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Guard: shipped site copy must never reintroduce the retired claims.
 *
 * BipHub is closed-source/proprietary (not MIT-licensed, not open source),
 * is not EU/Erasmus+ co-funded as a platform, has no relation to
 * Hexona Systems, and plans (not denies) analytics/ads and coordinator
 * paid tiers. Any of the phrases below in app/components/lib copy means a
 * false claim leaked back in — reword instead of snapshotting.
 *
 * Scope note: supabase/seed.sql legitimately mentions third-party
 * "open-source tools" (Fairlearn/Aequitas) and is therefore out of scope;
 * this guard covers app + components + lib only.
 */

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..', '..')
const SCAN_DIRS = ['app', 'lib', 'components'].map((d) => join(repoRoot, d))

// Lowercase needles; each file's content is lowercased before matching.
const FORBIDDEN = [
  'mit licen', // MIT licence / MIT License — BipHub is proprietary
  'open source', // covers "open source" and "open-source"
  'hexona', // zero relation to BipHub
  'no analytics',
  'no tracking',
  'no ads',
  'no third-party',
  'zero analytics',
  'free forever',
  'no paid tier',
  'there will not be one',
  // NOTE: no 'fully funded by erasmus+' needle — HowItWorks legitimately
  // describes programme-level mobility funding ("fully funded by Erasmus+
  // at €79/day"), which the ground truth preserves. The false platform
  // badge ("Fully funded by Erasmus+" trust item) was removed from Hero.
  'without warranty under', // "... under the MIT licence"
  'operated by hexona',
  'independent open-source',
  'we collect nothing',
]

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
    return /\.(tsx?|ts)$/.test(entry) ? [full] : []
  })
}

describe('no false-claims guard', () => {
  it('has no retired open-source / funding / tracking / operator claim in shipped copy', () => {
    const files = SCAN_DIRS.flatMap(sourceFiles).filter(
      (f) => !f.endsWith('no-false-claims-guard.test.ts'),
    )
    const offenders: Array<{ file: string; needle: string }> = []
    for (const file of files) {
      const content = readFileSync(file, 'utf8').toLowerCase()
      for (const needle of FORBIDDEN) {
        if (content.includes(needle)) offenders.push({ file: file.split(repoRoot)[1], needle })
      }
    }
    expect(
      offenders,
      'retired claim leaked back into site copy; reword (see test header)',
    ).toEqual([])
  })
})
