import Link from 'next/link'
import { LogoMark } from './LogoMark'

/**
 * BipHub global footer — RSC.
 *
 * INFO-03 COMPLIANCE: The disclaimer "Independent project — not affiliated with
 * the European Commission" MUST appear EXACTLY ONCE in this file (em-dash, no period).
 * Rendered by app/(public)/layout.tsx on every page in the (public) route group.
 *
 * Previously this disclaimer lived inline in app/(public)/page.tsx as a temporary
 * measure (Plan 01-01). It was migrated here in Plan 01-04. The page.tsx inline
 * copy was removed to prevent double-rendering.
 */
export function Footer() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-6 md:py-20">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand column */}
          <div>
            <Link href="/" className="flex items-center gap-2 font-bold">
              <LogoMark />
              <span className="text-base text-white">BipHub</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
              The free, open-source database for Erasmus+ Blended Intensive Programs across Europe.
            </p>
          </div>

          {/* For Students */}
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

          {/* For Universities */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[1px] text-white/60">
              For Universities
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/register/coordinator" className="text-white/80 transition-colors hover:text-eu-gold">List your BIP</Link></li>
              <li><Link href="/login" className="text-white/80 transition-colors hover:text-eu-gold">Sign in</Link></li>
              <li><Link href="/guides/for-coordinators" className="text-white/80 transition-colors hover:text-eu-gold">Coordinator guide</Link></li>
            </ul>
          </div>

          {/* Project */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-[1px] text-white/60">
              Project
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/about" className="text-white/80 transition-colors hover:text-eu-gold">About</Link></li>
              <li><Link href="/privacy" className="text-white/80 transition-colors hover:text-eu-gold">Privacy policy</Link></li>
              <li><Link href="/terms" className="text-white/80 transition-colors hover:text-eu-gold">Terms of service</Link></li>
              <li>
                <a
                  href="https://github.com/biphub/biphub"
                  className="text-white/80 transition-colors hover:text-eu-gold"
                  rel="noopener"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom row — INFO-03 mandatory disclaimer */}
        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-white/60">
            © 2026 BipHub · MIT License · Open source on GitHub
          </p>
          <p className="text-xs text-white/60">
            Independent project — not affiliated with the European Commission
          </p>
        </div>
      </div>
    </footer>
  )
}
