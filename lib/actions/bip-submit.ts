'use server'

/**
 * BIP submit Server Action (SUBM-03 / SUBM-08).
 *
 * The trust boundary that promotes a coordinator-owned draft into the public
 * review queue. Re-validates the entire draft server-side via `submitSchema`
 * (NEVER trusts the wizard's per-step client validation), finalizes the slug,
 * writes `bip_partner_universities` rows, and flips `bips.status` to
 * `'pending'`.
 *
 * Authorization layers:
 *   - `getClaims()` — JWT-validated identity (CLAUDE.md never-do compliance:
 *     never the unvalidated session reader server-side).
 *   - Defense-in-depth read-back of `bips.created_by` + `status` even though
 *     RLS `bips_update_own_draft_or_pending` already enforces both. Provides
 *     clear error UX and a second layer if RLS is loosened later.
 *
 * Slug strategy (Pitfall 3 follow-on):
 *   - Plan 02-06 inserted with a `draft-{slug}-{uuid8}` to satisfy NOT NULL.
 *   - Submit replaces it with `finalizeSlug(title, userIdPrefix, year)`.
 *   - On the rare case of a slug collision with another already-submitted
 *     BIP, we append the bip-id prefix to keep `bips.slug` UNIQUE
 *     (T-02-07-04 mitigation).
 *
 * Partner write (T-02-07-07 risk acceptance):
 *   - Delete-then-insert for `bip_partner_universities` rows scoped by
 *     `bip_id`. Phase 2 accepts the brief failure window between delete and
 *     insert as recoverable via edit (small N, no transaction primitive in
 *     Supabase JS client v1). Free-text partners get the `(unverified)`
 *     suffix in `partner_name_raw` per the public-page contract from
 *     Plan 01-07.
 *
 * Auth: uses `getClaims()` exclusively. Never imports the service-role
 * admin client factory — submission is a coordinator-owned RLS-bound write.
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { finalizeSlug } from '@/lib/utils/slug'
import { step1Schema } from '@/lib/schemas/bip-wizard'
import type { BipDraftData, Step3PartnerDraft } from '@/lib/store/bip-draft'

export type SubmitBipResult =
  | { success: true; bipId: string; slug: string }
  | { error: string }

/**
 * Flat full-submit schema. Re-applies the cross-field refinements that the
 * per-step schemas enforce client-side (date ordering, URL XOR contact)
 * because Zod refinement merges produce awkward types when you compose
 * `step{1..4}Schema` directly. Plan 02-06 SUMMARY.md decision #2 acknowledges
 * this and defers the flat schema to here (Plan 02-07).
 */
const submitSchema = z
  .object({
    // Step 1 — reuse the source-of-truth fields.
    title: step1Schema.shape.title,
    isced_f_code: step1Schema.shape.isced_f_code,
    description: step1Schema.shape.description,
    learning_outcomes: step1Schema.shape.learning_outcomes,
    // Step 2 — re-declare without the per-step `.refine`s; they live below.
    virtual_component_description: z.string().trim().min(20).max(2000),
    virtual_timing: z.enum(['before', 'after', 'concurrent'] as const),
    host_city: z.string().trim().min(2).max(120),
    physical_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    physical_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    application_deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    ects_credits: z.coerce.number().int().min(1).max(30),
    max_participants: z.coerce.number().int().min(5).max(20),
    study_levels: z
      .array(z.enum(['bachelor', 'master', 'phd'] as const))
      .min(1),
    language_of_instruction: z.string().min(2).max(10),
    language_level_min: z.enum([
      'A1',
      'A2',
      'B1',
      'B2',
      'C1',
      'C2',
      'none',
    ] as const),
    // Step 4
    green_travel: z.boolean(),
    inclusion_support: z.boolean(),
    eligibility_notes: z.string().trim().max(2000).optional().default(''),
    how_to_apply_type: z.enum(['url', 'contact'] as const),
    how_to_apply_url: z.string().url().optional().or(z.literal('')),
    contact_name: z.string().trim().min(2).max(120).optional().or(z.literal('')),
    contact_email: z.string().email().optional().or(z.literal('')),
  })
  .refine((d) => d.physical_start_date < d.physical_end_date, {
    message: 'Physical end date must be after start date.',
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
      message: 'Provide URL or contact details.',
      path: ['how_to_apply_type'],
    },
  )

export async function submitBipAction(
  bipId: string,
  draft: BipDraftData,
  partners: Step3PartnerDraft[] = [],
): Promise<SubmitBipResult> {
  const supabase = await createClient()
  const { data: claimsData, error: authError } = await supabase.auth.getClaims()
  if (authError || !claimsData?.claims?.sub) {
    return { error: 'Your session has expired. Please sign in again.' }
  }
  const userId = claimsData.claims.sub

  // D-12 / FOUN-08 belt-and-suspenders: RLS bips_insert_coordinator now requires
  // app_metadata.role IN ('coordinator','admin'), but RLS is subject to the JWT-timing
  // caveat (Pitfall 1/3). This synchronous application-layer assertion guards the
  // submit path regardless of JWT refresh state. (T-05-02)
  const role = (claimsData.claims as { app_metadata?: { role?: string } })?.app_metadata?.role
  if (role !== 'coordinator' && role !== 'admin') {
    return { error: 'Forbidden.' }
  }

  // Server-side full re-validation. The wizard's per-step Zod schemas already
  // enforced this client-side, but submit is the trust boundary for entering
  // the public review queue (T-02-07-02 mitigation).
  const parsed = submitSchema.safeParse(draft)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Validation failed.' }
  }

  // Defense-in-depth: read-back ownership + status (T-02-07-01 / T-02-07-03).
  const { data: existing } = await supabase
    .from('bips')
    .select('id, status, created_by, slug')
    .eq('id', bipId)
    .maybeSingle()
  if (!existing) return { error: 'BIP not found.' }
  if (existing.created_by !== userId) {
    return { error: 'You do not have permission to submit this BIP.' }
  }
  if (existing.status !== 'draft' && existing.status !== 'pending') {
    return { error: 'Only draft and pending BIPs can be submitted.' }
  }

  // Slug finalization. The user's profile may carry an Erasmus code, but at
  // submission time the wizard does not have it on the draft — use a stable
  // user-id-prefix surrogate so the URL still looks meaningful and remains
  // unique. Final slug shape: `{title}-{userIdPrefix}-{year}`.
  const finalSlug = finalizeSlug(
    parsed.data.title,
    userId.slice(0, 6),
    new Date().getFullYear(),
  )

  // Slug-collision guard (T-02-07-04). On match we append the bip id prefix
  // for guaranteed uniqueness without losing the readable shape.
  const { data: slugMatch } = await supabase
    .from('bips')
    .select('id')
    .eq('slug', finalSlug)
    .neq('id', bipId)
    .maybeSingle()
  const safeSlug = slugMatch ? `${finalSlug}-${bipId.slice(0, 8)}` : finalSlug

  // host_university_id is server-authoritative — resolved from the
  // coordinator's profile-locked university, never trusted from client input.
  // Also self-heals any draft created before host_university_id was written
  // on insert (saveDraftAction).
  const { data: hostProfile } = await supabase
    .from('profiles')
    .select('university_id')
    .eq('id', userId)
    .maybeSingle()
  if (!hostProfile?.university_id) {
    return {
      error: 'Your profile has no host university. Complete onboarding first.',
    }
  }

  // 1. Promote the BIP row to status='pending' and persist the canonical
  //    field set. RLS `bips_update_own_draft_or_pending` enforces the
  //    coordinator owns this row and that the status transition is allowed.
  const updatePayload = {
    title: parsed.data.title,
    isced_f_code: parsed.data.isced_f_code,
    description: parsed.data.description,
    learning_outcomes: parsed.data.learning_outcomes,
    virtual_component_description: parsed.data.virtual_component_description,
    virtual_timing: parsed.data.virtual_timing,
    host_city: parsed.data.host_city,
    physical_start_date: parsed.data.physical_start_date,
    physical_end_date: parsed.data.physical_end_date,
    application_deadline: parsed.data.application_deadline,
    ects_credits: parsed.data.ects_credits,
    max_participants: parsed.data.max_participants,
    study_levels: parsed.data.study_levels,
    language_of_instruction: parsed.data.language_of_instruction,
    language_level_min: parsed.data.language_level_min,
    green_travel: parsed.data.green_travel,
    inclusion_support: parsed.data.inclusion_support,
    eligibility_notes: parsed.data.eligibility_notes,
    how_to_apply_type: parsed.data.how_to_apply_type,
    how_to_apply_value:
      parsed.data.how_to_apply_type === 'url'
        ? (parsed.data.how_to_apply_url ?? null)
        : (parsed.data.contact_email ?? null),
    contact_name: parsed.data.contact_name || null,
    contact_email: parsed.data.contact_email || null,
    slug: safeSlug,
    host_university_id: hostProfile.university_id,
    status: 'pending',
    updated_at: new Date().toISOString(),
  }

  const { error: updateError } = await supabase
    .from('bips')
    .update(updatePayload)
    .eq('id', bipId)
    .eq('created_by', userId)
  if (updateError) {
    console.error('[submitBipAction] update error:', updateError.message)
    return { error: 'Failed to submit BIP. Please try again.' }
  }

  // 2. Replace partner rows scoped by bip_id. Small N (≤5-10 partners in
  //    practice). T-02-07-07 documents the accepted brief failure window
  //    between delete and insert.
  await supabase
    .from('bip_partner_universities')
    .delete()
    .eq('bip_id', bipId)

  const partnerRows = (partners ?? []).map((p) =>
    p.isVerified && p.university_id
      ? {
          bip_id: bipId,
          university_id: p.university_id,
          partner_name_raw: null,
          partner_country_raw: null,
          partner_erasmus_code_raw: null,
        }
      : {
          bip_id: bipId,
          university_id: null,
          partner_name_raw: `${p.name} (unverified)`,
          partner_country_raw: p.country || null,
          partner_erasmus_code_raw: null,
        },
  )

  if (partnerRows.length > 0) {
    const { error: partnerError } = await supabase
      .from('bip_partner_universities')
      .insert(partnerRows)
    if (partnerError) {
      console.error(
        '[submitBipAction] partner insert error:',
        partnerError.message,
      )
      // BIP is already pending; partners can be added on edit. Surface a
      // non-fatal warning so the dashboard still flips to the Pending tab.
      return {
        error:
          'BIP submitted but partners could not be saved. Edit the BIP to add partners.',
      }
    }
  }

  // Bust the dashboard cache so the newly-pending BIP appears under the
  // Pending tab on the next render. Approved/rejected pages handle their own
  // revalidation in Phase 3.
  revalidatePath('/dashboard')

  // ADMN-11: notify admin of new submission.
  // Fire-and-forget per D-11 — if email fails we log but do NOT roll back
  // the submission. The audit log row written by the 00010 trigger
  // (draft→pending) IS the source of truth; email is a courtesy.
  //
  // Recipient is sourced from a server-side env var (ADMIN_NOTIFICATION_EMAIL)
  // — the coordinator cannot influence it (T-03-05 mitigation). When unset,
  // we log a warning and continue so dev environments without a configured
  // admin inbox still submit cleanly.
  const adminRecipient = process.env.ADMIN_NOTIFICATION_EMAIL
  if (adminRecipient) {
    try {
      // Look up coordinator name + university name for the email body. This
      // is a courtesy fetch — failure to read the profile must NOT block the
      // submission (already committed above). On read failure we send the
      // email with empty strings and the template renders sensible fallbacks
      // ("Unknown (Unaffiliated)").
      let coordinatorName = ''
      let coordinatorUniversity = ''
      const { data: profileRow } = await supabase
        .from('profiles')
        .select('full_name, university:university_id ( name )')
        .eq('id', userId)
        .maybeSingle<{
          full_name: string | null
          university: { name: string | null } | { name: string | null }[] | null
        }>()
      if (profileRow) {
        coordinatorName = profileRow.full_name ?? ''
        // PostgREST may return a single related row as an object or an array
        // depending on cardinality inference; handle both shapes.
        const u = profileRow.university
        if (Array.isArray(u)) {
          coordinatorUniversity = u[0]?.name ?? ''
        } else {
          coordinatorUniversity = u?.name ?? ''
        }
      }

      await sendEmail(adminRecipient, {
        template: 'admin-notification',
        props: {
          bipTitle: parsed.data.title,
          bipId,
          coordinatorName,
          coordinatorUniversity,
          submittedAt: new Date().toISOString(),
        },
      })
    } catch (err) {
      // D-11 fire-and-forget: email failure (network / Resend / SDK error)
      // is non-blocking. The DB transition already committed.
      console.error(
        '[submitBipAction] admin notification email failed (non-blocking):',
        err,
      )
    }
  } else {
    console.warn(
      '[submitBipAction] ADMIN_NOTIFICATION_EMAIL unset — skipping admin notification email',
    )
  }

  return { success: true, bipId, slug: safeSlug }
}
