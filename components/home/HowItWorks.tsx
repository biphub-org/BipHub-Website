'use client'

/**
 * HowItWorks — DISC-06, UI-SPEC line 334.
 *
 * Self-contained card. Steps stack vertically inside the card so it can sit
 * beside UniversityCTA in a 2-column grid on lg+ (see app/(public)/page.tsx).
 * Step number: 48px circle blue with 4px gold border.
 *
 * Motion: scroll-reveal with staggered children — header, then each step row
 * slides in from the left.
 *
 * Copy from UI-SPEC Copywriting Contract lines 227-231.
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
import { Search, Send, Plane } from 'lucide-react'

const EASE_OUT: Transition['ease'] = [0.16, 1, 0.3, 1]

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
}

const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
}

const stepItem: Variants = {
  hidden: { opacity: 0, x: -18 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE_OUT } },
}

const STEPS = [
  {
    icon: Search,
    heading: 'Find',
    body: "Filter BIPs by country, field of study, language and dates. Save your favourites and compare options that match your degree.",
  },
  {
    icon: Send,
    heading: 'Apply',
    body: "Apply through your home university's Erasmus+ office using the contact info on the BIP page. We make the matchmaking easy.",
  },
  {
    icon: Plane,
    heading: 'Go',
    body: "Complete the virtual component online, then travel for the physical mobility — fully funded by Erasmus+ at €79/day plus travel.",
  },
]

export function HowItWorks() {
  const cardRef = useRef<HTMLDivElement>(null)
  const inView = useInView(cardRef, { once: true, amount: 0.2 })

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <m.div
          ref={cardRef}
          className="flex h-full flex-col rounded-xl border border-eu-blue-100 bg-white p-10 shadow-[0_4px_16px_rgba(10,23,53,0.06)] lg:p-12"
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
        >
          {/* Card header */}
          <m.div variants={fadeUpItem}>
            <Eyebrow className="mb-3">For students</Eyebrow>
          </m.div>
          <m.h2
            className="font-bold text-ink"
            style={{
              fontSize: 'clamp(26px, 2.8vw, 36px)',
              lineHeight: '1.15',
              letterSpacing: '-1px',
            }}
            variants={fadeUpItem}
          >
            How it works
          </m.h2>
          <m.p
            className="mt-3 text-[16px] leading-[1.6] text-muted"
            variants={fadeUpItem}
          >
            Three steps from finding a BIP to landing in your destination country — fully funded.
          </m.p>

          {/* Journey timeline — icon nodes on a rail (flex-1 pushes the CTA to the shared baseline) */}
          <div className="relative mt-8 flex flex-1 flex-col">
            <span
              aria-hidden="true"
              className="absolute bottom-[38px] left-[21px] top-[38px] w-0.5 rounded-full bg-eu-blue-100"
            />
            {STEPS.map((step) => (
              <m.div key={step.heading} variants={stepItem} className="relative">
                <Step step={step} />
              </m.div>
            ))}
          </div>

          {/* CTA — pinned to the card bottom so both cards' buttons share a baseline */}
          <m.div className="mt-auto pt-8" variants={fadeUpItem}>
            <Link
              href="/bips"
              className={cn(
                'inline-flex h-12 items-center justify-center gap-2 rounded-pill px-6 text-base font-semibold whitespace-nowrap',
                'bg-eu-blue text-white transition-all duration-200 ease-out',
                'hover:bg-eu-blue-dark hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(0,51,153,0.25)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eu-blue focus-visible:ring-offset-2',
              )}
            >
              Browse BIPs
            </Link>
          </m.div>
        </m.div>
      </MotionConfig>
    </LazyMotion>
  )
}

interface StepData {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  heading: string
  body: string
}

function Step({ step }: { step: StepData }) {
  const Icon = step.icon
  return (
    <div
      className={[
        'group relative flex cursor-default items-start gap-4 py-4',
        'transition-[background-color] duration-200 ease-out',
      ].join(' ')}
    >
      {/* Icon node — white ring masks the timeline rail behind it */}
      <div className="z-10 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-eu-blue text-white ring-4 ring-white transition-transform duration-200 ease-out group-hover:scale-110">
        <Icon size={20} strokeWidth={1.8} />
      </div>

      <div className="pt-1.5">
        <h4
          className="mb-1.5 text-[18px] font-semibold text-ink transition-colors duration-200 group-hover:text-eu-blue"
          style={{ letterSpacing: '-0.3px' }}
        >
          {step.heading}
        </h4>
        <p className="text-[15px] leading-[1.6] text-muted">{step.body}</p>
      </div>
    </div>
  )
}
