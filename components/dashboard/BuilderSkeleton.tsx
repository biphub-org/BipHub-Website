import { Skeleton } from '@/components/ui/skeleton'

/**
 * BuilderSkeleton — loading placeholder for the BIP submission wizard
 * (/dashboard/bips/new and /dashboard/bips/[id]/edit only).
 *
 * Mirrors the wizard's centered single-column form card (title + intro +
 * field rows + submit). It must ONLY be used on builder routes via their
 * own loading.tsx — the (dashboard) group loading renders the neutral
 * dashboard skeleton instead, so refreshing any other dashboard page never
 * flashes a builder form.
 */
export function BuilderSkeleton() {
  return (
    <main className="mx-auto max-w-[1200px] px-4 md:px-6">
      <section
        aria-label="Loading BIP builder"
        className="bg-white rounded-md shadow-md p-10 max-w-[560px] mx-auto my-12"
      >
        <Skeleton className="h-7 w-56 mb-3" />
        <Skeleton className="h-4 w-3/4 mb-8" />
        <div className="space-y-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <Skeleton className="h-10 w-32" />
        </div>
      </section>
    </main>
  )
}
