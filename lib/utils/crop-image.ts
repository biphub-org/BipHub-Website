/**
 * Client-side image cropping helper for the BIP card cover (Step 4).
 *
 * react-easy-crop reports the selected crop as an `Area` in NATURAL image
 * pixels; we draw exactly that region onto a fixed-size canvas (the card's
 * aspect ratio) and export a JPEG blob. The uploaded image is therefore already
 * the final card image — the listing card's `object-cover` becomes a no-op, so
 * no schema or display change is needed (the coordinator controls the crop
 * instead of the browser center-cropping for them).
 *
 * The source is always a `blob:` object URL from the user's own file, so the
 * canvas is never cross-origin-tainted and `toBlob` succeeds.
 */

export type CropArea = { x: number; y: number; width: number; height: number }

/** The listing card's cover aspect ratio (12:5 ≈ 2.4). Keep in sync with the
 *  `aspect-[12/5]` preview box in BipCardImageField and the 140px card header. */
export const CARD_IMAGE_ASPECT = 12 / 5

/** Output width in px — 1080 gives crisp covers on retina card widths. */
export const CARD_IMAGE_OUTPUT_WIDTH = 1080

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', () =>
      reject(new Error('Could not load the selected image.')),
    )
    img.src = src
  })
}

/**
 * Render `area` (natural-pixel crop rect) of `imageSrc` onto a
 * `outputWidth × outputWidth/aspect` canvas and return a JPEG blob.
 */
export async function getCroppedBlob(
  imageSrc: string,
  area: CropArea,
  {
    outputWidth = CARD_IMAGE_OUTPUT_WIDTH,
    aspect = CARD_IMAGE_ASPECT,
    quality = 0.9,
  }: { outputWidth?: number; aspect?: number; quality?: number } = {},
): Promise<Blob> {
  const image = await loadImage(imageSrc)
  const outputHeight = Math.round(outputWidth / aspect)

  const canvas = document.createElement('canvas')
  canvas.width = outputWidth
  canvas.height = outputHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not prepare the image for cropping.')

  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    outputWidth,
    outputHeight,
  )

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error('Could not export the cropped image.')),
      'image/jpeg',
      quality,
    )
  })
}
