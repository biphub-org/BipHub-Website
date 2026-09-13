import Link from 'next/link'
import { Eyebrow } from './Eyebrow'
import { getCountryName, isErasmusCountry } from '@/lib/countries'

interface TopCountriesMobileProps {
  countsByCountry: Record<string, number>
}

const MAX_TILES = 8

export function TopCountriesMobile({ countsByCountry }: TopCountriesMobileProps) {
  const ranked = Object.entries(countsByCountry)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TILES)

  return (
    <div className="rounded-lg border border-border bg-white p-6 shadow-md">
      <div className="mb-6 text-center">
        <Eyebrow className="mb-3 justify-center">Browse by country</Eyebrow>
        <h2
          className="font-bold text-ink"
          style={{
            fontSize: 'clamp(26px, 7vw, 32px)',
            lineHeight: '1.15',
            letterSpacing: '-0.5px',
          }}
        >
          Programs across Europe
        </h2>
        <p className="mt-3 text-[15px] text-muted">
          Tap a country to see its BIPs.
        </p>
      </div>

      {ranked.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          No programs available yet — check back soon.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {ranked.map(([code, count]) => (
            <li key={code}>
              <Link
                href={`/bips?country=${code}`}
                className="flex items-center justify-between rounded-full border border-border bg-bg-soft px-4 py-3 transition-colors hover:border-eu-blue hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eu-blue"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {isErasmusCountry(code) && (
                    <img
                      src={`/flags/${code.toUpperCase()}.svg`}
                      alt=""
                      aria-hidden="true"
                      width={24}
                      height={16}
                      className="h-4 w-6 shrink-0 rounded-sm object-contain"
                    />
                  )}
                  <span className="truncate text-[14px] font-medium text-ink">
                    {getCountryName(code)}
                  </span>
                </span>
                <span className="ml-2 shrink-0 text-[13px] font-semibold text-eu-blue">
                  {count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 text-center">
        <Link
          href="/bips"
          className="inline-flex items-center gap-1 text-[14px] font-semibold text-eu-blue hover:underline"
        >
          Browse all countries →
        </Link>
      </div>
    </div>
  )
}
