'use client'

/**
 * BipCardImageField — optional cover image for the listing <BipCard>.
 *
 * Renders as a Step 4 form field (value = `card_image_path`, a bip-media object
 * path). Selecting a file opens the ImageCropperDialog so the coordinator picks
 * exactly which part of the image shows on the card (instead of the browser
 * center-cropping); the cropped JPEG is uploaded via `uploadBipCardImageAction`
 * and the returned path is stored in the form/draft and persisted through the
 * normal submit/edit pipeline. A live mini-card preview shows the result using
 * the draft's own title / city / deadline.
 */

import { useRef, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, ImagePlus, Trash2, Crop } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBipDraft } from '@/lib/store/bip-draft'
import { uploadBipCardImageAction } from '@/lib/actions/bip-card-image'
import { attachmentPublicUrl } from '@/lib/utils/attachments'
import { formatLongDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils/cn'

// react-easy-crop is a client-only, DOM-driven library — load it (and its CSS)
// only in the browser so it never enters the server-render module graph. Mirrors
// the EuropeMap dynamic-import pattern (CLAUDE.md). `ssr: false` is permitted
// here because BipCardImageField is itself a Client Component.
const ImageCropperDialog = dynamic(
  () =>
    import('@/components/forms/ImageCropperDialog').then(
      (m) => m.ImageCropperDialog,
    ),
  { ssr: false },
)

const ACCEPT = 'image/jpeg,image/png,image/webp'
const ACCEPT_TYPES = new Set(ACCEPT.split(','))
const MAX_BYTES = 10_485_760 // 10 MB — mirrors the server action's cap.

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

  // Cropper state. `originalFileRef` keeps the last selected file in memory so
  // "Adjust crop" can reopen the cropper on the ORIGINAL (not the already-cropped
  // upload). `hasOriginal` mirrors it reactively for rendering.
  const originalFileRef = useRef<File | null>(null)
  const [hasOriginal, setHasOriginal] = useState(false)
  const [cropOpen, setCropOpen] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  const imageUrl = value ? attachmentPublicUrl(value) : null
  const deadlineLabel = draft.application_deadline
    ? formatLongDate(draft.application_deadline)
    : null

  function openCropper(file: File) {
    originalFileRef.current = file
    setHasOriginal(true)
    const url = URL.createObjectURL(file)
    setCropSrc(url)
    setCropOpen(true)
  }

  function closeCropper() {
    setCropOpen(false)
    setCropSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }

  function handleSelectFile(files: FileList | null) {
    const file = files?.[0]
    if (inputRef.current) inputRef.current.value = '' // allow re-selecting same file
    if (!file || !bipId) return
    setError(null)
    if (!ACCEPT_TYPES.has(file.type)) {
      setError('Unsupported image type. Use JPG, PNG, or WebP.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Image is too large (max 10 MB).')
      return
    }
    openCropper(file)
  }

  function uploadCropped(blob: Blob) {
    if (!bipId) return
    const baseName = (originalFileRef.current?.name ?? 'card').replace(
      /\.[^.]+$/,
      '',
    )
    const file = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
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
    })
  }

  function handleApplyCrop(blob: Blob) {
    closeCropper()
    uploadCropped(blob)
  }

  function handleRemove() {
    onChange('')
    originalFileRef.current = null
    setHasOriginal(false)
    setError(null)
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-semibold text-ink">Card image (optional)</div>
        <p className="text-xs text-muted">
          A cover image for your listing card. If you don&apos;t add one, a
          coloured gradient is used instead. JPG, PNG, or WebP · you&apos;ll crop
          it to choose exactly what shows.
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
              onChange={(e) => handleSelectFile(e.target.files)}
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
            {value && hasOriginal && (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  if (originalFileRef.current) openCropper(originalFileRef.current)
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-eu-blue hover:text-eu-blue-dark"
              >
                <Crop className="h-3.5 w-3.5" />
                Adjust crop
              </button>
            )}
            {value && (
              <button
                type="button"
                disabled={isBusy}
                onClick={handleRemove}
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
              {/* aspect-[12/5] matches CARD_IMAGE_ASPECT in lib/utils/crop-image */}
              <div
                className={cn(
                  'relative aspect-[12/5]',
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

      <ImageCropperDialog
        src={cropSrc}
        open={cropOpen}
        onCancel={closeCropper}
        onApply={handleApplyCrop}
      />
    </div>
  )
}
