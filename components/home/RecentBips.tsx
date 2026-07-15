/**
 * RecentBips — DISC-05, UI-SPEC line 330.
 *
 * Server-side threshold gate: if totalApprovedCount < 6, renders RecentBipsTeaser.
 * Otherwise: renders RecentBipsAnimated (client) with the server-rendered BipCards
 * passed as children. The threshold logic stays on the server so the teaser path
 * doesn't get bundled into client JS.
 */

import type { BipWithRelations } from '@/lib/types/bip'
import { BipCard } from '@/components/bip/BipCard'
import { RecentBipsTeaser } from './RecentBipsTeaser'
import { RecentBipsAnimated } from './RecentBipsAnimated'

interface RecentBipsProps {
  totalApprovedCount: number
  bips: BipWithRelations[]
}

export function RecentBips({ totalApprovedCount, bips }: RecentBipsProps) {
  // DISC-05 threshold: render teaser when fewer than 6 approved BIPs
  if (totalApprovedCount < 6) {
    return <RecentBipsTeaser />
  }

  return (
    <RecentBipsAnimated totalApprovedCount={totalApprovedCount}>
      {bips.map((bip) => (
        <BipCard key={bip.id} bip={bip} />
      ))}
    </RecentBipsAnimated>
  )
}
