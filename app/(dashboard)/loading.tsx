import { Skeleton } from '@/components/ui/skeleton'

/**
 * Route-group loading state for /dashboard.
 *
 * Without this file, Next.js shows the previous route until the new RSC
 * resolves — on Vercel cold-start that can be 1–2s of blank screen between
 * /login → /dashboard redirects.
 *
 * Renders a stationary skeleton matching the dashboard chrome so there is
 * no layout shift when the real content arrives.
 */
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-bg-soft">
      {/* DashboardNav placeholder */}
      <div className="border-b border-border bg-white">
        <div className="mx-auto flex h-[64px] max-w-[1200px] items-center justify-between px-4 md:px-6">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>

      <main className="mx-auto max-w-[1200px] px-4 md:px-6">
        <section className="bg-white rounded-md shadow-md p-10 max-w-[560px] mx-auto my-12">
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
    </div>
  )
}
