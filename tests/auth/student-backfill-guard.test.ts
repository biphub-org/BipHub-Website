import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Guard: the registration details live in user_metadata until a session
 * exists, and TWO independent paths complete the profiles row —
 * /auth/callback after a token_hash verification, and signInAction on first
 * sign-in (covers link formats that never reach the callback, e.g. the
 * default GoTrue template where GoTrue consumes the token itself).
 *
 * If either call site drops the backfill, newly-verified students silently
 * land on the dashboard with a bare profile, missing data we already hold.
 * This pins the wiring (repo convention: source-content guards like
 * auth-redirect-guard).
 */

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..', '..')

describe('student profile backfill wiring', () => {
  it('/auth/callback backfills the student row after verification', () => {
    const source = readFileSync(join(root, 'app/auth/callback/route.ts'), 'utf8')
    expect(source).toContain('backfillStudentProfileFromMetadata')
  })

  it('signInAction backfills a still-bare student row on sign-in', () => {
    const source = readFileSync(join(root, 'lib/actions/auth.ts'), 'utf8')
    expect(source).toContain('backfillStudentProfileFromMetadata')
  })

  it('the backfill never writes role (owned by handle_new_user)', () => {
    const source = readFileSync(join(root, 'lib/auth/student-profile.ts'), 'utf8')
    const upsertBlock = source.slice(source.indexOf('.upsert('))
    expect(upsertBlock).not.toMatch(/\brole\b/)
  })
})
