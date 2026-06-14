# Roadmap: BipHub

## Overview

BipHub is built in four vertical MVP phases. Phase 1 ships the complete student-facing discovery experience against manually seeded BIPs — validating core value before the coordinator pipeline exists. Phase 2 adds coordinator authentication and the multi-step submission wizard, making the database self-sustaining. Phase 3 closes the editorial loop with admin review, audit logging, and Resend email notifications. Phase 4 delivers static content, GDPR compliance, Playwright E2E coverage, and Lighthouse hardening so the product is open-source-ready at launch.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Discovery Foundation** - Students can find and explore BIPs against seeded data; core value is live and verifiable (completed 2026-05-09)
- [ ] **Phase 2: Coordinator Auth + Submission** - University coordinators can register, submit BIPs, and manage their listings; the data pipeline becomes self-sustaining
- [ ] **Phase 3: Admin Review + Email Notifications** - Admin closes the editorial loop; coordinators receive status emails; audit trail is in place
- [ ] **Phase 4: Polish + Static Content + Performance Hardening** - All 7 plans implementation-complete (2026-05-14); awaiting verify-phase + 2 manual gates (axe sweep, Lighthouse capture) before v1 launch

## Phase Details

### Phase 1: Discovery Foundation
**Goal:** Students can find and explore BIPs. Core value proposition is live and testable against seeded data.
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, DISC-07, BROW-01, BROW-02, BROW-03, BROW-04, BROW-05, BROW-06, BROW-07, BROW-08, BROW-09, BROW-10, BROW-11, BROW-12, BROW-13, DETL-01, DETL-02, DETL-03, DETL-04, DETL-05, DETL-06, DETL-07, DETL-08, DETL-09, DETL-10, INFO-03, FOUN-01, FOUN-02, FOUN-03, FOUN-04, FOUN-08, FOUN-09
**Success Criteria** (what must be TRUE):
  1. A student can open the homepage and see the interactive Europe map, category bar, live stats, and recently added BIPs — all rendered from seeded data without errors
  2. A student can browse `/bips`, apply any combination of country / field / language / date / ECTS / status / study-level filters, and see the URL update to a shareable state that reproduces the same results on reload
  3. A student can full-text search BIP titles and descriptions (including accented characters such as "Munchen" finding "München") and see matching BIP cards or a meaningful empty state
  4. A student can open a BIP detail page at `/bip/[slug]`, read all BIP fields, share via web share API or copy link, and bookmark via localStorage — and the page has SSR meta tags and a per-BIP OG image
  5. Every Supabase table has RLS enabled with USING + WITH CHECK on UPDATE policies; the repo runs with `supabase start` + `npm run dev` and a seeded database, no extra steps
**Plans:** 8/8 plans complete
Plans:
- [x] 01-01-PLAN.md — Walking skeleton: Next.js 15 + Supabase + Tailwind v4 stack bootstrap, lib/supabase factories, minimal RLS-protected bips table, canary RSC homepage [completed 2026-05-09]
- [x] 01-02-PLAN.md — Full schema: universities + profiles + bips (12 added Erasmus+ fields) + bip_partner_universities, RLS with USING+WITH CHECK, unaccent + tsvector GIN search, generated TypeScript types, ISCED + countries lookup tables [completed 2026-05-09]
- [x] 01-03-PLAN.md — Seed catalog: 20 plausible synthetic BIPs satisfying D-17 distribution constraints (>=10 countries, all 8 ISCED groups, mix open/closed/lang/level/green/inclusion), verify-seed.ts checker
- [x] 01-04-PLAN.md — Public route-group chrome: full @theme inline EU palette + 6 choropleth tiers + breakpoint overrides, StickyNav + Footer (INFO-03 disclaimer) + 11-star LogoMark + Button + cn utility
- [x] 01-05-PLAN.md — Homepage composition: Hero + EuropeMap (dynamic+TopoJSON, fixed bins, keyboard fallback) + CategoriesBar + StatsSection (LazyMotion count-up) + RecentBips (>=6 threshold) + HowItWorks + UniversityCTA + BipCard + BookmarkHeartIsland + bookmarks Zustand store
- [x] 01-06-PLAN.md — /bips browse: RSC shell + parseSearchParams (Zod) + buildSupabaseQuery + getBips (single PostgREST embed) + BipFiltersSidebar (desktop) + BipFiltersDrawer (mobile Vaul) + BipSearchBar (300ms debounce) + BipSortControl + BipPagination + BipsEmptyState (D-04) + canonical=/bips [completed 2026-05-09]
- [x] 01-07-PLAN.md — /bip/[slug] detail: 2-col desktop / mobile bottom Apply bar, BipHeader+BipBody+BipSidebar (sticky 340px), DeadlineBadge + BipApplyCta branching, ShareButton (Web Share API + clipboard fallback), reused BookmarkHeartIsland, opengraph-image.tsx with bundled Inter, BipNotFound, ISR + canonical [completed 2026-05-09]
- [x] 01-08-PLAN.md — Auth infrastructure: lib/supabase/middleware.ts + lib/supabase/admin.ts (with ESLint no-restricted-imports isolation), middleware.ts expanded with getClaims() session refresh (no redirects in Phase 1 — Pitfall 2 prevention), migration 00008 profiles.role -> auth.users.raw_app_meta_data.role mirror trigger
**UI hint:** yes

**Key Deliverables:**
- Complete DB schema with all 12 new Erasmus+ fields and RLS policies on all tables (security not deferred)
- Full-text search: `unaccent` extension + `tsvector` GIN index
- Supabase local dev setup + `seed.sql` with 20 approved BIPs
- Auth infrastructure (Supabase client factories, `middleware.ts`) built now for Phase 2 use
- Root layout + `(public)` route group layout (StickyNav + Footer with disclaimer)
- Homepage RSC: hero, `<EuropeMap>` (lazy-loaded with `dynamic()` + TopoJSON at runtime), `<CategoriesBar>`, `<StatsSection>` (count-up via `LazyMotion`), `<RecentBips>` with ≥6-BIP threshold logic, how-it-works, university CTA
- `/bips` page: RSC shell + `<BipFilters>` + `<BipGrid>`, all 7 filters, URL-driven state, canonical tag
- `/bip/[slug]` page: RSC, `generateMetadata`, ISR (`revalidate = 3600`), `opengraph-image.tsx`
- localStorage bookmarks, web share API button
- EU emblem check documented in repo; Tailwind safelist for map intensity classes; Inter via `next/font`

---

### Phase 2: Coordinator Auth + Submission
**Goal:** University coordinators can register and submit BIPs. The database pipeline becomes self-sustaining.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, SUBM-01, SUBM-02, SUBM-03, SUBM-04, SUBM-05, SUBM-06, SUBM-07, SUBM-08, DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06
**Success Criteria** (what must be TRUE):
  1. A coordinator can register with an institutional email, receive a Resend verification link, verify their account, complete their university profile, and log in — with session persisting across browser refreshes
  2. A coordinator can log out from any page and reset a forgotten password via email link
  3. A coordinator can start a BIP submission wizard, have their progress auto-saved between steps and on field blur, and complete a preview step before final submission — with the submitted BIP appearing as `pending` in their dashboard
  4. A coordinator's dashboard at `/dashboard` lists all their BIPs with correct status badges; draft and pending BIPs are editable; rejected BIPs display the rejection reason
  5. Opening the same draft in two tabs does not cause silent data loss (optimistic locking via `updated_at`); a mid-form session expiry triggers a recovery path via `onAuthStateChange` + localStorage backup
**Plans:** 7 plans
Plans:
- [x] 02-01-PLAN.md — Migration 00009 (profiles.erasmus_code + insert_university_if_not_exists SECURITY DEFINER) + db reset + types regen + 13 shadcn UI primitives + status color tokens + lib/utils/status.ts
- [x] 02-02-PLAN.md — (auth) route group: layout + login/register/verify-email/reset-password/reset-password-update pages + 4 client forms (RHF + Zod v3) + 5 Server Actions (signIn/signUp/signOut/requestPasswordReset/updatePassword) + auth/callback route handler (PKCE)
- [x] 02-03-PLAN.md — Middleware Phase 2 redirect branches + x-pathname header injection; (public)/layout.tsx async + getClaims; StickyNav session-aware (D-15)
- [x] 02-04-PLAN.md — (dashboard) layout (auth + profile-complete gate via x-pathname) + DashboardNav + /onboarding RSC + OnboardingForm + UniversityCombobox (with inline add-new flow via SECURITY DEFINER RPC) + saveProfileAction + searchUniversitiesAction + addUniversityAction
- [x] 02-05-PLAN.md — Coordinator /dashboard: getCoordinatorBips RSC query + DashboardBipList (shadcn Tabs + URL ?status=) + DashboardBipCard (status badge from STATUS_BADGE_CLASSES + per-status actions) + Delete/Withdraw dialogs + deleteDraftAction + withdrawBipAction
- [x] 02-06-PLAN.md — Wizard core: lib/store/bip-draft.ts (Zustand) + lib/schemas/bip-wizard.ts (4 step schemas) + lib/actions/bip-draft.ts (saveDraftAction with updated_at optimistic lock) + slug utility + BipSubmissionWizard shell (1.5s debounced auto-save + onAuthStateChange SIGNED_OUT recovery) + SaveStatusIndicator + WizardStep1..4 components
- [x] 02-07-PLAN.md — Wizard Step 5 Preview (draftToBipDetail adapter reusing Phase 1 BipBody + BipSidebar) + TwoTabConflictDialog + new + edit page entry routes (/dashboard/bips/new + /dashboard/bips/[id]/edit) + getCoordinatorBipById query + submitBipAction (full re-validation, finalizeSlug, partner upsert with (unverified) suffix, status='pending')
**UI hint:** yes

**Key Deliverables:**
- `(auth)` route group: login, register, verify-email pages + `auth/callback` route handler
- `LoginForm` + `RegisterForm` client components (React Hook Form + Zod v3)
- Server Actions: `signIn`, `signUp`, `signOut` — all using `getClaims()`, never `getSession()`; `await cookies()`
- Middleware infinite-redirect protection (matcher excludes `/login`, `/register`, `/auth/callback`, static assets)
- `(dashboard)` route group with server-side auth guard
- Coordinator dashboard: BIP status list, edit drafts/pending, view rejection reason, new BIP button
- `<BipSubmissionWizard>`: 5 steps, Zustand draft store, debounced auto-save, `updated_at` optimistic locking
- Server Actions: `saveDraftAction`, `submitBipAction` (sets status to `pending`)
- `onAuthStateChange` listener + localStorage draft backup for session expiry protection
- Partner university free-text entry (Step 3) with `bip_partner_universities` upsert

---

### Phase 3: Admin Review + Email Notifications
**Goal:** Admin closes the editorial loop. Coordinators receive status notifications.
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** ADMN-01, ADMN-02, ADMN-03, ADMN-04, ADMN-05, ADMN-06, ADMN-07, ADMN-08, ADMN-09, ADMN-10, ADMN-11
**Success Criteria** (what must be TRUE):
  1. An admin can log in and access `/admin` — access is blocked at three independent layers (middleware, layout, RLS) for non-admin users; the role is read from JWT `app_metadata`, not `getSession()`
  2. An admin can review the pending queue, approve a BIP (with optional note) or reject it (with required reason), and the coordinator receives a Resend email with the outcome within seconds
  3. When a coordinator submits a new BIP, the admin receives a Resend notification email
  4. Admin approve and reject actions are recorded in a `bip_status_history` audit log; approved BIPs trigger `revalidatePath()` so `/bips` and `/bip/[slug]` reflect the change without a full redeploy
  5. Admin can view all listings filtered by status, edit any BIP listing, and see basic analytics (total BIPs, submissions per month, top countries)
**Plans:** 8 plans
Plans:
**Wave 1**
- [ ] 03-00-PLAN.md — Wave 0: Vitest 4.x infra + 5 test stubs (ADMN-03/04/08/09/10 covered by Wave 0 sampling)
- [ ] 03-01-PLAN.md — Schema foundation: migration 00010 (bip_status_history + RLS + trigger) + 00011 (bips_update_own_editable) + status-transitions.ts + admin-bips Zod schemas + [BLOCKING] supabase db push

**Wave 2** *(blocked on Wave 1 completion)*
- [ ] 03-02-PLAN.md — Admin chrome + pending queue: middleware admin gate, (admin)/layout.tsx, AdminSidebar, /admin RSC page, AdminBipCard, getAdminPendingBips/getNextPendingBip

**Wave 3** *(blocked on Wave 2 completion)*
- [ ] 03-03-PLAN.md — Approve flow end-to-end: Resend/react-email install, send.ts + tokens.ts + ApprovalEmail, BipSidebar mode=admin-review, AdminActionsPanel, ApproveBipModal, approveBipAction (audit + revalidate + email + auto-advance), review page

**Wave 4** *(blocked on Wave 3 completion)*
- [ ] 03-04-PLAN.md — Reject + resubmit slice: migration 00012 (bips_update_own_to_pending), RejectionEmail, RejectBipModal (RHF+Zod min-10), rejectBipAction, statusHistory.ts getLatestRejection, coordinatorBips rejection_reason wiring

**Wave 5** *(blocked on Wave 4 completion)*
- [ ] 03-05-PLAN.md — Admin new-submission notification: AdminNotificationEmail, submitBipAction sendEmail wiring, .env.example documentation
- [ ] 03-06-PLAN.md — All-listings + analytics: /admin/bips with FTS + tabs + DropdownMenu (Edit/Review/Open public/Un-approve), getAdminBips, /admin/analytics with 3 stat cards (Total/Submissions month/Top 5 countries), getAdminAnalytics, revalidate=300

**Wave 6** *(blocked on Wave 5 completion)*
- [ ] 03-07-PLAN.md — Admin edit (wizard reuse): mode=admin prop on BipSubmissionWizard (banner + auto-save suppressed), adminUpdateBipAction (no status change, conditional revalidatePath, no email), AdminEditFooter, /admin/bips/[id]/edit page
**UI hint:** yes

**Key Deliverables:**
- `(admin)` route group with triple-layer role guard (middleware + layout + RLS)
- Admin review queue RSC showing pending BIPs
- `/admin/bips/[id]/review`: full BIP detail + approve/reject with confirmation modal (BIP title shown)
- Server Actions: `approveBipAction`, `rejectBipAction` with state machine validation (no direct `rejected → approved`)
- `bip_status_history` audit log table + insert in approve/reject actions
- `revalidatePath()` calls inside approval/rejection actions (ISR bust for `/bips` + `/bip/[slug]`)
- Resend email templates: coordinator approval notice, coordinator rejection notice (with reason), admin new-submission alert
- Admin edit (reuse submission wizard in admin context)
- All listings view with status filter + basic analytics dashboard
- `createAdminClient` isolation: lint rule prevents import outside `(admin)` paths; `security_invoker = true` on analytics views

---

### Phase 4: Polish + Static Content + Performance Hardening
**Goal:** Everything that exists works perfectly. Lighthouse > 90 on all page types. GDPR-compliant. Open-source-ready.
**Mode:** mvp
**Depends on:** Phase 3
**Requirements:** INFO-01, INFO-02, INFO-04, FOUN-05, FOUN-06, FOUN-07, FOUN-10
**Success Criteria** (what must be TRUE):
  1. A student can read the `/what-is-a-bip` explainer page including FAQ and click through to official EC Erasmus+ documentation
  2. A user visiting from the EU is shown a GDPR cookie consent banner before any analytics scripts load; a privacy policy page is accessible from the footer
  3. A coordinator can delete their account: approved BIPs are anonymized, drafts are deleted, and the profile row is removed (GDPR right to erasure)
  4. Homepage and `/bips` achieve Lighthouse > 90 on Performance, Accessibility, and SEO; LCP < 1.5s on 4G mobile simulation
  5. Playwright E2E suite passes covering: auth flow, submission wizard, admin approve/reject, and map click-to-filter; the repo is runnable by any contributor via `supabase start` + `npm run dev` with a `CONTRIBUTING.md` explaining the EU emblem prohibition
**Plans:** 6/7 plans complete
Plans:
- [x] 04-01-PLAN.md — `/what-is-a-bip` static explainer page with 5 sections + 8-item FAQ accordion + EC outbound link (INFO-01, INFO-02, INFO-04) [completed 2026-05-13]
- [x] 04-02-PLAN.md — `/privacy` static policy page (8 sections, ~600-900 words) + footer link; documents the zero-analytics posture (FOUN-05, FOUN-06) [completed 2026-05-14]
- [x] 04-03-PLAN.md — Static OG PNGs for `/` and `/bips` (1200×630) + scripts/og-template.html for regeneration; wires metadata.openGraph.images [completed 2026-05-14]
- [x] 04-04-PLAN.md — Repo health: CONTRIBUTING.md (8 sections, EU emblem prohibition) + CODE_OF_CONDUCT.md (Contributor Covenant v2.1) + .env.example audit + .gitleaks.toml + .github/workflows/secret-scan.yml (FOUN-05 documented) [completed 2026-05-14]
- [x] 04-05-PLAN.md — Account deletion vertical slice (FOUN-07): migration 00013 `delete_my_account()` SECURITY DEFINER RPC + deleteAccountAction + /dashboard/settings Danger Zone + DeleteAccountDialog (typed-email) + DashboardNav gear icon + post-deletion toast island [completed 2026-05-14]
- [x] 04-06-PLAN.md — Performance hardening: @next/bundle-analyzer wired behind ANALYZE=true + 3 package.json scripts + 4 Suspense skeletons on /bips + image audit (clean) + Lighthouse capture protocol staged for manual run (D-18..D-21, D-24) [completed 2026-05-14]
- [x] 04-07-PLAN.md — Playwright E2E (FOUN-10) + a11y polish: playwright.config.ts + seed.e2e.sql (3 fixture users + 2 pending BIPs) + storage-state setup + 4 specs (auth, submission, admin-review, map-filter) + EDGE-CASES-DEFERRED.md (29 deferred cases) + .github/workflows/e2e.yml + axe-DevTools sweep procedure staged (manual run pending) [completed 2026-05-14]
**UI hint:** yes

**Key Deliverables:**
- `/what-is-a-bip` static RSC page (`force-static`) with FAQ and EC documentation link
- `CONTRIBUTING.md`: setup instructions, EU emblem prohibition (star count ≠ 12), PR checklist
- `.env.example` with placeholder values only + pre-commit secret scanning hook
- GDPR cookie consent banner (analytics blocked until consent), privacy policy page
- `deleteAccount` Server Action: anonymize approved BIPs, cascade-delete drafts + profile
- Lighthouse audit + bundle analyzer report on homepage, `/bips`, and `/bip/[slug]`
- `<BipFilters>` wrapped in `<Suspense>` boundary (required by `useSearchParams()`)
- Accessibility audit: keyboard navigation for Europe map country `<select>` fallback, ARIA labels on all interactive elements
- OG image fallbacks for homepage and `/bips`
- `package.json` scripts: `db:start`, `db:reset`, `db:types`, `db:migrate`, `test`, `test:e2e`
- Playwright E2E suite: auth flow, submission wizard, admin approve/reject, map click-to-filter

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Discovery Foundation | 8/8 | Complete    | 2026-05-09 |
| 2. Coordinator Auth + Submission | 0/7 | Not started | - |
| 3. Admin Review + Email Notifications | 0/TBD | Not started | - |
| 4. Polish + Static Content + Performance Hardening | 5/7 | In Progress | - |
