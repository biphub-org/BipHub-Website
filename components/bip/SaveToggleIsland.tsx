'use client'

/**
 * SaveToggleIsland — optimistic heart toggle for saving/unsaving BIPs.
 *
 * Two display modes:
 *   - 'icon'   (default): bare 44px circular button over the BipCard gradient header.
 *   - 'button': full-width outline button for the /bip/[slug] detail sidebar.
 *
 * State (D-bip-02-03):
 *   - Displayed state is LOCAL component state seeded from `initialSaved` /
 *     `isStudent`. On dynamic pages (/bips, /student-dashboard/saved) the server
 *     knows the real values, so the props are correct and SSR paints right away.
 *   - On the ISR pages (/bip/[slug], /) the server cannot read cookies without
 *     losing static rendering, so the props default to false and the component
 *     adopts the real state from `useSavedBipsStore` once <SavedBipsHydrator />
 *     fetches it. The store is read ONLY inside an effect (never during render),
 *     so the module-singleton store is never touched on the server — no
 *     cross-request bleed and no hydration mismatch.
 *
 * Behaviour:
 *   - Non-student click routes to /register/student.
 *   - Student click: local optimistic flip + useTransition; reverts + toasts on error.
 *
 * Accessibility:
 *   - aria-label: "Save {bipTitle}" / "Unsave {bipTitle}"
 *   - aria-pressed: true (saved) / false (unsaved)
 *   - Minimum touch target: min-h-[44px] min-w-[44px] (WCAG 2.5.5)
 *
 * Static class lookup objects only — NO template-literal class names (CLAUDE.md never-do).
 */

import { useEffect, useRef, useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { saveAction, unsaveAction } from '@/lib/actions/saved-bips'
import { useSavedBipsStore } from '@/lib/store/saved-bips'
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
  /** SSR-correct on dynamic pages; defaults to false on ISR pages (corrected client-side). */
  initialSaved?: boolean
  /** SSR-correct on dynamic pages; defaults to false on ISR pages (corrected client-side). */
  isStudent?: boolean
  displayStyle?: 'icon' | 'button'
  className?: string
}

export function SaveToggleIsland({
  bipId,
  bipTitle,
  initialSaved = false,
  isStudent: initialIsStudent = false,
  displayStyle = 'icon',
  className,
}: SaveToggleIslandProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [saved, setSaved] = useState(initialSaved)
  const [isStudent, setIsStudent] = useState(initialIsStudent)
  // Once the user toggles, their action wins over a late store adoption.
  const userTouched = useRef(false)

  // Client-only adoption of the shared store (populated by <SavedBipsHydrator />
  // on the ISR pages). Runs in an effect, so the store is never read during the
  // server render — no module-singleton bleed, no hydration mismatch. A no-op on
  // dynamic pages, where the store never hydrates and the SSR props already match.
  useEffect(() => {
    const apply = (state: ReturnType<typeof useSavedBipsStore.getState>) => {
      if (state.hydrated && !userTouched.current) {
        setSaved(state.savedIds.has(bipId))
        setIsStudent(state.isStudent)
      }
    }
    apply(useSavedBipsStore.getState())
    return useSavedBipsStore.subscribe(apply)
  }, [bipId])

  function handleClick() {
    if (!isStudent) {
      // Non-student / signed-out: immediate redirect, no optimistic update.
      router.push('/register/student')
      return
    }

    userTouched.current = true
    const nextSaved = !saved
    setSaved(nextSaved) // local optimistic flip

    startTransition(async () => {
      const result = nextSaved ? await saveAction(bipId) : await unsaveAction(bipId)
      if (result.error) {
        setSaved(!nextSaved) // revert
        userTouched.current = false
        toast.error(
          nextSaved
            ? 'Could not save this BIP. Please try again.'
            : 'Could not remove this BIP. Please try again.',
        )
      }
    })
  }

  const ariaLabel = saved ? `Unsave ${bipTitle}` : `Save ${bipTitle}`

  if (displayStyle === 'button') {
    // Full-width outline button for the detail page sidebar.
    const label = !isStudent
      ? BUTTON_LABELS.signIn
      : isPending
        ? saved
          ? BUTTON_LABELS.pendingRemove
          : BUTTON_LABELS.pendingSave
        : saved
          ? BUTTON_LABELS.saved
          : BUTTON_LABELS.unsaved

    return (
      <Button
        variant="outline"
        className={cn(
          'w-full flex items-center gap-2 min-h-[44px]',
          saved && isStudent ? 'text-eu-blue border-eu-blue' : '',
          className,
        )}
        onClick={handleClick}
        disabled={isPending && isStudent}
        aria-label={!isStudent ? BUTTON_LABELS.signIn : ariaLabel}
        aria-pressed={isStudent ? saved : undefined}
        type="button"
      >
        <Heart
          size={20}
          className={
            !isStudent
              ? 'text-muted'
              : isPending
                ? ICON_CLASSES.pending
                : saved
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
    : saved
      ? ICON_CLASSES.saved
      : ICON_CLASSES.unsaved

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={!isStudent ? 'Sign in to save' : ariaLabel}
      aria-pressed={isStudent ? saved : undefined}
      className={cn(
        'flex items-center justify-center min-h-[44px] min-w-[44px]',
        'rounded-full focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
        className,
      )}
    >
      <Heart size={20} className={iconClass} aria-hidden="true" />
    </button>
  )
}
