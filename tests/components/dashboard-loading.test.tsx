import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import DashboardLoading from '@/app/(dashboard)/loading'
import { BuilderSkeleton } from '@/components/dashboard/BuilderSkeleton'
import { HistoryLoading } from '@/components/history/HistoryLoading'
import NewBipLoading from '@/app/(dashboard)/dashboard/bips/new/loading'
import EditBipLoading from '@/app/(dashboard)/dashboard/bips/[id]/edit/loading'
import DashboardHistoryLoading from '@/app/(dashboard)/dashboard/history/loading'
import BipHistoryLoading from '@/app/(dashboard)/dashboard/bips/[id]/history/loading'

/**
 * Dashboard loading boundaries.
 *
 * Refreshing any dashboard page used to flash the BIP builder form: the
 * (dashboard) group loading.tsx rendered the wizard skeleton for every
 * route in the group (and duplicated the nav the layout already renders).
 * The builder skeleton now lives behind its own aria-label on the builder
 * routes only; the group boundary renders neutral dashboard placeholders.
 */
describe('(dashboard) group loading', () => {
  it('renders dashboard placeholders, not the builder form', () => {
    const { queryByLabelText, getByLabelText } = render(<DashboardLoading />)
    expect(getByLabelText('Loading dashboard')).toBeTruthy()
    expect(queryByLabelText('Loading BIP builder')).toBeNull()
  })
})

describe('BuilderSkeleton', () => {
  it('renders the builder form placeholder', () => {
    const { getByLabelText } = render(<BuilderSkeleton />)
    expect(getByLabelText('Loading BIP builder')).toBeTruthy()
  })
})

describe('HistoryLoading', () => {
  it('renders the filter bar plus timeline rows', () => {
    const { getByLabelText } = render(<HistoryLoading showBipFilter />)
    expect(getByLabelText('Loading history')).toBeTruthy()
    expect(getByLabelText('Loading history filters')).toBeTruthy()
  })

  it('omits the BIP filter on the per-BIP view', () => {
    const { container } = render(<HistoryLoading />)
    // 3 control divs (event, from, to) + the Filter pill Skeleton
    expect(container.querySelectorAll('[aria-label="Loading history filters"] > div').length).toBe(4)
    const { container: withBip } = render(<HistoryLoading showBipFilter />)
    expect(withBip.querySelectorAll('[aria-label="Loading history filters"] > div').length).toBe(5)
  })
})

describe('history route loadings', () => {
  it('feed + per-BIP routes render the history skeleton with filters', () => {
    for (const Route of [DashboardHistoryLoading, BipHistoryLoading]) {
      const { queryByLabelText, unmount } = render(<Route />)
      expect(queryByLabelText('Loading history')).toBeTruthy()
      expect(queryByLabelText('Loading history filters')).toBeTruthy()
      expect(queryByLabelText('Loading BIP builder')).toBeNull()
      unmount()
    }
  })
})

describe('builder route loadings', () => {
  it('new + edit routes render the builder skeleton', () => {
    for (const Route of [NewBipLoading, EditBipLoading]) {
      const { queryByLabelText, unmount } = render(<Route />)
      expect(queryByLabelText('Loading BIP builder')).toBeTruthy()
      expect(queryByLabelText('Loading dashboard')).toBeNull()
      unmount()
    }
  })
})
