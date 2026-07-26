/**
 * Virtual-component timing — single source of truth for the
 * `bips.virtual_timing` value set.
 *
 * Mirrors the DB CHECK in `supabase/migrations/00003_bips_full_schema.sql`
 * exactly (SUBM-12). The legacy 'concurrent' value silently failed that CHECK
 * on save and must never reappear here.
 *
 * Consumed by:
 *   - `lib/schemas/bip-wizard.ts`               — Zod enum (step2 + full)
 *   - `components/forms/steps/WizardStep2ProgramDetails.tsx` — builder control
 *   - `components/bip/BipBody.tsx`              — public detail-page label
 *
 * Keeping the values and their public labels in one module means a timing
 * option can never be offered by the builder without a matching label on the
 * detail page — the same anti-drift discipline as
 * `lib/constants/bip-edit-columns.ts` (FOUN-14).
 */
export const VIRTUAL_TIMINGS = [
  'before',
  'during',
  'after',
  'before_and_after',
  'mixed',
] as const

export type VirtualTiming = (typeof VIRTUAL_TIMINGS)[number]

/**
 * Public-facing label per timing value. Typed as an exhaustive record so
 * adding a value to VIRTUAL_TIMINGS fails type-check until it has a label.
 */
export const VIRTUAL_TIMING_LABEL: Record<VirtualTiming, string> = {
  before: 'Before the mobility',
  during: 'During the mobility',
  after: 'After the mobility',
  before_and_after: 'Before & after the mobility',
  mixed: 'Mixed timing',
}

/** Ordered value/label pairs for the builder's timing select. */
export const VIRTUAL_TIMING_OPTIONS: Array<{
  value: VirtualTiming
  label: string
}> = VIRTUAL_TIMINGS.map((value) => ({
  value,
  label: VIRTUAL_TIMING_LABEL[value],
}))

/**
 * Label for a raw DB value. Falls back to the raw string for rows written
 * before the value set was locked, and returns null when unset so callers can
 * choose their own empty-state copy.
 */
export function virtualTimingLabel(
  value: string | null | undefined,
): string | null {
  if (!value) return null
  return (VIRTUAL_TIMING_LABEL as Record<string, string>)[value] ?? value
}
