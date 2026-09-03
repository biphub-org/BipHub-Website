import type { MetadataRoute } from 'next'
import { getAllPublishedSlugs } from '@/lib/queries/bipDetail'
import { GUIDE_SLUGS } from '@/lib/content/guides'

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biphub-website.vercel.app'

/**
 * /sitemap.xml — Next.js auto-routes this file.
 *
 * Includes every publicly indexable page:
 *   - 7 static marketing/content pages
 *   - The /guides hub + every guide slug
 *   - Every approved /bip/<slug>
 *
 * Excluded (handled by robots.ts disallow rules anyway):
 *   /login, /register, /reset-password, /verify-email, /onboarding,
 *   /dashboard/*, /admin/*, /auth/*
 *
 * Re-generated at runtime alongside the same ISR window as the BIP detail
 * pages, so newly approved listings show up within an hour without a
 * full redeploy.
 */
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/bips`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/what-is-a-bip`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${SITE_URL}/coming-soon`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/guides`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]

  const guidePages: MetadataRoute.Sitemap = GUIDE_SLUGS.map((slug) => ({
    url: `${SITE_URL}/guides/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  const slugs = await getAllPublishedSlugs()
  const bipPages: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${SITE_URL}/bip/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [...staticPages, ...guidePages, ...bipPages]
}
