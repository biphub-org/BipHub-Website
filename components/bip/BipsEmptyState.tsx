import Link from 'next/link'
import { IconSearchOff } from '@tabler/icons-react'
import { ClearFiltersButton } from '@/components/bip/BipFilterChips'
import { Button } from '@/components/ui/button'

export function BipsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center bg-bg-soft border border-border rounded-lg max-w-md mx-auto px-8 py-16">
      <IconSearchOff
        size={48}
        className="text-muted mb-4"
        aria-hidden="true"
      />
      <h2 className="text-xl font-bold text-ink mb-2">
        No BIPs match your filters
      </h2>
      <p className="text-muted mb-6">
        Try removing a filter, or browse the full catalog.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <ClearFiltersButton />
        <Button variant="ghost" size="md" asChild>
          <Link href="/bips">Browse all BIPs →</Link>
        </Button>
      </div>
    </div>
  )
}
