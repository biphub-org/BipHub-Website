/**
 * Admin Zod schema tests — Phase 3 ADMN-04 (reject reason min 10 chars).
 *
 * Threat: T-03-04 — admin reject with empty/blank reason leaves coordinator
 * without actionable feedback.
 * Mitigation: `RejectBipSchema.reason` enforces min 10 / max 1000 at both
 * client (RHF) and server (Server Action) layers.
 *
 * Source: 03-RESEARCH.md Pattern 6; 03-UI-SPEC.md Reject modal validation.
 */
import { describe, it, expect } from 'vitest'
import { ApproveBipSchema, RejectBipSchema } from '@/lib/schemas/admin-bips'

const VALID_UUID = '11111111-2222-4333-8444-555555555555'

describe('ApproveBipSchema', () => {
  it('accepts a valid uuid + omitted note', () => {
    expect(ApproveBipSchema.parse({ bipId: VALID_UUID })).toEqual({ bipId: VALID_UUID })
  })
  it('accepts a valid uuid + note up to 500 chars', () => {
    const note = 'x'.repeat(500)
    expect(ApproveBipSchema.parse({ bipId: VALID_UUID, note })).toEqual({ bipId: VALID_UUID, note })
  })
  it('rejects note longer than 500 chars', () => {
    expect(() => ApproveBipSchema.parse({ bipId: VALID_UUID, note: 'x'.repeat(501) })).toThrow()
  })
  it('rejects a non-uuid bipId', () => {
    expect(() => ApproveBipSchema.parse({ bipId: 'not-a-uuid' })).toThrow()
  })
})

describe('RejectBipSchema', () => {
  it('accepts uuid + reason exactly 10 chars', () => {
    const reason = 'x'.repeat(10)
    expect(RejectBipSchema.parse({ bipId: VALID_UUID, reason })).toEqual({ bipId: VALID_UUID, reason })
  })
  it('accepts uuid + reason 1000 chars', () => {
    const reason = 'x'.repeat(1000)
    expect(RejectBipSchema.parse({ bipId: VALID_UUID, reason })).toEqual({ bipId: VALID_UUID, reason })
  })
  it('rejects reason 9 chars (off-by-one boundary)', () => {
    expect(() => RejectBipSchema.parse({ bipId: VALID_UUID, reason: 'x'.repeat(9) })).toThrow(/at least 10 characters/)
  })
  it('rejects reason 1001 chars', () => {
    expect(() => RejectBipSchema.parse({ bipId: VALID_UUID, reason: 'x'.repeat(1001) })).toThrow()
  })
  it('rejects empty reason string', () => {
    expect(() => RejectBipSchema.parse({ bipId: VALID_UUID, reason: '' })).toThrow()
  })
  it('rejects missing reason field', () => {
    expect(() => RejectBipSchema.parse({ bipId: VALID_UUID })).toThrow()
  })
})
