import {
  getAdminBips,
  type AdminBipsFilter,
} from '@/lib/queries/adminBips'
import { AdminBipsFilters } from '@/components/admin/AdminBipsFilters'
import { AdminBipsTopFilters } from '@/components/admin/AdminBipsTopFilters'
import { AdminBipsSelectList } from '@/components/admin/AdminBipsSelectList'
import { BipFilterChips } from '@/components/bip/BipFilterChips'
import { parseSearchParams } from '@/lib/filters/parseSearchParams'

/**
 * /admin/bips — all-listings page (D-19 / ADMN-06).
 *
 * Now with full student filters (country, field, lang, dates, availability, level)
 * plus the admin workflow status tabs. The sidebar is the same as /bips but
 * pushes to /admin/bips and uses `availability` for the open/closed deadline
 * filter so it doesn't collide with the workflow `status` tabs.
 *
 * `dynamic = 'force-dynamic'` because the query depends on the admin
 * JWT (`getClaims()`) which is per-request. ISR would cache the wrong
 * scope.
 */
export const dynamic = 'force-dynamic'

const VALID_STATUSES = new Set<NonNullable<AdminBipsFilter['status']>>([
  'all',
  'draft',
  'pending',
  'approved',
  'rejected',
  'changes_requested',
])

type StatusValue = NonNullable<AdminBipsFilter['status']>

function parseStatus(raw: string | undefined): StatusValue {
  if (raw && (VALID_STATUSES as Set<string>).has(raw)) {
    return raw as StatusValue
  }
  return 'all'
}

function parseAdminFilters(sp: Record<string, string | string[] | undefined>): AdminBipsFilter & {
  // for chip/sidebar reuse
  country?: string[]
  field?: string[]
  lang?: string[]
  dateFrom?: string
  dateTo?: string
  availability?: 'open' | 'closed' | 'any'
  level?: string[]
} {
  const workflowStatus = parseStatus(typeof sp.status === 'string' ? sp.status : Array.isArray(sp.status) ? sp.status[0] : undefined)

  // Reuse student parser for the other filters, mapping availability <-> status
  // so we don't collide with the workflow `status` param.
  const studentRaw: Record<string, string | string[] | undefined> = {
    country: sp.country,
    field: sp.field,
    lang: sp.lang,
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
    // student `status` (open/closed) is `availability` on admin
    status: sp.availability as string | undefined,
    level: sp.level,
    q: sp.q as string | undefined,
  }
  const parsed = parseSearchParams(studentRaw as never)

  return {
    status: workflowStatus,
    q: typeof sp.q === 'string' ? sp.q : Array.isArray(sp.q) ? sp.q[0] : undefined,
    country: parsed.country,
    field: parsed.field,
    lang: parsed.lang,
    dateFrom: parsed.dateFrom,
    dateTo: parsed.dateTo,
    availability: parsed.status as 'open' | 'closed' | 'any' | undefined,
    level: parsed.level,
  }
}

export default async function AdminBipsPage(props: {
  searchParams: Promise<{ status?: string; q?: string; country?: string; field?: string; lang?: string; dateFrom?: string; dateTo?: string; availability?: string; level?: string }>
}) {
  const sp = await props.searchParams
  const filters = parseAdminFilters(sp as Record<string, string | string[] | undefined>)
  const { status, q, ...rest } = filters

  // For chips/sidebar we need a BipFilterState-like object where `status` is availability
  const chipFilters = {
    country: rest.country,
    field: rest.field,
    lang: rest.lang,
    dateFrom: rest.dateFrom,
    dateTo: rest.dateTo,
    status: rest.availability,
    level: rest.level,
    q,
  } as never

  const bips = await getAdminBips(filters)
  const count = bips.length

  const hasActiveOtherFilters = Boolean(
    rest.country?.length ||
      rest.field?.length ||
      rest.lang?.length ||
      rest.dateFrom ||
      rest.dateTo ||
      (rest.availability && rest.availability !== 'any') ||
      rest.level?.length,
  )

  return (
    <div>
      <div className="border-b border-border bg-white px-6 py-5">
        <h1 className="text-[22px] font-semibold text-ink">All BIPs</h1>
        <p className="text-sm text-muted">
          {count} BIP{count === 1 ? '' : 's'}{' '}
          {status !== 'all' ? `with status ${status}` : 'across all statuses'}
          {q ? ` matching "${q}"` : ''}
          {hasActiveOtherFilters ? ' · filtered' : ''}
        </p>
      </div>

      <AdminBipsFilters initialStatus={status!} initialQ={q ?? ''} />

      <AdminBipsTopFilters
        filters={{
          country: rest.country,
          field: rest.field,
          lang: rest.lang,
          dateFrom: rest.dateFrom,
          dateTo: rest.dateTo,
          availability: rest.availability,
          level: rest.level,
        }}
        basePath="/admin/bips"
      />

      {(hasActiveOtherFilters || q) && (
        <div className="container mx-auto max-w-[1200px] px-4 lg:px-6 pt-6">
          <BipFilterChips filters={chipFilters} />
        </div>
      )}

      <AdminBipsSelectList bips={bips} />
    </div>
  )
}
