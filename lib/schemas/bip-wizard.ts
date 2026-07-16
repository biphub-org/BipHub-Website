import { z } from 'zod' // Zod v3 — see CLAUDE.md (locked stack)
import { ISCED_FIELDS } from '@/lib/isced'

/**
 * Wizard step schemas (SUBM-04).
 *
 * Each step's schema only validates fields owned by that step so the wizard
 * can run partial validation on Save & Continue without forcing fields from
 * other steps. Submit-time enforcement of the union belongs to Plan 02-07's
 * `submitBipAction`, which re-declares a flat schema without refinements.
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

// Step 1 — Basic information (UI-SPEC line 264-272).
export const step1Schema = z.object({
  title: z.string().trim().min(5, 'Title is too short.').max(120, 'Title is too long.'),
  subject_areas: z
    .array(z.enum(ISCED_VALUES))
    .min(1, 'Choose at least one field of study.'),
  description: z
    .string()
    .trim()
    .min(50, 'Description should be at least 50 characters.')
    .max(4000, 'Description is too long.'),
  learning_outcomes: z.string().trim().min(20, 'Please describe the learning outcomes.').max(2000),
})
export type Step1Values = z.infer<typeof step1Schema>

// Step 2 — Programme details (UI-SPEC line 274-285).
const STUDY_LEVELS = ['bachelor', 'master', 'phd'] as const
const VIRTUAL_TIMINGS = ['before', 'after', 'concurrent'] as const
const LANGUAGE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'none'] as const

export const step2Schema = z
  .object({
    virtual_component_description: z
      .string()
      .trim()
      .min(20, 'Describe the virtual component briefly.')
      .max(2000),
    virtual_timing: z.enum(VIRTUAL_TIMINGS, {
      errorMap: () => ({ message: 'Choose when the virtual component runs.' }),
    }),
    host_city: z.string().trim().min(2, 'Please enter the host city.').max(120),
    physical_start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.'),
    physical_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.'),
    application_deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.'),
    ects_credits: z.coerce
      .number()
      .int()
      .min(1, 'ECTS credits must be at least 1.')
      .max(30, 'ECTS credits must be at most 30.'),
    max_participants: z.coerce
      .number()
      .int()
      .min(5, 'A BIP needs at least 5 participants.')
      .max(20, 'A BIP can have at most 20 participants.'),
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
    message: 'Physical end date must be after the start date.',
    path: ['physical_end_date'],
  })
  .refine((data) => data.application_deadline < data.physical_start_date, {
    message: 'Deadline must be before the physical start date.',
    path: ['application_deadline'],
  })
export type Step2Values = z.infer<typeof step2Schema>

// Step 3 — Partner universities (UI-SPEC line 287-291).
// Free-text partners (`isVerified: false`) gain an "(unverified)" suffix at
// submit time so students see the distinction in the public catalog.
export const step3PartnerSchema = z.object({
  university_id: z.string().uuid().nullable(),
  name: z.string().trim().min(2, 'Partner name is too short.'),
  country: z.string().min(2).max(2),
  isVerified: z.boolean(),
})
export type Step3Partner = z.infer<typeof step3PartnerSchema>

export const step3Schema = z.object({
  partner_universities: z.array(step3PartnerSchema).default([]),
})
export type Step3Values = z.infer<typeof step3Schema>

// Step 4 — Application information (UI-SPEC line 293-298).
const HOW_TO_APPLY_TYPES = ['url', 'contact'] as const

export const step4Schema = z
  .object({
    green_travel: z.boolean().default(false),
    inclusion_support: z.boolean().default(false),
    eligibility_notes: z.string().trim().max(2000).optional().default(''),
    how_to_apply_type: z.enum(HOW_TO_APPLY_TYPES, {
      errorMap: () => ({ message: 'Pick how students will apply.' }),
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
 * Plan 02-07's `submitBipAction` keeps a private flat schema for the
 * coordinator submit path. Plan 03-07 (admin edit) needs the same
 * cross-field validation but lives in `lib/actions/admin-bips.ts`,
 * which cannot reach a `'use server'` module's internals. The exported
 * `fullBipSchema` below mirrors that flat shape verbatim so admin
 * updates run through the identical validator surface (T-03-04
 * mitigation). Keep the two in sync — any field change in submit's
 * inline schema must also land here.
 */
export const fullBipSchema = z
  .object({
    // Step 1
    title: step1Schema.shape.title,
    subject_areas: step1Schema.shape.subject_areas,
    description: step1Schema.shape.description,
    learning_outcomes: step1Schema.shape.learning_outcomes,
    // Step 2 — re-declare without per-step `.refine`s; they live below.
    virtual_component_description: z.string().trim().min(20).max(2000),
    virtual_timing: z.enum(VIRTUAL_TIMINGS),
    host_city: z.string().trim().min(2).max(120),
    physical_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    physical_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    application_deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    ects_credits: z.coerce.number().int().min(1).max(30),
    max_participants: z.coerce.number().int().min(5).max(20),
    study_levels: z.array(z.enum(STUDY_LEVELS)).min(1),
    language_of_instruction: z.string().min(2).max(10),
    language_level_min: z.enum(LANGUAGE_LEVELS),
    // Step 4
    green_travel: z.boolean(),
    inclusion_support: z.boolean(),
    eligibility_notes: z.string().trim().max(2000).optional().default(''),
    how_to_apply_type: z.enum(HOW_TO_APPLY_TYPES),
    how_to_apply_url: z.string().url().optional().or(z.literal('')),
    contact_name: z.string().trim().min(2).max(120).optional().or(z.literal('')),
    contact_email: z.string().email().optional().or(z.literal('')),
  })
  .refine((d) => d.physical_start_date < d.physical_end_date, {
    message: 'Physical end date must be after the start date.',
    path: ['physical_end_date'],
  })
  .refine((d) => d.application_deadline < d.physical_start_date, {
    message: 'Deadline must be before the physical start date.',
    path: ['application_deadline'],
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
