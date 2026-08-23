import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Toaster } from '@/components/ui/sonner'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminSelectionProvider } from '@/components/admin/AdminSelectionContext'
import { AdminTopBar } from '@/components/admin/AdminTopBar'

/**
 * Admin route-group layout (ADMN-01 / 03-RESEARCH.md Pattern 1).
 *
 * Layer 2 of the triple-layer admin guard:
 *   - Layer 1: middleware.ts (/admin/* gate) — blocks unauthenticated + non-admin
 *     at the edge.
 *   - Layer 2 (this file): RSC re-checks `app_metadata.role === 'admin'`. Defense
 *     in depth against middleware misconfiguration or matcher gaps.
 *   - Layer 3: RLS — `bips_select_own_or_approved` admin clause + Plan 03-01
 *     `bsh_select_own_or_admin` policy. Even if both prior layers fail, the
 *     admin's queries return no privileged data unless the JWT carries the
 *     admin claim.
 *
 * Auth: getClaims() validates JWT signature (CLAUDE.md compliance — the
 * unvalidated session reader is forbidden server-side).
 *
 * Admin accounts are bootstrapped via SQL (03-CONTEXT.md Specifics), so no
 * profile-complete gate is needed — admin profiles skip onboarding.
 *
 * Chrome (03-UI-SPEC.md Sidebar Chrome Contract D-16):
 *   - AdminSidebar: 240px sticky left column on desktop, Sheet drawer on mobile.
 *   - EC disclaimer footer (CLAUDE.md never-do compliance).
 *   - Toaster scoped to the route group.
 *
 * Top bar: single Export + Add new BIP across ALL admin subpages (no per-page duplicates).
 * Selection state is provided via AdminSelectionProvider so the global Export menu
 * can show "Export selected (N)" when rows are selected on queue / All BIPs.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // (1) Auth guard — re-checked from middleware for defense in depth.
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) redirect('/login')
  const claims = data.claims

  // (2) Role guard — middleware (layer 1) already blocks non-admins, but this
  // RSC check defends against edge-case routing or middleware misconfig.
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role !== 'admin') redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, contact_email')
    .eq('id', claims.sub)
    .maybeSingle()

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
    <div className="min-h-screen bg-bg-soft flex">
      <AdminSidebar
        initials={initials}
        fullName={profile?.full_name ?? ''}
        email={
          profile?.contact_email ??
          (typeof claims.email === 'string' ? claims.email : '')
        }
      />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminSelectionProvider>
          <AdminTopBar />
          <main className="flex-1">{children}</main>
        </AdminSelectionProvider>
        <p className="px-6 py-4 text-[11px] text-muted">
          Independent project — not affiliated with the European Commission
        </p>
      </div>
      <Toaster position="bottom-right" richColors={false} closeButton />
    </div>
  )
}
