# Phase 4: Polish + Static Content + Performance Hardening - Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 makes everything that already exists production-ready and open-source-ready. Seven requirements: INFO-01/02/04 (a `/what-is-a-bip` static explainer page + FAQ + outbound links to EC Erasmus+ docs), FOUN-05 (GDPR cookie consent — trivially satisfied by shipping zero analytics in v1; no banner), FOUN-06 (a `/privacy` policy page reachable from the footer), FOUN-07 (coordinator account deletion that anonymizes approved BIPs and hard-deletes everything else), FOUN-10 (Playwright E2E coverage for auth flow, submission wizard, admin approve/reject, and map click-to-filter). Plus performance hardening (Suspense boundary around `BipFilters` and any other `useSearchParams()` consumer, bundle-analyzer integration toggled by env var, manual Lighthouse audits on `/`, `/bips`, `/bip/[slug]` against the locked targets from FOUN-02), static OG image fallbacks (hand-designed PNGs in `/public` for `/` and `/bips`, NOT a dynamic `opengraph-image.tsx` reuse), a `CONTRIBUTING.md` covering setup, the EU emblem prohibition, architecture overview, and PR checklist, an audited `.env.example` with placeholder-only values, CI-only secret scanning via the gitleaks GitHub Action (no Husky pre-commit), and the missing `package.json` script `db:migrate` (the rest already exist) + `test:e2e`. Out of scope for Phase 4: any new analytics integration (deferred until product-market fit signals it's needed), Lighthouse CI / regression gating (manual snapshots only in v1), multi-language UI, JSON-LD structured data, admin user-promotion UI, audit-log timeline view, sparkline charts.

</domain>

<decisions>
## Implementation Decisions

### GDPR Posture + Analytics

- **D-01: No analytics in v1** (Claude's call): The product ships with zero analytics scripts — no Plausible, Umami, GA4, or Vercel Analytics. Rationale: FOUN-05 mandates a consent banner "before any analytics scripts load"; the cheapest GDPR-compliant path is to load no such scripts. A consent banner is friction (a11y burden, Lighthouse penalty, layout shift) that buys nothing until we actually need user behavior data. Revisit when product-market fit demands traffic metrics.
- **D-02: No cookie consent banner** (Claude's call): FOUN-05 is trivially satisfied by D-01. The footer carries a link to `/privacy` per FOUN-06. The only cookies the site sets are Supabase Auth session cookies (essential, no consent required under ePrivacy strictly-necessary exemption) and the `bookmarks` / draft `localStorage` entries (essential, no consent required). The privacy policy explicitly states this.
- **D-03: `/privacy` page scope** (Claude's call): Static RSC at `app/(public)/privacy/page.tsx`, `export const dynamic = 'force-static'`. Sections in this order: Data Controller (Hexona Systems, contact email from `ADMIN_NOTIFICATION_EMAIL` or hardcoded `team@hexonasystems.com`); What we collect (account email + profile fields + BIP submission content; no analytics; essential session cookies only); Legal basis (legitimate interest for the public directory, contract for coordinator accounts, consent for marketing — n/a in v1); Retention (account data until deletion; approved BIPs anonymized and retained as public-interest directory content); Your rights under GDPR Art 15-17 (access, rectification, erasure via account deletion); How to exercise (in-product `/dashboard/settings` deletion + email contact); Children (16+ implied by Erasmus+ eligibility, no special handling); Updates (date-stamped, no change-log). Plain prose, no legalese template paste. ~600-900 words.

### `/what-is-a-bip` Content + Structure

- **D-04: Page structure** (Claude's call): Single static RSC at `app/(public)/what-is-a-bip/page.tsx`, `export const dynamic = 'force-static'`. Sections (jump-link nav on desktop, stacked on mobile): (1) What is a BIP? (definition, Erasmus+ KA131 context, intensive + blended distinction), (2) Virtual + Physical components (the 5-10 day in-person requirement, virtual learning before/after), (3) ECTS + eligibility (typical 3-6 ECTS, who can apply, language requirements), (4) How to find one on BipHub (link to `/bips`, filter walkthrough), (5) FAQ accordion (8 items). Footer of page links to `https://erasmus-plus.ec.europa.eu/` and `https://erasmus-plus.ec.europa.eu/programme-guide/part-b/ka1/short-term-mobility-projects/blended-intensive-programmes` (or the latest equivalent — link verified during execution).
- **D-05: Copy authorship** (Claude's call): Claude drafts the structure + initial copy as production-ready text. The user (founder) gets a single review pass before commit; copy lives in the .tsx file (no MDX, no CMS — this page changes rarely). Tone matches the existing Hero / HowItWorks voice: direct, plainspoken, no jargon-stacking.
- **D-06: FAQ items (locked v1 list)** (Claude's call): "Who can apply to a BIP?", "How long does a BIP last?", "Do I get ECTS credits?", "What language is the BIP in?", "Are travel costs covered?", "Can I join from outside the EU?", "How are BIPs different from regular Erasmus exchange?", "How do I apply through my home university?". Answers 2-4 sentences each.

### Account Deletion (FOUN-07)

- **D-07: Entry point** (Claude's call): New `/dashboard/settings` page (RSC) with a single "Danger zone" section at the bottom containing a "Delete account" button. No other settings in v1 — profile editing belongs to a future iteration; this page exists solely to host deletion. Linked from `DashboardNav` as a small gear icon next to sign-out.
- **D-08: Confirmation pattern** (Claude's call): A `Dialog` modal opens with explicit consequences listed (drafts deleted, pending/rejected deleted, approved BIPs anonymized but stay live, account email forgotten, action is irreversible). User must type their own account email verbatim into a confirmation input — `Delete account` button is disabled until the typed string matches `claims.email`. No grace period; deletion is immediate. Friction is intentional for an irreversible PII operation.
- **D-09: Anonymization strategy** (Claude's call): Single Server Action `deleteAccountAction` runs as the authenticated coordinator (no `createAdminClient` needed — coordinator's own RLS scope suffices for steps 1-2; step 3 needs an RPC marked `SECURITY DEFINER` to delete from `auth.users`):
  1. UPDATE `bips` SET `contact_name = '—'`, `contact_email = NULL`, `partner_name_raw` left intact (institutional info, not PII) WHERE `created_by = auth.uid()` AND `status = 'approved'`. This is permitted by the existing `bips_update_admin` policy? No — coordinator can only update draft/pending/rejected per `bips_update_own_editable`. **New migration: add `bips_anonymize_own_approved` policy** that allows the owning coordinator to UPDATE approved BIPs *only* to set `contact_name`, `contact_email` to anonymized values — implementable via a column whitelist in `WITH CHECK` or, more reliably, by performing this UPDATE inside the same `SECURITY DEFINER` RPC.
  2. DELETE `bips` WHERE `created_by = auth.uid()` AND `status IN ('draft', 'pending', 'rejected')` — allowed by existing `bips_delete_own_draft` only for drafts; needs policy extension OR the RPC handles it under `SECURITY DEFINER`.
  3. Call `delete_my_account()` RPC (`SECURITY DEFINER`, owned by `postgres`, search_path locked) that performs steps 1-2 atomically and then `delete from auth.users where id = auth.uid()`. The cascade chain: `auth.users` delete → `profiles` ON DELETE CASCADE (or set null — verified during planning) → `bips.created_by` ON DELETE SET NULL (already confirmed in migration 00003) → `bip_status_history.actor_id` ON DELETE SET NULL (already confirmed in Phase 3 D-07). Approved BIPs survive with `created_by = NULL`, anonymized contact, and remain publicly visible.
  4. Server Action signs the user out (`supabase.auth.signOut()`), revalidates `/bips` + each affected approved BIP slug (collected before the RPC fires), redirects to `/?deleted=1` with a Sonner toast on landing.
- **D-10: No deletion confirmation email** (Claude's call): The account email is destroyed by the operation; sending a confirmation to it is pointless. The user just signed the action with a typed-email confirmation, so consent is captured at the UI layer. Audit trail of the deletion lives implicitly: `bip_status_history` rows owned by the deleted user have `actor_id = NULL` and `note = '—'` if needed; not adding a new `action_kind = 'account_deleted'` row in v1.
- **D-11: Admin deletion (out of scope)** (Claude's call): A coordinator deletes their OWN account. Admin-driven coordinator deletion is not in v1 (no UI for it, no GDPR data-controller workflow for processor-initiated erasure). Admin can manually run `delete_my_account` impersonating the user via service-role if a coordinator emails support; documented in CONTRIBUTING.md ops notes.

### Playwright E2E (FOUN-10)

- **D-12: Test environment** (Claude's call): Tests run against a local Supabase instance started via `supabase start` (already used for `npm run dev`). In CI, the GitHub Actions workflow uses `supabase/setup-cli@v1` + `supabase start` + `supabase db reset` per job. No separate test database project; same migrations, same seed file (extended with E2E fixture users — see D-13). Reset between specs via `supabase db reset` (slow, ~10s) OR a faster targeted truncate script `scripts/e2e-reset.ts` — planner picks based on suite duration.
- **D-13: Auth handling — programmatic, NOT real magic links** (Claude's call): Three fixture users seeded by an extension to `supabase/seed.sql` (or a separate `supabase/seed.e2e.sql` loaded only when `E2E=true`):
  - `e2e-coordinator@biphub.test` / known password — verified + profile-complete
  - `e2e-coordinator-fresh@biphub.test` / known password — verified, no profile
  - `e2e-admin@biphub.test` / known password — `app_metadata.role = 'admin'`
  Playwright `storageState` fixtures are produced by a setup project that signs each user in once via the real `signIn` Server Action and captures the Supabase Auth cookies; specs reuse the storage state to skip the login UI except in the auth-flow spec which exercises register → verify (using the Supabase admin API to auto-confirm) → login. No Mailosaur, no real magic link polling.
- **D-14: Coverage scope** (Claude's call): Golden path only for v1. Specs:
  - `auth.spec.ts` — register, programmatic email verification, login, logout, password reset (link captured via Supabase admin API), invalid credentials.
  - `submission.spec.ts` — coordinator opens wizard, fills 4 steps, preview, submit; verify BIP appears as `pending` in dashboard; edit pending; withdraw pending.
  - `admin-review.spec.ts` — admin opens queue, opens review page, approves with note (verify email send is mocked + recorded), reject with reason min-10-chars validation, verify auto-advance, verify coordinator dashboard shows rejection reason.
  - `map-filter.spec.ts` — homepage map click → `/bips?country=de` → results scoped correctly.
  Edge cases (two-tab conflict, session-expiry-mid-wizard, RLS denials, rate limits) are documented in a `tests/e2e/EDGE-CASES-DEFERRED.md` for a v1.1 hardening pass.
- **D-15: Resend email mocking in E2E** (Claude's call): `RESEND_API_KEY` left blank in E2E env. Phase 3 D-15 already wired `lib/email/send.ts` to log to console when unset. Tests assert the console log content (subject + recipient + key body markers) via Playwright's request/console interception. No real email delivery in tests.
- **D-16: CI integration** (Claude's call): GitHub Actions workflow `.github/workflows/e2e.yml` runs the suite on every PR. Single shard for v1 (estimated <5 min total). Caches Supabase Docker images. Uploads Playwright HTML report as an artifact. No flake retries in v1 — flakes get triaged manually so we don't paper over real bugs.

### Static OG Images for `/` and `/bips`

- **D-17: Static PNGs, not dynamic route handlers** (Claude's call): `public/og-home.png` and `public/og-bips.png` are hand-designed PNGs (1200×630, dark-navy + gold + 11-star LogoMark, page-specific title). Referenced via `metadata.openGraph.images` in the respective `page.tsx`. The dynamic `opengraph-image.tsx` pattern from Phase 1 Plan 01-07 stays scoped to `/bip/[slug]` where per-BIP variance justifies it. Static pages get static OGs — no runtime cost, no Inter font bundling, designer-controlled. A `scripts/og-template.html` in repo lets contributors regenerate the PNG via screenshot if they edit it.

### Performance Hardening

- **D-18: Suspense boundary scope** (Claude's call): Audit every component that calls `useSearchParams()`. Known: `BipFilters` (per ROADMAP key deliverable), `BipSearchBar`, `BipPagination`, `BipSortControl` (all in `/bips`). Each is wrapped in a per-feature `<Suspense fallback={...} />` inside the parent server component. Fallbacks reuse the existing skeleton patterns from Phase 1 (`MapSkeleton`, plus new minimal versions for filter/sort/pagination rows).
- **D-19: Bundle analyzer integration** (Claude's call): Install `@next/bundle-analyzer`, wire into `next.config.ts` behind `process.env.ANALYZE === 'true'`. Add `npm run build:analyze` script. Document in CONTRIBUTING.md ("Run `npm run build:analyze` to inspect bundle size before opening a perf-flag PR"). No CI gate — humans interpret the report.
- **D-20: Lighthouse audits — manual, not CI** (Claude's call): Audited pages: `/`, `/bips`, `/bip/{a-known-slug}`, `/what-is-a-bip` (new in this phase). Targets per FOUN-02 (locked Phase 1): Performance/Accessibility/SEO ≥ 90, LCP < 1.5s on 4G mobile. Captured as screenshots in `.planning/phases/04-.../lighthouse/`. Lighthouse CI is deferred — first we need a stable baseline, regression gating is a v1.1 task.
- **D-21: Image audit** (Claude's call): Sweep the repo for `<img>` tags and migrate to `next/image` with explicit `width`/`height` + `priority` on hero LCP candidates. Existing assets in `/public` get `import` statements where Next.js can statically analyze dimensions. Out of scope: image CDN integration (not needed at current scale).

### Tooling + Repo Health

- **D-22: Secret scanning — CI only, no Husky** (Claude's call): GitHub Actions workflow `.github/workflows/secret-scan.yml` runs `gitleaks/gitleaks-action@v2` on every PR and on `main` push. A `.gitleaks.toml` allowlists the Supabase demo JWTs from `supabase/seed.sql` and the demo keys baked into Supabase CLI fixtures. NO Husky / lefthook / simple-git-hooks pre-commit hook — local hooks reorder `.git/hooks` and slow every commit; CI catches the same class of mistake before merge.
- **D-23: `.env.example` audit** (Claude's call): Existing `.env.example` already covers Supabase + Resend (Phase 3 added the latter). Phase 4 adds: a comment block at the top explaining how to populate from `npx supabase status`; explicit "placeholder values only — never commit real secrets" warning; verify no real-looking JWTs are present. The file is the canonical onboarding document for env vars; CONTRIBUTING.md links to it.
- **D-24: `package.json` scripts to add** (Claude's call): `test:e2e` (`playwright test`), `test:e2e:ui` (`playwright test --ui`), `build:analyze` (`ANALYZE=true next build`). `db:start`, `db:stop`, `db:reset`, `db:types` already exist. `db:migrate` is intentionally NOT added — `supabase db push` is the canonical command; aliasing it adds noise. `lint:fix` already implied by ESLint config; not exposed.
- **D-25: `CONTRIBUTING.md` structure** (Claude's call): Sections in this order: (1) Quick start (`supabase start` + `npm install` + `npm run dev`), (2) Project structure (route groups, lib/queries pattern, Server Actions location), (3) The EU emblem prohibition (11-star LogoMark, palette OK, ring count must NEVER be 12 — copy from CLAUDE.md verbatim with citation to EC visual identity rules), (4) Code conventions (locked: getClaims not getSession, await cookies, Tailwind static class names, motion via LazyMotion, Zod v3 + resolvers v3.x), (5) Database changes (writing migrations, running `db:types`, RLS policy template requiring both USING and WITH CHECK on UPDATE), (6) Testing (unit via Vitest, E2E via Playwright + how to run a single spec), (7) PR checklist (Tailwind static classes, RLS USING+WITH CHECK, getClaims, no `framer-motion` import, `.env.example` updated if env added, screenshots for UI changes), (8) Code of Conduct reference (CONTRIBUTOR_COVENANT_CODE_OF_CONDUCT.md adopted verbatim). Tone: direct, no marketing fluff.
- **D-26: License + CoC** (Claude's call): MIT LICENSE already exists per FOUN-08. Adopt Contributor Covenant v2.1 verbatim as `CODE_OF_CONDUCT.md` (linked from CONTRIBUTING.md). Both files unchanged across edits — they're foundation docs.

### Accessibility Polish (FOUN-03 already complete in Phase 1)

- **D-27: A11y audit sweep** (Claude's call): Phase 4 includes a manual + automated axe-DevTools pass on every public route (`/`, `/bips`, `/bip/[slug]`, `/what-is-a-bip`, `/privacy`) and each auth/dashboard/admin route in a logged-in state. Fix anything WCAG AA finds: missing labels, contrast issues, focus rings on custom buttons, skip-to-content link added to `(public)/layout.tsx`. The existing Europe map keyboard fallback (Plan 01-05) stays; verify the `<select>` is announced correctly.

### Claude's Discretion
The user delegated the full Phase 4 decision set ("you decide"). All D-01..27 are Claude's calls, recorded here so the planner can act without re-confirming. Specific items where Claude flagged uncertainty to the user before deciding:
- D-01/02 (skip analytics + banner entirely): the user-facing concern was a banner consuming Lighthouse budget for no measurable benefit in v1. Reverse only if marketing or product needs metrics before launch.
- D-17 (static OG PNGs over dynamic route handler): the user-facing concern was bundling the Inter TTF for OG generation on pages that never change.
- D-22 (CI-only secret scanning, no Husky): the user-facing concern was per-commit friction and `.husky/` directory intrusiveness.
- D-05 (Claude drafts `/what-is-a-bip` copy): founder gets a review pass before commit; switch to founder-drafted if voice diverges.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level (always relevant)
- `CLAUDE.md` — locked stack (Next 15.5 LTS, motion, Zod v3, Supabase SSR 0.5.2 pinned, `@vnedyalk0v/react19-simple-maps`); never-do list (`getSession()` ban, `await cookies()`, EU 12-star emblem prohibition, dynamic Tailwind classes, `createAdminClient` isolation, footer disclaimer mandatory).
- `CONTEXT.md` (repo root) — founder brief; visual direction.
- `.planning/PROJECT.md` — synthesized context; key decisions table; out-of-scope list.
- `.planning/REQUIREMENTS.md` — Phase 4 requirements (INFO-01/02/04, FOUN-05/06/07/10) and the v1 boundary; out-of-scope contract (no Lighthouse CI, no analytics, no JSON-LD until v2).
- `.planning/ROADMAP.md` §"Phase 4: Polish + Static Content + Performance Hardening" — goal, success criteria, key deliverables.
- `.planning/STATE.md` — current blockers; deferred items.

### Phase 1 research outputs (still authoritative)
- `.planning/research/ARCHITECTURE.md` — route-group layout (Phase 4 adds `/what-is-a-bip` and `/privacy` under `(public)`, `/dashboard/settings` under `(dashboard)`); RSC-as-data-fetcher; Server Actions for all mutations.
- `.planning/research/PITFALLS.md` — Pitfall 5 (WITH CHECK on UPDATE), Pitfall 15 (Inter font self-hosting — only relevant to OG image generation, which Phase 4 avoids for static pages).
- `.planning/research/STACK.md` — locked dep versions; the Playwright pick is whatever is current at install time (no version constraint inherited yet).

### Phase 1 / 2 / 3 context (prior decisions that carry forward)
- `.planning/phases/01-discovery-foundation/01-CONTEXT.md` — `opengraph-image.tsx` dynamic OG pattern for `/bip/[slug]` (Phase 4 reuses this only for BIP detail; static PNGs for `/` and `/bips` per D-17); ISR `revalidate=3600` + `dynamicParams=true` on `/bip/[slug]` (Phase 4 deletion calls `revalidatePath()` on anonymized slugs); bookmarks localStorage key `biphub:bookmarks` (essential cookie/storage — surface in privacy policy).
- `.planning/phases/02-coordinator-auth-submission/02-CONTEXT.md` — `(dashboard)` layout auth + profile-complete gate (Phase 4 adds `/dashboard/settings` under the same gate); `DashboardNav` (Phase 4 adds the settings gear icon link); `onAuthStateChange` + localStorage backup (continues unchanged); `bip-draft` Zustand store (no changes needed for Phase 4).
- `.planning/phases/03-admin-review-emails/03-CONTEXT.md` — `bip_status_history.actor_id` is `ON DELETE SET NULL` (confirms FOUN-07 anonymization preserves audit trail); Resend Node SDK directly in Server Actions (Phase 4 reuses, no new email templates needed for account deletion per D-10); `lib/email/send.ts` console-log fallback when `RESEND_API_KEY` unset (used by E2E per D-15).

### Existing code (planner reads before implementing)
- `middleware.ts` — Phase 4 adds no new gates; `/dashboard/settings` inherits the dashboard guard.
- `lib/supabase/server.ts` + `lib/supabase/middleware.ts` — `await cookies()` + `getClaims()`. Account-deletion Server Action runs as the coordinator (no service-role bypass needed for steps 1-2; the `delete_my_account` RPC is `SECURITY DEFINER`).
- `lib/supabase/admin.ts` — `createAdminClient` with ESLint `no-restricted-imports`. Phase 4 should NOT need this client; if a planner wants to use it, the planner must justify it in PLAN.md.
- `supabase/migrations/00003_bips_full_schema.sql` — `created_by` is `references auth.users(id) on delete set null` (confirmed for FOUN-07 anonymization).
- `supabase/migrations/00006_rls_policies.sql` — existing coordinator UPDATE/DELETE policies; Phase 4 adds anonymization permission via the `delete_my_account` SECURITY DEFINER RPC (no new SELECT/UPDATE policy needed on `bips`).
- `supabase/migrations/00011_bips_update_own_editable.sql` — current coordinator update policy (Phase 3 D-10); Phase 4 does NOT modify it.
- `supabase/migrations/00010_bip_status_history.sql` — `actor_id ON DELETE SET NULL` already in place.
- `supabase/seed.sql` — extended with E2E fixture users (D-13) gated by an env flag or split into `supabase/seed.e2e.sql` (planner chooses).
- `app/(public)/layout.tsx` — Footer with the disclaimer; Phase 4 adds a `/privacy` link to the footer.
- `app/(dashboard)/layout.tsx` + `components/dashboard/DashboardNav.tsx` — Phase 4 adds a settings icon link to `/dashboard/settings`.
- `components/home/Footer.tsx` — Phase 4 updates to add `/privacy` and `/what-is-a-bip` links.
- `lib/email/send.ts` — Phase 4 does NOT add new email types; the account-deletion flow does NOT send email per D-10.
- `next.config.ts` (or `.mjs`) — Phase 4 wraps export with `withBundleAnalyzer` per D-19.
- `package.json` — Phase 4 adds the three scripts per D-24 and the Playwright + `@next/bundle-analyzer` dev dependencies.
- `.env.example` — Phase 4 audits + annotates per D-23.

### External docs to verify during planning
- `https://erasmus-plus.ec.europa.eu/programme-guide/part-b/ka1/short-term-mobility-projects/blended-intensive-programmes` — canonical EC source for the `/what-is-a-bip` page outbound link; URL verified live before commit.
- `https://playwright.dev/docs/auth#authenticate-with-api-request` — `storageState` setup pattern referenced by D-13.
- `https://supabase.com/docs/reference/javascript/auth-admin-deleteuser` — admin-API user deletion (used by E2E auth setup to clean up after test runs).
- `https://www.contributor-covenant.org/version/2/1/code_of_conduct/` — verbatim CoC source per D-26.

### No SPEC.md
This phase has no `/gsd-spec-phase`-generated SPEC.md. Requirements are captured in REQUIREMENTS.md (INFO-01/02/04, FOUN-05/06/07/10) and bounded in ROADMAP.md "Phase 4" section.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`(public)` layout + Footer** — Phase 4 adds `/what-is-a-bip` and `/privacy` as siblings to the existing public routes; Footer gains two new links.
- **`(dashboard)` layout + `DashboardNav`** — `/dashboard/settings` slots in under the existing auth + profile-complete gate; nav gets a settings icon.
- **`Dialog`, `Form`, `Input`, `Button` shadcn primitives** — the typed-email confirmation modal (D-08) composes these.
- **`lib/queries/bips.ts` + `getAllPublishedSlugs`** — used by the deletion flow to compute which slugs to `revalidatePath()` after anonymization.
- **`lib/email/send.ts` console-log fallback** — drives D-15 E2E assertions without real email sends.
- **`opengraph-image.tsx` (Phase 1 Plan 01-07)** — stays scoped to `/bip/[slug]`; Phase 4 does NOT reuse for `/` or `/bips` (D-17).
- **`MapKeyboardFallback`** — already a11y-compliant; Phase 4 verifies it in the axe sweep (D-27).
- **Existing skeleton patterns (`MapSkeleton`)** — D-18 Suspense fallbacks reuse the same visual language.
- **`supabase/seed.sql`** — extended for E2E fixture users (D-13) without breaking existing 20-BIP catalog.

### Established Patterns
- **Server Actions for all mutations** — `deleteAccountAction` follows this; calls a `delete_my_account` Postgres RPC under the hood.
- **`SECURITY DEFINER` RPCs for cross-table cascades** — same pattern as Phase 2's `insert_university_if_not_exists`; the deletion RPC has `search_path` locked.
- **`revalidatePath()` for ISR cache busting** — Phase 4's deletion flow revalidates `/bips` plus each anonymized BIP's slug.
- **`await cookies()` + `getClaims()`** — applied uniformly; `/dashboard/settings` page reads `claims.email` for the typed-email confirmation match.
- **Tailwind static class names** — `/what-is-a-bip` jump-link nav uses literal class strings; no template literals.
- **`motion` via `LazyMotion`** — if the FAQ accordion uses animation, follow the existing pattern (otherwise pure CSS).
- **Zod v3 + RHF** — typed-email confirmation form uses the same resolver stack as auth forms.

### Integration Points
- **`delete_my_account` Postgres RPC** — new migration `00013_delete_my_account.sql`. `SECURITY DEFINER`, owner `postgres`, `search_path = public`. Performs anonymization UPDATE + drafts DELETE + `auth.users` DELETE atomically. EXECUTE granted to `authenticated`.
- **Footer link expansion** — `components/home/Footer.tsx` (or wherever the disclaimer lives — verified Plan 01-04) gains `/privacy` and `/what-is-a-bip` links alongside the existing disclaimer.
- **`next.config.ts` bundle-analyzer wrapper** — `withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })`.
- **`.github/workflows/`** — two new workflows: `e2e.yml` (Playwright per D-16) and `secret-scan.yml` (gitleaks per D-22). Existing workflows (if any) untouched.
- **`playwright.config.ts`** — new, top-level. Storage-state setup project per D-13.
- **`supabase/seed.sql` (or `seed.e2e.sql`)** — E2E fixture coordinators + admin user. Idempotent inserts; `ON CONFLICT DO NOTHING` if extending `seed.sql`.
- **`tests/e2e/`** — new directory mirroring spec list in D-14.

</code_context>

<specifics>
## Specific Ideas

- **Privacy policy "What we collect" section** must enumerate every storage surface: Supabase Auth cookies (essential), `biphub:bookmarks` localStorage (essential, never leaves the device), `bip-draft` Zustand+localStorage backup (essential, owner-only, persists until submit or explicit clear), BIP submission content (institutional info, not PII for non-coordinators), coordinator profile (full name + contact email + university + Erasmus code). No analytics, no third-party trackers, no marketing pixels.
- **Account deletion landing toast** — after the post-deletion redirect to `/?deleted=1`, the public homepage renders a Sonner toast: "Your account and personal data have been deleted. Approved BIPs you submitted remain published, anonymized, as part of the public Erasmus+ directory." Toast auto-dismisses; the `?deleted=1` param is stripped client-side after first render.
- **E2E test data must NOT leak into demo seed** — if extending `seed.sql`, gate the E2E inserts behind a SQL conditional: `do $$ begin if current_setting('app.e2e_mode', true) = 'on' then ... end if; end $$;` OR split into `seed.e2e.sql`. Planner picks the simpler path.
- **`/what-is-a-bip` outbound EC link** — link text reads "Read the official Erasmus+ programme guide entry on BIPs" (no claim of EC affiliation per CLAUDE.md); opens in new tab with `rel="noopener noreferrer"`.
- **`CONTRIBUTING.md` "EU emblem prohibition" wording** — must explicitly say "Star count in any logo, hero illustration, or branding asset MUST NOT equal 12, regardless of arrangement. Our LogoMark uses 11 stars." Cite EC visual identity rules with a footnote-style link.
- **Gitleaks allowlist** — `.gitleaks.toml` allowlists the Supabase demo JWTs from local fixtures + the Inter font hash strings in `public/fonts/`. The allowlist is path-scoped, not pattern-scoped, so a real leak in `app/` or `lib/` still triggers.
- **Bundle-analyzer baseline** — capture the analyzer HTML output for `/`, `/bips`, `/bip/[slug]` before any Phase 4 perf changes, save to `.planning/phases/04-.../baseline-bundles/`. Re-run after changes; PR description includes deltas.
- **Lighthouse mobile config** — Chrome DevTools Lighthouse panel, "Mobile" form factor, "Simulated throttling" 4G, "Performance / Accessibility / SEO / Best Practices" all checked.
- **Suspense fallback for `BipFilters`** — a stationary skeleton matching the filter sidebar's dimensions; do NOT use a spinner (CLS penalty if it shifts layout when filters resolve).
- **Single admin in v1** — `team@hexonasystems.com` per Phase 3 D-bootstrapping note. Privacy policy "Data Controller" section uses this address. Update if the production admin email changes before launch.
- **No "What is BIP" SEO meta beyond standard** — `metadata.title` and `metadata.description` set; JSON-LD `FAQPage` schema is v2 per REQUIREMENTS.md (out of scope).

</specifics>

<deferred>
## Deferred Ideas

- **Analytics (Plausible / Umami / Vercel Analytics)** — deferred until product needs traffic metrics. When added, also add the consent banner.
- **Cookie consent banner** — deferred with analytics.
- **Lighthouse CI / regression gating** — deferred to v1.1; Phase 4 captures manual baselines.
- **Multi-language UI (i18n)** — v2 per REQUIREMENTS.md PLAT-02.
- **JSON-LD structured data on BIP detail and FAQ pages** — v2 per REQUIREMENTS.md GROW-06.
- **Lighthouse CI as a required check on PRs** — v1.1 after we have a stable baseline.
- **Image CDN integration** — current scale doesn't justify; deferred unless `/public` image weight crosses ~500KB total.
- **Admin-initiated coordinator deletion / data export** — deferred; GDPR Art-15 access requests handled manually via email in v1.
- **Audit log timeline view at `/dashboard/bips/[id]/history`** — deferred per Phase 3 deferred list.
- **`/admin/users` admin-promotion UI** — deferred per Phase 3 deferred list; v1 bootstraps via SQL.
- **`db:migrate` npm script** — intentionally not added per D-24; `supabase db push` stays canonical.
- **Husky / pre-commit gitleaks** — deferred indefinitely; CI gate is sufficient.
- **Playwright shard parallelization, flake retries, visual regression** — v1.1 once the baseline suite is stable.
- **E2E edge-case coverage** (two-tab conflict, session expiry, RLS denials) — documented in `tests/e2e/EDGE-CASES-DEFERRED.md`; v1.1 hardening pass.

</deferred>

---

*Phase: 4-Polish-Static-Content-Performance-Hardening*
*Context gathered: 2026-05-13*
