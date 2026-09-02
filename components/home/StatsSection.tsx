'use client'

/**
 * StatsSection — DISC-04, UI-SPEC line 329.
 *
 * Full-bleed bg-eu-blue band with 4 stat cards.
 * Count-up animation uses `motion` (NOT `framer-motion`) via LazyMotion + domAnimation.
 * Wrapped in <LazyMotion features={domAnimation} strict> (PITFALLS Pitfall 12).
 * Uses m.div, m.span (NOT motion.div) to tree-shake down to ~4.6KB initial.
 *
 * Reduced-motion: if prefers-reduced-motion: reduce, renders final number immediately.
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import {
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  useReducedMotion,
} from 'motion/react'
import { useInView } from 'motion/react'
import { Eyebrow } from './Eyebrow'
import { BipGrowthChart, type GrowthDatum } from './BipGrowthChart'

interface Stats {
  bipsListed: number
  universities: number
  countries: number
  openApplications: number
}

interface StatsSectionProps {
  stats: Stats
  growth: GrowthDatum[]
}

// Subtitle copy under each stat card. These are intentionally NOT real deltas —
// computing a real "new this month" delta needs additional queries (`created_at`
// filter on universities), and faking it with the total count ("+19 this month"
// when 19 is the total) was actively misleading.
const STAT_CONFIGS = [
  {
    key: 'bipsListed' as const,
    label: 'BIPs listed',
    delta: 'Across Europe',
  },
  {
    key: 'universities' as const,
    label: 'Universities',
    delta: 'Hosts and partners',
  },
  {
    key: 'countries' as const,
    label: 'Countries',
    delta: 'Erasmus+ programme',
  },
  {
    key: 'openApplications' as const,
    label: 'Open applications',
    delta: 'Accepting students now',
  },
]

export function StatsSection({ stats, growth }: StatsSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.5 })
  const prefersReducedMotion = useReducedMotion()

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <section
          ref={sectionRef}
          className="relative overflow-hidden py-24"
          style={{
            // Same ink palette as the hero, so the two dark bands feel like
            // one aesthetic family with light beats in between.
            backgroundColor: '#0a1735',
            backgroundImage: [
              'radial-gradient(ellipse 65% 50% at 50% 0%, rgba(0, 51, 153, 0.55) 0%, transparent 60%)',
              'radial-gradient(ellipse 50% 45% at 92% 100%, rgba(255, 204, 0, 0.18) 0%, transparent 65%)',
            ].join(', '),
          }}
        >
          {/* Slow ambient gold glow on the bottom-left of the band */}
          <m.div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 h-[420px] w-[420px]"
            style={{
              background:
                'radial-gradient(circle at bottom left, rgba(255, 204, 0, 0.12) 0%, transparent 65%)',
            }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Sparse twinkling gold dots — same DNA as the hero field but
              static (no cursor interaction; this section isn't the hook).
              Fixed positions, slow staggered pulse. */}
          {[
            { left: '8%', top: '20%', size: 4, delay: 0.0 },
            { left: '18%', top: '78%', size: 6, delay: 1.4 },
            { left: '32%', top: '32%', size: 4, delay: 0.6 },
            { left: '46%', top: '88%', size: 4, delay: 2.0 },
            { left: '70%', top: '24%', size: 5, delay: 1.0 },
            { left: '82%', top: '70%', size: 4, delay: 2.6 },
            { left: '92%', top: '34%', size: 6, delay: 0.3 },
            { left: '60%', top: '12%', size: 4, delay: 1.7 },
          ].map((s, i) => (
            <m.span
              key={i}
              aria-hidden="true"
              className="pointer-events-none absolute rounded-full bg-eu-gold"
              style={{
                left: s.left,
                top: s.top,
                width: s.size,
                height: s.size,
                boxShadow: '0 0 10px rgba(255, 204, 0, 0.75)',
              }}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 3.6,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: s.delay,
              }}
            />
          ))}

          <div className="relative mx-auto max-w-[1200px] px-4 md:px-6">
            {/* Section header */}
            <m.div
              className="mb-14 text-center"
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <Eyebrow className="mb-3 text-white [&>span:first-child]:bg-eu-gold">
                <span className="text-white">By the numbers</span>
              </Eyebrow>
              <h2
                className="font-bold text-white"
                style={{
                  fontSize: 'clamp(30px, 4vw, 44px)',
                  lineHeight: '1.15',
                  letterSpacing: '-1px',
                }}
              >
                A growing European network
              </h2>
              <p className="mt-3 text-[17px] text-white/70">
                Live statistics from across the platform — updated as universities and students join.
              </p>
            </m.div>

            {/* Stat cards grid: 4 col desktop, 2 col tablet, 1 col mobile */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              {STAT_CONFIGS.map((cfg) => (
                <StatCard
                  key={cfg.key}
                  value={stats[cfg.key]}
                  label={cfg.label}
                  delta={cfg.delta}
                  isInView={isInView}
                  prefersReducedMotion={prefersReducedMotion ?? false}
                />
              ))}
            </div>

            {/* Growth — real approved BIPs per month (last 12) */}
            <m.div
              className="mt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            >
              <BipGrowthChart data={growth} />
            </m.div>
          </div>
        </section>
      </MotionConfig>
    </LazyMotion>
  )
}

interface StatCardProps {
  value: number
  label: string
  delta: string
  isInView: boolean
  prefersReducedMotion: boolean
}

function StatCard({ value, label, delta, isInView, prefersReducedMotion }: StatCardProps) {
  const [displayed, setDisplayed] = useState(prefersReducedMotion ? value : 0)

  const animate = useCallback(() => {
    if (prefersReducedMotion || value === 0) {
      setDisplayed(value)
      return
    }
    const duration = 1200
    const start = performance.now()
    const step = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(eased * value))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [value, prefersReducedMotion])

  useEffect(() => {
    if (isInView) {
      animate()
    }
  }, [isInView, animate])

  return (
    <m.div
      className="rounded-lg border border-white/15 bg-white/5 p-7 px-6 backdrop-blur-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Big number */}
      <div
        className="font-bold text-white"
        aria-live="polite"
        style={{ fontSize: '44px', lineHeight: '1.0', letterSpacing: '-1.5px' }}
      >
        {displayed.toLocaleString()}
      </div>

      {/* Stat label */}
      <div className="mt-2 text-[14px] font-medium text-white/80">{label}</div>

      {/* Delta badge */}
      <div className="mt-3 text-[12px] font-medium text-white/50">{delta}</div>
    </m.div>
  )
}
