import type { BipWithRelations } from '@/lib/types/bip'
import { BipCard } from '@/components/bip/BipCard'

/**
 * BipGrid — renders a responsive 3-column card grid.
 *
 * Props:
 *   bips         — array of BIPs to display
 *   savedBipIds  — Set of bip IDs the signed-in student has saved (O(1) lookup)
 *   isStudent    — true when the viewer is a signed-in student
 *
 * Defaults (anon / non-student): savedBipIds = empty Set, isStudent = false.
 * Both are threaded to each BipCard so SaveToggleIsland knows initial state.
 */
export function BipGrid({
  bips,
  savedBipIds = new Set(),
  isStudent = false,
}: {
  bips: BipWithRelations[]
  savedBipIds?: Set<string>
  isStudent?: boolean
}) {
  return (
    <ul
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      aria-label="BIP search results"
    >
      {bips.map((bip) => (
        <li key={bip.id}>
          <BipCard
            bip={bip}
            initialSaved={savedBipIds.has(bip.id)}
            isStudent={isStudent}
          />
        </li>
      ))}
    </ul>
  )
}
