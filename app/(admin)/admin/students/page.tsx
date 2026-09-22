import { SearchX } from 'lucide-react'
import { getAdminStudents } from '@/lib/queries/adminStudents'
import { getRecentStudentProfileChanges } from '@/lib/queries/studentProfileChanges'
import { StudentProfileChangeCard } from '@/components/admin/StudentProfileChangeCard'
import { StudentCard } from '@/components/admin/StudentCard'
import { StudentFilters } from '@/components/admin/StudentFilters'
import { getAuthUserInfoMap } from '@/app/(admin)/admin/users/auth-users'

export const dynamic = 'force-dynamic'

function parseAlerts(raw: string | string[] | undefined): 'all' | 'on' | 'off' {
  const str = Array.isArray(raw) ? raw[0] : raw
  if (str === 'on' || str === 'off') return str
  return 'all'
}

export default async function AdminStudentsPage(props: {
  searchParams: Promise<{ q?: string; alerts?: string }>
}) {
  const sp = await props.searchParams
  const q = typeof sp.q === 'string' ? sp.q : undefined
  const alerts = parseAlerts(sp.alerts)
  const hasFilters = !!(q || alerts !== 'all')
  const students = await getAdminStudents({ q, alerts })
  // In-dashboard notification for student profile edits (audit rows from
  // migration 00060). Shown only when filters are off so search results
  // stay uncluttered.
  const recentChanges = hasFilters ? [] : await getRecentStudentProfileChanges()
  const authMap = await getAuthUserInfoMap(students.map((s) => s.id))
  const count = students.length

  return (
    <div>
      <div className="border-b border-border bg-white px-6 py-5">
        <h1 className="text-[22px] font-semibold text-ink">Students</h1>
        <p className="text-sm text-muted">
          {count} student{count === 1 ? '' : 's'}
          {hasFilters ? ' · filtered' : ''}
          {q ? ` matching "${q}"` : ''}
        </p>
      </div>

      <StudentFilters initialQ={q ?? ''} initialAlerts={alerts} />

      <div className="mx-auto max-w-[1200px] px-4 lg:px-6 py-6">
        {recentChanges.length > 0 && (
          <section aria-labelledby="profile-changes-heading" className="mb-6">
            <h2 id="profile-changes-heading" className="text-base font-semibold text-ink">
              Recent profile changes
            </h2>
            <p className="mt-1 text-sm text-muted">
              What students edited — before → after per changed field.
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {recentChanges.map((change) => (
                <StudentProfileChangeCard key={change.id} change={change} />
              ))}
            </div>
          </section>
        )}
        {count === 0 ? (
          <div className="flex flex-col items-center justify-center px-8 py-16">
            <SearchX className="mb-3 text-muted" size={32} aria-hidden />
            <h2 className="text-base font-semibold text-ink">No students found</h2>
            <p className="mt-1 text-sm text-muted">
              {hasFilters ? 'Try clearing the search or choosing a different filter.' : 'No student accounts exist yet.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {students.map((s) => (
              <StudentCard key={s.id} student={s} auth={authMap.get(s.id) ?? null} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
