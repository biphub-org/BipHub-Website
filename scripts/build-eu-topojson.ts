/**
 * Builds public/eu-countries.json — the choropleth basemap for <EuropeMap>.
 * Run once after changing the country list: npm run build:topojson
 *
 * Sources (both EPSG:4326 / WGS84):
 *   1. Eurostat GISCO Countries 2024, 20M scale (official EU boundaries — locked
 *      per CLAUDE.md). Covers every listed country EXCEPT Kosovo, which GISCO
 *      omits as a distinct country for political reasons.
 *      https://gisco-services.ec.europa.eu/distribution/v2/countries/geojson/CNTR_RG_20M_2024_4326.geojson
 *   2. Natural Earth 50m Admin-0 — used ONLY to source Kosovo (XK), which GISCO
 *      lacks. NE separates Kosovo from Serbia cleanly.
 *      https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson
 *
 * Country set: the 39 countries in lib/countries.ts (ERASMUS_COUNTRIES) — the
 *   original 33 Erasmus+ programme countries plus GB, UA, MD, AL, XK, BA.
 *
 * Code normalization: GISCO uses 'EL' for Greece and 'UK' for the United Kingdom.
 *   We rewrite EL → GR and UK → GB so the choropleth keys match ISO 3166-1
 *   alpha-2 used everywhere else in the app (feature.id === ISO alpha-2).
 *
 * Output: TopoJSON with object `countries`; each geometry has
 *   feature.id = ISO alpha-2 and properties.name = English country name.
 */

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { topology } from 'topojson-server'

const GISCO_URL =
  'https://gisco-services.ec.europa.eu/distribution/v2/countries/geojson/CNTR_RG_20M_2024_4326.geojson'
const NATURAL_EARTH_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson'

/**
 * Visible-on-map countries, keyed by their GISCO source code. Greece is 'EL'
 * and the UK is 'UK' in the GISCO dataset; the normalize step below rewrites
 * those feature ids to the ISO codes (GR / GB) the rest of the app uses.
 *
 * Kosovo (XK) is intentionally absent here — GISCO has no Kosovo feature, so it
 * is sourced from Natural Earth and appended separately.
 */
const VISIBLE_GISCO_CODES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'EL', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO',
  'MK', 'RS', 'TR',
  // Added 2026-07: non-EU programme/partner countries
  'UK', 'UA', 'MD', 'AL', 'BA',
])

/**
 * GISCO → ISO 3166-1 alpha-2 normalization for the two non-ISO codes GISCO uses.
 */
const ISO_ALIAS: Record<string, string> = {
  EL: 'GR', // Greece
  UK: 'GB', // United Kingdom
}

interface GeoFeature {
  type: 'Feature'
  id?: string | number
  properties: Record<string, unknown>
  geometry: unknown
}

interface GeoFeatureCollection {
  type: 'FeatureCollection'
  features: GeoFeature[]
}

/** Normalized feature: ISO alpha-2 id + { name } properties, geometry preserved. */
function normalize(id: string, name: string, geometry: unknown): GeoFeature {
  return { type: 'Feature', id, properties: { name }, geometry }
}

async function fetchJson(url: string, label: string): Promise<GeoFeatureCollection> {
  console.log(`Fetching ${label}:\n  ${url}`)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(
      `${label} fetch failed: HTTP ${res.status} ${res.statusText}\n` +
      `If you are offline, ensure public/eu-countries.json already exists and is ≤120KB.\n` +
      `DO NOT substitute a stub — the choropleth must use real country borders.`,
    )
  }
  return (await res.json()) as GeoFeatureCollection
}

async function main() {
  // --- Source 1: GISCO (38 of 39 countries) ---
  const gisco = await fetchJson(GISCO_URL, 'Eurostat GISCO Countries 2024 (20M)')

  const features: GeoFeature[] = gisco.features
    .filter((f) => VISIBLE_GISCO_CODES.has(String(f.properties.CNTR_ID ?? '')))
    .map((f) => {
      const source = String(f.properties.CNTR_ID)
      const iso = ISO_ALIAS[source] ?? source
      const name = String(f.properties.NAME_ENGL ?? f.properties.CNTR_NAME ?? iso)
      return normalize(iso, name, f.geometry)
    })

  console.log(`GISCO matched ${features.length} countries (expected 38)`)

  // --- Source 2: Natural Earth (Kosovo only) ---
  const ne = await fetchJson(NATURAL_EARTH_URL, 'Natural Earth 50m Admin-0 (Kosovo)')
  const kosovo = ne.features.find(
    (f) => String(f.properties.ISO_A2_EH ?? '') === 'XK' || /^kosov/i.test(String(f.properties.NAME ?? '')),
  )
  if (!kosovo) {
    throw new Error('Kosovo not found in Natural Earth dataset — cannot build map. Aborting.')
  }
  features.push(normalize('XK', 'Kosovo', kosovo.geometry))
  console.log('Appended Kosovo (XK) from Natural Earth')

  if (features.length < 38) {
    throw new Error(
      `Unexpectedly few countries (${features.length}) — check source data formats.\n` +
      `Expected 39 (38 GISCO + Kosovo). Aborting to avoid writing bad TopoJSON.`,
    )
  }

  const collection: GeoFeatureCollection = { type: 'FeatureCollection', features }

  // topojson-server topology() quantizes geometry for compression
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const topo = topology({ countries: collection as any }, 1e5)

  const outputPath = join(process.cwd(), 'public', 'eu-countries.json')
  const json = JSON.stringify(topo)
  writeFileSync(outputPath, json, 'utf8')

  const kb = Math.round(json.length / 1024)
  console.log(`Wrote ${features.length} countries to public/eu-countries.json (${kb}KB)`)

  if (json.length < 30_000) {
    console.warn(`WARNING: file is only ${kb}KB — unusually small. Check the source URLs or scale.`)
  }
  if (json.length > 130_000) {
    console.warn(`WARNING: file is ${kb}KB — larger than the ~120KB target. Check the scale parameter.`)
  }
}

void main().catch((err: unknown) => {
  console.error('build:topojson FAILED:', err)
  process.exit(1)
})
