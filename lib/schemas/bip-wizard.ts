import { z } from 'zod' // Zod v3 — see CLAUDE.md (locked stack)
import { ISCED_FIELDS } from '@/lib/isced'
import { ISCED_CODES } from '@/lib/isced-codes'
import { VIRTUAL_TIMINGS } from '@/lib/constants/virtual-timing'

/**
 * Wizard step schemas (SUBM-04).
 *
 * Each step's schema only validates fields owned by that step so the wizard
 * can run partial validation on Save & Continue without forcing fields from
 * other steps. Submit-time enforcement of the union belongs to
 * `submitBipAction`, which re-validates via `fullBipSchema`.
 *
 * The field enum sources its values from `ISCED_FIELDS.id` (the URL-safe
 * identifier locked in Plan 01-06). Phase 1 already commits to this id list
 * via the `/bips?field=` filter — keeping the wizard on the same identifier
 * keeps coordinator-submitted data filterable in the public catalog.
 *
 * `subject_areas` is a multi-select: a BIP may span one or more fields (min 1,
 * no upper cap). Stored as `bips.subject_areas text[]`.
 */

const ISCED_VALUES = ISCED_FIELDS.map((f) => f.id) as [string, ...string[]]
const ISCED_CODE_VALUES = ISCED_CODES.map((c) => c.code) as [string, ...string[]]

// Who a BIP is open to. Mirrors the bips.target_group CHECK in migration 00024.
export const TARGET_GROUPS = ['students', 'staff', 'students_staff'] as const

// Step 1 — Basic information.
export const step1Schema = z.object({
  title: z.string().trim().min(5, 'Title is too short.').max(500, 'Title is too long.'),
  // Official Erasmus+ BIP code (required). Generous 500-char cap per product spec.
  external_bip_id: z
    .string()
    .trim()
    .min(1, 'BIP ID is required.')
    .max(500, 'BIP ID is too long.'),
  target_group: z.enum(TARGET_GROUPS, {
    errorMap: () => ({ message: 'Choose who this BIP is open to.' }),
  }),
  subject_areas: z
    .array(z.enum(ISCED_VALUES))
    .min(1, 'Choose at least one field of study.'),
  isced_codes: z.array(z.enum(ISCED_CODE_VALUES)).default([]),
  description: z
    .string()
    .trim()
    .min(50, 'Description should be at least 50 characters.')
    .max(4000, 'Description is too long.'),
  learning_outcomes: z.string().trim().min(20, 'Please describe the learning outcomes.').max(2000),
})
export type Step1Values = z.infer<typeof step1Schema>

// Step 2 — Programme details.
const STUDY_LEVELS = ['vocational', 'bachelor', 'master', 'phd', 'none'] as const
const LANGUAGE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'none'] as const

// Virtual-session dates: entirely optional — a coordinator may know WHEN the
// online component sits relative to the physical mobility (virtual_timing,
// required) long before the individual session dates are fixed. The list
// arrives from the wizard with empty-string placeholders for un-filled rows;
// trim + drop them, then validate whatever remains. Output is a clean string[]
// for both the DB (date[]) and the detail-page renderer.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const virtualSessionDatesSchema = z
  .array(z.string())
  .optional()
  .default([])
  .transform((arr) => arr.map((s) => s.trim()).filter(Boolean))
  .refine((arr) => arr.every((d) => ISO_DATE.test(d)), {
    message: 'Use YYYY-MM-DD for each virtual session date.',
  })

// Required on every BIP: a blended programme must state when its online
// component runs relative to the physical mobility. One errorMap covers both
// "nothing selected" (the '' placeholder) and an out-of-set value.
const virtualTimingSchema = z.enum(VIRTUAL_TIMINGS, {
  errorMap: () => ({
    message: 'Select when the virtual sessions run.',
  }),
})

export const step2Schema = z
  .object({
    virtual_component_description: z
      .string()
      .trim()
      .min(20, 'Describe the virtual component briefly.')
      .max(2000),
    virtual_timing: virtualTimingSchema,
    // Virtual-session dates — optional; timing above is the required field.
    virtual_session_dates: virtualSessionDatesSchema,
    host_city: z.string().trim().min(2, 'Please enter the host city.').max(120),
    physical_start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.'),
    physical_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.'),
    application_deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.'),
    ects_credits: z.coerce
      .number()
      .int()
      .min(0, 'ECTS credits cannot be negative.')
      .max(30, 'ECTS credits must be at most 30.'),
    max_participants: z.coerce
      .number()
      .int()
      .min(10, 'There must be at least 10 participants (Erasmus+ minimum).')
      .max(100, 'The maximum is 100 participants.'),
    study_levels: z
      .array(z.enum(STUDY_LEVELS))
      .min(1, 'Select at least one study level.'),
    language_of_instruction: z
      .string()
      .trim()
      .min(2, 'Specify the instruction language.')
      .max(10),
    language_level_min: z.enum(LANGUAGE_LEVELS, {
      errorMap: () => ({ message: 'Pick a minimum CEFR level.' }),
    }),
  })
  .refine((data) => data.physical_start_date < data.physical_end_date, {
    message: 'Physical mobility end date must be after the start date.',
    path: ['physical_end_date'],
  })
export type Step2Values = z.infer<typeof step2Schema>

// Step 3 — Partner universities.
// Only registered universities (looked up in the registry, always carrying a
// university_id + Erasmus code) can be added — free-text partners were removed.
export const step3PartnerSchema = z.object({
  university_id: z.string().uuid().nullable(),
  name: z.string().trim().min(2, 'Partner name is too short.'),
  country: z.string().min(2).max(2),
  erasmus_code: z.string().nullable().optional(),
  isVerified: z.boolean(),
})
export type Step3Partner = z.infer<typeof step3PartnerSchema>

export const step3Schema = z.object({
  partner_universities: z.array(step3PartnerSchema).default([]),
  partner_institutions_only: z.boolean().optional().default(false),
})
export type Step3Values = z.infer<typeof step3Schema>

// Step 4 — Application information.
const HOW_TO_APPLY_TYPES = ['url', 'contact'] as const

export const step4Schema = z
  .object({
    how_to_apply_type: z.enum(HOW_TO_APPLY_TYPES, {
      errorMap: () => ({ message: 'Pick how students/staff will apply.' }),
    }),
    how_to_apply_url: z
      .string()
      .url('Use a full URL (https://…).')
      .optional()
      .or(z.literal('')),
    contact_name: z.string().trim().max(120).optional().or(z.literal('')),
    contact_email: z
      .string()
      .email('Use a valid email address.')
      .optional()
      .or(z.literal('')),
    contact_phone: z.string().trim().max(40).optional().or(z.literal('')),
    fees: z
      .string()
      .trim()
      .min(1, 'Fee information is required. If the programme is free, write “No fees”.')
      .max(2000),
    eligibility_notes: z.string().trim().max(2000).optional().default(''),
    accommodation_notes: z.string().trim().max(1000).optional().or(z.literal('')),
    // Erasmus+ grant top-ups the participant claims from their SENDING
    // institution. Re-surfaced in the builder after 00024 retired them.
    green_travel: z.boolean().optional().default(false),
    inclusion_support: z.boolean().optional().default(false),
    card_image_path: z.string().trim().max(300).optional().or(z.literal('')),
  })
  .refine(
    (data) => {
      if (data.how_to_apply_type === 'url') return Boolean(data.how_to_apply_url)
      return Boolean(data.contact_name) && Boolean(data.contact_email)
    },
    {
      message: 'Provide either an application URL or coordinator contact details.',
      path: ['how_to_apply_type'],
    },
  )
export type Step4Values = z.infer<typeof step4Schema>

/**
 * Flat submit/edit schema — the single validator for both the coordinator
 * submit path (`submitBipAction`) and the admin/coordinator edit path
 * (`admin-bips.ts` / `bip-edits.ts`). Any field change in a per-step schema
 * above must also land here (Plan 09-02 Pitfall 0 — one schema, no drift).
 */
export const fullBipSchema = z
  .object({
    // Step 1
    title: step1Schema.shape.title,
    external_bip_id: step1Schema.shape.external_bip_id,
    target_group: step1Schema.shape.target_group,
    subject_areas: step1Schema.shape.subject_areas,
    isced_codes: step1Schema.shape.isced_codes,
    description: step1Schema.shape.description,
    learning_outcomes: step1Schema.shape.learning_outcomes,
    // Step 2 — re-declare without per-step `.refine`s; they live below.
    virtual_component_description: z.string().trim().min(20).max(2000),
    virtual_timing: virtualTimingSchema,
    virtual_session_dates: virtualSessionDatesSchema,
    host_city: z.string().trim().min(2).max(120),
    physical_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    physical_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    application_deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    ects_credits: z.coerce.number().int().min(0).max(30),
    max_participants: z.coerce.number().int().min(10).max(100),
    study_levels: z.array(z.enum(STUDY_LEVELS)).min(1),
    language_of_instruction: z.string().min(2).max(10),
    language_level_min: z.enum(LANGUAGE_LEVELS),
    // Step 3
    partner_institutions_only: z.boolean().optional().default(false),
    // Step 4
    how_to_apply_type: z.enum(HOW_TO_APPLY_TYPES),
    how_to_apply_url: z.string().url().optional().or(z.literal('')),
    contact_name: z.string().trim().min(2).max(120).optional().or(z.literal('')),
    contact_email: z.string().email().optional().or(z.literal('')),
    contact_phone: z.string().trim().max(40).optional().or(z.literal('')),
    fees: z
      .string()
      .trim()
      .min(1, 'Fee information is required. If the programme is free, write “No fees”.')
      .max(2000),
    eligibility_notes: z.string().trim().max(2000).optional().default(''),
    accommodation_notes: z.string().trim().max(1000).optional().or(z.literal('')),
    green_travel: z.boolean().optional().default(false),
    inclusion_support: z.boolean().optional().default(false),
    card_image_path: z.string().trim().max(300).optional().or(z.literal('')),
  })
  .refine((d) => d.physical_start_date < d.physical_end_date, {
    message: 'Physical mobility end date must be after the start date.',
    path: ['physical_end_date'],
  })
  .refine(
    (d) =>
      d.how_to_apply_type === 'url'
        ? Boolean(d.how_to_apply_url)
        : Boolean(d.contact_name) && Boolean(d.contact_email),
    {
      message: 'Provide either an application URL or coordinator contact details.',
      path: ['how_to_apply_type'],
    },
  )
export type FullBipValues = z.infer<typeof fullBipSchema>
