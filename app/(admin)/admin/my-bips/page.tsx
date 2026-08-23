import { DashboardBipList } from '@/components/dashboard/DashboardBipList'
import { getCoordinatorBips } from '@/lib/queries/coordinatorBips'
import { AdminBipsTopFilters } from '@/components/admin/AdminBipsTopFilters'
import { parseSearchParams } from '@/lib/filters/parseSearchParams'
import { BipFilterChips } from '@/components/bip/BipFilterChips'

/**
 * /admin/my-bips — Admin My BIPs (mirrors /dashboard) with full filters.
 *
 * For admin, /dashboard is removed (redirects to /admin). This page shows
 * the admin's own BIPs using getCoordinatorBips (filtered server-side) plus
 * the same full filter sidebar as /bips (country, field, lang, dates,
 * availability, level, partnerOnly). The workflow status tabs remain inside
 * DashboardBipList (client-side), while the other filters are server-side
 * and share the URL with /bips-style ?country=&field=…&q= params.
 *
 * Chrome: Export + Add new BIP are now in the global AdminTopBar (layout) — single instance.
 */
export const dynamic = 'force-dynamic'

export default async function AdminMyBipsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await props.searchParams

  // Parse the full student-style filters (availability is `status` in the student schema)
  const studentRaw: Record<string, string | string[] | undefined> = {
    country: sp.country,
    field: sp.field,
    lang: sp.lang,
    dateFrom: sp.dateFrom,
    dateTo: sp.dateTo,
    status: sp.availability as string | undefined,
    level: sp.level,
    partnerOnly: sp.partnerOnly as string | undefined,
    q: sp.q as string | undefined,
  }
  const parsed = parseSearchParams(studentRaw as never)

  const filters = {
    q: typeof sp.q === 'string' ? sp.q : Array.isArray(sp.q) ? sp.q[0] : undefined,
    country: parsed.country,
    field: parsed.field,
    lang: parsed.lang,
    dateFrom: parsed.dateFrom,
    dateTo: parsed.dateTo,
    availability: parsed.status as 'open' | 'closed' | 'any' | undefined,
    level: parsed.level,
    partnerOnly: parsed.partnerOnly,
  }

  const bips = await getCoordinatorBips(filters)

  const chipFilters = {
    country: filters.country,
    field: filters.field,
    lang: filters.lang,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    status: filters.availability,
    level: filters.level,
    partnerOnly: filters.partnerOnly,
    q: filters.q,
  } as never

  const hasActiveOtherFilters = Boolean(
    filters.country?.length ||
      filters.field?.length ||
      filters.lang?.length ||
      filters.dateFrom ||
      filters.dateTo ||
      (filters.availability && filters.availability !== 'any') ||
      filters.level?.length ||
      filters.partnerOnly,
  )

  return (
    <div>
      <div className="border-b border-border bg-white px-6 py-5">
        <h1 className="text-[22px] font-semibold text-ink">My BIPs</h1>
        <p className="text-sm text-muted">
          {bips.length === 0 ? 'No BIPs yet' : `${bips.length} BIP${bips.length === 1 ? '' : 's'} total`}
          {hasActiveOtherFilters ? ' · filtered' : ''}
        </p>
      </div>

      <AdminBipsTopFilters
        filters={{
          country: filters.country,
          field: filters.field,
          lang: filters.lang,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          availability: filters.availability,
          level: filters.level,
          partnerOnly: filters.partnerOnly,
        }}
        basePath="/admin/my-bips"
      />

      <div className="container mx-auto max-w-[1200px] px-4 lg:px-6 py-6">
        {hasActiveOtherFilters && (
          <div className="mb-6">
            <BipFilterChips filters={chipFilters} />
          </div>
        )}

        <DashboardBipList bips={bips} initialStatus={(sp.status as string) ?? 'all'} showSubmittedToast={sp.submitted === 'true'} />
      </div>
    </div>
  )
}
