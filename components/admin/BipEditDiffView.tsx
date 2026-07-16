'use client'

/**
 * BipEditDiffView — all-fields side-by-side diff (D-07 / EDIT-03 / Phase 8 plan 06).
 *
 * Renders every editable BIP field in a two-column grid (live | proposed) with
 * changed fields highlighted in gold. Change detection uses JSON.stringify
 * comparison of field values computed at render time.
 *
 * Security (T-08-17): All values rendered as React text content only.
 * No dangerouslySetInnerHTML anywhere. whitespace-pre-wrap handles multi-line
 * coordinator input safely.
 *
 * Tailwind v4 (CLAUDE.md never-do): All class strings are complete literals —
 * no template literals, no dynamic concatenation of class names.
 *
 * Field list order per D-07 / plan 08-06 interfaces:
 *   Virtual start/end date rows DROPPED — those columns do not exist in bips
 *   (Q1 / planner resolution in 08-06-PLAN.md <interfaces>).
 *   Slug NEVER shown (D-10 / EDIT-09).
 */

import type { BipDetail } from '@/lib/queries/bipDetail'
import type { BipEditDetail } from '@/lib/queries/bipEdits'
import type { BipDraftData } from '@/lib/store/bip-draft'
import { ISCED_FIELD_BY_ID } from '@/lib/isced'

// ── Field definition ──────────────────────────────────────────────────────────

type FieldDef = {
  label: string
  /** Extract a comparable + displayable string from the live BIP (BipDetail). */
  getLive: (bip: BipDetail) => string | null | undefined
  /** Extract a comparable + displayable string from the proposed edit data (BipDraftData). */
  getProposed: (data: BipDraftData) => string | null | undefined
}

// ── Format helpers ────────────────────────────────────────────────────────────

function fmtBool(v: boolean | null | undefined): string | null {
  if (v === null || v === undefined) return null
  return v ? 'Yes' : 'No'
}

function fmtStudyLevels(levels: string[] | readonly string[] | null | undefined): string | null {
  if (!levels || levels.length === 0) return null
  return [...levels].join(', ')
}

/** Render the multi-field set as human labels (falls back to the raw id). */
function fmtFields(ids: string[] | readonly string[] | null | undefined): string | null {
  if (!ids || ids.length === 0) return null
  return ids
    .map(
      (id) =>
        ISCED_FIELD_BY_ID[id as keyof typeof ISCED_FIELD_BY_ID]?.label ??
        id.replace(/-/g, ' '),
    )
    .join(', ')
}

function fmtPartnerLive(bip: BipDetail): string | null {
  if (!bip.partners || bip.partners.length === 0) return null
  const names = bip.partners
    .map((p) => p.university?.name ?? p.partner_name_raw ?? '')
    .filter(Boolean)
  return names.length > 0 ? names.join('\n') : null
}

function fmtPartnerProposed(data: BipDraftData): string | null {
  if (!data.partner_universities || data.partner_universities.length === 0) return null
  const names = data.partner_universities.map((p) => p.name).filter(Boolean)
  return names.length > 0 ? names.join('\n') : null
}

function fmtHowToApplyLive(bip: BipDetail): string | null {
  if (!bip.how_to_apply_type) return null
  return `${bip.how_to_apply_type}: ${bip.how_to_apply_value ?? ''}`.trimEnd()
}

function fmtHowToApplyProposed(data: BipDraftData): string | null {
  if (!data.how_to_apply_type) return null
  // URL type: value stored in how_to_apply_url.
  // Contact type: contact details shown via separate contact_name / contact_email rows.
  const value = data.how_to_apply_type === 'url' ? (data.how_to_apply_url ?? '') : ''
  return `${data.how_to_apply_type}: ${value}`.trimEnd()
}

// ── Field list — ordered per D-07 / plan 08-06 <interfaces> ──────────────────
//
// NOTE: max_participants is not exposed in BipDetail (only in BipDraftData) — the
// live column will always render "—". This is correct: the admin sees what's proposed.
//
// NOTE: Fields of study — both BipDetail and BipDraftData expose subject_areas
// (string[] of field ids); fmtFields renders them as human labels.

const FIELDS: FieldDef[] = [
  {
    label: 'Title',
    getLive: (b) => b.title ?? null,
    getProposed: (d) => d.title ?? null,
  },
  {
    label: 'Short description',
    getLive: (b) => b.description,
    getProposed: (d) => d.description ?? null,
  },
  {
    label: 'Learning outcomes',
    getLive: (b) => b.learning_outcomes,
    getProposed: (d) => d.learning_outcomes ?? null,
  },
  {
    label: 'Fields of study',
    getLive: (b) => fmtFields(b.subject_areas),
    getProposed: (d) => fmtFields(d.subject_areas),
  },
  {
    label: 'Language of instruction',
    getLive: (b) => b.language_of_instruction,
    getProposed: (d) => d.language_of_instruction ?? null,
  },
  {
    label: 'Min. language level',
    getLive: (b) => b.language_level_min,
    getProposed: (d) => d.language_level_min ?? null,
  },
  {
    label: 'ECTS credits',
    getLive: (b) => (b.ects_credits != null ? String(b.ects_credits) : null),
    getProposed: (d) => (d.ects_credits != null ? String(d.ects_credits) : null),
  },
  {
    label: 'Max participants',
    getLive: () => null,
    getProposed: (d) => (d.max_participants != null ? String(d.max_participants) : null),
  },
  {
    label: 'Study levels',
    getLive: (b) => fmtStudyLevels(b.study_levels),
    getProposed: (d) => fmtStudyLevels(d.study_levels),
  },
  {
    label: 'Host city',
    getLive: (b) => b.host_city,
    getProposed: (d) => d.host_city ?? null,
  },
  {
    label: 'Physical start date',
    getLive: (b) => b.physical_start_date,
    getProposed: (d) => d.physical_start_date ?? null,
  },
  {
    label: 'Physical end date',
    getLive: (b) => b.physical_end_date,
    getProposed: (d) => d.physical_end_date ?? null,
  },
  {
    label: 'Application deadline',
    getLive: (b) => b.application_deadline,
    getProposed: (d) => d.application_deadline ?? null,
  },
  {
    label: 'Virtual component',
    getLive: (b) => b.virtual_component_description,
    getProposed: (d) => d.virtual_component_description ?? null,
  },
  {
    label: 'Virtual timing',
    getLive: (b) => b.virtual_timing,
    getProposed: (d) => d.virtual_timing ?? null,
  },
  {
    label: 'Green travel',
    getLive: (b) => fmtBool(b.green_travel),
    getProposed: (d) => fmtBool(d.green_travel),
  },
  {
    label: 'Inclusion support',
    getLive: (b) => fmtBool(b.inclusion_support),
    getProposed: (d) => fmtBool(d.inclusion_support),
  },
  {
    label: 'Eligibility notes',
    getLive: (b) => b.eligibility_notes,
    getProposed: (d) => d.eligibility_notes ?? null,
  },
  {
    label: 'How to apply',
    getLive: fmtHowToApplyLive,
    getProposed: fmtHowToApplyProposed,
  },
  {
    label: 'Contact name',
    getLive: (b) => b.contact_name,
    getProposed: (d) => d.contact_name ?? null,
  },
  {
    label: 'Contact email',
    getLive: (b) => b.contact_email,
    getProposed: (d) => d.contact_email ?? null,
  },
  {
    label: 'Partner institutions',
    getLive: fmtPartnerLive,
    getProposed: fmtPartnerProposed,
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  liveBip: BipDetail
  proposedEdit: BipEditDetail
}

export function BipEditDiffView({ liveBip, proposedEdit }: Props) {
  // Compute live value, proposed value, and changed flag for every field.
  const fieldData = FIELDS.map((field) => {
    const liveVal = field.getLive(liveBip) ?? null
    const proposedVal = field.getProposed(proposedEdit.data) ?? null
    const changed = JSON.stringify(liveVal) !== JSON.stringify(proposedVal)
    return { label: field.label, liveVal, proposedVal, changed }
  })

  const changedCount = fieldData.filter((f) => f.changed).length

  return (
    <div className="rounded-md border border-border bg-white shadow-sm mb-6">

      {/* ── Card header ─────────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h2 className="text-[22px] font-semibold text-ink">Field Comparison</h2>
        {changedCount === 0 ? (
          <span className="text-sm text-muted italic">No fields changed</span>
        ) : (
          <span className="text-sm text-muted">
            {changedCount} field{changedCount === 1 ? '' : 's'} changed
          </span>
        )}
      </div>

      {/* ── Column header row — desktop only (md: = 960px) ──────────────────── */}
      <div className="hidden md:grid grid-cols-[180px_1fr_1fr] gap-0 px-6 py-2 bg-bg-soft border-b border-border sticky top-[var(--admin-header-height,56px)]">
        <span className="text-xs font-semibold text-muted uppercase tracking-wide">Field</span>
        <span className="text-xs font-semibold text-muted uppercase tracking-wide flex items-center">
          <span
            className="inline-block w-2 h-2 rounded-full bg-status-approved mr-1.5 align-middle"
            aria-hidden="true"
          />
          Live version
        </span>
        <span className="text-xs font-semibold text-muted uppercase tracking-wide flex items-center">
          <span
            className="inline-block w-2 h-2 rounded-full bg-eu-blue mr-1.5 align-middle"
            aria-hidden="true"
          />
          Proposed edit
        </span>
      </div>

      {/* ── Field rows ───────────────────────────────────────────────────────── */}
      {fieldData.map(({ label, liveVal, proposedVal, changed }) => (
        <div key={label}>

          {/* Desktop row (hidden on mobile <960px) */}
          <div
            className={
              changed
                ? 'hidden md:grid grid-cols-[180px_1fr_1fr] gap-0 px-6 py-3 border-b border-border bg-eu-gold-soft border-l-2 border-l-eu-gold'
                : 'hidden md:grid grid-cols-[180px_1fr_1fr] gap-0 px-6 py-3 border-b border-border hover:bg-bg-soft transition-colors'
            }
          >
            <span className="text-sm font-semibold text-muted self-start pt-0.5">{label}</span>
            <span className="text-sm text-ink whitespace-pre-wrap">
              {liveVal != null && liveVal !== '' ? (
                liveVal
              ) : (
                <span className="text-muted">—</span>
              )}
            </span>
            <span className="text-sm text-ink whitespace-pre-wrap">
              {proposedVal != null && proposedVal !== '' ? (
                proposedVal
              ) : (
                <span className="text-muted">—</span>
              )}
            </span>
          </div>

          {/* Mobile stacked (hidden on desktop ≥960px) */}
          <div
            className={
              changed
                ? 'md:hidden border-l-2 border-l-eu-gold bg-eu-gold-soft px-4 py-3 mb-2 rounded-r'
                : 'md:hidden px-4 py-3 mb-2 border-b border-border'
            }
          >
            <p className="text-sm font-semibold text-muted mb-1">{label}</p>
            <p className="text-xs font-semibold text-muted">Live:</p>
            <p className="text-sm text-ink whitespace-pre-wrap mb-1">
              {liveVal != null && liveVal !== '' ? liveVal : '—'}
            </p>
            {changed && (
              <>
                <p className="text-xs font-semibold text-muted">Proposed:</p>
                <p className="text-sm text-ink whitespace-pre-wrap">
                  {proposedVal != null && proposedVal !== '' ? proposedVal : '—'}
                </p>
              </>
            )}
          </div>

        </div>
      ))}
    </div>
  )
}
