/**
 * State machine tests — Phase 3 ADMN-03 (approve), ADMN-04 (reject),
 * ADMN-08 (audit log invariants).
 *
 * Threat: T-03-03 — coordinator exploiting direct `rejected → pending`.
 * Mitigation: `validateTransition()` throws on invalid (from, to, actor) tuples.
 * Source: 03-CONTEXT.md D-06 state machine table.
 */
import { describe, it, expect } from 'vitest'
import { validateTransition } from '@/lib/utils/status-transitions'

describe('validateTransition (D-06 state machine)', () => {
  it('allows draft → pending by coordinator (initial submit)', () => {
    expect(() => validateTransition('draft', 'pending', 'coordinator')).not.toThrow()
  })
  it('allows pending → approved by admin (approveBipAction)', () => {
    expect(() => validateTransition('pending', 'approved', 'admin')).not.toThrow()
  })
  it('allows pending → rejected by admin (rejectBipAction)', () => {
    expect(() => validateTransition('pending', 'rejected', 'admin')).not.toThrow()
  })
  it('allows rejected → draft by coordinator (resubmit edit)', () => {
    expect(() => validateTransition('rejected', 'draft', 'coordinator')).not.toThrow()
  })
  it('allows approved → rejected by admin (un-approve, reason required)', () => {
    expect(() => validateTransition('approved', 'rejected', 'admin')).not.toThrow()
  })
  it('allows pending → draft by coordinator (withdraw, Phase 2 locked)', () => {
    expect(() => validateTransition('pending', 'draft', 'coordinator')).not.toThrow()
  })
  it('throws on rejected → pending by coordinator (T-03-03 mitigation)', () => {
    expect(() => validateTransition('rejected', 'pending', 'coordinator')).toThrow(/Invalid status transition/)
  })
  it('throws on draft → approved by coordinator (privilege escalation)', () => {
    expect(() => validateTransition('draft', 'approved', 'coordinator')).toThrow(/Invalid status transition/)
  })
  it('throws on approved → approved (idempotent re-approve — not in D-06)', () => {
    expect(() => validateTransition('approved', 'approved', 'admin')).toThrow(/Invalid status transition/)
  })
  it('throws when actor mismatches actor on the transition row', () => {
    expect(() => validateTransition('pending', 'approved', 'coordinator')).toThrow(/Invalid status transition/)
  })
})

// Phase 8: changes_requested transitions (D-06a)
describe('validateTransition — changes_requested transitions (Phase 8)', () => {
  it('allows pending → changes_requested by admin (D-06a request-changes on new submission)', () => {
    expect(() => validateTransition('pending', 'changes_requested', 'admin')).not.toThrow()
  })
  it('allows changes_requested → pending by coordinator (D-06a coordinator resubmit)', () => {
    expect(() => validateTransition('changes_requested', 'pending', 'coordinator')).not.toThrow()
  })
  it('allows changes_requested → approved by admin (admin approves after changes)', () => {
    expect(() => validateTransition('changes_requested', 'approved', 'admin')).not.toThrow()
  })
  it('allows changes_requested → rejected by admin (admin rejects after changes)', () => {
    expect(() => validateTransition('changes_requested', 'rejected', 'admin')).not.toThrow()
  })
  it('throws on changes_requested → pending by admin (only coordinator can resubmit)', () => {
    expect(() => validateTransition('changes_requested', 'pending', 'admin')).toThrow(/Invalid status transition/)
  })
  it('throws on changes_requested → approved by coordinator (privilege escalation)', () => {
    expect(() => validateTransition('changes_requested', 'approved', 'coordinator')).toThrow(/Invalid status transition/)
  })
})

describe('STATUS_BADGE_CLASSES — changes_requested entry (Phase 8)', () => {
  it('has a literal class string for changes_requested with no template literals', async () => {
    const { STATUS_BADGE_CLASSES } = await import('@/lib/utils/status')
    const badgeClass = (STATUS_BADGE_CLASSES as Record<string, string>)['changes_requested']
    expect(badgeClass).toBeDefined()
    expect(badgeClass).toContain('bg-status-changes-requested-bg')
    expect(badgeClass).toContain('text-status-changes-requested')
    expect(badgeClass).toContain('border-status-changes-requested')
    // Must be a complete literal — no template literal syntax in the value itself
    expect(badgeClass).not.toContain('${')
    expect(badgeClass).not.toContain('`')
  })
})
