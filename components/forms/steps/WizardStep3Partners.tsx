'use client'

/**
 * Wizard Step 3 — Partner universities (UI-SPEC line 287-291; SUBM-05).
 *
 * - Host university is locked, pre-filled from the coordinator's profile.
 * - Partners can be added via the searchable UniversityCombobox (registered
 *   universities) OR a free-text fallback. Free-text entries are flagged
 *   `isVerified: false` and gain the "(unverified)" suffix at submit time
 *   (Plan 02-07).
 * - Step 3 does NOT trigger the wizard's debounced auto-save:
 *   `saveDraftAction` strips `partner_universities` from its payload because
 *   partners require a finalized `bip_id` and live in a separate table written
 *   by `submitBipAction`. Partners are persisted in Zustand + localStorage only
 *   until submission.
 * - Partners are mirrored into Zustand on every change so step navigation /
 *   session-expiry recovery preserve them.
 */

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { UniversityCombobox } from '@/components/dashboard/UniversityCombobox'
import { useBipDraft, type Step3PartnerDraft } from '@/lib/store/bip-draft'
import { step3Schema, type Step3Values } from '@/lib/schemas/bip-wizard'
import { ERASMUS_COUNTRIES } from '@/lib/countries'
import type { UniversitySearchResult } from '@/lib/actions/universities'

interface Props {
  hostUniversity: { id: string; name: string; country: string }
  initialUniversities: UniversitySearchResult[]
  onContinue: (values: Step3Values) => void
}

export function WizardStep3Partners({
  hostUniversity,
  initialUniversities,
  onContinue,
}: Props) {
  const draft = useBipDraft((s) => s.draft)
  const mergeDraft = useBipDraft((s) => s.mergeDraft)

  const [partners, setPartners] = useState<Step3PartnerDraft[]>(
    draft.partner_universities ?? [],
  )
  const [partnerOnly, setPartnerOnly] = useState<boolean>(
    draft.partner_institutions_only ?? false,
  )
  const [pickerKey, setPickerKey] = useState(0) // remount UniversityCombobox after add
  const [freeName, setFreeName] = useState('')
  const [freeCountry, setFreeCountry] = useState('')
  const [error, setError] = useState<string | null>(null)

  function commit(next: Step3PartnerDraft[]) {
    setPartners(next)
    mergeDraft({ partner_universities: next })
  }

  function addRegistered(_id: string, u: UniversitySearchResult) {
    if (u.id === hostUniversity.id) {
      setError('That is your host university — partners must be a different institution.')
      return
    }
    if (partners.some((p) => p.university_id === u.id)) {
      setError('That partner is already on the list.')
      return
    }
    setError(null)
    commit([
      ...partners,
      {
        university_id: u.id,
        name: u.name,
        country: u.country,
        isVerified: true,
      },
    ])
    setPickerKey((k) => k + 1)
  }

  function addFreeText() {
    setError(null)
    const trimmedName = freeName.trim()
    if (trimmedName.length < 2) {
      setError('Partner name is too short.')
      return
    }
    if (!freeCountry) {
      setError('Please pick a country for the free-text partner.')
      return
    }
    commit([
      ...partners,
      {
        university_id: null,
        name: trimmedName,
        country: freeCountry,
        isVerified: false,
      },
    ])
    setFreeName('')
    setFreeCountry('')
  }

  function remove(index: number) {
    commit(partners.filter((_, i) => i !== index))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const result = step3Schema.safeParse({
      partner_universities: partners,
      partner_institutions_only: partnerOnly,
    })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Invalid partner list.')
      return
    }
    onContinue(result.data)
  }

  return (
    <form
      id="wizard-step-3-form"
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div>
        <div className="mb-2 text-sm font-semibold text-ink">Host university</div>
        <div className="rounded-md border border-border bg-bg-soft px-3 py-2 text-sm text-ink">
          {hostUniversity.name}{' '}
          <span className="text-muted">({hostUniversity.country})</span>
        </div>
        <p className="mt-1 text-xs text-muted">
          Locked to your profile&apos;s university. Update it on{' '}
          <a href="/onboarding" className="text-eu-blue underline">
            onboarding
          </a>{' '}
          if it changed.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1 text-sm font-semibold text-ink">Add partner universities</div>
          <p className="text-xs text-muted">
            Search the registry first; if your partner isn&apos;t listed, use the free-text fallback below.
            Free-text partners are shown to students as &ldquo;(unverified)&rdquo;.
          </p>
        </div>

        <UniversityCombobox
          key={pickerKey}
          value={null}
          onChange={addRegistered}
          initialUniversities={initialUniversities}
        />

        <div className="rounded-md border border-dashed border-border bg-bg-soft p-3 space-y-2">
          <div className="text-xs font-semibold text-ink">Free-text partner</div>
          <Input
            placeholder="Universidade do Porto"
            value={freeName}
            onChange={(e) => setFreeName(e.target.value)}
          />
          <select
            value={freeCountry}
            onChange={(e) => setFreeCountry(e.target.value)}
            className="block w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
          >
            <option value="">Country…</option>
            {ERASMUS_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addFreeText}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add as unverified
            </Button>
          </div>
        </div>

        {error && (
          <div className="text-sm text-status-rejected" role="alert">
            {error}
          </div>
        )}
      </div>

      {partners.length > 0 && (
        <div>
          <div className="mb-2 text-sm font-semibold text-ink">
            Selected partners ({partners.length})
          </div>
          <ul className="space-y-2">
            {partners.map((p, i) => (
              <li
                key={`${p.university_id ?? 'free'}-${i}`}
                className="flex items-center justify-between rounded-md border border-border bg-white px-3 py-2 text-sm"
              >
                <span className="flex flex-col">
                  <span className="font-medium text-ink">
                    {p.name}{' '}
                    {!p.isVerified && (
                      <span className="text-xs text-muted">(unverified)</span>
                    )}
                  </span>
                  <span className="text-xs text-muted">{p.country}</span>
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${p.name}`}
                  onClick={() => remove(i)}
                  className="text-muted hover:text-status-rejected"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <label className="flex items-start gap-3 rounded-md border border-border bg-white px-4 py-3 text-sm text-ink">
        <Checkbox
          checked={partnerOnly}
          onCheckedChange={(next) => {
            const boolNext = Boolean(next)
            setPartnerOnly(boolNext)
            mergeDraft({ partner_institutions_only: boolNext })
          }}
        />
        <span>
          <span className="font-medium">Open only to partner-institution students</span>
          <span className="mt-1 block text-xs text-muted">
            Restrict this BIP to students from the host and partner universities listed above,
            rather than any Erasmus-eligible student.
          </span>
        </span>
      </label>
    </form>
  )
}
