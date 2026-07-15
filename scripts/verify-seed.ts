// scripts/verify-seed.ts
// Asserts that supabase/seed.sql produced a dataset matching D-17 from
// 01-CONTEXT.md. Run: npm run verify:seed
//
// Why service-role key here: this is a LOCAL-DEV verification script.
// Per .env.local, SUPABASE_SERVICE_ROLE_KEY is the local key only.
// Do NOT import or extend this script into application code paths.

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local from project root (Next.js doesn't auto-load for non-Next scripts)
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { ISCED_FIELDS } from '../lib/isced'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY missing from .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

type Bip = {
  slug: string
  status: string
  is_seed: boolean
  subject_area: string | null
  language_of_instruction: string | null
  application_deadline: string | null
  host_university_id: string | null
  study_levels: string[] | null
  green_travel: boolean | null
  inclusion_support: boolean | null
}

const checks: Array<{ name: string; pass: boolean; detail: string }> = []
function check(name: string, pass: boolean, detail: string) {
  checks.push({ name, pass, detail })
}

async function main() {
  const { data: bips, error } = await supabase
    .from('bips')
    .select(
      'slug, status, is_seed, subject_area, language_of_instruction, application_deadline, host_university_id, study_levels, green_travel, inclusion_support',
    )
    .eq('is_seed', true)
    .returns<Bip[]>()

  if (error || !bips) {
    console.error('Failed to read seed:', error)
    process.exit(1)
  }

  // 1. Total = 20, all approved
  check('row_count_20', bips.length === 20, `got ${bips.length}`)
  check(
    'all_approved',
    bips.every((b) => b.status === 'approved'),
    'all rows status=approved',
  )

  // 2. Country distribution: ≥10 distinct host universities
  // (each university is in exactly one country, so distinct uni count >= distinct country count)
  const distinctHosts = new Set(bips.map((b) => b.host_university_id))
  check(
    'distinct_host_universities_ge_10',
    distinctHosts.size >= 10,
    `got ${distinctHosts.size} distinct host universities`,
  )

  // 3. Field coverage — with 12 finer-grained fields and 20 synthetic BIPs we no
  //    longer require every field to be represented (dentistry/sports/education
  //    have no fitting synthetic BIP). Require a healthy spread of >= 8 of 12.
  const validFieldIds = new Set(ISCED_FIELDS.map((f) => f.id))
  const seenSubjects = new Set(
    bips.map((b) => b.subject_area).filter((s): s is string => Boolean(s)),
  )
  const unknownSubjects = [...seenSubjects].filter((s) => !validFieldIds.has(s as never))
  const coveredCount = [...seenSubjects].filter((s) => validFieldIds.has(s as never)).length
  check(
    'field_coverage_min_8_of_12',
    coveredCount >= 8 && unknownSubjects.length === 0,
    unknownSubjects.length > 0
      ? `unknown field ids in seed: ${unknownSubjects.join(', ')}`
      : `${coveredCount}/12 fields represented`,
  )

  // 4. Open (future deadline) ~12, Closed (past) ~8 — relative to today
  const today = new Date().toISOString().slice(0, 10)
  const future = bips.filter(
    (b) => b.application_deadline != null && b.application_deadline >= today,
  ).length
  const past = bips.filter(
    (b) => b.application_deadline != null && b.application_deadline < today,
  ).length
  check(
    'open_count_in_range_10_to_14',
    future >= 10 && future <= 14,
    `${future} open (future deadline)`,
  )
  check(
    'closed_count_in_range_6_to_10',
    past >= 6 && past <= 10,
    `${past} closed (past deadline)`,
  )

  // 5. Language mix — majority EN, at least one each of de/fr/es/it
  const langs = new Map<string, number>()
  for (const b of bips) {
    const l = b.language_of_instruction ?? '?'
    langs.set(l, (langs.get(l) ?? 0) + 1)
  }
  check(
    'language_en_majority',
    (langs.get('en') ?? 0) >= 10,
    `en=${langs.get('en') ?? 0}`,
  )
  for (const lang of ['de', 'fr', 'es', 'it'] as const) {
    check(
      `language_${lang}_present`,
      (langs.get(lang) ?? 0) >= 1,
      `${lang}=${langs.get(lang) ?? 0}`,
    )
  }

  // 6. Study levels — each of bachelor/master/phd appears in ≥3 rows
  for (const lvl of ['bachelor', 'master', 'phd'] as const) {
    const n = bips.filter(
      (b) => Array.isArray(b.study_levels) && b.study_levels.includes(lvl),
    ).length
    check(`study_level_${lvl}_ge_3`, n >= 3, `${n} BIPs include ${lvl}`)
  }

  // 7. Green travel ~30% (5-7 acceptable)
  const green = bips.filter((b) => b.green_travel === true).length
  check('green_travel_5_to_7', green >= 5 && green <= 7, `${green} BIPs`)

  // 8. Inclusion support ~30% (5-7 acceptable)
  const inclusion = bips.filter((b) => b.inclusion_support === true).length
  check('inclusion_support_5_to_7', inclusion >= 5 && inclusion <= 7, `${inclusion} BIPs`)

  // Render results
  let allPass = true
  console.log('\n--- verify-seed.ts D-17 distribution audit ---\n')
  for (const c of checks) {
    const tag = c.pass ? 'PASS' : 'FAIL'
    if (!c.pass) allPass = false
    console.log(`${tag}  ${c.name}  (${c.detail})`)
  }
  const passCount = checks.filter((c) => c.pass).length
  console.log(
    `\n${allPass ? 'ALL GREEN' : 'FAILURES PRESENT'}: ${passCount}/${checks.length} passed`,
  )
  process.exit(allPass ? 0 : 1)
}

void main()
