import slugify from 'slugify'

/**
 * Slug utilities for BIP records.
 *
 * `bips.slug` is NOT NULL and UNIQUE (Plan 01-02 schema). The wizard's first
 * INSERT happens before the coordinator has provided enough data to compute a
 * "real" slug, so we generate a draft slug with a UUID suffix that guarantees
 * uniqueness:
 *
 *   draft-{slugify(title|'untitled')}-{uuid8}
 *
 * Plan 02-07's `submitBipAction` rewrites the slug to its final value when the
 * BIP transitions to `pending`:
 *
 *   {slugify(title)}-{slugify(erasmusCode)}-{year}
 *
 * Both helpers clamp the output length so `text` columns stay tidy.
 */

export function generateDraftSlug(title: string, suffix?: string): string {
  const base = slugify(title || 'untitled', { lower: true, strict: true }) || 'untitled'
  const tail = suffix ?? crypto.randomUUID().slice(0, 8)
  return `draft-${base}-${tail}`.slice(0, 100)
}

export function finalizeSlug(title: string, erasmusCode: string, year: number): string {
  const t = slugify(title, { lower: true, strict: true }) || 'bip'
  const e = slugify(erasmusCode, { lower: true, strict: true }) || 'unknown'
  return `${t}-${e}-${year}`.slice(0, 120)
}
