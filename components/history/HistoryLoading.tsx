import { Skeleton } from '@/components/ui/skeleton'

/**
 * HistoryLoading — loading placeholder for the coordinator history routes
 * (/dashboard/history and /dashboard/bips/[id]/history).
 *
 * Mirrors those pages: page-header band (title + subtitle + action pill),
 * the filter bar (BIP + event-type selects, From/To dates, Filter pill —
 * BIP select only on the cross-BIP feed), then timeline card rows.
 */
export function HistoryLoading({ showBipFilter = false }: { showBipFilter?: boolean }) {
  return (
    <div aria-label="Loading history">
      {/* Page-header band */}
      <div className="flex items-center justify-between border-b border-border bg-white px-6 py-5 -mx-4 md:-mx-6">
        <div>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56 mt-2" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>

      <div className="mx-auto max-w-[1200px] px-4 md:px-6 py-6">
        {/* Filter bar */}
        <div
          aria-label="Loading history filters"
          className="mb-6 flex flex-wrap items-end gap-3 rounded-md border border-border bg-white px-4 py-3"
        >
          {showBipFilter ? (
            <div className="flex flex-col gap-1">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-9 w-44" />
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-36" />
          </div>
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-9 w-32" />
          </div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>

        {/* Timeline card rows */}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-md border border-border bg-white px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-2/3 mt-2" />
              <Skeleton className="h-3 w-1/3 mt-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
