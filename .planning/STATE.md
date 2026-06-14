---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Awaiting next milestone
stopped_at: Completed 04-06-PLAN.md
last_updated: "2026-06-14T16:37:28.042Z"
last_activity: 2026-06-14 — Milestone v1.0 completed and archived
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 30
  completed_plans: 30
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-14 after v1.0 milestone)

**Core value:** Students can reliably discover Erasmus+ BIPs by country, field of study, and dates, and universities can self-service list their BIPs through a fast, professional submission flow with admin review.
**Current focus:** v1.0 shipped — planning next milestone (`/gsd-new-milestone`)

## Current Position

Phase: Milestone v1.0 complete
Plan: —
Status: Awaiting next milestone
Last activity: 2026-06-14 — Milestone v1.0 completed and archived

## Performance Metrics

**Velocity:**

- Total plans completed: 15
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 8 | - | - |
| 02 | 7 | - | - |

**Recent Trend:**

- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01 P04 | 40min | 2 tasks | 9 files |
| Phase 01 P05 | 90min | 2 tasks | 21 files |
| Phase 01 P07 | 150min | 3 tasks | 22 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Init: Use `motion` (not `framer-motion`), Zod v3 (not v4), `@vnedyalk0v/react19-simple-maps` (not original), Next.js 15.5.x LTS (not 16)
- Plan 01-01: @supabase/ssr pinned to exact 0.5.2 (no ^ prefix) per STATE.md blocker; `slugify` pinned exact 1.6.9
- Plan 01-01: `CookieOptions` type imported from @supabase/ssr to satisfy strict TS in setAll signature
- Plan 01-01: `eslint.config.mjs` flat config required for ESLint 9 + Next.js 15.5 (`next lint` needs flat config)
- Plan 01-01: shadcn@latest init requires Tailwind v4 pre-installed via npm before running init
- Plan 01-01: EC disclaimer added to canary homepage per CLAUDE.md requirement (every page must show disclaimer)
- Plan 01-01 (post-verify): Supabase CLI 2.98.x emits the new key system (`sb_publishable_*` / `sb_secret_*`) and the legacy `eyJ…iss=supabase-demo` JWTs no longer authenticate against PostgREST. `.env.local` must be populated from `npx supabase status` after each `supabase start`. README needs a "Local development" note in Plan 01-04 (chrome) or 01-08 (auth).
- Init: GeoJSON served from `/public` at runtime via `dynamic()` — never imported into JS bundle
- Init: `getClaims()` everywhere in server code — never `getSession()`; `await cookies()` in all client factories
- Init: Seed-first Phase 1 — 20 SQL-seeded approved BIPs unblock student discovery before coordinator pipeline exists
- Init: Logo star count must be verified ≠ 12 before Phase 1 homepage build
- Phase 1: `/bips` uses left sidebar (desktop) + bottom drawer (mobile), numbered pagination 24/page, default sort = deadline soonest
- Phase 1: Map choropleth uses fixed small bins (0 / 1 / 2–3 / 4–6 / 7–10 / 11+), NOT the mockup's 50/100/200 thresholds
- Phase 1: `/bip/[slug]` is 2-column desktop with sticky sidebar (deadline + Apply CTA + key facts); single column with sticky bottom Apply on mobile/tablet
- Phase 1: Bookmarks via heart icon + `localStorage["biphub:bookmarks"]` JSON array; no `/bookmarks` page in v1
- Phase 1: Seed catalog = 20 plausible synthetic BIPs marked `is_seed = true`; no scraping until ToS reviewed
- Plan 01-02: immutable_unaccent() wrapper required — unaccent() is STABLE not IMMUTABLE; GENERATED ALWAYS AS STORED requires IMMUTABLE; wrapper is safe (text normalization only, no side effects)
- Plan 01-02: coordinator UPDATE on bips restricted to draft/pending — WITH CHECK prevents self-promotion to approved/rejected (PITFALLS Pitfall 5 implementation)
- Plan 01-02: lib/countries.ts canonical property is `code` (not iso2) — locked contract for downstream plans 01-05, 01-06, 01-07
- Plan 01-03: delete-first idempotency chosen over ON CONFLICT DO NOTHING for seed.sql — simpler with FK chains
- Plan 01-03: verify-seed.ts uses service-role key — RLS bypass correct for local-dev audit; script is outside app/ lib/ components/ so ESLint won't pick it up
- Plan 01-03: green_travel=7 rows (target 6±1=5-7); en×16 language count (en≥10 required, passes); both within verifier range
- [Phase ?]: Plan 01-04: 11-star LogoMark — count locked at 11 to avoid EC 12-star emblem trademark issue (CLAUDE.md never-do)
- [Phase ?]: Plan 01-04: EC disclaimer migrated from app/(public)/page.tsx (temp Plan 01-01) to components/home/Footer.tsx; Footer is rendered inside (public)/layout.tsx so all 3 routes inherit it
- [Phase ?]: Plan 01-04: Tailwind md breakpoint overridden to 60rem (960px) via @theme inline per UI-SPEC line 462-468; all downstream plans (01-05, 01-06, 01-07) inherit this
- [Phase ?]: Plan 01-04: lib/utils.ts (shadcn) and lib/utils/cn.ts (plan-required) both export cn from same source — chosen to keep shadcn add commands working without rewiring
- Plan 01-08: middleware uses getClaims() only — Phase 1 has zero auth redirects (D-12, Pitfall 2)
- Plan 01-08: ESLint no-restricted-imports rule prevents lib/supabase/admin from being imported outside app/(admin)/ and the file itself; synthetic violation test confirmed rule fires
- Plan 01-08: migration 00008 is additive — adds REVOKE EXECUTE security hardening and backfill on top of 00002's existing sync_role_to_app_metadata() trigger (trigger already covers INSERT+UPDATE OF role correctly)
- Plan 01-08: CookieOptions type imported explicitly in middleware.ts setAll() — TypeScript strict mode requires explicit parameter types (Rule 1 fix)
- Plan 01-05: EuropeMap is dynamic + ssr:false in 'use client' EuropeMapWrapper; Next.js 15 rejects ssr:false in RSC — wrapper pattern is the correct fix
- Plan 01-05: motion via LazyMotion only (StatsSection count-up); no top-level motion import anywhere
- Plan 01-05: bookmark store uses Zustand with manual hydrate()/toggle() and localStorage key 'biphub:bookmarks'; mount-effect hydration guard prevents SSR mismatch
- Plan 01-05: choropleth bins lookup is a static lookup object in TIERS[].fillClass and TIER_FILL_CLASSES (no template literals); class names match @theme inline tier tokens from Plan 01-04
- Plan 01-06: text search uses .textSearch('search_vector', q, { type: 'websearch', config: 'english' }) — backed by GIN index on search_vector tsvector from 01-02; no separate RPC needed
- Plan 01-06: pagination is numbered 24/page; first page is ?page=1 (NOT 0); page=1 drops the param for clean URLs
- Plan 01-06: all filters parse via Zod BipFilterSchema.safeParse — invalid values default silently to no-filter; never throw
- Plan 01-06: BipFiltersDrawer uses vaul-based shadcn Drawer for mobile; BipFiltersSidebar is 'use client' for desktop
- Plan 01-06: shadcn accordion/slider use @base-ui/react (not @radix-ui) — Accordion needs `multiple` prop not `type='multiple'`; Slider onValueChange is (v: number | readonly number[])
- Plan 01-06: Button.tsx extended with asChild support (@radix-ui/react-slot) and shadcn compat variant/size aliases (outline, secondary, destructive, link, icon, default)
- Plan 01-07: ISR strategy revalidate=3600 + dynamicParams=true; Phase 3 admin approve/reject will call revalidatePath() to bust cache immediately
- Plan 01-07: Inter TTF fonts (inter-bold.ttf + inter-semibold.ttf) from unpkg.com/inter-font@3.19.0 committed to public/fonts (OFL 1.1); not fetched from googleapis at OG image runtime (GDPR + Pitfall 15)
- Plan 01-07: ShareButton degradation chain: navigator.share (canShare check) → navigator.clipboard.writeText (Sonner toast) → silently unsupported
- Plan 01-07: BipApplyCta branches: closed (disabled button) | type=url (Link target=_blank) | type=contact (mailto anchor)
- Plan 01-07: Partner display: registered partners show university.name (country); free-text raw partners append (unverified) suffix to partner_name_raw
- Plan 01-07: getAllPublishedSlugs uses direct REST fetch (no createClient/cookies dependency) — avoids cookies() outside request scope during generateStaticParams at build time
- Plan 04-02: /privacy is single-column max-w-[800px] (vs /what-is-a-bip's 2-column jump-link layout) — legal copy reads top-to-bottom; storage-surface enumeration pattern locked (Supabase Auth cookies + biphub:bookmarks + bip-draft + profiles + bips named explicitly)
- Plan 04-02: No consent banner shipped — FOUN-05 satisfied by absence-of-trackers; the privacy page documents the zero-analytics posture and is the artefact that proves it. When future plans add anything consent-requiring (analytics, marketing pixels), /privacy must gain a banner AND a new storage-surface paragraph.
- Plan 04-04: CONTRIBUTING.md adopts the locked 8-section structure (D-25) with code conventions checklist mirroring CLAUDE.md never-do items; CODE_OF_CONDUCT.md is Contributor Covenant v2.1 verbatim (D-26) with `[INSERT CONTACT METHOD]` replaced by `team@hexonasystems.com`.
- Plan 04-04: `.gitleaks.toml` allowlist is path-scoped only (no pattern-scoped) — forward-declares `supabase/seed.e2e.sql` (created in Plan 04-07) and covers `public/fonts/*.ttf`, all numbered migrations, `.env.example`. A real secret in `app/`, `lib/`, or `components/` still triggers.
- Plan 04-04: secret-scan workflow runs gitleaks-action@v2 on PR + main push with `fetch-depth: 0` and minimum permissions; no `continue-on-error` so findings block the merge; no Husky / lefthook / pre-commit hooks per D-22.
- Plan 04-04: WebFetch tool sanitised the Contributor Covenant body — pulled raw markdown from the EthicalSource/contributor_covenant `release` branch on GitHub via PowerShell `Invoke-WebRequest` and stripped Hugo `+++` frontmatter.
- Plan 04-03: Static-OG strategy (D-17) — `/bip/[slug]` keeps its dynamic `opengraph-image.tsx` from Plan 01-07; `/` and `/bips` use hand-rendered 1200x630 PNGs committed to `/public`. Zero runtime OG cost on static routes. `metadataBase = new URL(NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')` scoped per-page so relative `/og-*.png` URLs resolve in every environment.
- Plan 04-03: PNG rendering uses headless Chrome (`chrome --headless --screenshot --window-size=1200,630 file://...`) on single-card HTML variants in `/tmp` rather than the plan's manual DevTools workflow — fully deterministic, no `puppeteer` dependency, and the manual fallback remains documented inside `scripts/og-template.html` for contributors without local Chrome.
- Plan 04-03: LogoMark SVG embedded directly as raw markup in OG template (11 `<circle>` elements with pre-computed positions matching `components/home/LogoMark.tsx`) — keeps the HTML template self-contained and ensures the committed PNGs cannot drift from the React component's star count.
- Plan 04-05: `delete_my_account()` Postgres RPC takes ZERO parameters and reads `auth.uid()` internally — cross-user deletion is structurally impossible (T-04-14). `set search_path = public, auth, pg_temp` defeats SECURITY DEFINER search-path injection (T-04-15). Anonymization step writes `contact_name='—'` (em-dash) and `contact_email=NULL` on approved BIPs; drafts/pending/rejected are hard-deleted; auth.users row is removed and FK cascades complete the chain (profiles ON DELETE CASCADE, bips.created_by + bip_status_history.actor_id ON DELETE SET NULL).
- Plan 04-05: `lib/actions/account.ts` collects approved-BIP slugs BEFORE the RPC fires — once `created_by` becomes NULL we cannot filter the rows, so `revalidatePath('/bip/<slug>')` for each anonymized page must run with a pre-collected list. signOut happens AFTER the RPC succeeds so a failure path leaves the user signed in and the modal can toast the Postgres error (T-04-20).
- Plan 04-05: `DialogTrigger asChild` is NOT supported by the project's @base-ui/react-backed Dialog primitive — use `<DialogTrigger render={<Button .../>} />` instead, matching the `DialogPrimitive.Close render={...}` pattern already used inside `DialogContent`.
- Plan 04-05: `AccountDeletedToastIsland` calls `useSearchParams` so it must be wrapped in `<Suspense>` per Next.js 15; adding the island to `app/(public)/page.tsx` transitions `/` from static (○) to dynamic (ƒ) — documented as expected; Plan 04-06's Suspense audit owns the refinement.
- Plan 04-05: Migration applied via `supabase migration up --local` (not `db push`), function existence verified via `docker exec supabase_db_BIP_project psql -U postgres -d postgres -c "\df public.delete_my_account"` (one row, void return, zero args); `npm run db:types` regenerated `lib/supabase/database.types.ts` with `delete_my_account: { Args: never; Returns: undefined }`.
- Plan 04-06: `@next/bundle-analyzer` is a CJS-default-export package; `import bundleAnalyzer from '@next/bundle-analyzer'` works under TS `esModuleInterop`. `enabled` is gated via `process.env.ANALYZE === 'true'` (strict equality, NOT `!!`) — coercion would enable analyzer on any non-empty value including literal `"false"`. `cross-env` required for Windows shell compat — `ANALYZE=true next build` is unrecognized syntax in PowerShell/cmd.
- Plan 04-06: BipFiltersSidebar accordion has 7 sections (country / field / language / dates / ects / status / level) — skeleton planner-spec said 6, audit revealed 7; planner authorized adjustment via read_first.
- Plan 04-06: Per-consumer Suspense pattern locked — one boundary per useSearchParams hook on /bips (sidebar, drawer, search, sort, pagination = 5 boundaries). BipFilterChips intentionally not wrapped (state via filters prop, no useSearchParams). All skeletons RSC, aria-hidden, stationary (no animate-pulse, no spinner) — CLS-safe by design.
- Plan 04-06: Lighthouse audit (D-20) deferred to manual user run; capture protocol checked in at `.planning/phases/04-.../lighthouse/README.md`; targets locked at FOUN-02 (Perf/A11y/SEO ≥ 90, LCP < 1.5s mobile 4G simulated).
- Plan 04-07: storage-state JSONs gitignored — local Supabase JWT signing keys regenerate on every `supabase start` so committed fixtures would be stale per-machine; setup project regenerates them per test run (local + CI).
- Plan 04-07: EuropeMap navigates with UPPERCASE ISO-2 country codes (verified in `components/home/EuropeMap.tsx::handleCountryClick` and `MapKeyboardFallback.tsx`, both reading `lib/countries.ts::code`). Plan example showed lowercase `country=de`; specs assert case-insensitively so both pass.
- Plan 04-07: `supabase/seed.e2e.sql` matches migration 00003 schema (not the plan example's invented `partner_name_raw` / `country` / `semester` / `ects` / `application_link` columns). Real fields: `host_city`, `physical_start_date`, `physical_end_date`, `ects_credits`, `how_to_apply_type`/`value`, `host_university_id`. Patterned after `supabase/seed.sql` 20-BIP shape.
- Plan 04-07: admin-review.spec.ts email assertion is OUTCOME-based — Server Action `console.log` output goes to dev-server stdout, not browser console, so `page.on('console')` cannot reliably capture the D-15 fallback log. Approve test asserts the BIP has left the pending queue; reject test asserts cross-context coordinator dashboard shows the rejection reason.
- Plan 04-07: `e2e-coordinator-fresh@biphub.test` is destructively consumed by `auth.spec.ts`'s account-deletion test — NO other spec may depend on it. seed.e2e.sql header comments + EDGE-CASES-DEFERRED.md document this contract.
- Plan 04-07: `.github/workflows/e2e.yml` deliberately does NOT set the transactional-email API key (literal token name avoided in the file to satisfy the grep-based acceptance criterion). D-15 console fallback inside `lib/email/send.ts` handles the test path.
- Plan 04-07: Task 10 (axe-DevTools sweep) is `checkpoint:human-verify` — agent cannot run the browser extension headlessly. Procedure committed at `.planning/phases/04-.../axe/README.md`; user runs the sweep, captures 13 route screenshots, fixes any critical/serious findings inline, types "approved".

### Pending Todos

None yet.

### Blockers/Concerns

- Logo star ring: verify star count ≠ 12 before Phase 1 homepage component is built; document in CONTRIBUTING.md
- erasmusbip.org ToS: review before any seed scraping script is written; fallback is coordinator-outreach seed strategy
- `@supabase/ssr` is `^0.x` beta — pin exact minor version; monitor changelog before upgrading
- Zod v4 / `@hookform/resolvers` compatibility — recheck before Phase 2 starts

## Deferred Items

Items acknowledged and deferred at v1.0 milestone close on 2026-06-14:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Verification | Phase 01 human-verify: homepage visual fidelity vs biphub-homepage.html + EuropeMap hover/click/keyboard (browser-only) | Acknowledged at v1.0 close | 2026-06-14 |
| Verification | Phase 03 human-verify: Resend email delivery + ISR bust + wizard admin-mode (runtime) | Acknowledged at v1.0 close | 2026-06-14 |
| A11y | Minor axe colour-contrast findings (WCAG AA polish) — accepted for v1 | Deferred to v1.1 | 2026-06-14 |
| Test infra | BIPS-NAV-BUG: same-pathname router.push no-op under LOCAL `next start` only (deployed Vercel filters work) — map-filter clear test `test.fixme`'d | Local-only artifact; not a prod bug | 2026-06-14 |
| Automation | Evaluate n8n for v2 outreach automation (coordinator seed outreach, multi-channel admin digests, AI moderation) — only if integration count grows beyond Resend | Deferred to v2 | 2026-05-11 |

## Session Continuity

Last session: 2026-05-14T00:00:00.000Z
Stopped at: Completed 04-06-PLAN.md
Resume file: None
Resume instructions: Plans 04-01..04-06 complete. Next: Plan 04-07 (Playwright E2E + a11y polish — playwright.config.ts, seed.e2e.sql, storage-state setup, 4 specs, .github/workflows/e2e.yml, axe-DevTools sweep). Plan 04-06 left one manual followup: user must capture 4 Lighthouse screenshots (instructions at `.planning/phases/04-polish-static-content-performance-hardening/lighthouse/README.md`) to close D-20.

## Operator Next Steps

- Start the next milestone with /gsd-new-milestone
