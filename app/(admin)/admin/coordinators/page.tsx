import { SearchX } from 'lucide-react'
import { getAdminCoordinators } from '@/lib/queries/adminCoordinators'
import { CoordinatorCard } from '@/components/admin/CoordinatorCard'
import { CoordinatorFilters } from '@/components/admin/CoordinatorFilters'

export const dynamic = 'force-dynamic'

function parseCountry(raw: string | string[] | undefined): string[] | undefined {
  if (!raw) return undefined
  const str = Array.isArray(raw) ? raw.join(',') : raw
  const parts = str.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
  return parts.length ? parts : undefined
}

export default async function AdminCoordinatorsPage(props: {
  searchParams: Promise<{ q?: string; country?: string }>
}) {
  const sp = await props.searchParams
  const q = typeof sp.q === 'string' ? sp.q : undefined
  const country = parseCountry(sp.country)
  const coordinators = await getAdminCoordinators({ q, country })
  const count = coordinators.length

  const hasFilters = !!(q || country?.length)

  return (
    <div>
      <div className="border-b border-border bg-white px-6 py-5">
        <h1 className="text-[22px] font-semibold text-ink">Coordinators</h1>
        <p className="text-sm text-muted">
          {count} coordinator{count === 1 ? '' : 's'}
          {hasFilters ? ' · filtered' : ''}
          {q ? ` matching "${q}"` : ''}
        </p>
      </div>

      <CoordinatorFilters initialQ={q ?? ''} initialCountry={country ?? []} />

      <div className="mx-auto max-w-[1200px] px-4 lg:px-6 py-6">
        {count === 0 ? (
          <div className="flex flex-col items-center justify-center px-8 py-16">
            <SearchX className="mb-3 text-muted" size={32} aria-hidden />
            <h2 className="text-base font-semibold text-ink">No coordinators found</h2>
            <p className="mt-1 text-sm text-muted">
              {hasFilters ? 'Try clearing the search or choosing a different country.' : 'No coordinator accounts exist yet.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {coordinators.map((c) => (
              <CoordinatorCard key={c.id} coordinator={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
