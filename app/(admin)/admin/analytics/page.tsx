import { Database, TrendingUp } from 'lucide-react'
import { getAdminAnalytics } from '@/lib/queries/adminAnalytics'
import { StatCard } from '@/components/admin/StatCard'
import { TopCountriesCard } from '@/components/admin/TopCountriesCard'

/**
 * /admin/analytics — admin analytics dashboard (D-20 / ADMN-07).
 *
 * Three RSC stat cards: Total BIPs, Submissions this month, Top 5
 * countries. The page itself is dynamic (the admin getClaims() call
 * inside `getAdminAnalytics` marks the segment per-request), but the
 * inner aggregate is allowed to revalidate after 5 minutes via
 * `revalidate = 300` — admin-traffic is low enough that staleness
 * up to 5 minutes is acceptable per D-20.
 */
export const revalidate = 300

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

export default async function AdminAnalyticsPage() {
  const analytics = await getAdminAnalytics()
  const monthName = MONTH_NAMES[new Date().getMonth()] ?? ''

  return (
    <div>
      <div className="border-b border-border bg-white px-6 py-5">
        <h1 className="text-[22px] font-semibold text-ink">Analytics</h1>
        <p className="text-sm text-muted">Updated every 5 minutes</p>
      </div>

      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 px-6 py-8 md:grid-cols-3 md:gap-4">
        <StatCard
          label="Total BIPs"
          value={analytics.totalBips}
          description="All BIPs including demo seed data."
          Icon={Database}
        />
        <StatCard
          label="Submissions this month"
          value={analytics.submissionsThisMonth}
          description={`New submissions since the start of ${monthName}.`}
          Icon={TrendingUp}
        />
        <TopCountriesCard
          entries={analytics.topCountries}
          description="Most BIPs by host country."
        />
      </div>
    </div>
  )
}
