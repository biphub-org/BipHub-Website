/**
 * Wizard adapter — Pitfall 4 mitigation.
 *
 * Maps the flat `BipDraftData` shape used by the wizard's Zustand store +
 * step schemas into the nested `BipDetail` shape consumed by the public-page
 * components `<BipBody>` and `<BipSidebar>` (Phase 1).
 *
 * The public detail components were built for the public catalog query result
 * (`lib/queries/bipDetail.ts`), not the coordinator's flat draft. Rather than
 * re-implementing the visual sections in the wizard, we reshape the draft into
 * the contract those components already consume.
 *
 * Note on `BipDetail` field names (Plan 01-07 contract):
 *   - both the wizard draft and the public type now use `subject_areas`
 *     (string[]); the preview carries the draft's selected fields through.
 *   - `host_university` carries `city` + `erasmus_code`. The wizard knows only
 *     the canonical (id, name, country) triple; `city` falls back to the
 *     draft's `host_city`, `erasmus_code` is null in preview.
 *   - `partners[].university` only carries `name + country` in the public type
 *     (no `id`); we omit the id deliberately to match.
 */
import type { BipDraftData } from '@/lib/store/bip-draft'
import type { BipDetail } from '@/lib/queries/bipDetail'

export interface AdapterContext {
  hostUniversity: { id: string; name: string; country: string } | null
  bipId: string | null
  slug: string | null
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  createdAt: string
}

/**
 * Build a `BipDetail`-compatible record from the wizard's flat draft. The
 * returned object is for preview rendering only — never persisted.
 *
 * Free-text partners (`isVerified=false`) gain the `(unverified)` suffix in
 * `partner_name_raw` so `<BipBody>`'s partner chip rendering matches the
 * post-submit public-page output (DETL-03 / Plan 01-07 line 110 of STATE.md).
 */
export function draftToBipDetail(
  draft: BipDraftData,
  ctx: AdapterContext,
): BipDetail {
  const host = ctx.hostUniversity
  const howToApplyValue =
    draft.how_to_apply_type === 'url'
      ? (draft.how_to_apply_url ?? null)
      : (draft.contact_email ?? null)

  return {
    id: ctx.bipId ?? '__preview__',
    slug: ctx.slug ?? 'preview',
    title: draft.title ?? 'Untitled BIP',
    description: draft.description ?? null,
    learning_outcomes: draft.learning_outcomes ?? null,
    virtual_component_description: draft.virtual_component_description ?? null,
    virtual_timing: draft.virtual_timing ?? null,
    physical_start_date: draft.physical_start_date ?? null,
    physical_end_date: draft.physical_end_date ?? null,
    host_city: draft.host_city ?? null,
    ects_credits: draft.ects_credits ?? null,
    language_of_instruction: draft.language_of_instruction ?? null,
    language_level_min: draft.language_level_min ?? null,
    study_levels: draft.study_levels ?? [],
    eligibility_notes: draft.eligibility_notes ?? null,
    how_to_apply_type: draft.how_to_apply_type ?? null,
    how_to_apply_value: howToApplyValue,
    contact_name: draft.contact_name ?? null,
    contact_email: draft.contact_email ?? null,
    application_deadline: draft.application_deadline ?? null,
    green_travel: draft.green_travel ?? false,
    inclusion_support: draft.inclusion_support ?? false,
    is_seed: false,
    status: ctx.status,
    created_at: ctx.createdAt,
    subject_areas: draft.subject_areas ?? [],
    host_university: host
      ? {
          id: host.id,
          name: host.name,
          country: host.country,
          city: draft.host_city ?? null,
          erasmus_code: null,
        }
      : null,
    partners: (draft.partner_universities ?? []).map((p, i) => {
      if (p.isVerified && p.university_id) {
        return {
          id: `preview-${i}`,
          partner_name_raw: null,
          partner_country_raw: null,
          partner_erasmus_code_raw: null,
          university_id: p.university_id,
          university: {
            name: p.name,
            country: p.country,
          },
        }
      }
      return {
        id: `preview-${i}`,
        partner_name_raw: `${p.name} (unverified)`,
        partner_country_raw: p.country || null,
        partner_erasmus_code_raw: null,
        university_id: null,
        university: null,
      }
    }),
  }
}
