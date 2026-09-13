/**
 * BipHub Button component — pill-shaped primary/gold/ghost variants.
 *
 * Replaces the shadcn base-ui version (Plan 01-01) with the EU-branded
 * button per UI-SPEC lines 388-394.
 *
 * Variants:
 *   primary — EU blue background, white text, lifts on hover
 *   gold    — EU gold background, ink text
 *   ghost   — transparent, border, subtle hover
 *
 * Sizes: sm / md / lg
 *
 * Uses rounded-pill (--radius-pill: 999px) for pill shape per UI-SPEC.
 */

import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils/cn'

type Variant = 'primary' | 'gold' | 'ghost' | 'outline' | 'secondary' | 'destructive' | 'link'
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'default'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  asChild?: boolean
}

// Compatibility shim for shadcn calendar which imports buttonVariants
export function buttonVariants(opts?: { variant?: Variant; size?: Size; className?: string }) {
  return opts?.className ?? ''
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-eu-blue text-white border border-eu-blue ' +
    'hover:bg-eu-blue-dark hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(0,51,153,0.25)] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eu-blue focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  gold:
    'bg-eu-gold text-ink border border-eu-gold ' +
    'hover:bg-eu-gold-dark hover:-translate-y-px hover:shadow-[0_8px_28px_rgba(255,204,0,0.35)] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eu-gold focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  ghost:
    'bg-transparent text-ink border border-border ' +
    'hover:border-ink hover:bg-bg-soft ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eu-blue focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  // Compatibility aliases for shadcn components (calendar, etc.)
  outline:
    'bg-transparent text-ink border border-border ' +
    'hover:border-ink hover:bg-bg-soft ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eu-blue focus-visible:ring-offset-2',
  secondary:
    'bg-bg-soft text-ink border border-border ' +
    'hover:bg-bg-soft hover:border-ink ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eu-blue focus-visible:ring-offset-2',
  destructive:
    'bg-red-600 text-white border border-red-600 ' +
    'hover:bg-red-700 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2',
  link: 'bg-transparent text-eu-blue underline-offset-4 hover:underline border-0 p-0',
}

const sizeStyles: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-7 text-base',
  default: 'h-11 px-5 text-sm',
  icon: 'h-9 w-9 p-0',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        // Browser extensions (Bitdefender TrafficLight, password managers, form
        // fillers) inject `fdprocessedid` on every <button> after SSR but
        // before hydration. Silence the dev warning so the console isn't
        // drowned; real users without that extension never see a mismatch.
        suppressHydrationWarning
        className={cn(
          'inline-flex items-center justify-center font-semibold whitespace-nowrap rounded-pill',
          'transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'
