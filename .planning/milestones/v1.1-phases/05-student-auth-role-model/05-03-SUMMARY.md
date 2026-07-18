---
phase: 05-student-auth-role-model
plan: 03
subsystem: student-ui
tags: [magic-link, student, auth, dashboard, nav, otp, rsc, client-form]

requires:
  - phase: 05-student-auth-role-model
    plan: 02
    provides: "signInWithOtpAction, signOutStudentAction, middleware D-11 matrix, callback type=magiclink branch"

provides:
  - "StudentMagicLinkForm — STUD-01 email-entry form with States A/B/C, 30s resend cooldown, loading/error states"
  - "/register/student RSC page — already-auth role bounce, ?error=expired Alert, D-03 coordinator cross-link"
  - "app/(student)/layout.tsx — role='student' guard (D-10), EC disclaimer, StudentNav, no onboarding gate (D-08)"
  - "StudentNav — h-16 nav with email initials avatar, signOutStudentAction sign-out form"
  - "/student-dashboard RSC page — welcome header, Account card, Explore card, coming-soon line (D-14)"

affects: [05-04 e2e tests (consumes these UI surfaces)]

tech-stack:
  added: []
  patterns:
    - "useTransition for Server Action loading state in 'use client' form (StudentMagicLinkForm)"
    - "Resend 30s cooldown via setInterval + setCooldown (mirrors ResendVerificationButton pattern)"
    - "tabIndex={-1} + useEffect ref.focus() for accessibility focus management on State B transition"
    - "RSC already-auth bounce via getClaims() + redirect on the page component (D-13, not middleware)"
    - "(student) route group with role guard mirroring (admin) layout but without profile-complete gate (D-08)"
    - "Card-style divs with rounded-lg border border-border bg-white shadow-sm (no shadcn Card installed)"

key-files:
  created:
    - components/auth/StudentMagicLinkForm.tsx
    - app/(auth)/register/student/page.tsx
    - app/(student)/layout.tsx
    - components/student/StudentNav.tsx
    - app/(student)/student-dashboard/page.tsx
  modified: []

key-decisions:
  - "No shadcn Card component installed — used raw div with rounded-lg border border-border bg-white shadow-sm p-6 per UI-SPEC"
  - "StudentMagicLinkForm uses native <input type=email> directly (not shadcn Input) to avoid the @base-ui/react InputPrimitive wrapper complexities with form action handler"
  - "form action={handleSubmit} pattern (useTransition) rather than onSubmit — matches Next.js 15 Server Action calling convention from client"
  - "State B 'Wrong email' is a button (not Link) to reset state internally without navigation — avoids extra URL parameters"
  - "Explore card CTA uses Button asChild + Link — pill styling from Button, navigation from Link"

requirements-completed: [STUD-01, STUD-03]

duration: ~20min
completed: 2026-06-15
---

# Phase 05 Plan 03: Student Auth UI Summary

**Student magic-link entry page (/register/student) and dashboard shell (/student-dashboard) — the complete Phase 5 student-facing UI built per UI-SPEC, consuming Plan 02's server actions and middleware.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-06-15
- **Tasks:** 3
- **Files created:** 5

## Accomplishments

### Task 1: StudentMagicLinkForm + /register/student page (STUD-01)

- `components/auth/StudentMagicLinkForm.tsx` (`'use client'`): Three states per UI-SPEC Surface 1:
  - **State A**: Email input with `autoFocus`, "Send sign-in link" EU-blue pill button (h-11 = 44px min touch target), D-03 coordinator cross-link.
  - **State B**: "Check your email" confirmation with 30s resend cooldown (mirrors ResendVerificationButton), focus moves to `<h1>` via `tabIndex={-1}` + `useEffect` ref.focus(), "Re-enter your email" escape to State A.
  - **State C**: Expired-link Alert rendered above State A when `expiredError` prop is set.
  - Loading: Lucide `Loader2` animate-spin + "Sending…" text, button disabled.
  - Errors: `<Alert variant="destructive">` inside `<div aria-live="polite">` region.
  - Exact UI-SPEC Copywriting Contract strings throughout.
- `app/(auth)/register/student/page.tsx` (RSC):
  - Already-auth bounce via `getClaims()` + `redirect` by role (student → /student-dashboard, coordinator → /dashboard, admin → /admin). D-13 compliant — on the page, not in middleware.
  - Maps `?error=expired` → `expiredError` prop for server-rendered State C.
  - Card shell: `bg-white rounded-md shadow-md p-10` matching existing (auth) card pattern, LogoMark, h1 "Sign in to BipHub", subtitle, form.
  - Exports `metadata = { title: 'Sign in · BipHub' }`.

### Task 2: (student) route group — layout.tsx + StudentNav

- `app/(student)/layout.tsx` (RSC):
  - `getClaims()` auth guard → `redirect('/register/student')` if unauthenticated.
  - Role guard: `role !== 'student'` → routes admin to `/admin`, coordinator to `/dashboard`, else `/register/student`.
  - Intentionally NO profile-complete gate (D-08). Code comment explains that student profiles have `university_id = NULL` by design. No `university_id`/`erasmus_code`/`full_name` completeness query.
  - EC disclaimer `<p>` (exact string, CLAUDE.md compliance). Toaster scoped to route group. `max-w-[960px]` main container.
- `components/student/StudentNav.tsx` (RSC):
  - `h-16 border-b border-border bg-white` header with `aria-label="Student dashboard navigation"`.
  - Left: LogoMark + "BipHub" + "/" separator + "Student dashboard" label.
  - Right: 32×32 initials avatar (`bg-eu-blue/10 text-eu-blue`) from `email.split('@')[0].slice(0,2).toUpperCase()` (fallback `··`).
  - `<form action={signOutStudentAction}>` with `aria-label="Sign out of BipHub"` on button; `p-2 -m-2 min-h-[44px]` for touch target.

### Task 3: /student-dashboard page (D-14 minimal shell)

- `app/(student)/student-dashboard/page.tsx` (RSC):
  - Re-calls `createClient()` + `getClaims()` for email; queries `profiles.full_name` via `maybeSingle()` for greeting.
  - Greeting h1: `Welcome back, {firstName}` when `full_name` is set (first word); `Welcome back` (no comma) when null — student profiles have no full_name in Phase 5.
  - `Signed in as {email}` sub-line (14px text-muted).
  - **Account card** (`rounded-lg border border-border bg-white shadow-sm p-6`): h2 "Account" (16px semibold), email display, secondary `signOutStudentAction` form.
  - **Explore card**: h2 "Browse Erasmus+ BIPs", body "Discover programmes matched to your field and availability.", "Browse BIPs →" CTA via `Button asChild + Link href="/bips"`.
  - **Coming-soon**: plain `<p className="text-sm text-muted">` — no Card wrapper, no icon, no badge (D-14 strictly enforced).
  - Exports `metadata = { title: 'Student dashboard · BipHub' }`.

## Task Commits

1. **Task 1: StudentMagicLinkForm + /register/student** — `67f3bce` (feat)
2. **Task 2: (student) layout + StudentNav** — `fd6a2e2` (feat)
3. **Task 3: /student-dashboard page** — `295c97f` (feat)

## Files Created/Modified

- `components/auth/StudentMagicLinkForm.tsx` — NEW; 193 lines; 'use client' magic-link form
- `app/(auth)/register/student/page.tsx` — NEW; 58 lines; RSC auth-bounce + card shell
- `app/(student)/layout.tsx` — NEW; 71 lines; role guard + StudentNav + EC disclaimer
- `components/student/StudentNav.tsx` — NEW; 63 lines; RSC nav component
- `app/(student)/student-dashboard/page.tsx` — NEW; 97 lines; dashboard content shell

## Decisions Made

- **No shadcn Card installed.** The plan referenced `Card` from `@/components/ui/card` but the component does not exist in this repo (shadcn init did not install it). Used raw `<div className="rounded-lg border border-border bg-white shadow-sm p-6">` which is the exact HTML the shadcn Card renders. No behavior difference.
- **Native `<input>` in form.** Used a native `<input type="email">` in StudentMagicLinkForm rather than the shadcn `Input` (which wraps `@base-ui/react/input`) to avoid conflicts with the `form action={handleSubmit}` pattern under `useTransition`. The native input carries identical Tailwind classes for visual parity.
- **State B escape via button, not Link.** The "Re-enter your email" control resets local state without navigation (no `?step=` URL param). This keeps the URL clean at `/register/student` regardless of state.

## Deviations from Plan

### Auto-adapted Issues

**1. [Rule 1 - Missing Dependency] No shadcn Card component**
- **Found during:** Task 3 implementation
- **Issue:** `components/ui/card.tsx` does not exist; `components/ui/` has no Card entry; the plan's PATTERNS.md and UI-SPEC both reference it but it was never installed via `shadcn add card`.
- **Fix:** Implemented card-style containers using raw `<div>` with `rounded-lg border border-border bg-white shadow-sm p-6` — identical to what shadcn's Card would render, no primitive needed.
- **Files modified:** `app/(student)/student-dashboard/page.tsx`
- **Impact:** None — visual and functional output is identical.

## Known Stubs

None — all content in the dashboard is real:
- Welcome heading uses real `profiles.full_name` from the database (or clean fallback).
- Email is from the real JWT claim.
- "Browse BIPs →" links to `/bips` (real route from Phase 1).
- Coming-soon line is intentional product honesty, not a UI placeholder.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes. Changes are pure UI components consuming Plan 02's server actions:

- T-05-11 (Elevation of Privilege — layout role guard): **Mitigated** — `role !== 'student'` check implemented with role-route mapping.
- T-05-12 (Information Disclosure — already-auth bounce): **Mitigated** — `getClaims()` + `redirect` by role on the RSC page (D-13 compliant).
- T-05-13 (Spoofing — email input): **Mitigated** — validation is server-side in `signInWithOtpAction` (Plan 02); client never sets role.
- T-05-14 (Tampering — no onboarding gate): **Accept** — documented in layout with code comment.

## Self-Check: PASSED

- FOUND: components/auth/StudentMagicLinkForm.tsx
- FOUND: app/(auth)/register/student/page.tsx
- FOUND: app/(student)/layout.tsx
- FOUND: components/student/StudentNav.tsx
- FOUND: app/(student)/student-dashboard/page.tsx
- FOUND commit: 67f3bce (Task 1)
- FOUND commit: fd6a2e2 (Task 2)
- FOUND commit: 295c97f (Task 3)

---

*Phase: 05-student-auth-role-model*
*Completed: 2026-06-15*
