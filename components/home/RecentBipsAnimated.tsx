'use client'

/**
 * RecentBipsAnimated — client wrapper around the RecentBips header + grid + CTA.
 *
 * Server-rendered <BipCard> elements are passed in as children and wrapped here
 * in `m.div` so we can stagger them on scroll-in without making BipCard itself
 * a client component. Header + CTA also fade-up.
 */

import { Children, useRef } from 'react'
import Link from 'next/link'
import {
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  useInView,
  type Transition,
  type Variants,
} from 'motion/react'
import { Eyebrow } from './Eyebrow'
import { cn } from '@/lib/utils/cn'

const EASE_OUT: Transition['ease'] = [0.16, 1, 0.3, 1]

const headerVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
}

const gridVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.25 },
  },
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE_OUT },
  },
}

interface RecentBipsAnimatedProps {
  totalApprovedCount: number
  children: React.ReactNode // server-rendered <BipCard> elements
}

export function RecentBipsAnimated({
  totalApprovedCount,
  children,
}: RecentBipsAnimatedProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const inView = useInView(sectionRef, { once: true, amount: 0.15 })
  const cards = Children.toArray(children)

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <section
          ref={sectionRef}
          className="relative overflow-hidden py-24 bg-white border-t border-border"
          style={{
            // Same faint blue dot grid as CategoriesBar — ties the light
            // sections together and echoes the dark hero's white dot field.
            backgroundImage:
              'radial-gradient(rgba(0, 51, 153, 0.05) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          <div className="relative mx-auto max-w-[1200px] px-4 md:px-6">
            {/* Section header */}
            <m.div
              className="mb-14 text-center"
              variants={headerVariants}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              transition={{ duration: 0.55, ease: EASE_OUT }}
            >
              <Eyebrow className="mb-3 justify-center">Recently added</Eyebrow>
              <h2
                className="font-bold text-ink"
                style={{
                  fontSize: 'clamp(30px, 4vw, 44px)',
                  lineHeight: '1.15',
                  letterSpacing: '-1px',
                }}
              >
                Fresh opportunities
              </h2>
              <p className="mt-3 text-[17px] text-muted">
                New BIPs added in the past two weeks. Apply early — popular ones fill quickly.
              </p>
            </m.div>

            {/* 3-card grid — 3 cols desktop, 2 cols tablet, 1 col mobile */}
            <m.div
              className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-3"
              variants={gridVariants}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
            >
              {cards.map((card, i) => (
                <m.div
                  key={i}
                  variants={cardVariants}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="h-full"
                >
                  {card}
                </m.div>
              ))}
            </m.div>

            {/* Bottom CTA */}
            <m.div
              className="mt-14 text-center"
              variants={headerVariants}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              transition={{ duration: 0.55, ease: EASE_OUT, delay: 0.5 }}
            >
              <Link
                href="/bips"
                className={cn(
                  'inline-flex h-11 items-center justify-center gap-2 rounded-pill px-6 text-sm font-semibold',
                  'bg-transparent text-eu-blue border border-eu-blue transition-all duration-200 ease-out',
                  'hover:bg-eu-blue hover:text-white hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(0,51,153,0.18)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eu-blue focus-visible:ring-offset-2',
                )}
              >
                Browse all {totalApprovedCount} BIPs →
              </Link>
            </m.div>
          </div>
        </section>
      </MotionConfig>
    </LazyMotion>
  )
}
