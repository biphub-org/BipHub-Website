'use client'

/**
 * UniversityCTA — DISC-07, UI-SPEC line 335.
 *
 * Self-contained dark navy card with gold + blue radial accents. Designed to
 * sit beside HowItWorks in a 2-column grid on lg+ (see app/(public)/page.tsx).
 * Primary CTA: gold "Get started — it's free" → /register
 * Secondary CTA: ghost on dark "See sample listing" → /bip/{sampleSlug}
 *
 * Motion: scroll-reveal with staggered children. Radial accents drift slowly.
 *
 * Copy from UI-SPEC Copywriting Contract lines 232-236.
 */

import { useRef } from 'react'
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
import { ClipboardList, BadgeCheck, Users } from 'lucide-react'

const EASE_OUT: Transition['ease'] = [0.16, 1, 0.3, 1]

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09, delayChildren: 0.1 },
  },
}

const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
}

const rowItem: Variants = {
  hidden: { opacity: 0, x: 18 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE_OUT } },
}

interface UniversityCTAProps {
  sampleSlug: string
}

const STEPS = [
  {
    icon: ClipboardList,
    heading: 'List',
    body: 'Submit your BIP in about 10 minutes with our guided form — from signup to live listing.',
  },
  {
    icon: BadgeCheck,
    heading: 'Get reviewed',
    body: 'Our team checks every listing for quality before it goes live, so students can trust what they find.',
  },
  {
    icon: Users,
    heading: 'Welcome students',
    body: 'Reach students from 27+ countries across Europe once your BIP is published.',
  },
]

export function UniversityCTA({ sampleSlug }: UniversityCTAProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const inView = useInView(cardRef, { once: true, amount: 0.2 })

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <div
          ref={cardRef}
          className="relative flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-ink p-10 shadow-[0_4px_16px_rgba(10,23,53,0.06)] lg:p-12"
        >
          {/* Radial accent top-right (blue) — gentle drift */}
          <m.div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 h-[300px] w-[300px]"
            style={{
              background: 'radial-gradient(circle at top right, rgba(0, 51, 153, 0.4) 0%, transparent 70%)',
            }}
            animate={{ x: [0, 10, 0], y: [0, 8, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Radial accent bottom-left (gold) — gentle drift */}
          <m.div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 h-[250px] w-[250px]"
            style={{
              background: 'radial-gradient(circle at bottom left, rgba(255, 204, 0, 0.15) 0%, transparent 70%)',
            }}
            animate={{ x: [0, -6, 0], y: [0, -10, 0] }}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          />

          <m.div
            className="relative flex flex-1 flex-col"
            variants={containerVariants}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
          >
            <m.div variants={fadeUpItem}>
              <Eyebrow className="mb-3 text-white/70 [&>span:first-child]:bg-eu-gold">
                <span className="text-white/70">For coordinators</span>
              </Eyebrow>
            </m.div>
            <m.h2
              className="font-bold text-white"
              style={{
                fontSize: 'clamp(26px, 2.8vw, 36px)',
                lineHeight: '1.15',
                letterSpacing: '-1px',
              }}
              variants={fadeUpItem}
            >
              List your BIP
            </m.h2>
            <m.p
              className="mt-3 text-[16px] leading-[1.6] text-white/70"
              variants={fadeUpItem}
            >
              The free platform for Erasmus+ coordinators. Publish in minutes
              and put your programme in front of students across Europe.
            </m.p>

            {/* Journey timeline — same structure as HowItWorks, gold on navy */}
            <div className="relative mt-8 flex flex-1 flex-col">
              <span
                aria-hidden="true"
                className="absolute bottom-[38px] left-[21px] top-[38px] w-0.5 rounded-full bg-white/15"
              />
              {STEPS.map((step) => (
                <m.div key={step.heading} variants={rowItem} className="relative">
                  <Step step={step} />
                </m.div>
              ))}
            </div>

            {/* CTA buttons — pinned to the card bottom so both cards' buttons share a baseline */}
            <m.div
              className="mt-auto flex flex-wrap items-center gap-3 pt-8"
              variants={fadeUpItem}
            >
              <Link
                href="/register"
                className={cn(
                  'inline-flex h-12 items-center justify-center gap-2 rounded-pill px-6 text-base font-semibold whitespace-nowrap',
                  'bg-eu-gold text-ink border border-eu-gold transition-all duration-200 ease-out',
                  'hover:bg-eu-gold-dark hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(255,204,0,0.25)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eu-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink',
                )}
              >
                Get started — it&apos;s free
              </Link>
              <Link
                href={`/bip/${sampleSlug}`}
                className={cn(
                  'inline-flex h-12 items-center justify-center gap-2 rounded-pill px-6 text-base font-semibold whitespace-nowrap',
                  'bg-transparent text-white border border-white/30 transition-all duration-200 ease-out',
                  'hover:border-white/60 hover:bg-white/10 hover:-translate-y-px',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eu-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink',
                )}
              >
                See sample listing
              </Link>
            </m.div>
          </m.div>
        </div>
      </MotionConfig>
    </LazyMotion>
  )
}

interface StepData {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  heading: string
  body: string
}

/**
 * Icon step — dark-card mirror of HowItWorks' Step:
 * same timeline layout, gold nodes on navy (ink ring masks the rail).
 */
function Step({ step }: { step: StepData }) {
  const Icon = step.icon
  return (
    <div
      className={[
        'group relative flex cursor-default items-start gap-4 py-4',
        'transition-[background-color] duration-200 ease-out',
      ].join(' ')}
    >
      {/* Icon node — ink ring masks the timeline rail behind it */}
      <div className="z-10 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-eu-gold text-ink ring-4 ring-ink transition-transform duration-200 ease-out group-hover:scale-110">
        <Icon size={20} strokeWidth={1.8} />
      </div>

      <div className="pt-1.5">
        <h4
          className="mb-1.5 text-[18px] font-semibold text-white transition-colors duration-200 group-hover:text-eu-gold"
          style={{ letterSpacing: '-0.3px' }}
        >
          {step.heading}
        </h4>
        <p className="text-[15px] leading-[1.6] text-white/70">{step.body}</p>
      </div>
    </div>
  )
}
