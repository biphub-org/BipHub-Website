import type { BipWithRelations } from '@/lib/types/bip'
import { BipCard } from '@/components/bip/BipCard'

/**
 * BipGrid — renders a responsive 3-column card grid.
 *
 * Props:
 *   bips — array of BIPs to display
 */
export function BipGrid({ bips }: { bips: BipWithRelations[] }) {
  return (
    <ul
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      aria-label="BIP search results"
    >
      {bips.map((bip) => (
        <li key={bip.id}>
          <BipCard bip={bip} />
        </li>
      ))}
    </ul>
  )
}
