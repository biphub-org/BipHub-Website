---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Coordinator BIP Builder
status: executing
stopped_at: "Phase 09 Plan 01 complete: bip_edits builder-completion migration pushed to cloud, types regenerated, tsc green."
last_updated: "2026-07-18T06:39:35.415Z"
last_activity: 2026-07-18
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 9
  completed_plans: 1
  percent: 11
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-07-18 after v1.1 milestone)

**Core value:** Students can reliably discover Erasmus+ BIPs by country, field of study, and dates, and universities can self-service list their BIPs through a fast, professional submission flow with admin review.
**Current focus:** Phase 09 — coordinator-bip-builder-completion

## Current Position

Phase: 09 (coordinator-bip-builder-completion) — EXECUTING
Plan: 2 of 9
Status: Ready to execute
Last activity: 2026-07-18

## Performance Metrics

**Velocity (v1.0 reference):**

- Total plans completed (v1.0): 30
- Average tasks per plan (v1.0): ~2.7
- Total phases (v1.0): 4

**By Phase (v1.2 — not started):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 5 | 4 | - | - |
| 6 | 4 | - | - |
| 7 | 0 (deferred → Phase 11) | - | - |
| 8 | 9 | - | - |
| 9 — Builder Completion | TBD | - | - |
| 10 — BIP Detail Page | TBD | - | - |
| 11 — Alert Subscriptions | TBD | - | - |

*Updated after each plan completion*
| Phase 06-saved-bips-sync P02 | 593s | 3 tasks | 8 files |
| Phase 06-saved-bips-sync P04 | 2400 | 3 tasks | 2 files |
| Phase 08 P01 | 600 | 2 tasks | 3 files |
| Phase 08-edit-approved-request-changes P02 | 1200 | 3 tasks | 4 files |
| Phase 08-edit-approved-request-changes P03 | 480 | 3 tasks | 8 files |
| Phase 08 P04 | 900 | 3 tasks | 4 files |
| Phase 08-edit-approved-request-changes P05 | 42 | 2 tasks | 2 files |
| Phase 08 P06 | 229 | 2 tasks | 4 files |
| Phase 08-edit-approved-request-changes P07 | 208 | 2 tasks | 4 files |
| Phase 08-edit-approved-request-changes P08 | 496 | 2 tasks | 4 files |
| Phase 09-coordinator-bip-builder-completion P01 | 9min | 2 tasks | 2 files |

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
- v1.1 Roadmap: Edit-approved-BIP uses shadow `bip_edits` table (PITFALLS.md approach, not ARCHITECTURE.md snapshot approach) — `bips.status` stays `approved` throughout re-review; BIP never disappears from public directory
- v1.1 Roadmap: FOUN-07 and FOUN-08 assigned to Phase 5 (student role introduction); FOUN-09 and FOUN-10 assigned to Phase 6 (first PII table introduction) with ongoing obligations noted in Phase 7 and 8 success criteria
- v1.1 Roadmap: Phase 8 depends on Phase 5 (profiles table must include student role before `bip_edits` GDPR cascade is wired); does NOT depend on Phase 6 or 7 — can start after Phase 5 if parallelizing
- Plan 05-02: middleware matcher (line 97) intentionally unchanged — /student-dashboard/* is not excluded so new (3d) guard reaches it; /register/student excluded by existing 'register' negative-lookahead (D-13/OQ-2)
- Plan 05-02: signOutStudentAction is a separate export redirecting to / (not /login); coordinator signOutAction untouched (D-15)
- Plan 05-02: callback route type-discriminator branching — magiclink errors → /register/student?error=expired; non-magiclink errors keep existing /login path; open-redirect safety preserved (T-05-08)
- Plan 05-03: No shadcn Card installed in this repo — student dashboard cards use raw div with rounded-lg border border-border bg-white shadow-sm p-6 (equivalent output, no primitive gap)
- Plan 05-03: StudentMagicLinkForm uses native `<input type="email">` (not shadcn Input) to avoid @base-ui/react wrapper conflict with form action={handleSubmit} under useTransition
- Plan 05-03: State B "Re-enter your email" escape is a button resetting local state (not a Link with ?step= URL param) — keeps URL clean at /register/student
- Plan 05-04: Cloud Supabase redirect allowlist restricted to Vercel URL — student e2e session established via @supabase/ssr cookie injection (base64url-encoded password-auth session) rather than browser magic-link navigation; auth-method independent for tested behaviors
- Plan 05-04: playwright.config auth-flow testMatch narrowed to /(?:^|[/\\])auth\.spec\.ts$/ to exclude student-auth.spec.ts from running under the wrong project
- Plan 05-04: FOUN-07 WITH CHECK violation returns HTTP 500 from cloud PostgREST (not 401/403); assertion accepts >=400 + post-hoc service-role read to confirm role unchanged
- Plan 06-01: D-06 — migration 00016 DDL from ARCHITECTURE.md 166-204 verbatim; 4 RLS policies (select_own/insert_own/delete_own/select_admin), no UPDATE policy, applied via db push to linked cloud; db push --dry-run confirms "Remote database is up to date"
- Plan 06-01: FOUN-09 — FK-driven GDPR cascade; user_id references auth.users(id) ON DELETE CASCADE; delete_my_account() RPC (00013) untouched (cascade is automatic)
- Plan 06-01: parseLegacyBookmarkIds is a pure module (no react/next/@supabase imports) — testable without JSDOM; D-02a proven by 11 green unit tests
- [Phase ?]: D-bip-02-01: SaveToggleIsland positioned absolute right-3 top-[102px] against card div — keeps button outside anchor, 44px target in gradient header
- [Phase ?]: D-bip-02-02: saveButton slot pattern — RSC page constructs BipSaveButton, passes as ReactNode to BipSidebar/BipMobileApplyBar (no action imports in client components)
- [Phase ?]: D-bip-02-03: /bips ISR revalidate=3600 preserved; getClaims() makes authed requests dynamic — acceptable per RESEARCH A2
- Plan 06-03: D-04 (student delete copy) — verbatim DeleteAccountDialog reuse with no copy change; students have zero approved BIP submissions; single tested component kept
- Plan 06-03: D-02 (LegacySweepIsland placement) — placed on student-dashboard/page.tsx (not layout) so sweep fires once per dashboard session, not on every student sub-route
- Plan 06-03: D-05 (biphub:bookmarks reconciliation) — stale "never leaves your device" claim replaced with Legacy bookmark sweep paragraph; bip-draft paragraph preserved accurate for coordinator wizard
- Plan 06-04: D-project — EXTEND student-authed project testMatch to /(student-auth|saved-bips)\.spec\.ts$/ (same fixture + session strategy; avoids duplicate project + ordering issues)
- Plan 06-04: D-throwaway — dedicated throwaway student via admin API for STUD-08/FOUN-09 deletion test; never touches e2e-student@biphub.test (NON-DESTRUCTIVE contract)
- Plan 06-04: D-unsave-assert — unsave assertion checks Unsave button flip (optimistic), then full reload to confirm server removal; unsaveAction does not revalidatePath (Pitfall 4)
- Plan 06-04: cloud e2e-student fixture profile.role corrected to 'student' (was 'coordinator' — trigger default) + password reset to Student!Test1 during execution; this also fixed pre-existing student-auth.spec.ts failures
- Plan 08-03: changes_requested amber badge reuses #b45309/#fffbeb (same hex as status-pending) — semantically equivalent "pending with feedback" per UI-SPEC; no new hue introduced
- Plan 08-03: EditApprovalEmail has no adminNote prop — approval is clean/final; only rejection and changes-requested embed the admin note with whiteSpace:pre-wrap (T-08-08)
- [Phase ?]: Plan 08-04: Two-query merge for getAdminPendingEdits (bip_edits + bips joined in-process); ADMIN_BIP_SELECT exported; openEdit on CoordinatorBipForEdit for approved/changes_requested BIPs
- [Phase ?]: FieldDef accessor pattern for heterogeneous BipDetail vs BipDraftData comparison in BipEditDiffView
- [Phase ?]: Literal EDIT_BADGE_CLASSES const for Tailwind v4 static scanner compliance per T-08-18
- v1.2 Research/Roadmap: Phase 9 (builder completion + detail page) and Phase 10 (alerts, carried from v1.1 Phase 7) are the full v1.2 scope — 30/30 requirements mapped, no orphans. Phase 9 is a hard-ordered internal pair (builder before detail page — mechanical dependency on the finalized `BipDetail` type, not a preference); Phase 10 is fully independent and can be planned/executed in parallel with Phase 9.
- v1.2 Roadmap: Phase 9 success criteria anchor on anti-Pitfall-1 (per-field E2E proving an approved edit round-trips to the live page, not just wizard/detail-page render) and the `virtual_timing` enum fix (no CHECK-constraint violation on any offered option).
- v1.2 Roadmap: Phase 10 success criteria anchor on infrastructure-first verification (`pg_net` enabled + real `cron.job_run_details` firing confirmed BEFORE other work is considered done), idempotency via a dedicated `bips.approved_at` marker (never `updated_at`, which edit-merges bump), and no-login one-click unsubscribe.
- [Phase ?]: Plan 09-01: bip_edits column additions always mirror bips schema state; nullable/no-default/no-CHECK content columns validated by Zod at submit boundary, not Postgres — Follows exact 00020 additive pattern; regenerated types via supabase gen types --linked (not npm run db:types --local) to avoid the false-positive trap where local generation type-checks clean without reflecting the pushed cloud schema

### Pending Todos

None yet.

### Blockers/Concerns

- Logo star ring: verify star count ≠ 12 before Phase 1 homepage component is built; document in CONTRIBUTING.md
- erasmusbip.org ToS: review before any seed scraping script is written; fallback is coordinator-outreach seed strategy
- `@supabase/ssr` is `^0.x` beta — pin exact minor version; monitor changelog before upgrading
- Zod v4 / `@hookform/resolvers` compatibility — recheck before Phase 2 starts
- **Phase 10 prerequisite:** confirm `pg_net` is enabled in `supabase/config.toml` before Phase 10 planning locks scope — not currently present in the repo's config; local `pg_cron` cannot call a public URL — Edge Function must be invoked manually via `supabase functions serve` for end-to-end local testing
- **Phase 10:** Resend free tier ceiling is 100 emails/day — Phase 10 plan should document the upgrade trigger (Resend Starter $20/mo for 5K/day)
- **Phase 9:** two live data-integrity bugs must be fixed in the same pass as new Step 2 fields — `virtual_timing` wizard/DB enum mismatch (silent save failure on "concurrent") and `max_participants` wizard floor of 5 vs DB/domain minimum of 10 (check existing/seeded BIPs for sub-10 values before tightening)

## Deferred Items

Items acknowledged and deferred at v1.0 milestone close on 2026-06-14:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Verification | Phase 01 human-verify: homepage visual fidelity vs biphub-homepage.html + EuropeMap hover/click/keyboard (browser-only) | Acknowledged at v1.0 close | 2026-06-14 |
| Verification | Phase 03 human-verify: Resend email delivery + ISR bust + wizard admin-mode (runtime) | Acknowledged at v1.0 close | 2026-06-14 |
| A11y | Minor axe colour-contrast findings (WCAG AA polish) — accepted for v1 | Deferred to v1.1 | 2026-06-14 |
| Test infra | BIPS-NAV-BUG: same-pathname router.push no-op under LOCAL `next start` only (deployed Vercel filters work) — map-filter clear test `test.fixme`'d | Local-only artifact; not a prod bug | 2026-06-14 |
| Automation | Evaluate n8n for v2 outreach automation (coordinator seed outreach, multi-channel admin digests, AI moderation) — only if integration count grows beyond Resend | Deferred to v2 | 2026-05-11 |

Items acknowledged and deferred at v1.1 milestone close on 2026-07-18:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Verification | Phase 08 human-verify (08-VERIFICATION.md): Resend edit-outcome email delivery (EDIT-07) + ISR revalidate-on-approve timing (EDIT-04) — runtime, needs real Resend key | Carried to v1.2 | 2026-07-18 |
| UAT | Phase 08 manual UAT (08-UAT.md): same Resend+ISR runtime sign-off | Carried to v1.2 | 2026-07-18 |
| UAT | Phase 05 human-UAT (05-HUMAN-UAT.md): 1 pending scenario | Carried to v1.2 | 2026-07-18 |
| Debug | bug-001-approved-edit debug session marked `awaiting_human_verify` — bug is RESOLVED (`9bcccc7`, KNOWN-BUGS.md); session file was never flipped to verified | Resolved; bookkeeping only | 2026-07-18 |
| Feature | Phase 7 (Alert Subscriptions + Email Pipeline) not built — full scope moved to v1.2 roadmap as Phase 10 | Moved to v1.2 (Phase 10) | 2026-07-18 |

## Session Continuity

Last session: 2026-07-18T06:39:35.407Z
Stopped at: Phase 09 Plan 01 complete: bip_edits builder-completion migration pushed to cloud, types regenerated, tsc green.
Resume file: .planning/phases/09-coordinator-bip-builder-completion/09-01-SUMMARY.md
Resume instructions: Roadmap approved and files written. Next: `/gsd-plan-phase 9` to plan Coordinator BIP Builder Completion + BIP Detail Page.

## Operator Next Steps

- Run `/gsd-plan-phase 9` to create the plan for Phase 9 (Coordinator BIP Builder Completion + BIP Detail Page).
- Phase 10 (Alert Subscriptions + Email Pipeline) can be planned before, after, or in parallel with Phase 9 — fully independent per research.
