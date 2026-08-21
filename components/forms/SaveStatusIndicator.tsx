'use client'

/**
 * SaveStatusIndicator — reads save state from the Zustand draft store and
 * renders the wizard's save status (UI-SPEC line 244-248).
 *
 * Three states:
 *   - idle    → "Saved"
 *   - saving  → "Saving…"
 *   - failed  → "Save failed — Retry" (Retry triggers the supplied callback)
 */

import { useBipDraft } from '@/lib/store/bip-draft'

interface Props {
  onRetry?: () => void
}

export function SaveStatusIndicator({ onRetry }: Props) {
  const status = useBipDraft((s) => s.saveStatus)

  return (
    <div aria-live="polite" className="text-sm text-muted">
      {status === 'idle' && 'Saved'}
      {status === 'saving' && 'Saving…'}
      {status === 'failed' && (
        <>
          Save failed —{' '}
          <button
            type="button"
            onClick={onRetry}
            className="text-eu-blue underline hover:no-underline"
          >
            Retry
          </button>
        </>
      )}
    </div>
  )
}
