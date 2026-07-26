/**
 * Wizard Zod schema tests — v1.2 builder field revision.
 *
 * Covers the locked field set after the builder revision:
 *   - virtual_timing enum matches the DB CHECK (no legacy 'concurrent') and is
 *     REQUIRED — every BIP must state when its online component runs.
 *   - max_participants ceiling is 100 (floor loosened to 1).
 *   - study_levels accepts 'vocational' (EQF 5).
 *   - Step 1 requires external_bip_id (Official Erasmus+ BIP code) + target_group.
 *   - virtual_session_dates is fully optional (timing carries the requirement).
 *   - fees are optional.
 */
import { describe, it, expect } from 'vitest'
import { step1Schema, step2Schema, fullBipSchema } from '@/lib/schemas/bip-wizard'

const VIRTUAL_TIMING_VALUES = [
  'before',
  'during',
  'after',
  'before_and_after',
  'mixed',
] as const

// Minimal valid base fixture for step1Schema (Basic information step).
const validStep1Base = {
  title: 'Sustainable Cities Winter School',
  external_bip_id: 'BIP-2026-KUL-001',
  target_group: 'students_staff' as const,
  subject_areas: ['it-engineering'],
  description:
    'A ten-week blended intensive programme exploring sustainable urban planning across partner institutions.',
  learning_outcomes: 'Students/staff will design a sustainable neighbourhood masterplan.',
}

// Minimal valid base fixture for step2Schema (Programme details step).
const validStep2Base = {
  virtual_component_description: 'A collaborative online component covering key theory.',
  virtual_timing: 'before' as const,
  virtual_session_dates: ['2026-08-15'],
  host_city: 'Budapest',
  physical_start_date: '2026-09-01',
  physical_end_date: '2026-09-10',
  application_deadline: '2026-08-01',
  ects_credits: 3,
  max_participants: 20,
  study_levels: ['bachelor'] as const,
  language_of_instruction: 'en',
  language_level_min: 'B1' as const,
}

// Minimal valid base fixture for fullBipSchema (Steps 1+2+4 flat shape).
const validFullBase = {
  ...validStep1Base,
  virtual_component_description: 'A collaborative online component covering key theory.',
  virtual_timing: 'before' as const,
  virtual_session_dates: ['2026-08-15'],
  host_city: 'Budapest',
  physical_start_date: '2026-09-01',
  physical_end_date: '2026-09-10',
  application_deadline: '2026-08-01',
  ects_credits: 3,
  max_participants: 20,
  study_levels: ['bachelor'] as const,
  language_of_instruction: 'en',
  language_level_min: 'B1' as const,
  how_to_apply_type: 'url' as const,
  how_to_apply_url: 'https://example.edu/apply',
  fees: 'No participation fees; students cover travel and accommodation.',
}

describe('step1Schema — BIP ID + target group', () => {
  it('accepts a valid basic-info payload', () => {
    expect(step1Schema.safeParse(validStep1Base).success).toBe(true)
  })

  it('requires external_bip_id', () => {
    const result = step1Schema.safeParse({ ...validStep1Base, external_bip_id: '' })
    expect(result.success).toBe(false)
  })

  it('requires a valid target_group', () => {
    const result = step1Schema.safeParse({ ...validStep1Base, target_group: 'everyone' })
    expect(result.success).toBe(false)
  })

  it('accepts a 500-character title', () => {
    const result = step1Schema.safeParse({ ...validStep1Base, title: 'x'.repeat(500) })
    expect(result.success).toBe(true)
  })
})

describe('step2Schema — virtual_timing enum (SUBM-12)', () => {
  it.each(VIRTUAL_TIMING_VALUES)('accepts virtual_timing = %s', (timing) => {
    const result = step2Schema.safeParse({ ...validStep2Base, virtual_timing: timing })
    expect(result.success).toBe(true)
  })

  it("rejects the legacy 'concurrent' value", () => {
    const result = step2Schema.safeParse({ ...validStep2Base, virtual_timing: 'concurrent' })
    expect(result.success).toBe(false)
  })

  // Required: a blended programme must state when its online component runs.
  it('rejects a missing virtual_timing', () => {
    const { virtual_timing: _omitted, ...withoutTiming } = validStep2Base
    const result = step2Schema.safeParse(withoutTiming)
    expect(result.success).toBe(false)
  })

  it("rejects the empty-string placeholder from the select", () => {
    const result = step2Schema.safeParse({ ...validStep2Base, virtual_timing: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'Select when the virtual sessions run.',
      )
    }
  })
})

describe('step2Schema — max_participants ceiling (item 9)', () => {
  it('accepts max_participants = 100', () => {
    const result = step2Schema.safeParse({ ...validStep2Base, max_participants: 100 })
    expect(result.success).toBe(true)
  })

  it('rejects max_participants = 101', () => {
    const result = step2Schema.safeParse({ ...validStep2Base, max_participants: 101 })
    expect(result.success).toBe(false)
  })
})

describe('step2Schema — study levels (item 10)', () => {
  it('accepts vocational', () => {
    const result = step2Schema.safeParse({ ...validStep2Base, study_levels: ['vocational'] })
    expect(result.success).toBe(true)
  })

  it("accepts 'none' (staff mobility, no study level)", () => {
    const result = step2Schema.safeParse({ ...validStep2Base, study_levels: ['none'] })
    expect(result.success).toBe(true)
  })

  it('rejects an unknown study level', () => {
    const result = step2Schema.safeParse({ ...validStep2Base, study_levels: ['postdoc'] })
    expect(result.success).toBe(false)
  })
})

describe('step2Schema — virtual_session_dates (fully optional)', () => {
  it('accepts an empty list — dates may not be fixed yet', () => {
    const result = step2Schema.safeParse({ ...validStep2Base, virtual_session_dates: [] })
    expect(result.success).toBe(true)
  })

  it('accepts an all-blank list and strips it to empty', () => {
    const result = step2Schema.safeParse({ ...validStep2Base, virtual_session_dates: ['', ''] })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.virtual_session_dates).toEqual([])
    }
  })

  it('accepts the field being omitted entirely', () => {
    const { virtual_session_dates: _omitted, ...withoutDates } = validStep2Base
    const result = step2Schema.safeParse(withoutDates)
    expect(result.success).toBe(true)
  })

  it('accepts a single date', () => {
    const result = step2Schema.safeParse({
      ...validStep2Base,
      virtual_session_dates: ['2026-08-15'],
    })
    expect(result.success).toBe(true)
  })

  it('accepts multiple dates and drops blank placeholders', () => {
    const result = step2Schema.safeParse({
      ...validStep2Base,
      virtual_session_dates: ['2026-08-15', '', '2026-09-02'],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.virtual_session_dates).toEqual(['2026-08-15', '2026-09-02'])
    }
  })

  it('rejects a malformed date', () => {
    const result = step2Schema.safeParse({
      ...validStep2Base,
      virtual_session_dates: ['15/08/2026'],
    })
    expect(result.success).toBe(false)
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

describe('fullBipSchema — max_participants ceiling (item 9)', () => {
  it('accepts max_participants = 100', () => {
    const result = fullBipSchema.safeParse({ ...validFullBase, max_participants: 100 })
    expect(result.success).toBe(true)
  })

  it('rejects max_participants = 101', () => {
    const result = fullBipSchema.safeParse({ ...validFullBase, max_participants: 101 })
    expect(result.success).toBe(false)
  })
})

describe('fullBipSchema — new fields', () => {
  it('requires external_bip_id + target_group', () => {
    const { external_bip_id: _drop, ...noBipId } = validFullBase
    void _drop
    expect(fullBipSchema.safeParse(noBipId).success).toBe(false)
  })

  it('accepts fees, accommodation_notes and partner_institutions_only=true', () => {
    const result = fullBipSchema.safeParse({
      ...validFullBase,
      fees: 'No participation fee; travel covered by the sending institution.',
      accommodation_notes: 'Dormitory housing arranged by the host university.',
      partner_institutions_only: true,
    })
    expect(result.success).toBe(true)
  })
})

describe('fullBipSchema — fees now required', () => {
  it('rejects a missing fees field', () => {
    const { fees: _drop, ...noFees } = validFullBase
    void _drop
    expect(fullBipSchema.safeParse(noFees).success).toBe(false)
  })

  it('rejects an empty/whitespace fees value', () => {
    expect(fullBipSchema.safeParse({ ...validFullBase, fees: '' }).success).toBe(false)
    expect(fullBipSchema.safeParse({ ...validFullBase, fees: '   ' }).success).toBe(false)
  })

  it('accepts a "No fees" value', () => {
    expect(fullBipSchema.safeParse({ ...validFullBase, fees: 'No fees' }).success).toBe(true)
  })
})

describe('fullBipSchema — contact_phone is optional', () => {
  it('accepts an omitted contact_phone', () => {
    expect(fullBipSchema.safeParse(validFullBase).success).toBe(true)
  })

  it('accepts a provided contact_phone', () => {
    const result = fullBipSchema.safeParse({
      ...validFullBase,
      contact_phone: '+32 16 32 40 10',
    })
    expect(result.success).toBe(true)
  })
})
