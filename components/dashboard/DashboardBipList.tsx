'use client'

/**
 * Coordinator dashboard list with shadcn Tabs + URL-driven status filter
 * (DASH-02 / D-09).
 *
 * Tab selection is reflected in `?status=draft|pending|approved|rejected|all`
 * so the URL is shareable and refresh-stable. We compute the filtered set
 * client-side because the entire BIP set is already available — re-fetching
 * per tab would add latency without any privacy benefit (RSC already filtered
 * by created_by).
 *
 * The post-submit toast (UI-SPEC line 503) fires once on mount when
 * `?submitted=true` is present, then strips the param so a refresh does not
 * re-trigger.
 */

import { useEffect, useMemo, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { DashboardBipCard } from '@/components/dashboard/DashboardBipCard'
import type { CoordinatorBip, CoordinatorBipStatus } from '@/lib/queries/coordinatorBips'

type TabValue = 'all' | CoordinatorBipStatus

const TAB_ORDER: ReadonlyArray<TabValue> = ['all', 'draft', 'pending', 'approved', 'rejected', 'changes_requested']

const TAB_LABELS: Record<TabValue, string> = {
  all: 'All',
  draft: 'Draft',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  changes_requested: 'Changes Requested',
}

interface Props {
  bips: CoordinatorBip[]
  initialStatus: string
  showSubmittedToast: boolean
}

function isTabValue(value: string): value is TabValue {
  return (TAB_ORDER as ReadonlyArray<string>).includes(value)
}

export function DashboardBipList({ bips, initialStatus, showSubmittedToast }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  // Surface the post-submit toast exactly once on dashboard mount; then strip
  // ?submitted=true so refreshing does not retrigger it.
  useEffect(() => {
    if (showSubmittedToast) {
      toast.success(
        "Your BIP has been submitted for review. We'll notify you by email once it's been reviewed.",
        { duration: 5000 },
      )
      const next = new URLSearchParams(params)
      next.delete('submitted')
      router.replace(next.toString() ? `/dashboard?${next}` : '/dashboard')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSubmittedToast])

  const counts = useMemo(() => {
    const acc: Record<TabValue, number> = {
      all: bips.length,
      draft: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      changes_requested: 0,
    }
    for (const b of bips) acc[b.status] = (acc[b.status] ?? 0) + 1
    return acc
  }, [bips])

  const activeTab: TabValue = isTabValue(initialStatus) ? initialStatus : 'all'
  const filtered = activeTab === 'all' ? bips : bips.filter((b) => b.status === activeTab)

  const handleTabChange = (next: string | number | null) => {
    if (next === null) return
    const value = String(next)
    const search = new URLSearchParams(params)
    if (value === 'all') search.delete('status')
    else search.set('status', value)
    startTransition(() => {
      router.push(search.toString() ? `/dashboard?${search}` : '/dashboard')
    })
  }

  if (bips.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <h2 className="text-lg font-semibold text-ink">No BIPs yet</h2>
        <p className="mt-2 text-sm text-muted">
          Start your first submission to list a Blended Intensive Program on BipHub.
        </p>
      </div>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="border-b border-border bg-white px-6 -mx-4 md:-mx-6 w-auto">
        {TAB_ORDER.map((tab) => (
          <TabsTrigger key={tab} value={tab}>
            {TAB_LABELS[tab]}
            <Badge variant="secondary" className="ml-2 text-xs">
              {counts[tab] ?? 0}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>
      {TAB_ORDER.map((tab) => (
        <TabsContent key={tab} value={tab} className="mt-4 space-y-3">
          {filtered.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted">
              No {tab === 'all' ? '' : TAB_LABELS[tab].toLowerCase() + ' '}BIPs.
            </p>
          ) : (
            filtered.map((bip) => <DashboardBipCard key={bip.id} bip={bip} />)
          )}
        </TabsContent>
      ))}
    </Tabs>
  )
}
