import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { searchUniversitiesAction } from '@/lib/actions/universities'
import { BipSubmissionWizard } from '@/components/forms/BipSubmissionWizard'
import { WizardStep5Preview } from '@/components/forms/steps/WizardStep5Preview'

/**
 * /admin/bips/new — Admin Add BIP (v1.3).
 *
 * Reuses the coordinator wizard (BipSubmissionWizard) but runs inside the
 * (admin) route group so the admin layout/sidebar chrome is kept.
 * The wizard already allows admin via lib/actions/bip-submit (role check
 * allows coordinator|admin), so no new Server Action is needed.
 * The admin's host university is resolved from profiles → universities
 * exactly like the coordinator flow; if the admin has no university
 * (common for bootstrapped admins) we fall back to the first university
 * so the wizard can still render Step 3.
 */
export const dynamic = 'force-dynamic'

export default async function AdminNewBipPage() {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (!claims?.sub) notFound()

  // Try admin's own university first
  const { data: profile } = await supabase
    .from('profiles')
    .select('university_id, university:university_id ( id, name, country, erasmus_code )')
    .eq('id', claims.sub)
    .maybeSingle()

  let host = null as unknown as { id: string; name: string; country: string; erasmus_code: string | null } | null
  const rel = (profile as unknown as { university?: unknown })?.university
  host = Array.isArray(rel) ? (rel[0] as typeof host) ?? null : (rel as typeof host) ?? null

  // Fallback: first university alphabetically so admin without a home uni can still add
  if (!host) {
    const { data: fallback } = await supabase
      .from('universities')
      .select('id, name, country, erasmus_code')
      .order('name', { ascending: true })
      .limit(1)
      .maybeSingle()
    host = (fallback as typeof host) ?? null
  }

  if (!host) notFound()

  const initialUniversities = await searchUniversitiesAction('')

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-6">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-ink">Add new BIP</h1>
        <p className="text-sm text-muted">Create a Blended Intensive Programme directly as admin. It will be saved as your draft and follow the normal review flow.</p>
      </div>
      <section className="py-2">
        <BipSubmissionWizard
          hostUniversity={host}
          initialUniversities={initialUniversities}
          previewStep={<WizardStep5Preview hostUniversity={host} />}
        />
      </section>
    </div>
  )
}
