import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Toaster } from '@/components/ui/sonner'
import { DashboardNav } from '@/components/dashboard/DashboardNav'

/**
 * Dashboard route-group layout (AUTH-07 / D-12).
 *
 * Server-side guard:
 *
 *   1. Auth guard — defense-in-depth. Plan 02-03 middleware already redirects
 *      unauthenticated requests to /login, but we re-check here so an attacker
 *      who somehow bypasses the matcher cannot reach a dashboard RSC.
 *      Uses getClaims() (validates JWT signature) — the unvalidated session
 *      reader is forbidden per CLAUDE.md.
 *
 * There is deliberately NO profile-complete gate: coordinators arrive via
 * the access-request flow, which already collects full name, university,
 * country and Erasmus code, and approval backfills the profile — so every
 * coordinator lands on /dashboard with a complete profile. (The old
 * /onboarding form was removed; a backfill failure surfaces as an
 * actionable error at submit time instead of stranding the coordinator
 * on a redundant form.)
 *
 * There IS a password gate (2): clicking the invite link runs verifyOtp,
 * which establishes a full session BEFORE any password is set. Without this
 * check an approved coordinator who never sets a password could use the
 * whole dashboard. current_user_has_password() (migration 00056) reads
 * auth.users.encrypted_password — empty until the first password is set —
 * via SECURITY DEFINER; false bounces to /reset-password/update.
 *
 * Layout chrome (D-12 / INFO-03):
 *   - <DashboardNav>: logo + breadcrumb + initials + Sign out form. RSC.
 *   - INFO-03 disclaimer rendered inline (no public Footer in dashboard).
 *   - Toaster instance scoped to this route group.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // (1) Auth guard.
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) redirect('/login')
  const claims = data.claims
  const role = (claims as unknown as { app_metadata?: { role?: string } })?.app_metadata?.role
  if (role === 'admin') redirect('/admin')

  // (2) Password gate — invite-click sessions are fully authenticated, so
  // coordinators who accepted the invite but never set a password bounce to
  // /reset-password/update until they do. Fail OPEN on RPC error (log +
  // allow): a missing/broken function must never lock every coordinator
  // into a set-password loop they cannot exit.
  const { data: hasPassword, error: pwError } = await supabase.rpc(
    'current_user_has_password',
  )
  if (pwError) {
    console.error('[dashboard layout] password check failed (non-blocking):', pwError.message)
  } else if (hasPassword !== true) {
    redirect('/reset-password/update')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', claims.sub)
    .maybeSingle()

  // Initials derivation: full_name → email local-part → "··" sentinel.
  const fromName = profile?.full_name
    ? profile.full_name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
    : null
  const emailLocal =
    typeof claims.email === 'string' ? claims.email.split('@')[0] : null
  const fromEmail = emailLocal ? emailLocal.slice(0, 2).toUpperCase() : null
  const initials = fromName || fromEmail || '··'

  return (
    <div className="min-h-screen bg-bg-soft">
      <DashboardNav initials={initials} fullName={profile?.full_name ?? ''} />
      <main className="mx-auto max-w-[1200px] px-4 md:px-6">{children}</main>
      <p className="mx-auto max-w-[1200px] px-4 md:px-6 py-8 text-[11px] text-muted">
        Independent project — not affiliated with the European Commission
      </p>
      <Toaster position="bottom-right" richColors={false} closeButton />
    </div>
  )
}
