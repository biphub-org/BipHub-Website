# Walking Skeleton — BipHub

**Phase:** 1 — Discovery Foundation
**Generated:** 2026-05-09

## Capability Proven End-to-End

> A visitor can open `http://localhost:3000/` (served by `npm run dev` against a local Supabase started with `supabase start`) and see a static "BipHub" page that renders a live count of seed BIPs read from a `bips` table protected by Row Level Security.

That single round-trip exercises the full stack: Next.js 15 App Router (RSC) → `lib/supabase/server.ts` server client (with `await cookies()`) → Supabase Postgres anon-key SELECT under an RLS `SELECT` policy → render. If this works, every subsequent vertical slice is layering on top of a proven foundation.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 15.5.x LTS** App Router | Zod v3 + `@hookform/resolvers` compatibility; `@supabase/ssr` ships stable Next 15 examples; LTS support through Oct 2026; CLAUDE.md never-do list explicitly forbids Next.js 16 |
| Language / strict mode | TypeScript 5.x (`strict: true`) | Project standard; required by Next.js 15 |
| Data layer | **Supabase** (Postgres + Auth + Storage + RLS) — local stack via Supabase CLI | Native RLS as the authorization layer; no NextAuth; locked in CLAUDE.md |
| Supabase SSR adapter | `@supabase/ssr` (pinned exact minor — beta) | Official adapter for App Router cookie auth; pinned because still `^0.x` beta (per STATE.md) |
| Server-side auth call | `supabase.auth.getClaims()` everywhere server-side; **never** `getSession()` | `getClaims()` validates JWT signature; `getSession()` trusts cookies blindly (PITFALLS Pitfall 1 — CRITICAL) |
| Cookie API | `const cookieStore = await cookies()` in every server client factory | Next.js 15 made `cookies()` async; sync usage compiles silently and breaks auth (PITFALLS Pitfall 3) |
| Service-role isolation | `createAdminClient` lives ONLY in `lib/supabase/admin.ts`; **NEVER** imported outside `app/(admin)/**` (which doesn't exist in Phase 1) | Service-role key bypasses RLS; lint rule deferred to Phase 3 but file location is the trip-wire (PITFALLS Pitfall 7) |
| Styling | **Tailwind CSS v4** (CSS-first via `@import "tailwindcss"` and `@theme inline {}` in `app/globals.css`); no `tailwind.config.js` | Tailwind v4 is CSS-first — locked by UI-SPEC |
| Component library | **shadcn/ui CLI v4** — installed à-la-carte (Sheet, Drawer/Vaul, Sonner, Select, Popover, Accordion, Slider, Calendar, Skeleton, Tooltip — added in later plans as needed) | Locked in UI-SPEC |
| Font | **Inter** via `next/font/google` (subsets `['latin', 'latin-ext']`, weights 400/500/600/700, `display: 'swap'`, `variable: '--font-inter'`) — self-hosted by Next.js | Self-hosted = zero `fonts.googleapis.com` cross-origin request = no GDPR exposure (PITFALLS Pitfall 9). `latin-ext` required for "München", "Łódź" |
| Animation | **`motion`** package v12 (NOT `framer-motion`); `import { motion } from 'motion/react'`; every animated subtree wrapped in `<LazyMotion features={domAnimation} strict>` and uses `m.*` (not `motion.*`) | `framer-motion` is deprecated alias; `LazyMotion` keeps initial bundle ~4.6KB vs 34KB always-on (PITFALLS Pitfall 12) |
| Map library | **`@vnedyalk0v/react19-simple-maps`** (NOT original `react-simple-maps`) | Original is unmaintained 4 years and breaks with React 19; fork is ESM/TS-first |
| Map loading | `dynamic(() => import('./EuropeMap'), { ssr: false })`; TopoJSON fetched at runtime via `fetch('/eu-countries.json')` | Never import GeoJSON as a static module — would inline 500KB-2MB into the JS bundle and destroy LCP (PITFALLS Pitfall 11) |
| Forms / validation | `react-hook-form@^7` + `zod@^3` + `@hookform/resolvers@^3` | Zod v4 has TS overload failures with `@hookform/resolvers`; pin v3 (CLAUDE.md) |
| Client state | `zustand@5.0.x` — used for filter state on `/bips`, bookmark store on detail page, wizard draft in Phase 2 | Locked in research |
| Mutations | **Server Actions only** — no API routes for coordinator/admin writes; `'use server'` files in `lib/actions/`. Server Actions validate with Zod and call `revalidatePath()` directly inside approve/reject (no Supabase webhook) | Locked in research; simpler ISR than webhook chain |
| Slug generation | `slugify@1.6.9` with `{ lower: true, strict: true }` | Handles accented EU characters; locked in research |
| Country codes | `i18n-iso-countries@^7` | Used for ISO ↔ name lookups; locked in research |
| Full-text search | Native Postgres FTS — `unaccent` extension + `tsvector` STORED generated column with GIN index on `bips`; query via Supabase `.textSearch(..., { type: 'websearch' })` | Zero added infrastructure at <500 BIPs; "Munchen" finds "München" (BROW-09) |
| Deployment target | Vercel (preview deploy is documented in Phase 1 SUMMARY but the **runnable contract** is `supabase start && npm run dev` per FOUN-09) | CLAUDE.md states deploy on Vercel; Phase 1 Success Criterion 5 explicitly demands the local one-command flow |
| Directory layout | App Router with route groups: `app/(public)/`, `app/(auth)/` (Phase 2), `app/(dashboard)/` (Phase 2), `app/(admin)/` (Phase 3). Single root `app/layout.tsx`. Components in `components/` (subdirs `home/`, `bip/`, `forms/`, `admin/`, `ui/`). Library code in `lib/` (`supabase/`, `actions/`, `validations/`, `utils/`, `map/`, `isced.ts`, `countries.ts`). Migrations in `supabase/migrations/`, seeds in `supabase/seed.sql`. | Single root layout because navigating between multiple root layouts triggers a full reload in Next.js (ARCHITECTURE Anti-Pattern 2) |
| EU emblem compliance | Logo `<LogoMark>` uses **11 stars** (NEVER 12); footer shows "Independent project — not affiliated with the European Commission" on every page | EU 12-star emblem is restricted under EC visual identity rules (PITFALLS Pitfall 8 + STATE.md blocker) |
| Tailwind dynamic-class safety | Map fill tier classes (`fill-bip-tier-0`..`fill-bip-tier-5`) are stored as **complete string literals** in `lib/map/bins.ts` lookup objects — NEVER concatenated via template literals | Tailwind v4 static scanner cannot resolve template literals; classes get purged in production (PITFALLS Pitfall 13) |
| Canonical / SEO | `/bips` always declares `alternates.canonical = 'https://biphub.eu/bips'` regardless of query params; per-BIP OG image via `app/(public)/bip/[slug]/opengraph-image.tsx` (Satori) | Avoids duplicate-content SEO penalty for filter combos (PITFALLS Pitfall 14); per-BIP rich preview (DETL-10) |
| ISR | `/bips` and `/bip/[slug]` set `export const revalidate = 3600`; on-demand `revalidatePath()` is called from approve/reject Server Actions in Phase 3 | Phase 1 ships time-based ISR; Phase 3 layers on-demand bust |

## Stack Touched in Phase 1 (Walking Skeleton — Plan 01-01 only)

The skeleton in Plan 01 proves all five rails. Subsequent plans flesh out features without renegotiating the architecture.

- [x] **Project scaffold** — `npm init` → Next.js 15.5.x install → TypeScript strict → Tailwind v4 via shadcn CLI v4 init → `motion` + `@vnedyalk0v/react19-simple-maps` + `@supabase/supabase-js` + `@supabase/ssr` + RHF/Zod v3/resolvers + Zustand + slugify + i18n-iso-countries + topojson-client + d3-geo installed; ESLint + `npm run dev` + `npm run build` working
- [x] **Routing** — `app/layout.tsx` (root: Inter font, `<html lang="en">`, `<body class="font-sans bg-white text-ink antialiased">`) + `app/(public)/page.tsx` (one real route)
- [x] **Database** — `supabase init` + first migration creating `bips` table with `id`, `slug`, `title`, `is_seed`, `status`, `created_at`; RLS `ENABLE`d; one `SELECT` policy for anon (`status = 'approved'`); seed.sql inserts 1 row
- [x] **UI wired to API** — `app/(public)/page.tsx` is an async RSC that calls `createClient()` (server factory) → `supabase.from('bips').select('*', { count: 'exact', head: true }).eq('status', 'approved')` → renders the count in plain text
- [x] **Local-run contract** — `supabase start && npm run dev` boots the full stack; documented in README

## Out of Scope (Deferred to Later Slices in Phase 1)

These belong to Plans 01-02 through 01-08 within this same phase — listed here to make the skeleton's minimalism explicit:

- All 12 added Erasmus+ data-model fields (`study_levels`, `virtual_timing`, `language_level_min`, `partner_institutions_only`, `green_travel`, `inclusion_support`, `accommodation_notes`, `contact_name`, `contact_email`, `isced_f_code`, `host_city`, `virtual_sessions_count`) → Plan 01-02
- `universities`, `bip_partner_universities`, `profiles` tables and their RLS policies → Plan 01-02
- `unaccent` extension + `tsvector` GIN search index → Plan 01-02
- 20-row seed catalog with D-17 distribution constraints → Plan 01-03
- StickyNav + Footer + 11-star LogoMark + `(public)` layout → Plan 01-04
- Tailwind v4 `@theme inline` token map (full EU palette + 6 choropleth tiers + `--breakpoint-md: 60rem` override) → Plan 01-04
- Hero, EuropeMap, CategoriesBar, StatsSection, RecentBips (≥6 threshold), HowItWorks, UniversityCTA → Plan 01-05
- Eurostat GISCO TopoJSON committed to `/public/eu-countries.json` → Plan 01-05
- `/bips` page (BipFiltersSidebar, BipFiltersDrawer, BipSearchBar, BipSortControl, BipGrid, BipCard, BipPagination, BipsEmptyState) → Plan 01-06
- `/bip/[slug]` page (2-column desktop, sticky sidebar, mobile bottom apply bar, ShareButton, BookmarkHeartIsland, opengraph-image.tsx, BipNotFound) → Plan 01-07
- Auth client factories beyond the basic server.ts (full `lib/supabase/middleware.ts`, `lib/supabase/admin.ts`, expanded `middleware.ts` matcher, JWT `app_metadata.role` mirror trigger) → Plan 01-08

These belong to **later phases** (do NOT pull forward into Phase 1):

- Auth UI: `/login`, `/register`, `/auth/callback`, profile setup → Phase 2
- Coordinator dashboard, BIP submission wizard, server actions for write paths → Phase 2
- Admin route group, review queue, approve/reject actions, audit log, Resend email templates → Phase 3
- `/what-is-a-bip` static page, GDPR consent banner, privacy policy, account deletion, Playwright E2E suite, CONTRIBUTING.md → Phase 4
- `/bookmarks` viewable list page (deferred to v2 STUD-01 — not on any roadmap)

## Subsequent Slice Plan

Each later phase adds vertical slices on top of this skeleton without altering the architectural decisions above:

- **Phase 2: Coordinator Auth + Submission** — `(auth)` and `(dashboard)` route groups, login/register UI, BIP submission wizard, server actions for `signIn`/`signUp`/`saveDraftAction`/`submitBipAction`. Reuses `lib/supabase/server.ts`, `lib/supabase/client.ts`, and `middleware.ts` from Phase 1.
- **Phase 3: Admin Review + Email Notifications** — `(admin)` route group with triple-layer guard, `approveBipAction`/`rejectBipAction`, `bip_status_history` audit table, Resend templates, `revalidatePath()` calls. First place `lib/supabase/admin.ts` is actually imported.
- **Phase 4: Polish + Static Content + Performance Hardening** — `/what-is-a-bip`, GDPR cookie banner, privacy policy, `deleteAccount` with anonymization, Lighthouse > 90 audit, Playwright E2E suite, CONTRIBUTING.md (incl. EU emblem prohibition), `.env.example` + secret-scanning hook.
