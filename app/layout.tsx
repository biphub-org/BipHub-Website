import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// PITFALLS Pitfall 9: Inter MUST be loaded via next/font (self-hosted by Next.js).
// Never use <link href="https://fonts.googleapis.com/..."> — that triggers a
// cross-origin request to Google = GDPR exposure for EU users.
// `latin-ext` is required so accented seed data (München, Łódź, Köln) renders.
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'BipHub — The free, open-source database for Erasmus+ BIPs',
  description:
    'Discover Blended Intensive Programs across Europe — short, focused, fully Erasmus+ funded experiences combining online learning with study abroad.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: browser extensions (e.g. ColorZilla adds
    // `cz-shortcut-listen`, Grammarly, dark-reader) inject attributes onto
    // <html>/<body> before React hydrates. That is client-only noise, not an
    // app mismatch — suppress it on these two elements only (one level deep;
    // real mismatches inside the tree are still reported).
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body
        className="font-sans bg-white text-ink antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  )
}
