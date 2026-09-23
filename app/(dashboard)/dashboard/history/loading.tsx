import { HistoryLoading } from '@/components/history/HistoryLoading'

/**
 * Loading state for /dashboard/history — header + filter bar (BIP, event
 * type, date range) + timeline rows, matching the live page.
 */
export default function DashboardHistoryLoading() {
  return <HistoryLoading showBipFilter />
}
