/**
 * RecentBips — DISC-05, UI-SPEC line 330.
 *
 * Gate: renders RecentBipsTeaser only when the catalog has zero approved
 * BIPs — any approved BIP shows as cards immediately (no minimum).
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
  // Render the teaser only when the catalog is empty — every approved BIP shows as a card.
  if (totalApprovedCount === 0) {
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
