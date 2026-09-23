import { Skeleton } from '@/components/ui/skeleton'

/**
 * Route-group loading state for /dashboard.
 *
 * Neutral dashboard skeleton: page-header band (title + action pill,
 * matching the dashboard pages' `border-b bg-white px-6 py-5` header) plus
 * BIP-card rows (title + meta + badge/actions, matching DashboardBipCard).
 *
 * Deliberately NOT the builder form: the wizard skeleton lives in
 * BuilderSkeleton and is scoped to the builder routes' own loading.tsx
 * files, so refreshing history/settings/list pages never flashes a form.
 * No nav placeholder either — (dashboard)/layout.tsx already renders
 * DashboardNav above {children}; duplicating it here double-rendered the
 * nav on every slow load.
 */
export default function DashboardLoading() {
  return (
    <div aria-label="Loading dashboard">
      {/* Page-header band */}
      <div className="flex items-center justify-between border-b border-border bg-white px-6 py-5 -mx-4 md:-mx-6">
        <div>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-28 mt-2" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>

      {/* BIP-card rows */}
      <div className="mt-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-md border border-border bg-white p-5 flex flex-wrap items-start justify-between gap-3"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
