---
phase: 04-polish-static-content-performance-hardening
plan: 03
subsystem: seo
tags: [opengraph, social-cards, next-metadata, static-assets, png]

# Dependency graph
requires:
  - phase: 01-discovery-foundation
    provides: "Inter TTFs in /public/fonts/ (Plan 01-07 OFL 1.1); /bip/[slug] dynamic opengraph-image.tsx pattern that 04-03 deliberately leaves untouched per D-17; LogoMark 11-star spec from Plan 01-04"
provides:
  - "Static 1200x630 OG fixtures for / and /bips (PNG, EU palette, 11-star LogoMark, EC disclaimer)"
  - "scripts/og-template.html — contributor-runnable HTML for regenerating OG PNGs via Chrome DevTools 'Capture node screenshot'"
  - "metadataBase + metadata.openGraph wired on both static routes; relative /og-*.png URLs resolved against NEXT_PUBLIC_SITE_URL (fallback http://localhost:3000)"
affects: [phase-04 final visual polish, social-share QA in Plan 04-07 E2E, /privacy footer references]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Static-OG strategy (D-17): /bip/[slug] keeps dynamic edge-rendered OG; static pages get hand-rendered PNGs committed to /public — zero runtime cost on /, /bips."
    - "metadataBase pattern: NEXT_PUBLIC_SITE_URL || http://localhost:3000 wrapped in new URL() so relative og:image paths resolve in every environment."
    - "Headless-Chrome rendering pipeline: scripts/og-template.html is the source-of-truth template; standalone single-card variants in /tmp + `chrome.exe --headless --screenshot --window-size=1200,630` produce the committed PNGs deterministically."

key-files:
  created:
    - "scripts/og-template.html"
    - "public/og-home.png (56,163 bytes, 1200x630)"
    - "public/og-bips.png (47,452 bytes, 1200x630)"
  modified:
    - "app/(public)/page.tsx — added `export const metadata: Metadata` with metadataBase + openGraph.images"
    - "app/(public)/bips/page.tsx — extended `generateMetadata()` return with metadataBase + openGraph.images"

key-decisions:
  - "Used headless Chrome (--screenshot --window-size=1200,630) instead of the plan's manual 'open in browser + DevTools screenshot' procedure — Chrome was available locally and headless rendering is deterministic, idempotent, and CI-replicable. Manual workflow remains documented inside scripts/og-template.html for contributors without local Chrome."
  - "Headless rendering required single-card HTML pages (one per OG image) in C:/temp/og-render/ because `--screenshot` captures the viewport rather than a specific node. The multi-card scripts/og-template.html stays as the contributor template; the throwaway temp files were not committed."
  - "metadataBase set on each page (not in app/layout.tsx) per local-scoping convention — keeps the metadata definition collocated with the page it concerns."

patterns-established:
  - "Static OG image generation: drop a new template card into scripts/og-template.html, render headless via Chrome --screenshot, commit the PNG to /public. No headless-chrome npm dependency; no edge runtime cost; no Inter font bundle at request time."
  - "Page-local metadataBase via NEXT_PUBLIC_SITE_URL with localhost fallback — same shape works on Vercel preview/prod and local dev."

requirements-completed: []

# Metrics
duration: 25min
completed: 2026-05-14
---

# Phase 04 Plan 03: Static OG Images for `/` and `/bips` — Summary

**Static 1200x630 PNG OG cards committed at /public/og-{home,bips}.png; metadata.openGraph.images wired on both routes via metadataBase; /bip/[slug] dynamic OG pattern preserved per D-17.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-14
- **Completed:** 2026-05-14
- **Tasks:** 3
- **Files modified:** 5 (2 created PNGs, 1 created HTML, 2 modified TSX)

## Accomplishments

- Committed two hand-rendered 1200x630 OG PNGs (`og-home.png` 56 KB, `og-bips.png` 47 KB) with EU palette, 11-star LogoMark, eyebrow + headline + sub + biphub.eu URL + EC disclaimer.
- Authored `scripts/og-template.html` as the contributor-runnable regeneration template (Chrome DevTools "Capture node screenshot" workflow documented inline).
- Wired `metadata.openGraph.images` on `/` (new `export const metadata`) and `/bips` (extended existing `generateMetadata`), with `metadataBase = new URL(NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')` so relative URLs resolve everywhere.
- `next build` produces 38 routes with the dynamic `/bip/[slug]/opengraph-image` route intact (unaffected per D-17 scope).

## Task Commits

Each task was committed atomically:

1. **Task 1: scripts/og-template.html** — `d0c9f09` (feat)
2. **Task 2: public/og-home.png + public/og-bips.png** — `3e6a560` (feat)
3. **Task 3: metadata.openGraph wiring on / and /bips** — `948c55e` (feat)

## Files Created/Modified

- `scripts/og-template.html` — contributor template with two 1200x630 cards and an HTML comment header documenting the regeneration procedure; embeds the LogoMark SVG with exactly 11 stars per circle element.
- `public/og-home.png` — 1200x630 PNG; eyebrow "ERASMUS+ BIP DIRECTORY", headline "Find your next Blended Intensive Programme.", subtitle, biphub.eu URL, gold accent stripe, EC disclaimer.
- `public/og-bips.png` — 1200x630 PNG; eyebrow "BROWSE", headline "Every Erasmus+ BIP in one place.", subtitle, biphub.eu/bips URL, same brand chrome.
- `app/(public)/page.tsx` — added `import type { Metadata } from 'next'` and a new `export const metadata: Metadata = { metadataBase, openGraph: { ..., images: [{ url: '/og-home.png', width: 1200, height: 630, alt }] } }` block immediately below the `revalidate` export. The homepage previously had no own metadata; root-layout title/description still applies and remains unshadowed.
- `app/(public)/bips/page.tsx` — extended `generateMetadata()` return with `metadataBase` and `openGraph` referencing `/og-bips.png` at 1200x630; preserves the existing `alternates.canonical` from Pitfall 14.

## Decisions Made

- **Used headless Chrome instead of manual screenshot for Task 2.** The plan marked Task 2 as `checkpoint:human-action` because no `puppeteer` dependency exists in the repo. Chrome was available locally (`C:/Program Files/Google/Chrome/Application/chrome.exe`), so `chrome --headless --screenshot --window-size=1200,630 file://...` produced deterministic 1200x630 PNGs with no manual step. The manual DevTools procedure remains documented in the template comment for contributors without local Chrome.
- **metadataBase scoped per-page, not in root layout.** Keeps page-level metadata self-contained; both pages set `NEXT_PUBLIC_SITE_URL || http://localhost:3000`.

## Deviations from Plan

None that changed scope. The only deviation is workflow: Task 2 was completed automatically via headless Chrome instead of via the documented manual checkpoint, because the tool was available. The output PNGs match the plan's spec exactly (1200x630, < 200 KB, opaque, EU palette, 11-star LogoMark, EC disclaimer string verbatim). The template HTML continues to document the manual fallback so contributors without headless Chrome can still regenerate.

## Issues Encountered

- The multi-card `scripts/og-template.html` cannot be screenshot directly with `chrome --screenshot` (which captures the viewport, not a specific node) — solved by writing two single-card variants to a scratch directory (`C:/temp/og-render/`) for the actual headless render. Those temp files were not committed; the committed template remains the multi-card contributor-facing version with both cards visible at once.

## User Setup Required

None — `NEXT_PUBLIC_SITE_URL` falls back to `http://localhost:3000` for local dev; production deployments should set it to `https://biphub.eu` so `og:image` resolves to an absolute URL.

## Next Phase Readiness

- Plan 04-05 (account deletion) and Plan 04-06 (performance hardening) unblocked.
- `/bip/[slug]` dynamic OG handler intact and continues to render per-BIP cards.
- Social link previews on Twitter/LinkedIn/Slack/Discord will now show branded BipHub cards instead of generic Next.js defaults once `NEXT_PUBLIC_SITE_URL` is populated in production.

---
*Phase: 04-polish-static-content-performance-hardening*
*Plan: 04-03*
*Completed: 2026-05-14*
