/**
 * scripts/seed-cloud-e2e.mjs — intentionally disabled.
 * All E2E fixtures (@biphub.test users + fixture BIPs) have been removed per user request.
 * This script now only performs cleanup of any legacy fixtures.
 * To restore, use: git show HEAD:scripts/seed-cloud-e2e.mjs
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

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
console.log(`Cleaning legacy fixtures on ${URL}`)

const sb = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { WebSocket: ws },
  realtime: { transport: ws },
})

const FIXTURE_SLUGS = [
  'e2e-pending-machine-learning',
  'e2e-pending-data-ethics',
  'e2e-rejected-urban-design',
  'e2e-withdraw-target',
  'e2e-request-changes-target',
  'e2e-edit-target-bip',
  'e2e-edition-copy',
]

async function main() {
  await sb.from('bips').delete().in('slug', FIXTURE_SLUGS)
  const { data: list, error: listErr } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listErr) throw listErr
  const stale = list.users.filter((u) => (u.email ?? '').endsWith('@biphub.test'))
  for (const u of stale) {
    await sb.from('bips').delete().eq('created_by', u.id)
    await sb.auth.admin.deleteUser(u.id)
  }
  console.log(`Cleanup: removed ${stale.length} stale @biphub.test user(s) + fixture BIPs. No new fixtures created (seed removed).`)
}

void main().catch((e) => { console.error(e); process.exit(1) })
