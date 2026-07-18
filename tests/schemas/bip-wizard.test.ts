/**
 * Wizard Zod schema tests — Phase 9 SUBM-09..14.
 *
 * Threat: T-09-02-02 — the wizard previously offered `virtual_timing =
 * 'concurrent'`, a value that is not in the `bips.virtual_timing` DB CHECK
 * (before/during/after/before_and_after/mixed), causing a silent save
 * failure. SUBM-13 — the participant floor was 5 vs the Erasmus+ minimum
 * of 10.
 *
 * Mitigation: `VIRTUAL_TIMINGS` matches the DB CHECK exactly and
 * `max_participants` floors at 10 on both `step2Schema` and
 * `fullBipSchema`. The four new builder-completion fields
 * (virtual_sessions_count, virtual_duration_notes, accommodation_notes,
 * partner_institutions_only) are validated as optional fields on both
 * schemas.
 *
 * Source: 09-02-PLAN.md interfaces block; lib/types/bip.ts VirtualTiming.
 */
import { describe, it, expect } from 'vitest'
import { step2Schema, fullBipSchema } from '@/lib/schemas/bip-wizard'

const VIRTUAL_TIMING_VALUES = [
  'before',
  'during',
  'after',
  'before_and_after',
  'mixed',
] as const

// Minimal valid base fixture for step2Schema (Programme details step).
const validStep2Base = {
  virtual_component_description: 'A collaborative online component covering key theory.',
  virtual_timing: 'before' as const,
  host_city: 'Budapest',
  physical_start_date: '2026-09-01',
  physical_end_date: '2026-09-10',
  application_deadline: '2026-08-01',
  ects_credits: 3,
  max_participants: 20,
  study_levels: ['bachelor'] as const,
  language_of_instruction: 'English',
  language_level_min: 'B1' as const,
}

// Minimal valid base fixture for fullBipSchema (Steps 1+2+4 flat shape).
const validFullBase = {
  title: 'Sustainable Cities Winter School',
  subject_areas: ['engineering'],
  description:
    'A ten-week blended intensive programme exploring sustainable urban planning across partner institutions.',
  learning_outcomes: 'Students will design a sustainable neighbourhood masterplan.',
  virtual_component_description: 'A collaborative online component covering key theory.',
  virtual_timing: 'before' as const,
  host_city: 'Budapest',
  physical_start_date: '2026-09-01',
  physical_end_date: '2026-09-10',
  application_deadline: '2026-08-01',
  ects_credits: 3,
  max_participants: 20,
  study_levels: ['bachelor'] as const,
  language_of_instruction: 'English',
  language_level_min: 'B1' as const,
  green_travel: false,
  inclusion_support: false,
  how_to_apply_type: 'url' as const,
  how_to_apply_url: 'https://example.edu/apply',
}

describe('step2Schema — virtual_timing enum (SUBM-12)', () => {
  it.each(VIRTUAL_TIMING_VALUES)('accepts virtual_timing = %s', (timing) => {
    const result = step2Schema.safeParse({ ...validStep2Base, virtual_timing: timing })
    expect(result.success).toBe(true)
  })

  it("rejects the legacy 'concurrent' value", () => {
    const result = step2Schema.safeParse({ ...validStep2Base, virtual_timing: 'concurrent' })
    expect(result.success).toBe(false)
  })
})

describe('step2Schema — max_participants floor (SUBM-13)', () => {
  it('rejects max_participants = 9', () => {
    const result = step2Schema.safeParse({ ...validStep2Base, max_participants: 9 })
    expect(result.success).toBe(false)
  })

  it('accepts max_participants = 10', () => {
    const result = step2Schema.safeParse({ ...validStep2Base, max_participants: 10 })
    expect(result.success).toBe(true)
  })
})

describe('step2Schema — new builder-completion fields', () => {
  it('accepts virtual_sessions_count and virtual_duration_notes', () => {
    const result = step2Schema.safeParse({
      ...validStep2Base,
      virtual_sessions_count: 4,
      virtual_duration_notes: 'Four 90-minute sessions spread across three weeks.',
    })
    expect(result.success).toBe(true)
  })
})

describe('fullBipSchema — virtual_timing enum (SUBM-12)', () => {
  it.each(VIRTUAL_TIMING_VALUES)('accepts virtual_timing = %s', (timing) => {
    const result = fullBipSchema.safeParse({ ...validFullBase, virtual_timing: timing })
    expect(result.success).toBe(true)
  })

  it("rejects the legacy 'concurrent' value", () => {
    const result = fullBipSchema.safeParse({ ...validFullBase, virtual_timing: 'concurrent' })
    expect(result.success).toBe(false)
  })
})

describe('fullBipSchema — max_participants floor (SUBM-13)', () => {
  it('rejects max_participants = 9', () => {
    const result = fullBipSchema.safeParse({ ...validFullBase, max_participants: 9 })
    expect(result.success).toBe(false)
  })

  it('accepts max_participants = 10', () => {
    const result = fullBipSchema.safeParse({ ...validFullBase, max_participants: 10 })
    expect(result.success).toBe(true)
  })
})

describe('fullBipSchema — new builder-completion fields', () => {
  it('accepts accommodation_notes and partner_institutions_only=true', () => {
    const result = fullBipSchema.safeParse({
      ...validFullBase,
      accommodation_notes: 'Dormitory housing arranged by the host university.',
      partner_institutions_only: true,
    })
    expect(result.success).toBe(true)
  })
})
