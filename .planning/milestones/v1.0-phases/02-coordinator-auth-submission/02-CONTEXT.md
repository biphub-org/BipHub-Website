# Phase 2: Coordinator Auth + Submission - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 delivers the complete coordinator-facing pipeline: a university coordinator can register with an institutional email, receive a Resend verification link, verify their account, complete their university profile at `/onboarding` (hard gate — dashboard is inaccessible until profile is complete), and log in with session persisting across browser refreshes. A coordinator can submit BIPs through a 5-step wizard with Zustand-backed auto-save (step navigation + 1.5s debounced field blur), preview the rendered BIP detail before submitting, and see their BIPs in a dashboard at `/dashboard` with status tabs and per-status actions. Password reset, sign-out from any page, and two-tab draft conflict detection (via `updated_at` optimistic locking) are all included. Admin review, Resend status-notification emails, GDPR consent, `/what-is-a-bip`, and Playwright E2E coverage belong to later phases.

</domain>

<decisions>
## Implementation Decisions

### Submission Wizard (SUBM-01..08)

- **D-01: 5-step wizard field grouping** (Claude's call):
  - **Step 1 — Basic info:** title, ISCED-F code, description, learning outcomes
  - **Step 2 — Program details:** virtual component description + timing, host city, physical dates (start/end), application deadline, ECTS credits, max participants, study levels, instruction language + CEFR level minimum
  - **Step 3 — Partners:** host university (pre-filled from coordinator's profile), partner universities (searchable autocomplete from `universities` table OR free-text entry for unregistered partners)
  - **Step 4 — Application info:** green travel flag, inclusion support flag, eligibility notes, how-to-apply (contact name + email, or external URL)
  - **Step 5 — Preview:** full rendered BIP detail card (reuses `/bip/[slug]` layout) + Submit button (sets status to `pending`)
- **D-02: Auto-save strategy:** save on step navigation + 1.5s debounce on field blur. Show a subtle `Saving… / Saved` status indicator in the wizard header. Draft is backed by a Zustand store throughout the session.
- **D-03: Save failure UX:** toast error (`Failed to save — Retry`) + retry button. Draft data is preserved in the Zustand store — no input is lost on a failed save. Retry re-fires the Server Action.
- **D-04: Two-tab conflict (SUBM-06)** (Claude's call): When a save is rejected due to a stale `updated_at`, show a non-destructive modal — **"Draft updated in another tab — Reload to get latest, or Overwrite."** User chooses; no silent data loss.

### Onboarding Gate (AUTH-07)

- **D-05: Hard onboarding gate:** Profile-incomplete coordinators are always redirected to `/onboarding`. The `(dashboard)` layout server component checks for a complete profile row; incomplete → redirect to `/onboarding`. Dashboard and wizard wizard are inaccessible until `full_name`, `university_id`, `country`, `erasmus_code`, and `contact_email` are all set.
- **D-06: `/onboarding` route location:** Inside `(dashboard)` route group (`app/(dashboard)/onboarding/page.tsx`). Auth guard (logged in + email verified) applies; profile-complete guard does not apply here — `/onboarding` is the destination for incomplete profiles.
- **D-07: Post-verification redirect:** `auth/callback` route handler exchanges the Supabase PKCE code and redirects directly to `/onboarding`. No intermediate "Email verified!" confirmation screen.
- **D-08: University selector on `/onboarding`:** Searchable autocomplete against the `universities` table. If the coordinator's university is not found, they can add it as a new row (simple name + country form). This keeps the `universities` table populated by coordinators and enables partner autocomplete in the wizard (Step 3).

### Coordinator Dashboard (DASH-01..06)

- **D-09: Status tabs:** `All / Draft / Pending / Approved / Rejected`, each with a count badge. `All` is the default selected tab. Clicking a tab filters the BIP list client-side (or via URL param for shareability).
- **D-10: Per-status card actions:**
  - **Draft:** Edit (opens wizard at last completed step), Delete
  - **Pending:** Edit (wizard re-opened), Withdraw (sets status back to `draft`)
  - **Approved:** View public page (`/bip/[slug]`)
  - **Rejected:** View public page (will 404 since not live), rejection reason shown inline on the card
- **D-11: New BIP entry point:** A prominent gold/primary `+ Submit a BIP` button in the dashboard header, always visible regardless of active tab.

### Auth Pages Chrome (AUTH-01..06)

- **D-12: Auth page layout** (Claude's call): `/login`, `/register`, `/verify-email` use a **minimal centered card layout** — no StickyNav, no public Footer. BipHub logo at top, form, footer links (e.g., "Already have an account? Sign in") only.
- **D-13: Auth card background** (Claude's call): Soft `#f7f8fc` page background with a white card with `box-shadow: 0 4px 16px rgba(10, 23, 53, 0.06)`. Consistent with the Phase 1 card pattern.
- **D-14: Coordinator dashboard nav:** Separate nav component for the `(dashboard)` route group — BipHub logo (links to `/`), a `Dashboard` breadcrumb, and a `Sign out` button at the right. Does NOT reuse the public `StickyNav`.
- **D-15: Public StickyNav for logged-in coordinators:** When a coordinator session is detected on the public site (`/bips`, `/bip/[slug]`, etc.), the public `StickyNav` adds a `Dashboard` link and the coordinator's initials/avatar at the right. Requires the `StickyNav` to check for session state client-side (or via RSC prop drilling from the public layout).

### Claude's Discretion
The user delegated the following implementation calls (recorded in DISCUSSION-LOG.md):
- D-01 (wizard step grouping): defaulted to 5-step logical Erasmus+ field grouping.
- D-04 (two-tab conflict UX): defaulted to Reload/Overwrite modal — non-destructive, no silent data loss.
- D-12 (auth page layout): defaulted to minimal centered card, no public shell.
- D-13 (auth card background): defaulted to soft `#f7f8fc` + white card — consistent with Phase 1 card pattern.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level (always relevant)
- `CLAUDE.md` — locked stack; never-do list; visual + brand constraints; critical auth pitfalls.
- `CONTEXT.md` (repo root) — original founder brief; visual direction; v1 scope.
- `.planning/PROJECT.md` — synthesized project context; key decisions table; out-of-scope list.
- `.planning/REQUIREMENTS.md` — Phase 2 requirements: AUTH-01..07, SUBM-01..08, DASH-01..06 (22 requirements).
- `.planning/ROADMAP.md` §"Phase 2: Coordinator Auth + Submission" — goal, success criteria, key deliverables.
- `.planning/STATE.md` — current blockers; note: "Zod v4 / `@hookform/resolvers` compatibility — recheck before Phase 2 starts" (Zod v3 confirmed locked).

### Phase 1 research outputs (still authoritative for auth + RLS patterns)
- `.planning/research/ARCHITECTURE.md` — route group layout, RLS roles via `app_metadata`, RSC-as-data-fetcher pattern, server-action-only mutations, `getClaims()` vs `getSession()` pattern.
- `.planning/research/PITFALLS.md` — auth pitfalls: middleware infinite-redirect (Pitfall 2), `getSession()` server-side (Pitfall 1), `await cookies()` (Pitfall 3), `WITH CHECK` on UPDATE policies (Pitfall 5).
- `.planning/research/STACK.md` — locked dependency versions: Zod v3, `@hookform/resolvers` v3.x, `@supabase/ssr` exact 0.5.2, Next.js 15.5.x LTS.

### Phase 1 context (prior decisions that carry forward)
- `.planning/phases/01-discovery-foundation/01-CONTEXT.md` — auth pattern decisions (D-12 equivalent: `getClaims()` always, `await cookies()`, never `getSession()`), Zustand store pattern (bookmarks → reuse for draft store), Server Actions only for mutations.

### Existing Phase 1 code (planner must read these to avoid re-implementation)
- `middleware.ts` — Phase 2 redirect branches are already documented in comments (lines 13-18). Planner adds them without changing the matcher.
- `lib/supabase/middleware.ts` — existing `createMiddlewareClient` factory; Phase 2 adds no new factories.
- `lib/supabase/server.ts` — existing `createServerClient` factory with `await cookies()` pattern.
- `supabase/migrations/00006_rls_policies.sql` — `profiles_insert_own`, `bips_insert_coordinator`, `bips_update_own_draft_or_pending` policies already in place; planner does not recreate them.
- `supabase/migrations/00008_app_metadata_role_mirror.sql` — role mirror trigger already in place; Phase 2 registration flow does not need to re-implement role sync.

### No SPEC.md
This phase has no `/gsd-spec-phase`-generated SPEC.md. Requirements are captured in REQUIREMENTS.md and bounded in ROADMAP.md "Phase 2" section.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Zustand store pattern** (`lib/stores/bookmarks.ts` from Plan 01-05): establishes the Zustand + localStorage hydration pattern. The BIP draft store reuses this pattern (Zustand for in-memory state, localStorage backup for session-expiry recovery per SUBM-07).
- **`BipCard`** (`components/home/BipCard.tsx`): reusable for the dashboard BIP list — shows title, university, status, dates. May need a `dashboardVariant` prop to surface coordinator-specific actions (Edit, Delete, Withdraw) instead of the public Bookmark button.
- **`lib/supabase/server.ts`** (`createServerClient` with `await cookies()`): used directly in Server Actions and RSC data-fetching functions. No new factory needed for Phase 2.
- **Zod schemas** (`lib/schemas/bip-filters.ts` from Plan 01-06): establishes the Zod v3 + React Hook Form pattern for form validation. Wizard step schemas follow the same pattern.
- **shadcn/ui components** (installed in Phase 1): `Button`, `Card`, `Accordion`, `Slider`, `Drawer` (Vaul). `Input`, `Select`, `Textarea`, `Combobox`, `Form` (shadcn) will be needed for the auth forms and wizard — check which are already installed before running `shadcn add`.

### Established Patterns
- **Server Actions for all mutations:** `signIn`, `signUp`, `signOut`, `saveDraftAction`, `submitBipAction` all follow `'use server'` + `getClaims()` + `await cookies()`. No API routes.
- **`getClaims()` everywhere server-side:** NEVER `getSession()`. This applies to Server Actions, RSC data-fetching, and the dashboard layout auth guard.
- **`await cookies()` in every Supabase server client factory:** mandatory for Next.js 15 (PITFALLS Pitfall 3).
- **Zod v3 + `@hookform/resolvers` v3.x:** all form validation schemas use Zod v3. Do not upgrade to Zod v4.
- **Tailwind v4 static class names:** no template literals in className. Use complete strings in lookup objects for dynamic variants (e.g., status badge colors).
- **`motion` from `motion/react`, wrapped in `LazyMotion`:** any new animated components follow this pattern. No top-level `motion` imports.

### Integration Points
- **`middleware.ts`:** Phase 2 adds two redirect branches (documented in comments): `!claims && /dashboard → /login`; `claims && (/login || /register) → /dashboard`. The matcher is unchanged.
- **`(public)` layout (`app/(public)/layout.tsx`):** Phase 2 adds session-awareness to `StickyNav` — a `Dashboard` link + initials appear when a coordinator is logged in. The layout must fetch claims server-side (or pass a prop) to conditionally render these items without a client-side flash.
- **`profiles` table:** `profiles_insert_own` RLS policy (migration 00006) allows coordinators to insert their own row. The `/onboarding` Server Action upserts the profile row — must include `id = auth.uid()` to satisfy the policy.
- **`universities` table:** `universities_select_public` policy allows any user to search. Adding a new university (`universities_insert_admin` currently admin-only) — Phase 2 either relaxes this to `authenticated` for self-registration or uses a service-role insert in the Server Action with careful validation. **Planner must choose and document.**
- **`bips` table:** `bips_insert_coordinator` + `bips_update_own_draft_or_pending` policies already in place from migration 00006. `saveDraftAction` and `submitBipAction` operate within these RLS boundaries.

</code_context>

<specifics>
## Specific Ideas

- **Middleware redirect comments are pre-written:** `middleware.ts` lines 13-18 already document exactly what Phase 2 adds (`!claims && /dashboard → /login`; `claims && /login|/register → /dashboard`). Planner should implement precisely as documented there.
- **University insert RLS:** Currently `universities_insert_admin` only. The onboarding autocomplete "add new university" flow will need either a policy relaxation (to `authenticated`) or a service-role server action. This is a security-sensitive decision the planner must resolve and document.
- **`is_seed` flag on dashboard:** BIP cards in the coordinator dashboard should NOT show the "Demo data" pill — coordinators submit real BIPs. The `is_seed` flag (D-16 from Phase 1) is a public browsing detail only.
- **StickyNav session-awareness:** The public `StickyNav` is currently a pure RSC with no auth check. Showing Dashboard + initials requires either (a) fetching `getClaims()` in the `(public)` layout and passing it as a prop, or (b) a lightweight client component island for the auth area of the nav. Approach (a) is preferred — consistent with the "RSC as data fetcher" pattern from ARCHITECTURE.md.

</specifics>

<deferred>
## Deferred Ideas

- **"Are you a coordinator? List a BIP" CTA on empty-state filter results** — flagged in Phase 1 CONTEXT.md. Now that the coordinator flow ships in Phase 2, this CTA becomes viable. Consider adding it as a Phase 2 plan or Phase 3 polish item — it requires `/register` to exist, which it does after Phase 2.
- **Coordinator invite flow for unregistered partner universities** (GROW-01) — v2 requirement. Phase 2 uses free-text entry for unregistered partners.
- **Admin "Request changes" action** (GROW-03) — v2 requirement. Phase 3 only adds approve/reject.
- **Edit approved BIPs with re-review trigger** (GROW-04) — v2 requirement. Phase 2 only allows editing draft/pending.

</deferred>

---

*Phase: 2-Coordinator-Auth-Submission*
*Context gathered: 2026-05-09*
