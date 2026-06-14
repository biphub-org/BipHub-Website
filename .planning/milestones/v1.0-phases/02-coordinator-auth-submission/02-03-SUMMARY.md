---
phase: 02-coordinator-auth-submission
plan: "03"
subsystem: auth-perimeter
tags: [middleware, supabase, getClaims, rsc, sticky-nav, x-pathname]

requires:
  - phase: 01-discovery-foundation
    provides: middleware.ts (Phase 1 getClaims-only), createMiddlewareClient, createClient (server), StickyNav (client component), (public)/layout.tsx (sync)
  - phase: 02-coordinator-auth-submission
    provides: profiles table (extended in Plan 02-01 with erasmus_code; reads full_name here)
provides:
  - Phase 2 redirect branches in middleware.ts (auth-required for /dashboard*, /onboarding*; bounce-off for /login, /register)
  - x-pathname response header injected on every middleware-served response (consumed by Plan 02-04 dashboard layout)
  - Async PublicLayout RSC that calls getClaims() once + a single .maybeSingle() fetch for profiles.full_name when authenticated
  - Session-aware StickyNav with optional `hasClaims` + `initials` props; both desktop right-side block and mobile Sheet bottom CTAs branch on session
affects: [02-04-dashboard-onboarding, 02-05-bip-list, 02-06-wizard-core, 02-07-wizard-submit, 03-admin-review]

tech-stack:
  added: []
  patterns:
    - "Edge middleware pattern: getClaims() (validates JWT) -> set x-pathname response header -> redirect branches keyed on pathname.startsWith for protected groups + exact match for auth pages"
    - "RSC-to-client serializable-prop hand-off (Pitfall 5): async layout fetches claims + profile, passes hasClaims:boolean + initials:string|null to 'use client' component (no hydration drift, no flash)"
    - "Initials derivation chain: profiles.full_name first-letters -> email local-part first-2-chars -> '··' sentinel"

key-files:
  created: []
  modified:
    - middleware.ts
    - app/(public)/layout.tsx
    - components/home/StickyNav.tsx

key-decisions:
  - "Keep branch (3b) (claims && pathname === '/login' | '/register' -> /dashboard) even though the existing matcher excludes /login and /register from middleware. Defense-in-depth so Phase 3+ matcher widening cannot silently drop the redirect; Plan 02-02 Server Actions still drive the user-visible bounce post-login."
  - "Use response.headers.set('x-pathname', pathname) (not request header rewrite) so RSC layouts read the value via Next.js's headers() bridge — matches the Plan 02-04 contract."
  - "Use .maybeSingle() (NOT .single()) for the profile fetch — coordinators between signup and onboarding-completion have no profiles row yet; .single() would throw on PGRST116 every render."
  - "Initials sentinel '··' (two middle dots, U+00B7) instead of '??' so QA can distinguish 'fallback fired' from a placeholder typo."
  - "destructure const { data } = await supabase.auth.getClaims(); const claims = data?.claims ?? null — `data` is null when no session exists; the plan's `const { data: { claims } }` shape would tsc-error against the Supabase typings (data nullable)."

patterns-established:
  - "Auth perimeter pattern: middleware does the redirect; the (public) RSC layout reads getClaims() for chrome-personalization only — never for authorization. Authorization stays at the middleware boundary so Plan 02-04 doesn't need to repeat the redirect."

requirements-completed: [AUTH-06]

duration: 5min
completed: 2026-05-09
---

# Phase 02-03: Auth Perimeter + Session-Aware Public Nav Summary

**Phase 2 auth perimeter is live: middleware now redirects unauthenticated `/dashboard*` and `/onboarding*` traffic to `/login`, bounces authenticated users off `/login`/`/register` (defense-in-depth), and stamps every response with `x-pathname` so Plan 02-04's profile-complete gate has a referer-free signal. The public StickyNav is session-aware via an async RSC layout that calls `getClaims()` once and conditionally renders a Dashboard link + initials avatar.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-09T14:07:41Z
- **Completed:** 2026-05-09T14:12:32Z
- **Tasks:** 2 of 2 executed
- **Files modified:** 3 (middleware.ts, app/(public)/layout.tsx, components/home/StickyNav.tsx)

## Accomplishments

- **AUTH-06 implemented end-to-end:** server-side session detection in `(public)/layout.tsx` flows through serializable props to the StickyNav client component; the right-side block and the mobile Sheet bottom CTAs both adapt without a client-side flash.
- **Plan 02-04 unblocked:** middleware sets `response.headers.set('x-pathname', pathname)` on every matched request, so the future `(dashboard)/layout.tsx` profile-complete gate can read the path via `headers()` without parsing referer or risking the Pitfall 2 infinite-redirect loop.
- **Plan 02-05 unblocked:** anonymous traffic to `/dashboard*` is now intercepted at the Edge before the layout even mounts.
- **Phase 2 redirect surface complete (matcher unchanged):** the Phase 1 matcher byte-string is preserved; redirects are added in the function body only. `/login`, `/register`, `/auth`, and `*.json` (the EU map's `eu-countries.json`) are still excluded.

## Task Commits

1. **Task 1: middleware.ts** — `1edaf64` (feat) — `getClaims()` validation + `x-pathname` response header injection + two redirect branches; matcher unchanged.
2. **Task 2: StickyNav + (public)/layout.tsx** — `529abcc` (feat) — async RSC layout fetches claims + `profiles.full_name` via `.maybeSingle()`; StickyNav gains `hasClaims`/`initials` optional props; both desktop and mobile (Sheet) CTAs branch on session.

## Files Created/Modified

- `middleware.ts` — replaced Phase 1's getClaims-only body with three responsibilities: claim validation, `x-pathname` header injection, two redirect branches. Matcher block byte-identical to Plan 01-01.
- `app/(public)/layout.tsx` — converted from sync to `async`, imports `createClient`, calls `getClaims()` once, runs a single `.maybeSingle()` profile fetch when claims exist, derives `initials` via the documented fallback chain, passes `hasClaims` + `initials` as serializable props to `<StickyNav>`.
- `components/home/StickyNav.tsx` — added `StickyNavProps { hasClaims?: boolean; initials?: string | null }` with safe defaults; right-side desktop block + mobile Sheet bottom CTA section both branch on `hasClaims`. The Sheet drawer infrastructure (focus trap, Escape, focus return) is unchanged.

## Decisions Made

- See key-decisions in frontmatter. Three notable adaptations:
  - Switched from the plan's `const { data: { claims } } = await ...getClaims()` shape to `const { data } = ...; const claims = data?.claims ?? null` to satisfy Supabase's typings (`data` is nullable when no session exists).
  - Replaced the comment line `NEVER use getSession() -- ...` with `NEVER use the unvalidated session reader -- ...` because the plan's automated regex check `!/getSession\(/.test(m)` matches the substring even inside comments. Intent (CLAUDE.md never-do compliance) preserved verbatim in spirit.
  - Added `(w: string) =>` annotation on the `.map((w) => w[0])` callback inside `(public)/layout.tsx` to satisfy `noImplicitAny` — Supabase's `profile.full_name` is typed as a column row property and the inferred parameter widened to `any` after `.split`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `getClaims()` destructure shape mismatch**
- **Found during:** Task 1 (typecheck after writing middleware).
- **Issue:** The plan's literal code `const { data: { claims } } = await supabase.auth.getClaims()` fails `tsc --noEmit`: the Supabase return type is `{ data: { claims; header; signature } | null }` — `data` itself can be `null`, so destructuring `data.claims` is invalid (TS2339).
- **Fix:** Two-step destructure with a nullish coalesce: `const { data } = await supabase.auth.getClaims(); const claims = data?.claims ?? null`.
- **Files modified:** `middleware.ts`. Same correction applied to `app/(public)/layout.tsx` for consistency.
- **Commit:** `1edaf64` (middleware), `529abcc` (layout).

**2. [Rule 3 — Blocking] Plan's verifier regex hits `getSession` substring inside its own warning comment**
- **Found during:** Task 1 (running the plan's `node -e "..."` automated check).
- **Issue:** Plan said `* NEVER use getSession() -- it does not validate JWT signatures.` and also expected `!/getSession\(/.test(m)` to be true. The substring `getSession(` appears in the comment, so the check fails.
- **Fix:** Reworded the comment to `* NEVER use the unvalidated session reader -- it does not validate JWT signatures.` — same intent, no substring collision. CLAUDE.md never-do (forbidden API call) is unaffected.
- **Files modified:** `middleware.ts`.
- **Commit:** `1edaf64`.

**3. [Rule 1 — Bug] Implicit-any on initials map callback**
- **Found during:** Task 2 (typecheck after writing layout).
- **Issue:** `profile.full_name.trim().split(/\s+/).slice(0, 2).map((w) => w[0])` failed TS7006 (`Parameter 'w' implicitly has an 'any' type`). Because `profile?.full_name` was widened from the `.maybeSingle()` row type, the chain lost the `string` inference at `.map`.
- **Fix:** Added `(w: string) =>` annotation. Equivalent runtime behavior; satisfies `noImplicitAny`.
- **Files modified:** `app/(public)/layout.tsx`.
- **Commit:** `529abcc`.

---

**Total deviations:** 3 auto-fixed (2 typing/destructure corrections, 1 comment reword to satisfy the plan's own regex verifier). All necessary for `npx tsc --noEmit` and `npx next build` to pass. No scope creep, no architectural shifts.

## Verification Run

- `npx tsc --noEmit` → exit 0 (clean).
- `npx next build` → ✓ Compiled successfully in 29.4s; ✓ Generating static pages (5/5); Middleware bundle 88.8 kB; `/` route now `ƒ (Dynamic)` (server-rendered on demand) — expected, because `(public)/layout.tsx` calls `getClaims()` per request.
- Plan-defined regex checks → all OK after the comment reword (Rule 3 fix above).

## Threat Surface Status

The plan's `<threat_model>` (T-02-03-01..T-02-03-07) covers the introduced surface:
- T-02-03-01 mitigated: only `getClaims()` is called; the unvalidated session reader is absent from the diff.
- T-02-03-02 mitigated: `x-pathname` is set on the server-controlled response; Plan 02-04 will read it via `headers()`.
- T-02-03-05 mitigated: `pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')` matches every nested route; matcher exclusions do not include either.
- T-02-03-06 mitigated: redirect targets are hard-coded literals; no user input flows into the URL constructor.

No new surface introduced beyond the threat register.

## Issues Encountered

- One Plan-vs-tooling friction: the plan's automated check forbids the substring `getSession(` in `middleware.ts` while the plan's own comment template included it. Resolved by Deviation #2 above.
- Build now reports `/` as dynamic (`ƒ`), where Phase 1 had it static. This is the correct trade-off for AUTH-06: the home page personalizes the StickyNav per session. Visiting `/` while signed out renders without a session lookup beyond `getClaims()` (no DB hit when claims are null); visiting `/` while signed in adds one indexed `profiles.id = claims.sub` select. ISR can be re-introduced for the marketing landing page if/when it gets a logged-out static variant in a later phase.

## User Setup Required

None. The middleware change is automatic on next request; the layout change takes effect on next render.

## Next Phase Readiness

- **Plan 02-04 (dashboard + onboarding):** ready. The (dashboard) layout can read `headers().get('x-pathname')` for its profile-complete gate without infinite-redirect risk. Anonymous traffic is already redirected at the Edge.
- **Plan 02-05 (BIP list):** ready. Behind the dashboard guard.
- **Plan 02-02 (auth pages):** parallel wave 2 sibling. Their Server Action `redirect('/dashboard')` + this plan's middleware perimeter together form the AUTH-06 closed loop.

## Self-Check: PASSED

- Files: `middleware.ts`, `app/(public)/layout.tsx`, `components/home/StickyNav.tsx`, `.planning/phases/02-coordinator-auth-submission/02-03-SUMMARY.md` — all present.
- Commits: `1edaf64` (Task 1), `529abcc` (Task 2) — both present in `git log --oneline --all`.

---
*Phase: 02-coordinator-auth-submission*
*Completed: 2026-05-09*
