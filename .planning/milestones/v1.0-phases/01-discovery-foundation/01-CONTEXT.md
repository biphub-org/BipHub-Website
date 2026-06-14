# Phase 1: Discovery Foundation - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 ships the complete student-facing discovery experience against 20 SQL-seeded BIPs. By end of phase a student can: open the homepage and see the interactive Europe map / category bar / live stats / recently-added BIPs against real-feeling data; browse `/bips` with seven filters and full-text search; open a BIP detail page at `/bip/[slug]` with SSR meta tags + per-BIP OG image; share via Web Share API (or clipboard fallback) and bookmark via localStorage. All Supabase tables ship with RLS enabled and `WITH CHECK` on every UPDATE policy. Auth client factories and `middleware.ts` are built now (used in Phase 2). Coordinator submission, dashboard, admin review, email notifications, GDPR consent banner, the `/what-is-a-bip` page, and Playwright E2E coverage all belong to later phases.

</domain>

<decisions>
## Implementation Decisions

### `/bips` browse UX (Area 1)
- **D-01: Filter layout — left sidebar on desktop (~280px), bottom slide-up drawer on mobile.** Search bar lives above the grid in the main column (separate from the sidebar). All seven filters (country, ISCED field, language, date range, ECTS, application status, study level) render in the sidebar, always visible on desktop.
- **D-02: Numbered pagination, 24 BIPs per page, `?page=N` in URL.** No infinite scroll, no load-more button. Each page is independently shareable and SEO-indexable; the footer remains reachable.
- **D-03: Default sort = deadline soonest** (Claude's call). Sort dropdown lives next to the results count above the grid; full options are deadline soonest / newest / alphabetical. Sort selection participates in URL state (`?sort=...`).
- **D-04: Empty state on no-match filters = "Clear filters" button + "Browse all BIPs" link** (Claude's call). No coordinator CTA (the flow doesn't exist in Phase 1; would dead-end). No email-signup tease (that's a v2 feature). Tone: neutral, helpful.

### Europe map at launch scale (Area 2)
- **D-05: Choropleth uses small fixed bins, NOT the mockup's 50/100/200 thresholds** (Claude's call). Tier scale: `0` → pale gray, `1`, `2–3`, `4–6`, `7–10`, `11+`. Tier semantics are stable across the dataset's lifetime; rebinning later is a single config edit. Avoids quantile-binning's "tier meaning shifts over time" landmine and the two-implementation cost of "quantile now, fixed later."
- **D-06: 0-BIP countries render in pale gray with hover tooltip "0 BIPs yet"** — neutral copy, no upsell. Click is disabled (or routes to `/bips?country=XX` showing the empty state from D-04).
- **D-07: Tailwind safelist must include all six fill classes** for the map intensity tiers (this is already a known landmine in `.planning/research/PITFALLS.md`; reaffirmed here).
- **D-08: Country list `<select>` fallback for keyboard users** (FOUN-03 / WCAG AA) lives inside the map component; keyboard users see a `<select>` of all 29 Erasmus+ countries with the same click-to-filter behavior.

### Detail page layout + share/bookmark (Area 3)
- **D-09: 2-column layout on desktop with a 340px sticky right sidebar.** Sidebar contains: deadline countdown ("⏱ 14d left"), Apply CTA, key facts list (ECTS, dates, language, CEFR level, host city). Main column holds title, description, learning outcomes, virtual component, partner universities, how-to-apply.
- **D-10: Mobile/tablet (<1024px breakpoint) collapses to single column with a sticky bottom Apply bar.** The bottom bar contains only the Apply CTA — the deadline countdown and key facts inline into the page flow.
- **D-11: Share button uses Web Share API where supported, silent fallback to copy-to-clipboard with toast** (Claude's call). Single affordance — feature-detected at component mount, behavior adapts at runtime. No separate Copy button.
- **D-12: Bookmark UI = heart icon top-right of every BipCard in lists + heart icon in the detail-page sidebar action row** (Claude's call). Filled when bookmarked, outline when not.
- **D-13: Bookmark storage = `localStorage["biphub:bookmarks"]` as a JSON array of slugs** (Claude's call). Hydrated via a small Zustand store on client mount to avoid RSC/client hydration mismatch (RSC renders all cards as un-bookmarked; client hydrates with localStorage state).
- **D-14: NO `/bookmarks` viewable list page in v1** — that's a new route that wasn't in REQUIREMENTS.md. Bookmarks are per-page toggle only. Cross-device sync and a viewable list are STUD-01 (deferred to v2).

### Seed catalog composition (Area 4)
- **D-15: Seed strategy = 20 plausible synthetic BIPs, clearly marked.** Real universities and real cities (TU Munich, KU Leuven, Bocconi, Sorbonne, etc.); fabricated program titles, dates, and contacts. Coordinator outreach for real BIPs runs in parallel as an off-platform task; real BIPs replace synthetic ones over time.
- **D-16: Add `is_seed boolean default false` column to `bips` table.** Every seeded row sets `true`. Easy to query, easy to bulk-delete when real data replaces it. UI renders a "Demo data" pill on cards and detail-page header where `is_seed = true`.
- **D-17: Seed distribution constraints (must hold simultaneously):**
  - 20 rows total, all `status = 'approved'` (so the Recently-Added ≥6-BIP threshold passes immediately).
  - All 8 ISCED-F category groups have ≥1 BIP (so `<CategoriesBar>` never has a 0-count card).
  - Spread across ≥10 of the 29 Erasmus+ countries — distribution roughly: 1 country at tier "4–6", ~2 countries at tier "2–3", ~5 countries at tier "1", remainder at tier "0" (so the choropleth shows tier variety, not a flat blue blob or empty gray).
  - Application status mix: ~12 with future deadlines (open), ~8 with past deadlines (closed) — exercises the open/closed filter.
  - Language mix: majority EN, a handful of DE / FR / ES / IT — exercises the language filter.
  - Study level mix: each row sets a multi-select `study_levels` covering Bachelor / Master / PhD with variation.
  - Green travel / inclusion support flags: ~30% of rows set each, so DETL-06 badges are visibly testable.
- **D-18: Sourcing legality posture:** No scraping of erasmusbip.org until ToS is reviewed (locked in `.planning/STATE.md` blockers). Synthetic data uses only publicly-known university/city names — not coordinator names or contact details.

### Claude's Discretion
The user delegated the following implementation calls during discussion (recorded in DISCUSSION-LOG.md):
- D-03 (default sort), D-04 (empty-state CTA): defaulted to deadline-soonest + clean clear-filters.
- D-05, D-06, D-07, D-08 (entire map scaling area): defaulted to fixed small-bin choropleth with neutral 0-BIP hover.
- D-11 (share fallback), D-12, D-13, D-14 (entire bookmark UX area): defaulted to heart icon + localStorage Zustand store, no viewable list page.
- All other D-numbered decisions are explicit user selections from AskUserQuestion responses.

If the user wants any of the delegated calls re-litigated, flag it before `/gsd-plan-phase 1` runs — they're cheaper to revise here than in PLAN.md.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level (always relevant)
- `CLAUDE.md` — project guide; locked-stack table; never-do list; visual + brand constraints.
- `CONTEXT.md` (repo root) — original founder brief; visual direction; v1 scope; data model sketch.
- `biphub-homepage.html` (repo root) — locked v1 visual mockup; do not deviate without user approval.
- `.planning/PROJECT.md` — synthesized project context; key decisions table; out-of-scope list.
- `.planning/REQUIREMENTS.md` — 76 v1 requirements with REQ-IDs; Phase 1 covers 37 of them (DISC-01..07, BROW-01..13, DETL-01..10, INFO-03, FOUN-01..04, FOUN-08, FOUN-09).
- `.planning/ROADMAP.md` §"Phase 1: Discovery Foundation" — goal, dependencies, success criteria, key deliverables.
- `.planning/STATE.md` — current blockers (logo star count ≠ 12; erasmusbip.org ToS; `@supabase/ssr` beta pin).

### Phase 1 research outputs (consumed by gsd-phase-researcher and gsd-planner)
- `.planning/research/SUMMARY.md` — synthesized research, locked stack, recommended phase order, resolved open questions.
- `.planning/research/STACK.md` — locked dependency versions and rationale.
- `.planning/research/FEATURES.md` — table-stakes vs differentiators vs anti-features; 12 added Erasmus+ data-model fields.
- `.planning/research/ARCHITECTURE.md` — route group layout, RLS roles via `app_metadata`, RSC-as-data-fetcher pattern, server-action-only mutations.
- `.planning/research/PITFALLS.md` — security (RLS, `getClaims` vs `getSession`, `WITH CHECK`), performance (GeoJSON, `motion` `LazyMotion`, dynamic Tailwind classes), legal (EU 12-star emblem, GDPR), DX (`await cookies()`, middleware redirect loop).

### Domain references
- Eurostat GISCO NUTS 2024 (LEVL_0, 20M scale, EPSG:4326) — official EU country boundaries; commit filtered TopoJSON to `/public/eu-countries.json` (per ARCHITECTURE.md).
- Erasmus+ KA131 official programme guide — funding rate (~€79/day), participant min/max (10/20), virtual-component requirement, ECTS framework. Cited in REQUIREMENTS.md.
- ISCED-F 2013 4-digit code reference — for `isced_f_code` column and `<CategoriesBar>` 8-category mapping.
- CEFR level reference (A1–C2) — for `language_level_min` column.

### No SPEC.md
This phase has no `/gsd-spec-phase`-generated SPEC.md. Requirements are captured in REQUIREMENTS.md and bounded in ROADMAP.md "Phase 1" section.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`biphub-homepage.html`** — full HTML/CSS reference for the homepage layout, EU palette tokens, eyebrow labels, gold underline accent, BIP card pattern, stat card pattern, hover transforms. Use as the source of truth for visual translation into JSX/Tailwind.
- **None other.** This is a greenfield repository — no JS/TS source code exists yet. The repo currently contains: `CLAUDE.md`, `CONTEXT.md`, `biphub-homepage.html`, and `.planning/`.

### Established Patterns
- **Stack is locked** (per CLAUDE.md never-do list): Next.js 15.5.x LTS, `motion` (not `framer-motion`), Zod v3 (not v4), `@vnedyalk0v/react19-simple-maps`, Tailwind v4, shadcn/ui, Inter via `next/font`. Researcher and planner do not need to relitigate.
- **Auth pattern is locked**: `getClaims()` everywhere server-side; `await cookies()` in every Supabase server client factory; never `getSession()` server-side.
- **Map pattern is locked**: `dynamic(() => import('./EuropeMap'), { ssr: false })`; TopoJSON fetched at runtime from `/public`; never imported as a static module.
- **Mutation pattern is locked**: Server Actions only for coordinator/admin writes; no API routes; Zod validation server-side.

### Integration Points
- **Supabase local dev**: planner must spec `supabase/migrations/`, `supabase/seed.sql`, and the four Supabase client factories (`lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, `lib/supabase/admin.ts`). The `admin.ts` factory is built in Phase 1 but only imported in Phase 3's `(admin)` route group.
- **Auth infrastructure**: `middleware.ts` matcher must already exclude `/login`, `/register`, `/auth/callback`, and static assets — even though those routes don't exist in Phase 1. Avoids re-edit risk in Phase 2.
- **`(public)` route group layout**: holds StickyNav + Footer (with mandatory non-affiliation disclaimer). Footer renders on every page, all four phases — must be built correctly now.
- **`opengraph-image.tsx` for `/bip/[slug]`**: ships in Phase 1. Composition (title + university + flag + EU palette gradient) is a planner call; recommend gold accent on the host city.

</code_context>

<specifics>
## Specific Ideas

- **Mockup is locked**: do not deviate visually from `biphub-homepage.html` without user approval. The 2-column detail page layout (D-09) does NOT exist in the mockup — it is new for `/bip/[slug]` only and was approved this session.
- **Logo star count must be ≠ 12** before the StickyNav/Footer is built (carry-forward from STATE.md blockers). The "EU-themed mark — blue square, gold star ring" described in CONTEXT.md should use 11 or 13 stars; researcher/planner: surface this as an acceptance check inside the homepage plan, with a CONTRIBUTING.md note (deferred to Phase 4 for the doc, but the visual constraint applies now).
- **"Fixed small-bin" choropleth scale (D-05)** is intentionally re-tunable. Planner should put the bin thresholds in a single `lib/map/bins.ts` const so the constant can be edited once when the dataset grows past 100 BIPs.
- **`is_seed` flag (D-16)** should NOT be exposed in the public API surface or RLS policies — it's a UI-rendering detail. RLS still treats `is_seed = true` rows as approved BIPs.

</specifics>

<deferred>
## Deferred Ideas

Captured during discussion but belong in other phases or v2+ — do not address in Phase 1.

- **`/bookmarks` viewable list page** — would expand DETL-09 beyond per-page toggle. Cross-device bookmark sync is already STUD-01 (v2). If the per-page UX proves insufficient post-launch, revisit as a v1.x route.
- **Empty-state coordinator CTA** ("Are you a coordinator? List a BIP") — would dead-end in Phase 1 (no coordinator flow exists). Reconsider for Phase 2 once the coordinator flow ships, OR for Phase 4 once the catalog is bigger.
- **Empty-state "notify me when added" email signup** — fits STUD-02 (student deadline reminders, v2). Out of v1 scope.
- **"Quantile now, fixed later" choropleth** — rejected this session in favor of fixed-bin (D-05). If the fixed scale proves unsatisfying once the dataset grows past 100 BIPs, the single-const re-tune in `lib/map/bins.ts` covers most realistic shifts. A fully relative fallback can be reconsidered then.
- **Coordinator outreach script + spreadsheet** — runs in parallel with build, not part of any GSD phase. The user owns this off-platform task.
- **Real-BIP data import** — when coordinator outreach yields real BIPs, replace `is_seed = true` rows with real entries and flip the flag. No code change needed; data-only.

</deferred>

---

*Phase: 1-Discovery Foundation*
*Context gathered: 2026-05-09*
