/**
 * /dashboard/bips/new — New BIP entry route (DASH-06).
 *
 * Async RSC that:
 *   1. Confirms an authenticated session (the (dashboard) layout already
 *      gates this, but we re-check defensively before calling notFound).
 *   2. Resolves the coordinator's host university from `profiles → universities`
 *      — the wizard requires a non-null host triple to render Step 3 and to
 *      build the preview adapter context.
 *   3. Pre-fetches `initialUniversities` (top-50 alphabetical) so Step 3's
 *      combobox can render without a roundtrip on first open.
 *   4. Mounts `<BipSubmissionWizard>` with no `initialBip` (new mode) and the
 *      Step 5 preview element passed via the `previewStep` slot.
 *
 * Auth: uses `getClaims()` exclusively — never the unvalidated session reader
 * server-side (CLAUDE.md never-do).
 */
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { searchUniversitiesAction } from '@/lib/actions/universities'
import { BipSubmissionWizard } from '@/components/forms/BipSubmissionWizard'
import { WizardStep5Preview } from '@/components/forms/steps/WizardStep5Preview'

export default async function NewBipPage() {
  const supabase = await createClient()

  // Defense-in-depth — the (dashboard) layout already gates with getClaims +
  // profile-complete check, but we re-verify here to keep this page
  // self-contained and to avoid TS narrowing on `claims.sub` later on.
  const { data: authData } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (!claims?.sub) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('university_id, university:university_id ( id, name, country, erasmus_code )')
    .eq('id', claims.sub)
    .maybeSingle()

  const hostRel = profile?.university ?? null
  const host = Array.isArray(hostRel) ? (hostRel[0] ?? null) : hostRel

  // The (dashboard) layout's profile-complete gate already redirects to
  // /onboarding when university_id is missing. notFound() is a defensive
  // fallback if the gate is loosened in the future.
  if (!host) notFound()

  const initialUniversities = await searchUniversitiesAction('')

  return (
    <section className="py-6">
      <BipSubmissionWizard
        hostUniversity={host}
        initialUniversities={initialUniversities}
        previewStep={<WizardStep5Preview hostUniversity={host} />}
      />
    </section>
  )
}
