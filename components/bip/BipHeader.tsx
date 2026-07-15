import { getCountryName } from '@/lib/countries'
import type { BipDetail } from '@/lib/queries/bipDetail'
import { CountryFlag } from '@/components/ui/country-flag'
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
export function BipHeader({ bip }: { bip: BipDetail }) {
  const host = bip.host_university
  const countryName = host?.country ? getCountryName(host.country) : ''

  return (
    <header className="mb-8">
      <h1
        className={cn(
          'mb-3 text-3xl lg:text-[44px] font-bold text-ink tracking-tight',
          'leading-[1.15]',
        )}
      >
        {bip.title}
      </h1>

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
    </header>
  )
}
