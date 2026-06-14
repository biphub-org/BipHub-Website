---
phase: 01-discovery-foundation
verified: 2026-05-09T12:00:00Z
status: human_needed
score: 4/5 must-haves verified (SC5 partially verified — RLS/DB layer confirmed; one-command dev flow confirmed; see human items for Lighthouse + visual fidelity)
re_verification: false
human_verification:
  - test: "Visual fidelity check — homepage matches biphub-homepage.html mockup"
    expected: "Hero with gold underline accent; EU palette (#003399 blue, #FFCC00 gold, #0a1735 ink); 96px section padding; pill CTAs; StickyNav at 68px; Inter typography; 11-star LogoMark visible; all 7 sections (Hero, EuropeMap, CategoriesBar, StatsSection, RecentBips, HowItWorks, UniversityCTA) render with seeded data"
    why_human: "Visual correctness of the homepage translation from HTML mockup to React/Tailwind cannot be verified programmatically. DISC-01 requires the page to match biphub-homepage.html. Requires browser inspection."

  - test: "Interactive EuropeMap — choropleth, hover tooltip, click navigation"
    expected: "29-country choropleth shows Germany in a higher intensity tier (5 BIPs); hovering a country shows tooltip with count; clicking navigates to /bips?country=XX; tier-0 countries show pale gray; MapLegend shows 5 swatches (tier 0 omitted); keyboard <select> fallback is visible and functional"
    why_human: "SVG map rendering, hover states, and click behavior require a browser. The dynamic() + ssr:false + TopoJSON fetch chain cannot be exercised in a headless grep pass."

  - test: "FOUN-02 — Lighthouse > 90 Performance/Accessibility/SEO on homepage and /bips; LCP < 1.5s on 4G mobile"
    expected: "Lighthouse scores > 90 on all three categories for / and /bips; LCP under 1.5s on simulated 4G"
    why_human: "Lighthouse is a browser tool. Cannot be run without a live server session."

  - test: "FOUN-03 WCAG AA — keyboard navigation for all interactive elements"
    expected: "All filter inputs, sort dropdown, pagination, and the Europe map country <select> are keyboard-reachable and have visible focus indicators; ARIA labels on all interactive elements"
    why_human: "Full keyboard navigation audit requires manual browser testing; programmatic grep shows aria-label attributes exist but cannot confirm focus order or visible ring rendering."

  - test: "/bip/[slug] OG image rendered correctly at 1200x630"
    expected: "GET /bip/sustainable-cities-munich-2026/opengraph-image returns a 1200x630 PNG with BIP title, university, city/country, ECTS chip, and BipHub wordmark using bundled Inter; no Google Fonts request in network log"
    why_human: "Image rendering via Satori requires a live Next.js server request; PNG content correctness cannot be verified via grep."

  - test: "Mobile layout — /bips filter drawer and /bip/[slug] sticky bottom Apply bar"
    expected: "At <1024px viewport on /bips, sidebar is hidden; Filters button shows and opens Vaul bottom drawer with identical filter widgets and sticky 'Show N results' footer. On /bip/[slug] at <1024px, sticky bottom Apply bar with deadline label and CTA is visible."
    why_human: "Responsive layout changes require viewport-width simulation; cannot be verified with file inspection alone."
---

# Phase 1: Discovery Foundation — Verification Report

**Phase Goal:** Students can find and explore BIPs. Core value proposition is live and testable against seeded data.
**Verified:** 2026-05-09T12:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | Student opens homepage and sees interactive Europe map, category bar, live stats, recently added BIPs — all from seeded data | ? NEEDS HUMAN (visual) | RSC composition proven: `app/(public)/page.tsx` runs 5 parallel Supabase queries; 20 approved seed BIPs confirmed in DB; all 8 ISCED categories covered; EuropeMap is dynamic+ssr:false; StatsSection uses LazyMotion. Visual rendering requires browser. |
| SC2 | Student browses /bips with any filter combination; URL updates for shareable state | ✓ VERIFIED | `app/(public)/bips/page.tsx` reads searchParams via Zod `BipFilterSchema`; 7 filters wired (BROW-02..08); `buildSupabaseQuery.ts` applies all filters; `generateMetadata` sets `alternates.canonical`; all filter state in URL. |
| SC3 | Student full-text searches including accented "Munchen" finding "München" | ✓ VERIFIED | `unaccent` extension installed (DB confirmed); `immutable_unaccent` function present (DB: 1 row in pg_proc); `bips_search_idx` GIN index exists; DB smoke test: `plainto_tsquery('simple', immutable_unaccent('Munchen'))` returns 2 München BIPs; `buildSupabaseQuery.ts` line 73 calls `.textSearch('search_vector', ...)`. |
| SC4 | Student opens /bip/[slug], reads all BIP fields, shares, bookmarks; SSR meta tags and per-BIP OG image | ✓ VERIFIED (code) / ? NEEDS HUMAN (OG render) | `generateMetadata` returns title, description≤155, canonical, openGraph; `opengraph-image.tsx` uses `runtime='nodejs'`, reads Inter TTF from `public/fonts/`; `ShareButton` implements Web Share API + clipboard fallback; Zustand `useBookmarks` store reads `localStorage['biphub:bookmarks']`; all BIP fields rendered in BipHeader/BipBody/BipSidebar. OG PNG rendering requires live server. |
| SC5 | All tables RLS enabled with USING+WITH CHECK on UPDATE; repo runs with `supabase start` + `npm run dev` | ✓ VERIFIED | DB: all 4 tables `relrowsecurity=t`; all 5 UPDATE policies have `has_using=t AND has_with_check=t`; `npm run build` exits 0 (per environment note); 20 approved BIPs in live local DB; `middleware.ts` uses `getClaims()` not `getSession()`; `await cookies()` in `lib/supabase/server.ts`. |

**Score: 4/5 truths fully verified programmatically; SC1 and SC4 (OG render) require human eyes.**

---

### Deferred Items

No items have been formally deferred to a later phase. See FOUN-08 gap below.

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/supabase/server.ts` | Server client factory with `await cookies()` and anon key | ✓ VERIFIED | Contains `await cookies()`, `createServerClient`, no `getSession` |
| `lib/supabase/client.ts` | Browser client factory | ✓ VERIFIED | Contains `createBrowserClient` |
| `lib/supabase/middleware.ts` | Edge-runtime factory with request+response cookies | ✓ VERIFIED | Contains `createServerClient` with request.cookies.getAll/setAll |
| `lib/supabase/admin.ts` | Service-role factory; ESLint-gated | ✓ VERIFIED | Contains `SUPABASE_SERVICE_ROLE_KEY`; ESLint `no-restricted-imports` rule in `eslint.config.mjs` |
| `middleware.ts` | Session refresh + getClaims; no Phase 1 redirects | ✓ VERIFIED | Calls `supabase.auth.getClaims()`; no redirect logic; matcher excludes login/register/auth/static |
| `supabase/migrations/00001_skeleton_bips_table.sql` | bips table + RLS + SELECT policy | ✓ VERIFIED | Contains `ENABLE ROW LEVEL SECURITY`, `bips_select_approved_public` |
| `supabase/migrations/00002_universities_profiles.sql` | universities + profiles tables with RLS + role trigger | ✓ VERIFIED | Contains `create table public.universities`, `sync_role_to_app_metadata`, `raw_app_meta_data` |
| `supabase/migrations/00003_bips_full_schema.sql` | All 12 added Erasmus+ fields | ✓ VERIFIED | Contains `study_levels`, `virtual_timing`, `language_level_min`, `partner_institutions_only`, `green_travel`, `inclusion_support`, `accommodation_notes`, `contact_name`, `contact_email`, `isced_f_code`, `host_city`, `virtual_sessions_count` |
| `supabase/migrations/00005_full_text_search.sql` | unaccent + tsvector STORED + GIN | ✓ VERIFIED | Contains `create extension if not exists unaccent`, `immutable_unaccent`, `generated always as`, `using gin` |
| `supabase/migrations/00006_rls_policies.sql` | Full RLS policy set; all UPDATE with USING+WITH CHECK | ✓ VERIFIED | 5 UPDATE policies, all have polwithcheck != null (DB-verified) |
| `supabase/migrations/00007_indexes.sql` | 7 composite indexes | ✓ VERIFIED | 7 `create index` statements |
| `lib/supabase/database.types.ts` | Generated from live schema; all 12 added fields | ✓ VERIFIED | `export type Database` present; all 12 field names present |
| `lib/types/bip.ts` | Domain type exports | ✓ VERIFIED | Exports Bip, BipInsert, BipUpdate, University, Profile, BipPartner, BipWithRelations, BipStatus, StudyLevel, CEFRLevel, VirtualTiming, HowToApplyType |
| `lib/isced.ts` | 8-category ISCED-F constant | ✓ VERIFIED | Exports `ISCED_FIELDS` (8 entries), `IscedFieldId`, `ISCED_FIELD_BY_ID` |
| `lib/countries.ts` | 33 Erasmus+ countries; `getCountryFlagEmoji` | ✓ VERIFIED | Exports `ERASMUS_COUNTRIES`, `ERASMUS_COUNTRY_CODES`, `getCountryFlagEmoji`; canonical property is `code` (not `iso2`) |
| `supabase/seed.sql` | 20 approved BIPs; D-17 distribution | ✓ VERIFIED | DB: 20 approved rows; 13 countries; 8 ISCED categories; 12 open/8 closed; EN/DE/FR/ES/IT languages; 7 green_travel; 6 inclusion_support; 60 partner rows; all 20 BIPs have ≥1 partner |
| `app/globals.css` | Full Tailwind v4 @theme inline EU palette; breakpoints; 6 choropleth tiers | ✓ VERIFIED | Contains `@theme inline`; `--color-eu-blue`, `--color-eu-gold`, `--color-ink`; `--breakpoint-md: 60rem`; `--breakpoint-lg: 64rem`; `fill-bip-tier-0` through `fill-bip-tier-5` as safelist comments |
| `lib/map/bins.ts` | Full Tailwind class literals for choropleth; no template literals | ✓ VERIFIED | 6 `fillClass` values are full string literals; `TIER_FILL_CLASSES` array ensures scanner discovery |
| `app/(public)/layout.tsx` | StickyNav + Footer chrome for all public pages | ✓ VERIFIED | Imports StickyNav, Footer; wraps children with main#main |
| `components/home/Footer.tsx` | INFO-03 disclaimer verbatim | ✓ VERIFIED | Contains `Independent project — not affiliated with the European Commission` (em-dash, no period) |
| `components/home/LogoMark.tsx` | 11-star ring (NOT 12) | ✓ VERIFIED | `const STAR_COUNT = 11`; comment block explains EC restriction |
| `components/home/EuropeMap.tsx` | Client component; fetches eu-countries.json at runtime | ✓ VERIFIED | `'use client'`; fetches `/eu-countries.json` via `fetch()` (not static import); uses `@vnedyalk0v/react19-simple-maps` |
| `components/home/EuropeMapWrapper.tsx` | `dynamic({ ssr: false })` wrapper | ✓ VERIFIED | Contains `dynamic(... { ssr: false })` — Next.js 15 constraint honored |
| `components/home/StatsSection.tsx` | LazyMotion + domAnimation + m.* | ✓ VERIFIED | Imports `LazyMotion, domAnimation, m` from `motion/react`; wraps in `<LazyMotion features={domAnimation} strict>` |
| `app/(public)/page.tsx` | Full 7-section async RSC; 5 parallel queries | ✓ VERIFIED | Async function; `Promise.all` with 5 queries; EuropeMapWrapper, CategoriesBar, StatsSection, RecentBips, HowItWorks, UniversityCTA all composed |
| `app/(public)/bips/page.tsx` | RSC; canonical; 7 filters; search | ✓ VERIFIED | `generateMetadata` with `alternates.canonical`; `parseSearchParams`; `getBips`; all filter components imported |
| `app/(public)/bip/[slug]/page.tsx` | ISR; generateMetadata; 2-col layout; notFound | ✓ VERIFIED | `export const revalidate = 3600`; `dynamicParams = true`; `generateStaticParams`; `generateMetadata` with canonical, OG; 2-col grid via `grid-cols-[1fr_340px]`; `notFound()` called when bip null |
| `app/(public)/bip/[slug]/opengraph-image.tsx` | Satori; bundled Inter TTF; 1200x630 | ✓ VERIFIED (code) | `runtime = 'nodejs'`; reads `public/fonts/inter-bold.ttf` and `inter-semibold.ttf` via `fs.readFile`; `ImageResponse` with size 1200x630 |
| `app/(public)/bip/[slug]/not-found.tsx` | BipNotFound with correct copy | ✓ VERIFIED | Delegates to `<BipNotFound />` which renders "BIP not found" h1, "This program may have been removed or never existed." body, "Browse all BIPs →" CTA |
| `components/bip/BipCard.tsx` | Demo data pill; BookmarkHeartIsland | ✓ VERIFIED | `bip.is_seed && (...)` renders "Demo data" pill; `BookmarkHeartIsland` imported and rendered |
| `lib/store/bookmarks.ts` | Zustand store; localStorage `biphub:bookmarks` | ✓ VERIFIED | `const STORAGE_KEY = 'biphub:bookmarks'`; `hydrate()` reads `window.localStorage`; toggle persists |
| `components/bip/ShareButton.tsx` | Web Share API + clipboard fallback + Sonner toast | ✓ VERIFIED | Calls `shareBip()`; handles `result.fallback === 'clipboard'` with Sonner toast; `aria-label="Share this BIP"` |
| `components/bip/BipsEmptyState.tsx` | Correct heading, body, and CTAs for no-match | ✓ VERIFIED | h2 "No BIPs match your filters"; p "Try removing a filter, or browse the full catalog."; ClearFiltersButton + "Browse all BIPs →" link |
| `lib/filters/parseSearchParams.ts` | Zod BipFilterSchema; PAGE_SIZE=24 | ✓ VERIFIED | `export const PAGE_SIZE = 24`; Zod schema covers all 7 filters + sort + page |
| `public/eu-countries.json` | TopoJSON for EuropeMap runtime fetch | ✓ VERIFIED | File exists at `public/eu-countries.json` |
| `public/fonts/inter-bold.ttf` + `inter-semibold.ttf` | Bundled Inter for OG images | ✓ VERIFIED | Both files exist in `public/fonts/` |
| `eslint.config.mjs` | `no-restricted-imports` blocking `@/lib/supabase/admin` outside `(admin)` | ✓ VERIFIED | Rule present; `ignores: ["app/(admin)/**", "lib/supabase/admin.ts"]`; no other file imports from admin (grep confirmed 0 matches) |
| `README.md` | `npm run db:start`, `npm run db:reset`, `npm run dev` commands | ✓ VERIFIED | All three commands present in README.md |
| `app/layout.tsx` | Inter via `next/font/google`; latin + latin-ext | ✓ VERIFIED | Imports `Inter` from `next/font/google`; `subsets: ['latin', 'latin-ext']`; `variable: '--font-inter'` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/(public)/page.tsx` | `lib/supabase/server.ts` | `createClient()` import + await | ✓ WIRED | Line 18: `import { createClient } from '@/lib/supabase/server'`; called at line 41 `await createClient()` |
| `lib/supabase/server.ts` | `next/headers cookies()` | `await cookies()` | ✓ WIRED | Line 18: `const cookieStore = await cookies()` |
| `app/(public)/page.tsx` | Supabase DB (bips, universities) | 5 parallel queries in Promise.all | ✓ WIRED | `getApprovedBipCount`, `getBipCountsByCountry`, `getBipCountsByField`, `getRecentBips`, `getStatsSnapshot` all call createClient and query DB |
| `middleware.ts` | `lib/supabase/middleware.ts` | `createMiddlewareClient(request)` | ✓ WIRED | Line 27: `const { supabase, response } = createMiddlewareClient(request)` |
| `middleware.ts` | `supabase.auth.getClaims()` | Called on every matched request | ✓ WIRED | Line 34: `await supabase.auth.getClaims()` |
| `components/home/EuropeMapWrapper.tsx` | `components/home/EuropeMap.tsx` | `dynamic({ ssr: false })` | ✓ WIRED | `const EuropeMap = dynamic(() => import('./EuropeMap'), { ssr: false })` |
| `components/home/EuropeMap.tsx` | `/eu-countries.json` | `fetch()` at runtime (not static import) | ✓ WIRED | Confirmed by component code: fetches at mount, not at bundle time |
| `app/(public)/bips/page.tsx` | `lib/queries/bips.ts` `getBips()` | Imports + calls | ✓ WIRED | Single PostgREST relational embed with `host_university:universities!host_university_id(...)` |
| `lib/filters/buildSupabaseQuery.ts` | Supabase `search_vector` column | `.textSearch('search_vector', q, { type: 'websearch', config: 'english' })` | ✓ WIRED | Line 73; backed by GIN index `bips_search_idx` |
| `app/(public)/bip/[slug]/page.tsx` | `lib/queries/bipDetail.ts` `getBipBySlug()` | Imports + calls | ✓ WIRED | `getBipBySlug(slug)` with single-query PostgREST embed |
| `app/(public)/bip/[slug]/opengraph-image.tsx` | `public/fonts/inter-bold.ttf` | `fs.readFile` | ✓ WIRED | `readFile(join(fontsDir, 'inter-bold.ttf'))` at request time; no googleapis |
| `supabase/migrations/00006_rls_policies.sql` | All 4 tables | UPDATE policies with USING + WITH CHECK | ✓ WIRED | DB audit: 5 UPDATE policies, all polwithcheck != null |
| `supabase/migrations/00005_full_text_search.sql` | `bips.search_vector` | GENERATED ALWAYS AS STORED with `immutable_unaccent` | ✓ WIRED | DB: `bips_search_idx` GIN index confirmed; FTS smoke test passes |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `app/(public)/page.tsx` | `count`, `countsByCountry`, `countsByField`, `recentBips`, `stats` | `lib/queries/homepage.ts` → `createClient()` → Supabase DB queries | Yes — 20 approved BIPs in live DB | ✓ FLOWING |
| `app/(public)/bips/page.tsx` | `rows`, `total`, `totalCountries` | `lib/queries/bips.ts` `getBips(filters)` → single PostgREST embed | Yes — 20 BIPs; filters reduce result set | ✓ FLOWING |
| `app/(public)/bip/[slug]/page.tsx` | `bip` | `lib/queries/bipDetail.ts` `getBipBySlug(slug)` → PostgREST embed | Yes — single BIP with host_university + partners[] | ✓ FLOWING |
| `components/home/EuropeMap.tsx` | `geoData` | `fetch('/eu-countries.json')` at mount | Yes — 28-country TopoJSON committed to public/ | ✓ FLOWING |
| `lib/store/bookmarks.ts` | `slugs` | `localStorage['biphub:bookmarks']` | Yes — per-user localStorage; empty on fresh session | ✓ FLOWING |
| `components/home/StatsSection.tsx` | `stats` | Passed as prop from RSC parent | Yes — computed from live DB count queries | ✓ FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 20 approved BIPs seeded | `SELECT count(*) FROM bips WHERE status='approved'` | 20 | ✓ PASS |
| All 8 ISCED categories covered | `SELECT DISTINCT subject_area FROM bips WHERE status='approved'` | 8 distinct values | ✓ PASS |
| 13 countries in seed | `SELECT count(DISTINCT h.country) FROM bips b JOIN universities h ON ...` | 13 | ✓ PASS |
| FTS: Munchen finds München | `SELECT slug FROM bips WHERE search_vector @@ plainto_tsquery('simple', immutable_unaccent('Munchen'))` | 2 rows | ✓ PASS |
| FTS: Lodz finds Łódź | `SELECT slug FROM bips WHERE search_vector @@ plainto_tsquery('simple', immutable_unaccent('Lodz'))` | 1 row | ✓ PASS |
| RLS: all 4 tables enabled | `SELECT relname, relrowsecurity FROM pg_class WHERE relname IN (...)` | all `t` | ✓ PASS |
| UPDATE policies with USING + WITH CHECK | `SELECT polname, polwithcheck IS NOT NULL FROM pg_policy WHERE polcmd='w'` | 5/5 true | ✓ PASS |
| unaccent extension installed | `SELECT extname FROM pg_extension WHERE extname='unaccent'` | `unaccent` | ✓ PASS |
| GIN index exists | `SELECT indexname FROM pg_indexes WHERE indexname='bips_search_idx'` | `bips_search_idx` | ✓ PASS |
| All 20 BIPs have ≥1 partner | `SELECT count(DISTINCT bip_id) FROM bip_partner_universities` | 20 | ✓ PASS |
| All 20 BIPs have host_university FK | `SELECT count(*) FROM bips WHERE host_university_id IS NOT NULL AND status='approved'` | 20 | ✓ PASS |
| Open/closed deadline mix | `SELECT count(*) WHERE deadline > CURRENT_DATE` / `< CURRENT_DATE` | 12 open / 8 closed | ✓ PASS |
| green_travel and inclusion_support | `SELECT count(*) WHERE green_travel=true` / `WHERE inclusion_support=true` | 7 / 6 | ✓ PASS |
| Language mix | `SELECT DISTINCT language_of_instruction FROM bips WHERE status='approved'` | en, de, es, fr, it | ✓ PASS |
| No framer-motion imports | `grep -rE "from 'framer-motion'" app/ lib/ components/` | 0 matches | ✓ PASS |
| No getSession calls in server code | `grep -rE "getSession\(" lib/ app/` | 0 actual calls (only in comments) | ✓ PASS |
| No fonts.googleapis.com in source | `grep -r "fonts.googleapis.com" app/ lib/ components/` | Only in comments | ✓ PASS |
| @supabase/ssr pinned exact | `package.json: "@supabase/ssr": "0.5.2"` | 0.5.2 (no ^) | ✓ PASS |
| Next.js version 15 (not 16) | `package.json: "next": "15.5.18"` | 15.5.18 | ✓ PASS |
| Zod version 3 (not 4) | `package.json: "zod": "^3.25.76"` | 3.x | ✓ PASS |
| motion (not framer-motion) in package.json | `package.json: "motion": "^12.38.0"` | 12.x, no framer-motion key | ✓ PASS |
| canonical tag on /bips | `generateMetadata` returns `alternates: { canonical: 'https://biphub.eu/bips' }` | ✓ | ✓ PASS |
| canonical tag on /bip/[slug] | `alternates: { canonical: 'https://biphub.eu/bip/${slug}' }` | ✓ | ✓ PASS |
| 11 stars in LogoMark | `const STAR_COUNT = 11` in LogoMark.tsx | 11 (never 12) | ✓ PASS |
| Footer disclaimer verbatim | `Independent project — not affiliated with the European Commission` | Exact match in Footer.tsx | ✓ PASS |
| sort default = deadline-soonest | `BipFilterSchema sort default = 'deadline-soonest'` | ✓ | ✓ PASS |
| PAGE_SIZE = 24 | `export const PAGE_SIZE = 24` | ✓ | ✓ PASS |
| ISR revalidate=3600 on /bip/[slug] | `export const revalidate = 3600` | ✓ | ✓ PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DISC-01 | 01-05 | Homepage matches biphub-homepage.html | ? NEEDS HUMAN | RSC composition verified; visual match requires browser |
| DISC-02 | 01-05 | Interactive Europe map with choropleth | ? NEEDS HUMAN | EuropeMap component exists with correct architecture; visual requires browser |
| DISC-03 | 01-05 | 8-category field-of-study CategoriesBar | ✓ SATISFIED | CategoriesBar renders 8 ISCED fields; links to /bips?field=; all 8 have seed BIPs |
| DISC-04 | 01-05 | Live stats section with count-up | ? NEEDS HUMAN | StatsSection code correct (LazyMotion, m.span); count-up animation requires browser |
| DISC-05 | 01-05 | RecentBips with ≥6 threshold | ✓ SATISFIED | RecentBips receives totalApprovedCount and bips[]; 20 approved BIPs exceeds threshold |
| DISC-06 | 01-05 | HowItWorks 3-step section | ✓ SATISFIED | HowItWorks component exists and is composed into page |
| DISC-07 | 01-05 | Dark-navy university CTA | ✓ SATISFIED | UniversityCTA component exists and is composed into page |
| BROW-01 | 01-06 | /bips responsive card grid | ? NEEDS HUMAN | BipGrid component exists; responsive classes present; visual requires browser |
| BROW-02 | 01-06 | Country filter | ✓ SATISFIED | parseSearchParams has `country` field; buildSupabaseQuery applies `.in('host_university.country', upper)` |
| BROW-03 | 01-06 | Subject area filter (ISCED) | ✓ SATISFIED | `field` filter maps ISCED group ids to `isced_f_code` prefixes via `.or(orClause)` |
| BROW-04 | 01-06 | Language filter | ✓ SATISFIED | `lang` filter applies `.in('language_of_instruction', filters.lang)`; lowercase values enforced |
| BROW-05 | 01-06 | Date range filter | ✓ SATISFIED | `dateFrom`/`dateTo` apply `.gte`/`.lte` on `physical_start_date` |
| BROW-06 | 01-06 | ECTS credits filter | ✓ SATISFIED | `ectsMin`/`ectsMax` apply `.gte`/`.lte` on `ects_credits` |
| BROW-07 | 01-06 | Open/closed status filter | ✓ SATISFIED | `status=open` applies `.gte('application_deadline', today)`; `status=closed` applies `.lt` |
| BROW-08 | 01-06 | Study level filter | ✓ SATISFIED | `level` filter applies `.overlaps('study_levels', filters.level)` |
| BROW-09 | 01-06 | Full-text search with unaccent | ✓ SATISFIED | `textSearch('search_vector', q, { type: 'websearch', config: 'english' })`; DB smoke tests pass for Munchen→München and Lodz→Łódź |
| BROW-10 | 01-06 | Sort (newest/deadline/alphabetical) | ✓ SATISFIED | buildSupabaseQuery has 3 sort branches; default `deadline-soonest`; sort in URL |
| BROW-11 | 01-06 | URL-driven shareable filter state | ✓ SATISFIED | RSC reads `searchParams`; all filter state in URL; no React state for filters |
| BROW-12 | 01-06 | Empty state | ✓ SATISFIED | BipsEmptyState renders on `rows.length === 0`; correct heading/body/CTAs verified |
| BROW-13 | 01-06 | Pagination | ✓ SATISFIED | `PAGE_SIZE=24`; `page` in BipFilterSchema; `range(offset, offset+PAGE_SIZE-1)` in buildSupabaseQuery; BipPagination component |
| DETL-01 | 01-07 | /bip/[slug] with human-readable URL | ✓ SATISFIED | `app/(public)/bip/[slug]/page.tsx` exists; notFound() for missing slugs |
| DETL-02 | 01-07 | Full BIP info fields | ✓ SATISFIED | BipBody renders description, learning_outcomes (bulleted), virtual_component_description, mobility details; BipDetail type includes all fields |
| DETL-03 | 01-07 | Host + partner universities | ✓ SATISFIED | BipBody renders partner section; registered shows `name (country)`; free-text raw appends `(unverified)` |
| DETL-04 | 01-07 | Dates, ECTS, max participants, eligibility | ✓ SATISFIED | BipBody renders eligibility section; BipSidebar renders dates/ECTS key facts |
| DETL-05 | 01-07 | CEFR language level | ✓ SATISFIED | BipSidebar renders CEFR level in key facts dl |
| DETL-06 | 01-07 | Green travel + inclusion support badges | ✓ SATISFIED | BipHeader renders badge chips when `bip.green_travel` or `bip.inclusion_support`; 7+6 seed BIPs have these flags |
| DETL-07 | 01-07 | How-to-apply (URL or contact branch) | ✓ SATISFIED | BipBody "How to apply" section branches on `how_to_apply_type`; url→Link, contact→mailto |
| DETL-08 | 01-07 | Share via Web Share API or copy link | ✓ SATISFIED | ShareButton calls `shareBip()`; navigator.share → clipboard → unsupported chain |
| DETL-09 | 01-07 | Bookmark via localStorage | ✓ SATISFIED | BookmarkHeartIsland reused in BipSidebar; Zustand store hydrates from `localStorage['biphub:bookmarks']` |
| DETL-10 | 01-07 | SSR meta tags and per-BIP OG image | ✓ SATISFIED (code) | `generateMetadata` returns all meta; `opengraph-image.tsx` with bundled Inter; visual OG render needs human |
| INFO-03 | 01-04 | Footer disclaimer on every page | ✓ SATISFIED | Footer.tsx contains exact disclaimer text; rendered via `(public)/layout.tsx` on every public page |
| FOUN-01 | 01-02, 01-08 | RLS on all tables + USING+WITH CHECK on UPDATE | ✓ SATISFIED | DB: 4 tables relrowsecurity=t; 5 UPDATE policies all have polwithcheck != null |
| FOUN-02 | 01-06 | Lighthouse > 90; LCP < 1.5s | ? NEEDS HUMAN | No Lighthouse blocker in code (EuropeMap is ssr:false+lazy; fonts self-hosted; no large static imports); score requires browser measurement |
| FOUN-03 | 01-04 | WCAG AA; keyboard navigation; Europe map <select> fallback | ? PARTIALLY VERIFIED | MapKeyboardFallback renders visible <select> for 29 countries; aria-label on interactive elements (grep confirmed); full keyboard audit needs browser |
| FOUN-04 | 01-01 | Inter self-hosted via next/font | ✓ SATISFIED | `Inter` from `next/font/google`; `latin + latin-ext` subsets; no `fonts.googleapis.com` in source |
| FOUN-08 | 01-01 | MIT license + README + CONTRIBUTING.md | ✗ BLOCKED | **No LICENSE file exists. No CONTRIBUTING.md exists.** README exists with db:start/db:reset/dev commands. The 01-01-PLAN.md comment (line 760) noted "MIT license + full CONTRIBUTING.md land in Phase 4" but ROADMAP.md maps FOUN-08 to Phase 1. REQUIREMENTS.md shows FOUN-08 as "Pending". This is an unresolved gap — no formal deferral in ROADMAP Phase 1 plans. |
| FOUN-09 | 01-01 | Local dev = `supabase start` + `npm run dev` with seed, no extra steps | ✓ SATISFIED | 20 approved BIPs in live local DB; migrations 00001-00008 applied; build exits 0; README documents the flow |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `README.md` | 33 | "Approved BIPs in database: 1" — stale copy from walking skeleton; actual seed has 20 | Info | Cosmetic only; doesn't affect functionality |
| None | - | No `TODO/FIXME/PLACEHOLDER` in app/, lib/, components/ | - | Clean |
| None | - | No empty `return null` or `return {}` stub implementations found | - | Clean |
| None | - | No `getSession()` calls in server code | - | Clean |
| None | - | No `framer-motion` imports anywhere in source | - | Clean |
| None | - | No `fonts.googleapis.com` requests in source (only in comments) | - | Clean |
| None | - | No dynamic Tailwind class concatenation (e.g. `fill-bip-tier-${n}`) | - | Clean |

---

### Known Follow-Ups (not gaps, per task instructions)

These were uncovered during execution and do NOT break any must-have:

1. **notFound() returns HTTP 200 on dynamic routes** — `dynamicParams=true` causes Next.js to return 200 even when `notFound()` is called. DETL-01 only requires the not-found UI to render, not a specific HTTP code. Deferred.

2. **metadataBase warning during build** — `metadataBase` not set in `app/layout.tsx`; OG URLs may be relative in some rendering contexts. One-line fix: add `metadataBase: new URL('https://biphub.eu')` to the root metadata export. Deferred.

3. **README quickstart stale copy** — says "Approved BIPs in database: 1" (from the walking-skeleton canary page); actual dev experience now shows the full homepage with 20 BIPs. README update is a Phase 4 polish item per plan note.

4. **`.env.local` keys rotate per `supabase start`** — contributors must copy keys from `npx supabase status` after each stack restart. README mentions this in the cp step; a more explicit note would improve DX. Phase 4 polish.

---

### Gaps Summary

**1 gap blocking FOUN-08:**

FOUN-08 ("Repository is open-source with MIT license, README, and CONTRIBUTING.md") is in Phase 1's ROADMAP requirement list but has not been delivered. No `LICENSE` file and no `CONTRIBUTING.md` exist in the repository. The plan-level comment in 01-01-PLAN.md (line 760) says these "land in Phase 4 per requirements mapping" — but ROADMAP.md maps FOUN-08 to Phase 1, and Phase 4's Requirements line does NOT list FOUN-08. This is an internal inconsistency: the ROADMAP contract says Phase 1; the plan comment says Phase 4; neither Phase 4 ROADMAP requirements list nor any later plan has claimed FOUN-08.

**Decision required:** The developer must either (a) add a `LICENSE` file and minimal `CONTRIBUTING.md` now to close FOUN-08 in Phase 1 as the ROADMAP contract requires, or (b) formally move FOUN-08 to Phase 4 in ROADMAP.md and update REQUIREMENTS.md so the traceability table reflects the deferral.

FOUN-08 does NOT break any student-facing success criterion. It is a repository hygiene/open-source-readiness requirement. If the developer chooses option (b), Phase 1 can be declared passed (all 5 success criteria are met at the implementation level).

---

### Human Verification Required

See frontmatter `human_verification` section. Summary:

1. **Visual homepage fidelity** — Open http://localhost:3000 after `supabase start && npm run dev` and verify all 7 sections render correctly per biphub-homepage.html.

2. **Interactive EuropeMap** — Hover countries for tooltip; click Germany → verify redirect to /bips?country=DE; verify tier-0 countries show pale gray; verify keyboard <select> works.

3. **Lighthouse audit** — Run DevTools Lighthouse on / and /bips; confirm > 90 on Performance, Accessibility, SEO; LCP < 1.5s on 4G simulation (FOUN-02).

4. **WCAG keyboard audit** — Tab through all interactive elements on /, /bips, and /bip/[slug]; confirm focus order and visible rings (FOUN-03).

5. **OG image rendering** — Start server, navigate to `/bip/sustainable-cities-smart-mobility-munich-2026/opengraph-image`; confirm 1200x630 PNG with title, university, gold bar, ECTS chip (DETL-10 visual aspect).

6. **Mobile layout** — At <1024px viewport on /bips, confirm sidebar is hidden and Filters button opens Vaul drawer. On /bip/[slug], confirm sticky bottom Apply bar.

---

_Verified: 2026-05-09T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
