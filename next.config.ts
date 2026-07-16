import type { NextConfig } from 'next'
import bundleAnalyzer from '@next/bundle-analyzer'

// Plan 04-06 D-19: bundle analyzer gated behind ANALYZE=true.
// Strict-equality check — NOT `!!process.env.ANALYZE` (which would enable
// on any non-empty value including the literal string "false").
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Serialize the page-data collection worker pool. With the default
  // multi-worker pool, `next build` intermittently throws
  // `PageNotFoundError: Cannot find module for page: /_document` as an
  // unhandledRejection during "Collecting page data" — a worker race on
  // module resolution (Windows exacerbates it). One worker removes the race.
  experimental: {
    cpus: 1,
  },
}

export default withBundleAnalyzer(nextConfig)
