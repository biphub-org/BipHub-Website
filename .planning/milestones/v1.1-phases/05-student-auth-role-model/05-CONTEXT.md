# Phase 5: Student Auth + Role Model - Context

**Gathered:** 2026-06-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Students can create an account and sign in via **magic link (passwordless)**, landing on a dedicated `/student-dashboard` that is fully separated from the coordinator (`/dashboard`) and admin (`/admin`) areas. Introducing the `student` role must **tighten** existing role guards, not weaken them — specifically, a student JWT must be unable to insert a `bips` row.

**In scope:** student role added to the data model; `/register/student` magic-link entry (signup + sign-in); `app/(student)/` route group + minimal dashboard shell; cross-role redirect/access matrix; RLS + middleware hardening so the new role grants zero coordinator/admin access.

**Out of scope (later phases):** saving BIPs server-side (Phase 6), alert subscriptions/email (Phase 7), edit-approved-BIP flow (Phase 8). The student dashboard ships as a shell here — no save/alert features.
</domain>

<decisions>
## Implementation Decisions

The user delegated all four discussed gray areas ("you decide for all"). Every decision below is **Claude's discretion**, but each is grounded in the locked v1.1 research (`SUMMARY.md`, `PITFALLS.md`, `ARCHITECTURE.md`) and the existing v1.0 auth code — not invented. Downstream agents should treat them as the working contract and may refine only with explicit justification.

### Entry Points & Sign-In
- **D-01:** A single page `/register/student` serves **both** new signups and returning sign-ins. Uses Supabase `signInWithOtp({ email, options: { shouldCreateUser: true, ... } })` — magic link behaves identically for new vs existing users, so STUD-01 ("create an account AND sign in via magic-link") is satisfied by one entry point. No separate `/login/student`.
- **D-02:** After submit, show a "check your email" confirmation state (no password field anywhere in the student flow).
- **D-03:** Student auth is **fully separate** from coordinator auth. Coordinator `/register` (email+password) and `/login` (`signInWithPassword`) are left untouched — no method change for existing users. A cross-link ("Are you a student?") on `/login` is optional and deferred to the UI-SPEC.
- **D-04:** The magic-link request sets `options.data = { role: 'student' }` and `emailRedirectTo` pointing at a student-aware callback destination so the post-verification redirect lands on `/student-dashboard` (not the coordinator `/onboarding`).

### Role Assignment Safety
- **D-05:** Migration `00015_student_role.sql` extends `profiles.role` CHECK to `('coordinator','admin','student')`. (Current default `'coordinator'` is a trap for students — see D-07.)
- **D-06:** **Custom Access Token Hook (PL/pgSQL, in-process — NOT an Edge Function)** injects the role claim into the JWT at issuance time. This is the locked fix for PITFALLS Pitfall 1 (the `sync_role_to_app_metadata()` trigger mirrors role only on the *next* refresh, leaving `app_metadata.role` null for up to 1h after signup — which would break role-based middleware routing for brand-new students). The hook makes role available in the very first student JWT.
- **D-07:** A newly-created student's `profiles` row is created with `role='student'` (carried via `raw_user_meta_data.role` from D-04). The student flow **never overwrites an existing account's role** — if someone requests a magic link with an email already belonging to a coordinator/admin, Supabase signs them into that existing account and they route per their existing role. One role per account; no multi-role. (Planner picks trigger-vs-callback materialization; the *invariant* — student-route signups are `role='student'`, existing roles immutable via this path — is locked.)
- **D-08:** `profiles.university_id` stays nullable; student profiles have `university_id = NULL` by design (PITFALLS Pitfall 2). The coordinator `/onboarding` profile-complete gate must **not** fire for students.
- **D-09:** Harden `profiles_update_own_or_admin` into a **role-stable** UPDATE policy — a non-admin user cannot change their own `role` via the policy's `WITH CHECK` (prevents student→coordinator self-escalation). Satisfies FOUN-07.

### Cross-Role Access Matrix
- **D-10:** New `app/(student)/` route group containing `/student-dashboard`; its `layout.tsx` enforces `role='student'` as defense-in-depth (mirrors the coordinator dashboard layout pattern).
- **D-11:** Redirect/access matrix (enforced in `middleware.ts`, reading `app_metadata.role` from validated `getClaims()`):

  | Route group | signed-out | student | coordinator | admin |
  |---|---|---|---|---|
  | `/student-dashboard/*` | → `/register/student` | **allow** | → `/dashboard` | → `/admin` |
  | `/dashboard`, `/onboarding` | → `/login` | → `/student-dashboard` | allow | allow (unchanged) |
  | `/admin/*` | → `/login?next=/admin` | → `/` | → `/` | allow (unchanged) |

  This satisfies success-criterion 4 (student hitting `/dashboard` → `/student-dashboard`) and tightens, not weakens, existing guards (PITFALLS Pitfall 3).
- **D-12:** Tighten `bips_insert_coordinator` RLS to also require `app_metadata.role IN ('coordinator','admin')` (closes the latent hole where any authenticated user could insert — success-criterion 5 / FOUN-08). Add a belt-and-suspenders **explicit role assertion** in coordinator BIP-submit Server Action(s) (application layer + RLS, per Pitfall 3), since RLS alone is subject to the JWT-timing caveat.
- **D-13:** `/register/student` is excluded from middleware by the existing matcher (`register` is in the negative lookahead). An already-authenticated student visiting it is bounced via a **server-side redirect on the page itself**, not middleware. The existing middleware matcher comment says "DO NOT modify" — planner must decide whether `/student-dashboard` protection requires a matcher change or is handled purely in the new layout; flag this explicitly.

### Student Dashboard Shell
- **D-14:** Phase 5 ships a **real but minimal** dashboard: a welcome/greeting header, an account section (signed-in email + Sign out), and a primary "Browse BIPs" CTA to `/bips`. **No fake placeholders** for Saved BIPs / Alerts (avoid dead UI promising unshipped features); at most one quiet "Saved BIPs and alerts are coming soon" line. Exact layout deferred to `/gsd-ui-phase 5` (UI hint: yes). Reuses existing `Card`/`Button` + layout chrome; inherits the EC footer disclaimer.
- **D-15:** Student **sign-out lands on `/`** (public home), not `/login`. The existing `signOutAction` hardcodes `redirect('/login')` — planner adds a student variant or a redirect-target parameter.

### Claude's Discretion
All decisions D-01 through D-15 above were delegated by the user ("you decide for all"). The planner/researcher has flexibility on *materialization details* (trigger vs callback for profile creation; matcher edit vs layout-only guard; sign-out variant vs param) but must preserve the locked invariants: magic-link-only for students, `role='student'` on student-route signups with existing roles immutable, the redirect matrix in D-11, and the tightened `bips_insert_coordinator` policy in D-12.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope & requirements
- `.planning/ROADMAP.md` §"Phase 5: Student Auth + Role Model" — goal, 5 success criteria, requirement IDs (STUD-01/02/03, FOUN-07/08)
- `.planning/REQUIREMENTS.md` — STUD-01..03 (magic-link, session persistence, dedicated dashboard), FOUN-07 (RLS USING+WITH CHECK), FOUN-08 (student role grants no coordinator/admin access)

### Locked v1.1 research (authoritative)
- `.planning/research/SUMMARY.md` §"Phase 1 (5): Student Auth + Role Model" (lines ~142-150) — deliverables, migration name `00015_student_role.sql`, pitfalls to avoid
- `.planning/research/SUMMARY.md` §"Stack — Auth — student role" (line 38) — third role in `profiles.role` CHECK; **Custom Access Token Hook as PL/pgSQL, not Edge Function**
- `.planning/research/PITFALLS.md` Pitfall 1 (JWT role timing — use `auth.uid()` for student-table INSERT RLS; force/refresh role in JWT), Pitfall 2 (profiles audit — `university_id` nullable; no `/onboarding` for students), Pitfall 3 (middleware + `bips_insert_coordinator` must be tightened in the same migration as the role extension)
- `.planning/research/ARCHITECTURE.md` §`app/(student)/` route group (line ~136), §migration table (line ~721 — `00015_student_role.sql` scope: extend CHECK, fix `bips_insert_coordinator`, fix `profiles_update_own_or_admin` role-stability)

### Project standards
- `CLAUDE.md` — never-do items: `getClaims()` only (never `getSession()`), `await cookies()` in client factories, RLS with both USING + WITH CHECK, `createAdminClient` confined to `app/(admin)/` + `lib/supabase/admin.ts`, footer disclaimer on every page

### Existing code to extend (read before modifying)
- `middleware.ts` — current `getClaims()` guard; `/dashboard` + `/onboarding` (auth-only) and `/admin` (role) branches; matcher marked "DO NOT modify" (D-13)
- `lib/actions/auth.ts` — coordinator email+password actions; `signInAction` post-login routing + profile-complete check; `signOutAction` (redirects to `/login` — see D-15)
- `app/auth/callback/route.ts` — PKCE `exchangeCodeForSession`; routes signup→`/onboarding`, recovery→`/reset-password/update` (needs a student/magic-link destination — D-04)
- `supabase/migrations/00002_universities_profiles.sql` — `profiles` table, `role` CHECK + default `'coordinator'`, `sync_role_to_app_metadata()` trigger
- `supabase/migrations/00006_rls_policies.sql` — `bips_insert_coordinator` (the hole), `profiles_update_own_or_admin` (to harden)
- `supabase/migrations/00008_app_metadata_role_mirror.sql` — role mirror hardening + backfill (context for the Custom Access Token Hook decision)
- `lib/supabase/{server,client,middleware,admin}.ts` — client factories (all `await cookies()`)
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`lib/supabase/server.ts` / `middleware.ts` factories**: reuse verbatim for the student magic-link Server Action and the student-dashboard RSC layout — no new client wiring.
- **`signOutAction` (`lib/actions/auth.ts`)**: reusable for student sign-out, but its hardcoded `redirect('/login')` must become `/` for students (D-15).
- **Coordinator `(dashboard)/layout.tsx` guard pattern**: template for the new `(student)/layout.tsx` role guard.
- **`Card` / `Button` shadcn components + EU-brand chrome + footer disclaimer**: dashboard shell reuses these; no net-new visual primitives expected.

### Established Patterns
- **Role in `profiles.role`, mirrored to `app_metadata.role` via trigger; RLS reads the JWT claim** — Phase 5 extends this with a Custom Access Token Hook so the claim is present at *issuance* (not just on refresh).
- **Server Actions for all mutations; `getClaims()` everywhere; `await cookies()` in factories** — student auth follows the same rules.
- **Route groups segment access** (`(auth)`, `(dashboard)`, `(admin)`, `(public)`) — add `(student)`.
- **Every UPDATE policy carries both USING + WITH CHECK** — the role-stable `profiles` policy (D-09) must follow this.

### Integration Points
- `middleware.ts` redirect matrix (D-11) — the central enforcement point; touch carefully given the "DO NOT modify" matcher note.
- `app/auth/callback/route.ts` — add the magic-link → `/student-dashboard` destination.
- `supabase/migrations/00015_student_role.sql` — single migration carrying role CHECK extension + `bips_insert_coordinator` tightening + role-stable `profiles` UPDATE + Custom Access Token Hook (per ARCHITECTURE.md scope).
- Coordinator BIP-submit Server Action(s) in `lib/actions/` — add explicit role assertion (D-12).
</code_context>

<specifics>
## Specific Ideas

- Magic-link only for students was explicitly confirmed in research (SUMMARY.md Open Questions: "Magic-link only for v1.1 (~40% lower abandonment)"). Do not add a password option for the student role.
- The migration is pre-named `00015_student_role.sql` and its scope is pre-specified in ARCHITECTURE.md (line ~721) — follow that scope rather than splitting it.
</specifics>

<deferred>
## Deferred Ideas

- **Server-side saved BIPs / heart-icon persistence** — Phase 6 (STUD-04..08, FOUN-09/10). The Phase 5 dashboard intentionally omits it.
- **Alert subscriptions + digest email** — Phase 7.
- **Institutional-email domain validation for students** — research defers this to v1.2+; not gated in Phase 5.
- **Cross-link / unified auth landing page** ("student vs coordinator" chooser) — optional UI polish, decide during `/gsd-ui-phase 5` if at all.

None of the above were pulled into Phase 5 scope.
</deferred>

---

*Phase: 5-student-auth-role-model*
*Context gathered: 2026-06-15*
