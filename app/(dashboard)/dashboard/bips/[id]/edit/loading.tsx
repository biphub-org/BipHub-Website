import { BuilderSkeleton } from '@/components/dashboard/BuilderSkeleton'

/**
 * Loading state for /dashboard/bips/[id]/edit — the wizard skeleton
 * belongs to this builder route (and its new sibling), never to the group
 * loading.
 */
export default function EditBipLoading() {
  return <BuilderSkeleton />
}
