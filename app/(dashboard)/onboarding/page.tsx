import { OnboardingForm } from '@/components/dashboard/OnboardingForm'
import { searchUniversitiesAction } from '@/lib/actions/universities'
import { createClient } from '@/lib/supabase/server'

/**
 * /onboarding RSC shell (AUTH-07).
 *
 * Pre-fetches:
 *   - The signed-in coordinator's email (for the contact_email default).
 *   - The alphabetical top-50 universities list (so the combobox shows useful
 *     prefill before the user types).
 *
 * The (dashboard)/layout.tsx auth guard runs before this page renders, so we
 * can rely on a valid session here. The profile-complete gate intentionally
 * exempts /onboarding (otherwise it would redirect us in a loop).
 */
export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const initialEmail =
    typeof data?.claims?.email === 'string' ? data.claims.email : ''

  const initialUniversities = await searchUniversitiesAction('')

  return (
    <section className="bg-white rounded-md shadow-md p-10 max-w-[560px] mx-auto my-12">
      <header className="mb-6">
        <h1 className="text-[22px] font-semibold text-ink">
          Complete your profile
        </h1>
        <p className="mt-2 text-sm text-muted">
          Before you can submit a BIP, we need a few details about you and your
          university.
        </p>
      </header>
      <OnboardingForm
        initialEmail={initialEmail}
        initialUniversities={initialUniversities}
      />
    </section>
  )
}
