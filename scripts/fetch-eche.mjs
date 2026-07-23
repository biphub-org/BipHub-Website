// scripts/fetch-eche.mjs
//
// Fetches the official ECHE (Erasmus Charter for Higher Education) holder list
// from the European University Foundation's ECHE List API and turns it into
// TWO committed artifacts:
//
//   1. supabase/data/eche-heis.json                — the cleaned catalog (our
//      local copy; the app never calls the API at runtime, only this file /
//      the migration generated from it).
//   2. supabase/migrations/00032_eche_catalog.sql  — an idempotent bulk upsert
//      of every institution, keyed on the (canonicalized) Erasmus code.
//
// Re-run this whenever you want to refresh the catalog (new institutions join
// and old charters expire — a couple of times a year is plenty):
//
//   node scripts/fetch-eche.mjs
//
// Then review the git diff on both files and push the migration to cloud.
//
// Source: https://eche-list.erasmuswithoutpaper.eu/  (republishes the European
// Commission's accredited-HEIs list). No auth, no key. As a courtesy the fetch
// sends a descriptive User-Agent.

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(__dirname, '..')
const API_URL = 'https://eche-list.erasmuswithoutpaper.eu/api/'
const OUT_JSON = resolve(REPO, 'supabase/data/eche-heis.json')
const OUT_SQL = resolve(REPO, 'supabase/migrations/00035_eche_catalog.sql')
const ROWS_PER_INSERT = 500

// Curated display names for the institutions we hand-seeded before the import.
// Keyed by canonical Erasmus code. These win over the source's legal name so
// the well-known universities read naturally (and keep their accents) instead
// of e.g. "Aalto Korkeakoulusaatio Sr". NOTE the Sorbonne code is F PARIS468 —
// the old seed used F PARIS004, which does not exist in the official list.
const CURATED_NAMES = {
  'D MUNCHEN02': 'Technische Universität München',
  'D BERLIN02': 'Technische Universität Berlin',
  'D HEIDELB01': 'Ruprecht-Karls-Universität Heidelberg',
  'D AACHEN01': 'RWTH Aachen University',
  'NL DELFT01': 'Delft University of Technology',
  'NL UTRECHT01': 'Utrecht University',
  'NL WAGENIN01': 'Wageningen University & Research',
  'I MILANO02': 'Università Bocconi',
  'I MILANO01': 'Politecnico di Milano',
  'F PARIS468': 'Sorbonne Université',
  'E MADRID05': 'Universidad Politécnica de Madrid',
  'PL LODZ01': 'Uniwersytet Łódzki',
  'SF ESPOO12': 'Aalto University',
  'S STOCKHO10': 'KTH Royal Institute of Technology',
  'CZ PRAHA07': 'Charles University',
  'P LISBOA01': 'Universidade de Lisboa',
  'B LEUVEN01': 'KU Leuven',
  'A WIEN02': 'TU Wien',
  'DK LYNGBY01': 'Technical University of Denmark',
  // Famous universities whose ECHE legal name is unusable as a display name and
  // that no automated rule can safely shorten (comma-joined legal phrasing).
  'IRLDUBLIN01': 'Trinity College Dublin',
  'IRLDUBLIN02': 'University College Dublin',
  // Recognizable institutions whose long legal name was hand-verified to a
  // well-established short name (the rest of the long tail is left verbatim —
  // those long names are the institutions' actual names).
  'BA SARAJEV03': 'International Burch University',
  'CZ PRAHA21': 'Jan Amos Komenský University Prague',
  'D DRESDEN07': 'Evangelische Hochschule Dresden',
  'F LILLE11': 'Université Catholique de Lille',
  'HU BUDAPES46': 'Andrássy University Budapest',
  'NL EDE01': 'Christelijke Hogeschool Ede',
  'D BOCHUM04': 'Evangelische Hochschule Rheinland-Westfalen-Lippe',
  // Institutions the ECHE list stored only as their legal-association acronym
  // (no expansion) — identified from the accompanying website.
  'F LYON23': 'emlyon business school', // AESCRA, em-lyon.com
  'F POITIER12': 'IRTS Poitou-Charentes', // ARFISS, irts-poitou-charentes.org
  'F BESANCO14': 'ISBA Besançon', // I.S.B.A. — Institut Supérieur des Beaux-Arts
}

// Réunion is a French overseas region; the API tags it 'RE' but its Erasmus
// codes are French and the app's country list treats it as France.
const COUNTRY_REMAP = { RE: 'FR' }

// Lowercased inside a name (never as the first word).
const SMALL_WORDS = new Set([
  'de', 'du', 'des', 'del', 'della', 'di', 'da', 'do', 'dos', 'das', 'e', 'y',
  'i', 'of', 'and', 'the', 'van', 'von', 'der', 'den', 'ter', 'ten', 'aan',
  'zur', 'zum', 'für', 'in', 'at', 'on', 'la', 'le', 'les', 'el', 'lo', 'a',
  'o', 'u', 'à',
])

/** Canonical Erasmus code: strip anything that isn't a letter/digit/space
 *  (a handful of source rows are wrapped in literal quote characters),
 *  uppercase, collapse internal whitespace, trim. Does NOT require a space —
 *  Ireland and Luxembourg use an unspaced 3-letter prefix (IRLDUBLIN01,
 *  LUXDIEKIRC01). Must contain a letter and a digit to be a real code. */
function canonCode(raw) {
  const c = (raw || '')
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
  return /[A-Z]/.test(c) && /[0-9]/.test(c) ? c : ''
}

/** Title-case ONLY all-caps names; leave already-mixed-case names untouched so
 *  the source's nicely-entered (and accented) names survive verbatim. */
function displayName(legal) {
  const s = (legal || '').trim()
  if (!s) return s
  // Has any lowercase letter → already human-cased; keep as-is.
  if (/\p{Ll}/u.test(s)) return s
  const cased = s
    .toLowerCase()
    .replace(/([\p{L}])([\p{L}'’.-]*)/gu, (_m, first, rest) => first.toUpperCase() + rest)
  // Re-lower the small connector words unless they lead the name.
  return cased
    .split(' ')
    .map((w, i) => (i > 0 && SMALL_WORDS.has(w.toLowerCase()) ? w.toLowerCase() : w))
    .join(' ')
}

/** Tidy a display name that carried the full legal name. In order, for names
 *  longer than 60 chars only:
 *    1. a leading quoted trading name  -> that trade name
 *    2. a clear " - " / " / " / " | " separator -> the part before it (splits a
 *       trade name from a legal-form suffix, or a bilingual "native / English")
 *  then always strip stray quote characters and collapse whitespace.
 *
 *  Deliberately NOT comma-splitting: in many names the comma joins parts of ONE
 *  name (e.g. "Universitatea de Medicina, Farmacie, Stiinte..."), so truncating
 *  at the first comma produces a WRONG name. legal_name keeps the full original.
 */
function cleanupName(name) {
  let s = (name || '').trim()
  if (s.length > 60) {
    const lead = s.match(/^["“”«»]([^"“”«»]{3,})["“”«»]/)
    if (lead) s = lead[1]
    else {
      const sep = s.match(/^(.{8,}?)\s[-/|–]\s/)
      if (sep && sep[1].trim().length >= 8) s = sep[1]
    }
  }
  return s.replace(/["“”«»]/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeWebsite(url) {
  const s = (url || '').trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  return `https://${s}`
}

function sqlStr(v) {
  if (v === null || v === undefined || v === '') return 'null'
  return `'${String(v).replace(/'/g, "''")}'`
}

async function main() {
  process.stdout.write(`Fetching ${API_URL} …\n`)
  const res = await fetch(API_URL, {
    headers: { 'User-Agent': 'BipHub catalog import (team@hexonasystems.com)' },
  })
  if (!res.ok) throw new Error(`ECHE API returned HTTP ${res.status}`)
  const raw = await res.json()
  process.stdout.write(`  ${raw.length} raw records\n`)

  const seen = new Set()
  const rows = []
  let skippedBlank = 0
  let skippedDup = 0
  for (const r of raw) {
    const code = canonCode(r.erasmusCodeNormalized || r.erasmusCode)
    if (!code) {
      skippedBlank++
      continue
    }
    if (seen.has(code)) {
      skippedDup++
      continue
    }
    seen.add(code)
    const country = COUNTRY_REMAP[r.countryCodeIso] || r.countryCodeIso || r.country
    rows.push({
      name: CURATED_NAMES[code] || cleanupName(displayName(r.organisationLegalName)),
      legal_name: (r.organisationLegalName || '').trim() || null,
      country,
      city: displayName(r.city) || null,
      erasmus_code: code,
      oid: (r.oid || '').trim() || null,
      website_url: normalizeWebsite(r.webpage),
      eche_end_date: (r.echeEndDate || '').trim() || null,
    })
  }
  rows.sort((a, b) => a.erasmus_code.localeCompare(b.erasmus_code))
  process.stdout.write(
    `  ${rows.length} clean rows (skipped ${skippedBlank} blank-code, ${skippedDup} duplicate)\n`,
  )

  mkdirSync(dirname(OUT_JSON), { recursive: true })
  writeFileSync(OUT_JSON, JSON.stringify(rows, null, 2) + '\n')
  process.stdout.write(`  wrote ${OUT_JSON}\n`)

  // ── Generate the migration ────────────────────────────────────────────────
  const cols =
    '(name, legal_name, country, city, erasmus_code, oid, website_url, eche_end_date, source)'
  const conflictUpdate = [
    'name = excluded.name',
    'legal_name = excluded.legal_name',
    'country = excluded.country',
    'city = excluded.city',
    'oid = excluded.oid',
    'website_url = excluded.website_url',
    'eche_end_date = excluded.eche_end_date',
    "source = 'eche'",
  ].join(',\n      ')

  const chunks = []
  for (let i = 0; i < rows.length; i += ROWS_PER_INSERT) {
    const batch = rows.slice(i, i + ROWS_PER_INSERT)
    const values = batch
      .map(
        (r) =>
          `  (${sqlStr(r.name)}, ${sqlStr(r.legal_name)}, ${sqlStr(r.country)}, ` +
          `${sqlStr(r.city)}, ${sqlStr(r.erasmus_code)}, ${sqlStr(r.oid)}, ` +
          `${sqlStr(r.website_url)}, ${sqlStr(r.eche_end_date)}, 'eche')`,
      )
      .join(',\n')
    chunks.push(
      `insert into public.universities\n  ${cols}\nvalues\n${values}\n` +
        `on conflict (erasmus_code) do update set\n      ${conflictUpdate};`,
    )
  }

  const header = `-- 00035_eche_catalog.sql
-- GENERATED by scripts/fetch-eche.mjs — do not edit by hand; re-run the script.
--
-- Full catalog of institutions holding an Erasmus Charter for Higher Education,
-- from the ECHE List API (europeanuniversityfoundation/eche-api), which
-- republishes the European Commission's accredited-HEIs list.
--
-- ${rows.length} institutions. Idempotent: upsert keyed on the canonical
-- Erasmus code (uppercase, single-spaced), so re-running never duplicates and
-- never deletes an FK-referenced row. Requires 00034 (adds the columns +
-- source default). Curated display names for well-known universities are baked
-- in by the generator so they read naturally.
`
  writeFileSync(OUT_SQL, header + '\n' + chunks.join('\n\n') + '\n')
  process.stdout.write(`  wrote ${OUT_SQL} (${chunks.length} batches)\n`)
  process.stdout.write('Done.\n')
}

main().catch((err) => {
  process.stderr.write(`FAILED: ${err.stack || err}\n`)
  process.exit(1)
})
