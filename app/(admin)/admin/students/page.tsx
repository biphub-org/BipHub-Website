import { SearchX } from 'lucide-react'
import { getAdminStudents } from '@/lib/queries/adminStudents'
import { StudentCard } from '@/components/admin/StudentCard'
import { StudentFilters } from '@/components/admin/StudentFilters'

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
  const students = await getAdminStudents({ q, alerts })
  const count = students.length

  const hasFilters = !!(q || alerts !== 'all')

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
              <StudentCard key={s.id} student={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
