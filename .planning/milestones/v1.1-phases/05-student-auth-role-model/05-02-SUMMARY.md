---
phase: 05-student-auth-role-model
plan: 02
subsystem: auth
tags: [magic-link, otp, middleware, routing, student, callback, server-actions]

requires:
  - phase: 05-student-auth-role-model
    plan: 01
    provides: "profiles.role student CHECK, handle_new_user trigger, custom_access_token_hook, app_metadata.role in JWT"

provides:
  - "signInWithOtpAction — STUD-01 magic-link OTP dispatch with shouldCreateUser:true, student role metadata, and magiclink callback redirect"
  - "signOutStudentAction — D-15 student sign-out to / (not /login)"
  - "app/auth/callback/route.ts type=magiclink branch — routes success to /student-dashboard, failure to /register/student?error=expired"
  - "middleware.ts D-11 redirect matrix — full student route group enforcement via getClaims()"

affects: [05-03 student UI (consumes signInWithOtpAction + signOutStudentAction), 05-04 e2e tests]

tech-stack:
  added: []
  patterns:
    - "signInWithOtp with shouldCreateUser:true + options.data.role for passwordless student auth (STUD-01/D-01)"
    - "Callback route type-discriminator branching (recovery / magiclink / default) with per-type error destinations"
    - "Middleware D-11 matrix: three-block role routing (3a dashboard/onboarding, 3d student-dashboard, 3c auth-page bounce)"

key-files:
  created: []
  modified:
    - lib/actions/auth.ts
    - app/auth/callback/route.ts
    - middleware.ts

key-decisions:
  - "Matcher (middleware.ts line 97) intentionally unchanged — /student-dashboard/* not excluded so guard (3d) reaches it; /register/student excluded via existing 'register' rule (D-13/OQ-2)"
  - "signOutStudentAction is a separate export — coordinator signOutAction (redirect to /login) is untouched (D-15)"
  - "Callback error paths branch on type: magiclink errors go to /register/student?error=expired; all other errors keep existing /login?error=verification_failed behavior"
  - "Open-redirect safety preserved: all destinations are SITE_URL + hard-coded paths; type selects among fixed set (T-05-08)"

requirements-completed: [STUD-01, STUD-03, FOUN-08]

duration: ~4min
completed: 2026-06-15
---

# Phase 05 Plan 02: Student Auth Server Tier Summary

**Magic-link OTP dispatch action, student sign-out variant, callback route magiclink branch, and middleware D-11 redirect matrix — wiring the complete student routing spine at the server tier.**

## Performance

- **Duration:** ~4 min
- **Completed:** 2026-06-15
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- `lib/actions/auth.ts`: added `import { z } from 'zod'`; `signInWithOtpAction` (STUD-01/D-01/D-04) with Zod email validation, `shouldCreateUser: true`, `data.role='student'`, `emailRedirectTo` ending in `?type=magiclink`, and 429/rate-limit error mapping; `signOutStudentAction` (D-15) redirecting to `/` — coordinator `signOutAction` unchanged.
- `app/auth/callback/route.ts`: three-point extension — no-code guard branches on `type==='magiclink'`; exchange-error guard branches on `type==='magiclink'`; destination switch adds `magiclink → /student-dashboard` branch. Updated routing-contract comment. Recovery and default onboarding paths unchanged.
- `middleware.ts`: D-11 matrix implemented across three blocks — (3a) dashboard/onboarding guard adds `role==='student'` redirect to `/student-dashboard`; (3d) new student-dashboard guard (no-claims → `/register/student`, coordinator → `/dashboard`, admin → `/admin`, student → allow); (3c) already-auth bounce extended to route by role. Matcher untouched with explicit "DO NOT modify" comment confirmed preserved (D-13/OQ-2).

## Task Commits

1. **Task 1: signInWithOtpAction + signOutStudentAction** — `11b943a` (feat)
2. **Task 2: type=magiclink branch in callback route** — `323e1da` (feat)
3. **Task 3: D-11 redirect matrix in middleware** — `7517769` (feat)

## Files Created/Modified

- `lib/actions/auth.ts` — added zod import; signInWithOtpAction; signOutStudentAction (+43 lines)
- `app/auth/callback/route.ts` — extended with type=magiclink branch in 3 locations; updated comment (+20, -9 lines)
- `middleware.ts` — D-11 matrix across blocks 3a/3d/3c; updated responsibilities comment (+36, -7 lines)

## Decisions Made

- **Matcher unchanged (D-13/OQ-2).** `/student-dashboard/*` is not in the middleware exclusion list and is reached by the new (3d) guard. `/register/student` is excluded via the existing `register` negative-lookahead. The `layout.tsx` defense-in-depth (Plan 05-03) is in addition, not instead of, the middleware guard.
- **signOutStudentAction as a separate export.** `signOutAction` (coordinator, redirects to `/login`) is unchanged. The student variant is a new export with `redirect('/')`. This avoids a redirect-target parameter that would require type-checking the caller.
- **Callback error branching on type.** The `type` query param is already available at the top of the GET handler. Branching on it for error redirects is the minimal surgical change that preserves the existing coordinator/recovery error paths completely.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — these are pure server-tier routing files. No UI rendering, no data-to-render stubs.

## Threat Surface Scan

No new network endpoints or trust boundaries introduced. Changes are modifications to existing server-tier files:
- `signInWithOtpAction`: threat T-05-09 (rate limit) and T-05-10 (email validation) mitigated as planned.
- `app/auth/callback/route.ts`: T-05-07 (stale link) and T-05-08 (open redirect) mitigated as planned.
- `middleware.ts`: T-05-06 (role-based routing) mitigated as planned.

All threats are within the plan's threat model — no new surface flagged.

## Self-Check: PASSED

- FOUND: lib/actions/auth.ts
- FOUND: app/auth/callback/route.ts
- FOUND: middleware.ts
- FOUND: .planning/phases/05-student-auth-role-model/05-02-SUMMARY.md
- FOUND commit: 11b943a (Task 1)
- FOUND commit: 323e1da (Task 2)
- FOUND commit: 7517769 (Task 3)

---

*Phase: 05-student-auth-role-model*
*Completed: 2026-06-15*
