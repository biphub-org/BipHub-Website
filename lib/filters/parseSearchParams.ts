import { z } from 'zod' // Zod v3 — see CLAUDE.md
import { ISCED_FIELDS } from '@/lib/isced'
import { ERASMUS_COUNTRIES } from '@/lib/countries'

const fieldIds = ISCED_FIELDS.map((f) => f.id) as [string, ...string[]]
const countryIsos = ERASMUS_COUNTRIES.map((c) => c.code.toLowerCase()) as [string, ...string[]]

export const SORT_OPTIONS = ['deadline-soonest', 'newest', 'alphabetical'] as const
export type SortOption = (typeof SORT_OPTIONS)[number]

export const STATUS_FILTER_OPTIONS = ['open', 'closed', 'any'] as const
export type StatusFilter = (typeof STATUS_FILTER_OPTIONS)[number]

export const STUDY_LEVELS = ['bachelor', 'master', 'phd'] as const

// Schema: every filter is optional; arrays accept comma-separated OR repeated keys.
// Arrays are normalized via .transform(s => s.split(',').filter(Boolean))
const csvArray = (allowed: readonly string[]) =>
  z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : v.split(',').filter(Boolean)).map((s) => s.toLowerCase()))
    .pipe(z.array(z.enum(allowed as [string, ...string[]])))
    .optional()

export const BipFilterSchema = z.object({
  // BROW-02: country (multi)
  country: csvArray(countryIsos),
  // BROW-03: field of study (ISCED group, multi)
  field: csvArray(fieldIds),
  // BROW-04: language (ISO 639-1 lowercase, multi). Validated against seed languages.
  lang: csvArray(['en', 'de', 'fr', 'es', 'it', 'nl', 'pl', 'pt', 'sv']),
  // BROW-05: physical mobility date range (YYYY-MM-DD ISO)
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  // BROW-07: open/closed/any
  status: z.enum(STATUS_FILTER_OPTIONS).optional(),
  // BROW-08: study level (multi)
  level: csvArray(STUDY_LEVELS),
  // BROW-15: partner filter (?partnerOnly=exclude → hide, =only → show only partner-only, absent = show all)
  partnerOnly: z.enum(['exclude', 'only']).optional(),
  // BROW-09: full-text search query (1-100 chars). Empty string treated as undefined.
  q: z.string().min(1).max(100).optional(),
  // BROW-10: sort
  sort: z.enum(SORT_OPTIONS).default('deadline-soonest'),
  // BROW-13: pagination — 1-indexed
  page: z.coerce.number().int().min(1).default(1),
})

export type BipFilterState = z.infer<typeof BipFilterSchema>

export function parseSearchParams(
  raw: URLSearchParams | Record<string, string | string[] | undefined>,
): BipFilterState {
  const obj =
    raw instanceof URLSearchParams
      ? Object.fromEntries(
          [...new Set([...raw.keys()])].map((k) => [
            k,
            raw.getAll(k).length > 1 ? raw.getAll(k) : raw.get(k)!,
          ]),
        )
      : raw
  const parsed = BipFilterSchema.safeParse(obj)
  if (!parsed.success) {
    // Invalid filters → fall back to defaults; do NOT throw (would crash RSC page)
    return BipFilterSchema.parse({})
  }
  return parsed.data
}

export const PAGE_SIZE = 24 // D-02: 24 BIPs per page
