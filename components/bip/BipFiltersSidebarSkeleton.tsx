/**
 * Stationary skeleton for BipFiltersSidebar Suspense fallback (Plan 04-06 D-18).
 * Renders 6 placeholder rows matching the live sidebar's accordion entries
 * (country, field, language, dates, status, level) so the Suspense →
 * resolved transition causes no Cumulative Layout Shift.
 *
 * No animation, no spinner — per the Phase 4 Specifics block. Tailwind class
 * names are literal strings (CLAUDE.md never-do: no dynamic class names).
 */
export function BipFiltersSidebarSkeleton() {
  return (
    <div
      aria-hidden
      className="sticky top-[88px] w-full space-y-4 rounded-lg p-1"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-20 rounded bg-border/60" />
      </div>
      {/* 6 filter section placeholders matching the live accordion */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="space-y-2 border-b border-border pb-3">
          <div className="h-5 w-32 rounded bg-border/60" />
        </div>
      ))}
    </div>
  )
}
