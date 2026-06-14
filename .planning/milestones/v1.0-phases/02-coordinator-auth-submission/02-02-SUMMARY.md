---
phase: 02-coordinator-auth-submission
plan: "02"
subsystem: auth
tags: [supabase-auth, server-actions, rhf, zod-v3, pkce, route-handler, route-group]

requires:
  - phase: 02-coordinator-auth-submission
    plan: "01"
    provides: shadcn Form/Input/Label/Alert/Button primitives, EU palette tokens, profile RPC
provides:
  - lib/schemas/auth.ts (loginSchema, registerSchema, passwordResetSchema, passwordUpdateSchema — Zod v3)
  - lib/actions/auth.ts (signInAction, signUpAction, signOutAction, requestPasswordResetAction, updatePasswordAction)
  - app/auth/callback/route.ts (PKCE GET handler — routes type=recovery vs signup verification)
  - app/(auth)/ route group with layout + 5 pages (login, register, verify-email, reset-password, reset-password/update)
  - components/auth/ client forms (LoginForm, RegisterForm, PasswordResetForm, PasswordResetUpdateForm)
  - .env.example NEXT_PUBLIC_SITE_URL placeholder
affects: [02-03-perimeter, 02-04-dashboard-onboarding, 02-06-wizard-core]

tech-stack:
  added: []
  patterns:
    - "Server Action returning `{ error?: string; success?: true }` for inline display; redirect() on success path"
    - "RHF + zodResolver + useTransition; mode='onBlur' (no per-keystroke validation)"
    - "PKCE Route Handler at app/auth/callback/route.ts (NOT a Server Action) calls exchangeCodeForSession + branches on type=recovery"
    - "(auth) route group with its own layout — minimal centered-card chrome, no public site nav/footer (D-12/D-13)"
    - "getClaims() ONLY for session validation server-side (CLAUDE.md never-do compliance)"
    - "Email-enumeration mitigation: requestPasswordResetAction always returns {success:true} (T-02-02-05)"

key-files:
  created:
    - lib/schemas/auth.ts
    - lib/actions/auth.ts
    - app/auth/callback/route.ts
    - app/(auth)/layout.tsx
    - app/(auth)/login/page.tsx
    - app/(auth)/register/page.tsx
    - app/(auth)/verify-email/page.tsx
    - app/(auth)/reset-password/page.tsx
    - app/(auth)/reset-password/update/page.tsx
    - components/auth/LoginForm.tsx
    - components/auth/RegisterForm.tsx
    - components/auth/PasswordResetForm.tsx
    - components/auth/PasswordResetUpdateForm.tsx
  modified:
    - .env.example

key-decisions:
  - "requestPasswordResetAction returns {success:true} regardless of Supabase error (T-02-02-05 email-enumeration mitigation); errors are logged server-side only."
  - "passwordUpdateSchema clamps password to max(72) so users see the limit at validation time rather than getting a silently-truncated bcrypt hash."
  - "Login page surfaces ?error=verification_failed from the callback handler via an initialError prop on LoginForm — keeps server-driven error copy aligned with UI-SPEC."
  - "Auth pages render errors inline via <Alert variant=destructive>; no Toaster import in (auth)/layout.tsx — auth surface is fully separated from the public Toaster instance."
  - "getClaims() in updatePasswordAction destructures via `data?.claims` instead of `data: { claims }` because the Supabase SSR types declare `data` itself nullable — the inline destructure pattern shown in the plan triggers TS2339."

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06]

duration: ~12min
completed: 2026-05-09
---

# Phase 02-02: Coordinator Auth Surface Summary

**Vertical auth slice — register/verify/login/sign-out/reset all wired end-to-end; Server Actions on getClaims (never the unvalidated session getter); PKCE callback routes signup → /onboarding and recovery → /reset-password/update; auth route group renders D-12/D-13 centered-card chrome with the INFO-03 disclaimer and no public site nav/footer.**

## Performance

- **Duration:** ~12 min
- **Tasks:** 2 of 2 executed
- **Files created:** 13 (4 forms + 5 pages + 1 layout + 1 schemas + 1 actions + 1 route handler)
- **Files modified:** 1 (.env.example)

## Accomplishments

- AUTH-01..AUTH-06 reachable from a browser in local dev:
  - `/register` → submit → verification email lands in Inbucket → click → `/auth/callback?code=…` exchanges and redirects to `/onboarding` (D-07)
  - `/login` → submit → redirect to `/dashboard` (or surface known auth errors inline)
  - Sign-out Server Action exposed and ready for any signed-in surface to call
  - `/reset-password` → submit → recovery email → click → `/auth/callback?code=…&type=recovery` → `/reset-password/update` → updateUser → `/dashboard`
- Auth surface is autonomous: `(auth)/layout.tsx` renders no `StickyNav`, no public-site footer component, no `Toaster` — only the centered card and the INFO-03 disclaimer.
- All Server Actions validate twice: once via Zod `safeParse` on FormData (defends T-02-02-03 — client bypass) and again via Supabase Auth itself.
- `updatePasswordAction` calls `getClaims()` first to confirm a recovery session exists before calling `updateUser` (T-02-02-11 — recovery flow can't update password without an active recovery session).
- `requestPasswordResetAction` always returns `{ success: true }` to defeat email enumeration (T-02-02-05).
- `getClaims()` is the only session validator used; zero `getSession(` substrings in `lib/actions/auth.ts` (CLAUDE.md never-do).
- `.env.example` advertises `NEXT_PUBLIC_SITE_URL=http://localhost:3000` for the callback `emailRedirectTo` and recovery `redirectTo`.

## Task Commits

1. **Task 1: Schemas, Server Actions, PKCE callback, env** — `ab647cf` (feat) — `lib/schemas/auth.ts`, `lib/actions/auth.ts`, `app/auth/callback/route.ts`, `.env.example`.
2. **Task 2: Auth layout + 5 pages + 4 client forms** — `04722ec` (feat) — `app/(auth)/{layout,login,register,verify-email,reset-password,reset-password/update}` and `components/auth/{LoginForm,RegisterForm,PasswordResetForm,PasswordResetUpdateForm}.tsx`.

## Files Created/Modified

### Created (13)

- `lib/schemas/auth.ts` — Zod v3 schemas: `loginSchema`, `registerSchema`, `passwordResetSchema`, `passwordUpdateSchema`. Both password schemas clamp to `max(72)` to surface bcrypt's effective input cap at validation time.
- `lib/actions/auth.ts` — `'use server'` file. Exports `signInAction`, `signUpAction`, `signOutAction`, `requestPasswordResetAction`, `updatePasswordAction`. Maps known Supabase error substrings to UI-SPEC copy; falls through to a generic message for unknown errors (T-02-02-06). `revalidatePath('/', 'layout')` after `signOut` to bust cached layout claims.
- `app/auth/callback/route.ts` — Route Handler (no `'use server'`). `GET` reads `code` and `type`; calls `exchangeCodeForSession`; on success redirects `type=recovery` → `/reset-password/update` and signup verification → `/onboarding`; on failure redirects to `/login?error=verification_failed`.
- `app/(auth)/layout.tsx` — RSC, not async. Centered card shell (`grid place-items-center`, `bg-bg-soft`, `max-w-[440px]`) + fixed-bottom INFO-03 disclaimer. No `StickyNav`, no public-site footer component, no `Toaster`.
- `app/(auth)/login/page.tsx` — async RSC; awaits `searchParams`; passes `?error=verification_failed` through to `<LoginForm initialError=…/>`.
- `app/(auth)/register/page.tsx` — RSC shell + `<RegisterForm />`.
- `app/(auth)/verify-email/page.tsx` — async RSC; reads `?email=` from searchParams (falls back to "your inbox"); links to `/register` (resend) and `/login` (wrong email).
- `app/(auth)/reset-password/page.tsx` — RSC shell + `<PasswordResetForm />`.
- `app/(auth)/reset-password/update/page.tsx` — RSC shell + `<PasswordResetUpdateForm />`.
- `components/auth/LoginForm.tsx` — RHF (`mode: 'onBlur'`) + `zodResolver(loginSchema)` + `useTransition`. `autoFocus` on email input. Server errors render in top-of-form `<Alert variant="destructive">`. Includes "Forgot your password?" link to `/reset-password`.
- `components/auth/RegisterForm.tsx` — same scaffold; 3 fields (email/password/confirmPassword); `FormDescription` ("At least 8 characters.") under password.
- `components/auth/PasswordResetForm.tsx` — single email field; on `result.success` swaps the form for a static "Check your email" confirmation card.
- `components/auth/PasswordResetUpdateForm.tsx` — password + confirmPassword; redirects on success via Server Action.

### Modified (1)

- `.env.example` — appended `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.

## Decisions Made

See `key-decisions` in frontmatter. Three notable points:

- The plan's snippet for `getClaims()` destructures inline as `data: { claims }`. Supabase's SSR types declare the outer `data` itself nullable, so the inline pattern fails tsc with TS2339. Switched to `const { data, error } = …` + `data?.claims` to preserve the same semantics.
- `requestPasswordResetAction` deliberately swallows Supabase errors and returns `{ success: true }`. This is the explicit T-02-02-05 mitigation; the `console.error` keeps ops visibility on the server.
- The auth `(auth)` layout intentionally omits the `Toaster` — auth pages surface all errors inline via `<Alert variant="destructive">`. The public route group's Toaster (Plan 01-07) is not needed here and would require a separate instance per layout boundary.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Type error] `getClaims()` inline destructure trips TS2339**

- **Found during:** Task 1 (`npx tsc --noEmit` after writing `updatePasswordAction`).
- **Issue:** Plan snippet uses `const { data: { claims }, error: authError } = await supabase.auth.getClaims()`. The Supabase SSR types declare the outer `data` as `{ claims: JwtPayload; … } | null`, so destructuring through a possibly-null `data` triggers `TS2339: Property 'claims' does not exist`.
- **Fix:** Refactored to `const { data, error: authError } = …` + `if (authError || !data?.claims)` guard. Semantics preserved.
- **Files modified:** `lib/actions/auth.ts`.
- **Committed in:** `ab647cf`.

**2. [Rule 1 — Verifier false positive] Layout docstring tripped the `import.*Footer` regex**

- **Found during:** Task 2 verification step.
- **Issue:** The plan's automated check `node -e ".../StickyNav|import.*Footer/.test(layout)..."` matched my docstring text "Deviates from the public layout: no StickyNav, no Footer, no Toaster" — the regex doesn't distinguish comments from code, and my prose used the literal component names.
- **Fix:** Reworded the docstring to describe the absent chrome without using the bare `StickyNav` / `Footer` identifiers. The runtime layout still imports neither.
- **Files modified:** `app/(auth)/layout.tsx`.
- **Committed in:** `04722ec` (single commit; reword landed before commit).

**Total deviations:** 2 auto-fixed (1 type-checker fix, 1 docstring tweak to satisfy a regex-only verifier). No scope creep.

## Issues Encountered

- None blocking. The two fixes above were caught by tsc and the verifier respectively, fixed inline, and verified before commit.
- `npx next build` emits a benign warning about multiple lockfiles (workspace + worktree). Pre-existing — not introduced by this plan.

## Verification Performed

- `npx tsc --noEmit` exits 0 (full project).
- `npx next build` succeeds; routes table lists `/login`, `/register`, `/reset-password`, `/reset-password/update`, `/verify-email`, and `/auth/callback`.
- Plan automated checks all pass:
  - `lib/actions/auth.ts` starts with `'use server'`, exports all 5 actions, contains zero `getSession(` calls, contains `getClaims` and `emailRedirectTo`.
  - `app/auth/callback/route.ts` contains `exchangeCodeForSession`.
  - `lib/schemas/auth.ts` imports from `'zod'` (not `'zod/v4'`), exports all 4 schemas, contains `max(72`.
  - `.env.example` contains `NEXT_PUBLIC_SITE_URL=`.
  - All 10 Task-2 files exist.
  - Auth layout contains the exact INFO-03 disclaimer phrase and no `StickyNav`/`Footer` imports.
  - LoginForm + RegisterForm both `'use client'`, both use `zodResolver`, call the matching Server Action, use `useTransition`, `autoFocus` is present, and neither references `getSession`.

End-to-end browser verification (verification-email round-trip through Inbucket; recovery cookie set; sign-out cookie clear) is the responsibility of the user or a downstream verify-phase pass — Plan 02-03 also lands the middleware redirects that gate `/dashboard` and `/onboarding`, so a full user journey requires Plan 02-03 to be merged.

## Threat Model Compliance

All STRIDE register entries with `mitigate` disposition are implemented:

| Threat ID    | Mitigation Implemented |
|--------------|------------------------|
| T-02-02-01   | Only `getClaims()` used; zero `getSession(` substrings |
| T-02-02-02   | Inherited from `@supabase/ssr` cookie defaults (httpOnly + sameSite=lax) |
| T-02-02-03   | Every Server Action `safeParse`s FormData before calling Supabase |
| T-02-02-05   | `requestPasswordResetAction` always returns `{success:true}`; errors logged server-side |
| T-02-02-06   | Known error substrings mapped to UI-SPEC copy; unknown fall through to generic message |
| T-02-02-09   | PKCE single-use enforced by Supabase; failure path redirects to `/login?error=verification_failed` |
| T-02-02-10   | Callback destination built from `NEXT_PUBLIC_SITE_URL` + hard-coded path; only `type` discriminator from query string |
| T-02-02-11   | `updatePasswordAction` calls `getClaims()` first; without a session the action returns the expired-link error and never calls `updateUser` |
| T-02-02-12   | Both password schemas clamp to `max(72)` |

`accept`-disposition entries (T-02-02-04 audit-log repudiation, T-02-02-07 brute-force, T-02-02-08 email flood) are unchanged — handled by Supabase Auth defaults; v1 risk acceptance.

## User Setup Required

- **Production:** set `NEXT_PUBLIC_SITE_URL=https://biphub.eu` in Vercel envs and ensure Supabase Dashboard → Authentication → URL Configuration has `https://biphub.eu/auth/callback` in the allowed redirect URLs.
- **Local dev:** copy `.env.example` → `.env.local` (no change needed for `NEXT_PUBLIC_SITE_URL`; default points at `http://localhost:3000`). Verification + recovery emails arrive in Inbucket at `http://localhost:54324`.

## Next Phase Readiness

- **Plan 02-03 (perimeter middleware)** can now redirect unauthenticated requests to `/login` and use `signOutAction` from `lib/actions/auth.ts` for forced sign-out flows.
- **Plan 02-04 (onboarding + dashboard)** can rely on the verified email/session: any user who lands on `/onboarding` came through the PKCE callback and has a valid session cookie set.
- **Plan 02-06 (wizard)** can call `getClaims()` from its own Server Actions without re-implementing the validation wrapper — pattern is established here.

## Self-Check: PASSED

- [x] `lib/schemas/auth.ts` exists and exports the 4 schemas
- [x] `lib/actions/auth.ts` exists, exports the 5 Server Actions, contains zero `getSession(` calls
- [x] `app/auth/callback/route.ts` exists and exports `GET`
- [x] All 5 auth pages exist under `app/(auth)/`
- [x] All 4 client forms exist under `components/auth/`
- [x] `.env.example` contains `NEXT_PUBLIC_SITE_URL`
- [x] `npx tsc --noEmit` exits 0
- [x] `npx next build` succeeds and emits all 5 auth routes
- [x] Commits `ab647cf` and `04722ec` present in `git log --oneline`

---
*Phase: 02-coordinator-auth-submission · Plan 02 · Completed: 2026-05-09*
