/**
 * Admin user-display resolution — pure helper shared by the admin
 * directory pages/cards and its unit test.
 *
 * Problem: `handle_new_user` (00015) creates a bare profiles row at signup
 * (id + role only). The signup-provided name travels in
 * `auth.users.raw_user_meta_data` and is only materialised into profiles
 * after email verification (callback backfill / first-sign-in backfill).
 * Until then the admin UI rendered these users as "Unnamed ...".
 *
 * Rule: a user with no profile name falls back to the auth-record name;
 * anyone whose email is unconfirmed is labelled unverified — named, not
 * unnamed. The 'Unnamed ...' fallback survives only for genuinely bare
 * rows (legacy / admin-created, no name anywhere).
 */

export type AdminUserKind = 'student' | 'coordinator'

/**
 * Auth-record display data for one user (client-safe: no server imports).
 * Produced by the admin-only lookups in app/(admin)/admin/users/auth-users.ts
 * and consumed by admin cards/detail pages as fallback for bare profiles.
 */
export type AdminUserAuthDisplay = {
  name: string | null
  email: string | null
  emailConfirmedAt: string | null
  /** `country` (ISO code) from user_metadata; null when absent. */
  country: string | null
  /** University resolved from metadata `university_id`; null when absent/unknown. */
  university: { id: string; name: string; country: string } | null
}

/**
 * Lenient per-field extraction of display data from an auth user's
 * user_metadata (signup details). Unlike parseStudentProfileMetadata
 * (which requires a complete set for backfill), each field stands alone:
 * a name with no country must still display. Pure — unit-tested.
 */
export function extractAuthDisplayFields(
  metadata: Record<string, unknown> | null | undefined,
): { name: string | null; country: string | null; universityId: string | null } {
  const clean = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  if (!metadata || typeof metadata !== 'object') {
    return { name: null, country: null, universityId: null }
  }
  return {
    name: clean(metadata['full_name']),
    country: clean(metadata['country']),
    universityId: clean(metadata['university_id']),
  }
}

export function resolveAdminUserDisplay(args: {
  kind: AdminUserKind
  profileName: string | null | undefined
  /** `full_name` from the auth user's user_metadata (signup details). */
  authName: string | null | undefined
  /** `email_confirmed_at` from the auth user; null = not yet verified. */
  emailConfirmedAt: string | null | undefined
}): { name: string; unverified: boolean } {
  const { kind, profileName, authName, emailConfirmedAt } = args
  const clean = (v: string | null | undefined) => v?.trim() || null
  const name = clean(profileName) ?? clean(authName) ?? `Unnamed ${kind}`
  return { name, unverified: !emailConfirmedAt }
}
