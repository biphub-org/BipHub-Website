'use client'

/**
 * SaveToggleIsland — optimistic heart toggle for saving/unsaving BIPs.
 *
 * Two display modes:
 *   - 'icon'   (default): bare 44px circular button over the BipCard gradient header.
 *   - 'button': full-width outline button for the /bip/[slug] detail sidebar.
 *
 * Behaviour:
 *   - isStudent = false: click routes immediately to /register/student (no optimistic update).
 *   - isStudent = true: React 19 useOptimistic + useTransition; reverts + toasts on error.
 *
 * Accessibility:
 *   - aria-label: "Save {bipTitle}" / "Unsave {bipTitle}"
 *   - aria-pressed: true (saved) / false (unsaved)
 *   - Minimum touch target: min-h-[44px] min-w-[44px] (WCAG 2.5.5)
 *
 * Static class lookup objects only — NO template-literal class names (CLAUDE.md never-do).
 */

import { useOptimistic, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { saveAction, unsaveAction } from '@/lib/actions/saved-bips'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

/** Icon state classes for the Heart icon — static strings only (CLAUDE.md constraint) */
const ICON_CLASSES = {
  saved: 'fill-eu-blue text-eu-blue',
  unsaved: 'text-white',
  pending: 'text-white animate-pulse',
} as const

/** Button label text for the button display mode — static lookup */
const BUTTON_LABELS = {
  unsaved: 'Save this BIP',
  saved: 'Saved',
  pendingSave: 'Saving…',
  pendingRemove: 'Removing…',
  signIn: 'Sign in to save',
} as const

export interface SaveToggleIslandProps {
  bipId: string
  bipTitle: string
  initialSaved: boolean
  isStudent: boolean
  displayStyle?: 'icon' | 'button'
  className?: string
}

export function SaveToggleIsland({
  bipId,
  bipTitle,
  initialSaved,
  isStudent,
  displayStyle = 'icon',
  className,
}: SaveToggleIslandProps) {
  const router = useRouter()
  const [optimisticSaved, setOptimisticSaved] = useOptimistic(initialSaved)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!isStudent) {
      // Non-student / signed-out: immediate redirect, no optimistic update.
      router.push('/register/student')
      return
    }

    startTransition(async () => {
      const nextSaved = !optimisticSaved
      setOptimisticSaved(nextSaved)
      const result = nextSaved
        ? await saveAction(bipId)
        : await unsaveAction(bipId)
      if (result.error) {
        // Revert optimistic update on failure
        setOptimisticSaved(!nextSaved)
        toast.error(
          nextSaved
            ? 'Could not save this BIP. Please try again.'
            : 'Could not remove this BIP. Please try again.',
        )
      }
    })
  }

  const ariaLabel = optimisticSaved ? `Unsave ${bipTitle}` : `Save ${bipTitle}`

  if (displayStyle === 'button') {
    // Full-width outline button for the detail page sidebar.
    // Show different label for non-student, saved, unsaved, pending states.
    const label = !isStudent
      ? BUTTON_LABELS.signIn
      : isPending
        ? optimisticSaved
          ? BUTTON_LABELS.pendingRemove
          : BUTTON_LABELS.pendingSave
        : optimisticSaved
          ? BUTTON_LABELS.saved
          : BUTTON_LABELS.unsaved

    return (
      <Button
        variant="outline"
        className={cn(
          'w-full flex items-center gap-2 min-h-[44px]',
          optimisticSaved && isStudent ? 'text-eu-blue border-eu-blue' : '',
          className,
        )}
        onClick={handleClick}
        disabled={isPending && isStudent}
        aria-label={!isStudent ? BUTTON_LABELS.signIn : ariaLabel}
        aria-pressed={isStudent ? optimisticSaved : undefined}
        type="button"
      >
        <Heart
          size={20}
          className={
            !isStudent
              ? 'text-muted'
              : isPending
                ? ICON_CLASSES.pending
                : optimisticSaved
                  ? ICON_CLASSES.saved
                  : 'text-muted'
          }
          aria-hidden="true"
        />
        {label}
      </Button>
    )
  }

  // Icon mode — bare circular button absolutely positioned over the card header.
  const iconClass = isPending
    ? ICON_CLASSES.pending
    : optimisticSaved
      ? ICON_CLASSES.saved
      : ICON_CLASSES.unsaved

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={!isStudent ? 'Sign in to save' : ariaLabel}
      aria-pressed={isStudent ? optimisticSaved : undefined}
      className={cn(
        'flex items-center justify-center min-h-[44px] min-w-[44px]',
        'rounded-full focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
        className,
      )}
    >
      <Heart
        size={20}
        className={iconClass}
        aria-hidden="true"
      />
    </button>
  )
}
