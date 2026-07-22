'use client'

/**
 * ImageCropperDialog — lets the coordinator choose which part of their uploaded
 * image shows on the listing card (Step 4), instead of the browser
 * center-cropping. Wraps react-easy-crop at the card's fixed aspect ratio; on
 * "Apply crop" it renders the chosen region to a JPEG blob (see
 * lib/utils/crop-image) which the caller uploads as the card image.
 */

import { useCallback, useState } from 'react'
import Cropper from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  getCroppedBlob,
  CARD_IMAGE_ASPECT,
  type CropArea,
} from '@/lib/utils/crop-image'

interface Props {
  /** Object URL (blob:) of the source image, or null when closed. */
  src: string | null
  open: boolean
  onCancel: () => void
  onApply: (blob: Blob) => void
}

export function ImageCropperDialog({ src, open, onCancel, onApply }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<CropArea | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onCropComplete = useCallback((_area: CropArea, areaPixels: CropArea) => {
    setArea(areaPixels)
  }, [])

  // Reset transient state whenever the dialog closes so the next image starts
  // centered at 1× rather than inheriting the previous crop.
  function reset() {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setArea(null)
    setError(null)
    setBusy(false)
  }

  function handleCancel() {
    reset()
    onCancel()
  }

  async function handleApply() {
    if (!src || !area) return
    setBusy(true)
    setError(null)
    try {
      const blob = await getCroppedBlob(src, area)
      reset()
      onApply(blob)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not crop the image.')
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) handleCancel()
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Position your card image</DialogTitle>
          <DialogDescription>
            Drag to reposition and use the slider to zoom. This is exactly the
            area that will show on your listing card.
          </DialogDescription>
        </DialogHeader>

        {/* Viewport MUST match the crop aspect (12/5) so the crop fills it with
            no letterbox — otherwise react-easy-crop's "cover" sizes the image to
            the viewport, not the crop, and a sliver spills outside the crop that
            can't be pulled in at min zoom. aspect-[12/5] == CARD_IMAGE_ASPECT. */}
        <div className="relative aspect-[12/5] w-full overflow-hidden rounded-md bg-ink">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={CARD_IMAGE_ASPECT}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="cover"
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
            className="h-1.5 flex-1 cursor-pointer accent-eu-blue"
          />
        </div>

        {error && (
          <p className="text-sm text-status-rejected" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleApply}
            disabled={busy || !area}
          >
            {busy ? 'Applying…' : 'Apply crop'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
