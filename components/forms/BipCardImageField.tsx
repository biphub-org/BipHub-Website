'use client'

/**
 * BipCardImageField — optional cover image for the listing <BipCard>.
 *
 * Renders as a Step 4 form field (value = `card_image_path`, a bip-media object
 * path). Uploading returns the storage path via `uploadBipCardImageAction`; the
 * path is stored in the form/draft and persisted through the normal
 * submit/edit pipeline. A live mini-card preview shows how the image will look
 * on the public listing card (image over the gradient header) using the draft's
 * own title / city / deadline.
 */

import { useRef, useState, useTransition } from 'react'
import { Loader2, ImagePlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBipDraft } from '@/lib/store/bip-draft'
import { uploadBipCardImageAction } from '@/lib/actions/bip-card-image'
import { attachmentPublicUrl } from '@/lib/utils/attachments'
import { formatLongDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'

const ACCEPT = 'image/jpeg,image/png,image/webp'

interface Props {
  value: string
  onChange: (path: string) => void
}

export function BipCardImageField({ value, onChange }: Props) {
  const bipId = useBipDraft((s) => s.bipId)
  const draft = useBipDraft((s) => s.draft)
  const [error, setError] = useState<string | null>(null)
  const [isBusy, startBusy] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const imageUrl = value ? attachmentPublicUrl(value) : null
  const deadlineLabel = draft.application_deadline
    ? formatLongDate(draft.application_deadline)
    : null

  function handleFile(files: FileList | null) {
    const file = files?.[0]
    if (!file || !bipId) return
    setError(null)
    startBusy(async () => {
      const fd = new FormData()
      fd.set('bipId', bipId)
      fd.set('file', file)
      if (value) fd.set('previousPath', value)
      const result = await uploadBipCardImageAction(fd)
      if ('error' in result) {
        setError(result.error)
      } else {
        onChange(result.path)
      }
      if (inputRef.current) inputRef.current.value = ''
    })
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-semibold text-ink">Card image (optional)</div>
        <p className="text-xs text-muted">
          A cover image for your listing card. If you don&apos;t add one, a
          coloured gradient is used instead. JPG, PNG, or WebP · landscape works
          best.
        </p>
      </div>

      {!bipId ? (
        <p className="rounded-md border border-dashed border-border bg-bg-soft px-3 py-2 text-xs text-muted">
          Fill in Step 1 first — your draft needs to be saved before you can
          upload an image.
        </p>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* Controls */}
          <div className="flex flex-col gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => handleFile(e.target.files)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isBusy}
              onClick={() => inputRef.current?.click()}
              className="border border-dashed border-border"
            >
              {isBusy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="mr-2 h-4 w-4" />
              )}
              {value ? 'Replace image' : 'Upload image'}
            </Button>
            {value && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onChange('')}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-status-rejected"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove image
              </button>
            )}
          </div>

          {/* Live mini-card preview */}
          <div className="w-full max-w-[320px]">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Card preview
            </div>
            <div className="mt-1.5 overflow-hidden rounded-lg border border-border bg-white shadow-sm">
              <div
                className={cn(
                  'relative h-[130px]',
                  !imageUrl &&
                    'bg-[linear-gradient(135deg,#003399_0%,#1a4dab_100%)]',
                )}
              >
                {imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt="Card cover preview"
                    className="h-full w-full object-cover"
                  />
                )}
                {deadlineLabel && (
                  <span className="absolute right-2.5 top-2.5 rounded-pill bg-eu-gold px-2.5 py-1 text-[11px] font-semibold text-ink">
                    {deadlineLabel}
                  </span>
                )}
              </div>
              <div className="p-4">
                <h4 className="line-clamp-2 text-sm font-bold text-ink">
                  {draft.title || 'Your BIP title'}
                </h4>
                <p className="mt-1 text-xs text-muted">
                  {draft.host_city || 'Host city'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="text-sm text-status-rejected" role="alert">
          {error}
        </div>
      )}
    </div>
  )
}
