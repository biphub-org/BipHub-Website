'use client'

/**
 * BipGrowthChart — approved BIPs per month (last 12).
 * Real data: wired to lib/queries/homepage.getBipGrowthByMonth via StatsSection props.
 * Empty state: when all counts are 0, shows a dashed baseline instead of a flat line.
 */

import { useRef, useState, useCallback } from 'react'
import { m, useInView } from 'motion/react'

export type GrowthDatum = { month: string; label: string; count: number }

const W = 800
const H = 220
const PAD = { L: 48, R: 32, T: 16, B: 34 }
const innerW = W - PAD.L - PAD.R
const innerH = H - PAD.T - PAD.B

export function BipGrowthChart({ data }: { data: GrowthDatum[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const chartWrapRef = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)

  const counts = data.map((d) => d.count)
  const maxV = Math.max(...counts, 1)
  const tickMax = Math.max(4, Math.ceil(maxV / 4) * 4)
  const yTicks = [0, tickMax / 4, tickMax / 2, (tickMax * 3) / 4, tickMax]

  const points = data.map((d, i) => {
    const x = PAD.L + (i / Math.max(data.length - 1, 1)) * innerW
    const y = PAD.T + innerH - (d.count / tickMax) * innerH
    return { x, y, count: d.count, label: d.label, month: d.month }
  })

  const linePath =
    points.length > 1
      ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
      : ''

  const last = points[points.length - 1]
  const first = points[0]
  const baseY = PAD.T + innerH
  const areaPath =
    points.length > 1 ? `${linePath} L ${last.x.toFixed(1)} ${baseY} L ${first.x.toFixed(1)} ${baseY} Z` : ''

  const total = counts.reduce((a, b) => a + b, 0)
  const hasData = total > 0
  const maxMonth = data.reduce(
    (acc, d) => (d.count > acc.count ? d : acc),
    data[0] ?? { count: 0, label: '' },
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const el = chartWrapRef.current
      if (!el || points.length === 0) return
      const rect = el.getBoundingClientRect()
      // Map clientX to SVG viewBox X
      const relX = ((e.clientX - rect.left) / rect.width) * W
      // Find nearest point
      let bestIdx = 0
      let bestDist = Infinity
      for (let i = 0; i < points.length; i++) {
        const d = Math.abs(points[i].x - relX)
        if (d < bestDist) {
          bestDist = d
          bestIdx = i
        }
      }
      setHoverIdx(bestIdx)
    },
    [points],
  )

  const handleMouseLeave = useCallback(() => setHoverIdx(null), [])

  return (
    <div
      ref={ref}
      className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur md:p-6"
    >
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-eu-gold">Last 12 months</p>
          <h3 className="mt-1 text-[16px] font-semibold leading-none text-white">Approved BIPs per month</h3>
          <p className="mt-1 text-[12px] text-white/55">
            {hasData ? (
              <>
                Peak <span className="font-medium text-white/80">{maxMonth.label}</span> · {maxMonth.count} BIPs
              </>
            ) : (
              'No approved BIPs in this window yet'
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-[24px] font-bold leading-none tracking-[-0.02em] text-white">{total}</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-white/60">total</span>
            </div>
            <p className="text-[11px] text-white/50">in last 12 months</p>
          </div>
          <span className="hidden h-8 w-px bg-white/10 sm:block" aria-hidden />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/80">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Live
          </span>
        </div>
      </div>

      {/* Chart */}
      <div
        ref={chartWrapRef}
        className="relative"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full"
          role="img"
          aria-label={`Approved BIPs per month — ${total} total, peak ${maxMonth.label} with ${maxMonth.count}`}
        >
          <defs>
            <linearGradient id="bip-growth-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#FFCC00" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#FFCC00" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Y grid + labels */}
          {yTicks.map((v) => {
            const y = PAD.T + innerH - (v / tickMax) * innerH
            return (
              <g key={v}>
                <line x1={PAD.L} x2={W - PAD.R} y1={y} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                <text x={PAD.L - 8} y={y + 3} textAnchor="end" fill="rgba(255,255,255,0.45)" fontSize="10" fontWeight="500">
                  {v}
                </text>
              </g>
            )
          })}

          {/* Baseline when empty */}
          {!hasData && (
            <line x1={PAD.L} x2={W - PAD.R} y1={baseY} y2={baseY} stroke="rgba(255,204,0,0.35)" strokeWidth="1.5" strokeDasharray="6 6" />
          )}

          {/* Area */}
          {hasData && areaPath && (
            <m.path
              d={areaPath}
              fill="url(#bip-growth-fill)"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
            />
          )}

          {/* Line */}
          {hasData && linePath && (
            <m.path
              d={linePath}
              fill="none"
              stroke="#FFCC00"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={inView ? { pathLength: 1 } : { pathLength: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            />
          )}

          {/* Vertical guide on hover */}
          {hoverIdx !== null && hasData && (
            <line
              x1={points[hoverIdx].x}
              x2={points[hoverIdx].x}
              y1={PAD.T}
              y2={baseY}
              stroke="rgba(255,255,255,0.14)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          )}

          {/* Data points */}
          {points.map((p, i) => {
            const isLast = i === points.length - 1
            const isHover = hoverIdx === i
            return (
              <m.circle
                key={p.month}
                cx={p.x}
                cy={p.y}
                r={isLast && hasData ? 4.5 : 3}
                fill={hasData ? '#FFCC00' : 'rgba(255,255,255,0.35)'}
                stroke={isHover || isLast ? '#0a1735' : 'none'}
                strokeWidth={isHover || isLast ? 2 : 0}
                initial={{ opacity: 0, scale: 0 }}
                animate={inView ? { opacity: 1, scale: isHover ? 1.35 : 1 } : { opacity: 0, scale: 0 }}
                transition={{ duration: 0.25, delay: 0.25 + (i / points.length) * 0.6, ease: 'easeOut' }}
                style={{ transformOrigin: `${p.x}px ${p.y}px` }}
              />
            )
          })}

          {/* Month labels */}
          {points.map((p, i) => (
            <text
              key={p.month}
              x={p.x}
              y={baseY + 20}
              textAnchor="middle"
              fill={hoverIdx === i ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)'}
              fontSize="11"
              fontWeight={hoverIdx === i ? '600' : '500'}
            >
              {p.label}
            </text>
          ))}
        </svg>

        {/* Hover tooltip — positioned relative to chart wrapper */}
        {hoverIdx !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-white/10 bg-[#0a1735] px-3 py-2 shadow-xl"
            style={{
              left: `${(points[hoverIdx].x / W) * 100}%`,
              top: `${(points[hoverIdx].y / H) * 100}%`,
              marginTop: -12,
            }}
          >
            <p className="whitespace-nowrap text-[11px] font-medium text-white/60">
              {points[hoverIdx].label} · {points[hoverIdx].month}
            </p>
            <p className="whitespace-nowrap text-[13px] font-semibold text-white">
              {points[hoverIdx].count} {points[hoverIdx].count === 1 ? 'BIP' : 'BIPs'}
            </p>
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-[11px] text-white/40">Hover a point for details · Counts approved BIPs only</p>
    </div>
  )
}
