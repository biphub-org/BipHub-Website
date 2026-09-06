import { createClient } from '@/lib/supabase/server'
import { searchUniversitiesAction } from '@/lib/actions/universities'
import { StudentProfileForm } from '@/components/student/StudentProfileForm'

/**
 * /student-dashboard/complete-profile — one-time personal details for
 * students registered before the fields existed (and for editing later).
 *
 * Reached via the (student)/layout.tsx profile-complete gate, which exempts
 * this path (otherwise it would redirect in a loop — same pattern as the
 * coordinator /onboarding exemption in (dashboard)/layout.tsx).
 */
export default async function StudentCompleteProfilePage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, country, university_id')
    .eq('id', data?.claims?.sub ?? '')
    .maybeSingle()

  const row = (profile ?? {}) as {
    full_name?: string | null
    country?: string | null
    university_id?: string | null
  }

  const initialUniversities = await searchUniversitiesAction('')

  return (
    <section className="bg-white rounded-md shadow-md p-10 max-w-[560px] mx-auto">
      <header className="mb-6">
        <h1 className="text-[22px] font-semibold text-ink">
          Complete your profile
        </h1>
        <p className="mt-2 text-sm text-muted">
          Tell us who you are so coordinators can recognise you — it only takes
          a moment.
        </p>
      </header>
      <StudentProfileForm
        initialFullName={row.full_name ?? ''}
        initialCountry={row.country ?? ''}
        initialUniversityId={row.university_id ?? ''}
        initialUniversities={initialUniversities}
      />
    </section>
  )
}
