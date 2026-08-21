import { getCountryName } from '@/lib/countries'
import type { BipDetail } from '@/lib/queries/bipDetail'
import { CountryFlag } from '@/components/ui/country-flag'
import { ISCED_FIELD_BY_ID } from '@/lib/isced'
import { cn } from '@/lib/utils/cn'

/**
 * BipHeader — RSC. Renders the BIP page hero area:
 *   - h1 with BIP title
 *   - Subtitle: host university · host city, country
 *
 * Note: Erasmus+ grant perks (green-travel top-up, inclusion support) are NOT
 * shown here — they are provided by the participant's *sending* university, not
 * the host programme, so surfacing them on the host BIP page misleads students.
 *
 * UI-SPEC line 78: h1 text-3xl mobile / text-[44px] lg, font-bold, tracking-tight, lh 1.15
 */
export function BipHeader({ bip, edition }: { bip: BipDetail; edition?: number | null }) {
  const host = bip.host_university
  const countryName = host?.country ? getCountryName(host.country) : ''
  const fieldLabels = (bip.subject_areas ?? []).map(
    (id) =>
      ISCED_FIELD_BY_ID[id as keyof typeof ISCED_FIELD_BY_ID]?.label ??
      id.replace(/-/g, ' '),
  )

  return (
    <header className="mb-8">
      <div className="flex flex-wrap items-start gap-3 mb-3">
        <h1
          className={cn(
            'flex-1 min-w-0 text-3xl lg:text-[44px] font-bold text-ink tracking-tight',
            'leading-[1.15]',
          )}
        >
          {bip.title}
        </h1>
        {edition !== null && edition !== undefined && edition > 1 && (
          <span
            className="inline-flex shrink-0 items-center rounded-full border border-ink/10 bg-ink px-3 py-1 text-xs font-semibold tracking-wide text-white"
            aria-label={`Edition ${edition}`}
            title={`This program has run ${edition} times — the current offering is the ${edition}${edition === 2 ? 'nd' : edition === 3 ? 'rd' : 'th'} edition.`}
          >
            Edition {edition}
          </span>
        )}
      </div>

      {/* Subtitle: [flag] host university · host city, country */}
      {host && (
        <p className="flex flex-wrap items-center gap-x-2 text-base text-muted mb-4">
          {host.country && <CountryFlag code={host.country} width={20} />}
          <span>{host.name}</span>
          {(bip.host_city || countryName) && (
            <span>
              {' · '}
              {[bip.host_city, countryName].filter(Boolean).join(', ')}
            </span>
          )}
        </p>
      )}

      {/* Fields of study — one chip per field */}
      {fieldLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {fieldLabels.map((label) => (
            <span
              key={label}
              className="inline-flex rounded-sm bg-eu-blue-50 px-2.5 py-0.5 text-[13px] font-medium capitalize text-eu-blue"
            >
              {label}
            </span>
          ))}
        </div>
      )}
    </header>
  )
}
