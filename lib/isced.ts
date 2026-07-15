/**
 * The 12 field-of-study categories shown on the homepage CategoriesBar
 * (DISC-03) and used as the BROW-03 filter facet.
 *
 * `id` is the URL-safe identifier used in `/bips?field=medicine` and is the
 * canonical value stored in `bips.subject_area`. Both the homepage counts
 * (getBipCountsByField) and the /bips field filter (applyFilters) key off
 * `subject_area = id`, so ids are a locked contract — do not rename an id
 * without a data migration of `bips.subject_area` + the seed catalog.
 *
 * NOTE: this is a BipHub-specific taxonomy, intentionally finer-grained than
 * the ISCED-F 2013 broad fields (e.g. Dentistry / Medicine / Health Sciences
 * are separate here but all fall under ISCED 09). The export names keep the
 * historical `ISCED_*` prefix to avoid churn across the ~10 consuming files.
 */
export const ISCED_FIELDS = [
  { id: 'dentistry',          label: 'Dentistry' },
  { id: 'medicine',           label: 'Medicine' },
  { id: 'law',                label: 'Law' },
  { id: 'business-economics', label: 'Business & Economics' },
  { id: 'sports',             label: 'Sports' },
  { id: 'arts-design',        label: 'Arts & Design' },
  { id: 'it-engineering',     label: 'IT & Engineering' },
  { id: 'architecture',       label: 'Architecture' },
  { id: 'education',          label: 'Education' },
  { id: 'communication',      label: 'Communication' },
  { id: 'health-sciences',    label: 'Health Sciences' },
  { id: 'social-sciences',    label: 'Social Sciences' },
] as const

export type IscedField = (typeof ISCED_FIELDS)[number]
export type IscedFieldId = IscedField['id']

/**
 * Lookup map from id to field object.
 * Used by CategoriesBar and /bips field-of-study filter to avoid array searches.
 */
export const ISCED_FIELD_BY_ID: Readonly<Record<IscedFieldId, IscedField>> =
  Object.fromEntries(ISCED_FIELDS.map((f) => [f.id, f])) as never
