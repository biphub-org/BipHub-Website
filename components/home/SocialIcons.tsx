/**
 * Brand icon for social links — lucide-react no longer ships brand icons,
 * so this is a hand-drawn SVG in the lucide stroke style (Instagram),
 * currentColor-driven.
 */

interface BrandIconProps {
  size?: number
  className?: string
}

function baseProps(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  }
}

export function InstagramIcon({ size = 18, className }: BrandIconProps) {
  return (
    <svg {...baseProps(size, className)}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}


