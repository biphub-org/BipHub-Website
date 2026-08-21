import { z } from 'zod' // Zod v3 — see CLAUDE.md (locked stack)
import { ERASMUS_COUNTRIES } from '@/lib/countries'

/**
 * Profile + add-university schemas (AUTH-07).
 *
 * `country` on the profile form is a UI convenience captured separately so the
 * "Add new university" subform can lock the country it submits to the SECURITY
 * DEFINER RPC. We do NOT write `country` to the `profiles` row — there is no
 * such column. Country is derived downstream from the joined `universities.country`.
 *
 * The country enum is sourced from `ERASMUS_COUNTRIES` so this Zod whitelist
 * stays in lock-step with the SQL CHECK enforced by migration 00009.
 */

// `z.enum` requires a non-empty readonly tuple of literal strings. Cast the
// runtime array to satisfy that constraint without losing the source-of-truth.
const COUNTRY_CODES = ERASMUS_COUNTRIES.map((c) => c.code) as [string, ...string[]]

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, 'Please enter your full name.').max(120),
  contact_email: z.string().trim().email('Please enter a valid email address.'),
  university_id: z.string().uuid('Please select your university.'),
  country: z.enum(COUNTRY_CODES, {
    errorMap: () => ({ message: 'Please select a country.' }),
  }),
  erasmus_code: z.string().trim().min(3, 'Erasmus code is required.').max(20),
})
export type ProfileValues = z.infer<typeof profileSchema>

export const addUniversitySchema = z.object({
  name: z.string().trim().min(2, 'University name is too short.').max(200),
  country: z.enum(COUNTRY_CODES, {
    errorMap: () => ({ message: 'Please select a country.' }),
  }),
  erasmus_code: z.string().trim().max(20).optional(),
})
export type AddUniversityValues = z.infer<typeof addUniversitySchema>
