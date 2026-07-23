import countries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json'

countries.registerLocale(enLocale)

/**
 * Display-name overrides for codes whose i18n-iso-countries name is verbose or
 * absent. Keys are uppercase ISO 3166-1 alpha-2.
 *   - MD: library returns "Moldova, Republic of"; we prefer the short form.
 * (XK/Kosovo already resolves to "Kosovo" in the library, so needs no override.)
 */
const NAME_OVERRIDES: Record<string, string> = {
  MD: 'Moldova',
}

/**
 * Countries selectable in BipHub — ISO 3166-1 alpha-2 codes (uppercase).
 *
 * 40 countries total:
 *   Erasmus+ programme countries (34):
 *     EU-27: AT, BE, BG, HR, CY, CZ, DK, EE, FI, FR, DE, GR, HU, IE, IT, LV,
 *            LT, LU, MT, NL, PL, PT, RO, SK, SI, ES, SE
 *     EEA + associated: IS (Iceland), LI (Liechtenstein), NO (Norway)
 *     Candidate countries: MK (North Macedonia), RS (Serbia), TR (Türkiye),
 *                          ME (Montenegro)
 *   Additional partner / neighbourhood countries (6, added 2026-07):
 *     GB (United Kingdom), UA (Ukraine), MD (Moldova), AL (Albania),
 *     XK (Kosovo), BA (Bosnia and Herzegovina)
 *
 * Note: the additional six are not all official Erasmus+ programme countries;
 * they are included so BIPs hosted or partnered there are discoverable.
 *
 * Used by:
 *   - <EuropeMap> (Plan 01-05) — choropleth basemap (public/eu-countries.json
 *     is regenerated from this list via `npm run build:topojson`)
 *   - /bips country filter (Plan 01-06) — facet list
 *   - lib/types/bip.ts validation contexts
 *
 * CANONICAL CONTRACT (locked per 01-02 plan interfaces block):
 * The property is `code`, NOT `iso2`. Downstream plans (01-05, 01-06, 01-07)
 * must use `c.code` — do not rename this property.
 */
export const ERASMUS_COUNTRIES: ReadonlyArray<{
  code: string  // ISO 3166-1 alpha-2 (uppercase per ISO standard)
  name: string
}> = (
  [
    'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE',
    'IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
    'IS','LI','NO',
    'MK','RS','TR','ME',
    // Additional partner / neighbourhood countries (2026-07)
    'GB','UA','MD','AL','XK','BA',
  ] as const
).map((code) => ({
  code,
  name: getCountryName(code),
}))

export const ERASMUS_COUNTRY_CODES = ERASMUS_COUNTRIES.map((c) => c.code)
export type ErasmusCountryCode = (typeof ERASMUS_COUNTRY_CODES)[number]

/**
 * Look up the English name for any ISO 3166-1 alpha-2 code.
 * Falls back to the uppercase code if not found.
 */
export function getCountryName(code: string): string {
  const upper = code.toUpperCase()
  return NAME_OVERRIDES[upper] ?? countries.getName(upper, 'en') ?? upper
}

/**
 * Returns true if the code is one of the 40 countries selectable in BipHub.
 */
export function isErasmusCountry(code: string): code is ErasmusCountryCode {
  return ERASMUS_COUNTRY_CODES.includes(code.toUpperCase() as ErasmusCountryCode)
}

/**
 * ISO 3166-1 alpha-2 → regional indicator emoji pair.
 * Renders as a country flag in modern OS-rendered fonts and Satori-rendered OG images.
 * Consumed by Plan 01-07 (BipHeader meta row, opengraph-image.tsx).
 *
 * Implementation: each ASCII letter A-Z maps to its regional indicator code point at
 * U+1F1E6 + (charCode - 'A'.charCode). The two combined code points render as a flag.
 */
export function getCountryFlagEmoji(code: string): string {
  if (!code || code.length !== 2) return ''
  const upper = code.toUpperCase()
  const A = 0x1f1e6
  return String.fromCodePoint(
    A + upper.charCodeAt(0) - 'A'.charCodeAt(0),
    A + upper.charCodeAt(1) - 'A'.charCodeAt(0),
  )
}
