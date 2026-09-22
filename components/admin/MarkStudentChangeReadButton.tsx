'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { markStudentProfileChangeReadAction } from '@/lib/actions/student-profile-changes'

/**
 * Dismisses one student profile-change notification (sets read_at, which
 * removes the card from the /admin/students section and decrements the
 * Students sidebar pill). The audit row itself stays as history.
 */
export function MarkStudentChangeReadButton({ changeId }: { changeId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await markStudentProfileChangeReadAction(changeId)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        className="bg-white"
        disabled={isPending}
        onClick={handleClick}
      >
        {isPending ? 'Marking…' : 'Mark as read'}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
