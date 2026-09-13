import Link from 'next/link'
import { Eyebrow } from '@/components/home/Eyebrow'

/**
 * GuideShell — shared chrome for /guides/<slug> pages.
 *
 * Layout (post-rebuild 2026-05-16):
 *   - Full-bleed dark hero (#0a1735 + halos) holds the breadcrumb,
 *     audience eyebrow, title, summary, and reading-time pill.
 *   - Article body keeps the 800px reading column under the hero.
 *
 * Matches the visual DNA on /guides/what-is-a-bip and /guides.
 */
export function GuideShell({
  eyebrow,
  title,
  summary,
  readingTime,
  children,
}: {
  eyebrow: string
  title: string
  summary: string
  readingTime: string
  children: React.ReactNode
}) {
  return (
    <>
      {/* === Dark hero band === */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundColor: '#0a1735',
          backgroundImage: [
            'radial-gradient(ellipse 65% 50% at 50% 0%, rgba(0, 51, 153, 0.55) 0%, transparent 60%)',
            'radial-gradient(ellipse 50% 50% at 92% 100%, rgba(255, 204, 0, 0.18) 0%, transparent 65%)',
          ].join(', '),
        }}
      >
        {/* Sparse static gold accents — no motion, page is force-static */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-eu-gold"
          style={{ left: '10%', top: '28%', boxShadow: '0 0 10px rgba(255,204,0,0.7)' }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute h-1 w-1 rounded-full bg-eu-gold"
          style={{ left: '82%', top: '22%', boxShadow: '0 0 8px rgba(255,204,0,0.6)' }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute h-1 w-1 rounded-full bg-eu-gold"
          style={{ left: '78%', top: '72%', boxShadow: '0 0 8px rgba(255,204,0,0.6)' }}
        />

        <div className="relative mx-auto max-w-[1200px] px-4 md:px-6 py-16 lg:py-24">
          <Link
            href="/guides"
            className="mb-8 inline-flex items-center gap-1 text-sm font-semibold text-white/70 transition-colors hover:text-eu-gold"
          >
            ← All guides
          </Link>

          <div className="max-w-[760px]">
            <Eyebrow className="mb-5 text-white">
              <span className="text-white">{eyebrow}</span>
            </Eyebrow>
            <h1
              className="font-bold text-white"
              style={{
                fontSize: 'clamp(30px, 4.5vw, 48px)',
                lineHeight: '1.1',
                letterSpacing: '-1.2px',
              }}
            >
              {title}
            </h1>
            <p className="mt-5 text-[17px] leading-relaxed text-white/70">
              {summary}
            </p>
            <p className="mt-6 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12px] font-medium text-white/80 backdrop-blur-sm">
              {readingTime}
            </p>
          </div>
        </div>
      </section>

      {/* === Article body === */}
      <div className="container mx-auto max-w-[800px] px-4 lg:px-6 py-16 lg:py-20">
        <article className="space-y-12 text-ink-2 leading-relaxed [&_h2]:text-[clamp(22px,3vw,28px)] [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-ink [&_h2]:mt-12 [&_h2]:first:mt-0 [&_p]:text-[16px] [&_p+p]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mt-3 [&_ul]:space-y-2 [&_a]:text-eu-blue [&_a]:underline">
          {children}
        </article>
      </div>
    </>
  )
}
