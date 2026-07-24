import type { BipDetail } from '@/lib/queries/bipDetail'
import { attachmentPublicUrl } from '@/lib/utils/attachments'

/**
 * BipCover — full-width hero banner for the detail page, showing the
 * coordinator's cropped card image (card_image_path). Displayed at the SAME
 * 12:5 ratio the image was cropped to (lib/utils/crop-image), so what shows here
 * matches the listing card and the cropper preview exactly.
 *
 * Renders nothing when there's no cover image — an empty gradient block would
 * add height without information — so callers can always drop it in and pages
 * without a cover keep their current top-aligned layout.
 */
export function BipCover({ bip }: { bip: BipDetail }) {
  if (!bip.card_image_path) return null
  const imageUrl = attachmentPublicUrl(bip.card_image_path)

  return (
    <div className="group relative mb-8 aspect-[12/5] w-full overflow-hidden rounded-xl border border-border bg-bg-soft">
      {/* Slow, shallow push-in on hover. Longer and gentler than the gallery
          thumbnails' scale-105 — this is a large hero, so the same rate would
          read as a lurch. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
      />
    </div>
  )
}
