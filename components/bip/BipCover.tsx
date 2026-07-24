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
    <div className="relative mb-8 aspect-[12/5] w-full overflow-hidden rounded-xl border border-border bg-bg-soft">
      {/* No hover motion here by design: the cover is a non-interactive hero,
          and a push-in on it read as noise next to the card/CTA hovers. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
    </div>
  )
}
