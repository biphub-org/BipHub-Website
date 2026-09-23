import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * send-bip-alerts edge-function guards (no Deno runtime in CI — source
 * content pins the wiring, repo convention per otp-no-signup-guard).
 *
 * 1. isced_codes must be in the BIP select: the matcher reads
 *    b.isced_codes, and without the column every isced-only preference
 *    silently matched nothing.
 * 2. The cron gate fails CLOSED (401) when CRON_SECRET is set — the old
 *    warn-and-allow branch let anyone trigger sends.
 * 3. The digest HTML mirrors EmailShell ( EU blue, pill CTA, disclaimer).
 */

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const source = readFileSync(
  join(root, 'supabase/functions/send-bip-alerts/index.ts'),
  'utf8',
)

describe('digest matcher selects every matched dimension', () => {
  it('fetches isced_codes from bips', () => {
    expect(source).toContain('subject_areas, isced_codes, approved_at')
  })
})

describe('digest cron gate fails closed', () => {
  it('rejects with 401 instead of warning-and-allowing', () => {
    expect(source).toContain('status: 401')
    expect(source).not.toContain('but allowing (check CRON_SECRET)')
  })
})

describe('digest HTML matches the no-reply family look', () => {
  it('uses EU blue, pill CTA, and EC disclaimer', () => {
    expect(source).toContain('#003399')
    expect(source).toContain('border-radius:999px')
    expect(source).toContain('Browse all BIPs')
    expect(source).toContain(
      'Independent project — not affiliated with the European Commission',
    )
  })

  it('keeps List-Unsubscribe headers (deliverability + one-click)', () => {
    expect(source).toContain('List-Unsubscribe')
    expect(source).toContain('List-Unsubscribe-Post')
  })
})
