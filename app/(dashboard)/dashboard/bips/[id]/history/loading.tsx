import { HistoryLoading } from '@/components/history/HistoryLoading'

/**
 * Loading state for /dashboard/bips/[id]/history — header + filter bar
 * (event type, date range) + timeline rows, matching the live page.
 */
export default function BipHistoryLoading() {
  return <HistoryLoading />
}
