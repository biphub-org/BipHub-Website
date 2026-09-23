import { BuilderSkeleton } from '@/components/dashboard/BuilderSkeleton'

/**
 * Loading state for /dashboard/bips/new — the wizard skeleton belongs to
 * this builder route (and its edit sibling), never to the group loading.
 */
export default function NewBipLoading() {
  return <BuilderSkeleton />
}
