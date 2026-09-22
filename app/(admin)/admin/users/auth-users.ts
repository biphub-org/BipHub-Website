/**
 * Admin auth-record lookups (admin directory display enrichment).
 *
 * Lives under app/(admin)/ because it uses the service-role client
 * (`auth.admin.getUserById` / `listUsers` read auth.users, which no RLS
 * policy exposes). Importing createAdminClient anywhere else is an eslint
 * error (CLAUDE.md never-do; PITFALLS Pitfall 7).
 *
 * Purpose: unverified users have bare profiles rows (handle_new_user, 00015)
 * — their signup name lives only in user_metadata until verification
 * backfills it. These helpers let admin pages render those users named
 * (with an "Unverified" badge via resolveAdminUserDisplay) instead of
 * "Unnamed ...".
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { extractAuthDisplayFields, type AdminUserAuthDisplay } from '@/lib/auth/admin-user-display'

export type AuthUserInfo = AdminUserAuthDisplay & { id: string }

type RawAuthUser = {
  id: string
  email?: string | null
  email_confirmed_at?: string | null
  user_metadata?: Record<string, unknown> | null
}

function toBaseInfo(user: RawAuthUser): AuthUserInfo & { universityId: string | null } {
  const fields = extractAuthDisplayFields(user.user_metadata)
  return {
    id: user.id,
    name: fields.name,
    email: user.email ?? null,
    emailConfirmedAt: user.email_confirmed_at ?? null,
    country: fields.country,
    university: null,
    universityId: fields.universityId,
  }
}

type AdminClient = ReturnType<typeof createAdminClient>

type BaseInfo = AdminUserAuthDisplay & { id: string; universityId: string | null }

/** Resolve metadata university_ids to university rows in one query. */
async function withUniversities(admin: AdminClient, bases: BaseInfo[]): Promise<AuthUserInfo[]> {
  const ids = [...new Set(bases.map((b) => b.universityId).filter((v): v is string => !!v))]
  const byId = new Map<string, { id: string; name: string; country: string }>()
  if (ids.length > 0) {
    const { data, error } = await admin
      .from('universities')
      .select('id, name, country')
      .in('id', ids)
    if (error) {
      console.error('[auth-users] universities error:', error.message)
    } else {
      for (const u of data ?? []) byId.set(u.id, { id: u.id, name: u.name, country: u.country })
    }
  }
  return bases.map(({ universityId, ...rest }) => ({
    ...rest,
    university: universityId ? (byId.get(universityId) ?? null) : null,
  }))
}

/** Single auth record for an admin detail page. Null when not found. */
export async function getAuthUserInfo(userId: string): Promise<AuthUserInfo | null> {
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error || !data?.user) return null
  const [info] = await withUniversities(admin, [toBaseInfo(data.user)])
  return info ?? null
}

/**
 * Bulk auth records for an admin list page. Paginates `listUsers`
 * (max 1000/page) and stops early once every requested id is found, so
 * the common small-directory case costs a single call. Unknown ids are
 * simply absent from the map — callers fall back to profile data.
 */
export async function getAuthUserInfoMap(ids: string[]): Promise<Map<string, AuthUserInfo>> {
  const bases = new Map<string, BaseInfo>()
  const wanted = new Set(ids)
  if (wanted.size === 0) return new Map()

  const admin = createAdminClient()
  const perPage = 1000
  let page = 1
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error('[getAuthUserInfoMap] listUsers error:', error.message)
      break
    }
    const users = data?.users ?? []
    for (const u of users) {
      if (wanted.has(u.id)) bases.set(u.id, toBaseInfo(u))
    }
    if (bases.size === wanted.size || users.length < perPage) break
    page += 1
  }
  const found = new Map<string, AuthUserInfo>()
  for (const info of await withUniversities(admin, [...bases.values()])) {
    found.set(info.id, info)
  }
  return found
}
