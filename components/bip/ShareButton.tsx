'use client'

import { IconShare } from '@tabler/icons-react'
import { toast } from 'sonner'
import { shareBip } from '@/lib/utils/share'
import { cn } from '@/lib/utils/cn'

/**
 * ShareButton — icon-only share affordance (D-11 / UI-SPEC line 285).
 *
 * Click behavior:
 *   1. navigator.share available → native share sheet (no toast needed)
 *   2. clipboard fallback → silently copies URL, shows Sonner toast
 *   3. Neither supported → shows error toast
 *
 * Touch target: 44×44px (w-11 h-11) per WCAG 2.5.5 / UI-SPEC line 62.
 * aria-label: "Share this BIP" per UI-SPEC line 285.
 */
export function ShareButton({
  title,
  url,
  className,
}: {
  title: string
  url: string
  className?: string
}) {
  const onClick = async () => {
    const result = await shareBip({ title, url })
    if (result.shared && result.fallback === 'clipboard') {
      toast('Link copied to clipboard')
    } else if (!result.shared) {
      toast('Could not share — try copying the URL from the address bar')
    }
    // result.shared && !fallback → native share completed; share sheet is the feedback
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Share this BIP"
      className={cn(
        'group inline-flex items-center justify-center w-11 h-11 rounded-md text-ink-2',
        'hover:bg-bg-soft hover:text-ink transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eu-blue focus-visible:ring-offset-2',
        className,
      )}
    >
      <IconShare
        size={20}
        aria-hidden="true"
        className="transition-transform duration-200 ease-out group-hover:scale-110"
      />
    </button>
  )
}
