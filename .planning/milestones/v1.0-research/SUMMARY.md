# Project Research Summary

**Project:** BipHub
**Domain:** EU academic program directory — public Erasmus+ BIP discovery + coordinator submission + admin review
**Researched:** 2026-05-08
**Confidence:** HIGH

---

## Executive Summary

BipHub is a three-audience full-stack directory application: students discovering Erasmus+ BIPs, university coordinators self-listing them, and admins reviewing submissions before publication. The stack is already well-chosen (Next.js 15 App Router + Supabase + Tailwind v4 + shadcn/ui) and research confirms every major choice — with two important corrections: use `motion` not `framer-motion`, and use `@vnedyalk0v/react19-simple-maps` not the unmaintained original. The architecture follows a clear RSC-over-Client-Components pattern where server components fetch data and pass it as props, all mutations go through Server Actions with Zod validation, and Supabase RLS enforces authorization at the database layer.

The recommended build order resolves a conflict between Features research (which said auth must come before public discovery, since without coordinators there are no BIPs) and Architecture research (which said student-facing discovery should come first). The conflict dissolves when seeding is recognized as the bridge: the CONTEXT.md success metric of "20 real BIPs at launch" can be satisfied with manually SQL-seeded BIPs, making the discovery UI fully shippable and testable before the coordinator submission flow exists. Phase 1 therefore delivers the student-facing discovery experience against seed data; Phase 2 adds coordinator auth and submission so the pipeline becomes self-sustaining; Phase 3 adds admin review and email notifications to close the editorial loop; Phase 4 delivers static content, polish, and performance hardening.

The top risks in this project are security (RLS misconfiguration, `getSession()` vs `getClaims()` confusion), performance (GeoJSON bundled in JS, full motion import), and legal (EU 12-star emblem misuse, GDPR cookie consent, erasmusbip.org scraping ToS). All are well-understood and have clear prevention patterns — they must simply be addressed at the right phase rather than deferred. The data model requires 12 fields absent from CONTEXT.md's schema but confirmed by official Erasmus+ BIP forms; these must be added before the submission form wizard is built.

---

## Key Findings

### Stack — Confirmed

All CONTEXT.md technology choices are validated. Five picks are non-obvious and must be locked before any install commands are run:

- **Next.js 15.5.x LTS (not 16)** — Next.js 16 ships `proxy.ts` replacing `middleware.ts`, a changed `revalidateTag` signature, and a Supabase SSR `Math.random()` determinism issue. LTS support holds through October 2026.
- **`motion` package v12 (not `framer-motion`)** — `framer-motion` is the deprecated package name. Import: `import { motion } from 'motion/react'`.
- **Zod v3 (not v4)** — Zod 4 has active TypeScript overload failures with `@hookform/resolvers@^3.x` in strict mode. Pin at `^3.x` and re-evaluate post-launch.
- **`@vnedyalk0v/react19-simple-maps` fork** — the original `react-simple-maps` has a React 19 peer dependency conflict and has not been updated in 4 years. The fork is actively maintained, ESM-first, TypeScript-first, same API.
- **Postgres native FTS with `unaccent` extension** — at 20–500 BIPs, Postgres FTS with a GIN-indexed `tsvector` column handles the full search requirement with zero added infrastructure. `unaccent` normalizes European characters ("Munchen" finds "München").

**Complete locked stack:**

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.5.x LTS | Full-stack React framework (App Router, RSC, ISR) |
| React | 19.2.x | UI runtime (bundled by Next.js 15) |
| TypeScript | 5.x | Type safety (5.1 minimum) |
| Supabase (hosted) | latest | Postgres + Auth + Storage + RLS |
| `@supabase/supabase-js` | ^2.x | Supabase JS client |
| `@supabase/ssr` | ^0.x beta | SSR-safe cookie auth for App Router — pin minor version |
| Tailwind CSS | v4.x | Utility CSS (CSS-first config, no tailwind.config.js) |
| shadcn/ui | CLI v4 (March 2026) | Accessible components |
| Inter | via `next/font` | Typography — self-hosted (no Google Fonts request = no GDPR issue) |
| React Hook Form | ^7.x | Form state management |
| Zod | **^3.x** | Schema validation — DO NOT upgrade to v4 yet |
| `@hookform/resolvers` | ^3.x | RHF + Zod bridge |
| Zustand | 5.0.x | Client state (filter state, wizard draft, bookmark list) |
| `motion` | ^12.x | Animations — import from `motion/react` |
| Resend | ^6.x | Transactional email |
| React Email | latest | Email template authoring |
| `@vnedyalk0v/react19-simple-maps` | ^2.x | Europe choropleth map |
| `topojson-client` | ^3.x | TopoJSON parsing |
| `d3-geo` | ^3.x | Map projections |
| Vitest | ^4.x | Unit + integration tests |
| Playwright | latest | E2E tests |
| `slugify` | 1.6.9 | BIP URL slug generation |
| `i18n-iso-countries` | ^7.x | ISO country codes |
| `csv-parse` | ^6.x | Seed import scripts only |

**ISR strategy (resolved):** Call `revalidatePath()` directly inside `approveBipAction` and `rejectBipAction` Server Actions. No Supabase webhook needed. Add `revalidate = 3600` as time-based fallback.

**GeoJSON source:** Eurostat GISCO NUTS 2024, LEVL_0, 20M scale, EPSG:4326. Commit filtered TopoJSON to `/public/eu-countries.json`. Serve from Vercel CDN; fetch at runtime inside the map component (never import as a static module).

---

### Table Stakes vs Differentiators vs Anti-Features

**Must have — table stakes (v1):**
- Homepage: hero, interactive Europe map, category bar, stats, recent BIPs, how-it-works, university CTA
- `/bips` browse with card grid and URL-driven filters (country, field, language, date range, ECTS, open/closed)
- Full-text search with `unaccent`
- `/bip/[slug]` detail with ISR, `generateMetadata`, OG image
- Coordinator auth: register + email verify + login + logout + password reset
- Multi-step BIP submission wizard with auto-save
- Coordinator dashboard: status list, edit drafts, view rejection reason
- Admin review queue: approve/reject with note, edit any listing
- Email notifications on status change (Resend)
- "What is a BIP?" explainer page with FAQ

**Should have — differentiators (v1 additions beyond CONTEXT.md):**
- Filter by study level (Bachelor / Master / PhD)
- CEFR language level field on submission + display
- "Open to partner institutions only" flag
- Green travel eligible badge
- "Recently added" threshold logic: hide until ≥6 approved BIPs, show "be among the first" teaser below
- Canonical tag on `/bips` pointing to base URL regardless of query params
- OG image via `opengraph-image.tsx` collocated on `/bip/[slug]`

**Defer to v1.x:**
- Partner university invite flow
- Admin partner reconciliation UI
- "Request changes" admin action
- Edit approved BIPs with re-review trigger
- Institutional email domain validation
- JSON-LD structured data

**Defer to v2+:**
- Cross-device bookmarks / BIP list sharing by URL
- Public API
- Multilingual UI
- PDF export, university photo uploads, student deadline reminders

**Anti-features — do not build:**
- BIP reviews or star ratings
- In-platform application submission
- University-to-university messaging
- Student accounts with server-side saved BIPs
- "Erasmus+ official verified" badges

---

### Data Model Additions Required Before Submission Form Is Built

12 fields confirmed by official Erasmus+ BIP forms, absent from CONTEXT.md schema:

| Column | Type | Notes |
|--------|------|-------|
| `study_levels` | `text[]` | Bachelor / Master / PhD multi-select |
| `virtual_timing` | `text` (enum) | Before / During / After / combinations |
| `language_level_min` | `text` | CEFR: A1–C2 |
| `partner_institutions_only` | `boolean` | Restricts to partner HEI students |
| `green_travel` | `boolean` | Official Erasmus+ grant category |
| `inclusion_support` | `boolean` | Official Erasmus+ inclusion framework |
| `accommodation_notes` | `text` (nullable) | Optional coordinator note on cost |
| `contact_name` | `text` | Named contact separate from how_to_apply |
| `contact_email` | `text` | May differ from how_to_apply_value |
| `isced_f_code` | `text` | 4-digit ISCED-F 2013 code alongside `subject_area` |
| `host_city` | `text` | Already in mockup cards; needs explicit column |
| `virtual_sessions_count` | `integer` (nullable) | Optional coordinator context |

The `bip_partner_universities` junction table also needs: `partner_name_raw`, `partner_erasmus_code_raw`, `partner_country_raw` text columns alongside the existing `university_id` FK (nullable) for free-text partner entry.

---

### Architecture Decisions

Four route groups, single root layout. Route group layouts are nested, not root — multiple root layouts cause full page reloads between groups.

| Decision | Detail |
|----------|--------|
| Single root `app/layout.tsx` | Route group layouts only add group-specific chrome on top |
| RLS roles via `app_metadata` | Stored in `profiles.role` AND mirrored to `app_metadata.role` via Postgres trigger; read from JWT in RLS policies |
| `getClaims()` everywhere in server code | Never `getSession()` in middleware, RSC, or Server Actions — does not validate JWT signature |
| Server Actions for all mutations | No API routes for coordinator/admin writes; Zod validation server-side; `revalidatePath()` called directly inside actions |
| RSC fetches data, passes as props | Client components never re-fetch what RSC already provides; eliminates loading flashes |
| URL as filter state for `/bips` | `searchParams` → RSC initial render; `useRouter().push()` → URL update; `useSearchParams()` → Client refetch |
| `<EuropeMap>` data flow | Homepage RSC computes `countsByCountry: Record<string, number>`, passes as prop; map never self-fetches |
| Admin panel: same app, `(admin)` route group | Protected at three independent layers: middleware, layout, RLS |
| `dynamic(() => import(), { ssr: false })` for `<EuropeMap>` | Map requires browser SVG; must be lazy-loaded |

---

### Top Pitfalls — Grouped

**Security (foundation phase — never recoverable cheaply):**

1. **`getSession()` vs `getClaims()` in server code** — `getSession()` trusts cookies without JWT signature validation. Use `getClaims()` in all middleware, RSC, and Server Actions.
2. **RLS disabled on new tables** — any table without `ENABLE ROW LEVEL SECURITY` is fully readable via the anon key. Encode RLS + deny-all in migration template.
3. **UPDATE policy missing `WITH CHECK`** — without `WITH CHECK`, coordinators can reassign `created_by` to another user. Every UPDATE policy needs both clauses.
4. **Service-role client outside `(admin)` route group** — two named client factories; lint rule prevents `createAdminClient` import outside admin paths.

**Performance (homepage build phase — Lighthouse catches on first audit):**

5. **GeoJSON imported into JS bundle** — 500KB–2MB destroys LCP. Use `dynamic(() => import(), { ssr: false })` + TopoJSON fetched at runtime.
6. **Full `motion` import without `LazyMotion`** — 34KB gzipped floor. Use `LazyMotion` + `domAnimation` + `m.*` components.
7. **Dynamic Tailwind class names purged in production** — Tailwind v4 static scanner cannot resolve template literals. Use complete class strings in lookup objects; safelist EU fill intensity classes.
8. **N+1 queries on BIP listing** — use PostgREST relational embedding so university data is joined in a single query.

**Legal (Phase 1 — cannot be deferred post-launch):**

9. **EU 12-star emblem misuse** — logo star count must not be 12. Document in `CONTRIBUTING.md` and PR checklist. Footer disclaimer on every page.
10. **GDPR cookie consent absent** — BipHub explicitly targets EU users. Use `next/font` for Inter (no Google cross-origin request). Lightweight consent banner before analytics load.

**DX (auth setup phase — wastes hours if discovered late):**

11. **`cookies()` without `await` (Next.js 15)** — compiles silently, does nothing; session cookies never set. Every server Supabase client factory must use `const cookieStore = await cookies()`.
12. **Middleware infinite redirect loop** — matcher must exclude `/login`, `/register`, `/auth/callback`, and static assets. Token refresh must happen before redirect logic.

---

## Recommended Phase Order — Vertical MVP

### Conflict Resolution

**Features research said:** Auth must come first — without coordinators submitting, there are no BIPs.
**Architecture research said:** Student-facing discovery should come first — validate core value before building the pipeline.
**Resolution:** The CONTEXT.md success metric is "20 real BIPs at launch." These can be manually SQL-seeded before any coordinator account system exists. Discovery with seed data is fully shippable and delivers real student value independently. Phase 1 = Discovery with seeded BIPs. Phase 2 = Coordinator auth + submission. Phase 3 = Admin review + email. Phase 4 = Polish.

---

### Phase 1: Discovery Foundation

**Goal:** Students can find and explore BIPs. Core value proposition is live and testable.

**Delivers:**
- Complete DB schema (all four tables with all 12 new fields)
- All RLS policies on all tables (security is not deferred)
- Full-text search: `unaccent` extension + `tsvector` GIN index
- Supabase local dev setup + `seed.sql` with 20 approved BIPs
- Auth infrastructure (client factories, middleware.ts) — built now, used in Phase 2
- Root layout + `(public)` layout (StickyNav + Footer)
- Homepage RSC: hero, `<EuropeMap>`, `<CategoriesBar>`, `<StatsSection>`, `<RecentBips>` with ≥6-BIP threshold, how-it-works, university CTA
- `/bips` page: RSC shell + `<BipFilters>` + `<BipGrid>`, all filters, URL-driven state, canonical tag, search
- `/bip/[slug]` page: RSC, `generateMetadata`, ISR, `opengraph-image.tsx`
- localStorage bookmarks, share button

**Pitfalls addressed:** EU emblem check, GDPR (Inter via `next/font`, consent baseline), footer disclaimer, `LazyMotion`, `dynamic()` + TopoJSON for map, Tailwind safelist, canonical tag, RLS policies + `WITH CHECK` on all UPDATE policies

**Dependencies:** None
**Research flag:** Standard patterns — no research phase needed

---

### Phase 2: Coordinator Auth + Submission

**Goal:** University coordinators can register and submit BIPs. The database pipeline becomes self-sustaining.

**Delivers:**
- `(auth)` route group: login, register, verify-email pages + auth/callback route handler
- LoginForm + RegisterForm client components (RHF + Zod v3)
- Server Actions: `signIn`, `signUp`, `signOut`
- `(dashboard)` route group with server-side auth guard
- Coordinator dashboard: BIP status list, edit drafts, view rejection reason
- `<BipSubmissionWizard>`: 5 steps, Zustand draft store, debounced auto-save, `updated_at` optimistic locking
- Server Actions: `saveDraftAction`, `submitBipAction`
- `onAuthStateChange` listener + localStorage draft backup (session expiry protection)
- Partner university free-text entry (Step 3)
- `bip_partner_universities` upsert logic

**Pitfalls addressed:** `getClaims()` in all Server Actions, `await cookies()`, middleware infinite redirect, session expiry during form, two-tab draft conflict

**Dependencies:** Phase 1 (schema, RLS, auth infrastructure)
**Research flag:** Standard patterns — no research phase needed

---

### Phase 3: Admin Review + Email Notifications

**Goal:** Admin closes the editorial loop. Coordinators receive status notifications.

**Delivers:**
- `(admin)` route group with role guard (middleware + layout + RLS)
- Admin review queue (RSC, pending BIPs)
- `/admin/bips/[id]/review`: full detail + approve/reject
- Server Actions: `approveBipAction`, `rejectBipAction` with state machine validation
- Confirmation modal on approve/reject (BIP title shown)
- `bip_status_history` audit log table + insert in actions
- `revalidatePath()` in approve/reject actions (ISR bust for `/bips` + `/bip/[slug]`)
- Resend email: coordinator notified on approval/rejection; admin notified on new submission
- Admin edit (reuse wizard in admin context)
- View all listings with status filter + basic analytics
- `createAdminClient` isolation enforcement

**Pitfalls addressed:** Confirmation modal + audit log on status transitions, state machine (no direct `rejected → approved`), `createAdminClient` lint rule, `security_invoker = true` on analytics views

**Dependencies:** Phase 1 (schema, RLS), Phase 2 (coordinator auth, submission)
**Research flag:** Standard patterns — no research phase needed

---

### Phase 4: Polish + Static Content + Performance Hardening

**Goal:** Everything that exists works perfectly. Lighthouse > 90. Open-source ready.

**Delivers:**
- `/what-is-a-bip` static RSC page with FAQ (`force-static`)
- `CONTRIBUTING.md`: setup instructions, EU emblem prohibition, code review checklist
- `.env.example` with placeholder values only + pre-commit secret scanning hook
- GDPR: cookie consent banner, privacy policy page, `deleteAccount` Server Action (anonymize approved BIPs, delete drafts + profile)
- Lighthouse audit + bundle analyzer report on all page types
- `<BipFilters>` in `<Suspense>` boundary (required by `useSearchParams()`)
- Accessibility audit: map keyboard nav (country `<select>` fallback), ARIA labels
- OG image fallback for homepage and `/bips`
- `package.json` scripts: `db:start`, `db:reset`, `db:types`, `db:migrate`, `test`, `test:e2e`
- E2E tests (Playwright): auth flow, submission wizard, admin approve/reject, map click-to-filter

**Pitfalls addressed:** `deleteAccount` GDPR right to erasure, FK cascade policy, full "looks done but isn't" checklist across all pages

**Dependencies:** Phases 1–3 complete
**Research flag:** Standard patterns — no research phase needed

---

### Phase Ordering Rationale

- **Seed-first unlocks parallel value.** Phase 1 ships student-facing discovery using seed data. Feedback arrives before the coordinator pipeline is built.
- **Schema completeness in Phase 1 prevents rework.** All 12 new data model fields added before the submission wizard (Phase 2).
- **Auth infrastructure in Phase 1, auth UI in Phase 2.** Supabase client factories and middleware.ts built in Phase 1; login/register UI when coordinators need it.
- **Admin comes after submission.** Cannot approve what hasn't been submitted.
- **Polish last.** Static content + compliance polish carry least delivery risk if sequenced last.

---

## Resolved Open Questions

| Question | Resolution |
|----------|------------|
| ISR strategy | `revalidatePath()` in `approveBipAction` / `rejectBipAction` Server Actions directly. No webhook. Add `revalidate = 3600` time-based fallback. |
| Partner universities not registered | Free-text columns (`partner_name_raw`, `partner_erasmus_code_raw`, `partner_country_raw`) in `bip_partner_universities` alongside nullable `university_id` FK. Admin reconciliation UI deferred to v1.x. |
| Admin panel placement | Same Next.js app, `(admin)` route group. Protected at three independent layers. Separate app is overkill for v1. |
| Map library | `@vnedyalk0v/react19-simple-maps` — only React 19-compatible fork with same declarative API. |
| Seed data strategy | Manual SQL seed via `supabase/seed.sql` / Supabase Studio for production. 20 BIPs from direct coordinator outreach as baseline. Do NOT scrape erasmusbip.org until ToS reviewed. |
| "Recently added" empty state | Hide section until ≥6 approved BIPs. Below threshold: static "be among the first" teaser in section's place. Stats block shows real numbers (honest, not inflated). |

---

## Remaining Open Questions

1. **Logo star count** — must verify the logo's star ring uses a count other than 12 before Phase 1 homepage build. Document in `CONTRIBUTING.md`.
2. **erasmusbip.org ToS for scraping legality** — review ToS and contact operators before any scraping script is written. Fallback: full coordinator-outreach seed strategy.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All choices verified against official docs + npm as of 2026-05-08. Two CONTEXT.md corrections confirmed. |
| Features | HIGH | Official Erasmus+ programme guide + multiple real university BIP listings. 12 missing fields confirmed across multiple sources. |
| Architecture | HIGH | Official Supabase SSR + Next.js 15 App Router patterns. RLS SQL verified against Supabase docs. |
| Pitfalls | HIGH | Security from official Supabase docs; performance from bundlephobia + community; legal from EC official guidance. |

**Overall confidence: HIGH**

### Gaps to Address During Implementation
- `@supabase/ssr` is `^0.x` beta — pin exact minor version; monitor changelog before upgrading
- `@vnedyalk0v/react19-simple-maps` is a smaller project — monitor for activity; fallback plan is raw D3 with `useEffect`
- Zod v4 / `@hookform/resolvers` compatibility — recheck before Phase 2 starts; issues may resolve

---
*Research completed: 2026-05-08*
*Ready for roadmap: yes*
