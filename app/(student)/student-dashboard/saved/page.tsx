import { Metadata } from 'next'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { BipGrid } from '@/components/bip/BipGrid'
import { getSavedBips } from '@/lib/queries/savedBips'

/**
 * /student-dashboard/saved — Saved BIPs list page (STUD-07 / D-03).
 *
 * Reuses BipGrid with all cards pre-set to saved state (isStudent=true, full
 * Set of saved IDs). BIPs are ordered most-recently-saved first (getSavedBips
 * uses ORDER BY saved_at DESC). Non-approved BIPs are silently excluded by the
 * query layer (D-03a).
 *
 * The (student)/layout.tsx already enforces auth + role — this is a content
 * read only; no redirect needed here (mirrors student-dashboard/page.tsx).
 *
 * Empty state: Heart icon + "No saved BIPs yet" heading + body + CTA (UI-SPEC Surface 3).
 * Count label: shown above the grid if saved.length > 50 (D-03b).
 */

export const metadata: Metadata = {
  title: 'Saved BIPs · BipHub',
}

export default async function SavedBipsPage() {
  const supabase = await createClient()

  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims
  const userId = typeof claims?.sub === 'string' ? claims.sub : null

  const saved = userId ? await getSavedBips(userId) : []

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.3px] text-ink">Saved BIPs</h1>
        <p className="mt-1 text-sm text-muted">Sorted by most recently saved</p>
      </div>

      {saved.length === 0 ? (
        /* Empty state (UI-SPEC Surface 3) */
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Heart className="text-muted" size={48} aria-hidden="true" />
          <h2 className="text-base font-semibold text-ink">No saved BIPs yet</h2>
          <p className="text-sm text-muted max-w-[360px] leading-relaxed">
            Discover Erasmus+ programmes that match your interests and save the ones you want to
            explore further.
          </p>
          <Button asChild variant="primary">
            <Link href="/bips">Browse BIPs →</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Count label shown when > 50 saved (D-03b / UI-SPEC line 157) */}
          {saved.length > 50 && (
            <p className="text-sm text-muted">Showing all {saved.length} saved BIPs</p>
          )}
          <BipGrid bips={saved} />
        </>
      )}
    </div>
  )
}
