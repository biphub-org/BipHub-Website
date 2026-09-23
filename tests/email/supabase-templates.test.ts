import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Supabase Auth email templates (supabase/email-templates/*.html).
 *
 * These mirror EmailShell (shared no-reply template) and are pasted into
 * Dashboard → Auth → Email Templates per cloud project (NOT applied by
 * migrations). Guards:
 *   1. Each CTA href stays in token_hash form with the type the
 *      app/auth/callback route expects — with default templates GoTrue
 *      consumes the token itself and the callback fails closed.
 *   2. The family look (EU blue, pill CTA, EC disclaimer) and inline-only
 *      styling (email clients strip <style> blocks).
 */

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')
const read = (f: string) => readFileSync(join(root, 'supabase/email-templates', f), 'utf8')

const TEMPLATES = [
  { file: 'confirm-signup.html', type: 'signup' },
  { file: 'invite.html', type: 'invite' },
  { file: 'magic-link.html', type: 'magiclink' },
  { file: 'recovery.html', type: 'recovery' },
] as const

describe('supabase auth templates keep the callback-compatible href', () => {
  for (const { file, type } of TEMPLATES) {
    it(`${file} links with token_hash + type=${type}`, () => {
      const html = read(file)
      expect(html).toContain(`{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=${type}`)
    })
  }
})

describe('supabase auth templates match the no-reply family look', () => {
  for (const { file } of TEMPLATES) {
    it(`${file} uses EU blue, pill CTA, and EC disclaimer`, () => {
      const html = read(file)
      expect(html).toContain('#003399')
      expect(html).toContain('border-radius: 999px')
      expect(html).toContain('BipHub')
      expect(html).toContain('Independent project — not affiliated with the European Commission')
    })

    it(`${file} styles inline only (no <style> blocks or stylesheets)`, () => {
      const html = read(file)
      expect(html).not.toContain('<style')
      expect(html).not.toContain('<link')
    })
  }
})

describe('supabase auth template personalization', () => {
  it('confirm-signup greets by the registered full_name', () => {
    expect(read('confirm-signup.html')).toContain('{{ if .Data.full_name }}')
  })

  it('invite greets by the approved request name', () => {
    expect(read('invite.html')).toContain('{{ if .Data.full_name }}')
  })
})
