# Stack Research

**Domain:** Erasmus+ BIP discovery platform — public directory + coordinator dashboard + admin panel
**Researched:** 2026-05-08
**Confidence:** HIGH (all major decisions verified against official docs or npm as of research date)

---

## Critical Version Alert: Next.js 16 is Current

The CONTEXT.md specifies "Next.js 15". As of May 2026:

- **Next.js 16.2.6** is the current stable release (released May 7, 2026)
- **Next.js 15.5.18** is in LTS, supported until October 21, 2026
- Next.js 16 ships Turbopack as the default bundler, replaces `middleware.ts` with `proxy.ts`, changes the `revalidateTag()` signature, and removes several previously deprecated APIs

**Recommendation:** Build on **Next.js 15.5.x LTS** rather than jumping to 16. Rationale:

1. Next.js 16 has significant breaking changes that are not yet widely documented in the broader ecosystem (shadcn, Supabase SSR, tutorials). The Supabase `@supabase/ssr` `createBrowserClient` has a known issue with Next.js 16's determinism guard (calling `Math.random()` during startup).
2. The BIP project has no legacy code requiring migration — but starting on 16 introduces new rough edges (e.g., `proxy.ts` vs `middleware.ts` naming inconsistency, Zod v4 / RHF resolver friction) that would slow initial development.
3. LTS support through Oct 2026 is sufficient for v1 launch.
4. Upgrading 15 → 16 via codemod is straightforward once the ecosystem stabilizes.

If the team prefers to start on Next.js 16, the primary changes to accommodate are noted in the Breaking Changes section below.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | **15.5.x LTS** | Full-stack React framework | App Router RSC + Supabase server client; LTS support through Oct 2026; stable ecosystem |
| React | **19.2.x** | UI runtime (Next.js 15.5 bundles it) | Required by Next 15+; React 19 includes `useActionState`, `use()`, View Transitions |
| TypeScript | **5.x** | Type safety | Required; minimum 5.1 for Next 15/16 |

### Database, Auth, Storage

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Supabase (hosted) | latest | Postgres + Auth + Storage + RLS | Single managed service; native RLS; free tier viable at launch; Auth is purpose-built for this (no NextAuth complexity) |
| `@supabase/supabase-js` | **^2.x** | Supabase JS client | Core client library |
| `@supabase/ssr` | **^0.x (beta)** | SSR-safe cookie-based auth for App Router | Provides `createBrowserClient` + `createServerClient`; official Supabase recommendation for Next.js App Router. Note: still marked beta — API may shift. Pin version in package.json. |
| Supabase CLI | **latest** | Local dev, migrations, type generation | `supabase start` runs full local stack; see Migrations section |

### Styling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | **v4.x** (4.0+ stable, Jan 2025) | Utility-first CSS | CSS-first config (`@import "tailwindcss"`); no `tailwind.config.js` required; 5x faster builds via Lightning CSS |
| shadcn/ui | **CLI v4** (March 2026) | Accessible component library | Copy-paste components; Tailwind v4 + React 19 + Next.js 15/16 support confirmed; `npx shadcn@latest init` |
| Inter (Google Fonts) | via `next/font` | Typography | Matches CONTEXT.md design spec; `next/font/google` for self-hosting |

### Forms & Validation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React Hook Form | **^7.x** | Form state management | Zero-dependency, minimal re-renders; shadcn/ui forms are built on it |
| Zod | **^3.x** (NOT v4 yet) | Schema validation | Stable RHF resolver support; Zod v4 has known `@hookform/resolvers` type compatibility issues (runtime works, TypeScript overloads break) — stay on v3 until resolvers fully stabilizes |
| `@hookform/resolvers` | **^3.x** | Bridge RHF + Zod | Required for `zodResolver()` |

**Note on Zod v4:** Zod 4 was released in 2025 and `@hookform/resolvers` v5.2+ claims support, but active GitHub issues show TypeScript overload failures with Zod v4.3.x. Pin Zod at `^3.x` for v1; evaluate upgrade after launch.

### Client State

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zustand | **5.0.x** | Client state management | Bear minimum API; React 19 compatible; use for filter state on `/bips`, bookmark state, map hover state |

### Animation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Motion (formerly Framer Motion) | **^12.x** | Animations | Rebranded; import from `motion/react` not `framer-motion`; React 19 compatible; v12.38.0 current; use for stat count-up, card hover lift, map tooltip |

**Breaking change:** The package is now `motion` on npm. Import: `import { motion } from 'motion/react'`. The old `framer-motion` package still exists and redirects but is deprecated.

### Email

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Resend | **^6.x** (6.12.3 current) | Transactional email | Purpose-built for React email templates; `react-email` integration; used for auth verification, BIP approval/rejection notifications |
| React Email | **latest** | Email template authoring | Component-based email templates that Resend renders; pairs with Resend SDK |

### Map (Settled Recommendation)

**Recommendation: `@vnedyalk0v/react19-simple-maps` (maintained fork of react-simple-maps)**

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@vnedyalk0v/react19-simple-maps` | **^2.x** (2.0.7 current) | Interactive Europe SVG map | Actively maintained React 19 fork; ESM-only, TypeScript-first; same declarative API as react-simple-maps |
| `topojson-client` | **^3.x** | TopoJSON → GeoJSON conversion | Needed to parse NUTS/Natural Earth TopoJSON files |
| `d3-geo` | **^3.x** | Map projections | Used internally by react19-simple-maps; may need direct use for custom projection |

**Why NOT raw D3:** D3 map requires imperative DOM manipulation that conflicts with React's declarative model. Requires `useRef` + `useEffect` with careful cleanup. Produces harder-to-maintain code for a team building an open-source repo where contributors need to understand the map code.

**Why NOT the original `react-simple-maps`:** Last published 4 years ago. Has a React 19 peer dependency conflict (`peerDependencies` only lists through React 18). Would require `--legacy-peer-deps` which is a red flag for an open-source project.

**Why NOT a tile-based map (Leaflet, MapLibre):** BipHub's map shows 29 Erasmus+ programme countries as colored regions — this is a choropleth, not a navigable tile map. SVG is correct; tile maps are overkill and introduce significant bundle size.

**EU GeoJSON Source:** Use the official Eurostat GISCO service NUTS 2024 dataset:
```
https://gisco-services.ec.europa.eu/distribution/v2/nuts/geojson/NUTS_RG_20M_2024_4326_LEVL_0.geojson
```
- LEVL_0 = country level (exactly what BipHub needs)
- 20M scale = appropriate resolution for homepage map (not too detailed, not too coarse)
- EPSG:4326 (WGS 84) = standard web coordinates
- Filter to the 33 Erasmus+ programme countries client-side from this dataset
- **Commit the filtered GeoJSON to `/public/eu-countries.geojson`** at ~50-80KB rather than fetching from GISCO at runtime

### Testing Stack

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vitest | **^4.x** (4.1.5 current; v5 beta available) | Unit + integration tests | Native ESM; Vite-powered; fastest test runner for Next.js projects; official Next.js docs recommend Vitest |
| `@vitejs/plugin-react` | **latest** | React support in Vitest | Required for JSX transform |
| `@testing-library/react` | **latest** | Component testing | Render + query components |
| `@testing-library/dom` | **latest** | DOM utilities | Required companion |
| `vite-tsconfig-paths` | **latest** | Path aliases in Vitest | Makes `@/components/...` imports work in tests |
| `jsdom` | **latest** | Browser environment simulation | Test environment for Vitest |
| Playwright | **latest** (`@playwright/test`) | E2E testing | Cross-browser (Chromium/Firefox/WebKit); official Next.js recommendation; critical for Server Actions, auth flows, BIP submission wizard |

**Testing philosophy for BipHub:**
- Unit tests (Vitest): Zod schemas, utility functions (slugify, ISCED mapping), date helpers
- Integration tests (Vitest + Testing Library): Form components, filter logic, BIP card rendering
- E2E tests (Playwright): Auth flow, BIP submission wizard, admin approve/reject, map interaction
- Do NOT write unit tests for async Server Components — use E2E instead (Next.js official guidance)

---

## Domain-Specific Libraries (gaps not in CONTEXT.md)

### Slug Generation

| Library | Version | Purpose |
|---------|---------|---------|
| `slugify` | **1.6.9** | BIP URL slug generation from title + city + year |

Use for: generating `/bip/sustainable-cities-budapest-2025` from submission data. Configure with `{ lower: true, strict: true }` to handle accented European characters (ü, ö, ą, etc.).

Alternative considered: `@sindresorhus/slugify` — ESM-only, requires extra configuration in Next.js. `slugify` is simpler for this use case.

### Country & Locale Data

| Library | Version | Purpose |
|---------|---------|---------|
| `i18n-iso-countries` | **^7.x** (7.14.0 current) | ISO 3166-1 country codes ↔ names |

Use for: validating `country` field in `universities` table, rendering country names from Erasmus codes, dropdown population. Covers all 33 Erasmus+ programme countries.

**Note:** Do not use a full i18n library (i18next, next-intl) for v1 — English only. `i18n-iso-countries` is just for data, not UI translation.

### ISCED Field Classification

No dedicated npm package needed. The 8 field categories in CONTEXT.md (Engineering, Business, Sciences, Arts & Design, Health, Social Sciences, Environment, Humanities) are a simplified grouping of ISCED-F 2013 broad fields. Implement as a TypeScript enum/constant in `/lib/isced.ts`:

```typescript
export const ISCED_FIELDS = [
  { id: 'engineering',        label: 'Engineering',        isced: '07' },
  { id: 'business',           label: 'Business',           isced: '04' },
  { id: 'sciences',           label: 'Natural Sciences',   isced: '05' },
  { id: 'arts',               label: 'Arts & Design',      isced: '02' },
  { id: 'health',             label: 'Health',             isced: '09' },
  { id: 'social-sciences',    label: 'Social Sciences',    isced: '03' },
  { id: 'environment',        label: 'Environment',        isced: '08' },
  { id: 'humanities',         label: 'Humanities',         isced: '02' },
] as const;
```

No external dependency required.

### Full-Text Search (Postgres)

Use native Postgres full-text search via Supabase — no external search service needed for v1 at BipHub's scale.

**Implementation:**
1. Enable `unaccent` extension in Supabase (available in managed Postgres): handles accented European characters (searching "Munchen" finds "München")
2. Add a `tsvector` generated column to the `bips` table combining `title`, `description`, and joined university name
3. Create a GIN index on the tsvector column
4. Query via Supabase `.textSearch('search_vector', query, { type: 'websearch' })`

```sql
-- In migration file
CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE bips ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', unaccent(coalesce(title, ''))), 'A') ||
    setweight(to_tsvector('english', unaccent(coalesce(description, ''))), 'B')
  ) STORED;

CREATE INDEX idx_bips_search ON bips USING GIN(search_vector);
```

**Why not Typesense/Algolia/Meilisearch for v1:** Overkill. BipHub v1 will have 20-500 BIPs. Postgres FTS with unaccent handles this scale with zero additional infrastructure cost. Revisit at 10K+ BIPs.

### CSV Import Tooling (Seed Data)

| Library | Version | Purpose |
|---------|---------|---------|
| `csv-parse` | **^6.x** (6.2.1 current) | Parse CSV files for seeding from erasmusbip.org scrape |

Use only in scripts (`/scripts/import-bips.ts`), not in the application bundle. Combine with `tsx` to run TypeScript scripts directly:

```bash
npx tsx scripts/import-bips.ts
```

---

## ISR / Revalidation Strategy (Settled)

**Recommendation: On-demand revalidation via Supabase Database Webhooks → Next.js Route Handler**

### Strategy for `/bip/[slug]` (detail pages)

```
Supabase DB event (INSERT/UPDATE/DELETE on bips table, status = 'approved')
  → Supabase Database Webhook (HTTP POST)
  → Next.js Route Handler: /app/api/revalidate/route.ts
  → revalidateTag('bips') + revalidateTag(`bip-${slug}`)
```

Pages are statically generated at build time. They stay stale until a webhook fires, then revalidate on next request.

**In Next.js 15 (App Router):**
```typescript
// app/api/revalidate/route.ts
import { revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-revalidation-secret')
  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  revalidateTag('bips')
  if (body.record?.slug) {
    revalidateTag(`bip-${body.record.slug}`)
  }
  return NextResponse.json({ revalidated: true })
}
```

**If building on Next.js 16:** The signature changes to `revalidateTag('bips', 'max')` (second argument required, SWR profile). Use `'max'` for BIP content (long-lived, eventual consistency is acceptable).

### Strategy for `/bips` (listing page)

Same webhook → `revalidateTag('bips')`. The listing page is also statically generated and revalidates on BIP approval events.

**Fallback:** Add `revalidate = 3600` (1-hour time-based) as a safety net in case the webhook misses an event:
```typescript
export const revalidate = 3600
```

### Why not streaming / time-based only?

- **Time-based only (every N seconds):** BIP data changes infrequently (admin approvals). A 1-hour revalidation cycle means newly approved BIPs could be hidden for up to 1 hour. Bad UX for universities who just got their BIP approved.
- **Streaming (React Suspense + dynamic):** Homepage and `/bips` listing are core SEO pages. They must be statically rendered for Lighthouse > 90. Streaming bypasses static generation.
- **On-demand webhook:** Near-instant updates after admin approval, static performance otherwise. This is the correct pattern.

---

## Supabase Local Dev Workflow

The goal from CONTEXT.md: single `supabase start` + `npm run dev`.

### Setup Pattern

```bash
# Prerequisites: Docker Desktop running
npm install -D supabase

# Initialize (one-time)
npx supabase init

# Start local stack (Postgres + Auth + Storage + Studio at localhost:54323)
npx supabase start

# Apply migrations + seed data
npx supabase db reset

# Generate TypeScript types from schema
npx supabase gen types typescript --local > lib/supabase/database.types.ts
```

### Migration Workflow

All schema changes go through migration files. Two approaches:

**Option A (Code-first, recommended for open source):**
```bash
npx supabase migration new create_bips_table
# Edit supabase/migrations/<timestamp>_create_bips_table.sql
npx supabase db reset  # applies all migrations + seed.sql
```

**Option B (Dashboard-first):**
```bash
# Make changes in Supabase Studio at localhost:54323
npx supabase db diff --schema public -f my_change_name
# Auto-generates migration SQL from diff
npx supabase db reset
```

**Recommended for BipHub:** Option A. Open-source contributors need to understand the schema by reading migration files, not by reverse-engineering a Supabase dashboard. Write readable, commented SQL migrations.

### File Structure

```
/supabase
  /migrations
    00001_create_universities.sql
    00002_create_profiles.sql
    00003_create_bips.sql
    00004_create_bip_partners.sql
    00005_add_full_text_search.sql
    00006_add_rls_policies.sql
  seed.sql        ← 20+ sample BIPs for local dev
  config.toml     ← local Supabase config
```

### `.env.local` for Local Dev

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase status>
SUPABASE_SERVICE_ROLE_KEY=<from supabase status>
REVALIDATION_SECRET=dev-secret-local
RESEND_API_KEY=re_... (use Resend test mode for local dev)
```

### `package.json` scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "db:start": "supabase start",
    "db:reset": "supabase db reset",
    "db:types": "supabase gen types typescript --local > lib/supabase/database.types.ts",
    "db:migrate": "supabase migration new",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

**CONTRIBUTING.md one-liner:** `npm run db:start && npm run db:reset && npm run dev`

---

## Complete Installation Reference

### Production Dependencies

```bash
# Core framework
npm install next@"^15.5" react@"^19" react-dom@"^19" typescript

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Styling (shadcn installs Tailwind v4 automatically)
npx shadcn@latest init

# Forms & validation
npm install react-hook-form zod@"^3" @hookform/resolvers

# State
npm install zustand

# Animation
npm install motion

# Email
npm install resend react-email @react-email/components

# Map
npm install @vnedyalk0v/react19-simple-maps topojson-client d3-geo
npm install -D @types/topojson-client @types/d3-geo

# Utilities
npm install slugify i18n-iso-countries
```

### Development Dependencies

```bash
# Supabase CLI
npm install -D supabase

# Testing — unit/integration
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/dom vite-tsconfig-paths jsdom

# Testing — E2E
npm install -D @playwright/test
npx playwright install --with-deps chromium  # minimum; add firefox/webkit for CI

# CSV import (scripts only, not app bundle)
npm install -D csv-parse tsx

# Type generation helper
npm install -D @types/node
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Next.js version | 15.5.x LTS | 16.2.x | Ecosystem rough edges: Supabase SSR Math.random() issue, Zod/RHF resolver instability, `proxy.ts` naming unfamiliar to contributors |
| Map library | `@vnedyalk0v/react19-simple-maps` | Raw D3 | D3 is imperative + DOM-manipulating; harder to maintain in React; no benefit for a choropleth with 29 regions |
| Map library | `@vnedyalk0v/react19-simple-maps` | Original `react-simple-maps` | Unmaintained (4 years); React 19 peer dep conflict; would require `--legacy-peer-deps` |
| Map library | `@vnedyalk0v/react19-simple-maps` | Leaflet / MapLibre | Tile maps are wrong tool for country choropleth; ~300KB heavier; no benefit |
| Search | Postgres FTS + unaccent | Typesense / Algolia | Overkill at <500 BIPs; adds infra cost and operational complexity |
| Validation | Zod v3 | Zod v4 | Active type-system issues with `@hookform/resolvers`; upgrade post-launch |
| Auth | Supabase Auth | NextAuth | NextAuth adds complexity without benefit when Supabase RLS is the access-control layer |
| Animation | `motion` v12 | `framer-motion` v11 | `framer-motion` is deprecated alias; `motion` is the correct package |
| Testing | Vitest + Playwright | Jest + Cypress | Vitest is 10x faster with native ESM; Playwright has better Next.js integration than Cypress; official Next.js recommendation |
| State | Zustand | Jotai / Redux | Zustand is simpler for BipHub's needs (filter state, bookmark list); Redux is overkill; Jotai is fine but Zustand more widely known for open source |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `framer-motion` (old package name) | Deprecated alias; still works but importing `motion/react` from `motion` package is the correct 2026 path | `motion` package, `import { motion } from 'motion/react'` |
| `react-simple-maps` (original) | Unmaintained 4 years; React 19 peer dep conflict | `@vnedyalk0v/react19-simple-maps` |
| `next-auth` / Auth.js | Supabase Auth + RLS is the native stack; NextAuth fights Supabase's session model | `@supabase/ssr` + Supabase Auth |
| `@supabase/auth-helpers-nextjs` | Deprecated; replaced by `@supabase/ssr` | `@supabase/ssr` |
| Prisma | Supabase uses its own type-safe client; Prisma adds a third ORM layer with schema sync complexity | `@supabase/supabase-js` with generated types |
| Zod v4 (for now) | `@hookform/resolvers` TypeScript overload issues with Zod 4.3.x; runtime works but TS errors appear in strict mode | Zod v3 (`^3.x`) |
| `next lint` command | Removed in Next.js 16; deprecated in 15.5 | `eslint` directly or Biome |
| `experimental.ppr` flag | Removed in Next.js 16; evolved into Cache Components model | `cacheComponents: true` in Next.js 16 if upgrading |
| `middleware.ts` (in Next.js 16) | Deprecated; renamed to `proxy.ts` | `proxy.ts` with exported `proxy` function (if on Next.js 16) |
| `serverRuntimeConfig` / `publicRuntimeConfig` | Removed in Next.js 16 | `.env` files |

---

## Breaking Changes to Know (Next.js 15 → 16 upgrade path)

If the project starts on 15 and upgrades to 16 post-launch, the main things to change:

| Change | Action Required |
|--------|----------------|
| `middleware.ts` → `proxy.ts` | Rename file; rename exported function to `proxy` |
| `revalidateTag(tag)` → `revalidateTag(tag, 'max')` | Add second argument to all calls |
| Sync `params`/`searchParams` access | Must `await params`, `await searchParams` (already required in Next 15, enforced in 16) |
| Sync `cookies()`/`headers()`/`draftMode()` | Must `await cookies()` etc. |
| `serverRuntimeConfig` | Replace with `process.env.VARIABLE` via `.env` files |
| `next lint` script | Replace with `eslint` directly in `package.json` |
| Turbopack as default | No action needed; it's the new default |
| Node.js minimum | Must be 20.9+ (from 18+) |
| TypeScript minimum | Must be 5.1+ (was already required in 15) |
| Supabase SSR Math.random() issue | Watch for fix in `@supabase/ssr`; workaround: wrap `createBrowserClient` in Suspense |

Run `npx @next/codemod@canary upgrade latest` for automatic migration.

---

## Version Compatibility Matrix

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `next` | ^15.5 | `react@^19`, `react-dom@^19` | Node 18+ required |
| `@supabase/ssr` | ^0.x | `next@^15` | Beta; pin exact minor version |
| `@supabase/supabase-js` | ^2.x | Any Next.js | Stable |
| `motion` | ^12.x | `react@^19` | Import from `motion/react` |
| `@vnedyalk0v/react19-simple-maps` | ^2.x | `react@^19` | ESM-only; needs Next.js transpilePackages if needed |
| `shadcn/ui` (components) | CLI v4 | Tailwind v4, Next.js 15/16 | March 2026 release |
| `tailwindcss` | ^4.x | Next.js 15/16, PostCSS | CSS-first config; no `tailwind.config.js` |
| `zod` | ^3.x | `@hookform/resolvers@^3.x` | Do NOT use v4 yet |
| `vitest` | ^4.x | Next.js 15/16 | Does not support async Server Components |
| `@playwright/test` | latest | Next.js 15/16 | Use for async Server Component scenarios |

---

## Sources

- [Next.js 16 release blog](https://nextjs.org/blog/next-16) — breaking changes, Cache Components, proxy.ts, Turbopack stable (HIGH confidence)
- [Next.js 15.5 release blog](https://nextjs.org/blog/next-15-5) — Turbopack builds beta, Node.js middleware stable, deprecation warnings for 16 (HIGH confidence)
- [GitHub vercel/next.js releases](https://github.com/vercel/next.js/releases) — v16.2.6 confirmed as latest stable May 7, 2026 (HIGH confidence)
- [Next.js Vitest docs](https://nextjs.org/docs/app/guides/testing/vitest) — official setup; async Server Component limitation confirmed (HIGH confidence, fetched May 2026 docs)
- [shadcn/ui changelog 2026-03](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4) — CLI v4, React 19 + Tailwind v4 support (HIGH confidence)
- [react-simple-maps GitHub issue #367](https://github.com/zcreativelabs/react-simple-maps/issues/367) — React 19 peer dep conflict confirmed (HIGH confidence)
- [react19-simple-maps npm](https://www.npmjs.com/package/@vnedyalk0v/react19-simple-maps) — active fork, v2.0.7 (MEDIUM confidence — smaller project, watch for abandonment)
- [GISCO NUTS 2024 API](https://gisco-services.ec.europa.eu/distribution/v1/nuts-2024.html) — official EU geodata source (HIGH confidence)
- [Erasmus+ eligible countries](https://erasmus-plus.ec.europa.eu/programme-guide/part-a/eligible-countries) — 33 programme countries confirmed (HIGH confidence)
- [motion npm package](https://www.npmjs.com/package/framer-motion) — v12.38.0, React 19 compatible (HIGH confidence)
- [Zustand npm](https://www.npmjs.com/package/zustand) — v5.0.13, React 19 compatible (HIGH confidence)
- [Zod v4 / hookform/resolvers issue #842](https://github.com/react-hook-form/resolvers/issues/842) — TypeScript overload failure with Zod 4.3.x confirmed (HIGH confidence)
- [Supabase local dev docs](https://supabase.com/docs/guides/local-development/overview) — migration workflow, seed.sql pattern (HIGH confidence)
- [Supabase Next.js 16 issue #1846](https://github.com/supabase/supabase-js/issues/1846) — createBrowserClient Math.random() issue with Next.js 16 (MEDIUM confidence — may be resolved by time of build)
- [Resend npm](https://www.npmjs.com/package/resend) — v6.12.3, React 19 compatible (HIGH confidence)
- [csv-parse npm](https://www.npmjs.com/package/csv-parse) — v6.2.1 (HIGH confidence)
- [slugify npm](https://www.npmjs.com/package/slugify) — v1.6.9 (HIGH confidence)
- [i18n-iso-countries npm](https://www.npmjs.com/package/i18n-iso-countries) — v7.14.0 (HIGH confidence)
- [Tailwind CSS v4 release](https://tailwindcss.com/blog/tailwindcss-v4) — stable Jan 2025, CSS-first config (HIGH confidence)

---

*Stack research for: BipHub — Erasmus+ BIP directory platform*
*Researched: 2026-05-08*
