/**
 * Partner-row mapping for `bip_partner_universities`.
 *
 * The wizard keeps partners as `Step3PartnerDraft` — a flat shape that covers
 * both a registry pick (`university_id` set, `isVerified: true`) and a free-text
 * entry the coordinator typed (`university_id: null`). The table stores those
 * two cases in different columns, so every write path needs the same mapping.
 *
 * The `(unverified)` suffix on `partner_name_raw` is the public-page contract
 * from Plan 01-07. Read paths strip it on round-trip (see
 * lib/queries/coordinatorBipById.ts), so write→read→write is stable and the
 * suffix never accumulates.
 */

import type { Step3PartnerDraft } from '@/lib/store/bip-draft'

export type PartnerRowInsert = {
  bip_id: string
  university_id: string | null
  partner_name_raw: string | null
  partner_country_raw: string | null
  partner_erasmus_code_raw: string | null
}

export function toPartnerRows(
  bipId: string,
  partners: Step3PartnerDraft[],
): PartnerRowInsert[] {
  return partners.map((p) =>
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
}
