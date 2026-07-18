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
  // Dedicated pending fixtures so the withdraw + request-changes specs never
  // scavenge shared cards (BUG-002). Kept in sync with supabase/seed.e2e.sql.
  'e2e-withdraw-target',
  'e2e-request-changes-target',
  // Approved BIP the bip-edits spec drives through the edit wizard.
  'e2e-edit-target-bip',
]

const USERS = {
  coordinator: { email: 'e2e-coordinator@biphub.test', password: 'Coordinator!Test1', app_metadata: {} },
  coordinatorFresh: { email: 'e2e-coordinator-fresh@biphub.test', password: 'Fresh!Test1', app_metadata: {} },
  admin: { email: 'e2e-admin@biphub.test', password: 'Admin!Test1', app_metadata: { role: 'admin' } },
  // Phase 5 student fixture. student-auth.spec.ts + saved-bips.spec.ts sign in
  // with this password (grant_type=password); role=student drives the JWT hook.
  student: { email: 'e2e-student@biphub.test', password: 'Student!Test1', app_metadata: { role: 'student' } },
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
      // Student profile: NO university_id / erasmus_code / full_name (D-08).
      // handle_new_user may have already created this row; upsert keeps role=student.
      {
        id: ids.student,
        role: 'student',
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
    // NOT NULL DEFAULT false (migration 00003) — PostgREST's bulk JSON->row
    // insert treats a key ABSENT from one object in a heterogeneous batch as
    // an explicit NULL for that row, not "use the column default". Every
    // fixture must therefore set this explicitly; the edit-target-bip entry
    // below overrides it to `true`. (Rule 3 fix — this NOT NULL violation
    // blocked the entire cloud fixture seed, discovered running Plan 09-09.)
    partner_institutions_only: false,
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
      subject_area: 'it-engineering',
      isced_f_code: 'it-engineering',
      subject_areas: ['it-engineering'],
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
      subject_area: 'social-sciences',
      isced_f_code: 'social-sciences',
      subject_areas: ['social-sciences'],
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
      subject_area: 'architecture',
      isced_f_code: 'architecture',
      subject_areas: ['architecture'],
      study_levels: ['master'],
      how_to_apply_value: 'https://tum.example/apply',
    },
    {
      // BUG-002: dedicated pending fixture the submission spec withdraws, so it
      // never disturbs the admin-review fixtures. Matched by exact title.
      ...baseBip,
      id: 'e2e0bbbb-bbbb-bbbb-bbbb-000000000004',
      slug: 'e2e-withdraw-target',
      title: 'E2E Withdraw Target',
      status: 'pending',
      description:
        'A 10-day BIP fixture that exists solely so the submission spec can withdraw a pending BIP it owns without disturbing the admin-review fixtures. Covers nothing of substance beyond satisfying the renderable-detail column set.',
      learning_outcomes:
        '- Placeholder outcome one for the withdraw-target fixture\n- Placeholder outcome two\n- Placeholder outcome three',
      virtual_component_description:
        'Two short online sessions before the mobility week (fixture content only).',
      physical_start_date: '2027-07-10',
      physical_end_date: '2027-07-20',
      application_deadline: '2027-05-01',
      max_participants: 20,
      subject_area: 'computer-science',
      isced_f_code: '0613',
      subject_areas: ['computer-science'],
      study_levels: ['bachelor'],
      how_to_apply_value: 'https://tum.example/withdraw-target/apply',
    },
    {
      // BUG-002: dedicated NEW pending submission for the bip-edits admin
      // "request changes on new submission" test. Matched by exact title.
      ...baseBip,
      id: 'e2e0bbbb-bbbb-bbbb-bbbb-000000000005',
      slug: 'e2e-request-changes-target',
      title: 'E2E Request Changes Target',
      status: 'pending',
      description:
        'A 10-day BIP fixture that exists solely as a NEW pending submission for the bip-edits admin "request changes on new submission" test, so it never has to scavenge a leftover admin-review card. Renderable-detail column set only.',
      learning_outcomes:
        '- Placeholder outcome one for the request-changes-target fixture\n- Placeholder outcome two\n- Placeholder outcome three',
      virtual_component_description:
        'Two short online sessions before the mobility week (fixture content only).',
      physical_start_date: '2027-08-10',
      physical_end_date: '2027-08-20',
      application_deadline: '2027-06-01',
      max_participants: 20,
      subject_area: 'computer-science',
      isced_f_code: '0613',
      subject_areas: ['computer-science'],
      study_levels: ['bachelor'],
      how_to_apply_value: 'https://tum.example/request-changes-target/apply',
    },
    {
      // Approved BIP for the edit-flow tests (BUG-001). The spec drives the edit
      // wizard against this row; EDIT-01 creates the pending bip_edits row itself,
      // so it must start with NO open edit (State A). Multi-field subject_areas
      // exercise cross-disciplinary edit diffs.
      //
      // Plan 09-08 / FOUN-14: all four builder-completion fields carry
      // NON-DEFAULT values here on purpose — kept IDENTICAL to supabase/seed.e2e.sql
      // so Plan 09-09's per-field edit->approve->persist round-trip specs have a
      // starting value to change for each field, in both local and cloud e2e runs.
      ...baseBip,
      id: 'e2e0bbbb-bbbb-bbbb-bbbb-000000000010',
      slug: 'e2e-edit-target-bip',
      title: 'E2E Edit Target BIP',
      status: 'approved',
      description:
        'A 10-day BIP on sustainable materials science for engineering students. Covers bio-composites, circular-economy design, and a hands-on lab project fabricating a prototype from recycled feedstock.',
      learning_outcomes:
        '- Select appropriate bio-composite materials for a given engineering constraint\n- Apply circular-economy principles to product lifecycle analysis\n- Fabricate and test a small prototype from recycled feedstock',
      virtual_component_description:
        'Three online pre-mobility workshops covering materials databases, simulation tools, and a group design brief.',
      virtual_sessions_count: 4,
      virtual_duration_notes:
        'Weekly online seminars covering materials databases and simulation tools ahead of the mobility week.',
      physical_start_date: '2027-06-09',
      physical_end_date: '2027-06-19',
      application_deadline: '2027-04-01',
      max_participants: 18,
      subject_area: 'it-engineering',
      isced_f_code: 'it-engineering',
      subject_areas: ['it-engineering', 'arts-design'],
      study_levels: ['bachelor', 'master'],
      accommodation_notes:
        'Dorm rooms reserved at the TUM student residence; confirm dietary needs in advance.',
      partner_institutions_only: true,
      how_to_apply_value: 'https://tum.example/materials/apply',
    },
  ]

  const { error: bipErr } = await sb.from('bips').insert(bips)
  if (bipErr) throw new Error(`bips: ${bipErr.message}`)
  const pendingCount = bips.filter((b) => b.status === 'pending').length
  const rejectedCount = bips.filter((b) => b.status === 'rejected').length
  console.log(`Inserted ${bips.length} fixture BIPs (${pendingCount} pending, ${rejectedCount} rejected)`)

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
