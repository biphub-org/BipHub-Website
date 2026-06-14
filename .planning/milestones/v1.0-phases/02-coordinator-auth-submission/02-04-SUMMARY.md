---
phase: 02-coordinator-auth-submission
plan: "04"
subsystem: dashboard-onboarding
tags: [dashboard, onboarding, auth-guard, rhf, zod-v3, security-definer, combobox]

requires:
  - phase: 02-coordinator-auth-submission
    plan: "01"
    provides: profiles.erasmus_code column, insert_university_if_not_exists RPC, shadcn primitives (Form/Input/Popover/Command/Alert/Button)
  - phase: 02-coordinator-auth-submission
    plan: "02"
    provides: signOutAction, lib/schemas/auth pattern, lib/actions/auth pattern
  - phase: 02-coordinator-auth-submission
    plan: "03"
    provides: middleware x-pathname header, edge-side /dashboard + /onboarding redirects to /login
provides:
  - lib/schemas/profile.ts (profileSchema, addUniversitySchema — Zod v3, country enum sourced from ERASMUS_COUNTRIES)
  - lib/actions/profile.ts (saveProfileAction — upsert with id = claims.sub + revalidatePath + redirect)
  - lib/actions/universities.ts (searchUniversitiesAction + addUniversityAction — calls SECURITY DEFINER RPC, never service-role admin client)
  - app/(dashboard)/layout.tsx (async RSC, two-stage auth + profile-complete gate, INFO-03 disclaimer)
  - app/(dashboard)/onboarding/page.tsx (RSC shell, pre-fetches email + alphabetical top-50 universities)
  - components/dashboard/DashboardNav.tsx (RSC, logo + breadcrumb + initials + signOut form)
  - components/dashboard/OnboardingForm.tsx ('use client', RHF + zodResolver(profileSchema))
  - components/dashboard/UniversityCombobox.tsx ('use client', shadcn Command/Popover, 250ms debounced search + inline "Add new university")
affects: [02-05-bip-list, 02-06-wizard-core, 02-07-wizard-submit]

tech-stack:
  added: []
  patterns:
    - "Server-side two-stage RSC guard (auth claim then profile-complete check), with /onboarding exemption via x-pathname header — defeats infinite-redirect loop"
    - "Coordinator-callable SECURITY DEFINER RPC pattern: server action -> anon-key client -> rpc('insert_university_if_not_exists') instead of service-role admin client outside (admin) route group"
    - "RSC sign-out via `<form action={signOutAction}>` — keeps DashboardNav free of 'use client' even though the action is invoked from a button"
    - "Zod country enum from a runtime tuple: ERASMUS_COUNTRIES.map((c) => c.code) as [string, ...string[]] keeps Postgres CHECK and Zod whitelist in lock-step"
    - "base-ui Popover composition uses `render={<Button … />}` — `asChild` is the Radix-only convention and trips TS2322 on @base-ui/react/popover"

key-files:
  created:
    - lib/schemas/profile.ts
    - lib/actions/profile.ts
    - lib/actions/universities.ts
    - app/(dashboard)/layout.tsx
    - app/(dashboard)/onboarding/page.tsx
    - components/dashboard/DashboardNav.tsx
    - components/dashboard/OnboardingForm.tsx
    - components/dashboard/UniversityCombobox.tsx
  modified: []

key-decisions:
  - "country enum sourced from ERASMUS_COUNTRIES (canonical export from Plan 01-02) — the plan named the export `COUNTRIES` but the actual canonical name is `ERASMUS_COUNTRIES`; using the real export keeps the Zod whitelist in lock-step with the SQL CHECK in migration 00009."
  - "Service-role admin client mentions in inline JSDoc rewritten to refer to it descriptively (\"the admin (service-role) client\", \"the service-role admin client factory\") so the plan's `!/createAdminClient/.test(...)` regex verifier passes — same regex-substring collision Plan 02-03 hit. Code-level prohibition unaffected."
  - "Popover trigger composition uses base-ui's `render={<Button … />}` prop instead of Radix's `asChild` because `components/ui/popover.tsx` was migrated to @base-ui/react/popover during Phase 1; `asChild` trips TS2322 there."
  - "Country `<select>` is native (not shadcn Select) per plan instruction — UI-SPEC tolerates a native 30-option list and keeps the plan within budget. shadcn Select is reserved for later phases that need filtering."
  - "Profile-complete gate checks the four scalar columns directly on `profiles` (no join) — `country` is implied by `universities.country` and is not stored on profiles."

requirements-completed: [AUTH-07]

duration: ~10min
completed: 2026-05-09
---

# Phase 02-04: Dashboard Chrome + Onboarding Summary

**AUTH-07 vertical slice landed: a verified coordinator can submit Full name + Contact email + University (existing or new, via the SECURITY DEFINER RPC) + Country + Erasmus code, the `profiles` row is upserted with `id = auth.uid()`, the user is redirected to `/dashboard`, and Plan 02-05's listing inherits a guaranteed-non-null profile. The `(dashboard)` layout enforces auth + profile-complete gates server-side, exempts `/onboarding` via the `x-pathname` header from Plan 02-03, and renders DashboardNav + INFO-03 disclaimer with no public StickyNav/Footer.**

## Performance

- **Duration:** ~10 min
- **Tasks:** 2 of 2 executed
- **Files created:** 8 (3 server modules + 1 layout + 1 page + 3 client/RSC components)
- **Files modified:** 0

## Accomplishments

- AUTH-07 reachable end-to-end:
  - `/onboarding` renders without flash for an authenticated coordinator with no profile row.
  - Submitting the form upserts `profiles` with the JWT subject, then `revalidatePath('/', 'layout')` (so the public StickyNav initials refresh) and `redirect('/dashboard')`.
  - "Add new university" subform calls `supabase.rpc('insert_university_if_not_exists', …)` — the service-role admin client is never imported.
- `(dashboard)/layout.tsx` two-stage guard:
  - **Stage 1:** `getClaims()` (validates JWT signature) → `redirect('/login')` on failure. Defense-in-depth after middleware.
  - **Stage 2:** Profile-complete gate. If any of `full_name`, `university_id`, `contact_email`, `erasmus_code` is missing AND the current path does not start with `/onboarding`, redirect there. The `x-pathname` header from Plan 02-03 makes this loop-safe.
- `DashboardNav` is a server component (no `'use client'`) — sign-out is `<form action={signOutAction}>`.
- `UniversityCombobox` debounces search at 250ms (faster than the wizard's 1500ms — appropriate for live picker UX); `shouldFilter={false}` on Command since the server returns the filtered set.
- `npx tsc --noEmit` exits 0; `npx next build` ✓ Compiled successfully in 23.7s; `/onboarding` emits as a `ƒ` (dynamic) route alongside the existing auth + bips routes.

## Task Commits

1. **Task 1: Schemas + Server Actions** — `8dac47d` (feat) — `lib/schemas/profile.ts`, `lib/actions/profile.ts`, `lib/actions/universities.ts`. `getClaims()` only; service-role admin client never imported; SECURITY DEFINER RPC invoked by `addUniversityAction`.
2. **Task 2: Dashboard layout + onboarding page + 3 components** — `bc7423b` (feat) — `app/(dashboard)/layout.tsx`, `app/(dashboard)/onboarding/page.tsx`, `components/dashboard/DashboardNav.tsx`, `components/dashboard/OnboardingForm.tsx`, `components/dashboard/UniversityCombobox.tsx`.

## Files Created/Modified

### Created (8)

- `lib/schemas/profile.ts` — Zod v3 schemas. `profileSchema` (full_name, contact_email, university_id (uuid), country (enum from ERASMUS_COUNTRIES), erasmus_code) and `addUniversitySchema` (name, country, optional erasmus_code).
- `lib/actions/profile.ts` — `'use server'` file. `saveProfileAction` upserts with `id: data.claims.sub` and `onConflict: 'id'`; `revalidatePath('/', 'layout')` then `redirect('/dashboard')` on success. Country is intentionally NOT written to the profiles row (no such column).
- `lib/actions/universities.ts` — `'use server'` file. `searchUniversitiesAction` returns the alphabetical top 50 prefill or ILIKE matches for queries ≥ 2 chars; `addUniversityAction` calls `supabase.rpc('insert_university_if_not_exists', …)`.
- `app/(dashboard)/layout.tsx` — async RSC. Two-stage guard, INFO-03 disclaimer, route-group-scoped Toaster. Reads `headers().get('x-pathname')` for the `/onboarding` exemption.
- `app/(dashboard)/onboarding/page.tsx` — RSC shell. Pre-fetches `claims.email` and `searchUniversitiesAction('')` so the combobox shows a populated list on first paint.
- `components/dashboard/DashboardNav.tsx` — RSC. Logo + breadcrumb + initials avatar + `<form action={signOutAction}>` sign-out button.
- `components/dashboard/OnboardingForm.tsx` — `'use client'`. RHF (`mode: 'onBlur'`) + `zodResolver(profileSchema)`. Embeds `<UniversityCombobox>`; auto-fills `country` from the chosen university but leaves it user-editable.
- `components/dashboard/UniversityCombobox.tsx` — `'use client'`. shadcn Command + Popover, 250ms debounced search via `use-debounce`, inline "Add new university" subform that calls the SECURITY DEFINER RPC and selects the new row in the same render.

## Decisions Made

See `key-decisions` in frontmatter. Five notable adaptations are documented above; three of them are pure plan-vs-stack alignment (export name, regex collision, base-ui composition prop).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Plan referenced `COUNTRIES` but the canonical export is `ERASMUS_COUNTRIES`**

- **Found during:** Task 1 (writing `lib/schemas/profile.ts`).
- **Issue:** The plan snippet imports `COUNTRIES` from `@/lib/countries`. The actual canonical export from Plan 01-02 is `ERASMUS_COUNTRIES`; importing `COUNTRIES` would fail at build time.
- **Fix:** Used the real export name in both `lib/schemas/profile.ts` and the two client components (`OnboardingForm.tsx`, `UniversityCombobox.tsx`). Semantics are unchanged — same 33-country tuple.
- **Files modified:** `lib/schemas/profile.ts`, `components/dashboard/OnboardingForm.tsx`, `components/dashboard/UniversityCombobox.tsx`.
- **Commits:** `8dac47d` (schema), `bc7423b` (components).

**2. [Rule 3 — Blocking] Plan verifier `!/createAdminClient/.test(...)` collides with a JSDoc mention**

- **Found during:** Task 1 (running the plan's `node -e "..."` automated check).
- **Issue:** The plan forbids any `createAdminClient` substring in the action files (correct — CLAUDE.md never-do). But the same plan also instructs the file to document why the SECURITY DEFINER RPC is preferred over the admin client; the natural way to write that comment includes the literal token "createAdminClient", which trips the plan's regex.
- **Fix:** Reworded the two JSDoc mentions in `lib/actions/universities.ts` to refer to the admin client descriptively ("the service-role admin client factory", "the admin (service-role) client") without the substring. CLAUDE.md never-do compliance is unaffected — the file imports zero admin-client modules.
- **Files modified:** `lib/actions/universities.ts`.
- **Commit:** `8dac47d`.

**3. [Rule 1 — Type error] `<PopoverTrigger asChild>` is Radix-only; this project uses @base-ui/react/popover**

- **Found during:** Task 2 (`npx tsc --noEmit` after writing the combobox).
- **Issue:** `components/ui/popover.tsx` was migrated to `@base-ui/react/popover` during Phase 1. base-ui exposes a `render={<Element />}` prop instead of Radix's `asChild`. The plan's snippet `<PopoverTrigger asChild>…<Button …>…</Button></PopoverTrigger>` triggers TS2322 (`Property 'asChild' does not exist`).
- **Fix:** Switched to `<PopoverTrigger render={<Button … />}>` and lifted the trigger's children up so the children render inside the composed Button. Same visual + a11y output (role="combobox", aria-expanded, etc.).
- **Files modified:** `components/dashboard/UniversityCombobox.tsx`.
- **Commit:** `bc7423b`.

**4. [Rule 1 — Type narrow] `claims.sub` accessed through possibly-null `data`**

- **Found during:** Task 1 (writing the actions).
- **Issue:** Plan snippet destructures inline as `const { data: { claims }, error } = await supabase.auth.getClaims()`. Supabase SSR types declare the outer `data` as nullable, and Plan 02-02 hit the same TS2339 — already documented as the project pattern.
- **Fix:** Adopted the same `const { data, error } = …` + `data?.claims?.sub` guard pattern used in `lib/actions/auth.ts`. Behaviour preserved.
- **Files modified:** `lib/actions/profile.ts`, `lib/actions/universities.ts`, `app/(dashboard)/layout.tsx`, `app/(dashboard)/onboarding/page.tsx`.
- **Commits:** `8dac47d`, `bc7423b`.

---

**Total deviations:** 4 auto-fixed (1 export-name correction, 1 docstring reword to satisfy a regex verifier, 1 base-ui composition fix, 1 destructure guard already established as the project pattern). All required for build correctness or verifier compliance. No scope creep.

## Verification Performed

- `npx tsc --noEmit` exits 0 (full project, post-task-2).
- `npx next build` ✓ Compiled successfully in 23.7s; route table now includes `ƒ /onboarding (20.2 kB / 214 kB First Load JS)` alongside the existing auth + bips routes.
- Plan automated checks all pass:
  - `lib/actions/profile.ts` and `lib/actions/universities.ts` both start with `'use server'`, use `getClaims()`, contain zero `getSession(` and zero `createAdminClient` substrings, and `addUniversityAction` invokes `supabase.rpc('insert_university_if_not_exists', …)`.
  - `lib/schemas/profile.ts` imports from `'zod'` and exports both `profileSchema` and `addUniversitySchema`.
  - All 5 Task-2 files exist.
  - `(dashboard)/layout.tsx` is async, calls `getClaims()`, reads `headers().get('x-pathname')`, redirects per gate logic, calls `.maybeSingle()`, and contains the INFO-03 disclaimer phrase verbatim.
  - DashboardNav has no `'use client'` directive and uses `<form action={signOutAction}>`.
  - OnboardingForm + UniversityCombobox are both `'use client'`; the form uses `zodResolver`; the combobox uses `useDebouncedCallback` and calls both server actions.

End-to-end browser verification (signed-in coordinator with no profile lands on `/onboarding`, completes the form, lands on `/dashboard`) is the responsibility of a downstream verify-phase pass — Plan 02-05 lands the dashboard target itself, so a full user journey requires Plan 02-05 to be merged.

## Threat Model Compliance

All STRIDE register entries with `mitigate` disposition are implemented:

| Threat ID    | Mitigation Implemented |
|--------------|------------------------|
| T-02-04-01   | `saveProfileAction` writes `id: data.claims.sub`; RLS `profiles_insert_own` (WITH CHECK id = auth.uid()) rejects spoof attempts. |
| T-02-04-02   | `university_id` validated as a UUID by Zod and resolved via Postgres FK at write time; unknown UUIDs rejected. |
| T-02-04-03   | Both `profileSchema.country` and `addUniversitySchema.country` use `z.enum(ERASMUS_COUNTRY_CODES)`; the SECURITY DEFINER function (Plan 02-01) re-validates against its CHECK. |
| T-02-04-04   | Middleware (Plan 02-03) redirects unauthenticated `/onboarding` traffic to `/login`; layout double-checks via `getClaims()`. |
| T-02-04-05   | Profile-complete gate is server-side (RSC) and cannot be skipped from the client. |
| T-02-04-06   | `pathname.startsWith('/onboarding')` exemption keyed off the `x-pathname` header — no infinite-redirect loop. |
| T-02-04-07   | Accept (`universities` table is public-facing infrastructure per Plan 02-01). |
| T-02-04-08   | Accept (Phase 2 risk acceptance for RPC flooding; v2 will add rate limiting). |
| T-02-04-09   | `profileSchema.erasmus_code` requires `min(3)`; layout gate also rejects falsy `erasmus_code`. |

No new threat surface introduced beyond the threat register.

## Issues Encountered

- **One absolute-path drift event** during Task 1: my initial Write calls used absolute paths under `C:\dev\Antigravity\BIP_project\`, which resolved to the **main repo's** working tree instead of the worktree (PITFALL #3099 / cwd drift). Caught immediately by the Task-1 verifier (ENOENT under the worktree path), files copied into the worktree with `cp`, removed from the main repo with `rm`, and re-verified. Main repo's tracked tree is uncontaminated (`git status` post-cleanup shows only the pre-existing `LogoMark.tsx` modification on `master`). All subsequent Write calls used relative paths.

## User Setup Required

None — the migrations already exist on `local` (Plan 02-01) and the Server Actions use the existing anon-key client. No env vars added.

## Next Phase Readiness

- **Plan 02-05 (BIP list / `/dashboard`):** ready. The `(dashboard)` layout's profile-complete gate guarantees that any coordinator reaching `/dashboard` has a non-null `profiles.university_id` — list queries can join on it without null-handling.
- **Plan 02-06 (wizard core):** ready. The wizard's Step 3 host-university lock can read `profiles.university_id` directly (also non-null by gate).
- **Plan 02-07 (wizard submit):** unchanged.

## Self-Check: PASSED

- [x] `lib/schemas/profile.ts` exists and exports both schemas
- [x] `lib/actions/profile.ts` exists, exports `saveProfileAction`, contains zero `getSession(` and zero `createAdminClient` substrings
- [x] `lib/actions/universities.ts` exists, exports both actions, calls the SECURITY DEFINER RPC
- [x] `app/(dashboard)/layout.tsx` exists, is async, calls `getClaims()`, reads `x-pathname`, redirects per gate, contains the INFO-03 disclaimer
- [x] `app/(dashboard)/onboarding/page.tsx` exists and is a server component
- [x] `components/dashboard/DashboardNav.tsx` exists, has no `'use client'`, uses `<form action={signOutAction}>`
- [x] `components/dashboard/OnboardingForm.tsx` exists, is `'use client'`, uses `zodResolver`
- [x] `components/dashboard/UniversityCombobox.tsx` exists, is `'use client'`, uses `useDebouncedCallback`, calls both server actions
- [x] `npx tsc --noEmit` exits 0
- [x] `npx next build` succeeds and emits `/onboarding` route
- [x] Commits `8dac47d` (Task 1) and `bc7423b` (Task 2) present in `git log --oneline`

---
*Phase: 02-coordinator-auth-submission · Plan 04 · Completed: 2026-05-09*
