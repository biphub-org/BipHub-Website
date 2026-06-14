/**
 * scripts/seed-cloud-e2e.mjs — apply the E2E fixtures to a CLOUD Supabase
 * project using the Auth Admin API + service-role inserts.
 *
 * This is the cloud-safe equivalent of `supabase/seed.e2e.sql` (which inserts
 * directly into `auth.users` — a local-only path). Here we create the fixture
 * users through the official admin endpoint and capture their generated IDs,
 * then insert the dependent profiles / BIPs / audit rows with the service-role
 * client (RLS-bypassing).
 *
 * Idempotent: deletes any existing @biphub.test users + the fixture BIP slugs
 * before recreating.
 *
 * Run: node scripts/seed-cloud-e2e.mjs
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// ---- load .env.local -------------------------------------------------------
function loadEnv(path) {
  const out = {}
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const k = line.slice(0, eq).trim()
    let v = line.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    out[k] = v
  }
  return out
}

const env = loadEnv('.env.local')
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}
console.log(`Seeding ${URL}`)

const sb = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const FIXTURE_SLUGS = [
  'e2e-pending-machine-learning',
  'e2e-pending-data-ethics',
  'e2e-rejected-urban-design',
]

const USERS = {
  coordinator: { email: 'e2e-coordinator@biphub.test', password: 'Coordinator!Test1', app_metadata: {} },
  coordinatorFresh: { email: 'e2e-coordinator-fresh@biphub.test', password: 'Fresh!Test1', app_metadata: {} },
  admin: { email: 'e2e-admin@biphub.test', password: 'Admin!Test1', app_metadata: { role: 'admin' } },
}

async function main() {
  // --- Step 0: cleanup -----------------------------------------------------
  await sb.from('bips').delete().in('slug', FIXTURE_SLUGS)
  const { data: list, error: listErr } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listErr) throw listErr
  const stale = list.users.filter((u) => (u.email ?? '').endsWith('@biphub.test'))
  for (const u of stale) {
    await sb.from('bips').delete().eq('created_by', u.id)
    await sb.auth.admin.deleteUser(u.id)
  }
  console.log(`Cleanup: removed ${stale.length} stale @biphub.test user(s) + fixture BIPs`)

  // --- Step 1: create users via admin API ----------------------------------
  const ids = {}
  for (const [key, u] of Object.entries(USERS)) {
    const { data, error } = await sb.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      app_metadata: u.app_metadata,
    })
    if (error) throw new Error(`createUser ${u.email}: ${error.message}`)
    ids[key] = data.user.id
    console.log(`Created ${u.email} -> ${data.user.id}`)
  }

  // --- Step 2: resolve host university (D MUNCHEN02, from demo seed) --------
  const { data: uni, error: uniErr } = await sb
    .from('universities')
    .select('id')
    .eq('erasmus_code', 'D MUNCHEN02')
    .single()
  if (uniErr || !uni) {
    throw new Error(
      "Could not find university 'D MUNCHEN02'. Is the demo seed (supabase/seed.sql) applied to this project?",
    )
  }
  const munichId = uni.id

  // --- Step 3: profiles for coordinator + admin (NOT fresh) ----------------
  const { error: profErr } = await sb.from('profiles').upsert(
    [
      {
        id: ids.coordinator,
        full_name: 'E2E Coordinator',
        contact_email: 'e2e-coordinator@biphub.test',
        university_id: munichId,
        erasmus_code: 'TEST E2E01',
        role: 'coordinator',
      },
      {
        id: ids.admin,
        full_name: 'E2E Admin',
        contact_email: 'e2e-admin@biphub.test',
        university_id: munichId,
        erasmus_code: 'TEST E2E03',
        role: 'admin',
      },
    ],
    { onConflict: 'id' },
  )
  if (profErr) throw new Error(`profiles: ${profErr.message}`)

  // --- Step 4: fixture BIPs ------------------------------------------------
  const baseBip = {
    is_seed: false,
    virtual_timing: 'before',
    host_city: 'Munich',
    ects_credits: 4,
    language_of_instruction: 'en',
    language_level_min: 'B2',
    green_travel: false,
    inclusion_support: false,
    contact_name: 'E2E Coordinator',
    contact_email: 'e2e-coordinator@biphub.test',
    how_to_apply_type: 'url',
    host_university_id: munichId,
    created_by: ids.coordinator,
  }

  const REJECTED_ID = 'e2e0bbbb-bbbb-bbbb-bbbb-000000000003'
  const bips = [
    {
      ...baseBip,
      id: 'e2e0bbbb-bbbb-bbbb-bbbb-000000000001',
      slug: 'e2e-pending-machine-learning',
      title: 'E2E Pending: Machine Learning Foundations',
      status: 'pending',
      description:
        'A 10-day BIP introducing ML foundations for engineering students. Covers supervised learning, linear models, basic neural networks, and a group project predicting urban mobility patterns from open data.',
      learning_outcomes:
        '- Apply supervised learning algorithms to real datasets\n- Evaluate model performance using cross-validation\n- Communicate ML findings to non-specialist audiences',
      virtual_component_description:
        'Four online preparatory sessions (90 min each) covering Python tooling, scikit-learn, and a pre-arrival dataset exercise.',
      physical_start_date: '2026-10-15',
      physical_end_date: '2026-10-25',
      application_deadline: '2026-09-01',
      max_participants: 20,
      subject_area: 'computer-science',
      isced_f_code: '0613',
      study_levels: ['bachelor', 'master'],
      how_to_apply_value: 'https://tu-berlin.example/apply',
    },
    {
      ...baseBip,
      id: 'e2e0bbbb-bbbb-bbbb-bbbb-000000000002',
      slug: 'e2e-pending-data-ethics',
      title: 'E2E Pending: Data Ethics in Practice',
      status: 'pending',
      description:
        'A 10-day BIP exploring practical data ethics for emerging engineers and researchers — algorithmic bias, GDPR compliance, and ethical impact assessments.',
      learning_outcomes:
        '- Apply ethical-review frameworks to AI/ML deployments\n- Critically analyse GDPR consent flows\n- Draft a Data Protection Impact Assessment',
      virtual_component_description:
        'Three online seminars covering ethics frameworks and pre-arrival readings.',
      physical_start_date: '2027-03-10',
      physical_end_date: '2027-03-20',
      application_deadline: '2027-01-15',
      max_participants: 18,
      subject_area: 'social-science',
      isced_f_code: '0421',
      study_levels: ['master', 'phd'],
      how_to_apply_value: 'https://kuleuven.example/apply',
    },
    {
      ...baseBip,
      id: REJECTED_ID,
      slug: 'e2e-rejected-urban-design',
      title: 'E2E Rejected: Urban Design Studio',
      status: 'rejected',
      description:
        'A 10-day BIP on sustainable urban design — public space, mobility, and climate-adaptive planning, with a collaborative studio project on a real district brief.',
      learning_outcomes:
        '- Produce a climate-adaptive district masterplan\n- Apply participatory design methods\n- Present proposals to a mixed stakeholder panel',
      virtual_component_description:
        'Two online kickoff sessions covering the brief and site analysis.',
      physical_start_date: '2027-05-12',
      physical_end_date: '2027-05-22',
      application_deadline: '2027-03-20',
      max_participants: 16,
      subject_area: 'engineering',
      isced_f_code: '0731',
      study_levels: ['master'],
      how_to_apply_value: 'https://tum.example/apply',
    },
  ]

  const { error: bipErr } = await sb.from('bips').insert(bips)
  if (bipErr) throw new Error(`bips: ${bipErr.message}`)
  console.log(`Inserted ${bips.length} fixture BIPs (2 pending, 1 rejected)`)

  // --- Step 5: explicit reject audit row for the rejected BIP --------------
  const { error: bshErr } = await sb.from('bip_status_history').insert({
    bip_id: REJECTED_ID,
    from_status: 'pending',
    to_status: 'rejected',
    actor_id: ids.admin,
    note: 'The virtual component needs at least three structured online sessions before the mobility week.',
    action_kind: 'reject',
  })
  if (bshErr) throw new Error(`bip_status_history: ${bshErr.message}`)

  console.log('\n✅ Cloud E2E fixtures seeded successfully.')
}

main().catch((err) => {
  console.error('\n❌ Seed failed:', err.message)
  process.exit(1)
})
