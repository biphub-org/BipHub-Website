import { cn } from '@/lib/utils/cn'
import { isErasmusCountry } from '@/lib/countries'

interface CountryFlagProps {
  code: string
  className?: string
  /** Width in px. Height is computed at the 3:2 EU flag ratio. */
  width?: number
  /** Visible label for screen readers; pass a country name when the flag is the only country marker, otherwise leave undefined and treat as decorative. */
  title?: string
}

/**
 * Renders the SVG country flag at /public/flags/<CODE>.svg.
 *
 * Replaces getCountryFlagEmoji for visible flag pills. The Unicode regional-
 * indicator characters fall back to letter pairs on platforms without flag
 * fonts (Windows), so we ship one SVG per selectable country instead
 * (see tests/utils/countries.test.ts — every ERASMUS_COUNTRIES code must
 * have a matching public/flags/<CODE>.svg).
 *
 * object-contain (not cover): shipped SVGs have mixed intrinsic ratios
 * (3:2, 2:1, 1:1) — cover crops 2:1 flags sideways (BY lost its ornament
 * band) and square flags top/bottom (CH cross bled to the edges).
 */
export function CountryFlag({
  code,
  className,
  width = 18,
  title,
}: CountryFlagProps) {
  if (!code || !isErasmusCountry(code)) return null
  const upper = code.toUpperCase()
  const height = Math.round((width * 2) / 3)
  return (
    <img
      src={`/flags/${upper}.svg`}
      alt={title ?? ''}
      aria-hidden={title ? undefined : true}
      width={width}
      height={height}
      className={cn('shrink-0 rounded-[2px] object-contain', className)}
    />
  )
}
