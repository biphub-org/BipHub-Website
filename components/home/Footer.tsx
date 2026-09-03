import Link from 'next/link'
import { LogoMark } from './LogoMark'
import { FacebookIcon, InstagramIcon, XIcon } from './SocialIcons'

// TODO: replace '#' with the real profile URLs.
const SOCIAL_LINKS = [
  { label: 'BipHub on Facebook', href: '#', Icon: FacebookIcon },
  { label: 'BipHub on Instagram', href: '#', Icon: InstagramIcon },
  { label: 'BipHub on X', href: '#', Icon: XIcon },
] as const

/**
 * BipHub global footer — RSC.
 *
 * Statement-first arrangement: a full-width brand line on top, link
 * groups in a bordered four-column row beneath, legal bar at the bottom.
 *
 * INFO-03 COMPLIANCE: The disclaimer "Independent project — not affiliated with
 * the European Commission" MUST appear EXACTLY ONCE in this file (em-dash, no period).
 * Rendered by app/(public)/layout.tsx on every page in the (public) route group.
 */
export function Footer() {
  return (
    <footer
      className="relative overflow-hidden bg-ink text-white"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 60% 90% at 85% 0%, rgba(0, 51, 153, 0.45) 0%, transparent 65%), radial-gradient(ellipse 40% 70% at 5% 100%, rgba(255, 204, 0, 0.10) 0%, transparent 65%)',
      }}
    >
      <div className="relative mx-auto max-w-[1200px] px-4 py-16 md:px-6 md:py-20">
        {/* Brand statement — full width, not a column */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[640px]">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <LogoMark />
              <span className="text-base text-white">BipHub</span>
            </Link>
            <p
              className="mt-5 font-bold text-white"
              style={{ fontSize: 'clamp(24px, 3vw, 36px)', lineHeight: '1.15', letterSpacing: '-1px' }}
            >
              The free, open-source database for Erasmus+ Blended Intensive Programmes.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-4">
            <Link
              href="/contact"
              className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-pill border border-white/30 bg-transparent px-6 text-base font-semibold text-white transition-all duration-200 ease-out hover:-translate-y-px hover:border-white/60 hover:bg-white/10"
            >
              Contact us
            </Link>
            <div className="flex items-center gap-2 md:justify-end">
              <span className="mr-1 text-xs font-medium uppercase tracking-[1px] text-white/50">
                Follow us
              </span>
              {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition-all duration-200 ease-out hover:-translate-y-px hover:border-eu-gold hover:text-eu-gold"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Link groups — one bordered row */}
        <nav
          aria-label="Footer"
          className="mt-12 grid grid-cols-2 gap-10 border-t border-white/10 pt-10 md:grid-cols-4"
        >
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[1px] text-white/60">
              For Students
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/bips" className="text-white/80 transition-colors hover:text-eu-gold">Browse BIPs</Link></li>
              <li><Link href="/what-is-a-bip" className="text-white/80 transition-colors hover:text-eu-gold">What is a BIP?</Link></li>
              <li><Link href="/guides" className="text-white/80 transition-colors hover:text-eu-gold">Guides</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[1px] text-white/60">
              For Coordinators
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/register/coordinator" className="text-white/80 transition-colors hover:text-eu-gold">List your BIP</Link></li>
              <li><Link href="/login" className="text-white/80 transition-colors hover:text-eu-gold">Sign in</Link></li>
              <li><Link href="/guides/for-coordinators" className="text-white/80 transition-colors hover:text-eu-gold">Coordinator guide</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[1px] text-white/60">
              Project
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/about" className="text-white/80 transition-colors hover:text-eu-gold">About</Link></li>
              <li><Link href="/contact" className="text-white/80 transition-colors hover:text-eu-gold">Contact</Link></li>
              <li><Link href="/coming-soon" className="text-white/80 transition-colors hover:text-eu-gold">Coming soon</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[1px] text-white/60">
              Legal
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/privacy" className="text-white/80 transition-colors hover:text-eu-gold">Privacy policy</Link></li>
              <li><Link href="/terms" className="text-white/80 transition-colors hover:text-eu-gold">Terms of service</Link></li>
            </ul>
          </div>
        </nav>

        {/* Bottom row — INFO-03 mandatory disclaimer */}
        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-8 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-white/60">
            © 2026 BipHub · MIT License · Free and open source
          </p>
          <p className="text-xs text-white/60">
            Independent project — not affiliated with the European Commission
          </p>
        </div>
      </div>
    </footer>
  )
}
