/**
 * Unit tests for SaveBipSchema and parseLegacyBookmarkIds (Phase 6 / STUD-06).
 *
 * SaveBipSchema: Zod v3 UUID validation for save/unsave Server Action inputs.
 * parseLegacyBookmarkIds: pure parser for the legacy biphub:bookmarks localStorage
 * value — the testable seam for the best-effort one-time sweep (D-02 / D-02a).
 *
 * Coverage mirrors the <behavior> block in 06-01-PLAN.md task 3.
 */
import { describe, it, expect } from 'vitest'
import { SaveBipSchema } from '@/lib/schemas/saved-bips'
import { parseLegacyBookmarkIds } from '@/lib/legacy-bookmarks'

const VALID_UUID = '11111111-2222-4333-8444-555555555555'
const VALID_UUID_2 = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'

describe('SaveBipSchema', () => {
  it('accepts a valid UUID and returns it unchanged', () => {
    expect(SaveBipSchema.parse({ bipId: VALID_UUID })).toEqual({ bipId: VALID_UUID })
  })

  it('rejects a non-UUID bipId', () => {
    expect(() => SaveBipSchema.parse({ bipId: 'not-a-uuid' })).toThrow()
  })

  it('rejects an empty string bipId', () => {
    expect(() => SaveBipSchema.parse({ bipId: '' })).toThrow()
  })

  it('rejects a missing bipId field', () => {
    expect(() => SaveBipSchema.parse({})).toThrow()
  })
})

describe('parseLegacyBookmarkIds', () => {
  it('returns valid UUIDs from a well-formed JSON array', () => {
    const raw = JSON.stringify([VALID_UUID, VALID_UUID_2])
    expect(parseLegacyBookmarkIds(raw)).toEqual([VALID_UUID, VALID_UUID_2])
  })

  it('filters out invalid entries and de-duplicates valid UUIDs', () => {
    // unknown string filtered, duplicate collapsed → idempotent upsert
    const raw = JSON.stringify([VALID_UUID, 'not-a-uuid', VALID_UUID])
    expect(parseLegacyBookmarkIds(raw)).toEqual([VALID_UUID])
  })

  it('returns [] for null (absent localStorage key — the expected no-op, D-02)', () => {
    expect(parseLegacyBookmarkIds(null)).toEqual([])
  })

  it('returns [] for malformed JSON (best-effort silent empty)', () => {
    expect(parseLegacyBookmarkIds('{not json')).toEqual([])
  })

  it('returns [] when JSON is a string, not an array', () => {
    expect(parseLegacyBookmarkIds(JSON.stringify('a string not array'))).toEqual([])
  })

  it('returns [] when JSON is an object, not an array', () => {
    expect(parseLegacyBookmarkIds(JSON.stringify({ key: VALID_UUID }))).toEqual([])
  })

  it('returns [] for an empty JSON array', () => {
    expect(parseLegacyBookmarkIds(JSON.stringify([]))).toEqual([])
  })
})
