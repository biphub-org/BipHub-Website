---
status: complete
phase: 01-discovery-foundation
source: [01-VERIFICATION.md]
started: 2026-05-09T02:35:00Z
updated: 2026-05-14T18:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Visual homepage fidelity (DISC-01..07)
expected: Open http://localhost:3000 after `supabase start && npm run dev` (or `npm start` after `npm run build`). Confirm all 7 sections render against the biphub-homepage.html mockup: Hero with gold underline, EU palette (#003399 blue / #FFCC00 gold / #0a1735 ink), 96 px section padding, pill CTAs, StickyNav at 68 px, Inter typography, 11-star LogoMark visible, then EuropeMap → CategoriesBar → StatsSection (3 count-up stats with real numbers) → RecentBips (≥3 BipCards because 20 ≥ 6) → HowItWorks → UniversityCTA. Footer disclaimer present exactly once at the bottom.
result: pass
notes: Initial report was "no css" — root cause was missing postcss.config.mjs + absent @source directives in globals.css. Fixed: created postcss.config.mjs with @tailwindcss/postcss and added explicit @source paths. CSS confirmed working after full dev server restart.

### 2. Interactive EuropeMap (DISC-02)
expected: Same dev server. The 29-country choropleth should render. Germany should appear at a higher intensity tier than single-BIP countries. Hovering a country shows a tooltip with the count. Clicking a country navigates to `/bips?country=XX`. Tier-0 countries (no BIPs) appear pale gray. The MapLegend shows 5 swatches (tier 0 omitted from the legend). The keyboard `<select>` fallback is reachable via Tab and functional.
result: pass
notes: Two bugs found and fixed — (1) parseSearchParams csvArray not lowercasing input so uppercase country codes from the map failed Zod enum validation; (2) PostgREST embedded filter nulled out host_university on matched rows — fixed with !inner join when country filter is active.

### 3. Lighthouse > 90 + LCP < 1.5 s on 4G (FOUN-02)
expected: Lighthouse Performance / Accessibility / SEO ≥ 90 on `/` and `/bips`. LCP under 1.5 s on simulated 4G. Run from Chrome DevTools Lighthouse panel against the production build (`npm run build && npm start`), not dev.
result: pass
notes: Retested 2026-05-14 against the production deployment (https://biphub-website.vercel.app). On both `/` and `/bips`: Performance 100, Accessibility 98, SEO 100, LCP 0.5 s. The localhost-only 83 score and the SEO-60 reading were both measurement artifacts — SEO 60 was Vercel's automatic X-Robots-Tag noindex on the deployment-specific URL, which does not apply to the production alias. Codebase grep confirmed no noindex/robots directive in app code.

### 4. WCAG AA keyboard navigation (FOUN-03)
expected: All filter inputs, sort dropdown, pagination, EuropeMap `<select>` fallback, BipCard heart, ShareButton, and Apply CTA reachable via Tab in logical order with visible focus rings. ARIA labels on every interactive element. Skip-link reaches the main content.
result: pass

### 5. Per-BIP OG image (DETL-10)
expected: GET `/bip/<slug>/opengraph-image-<hash>?<query>` returns a 1200×630 PNG with BIP title, university name, city/country, ECTS gold chip, and BipHub wordmark using bundled Inter (no fonts.googleapis.com network request).
result: passed
notes: Auto-verified by orchestrator on 2026-05-09T02:30:00Z against `npm run build && npm start` on port 3098. Curl returned `200 ct=image/png size=89752`; `file` reports `PNG image data, 1200 x 630, 8-bit/color RGBA, non-interlaced`. The Satori `display: flex` regression on the ECTS chip was discovered and fixed in commit 9aeb554 before this verification.

### 6. Mobile responsive layout
expected: At <1024 px viewport on `/bips`, the desktop sidebar hides and a "Filters" button reveals a Vaul bottom drawer with the same filter widgets and a sticky "Show N results" footer. On `/bip/[slug]` at <1024 px, the sticky bottom Apply bar shows the deadline label + CTA. At ≥1024 px, the desktop 2-col layout with the 340 px sticky sidebar is visible.
result: pass
notes: |
  Initial report: scrollable white gap on the right at mobile widths ("all of them").
  Diagnosed via Playwright against the live site (scripts/diagnose-overflow.mjs) — two
  distinct horizontal-overflow causes, neither on /bip/[slug]:
    - Homepage (+30px): StatsSection's w-[420px] decoration blob escaped its <section>,
      which lacked `overflow-hidden` (Hero clips the identical pattern; StatsSection did not).
    - /bips (+23px): the results-bar row never wrapped, so the controls cluster
      (results count + Filters drawer button + fixed w-[180px] sort control) pushed past
      the viewport.
  Fixed in commit 683163a — `overflow-hidden` on StatsSection's section + `flex-wrap` on
  the /bips results-bar row. Regression guard: tests/e2e/no-horizontal-overflow.spec.ts.
  Verified on production (biphub-website.vercel.app): documentElement.scrollWidth == 390
  on / and /bips at a 390 px viewport (was 420 / 413). The /bips drawer, sticky Apply
  bar, and ≥1024 px 2-col layout were not separately re-walked — only the overflow
  defect was reported and it is resolved.

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "No horizontal overflow at mobile widths — the page fills the viewport with no rightward scroll"
  status: resolved
  reason: "User reported: white gap on the right side, on all pages, horizontally scrollable"
  severity: minor
  test: 6
  root_cause: "Two causes — (1) components/home/StatsSection.tsx <section> lacked `overflow-hidden` so its w-[420px] absolute decoration blob extended 30px past a 390px viewport; (2) app/(public)/bips/page.tsx results-bar row had no `flex-wrap`, so the controls cluster (incl. BipSortControl's fixed w-[180px] SelectTrigger) overflowed by 23px."
  artifacts:
    - path: "components/home/StatsSection.tsx"
      issue: "section element missing overflow-hidden — decoration blob escaped"
    - path: "app/(public)/bips/page.tsx"
      issue: "results-bar flex row missing flex-wrap — fixed-width controls overflowed"
  missing:
    - "Added `overflow-hidden` to StatsSection's <section> (commit 683163a)"
    - "Added `flex-wrap` to the /bips results-bar row (commit 683163a)"
    - "Added tests/e2e/no-horizontal-overflow.spec.ts regression guard"
  debug_session: "scripts/diagnose-overflow.mjs (Playwright overflow diagnostic)"
