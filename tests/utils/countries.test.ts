import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  ERASMUS_COUNTRIES,
  ERASMUS_COUNTRY_CODES,
  getCountryName,
} from '@/lib/countries'

const FLAGS_DIR = join(process.cwd(), 'public', 'flags')
const TOPO_PATH = join(process.cwd(), 'public', 'eu-countries.json')

/** Geometry ids in the choropleth basemap (feature.id === ISO alpha-2). */
function mapGeometryIds(): string[] {
  const topo = JSON.parse(readFileSync(TOPO_PATH, 'utf8')) as {
    objects: { countries: { geometries: Array<{ id?: string }> } }
  }
  return topo.objects.countries.geometries.map((g) => String(g.id))
}

describe('countries — every selectable country renders on the map', () => {
  it('ships an SVG flag for every ERASMUS_COUNTRIES code', () => {
    const missing = ERASMUS_COUNTRY_CODES.filter(
      (code) => !existsSync(join(FLAGS_DIR, `${code}.svg`)),
    )
    expect(missing).toEqual([])
  })

  it('includes every ERASMUS_COUNTRIES code as a map geometry', () => {
    const ids = mapGeometryIds()
    const missing = ERASMUS_COUNTRY_CODES.filter((code) => !ids.includes(code))
    expect(missing).toEqual([])
  })

  it('resolves display names for the Balkan / EFTA additions', () => {
    expect(getCountryName('ME')).toBe('Montenegro')
    expect(getCountryName('CH')).toBe('Switzerland')
    expect(getCountryName('BY')).toBe('Belarus')
    expect(getCountryName('MT')).toBe('Malta')
  })

  it('keeps the country list unique', () => {
    expect(new Set(ERASMUS_COUNTRY_CODES).size).toBe(ERASMUS_COUNTRIES.length)
  })
})
