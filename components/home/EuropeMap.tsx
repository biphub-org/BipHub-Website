'use client'

/**
 * EuropeMap — DISC-02, D-05, D-06, D-07, D-08.
 *
 * Client component that:
 * 1. Receives countsByCountry from the RSC parent (no server fetching here).
 * 2. Fetches /eu-countries.json at runtime via fetch() (PITFALLS Pitfall 11 — NOT imported).
 * 3. Renders a choropleth using @vnedyalk0v/react19-simple-maps.
 * 4. Applies 6 fixed tier fill classes via getTierForCount (Pitfall 13 — full literals).
 * 5. Shows tooltip on hover, navigates to /bips?country=XX on click.
 * 6. Renders MapLegend (5 swatches, tier-0 omitted) below the SVG.
 *
 * Failure mode: if fetch('/eu-countries.json') fails, shows a "Map unavailable"
 * message with a link to /bips so users still have a path forward.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ComposableMap,
  Geographies,
  Geography,
  type ProjectionConfig,
} from '@vnedyalk0v/react19-simple-maps'
import { feature } from 'topojson-client'
import type { Topology, Objects } from 'topojson-specification'
import type { GeoJsonProperties } from 'geojson'
import {
  LazyMotion,
  MotionConfig,
  AnimatePresence,
  domAnimation,
  m,
  useInView,
  type Transition,
  type Variants,
} from 'motion/react'
import { getTierForCount, TIERS } from '@/lib/map/bins'
import Link from 'next/link'
import { getCountryName } from '@/lib/countries'
import { CountryFlag } from '@/components/ui/country-flag'
import { Eyebrow } from './Eyebrow'
import { cn } from '@/lib/utils/cn'

const EASE_OUT: Transition['ease'] = [0.16, 1, 0.3, 1]

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

interface EuropeMapProps {
  countsByCountry: Record<string, number>
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  countryCode: string
  countryName: string
  count: number
}

// Static EU projection config for @vnedyalk0v/react19-simple-maps.
// rotate center shifted east (15 → 20) to keep Turkey + the Balkans in frame
// alongside Iceland on the west. scale tuned so the 32-country span fits the
// viewBox below at the new container height.
const MAP_PROJECTION_CONFIG: ProjectionConfig = {
  rotate: [-20, -52, 0] as unknown as ProjectionConfig['rotate'],
  scale: 620,
}

export function EuropeMap({ countsByCountry }: EuropeMapProps) {
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [geoData, setGeoData] = useState<any | null>(null)
  const [fetchError, setFetchError] = useState(false)
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    countryCode: '',
    countryName: '',
    count: 0,
  })
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const cardInView = useInView(cardRef, { once: true, amount: 0.2 })

  // Fetch /eu-countries.json at runtime — NOT imported into the bundle (Pitfall 11)
  useEffect(() => {
    fetch('/eu-countries.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<Topology>
      })
      .then((topo: Topology<Objects<GeoJsonProperties>>) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const countries = feature(topo, topo.objects.countries as any)
        setGeoData(countries)
      })
      .catch(() => {
        setFetchError(true)
      })
  }, [])

  const handleCountryClick = useCallback(
    (countryCode: string) => {
      router.push(`/bips?country=${countryCode}`)
    },
    [router],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, countryCode: string) => {
      const container = mapContainerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const name = getCountryName(countryCode)
      const count = countsByCountry[countryCode] ?? 0
      setTooltip({ visible: true, x, y, countryCode, countryName: name, count })
    },
    [countsByCountry],
  )

  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }))
  }, [])

  // Failure mode — TopoJSON fetch failed; offer a path to the full listing.
  if (fetchError) {
    return (
      <div className="rounded-lg border border-border bg-white p-8 shadow-md text-center">
        <p className="mb-4 text-sm text-muted">
          Map unavailable. Browse the full list to filter by country.
        </p>
        <Link
          href="/bips"
          className="inline-flex items-center justify-center rounded-full bg-eu-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-eu-blue-dark"
        >
          Browse all BIPs
        </Link>
      </div>
    )
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <div
          ref={cardRef}
          className="rounded-lg border border-border bg-white p-8 shadow-md"
        >
          {/* Section header */}
          <div className="mb-6 text-center">
            <m.div
              variants={fadeUp}
              initial="hidden"
              animate={cardInView ? 'visible' : 'hidden'}
              transition={{ duration: 0.6, ease: EASE_OUT }}
            >
              <Eyebrow className="mb-3 justify-center">Browse by country</Eyebrow>
            </m.div>
            <m.h2
              className="font-bold text-ink"
              style={{
                fontSize: 'clamp(30px, 4vw, 44px)',
                lineHeight: '1.15',
                letterSpacing: '-1px',
              }}
              variants={fadeUp}
              initial="hidden"
              animate={cardInView ? 'visible' : 'hidden'}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
            >
              Programs across Europe
            </m.h2>
            <m.p
              className="mt-3 text-[17px] text-muted"
              variants={fadeUp}
              initial="hidden"
              animate={cardInView ? 'visible' : 'hidden'}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.2 }}
            >
              Hover any country to preview availability. Click to filter the list by destination.
            </m.p>
          </div>

          {/* Map container with tooltip */}
          <div
            ref={mapContainerRef}
            className="relative"
            role="application"
            aria-label="Choropleth map of Erasmus+ countries by BIP count"
          >
            {/* Tooltip */}
            <AnimatePresence>
              {tooltip.visible && (
                <m.div
                  key="map-tooltip"
                  role="tooltip"
                  aria-live="polite"
                  className="pointer-events-none absolute z-5 rounded-md bg-ink px-4 py-2.5 text-sm text-white shadow-lg"
                  style={{
                    left: tooltip.x,
                    top: tooltip.y,
                    transform: 'translate(-50%, -130%)',
                    transformOrigin: 'center bottom',
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                >
                  <strong className="flex items-center gap-1.5 text-[14px] font-semibold">
                    <CountryFlag code={tooltip.countryCode} width={18} />
                    {tooltip.countryName}
                  </strong>
                  <span className="text-eu-gold font-semibold">
                    {tooltip.count > 0
                      ? `${tooltip.count} BIPs available`
                      : '0 BIPs yet'}
                  </span>
                  {/* Tooltip arrow */}
                  <span
                    aria-hidden="true"
                    className="absolute left-1/2 top-full -translate-x-1/2 border-[6px] border-transparent border-t-ink"
                  />
                </m.div>
              )}
            </AnimatePresence>

            {/* SVG map */}
            {geoData ? (
              <m.div
                className="aspect-[16/10] max-h-[680px] w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, ease: EASE_OUT }}
              >
            <ComposableMap
              projection="geoMercator"
              projectionConfig={MAP_PROJECTION_CONFIG}
              width={900}
              height={560}
              style={{ width: '100%', height: '100%' }}
            >
              <Geographies geography={geoData}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {({ geographies }: { geographies: any[] }) =>
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  geographies.map((geo: any) => {
                    const countryCode = (geo.id ?? geo.properties?.id ?? '') as string
                    const count = countsByCountry[countryCode] ?? 0
                    const tier = getTierForCount(count)

                    return (
                      <Geography
                        key={geo.rsmKey ?? geo.id ?? countryCode}
                        geography={geo}
                        tabIndex={0}
                        role="button"
                        aria-label={`${getCountryName(countryCode)}: ${count} BIPs`}
                        className={cn(
                          tier.fillClass,
                          'stroke-white stroke-[0.6] cursor-pointer outline-none',
                          'transition-[fill] duration-200 ease',
                          'hover:fill-eu-gold',
                          'focus-visible:outline-2 focus-visible:outline-eu-gold',
                        )}
                        onClick={() => handleCountryClick(countryCode)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleCountryClick(countryCode)
                          }
                        }}
                        onMouseMove={(e) => handleMouseMove(e as unknown as React.MouseEvent, countryCode)}
                        onMouseLeave={handleMouseLeave}
                      />
                    )
                  })
                }
              </Geographies>
            </ComposableMap>
          </m.div>
        ) : (
          /* Loading skeleton while TopoJSON fetches */
          <div
            className="aspect-[16/10] max-h-[680px] w-full animate-pulse rounded-lg bg-bg-soft"
            role="progressbar"
            aria-label="Loading map…"
            aria-busy="true"
          />
        )}
          </div>

          {/* Map legend (5 swatches — tier-0 omitted per D-06) */}
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={cardInView && geoData ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.3 }}
          >
            <MapLegend />
          </m.div>

          {/* Map info hint */}
          <p className="mt-3 text-center text-[13px] text-muted">
            Hover to preview · Click to filter the BIP list by country
          </p>
        </div>
      </MotionConfig>
    </LazyMotion>
  )
}

/** 5-swatch legend. Tier 0 omitted per D-06 (neutral 0-BIP semantics). */
function MapLegend() {
  const visibleTiers = TIERS.filter((t) => t.index > 0)

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-[12px] text-muted">
      <span>Less BIPs</span>
      <div className="flex items-center gap-1">
        {visibleTiers.map((tier) => (
          <div
            key={tier.index}
            className="flex flex-col items-center gap-1"
            title={tier.label}
          >
            {/* Swatch — uses the same full class literal as the map Geography */}
            <SwatchBox fillClass={tier.fillClass} />
          </div>
        ))}
      </div>
      <span>More BIPs</span>
    </div>
  )
}

/** Individual legend swatch — forces static class literals via a lookup. */
function SwatchBox({ fillClass }: { fillClass: string }) {
  // Map fill class to background color class using a static lookup
  // (Pitfall 13 — NEVER use template literals here)
  const bgLookup: Record<string, string> = {
    'fill-bip-tier-0': 'bg-bip-tier-0',
    'fill-bip-tier-1': 'bg-bip-tier-1',
    'fill-bip-tier-2': 'bg-bip-tier-2',
    'fill-bip-tier-3': 'bg-bip-tier-3',
    'fill-bip-tier-4': 'bg-bip-tier-4',
    'fill-bip-tier-5': 'bg-bip-tier-5',
  }
  const bgClass = bgLookup[fillClass] ?? 'bg-bg-soft'

  return (
    <div
      className={cn('h-[14px] w-[22px] rounded-[3px] border border-border', bgClass)}
    />
  )
}
