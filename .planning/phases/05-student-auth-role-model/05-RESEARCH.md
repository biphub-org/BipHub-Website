# Phase 5: Student Auth + Role Model - Research

**Researched:** 2026-06-15
**Domain:** Supabase Auth (magic-link OTP, Custom Access Token Hook), RLS hardening, Next.js 15 middleware role routing, new `(student)` route group
**Confidence:** HIGH — all core claims verified against live codebase files, Context7-sourced Supabase docs, and locked planning documents.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Single `/register/student` page for both new signups and returning sign-ins via `signInWithOtp({ shouldCreateUser: true })`.
- **D-02:** After submit, show "check your email" confirmation state. No password field.
- **D-03:** Student auth is fully separate from coordinator auth; coordinator `/register`/`/login` left untouched.
- **D-04:** `signInWithOtp` sets `options.data = { role: 'student' }` and `emailRedirectTo` to a student-aware callback so post-verification lands on `/student-dashboard`.
- **D-05:** Migration `00015_student_role.sql` extends `profiles.role` CHECK to `('coordinator','admin','student')`.
- **D-06:** Custom Access Token Hook (PL/pgSQL, in-process, NOT an Edge Function) injects the role into the JWT at issuance time — the locked fix for Pitfall 1.
- **D-07:** New student `profiles` row is `role='student'` (from `raw_user_meta_data.role`). A magic-link on an existing coordinator/admin email signs them into their existing account; existing roles are never overwritten.
- **D-08:** `profiles.university_id` stays nullable; student profiles have `university_id = NULL`. The coordinator `/onboarding` gate must NOT fire for students.
- **D-09:** Harden `profiles_update_own_or_admin` — `WITH CHECK` prevents non-admin users from changing their own `role` column.
- **D-10:** New `app/(student)/` route group; `layout.tsx` enforces `role='student'` as defense-in-depth.
- **D-11:** Redirect/access matrix (enforced in `middleware.ts` via `getClaims()`):

  | Route group | signed-out | student | coordinator | admin |
  |---|---|---|---|---|
  | `/student-dashboard/*` | → `/register/student` | allow | → `/dashboard` | → `/admin` |
  | `/dashboard`, `/onboarding` | → `/login` | → `/student-dashboard` | allow | allow (unchanged) |
  | `/admin/*` | → `/login?next=/admin` | → `/` | → `/` | allow (unchanged) |

- **D-12:** Tighten `bips_insert_coordinator` to require `app_metadata.role IN ('coordinator','admin')`. Add belt-and-suspenders explicit role assertion in coordinator BIP-submit Server Action(s).
- **D-13:** `/register/student` excluded from middleware by existing matcher (`register` is in the negative lookahead). Already-authenticated student visiting it is bounced via server-side redirect on the page itself, not middleware. The existing matcher comment says "DO NOT modify" — planner must flag whether `/student-dashboard` protection requires a matcher change or is handled purely by the new layout.
- **D-14:** Dashboard ships real but minimal: welcome/greeting header, Account card (email + Sign out), Browse BIPs CTA, one quiet "coming soon" line. No fake placeholder cards. Reuses existing `Card`/`Button` + layout chrome + footer disclaimer.
- **D-15:** Student sign-out lands on `/` (not `/login`). Add a student variant of `signOutAction` or a redirect-target parameter.

### Claude's Discretion

All decisions D-01 through D-15 were delegated by the user. The planner has flexibility on materialization details (trigger vs callback for profile creation; matcher edit vs layout-only guard; sign-out variant vs param) but must preserve the locked invariants.

### Deferred Ideas (OUT OF SCOPE)

- Server-side saved BIPs / heart-icon persistence (Phase 6)
- Alert subscriptions + digest email (Phase 7)
- Edit-approved-BIP flow (Phase 8)
- Institutional-email domain validation for students (v1.2+)
- Cross-link / unified auth landing page ("student vs coordinator" chooser)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STUD-01 | A student can create an account and sign in via magic-link (passwordless) email | `signInWithOtp({ shouldCreateUser: true })` — both paths in one call; callback routes to `/student-dashboard` |
| STUD-02 | A student's session persists across visits and devices | Supabase cookie-based SSR session via `@supabase/ssr` — already established pattern; no new work needed |
| STUD-03 | A signed-in student has a dedicated dashboard, separate from coordinator and admin areas | `app/(student)/student-dashboard/page.tsx` + middleware D-11 matrix |
| FOUN-07 | Every new table has RLS with both USING and WITH CHECK, preventing cross-user access and role self-escalation | `profiles_update_own_or_admin` replacement with role-stable WITH CHECK; `bips_insert_coordinator` tightening |
| FOUN-08 | Adding the student role grants no access to coordinator/admin routes or BIP submission | D-11 middleware matrix + tightened `bips_insert_coordinator` RLS + Server Action role assertion |
</phase_requirements>

---

## Summary

Phase 5 is an integration-and-hardening phase, not a greenfield build. The core task is threading a third role (`student`) through the existing Supabase Auth + RLS + Next.js middleware stack without weakening any coordinator or admin guard. Three intertwined capabilities must ship atomically in a single migration (`00015_student_role.sql`): (1) the role model extension, (2) the Custom Access Token Hook that puts the role in the JWT at issuance time, and (3) the tightened RLS policies that the new role would otherwise allow students to bypass.

The magic-link (`signInWithOtp`) flow is well-understood. The key complexity is (a) the Custom Access Token Hook SQL and `supabase/config.toml` registration, and (b) making the `/auth/callback/route.ts` distinguish between magic-link (student) and password-reset (recovery) destinations while reusing the same PKCE code-exchange logic. The UI-SPEC is fully locked and the component inventory is small — three RSC pages, one `'use client'` form, one new server action variant.

**Primary recommendation:** Write `00015_student_role.sql` first. The hook must be in place before any student test session is created because the timing fix is the entire point of D-06. Middleware and route-group changes are safe to add in parallel tasks but must be verified together.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Magic-link OTP dispatch | API / Backend (Supabase Auth) | Frontend Server (Server Action) | `signInWithOtp` is called from a Server Action — triggers Supabase's own email sender |
| PKCE code exchange + session creation | API / Backend (Supabase Auth) | Frontend Server (route handler) | `exchangeCodeForSession` in `app/auth/callback/route.ts` |
| Role injection into JWT at issuance | Database (Custom Access Token Hook PL/pgSQL) | — | Hook fires inside Supabase Auth engine before token is signed |
| Role-based routing / redirects | Frontend Server (middleware) | Frontend Server (layout.tsx) | Middleware = first gate; layout = defense-in-depth |
| Student profile row creation | Database (trigger on `auth.users` INSERT) or Frontend Server (Server Action after OTP exchange) | — | See note on materialization below |
| RLS enforcement — bips INSERT | Database | API / Backend (Server Action role assertion) | Belt-and-suspenders: RLS blocks at DB, action checks at app layer |
| Student dashboard shell UI | Frontend Server (RSC) | — | Server-rendered page; no client interactivity on Phase 5 shell |
| Sign-out + redirect | Frontend Server (Server Action) | — | Follows existing `signOutAction` pattern; variant redirect target |

---

## Standard Stack

### Core (existing, unchanged)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/ssr` | `0.5.2` (pinned exact — see STATE.md) | Auth cookie management, `createServerClient` | Project-locked; do NOT bump |
| `next` | `15.5.x LTS` | App Router, Server Actions, route handlers | Project-locked |
| `zod` | `v3.x` | Form validation (email field on register page) | Project-locked; do NOT use v4 |
| `@hookform/resolvers` | `v3.x` | React Hook Form + Zod integration | Project-locked |

### New in Phase 5 (no new npm packages)

No new npm dependencies are required. Phase 5 adds:
- One new PL/pgSQL function (Custom Access Token Hook)
- One `supabase/config.toml` section update
- Three new route files (RSC pages + layout)
- One new `'use client'` form component
- One new Server Action export (student sign-out variant)
- One modified Server Action (magic-link OTP)
- One new migration file

**Installation:** None — all packages already installed.

**Version verification:** [VERIFIED: live codebase `package.json`] — `@supabase/ssr` is at `0.5.2` exact, `next` is `15.5.x`.

---

## Architecture Patterns

### System Architecture Diagram

```
Student's browser
  │
  ├─ GET /register/student
  │     └─> RSC: reads ?error=expired searchParam → render card
  │         [state A: email form] or [state C: expired alert + form]
  │
  ├─ POST (Server Action: signInWithOtpAction)
  │     └─> supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true,
  │           data: { role: 'student' }, emailRedirectTo: SITE_URL/auth/callback?type=magiclink } })
  │         └─> Supabase sends magic-link email
  │     └─> Server Action returns success → page transitions to state B
  │
  ├─ Student clicks email link → browser hits /auth/callback?code=...&type=magiclink
  │     └─> route handler: exchangeCodeForSession(code)
  │           ├─ On error → redirect /register/student?error=expired
  │           └─ On success → Custom Access Token Hook fires (DB):
  │                 reads profiles.role for this user_id
  │                 → injects app_metadata.role = 'student' into JWT claims
  │                 → Supabase signs JWT with role already present
  │             redirect /student-dashboard
  │
  ├─ GET /student-dashboard
  │     ├─ middleware.ts: getClaims() → role='student' → allow
  │     └─> (student)/layout.tsx: getClaims() + role check (defense-in-depth)
  │         └─> StudentDashboardPage RSC: welcome header, Account card, Browse BIPs CTA
  │
  └─ POST (signOutStudentAction)
        └─> supabase.auth.signOut() → revalidatePath → redirect('/')
```

### Recommended Project Structure (additions only)

```
app/
├── (auth)/
│   └── register/
│       └── student/
│           └── page.tsx           ← RSC: reads ?step, ?email, ?error; renders StudentMagicLinkForm or confirmation
├── (student)/
│   ├── layout.tsx                 ← RSC: getClaims() auth + role='student' guard; StudentNav; EC disclaimer
│   └── student-dashboard/
│       └── page.tsx               ← RSC: welcome header, Account card, Browse BIPs card, coming-soon line
components/
├── auth/
│   └── StudentMagicLinkForm.tsx   ← 'use client': email state, OTP submit, rate-limit cooldown, loading
└── student/
    └── StudentNav.tsx             ← RSC: h-16 nav bar mirroring DashboardNav structure
lib/
└── actions/
    └── auth.ts                    ← MODIFIED: add signInWithOtpAction, signOutStudentAction
supabase/
├── migrations/
│   └── 00015_student_role.sql    ← NEW: CHECK extension, hook fn, config grant, policy replacements
└── config.toml                   ← MODIFIED: [auth.hook.custom_access_token] section
```

### Pattern 1: Custom Access Token Hook (D-06) — SQL and Config

**What:** PL/pgSQL function registered in `supabase/config.toml` under `[auth.hook.custom_access_token]`. Fires inside Supabase Auth engine before the JWT is signed, allowing the role to be injected from `profiles.role` at the moment of token issuance — solving Pitfall 1 entirely.

**Why in-process PL/pgSQL (not Edge Function):** No cold-start latency, no separate deploy target, fires atomically with token issuance, matches the recommendation in SUMMARY.md and PITFALLS.md. [VERIFIED: Context7 docs show both options; PL/pgSQL is the confirmed choice for D-06]

**Hook function signature** [VERIFIED: Context7/supabase docs `custom-access-token-hook.mdx`]:

```sql
-- Migration: 00015_student_role.sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  user_role text;
begin
  -- Read the current role from profiles (not raw_app_meta_data which may be stale)
  select role into user_role
  from public.profiles
  where id = (event->>'user_id')::uuid;

  claims := event->'claims';

  -- Ensure app_metadata key exists
  if jsonb_typeof(claims->'app_metadata') is null then
    claims := jsonb_set(claims, '{app_metadata}', '{}');
  end if;

  -- Inject role into app_metadata (matching the existing JWT path that RLS reads)
  if user_role is not null then
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role));
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Grant supabase_auth_admin permission to execute the hook and read profiles
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from public, anon, authenticated;
grant select on table public.profiles to supabase_auth_admin;
```

**config.toml registration** [VERIFIED: Context7/supabase docs `auth-hooks.mdx`, `pg-functions` scheme]:

```toml
[auth.hook.custom_access_token]
enabled = true
uri = "pg-functions://postgres/public/custom_access_token_hook"
```

**Relationship to existing `sync_role_to_app_metadata()` trigger (migrations 00002/00008):**

The trigger fires on `profiles` INSERT or UPDATE OF role and writes to `auth.users.raw_app_meta_data`. The hook fires before JWT issuance and reads `profiles.role` directly. These two mechanisms are **not in conflict** — they do different things at different times:

- Trigger: keeps `raw_app_meta_data` in sync for historical records and any code path that reads `raw_app_meta_data` directly.
- Hook: guarantees the *first* JWT (issued at signup before the trigger has had a chance to update `raw_app_meta_data`) already contains the correct role.

**Decision (D-06 materialization):** Keep both. Do not remove the trigger. The hook is additive. The trigger continues to keep `raw_app_meta_data` accurate as a secondary source of truth. [ASSUMED: the PITFALLS.md implies keeping both; no official Supabase docs say to remove the trigger when adding a hook]

### Pattern 2: `signInWithOtp` Magic-Link Flow

**What:** Server Action calling `supabase.auth.signInWithOtp()`. Handles both new signups and returning sign-ins identically — Supabase creates the user if `shouldCreateUser: true` and they don't exist, or signs in the existing user if they do.

**How to pass student role into `raw_user_meta_data`** [VERIFIED: Context7/supabase docs `managing-user-data.mdx` — `options.data` maps to `raw_user_meta_data`]:

```typescript
// lib/actions/auth.ts (new export: signInWithOtpAction)
'use server'
export async function signInWithOtpAction(
  formData: FormData,
): Promise<{ error?: string; success?: true }> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  // Zod email validation
  const result = z.string().email().safeParse(email)
  if (!result.success) {
    return { error: 'Please enter a valid email address.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: result.data,
    options: {
      shouldCreateUser: true,
      // options.data → raw_user_meta_data on the new auth.users row
      // The handle_new_user trigger (or profile INSERT callback) reads this
      // to set profiles.role = 'student'
      data: { role: 'student' },
      emailRedirectTo: `${SITE_URL}/auth/callback?type=magiclink`,
    },
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('rate limit') || error.status === 429) {
      return { error: 'Too many requests. Please wait a few minutes before trying again.' }
    }
    return { error: 'Something went wrong. Please try again.' }
  }
  return { success: true }
}
```

**Existing profile creation trigger behavior (D-07 materialization):**

The existing `profiles_sync_role` trigger on `public.profiles` fires on INSERT/UPDATE OF role. However, profiles are not auto-created by Supabase auth — the project must insert the profile row explicitly. Two options:

1. **Option A (Supabase `handle_new_user` trigger on `auth.users`):** A trigger on `auth.users` INSERT reads `raw_user_meta_data.role` and inserts into `profiles` with `role = raw_user_meta_data ->> 'role'`. This is the most common pattern and fully automatic. The planner should choose this path — it ensures profile creation happens in the same DB transaction as user creation regardless of the call path.

2. **Option B (callback-time profile INSERT):** In `/auth/callback/route.ts`, after `exchangeCodeForSession`, read `user.user_metadata.role` and upsert the profile. This is more fragile (callback failure = no profile).

**Recommended: Option A.** The planner will decide; the invariant (D-07) is locked: student-route signups get `role='student'`, existing roles are never overwritten by this path. [ASSUMED: the project does not currently have a `handle_new_user` trigger on `auth.users`; this needs a planner decision]

**If the project currently creates profiles via the coordinator sign-up Server Action only (`signUpAction`)**, then the magic-link flow has no Server Action profile-creation step (the callback is a GET route handler, not a POST). Option A (DB-level trigger on `auth.users`) is then the correct approach to guarantee profile creation for magic-link signups.

**Verification of current profile creation path:**

Looking at `lib/actions/auth.ts` `signUpAction` — it calls `supabase.auth.signUp()` but does NOT explicitly `INSERT INTO profiles`. Profile creation must happen via a DB trigger on `auth.users`. The existing coordinator signup relies on this. The student magic-link path will follow the same DB trigger. [VERIFIED: `signUpAction` in `lib/actions/auth.ts` has no explicit profile INSERT, confirming trigger-based profile creation]

**Action needed in `00015_student_role.sql`:** Verify (and if needed, add) a `handle_new_user` trigger on `auth.users` that reads `raw_user_meta_data.role` (defaulting to `'coordinator'` if absent, to preserve existing behavior) and inserts into `profiles`. If such a trigger already exists (from earlier migrations), the migration only needs to ensure the CHECK constraint is extended before any student signs up.

### Pattern 3: Callback Route Branching (D-04)

**Existing `app/auth/callback/route.ts`** handles:
- `type=recovery` → `/reset-password/update`
- (default / no type) → `/onboarding` (coordinator)

**Add:**
- `type=magiclink` → `/student-dashboard`

**Expired/invalid link handling (success criterion 2):**

When `exchangeCodeForSession(code)` fails (expired OTP, wrong browser, etc.), the existing code redirects to `/login?error=verification_failed`. For student magic links this must redirect to `/register/student?error=expired` so the student sees the `Alert` component and the email form pre-focused (as specified in UI-SPEC State C).

```typescript
// app/auth/callback/route.ts — add student branch
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')

  if (!code) {
    const errDest = type === 'magiclink'
      ? `${SITE_URL}/register/student?error=expired`
      : `${SITE_URL}/login?error=verification_failed&reason=no_code`
    return NextResponse.redirect(errDest)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    const errDest = type === 'magiclink'
      ? `${SITE_URL}/register/student?error=expired`
      : `${SITE_URL}/login?error=verification_failed&reason=${encodeURIComponent(error.message ?? '').slice(0, 120)}`
    return NextResponse.redirect(errDest)
  }

  const destination =
    type === 'recovery'    ? `${SITE_URL}/reset-password/update`
    : type === 'magiclink' ? `${SITE_URL}/student-dashboard`
                           : `${SITE_URL}/onboarding`
  return NextResponse.redirect(destination)
}
```

### Pattern 4: Middleware D-11 Matrix

**Current `middleware.ts` state (read from live file):**

- Line 35-39: Auth-required gate — `pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')` → redirect `/login` if no claims. No role check.
- Line 45-55: Admin gate — `/admin` → redirect `/login?next=/admin` or `/` for non-admin.
- Line 61-63: Already-authenticated bounce — `/login` or `/register` → `/dashboard`.
- Line 69-79: Matcher excludes `login`, `register`, `auth`, static assets.

**Changes required for D-11:**

```typescript
// (3a) MODIFIED: /dashboard and /onboarding — add role check for student
if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
  if (!claims) return NextResponse.redirect(new URL('/login', request.url))
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role === 'student') {
    return NextResponse.redirect(new URL('/student-dashboard', request.url))
  }
}

// (3d) NEW: /student-dashboard — student route group guard
if (pathname.startsWith('/student-dashboard')) {
  if (!claims) {
    return NextResponse.redirect(new URL('/register/student', request.url))
  }
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role === 'coordinator') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  if (role === 'admin') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }
  // role === 'student' || role === null (Custom Access Token Hook ensures non-null for real sessions)
  // allow through — layout.tsx provides defense-in-depth
}

// (3c) EXISTING: already-authenticated bounce — extend to route students correctly
if (claims) {
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (pathname === '/login' || pathname === '/register') {
    return NextResponse.redirect(new URL(
      role === 'student' ? '/student-dashboard'
      : role === 'admin'  ? '/admin'
                          : '/dashboard',
      request.url
    ))
  }
}
```

**Matcher question (D-13):** The existing matcher excludes `register` from middleware execution. The path `/register/student` is excluded (it contains `register`). The path `/student-dashboard` is NOT currently excluded and WILL run through middleware — so the new `(3d)` guard above is reached without a matcher change. **No matcher change is needed.** The "DO NOT modify" comment is preserved. [VERIFIED: reading `middleware.ts` line 78 — the matcher negative lookahead is `login|register|auth` which excludes `/register/*` and `/register/student/*` from middleware, but `/student-dashboard/*` is not excluded and will be protected by the new guard.]

### Pattern 5: RLS Policy Replacements

**`bips_insert_coordinator` (from 00006 — currently no role check):**

```sql
-- 00015_student_role.sql
drop policy if exists "bips_insert_coordinator" on public.bips;

create policy "bips_insert_coordinator"
  on public.bips for insert
  to authenticated
  with check (
    (select auth.uid()) = created_by
    and (select auth.jwt() -> 'app_metadata' ->> 'role') in ('coordinator', 'admin')
  );
```

**`profiles_update_own_or_admin` — role-stable WITH CHECK (D-09 / FOUN-07):**

The current policy in `00006_rls_policies.sql` checks `id = auth.uid()` in WITH CHECK but does NOT prevent a user from changing their own `role` column. With three roles, a student could change `role = 'coordinator'` via the Supabase REST API directly.

```sql
-- 00015_student_role.sql
drop policy if exists "profiles_update_own_or_admin" on public.profiles;

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  to authenticated
  using (
    (select auth.uid()) = id
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    -- Non-admin: can update own row BUT role column must not change.
    -- Subquery reads the CURRENT role from DB; WITH CHECK asserts the proposed
    -- post-image role equals the current role.
    (
      (select auth.uid()) = id
      and role = (select role from public.profiles where id = (select auth.uid()))
    )
    -- Admin: can update any row including role changes
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
```

**Note on WITH CHECK subquery:** This subquery is evaluated against the current row. A student trying to update `role = 'coordinator'` will fail because `'coordinator' != current_role ('student')`. The check passes only if the proposed role equals the existing role. Admins bypass via the OR branch. [VERIFIED: ARCHITECTURE.md line ~90-105 shows this exact pattern; standard Postgres RLS behavior]

**`profiles.role` CHECK extension:**

```sql
-- 00015_student_role.sql
alter table public.profiles
  drop constraint profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('coordinator', 'admin', 'student'));
```

**Belt-and-suspenders in coordinator BIP-submit Server Action (D-12):**

```typescript
// In whatever Server Action currently handles BIP submission (lib/actions/ area)
// Add at the top of the action:
const { data: claimsData } = await supabase.auth.getClaims()
const claims = claimsData?.claims
const role = (claims as { app_metadata?: { role?: string } })?.app_metadata?.role
if (role !== 'coordinator' && role !== 'admin') {
  return { error: 'Forbidden.' }
}
```

### Pattern 6: `(student)/layout.tsx` Guard

Mirrors `(dashboard)/layout.tsx` and `(admin)/layout.tsx` patterns (verified from live code):

```typescript
// app/(student)/layout.tsx
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) redirect('/register/student')
  const claims = data.claims
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role !== 'student') {
    redirect(role === 'admin' ? '/admin' : role === 'coordinator' ? '/dashboard' : '/register/student')
  }
  // ... render StudentNav + main + EC disclaimer
}
```

**Student profile NOT subject to the onboarding gate** (D-08): unlike `(dashboard)/layout.tsx` which checks `university_id && erasmus_code && full_name && contact_email`, the student layout performs no profile-complete gate. Students are allowed through with `university_id = NULL`.

### Pattern 7: `signOutStudentAction` (D-15)

```typescript
// lib/actions/auth.ts — new export
export async function signOutStudentAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')     // redirects to home, NOT /login (D-15)
}
```

Used in the StudentNav `<form action={signOutStudentAction}>` as specified in UI-SPEC.

### Pattern 8: Already-Authenticated Check on `/register/student` Page (D-13)

The page itself (RSC) handles the bounce for already-authenticated visitors:

```typescript
// app/(auth)/register/student/page.tsx
export default async function StudentRegisterPage({ searchParams }) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (data?.claims) {
    const role = data.claims.app_metadata?.role
    if (role === 'student') redirect('/student-dashboard')
    if (role === 'coordinator') redirect('/dashboard')
    if (role === 'admin') redirect('/admin')
  }
  // ... render StudentMagicLinkForm with state from searchParams
}
```

### Anti-Patterns to Avoid

- **Never gate `profiles_update_own_or_admin` WITH CHECK on only `id = auth.uid()`.** The current v1.0 policy does this. Without the role-stability clause, any student can self-escalate to coordinator via Supabase REST API. (FOUN-07)
- **Never call `signInWithPassword` for students.** The magic-link flow uses `signInWithOtp` exclusively. The student form has no password field.
- **Never read `getSession()` server-side.** All server-side auth reads use `getClaims()`. This is a locked project constraint.
- **Never rely on `app_metadata.role` being present in the first JWT without the Custom Access Token Hook.** The trigger fires after JWT issuance; without the hook, brand-new students have `app_metadata.role = null` for up to 1 hour (Pitfall 1).
- **Never let the coordinator profile-complete gate run for students.** The `(student)/layout.tsx` must not query `university_id`, `erasmus_code`, or `full_name` for completeness and must not redirect to `/onboarding`.
- **Never import `createAdminClient` in the student route group or Server Actions.** Confined to `app/(admin)/` and `lib/supabase/admin.ts`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT role injection at issuance | Custom middleware that patches session | Supabase Custom Access Token Hook (PL/pgSQL) | Hook fires inside the Auth engine; middleware runs after token issuance and cannot modify the token |
| Magic-link email sending | Custom transactional email | `supabase.auth.signInWithOtp()` | Supabase handles OTP rate limiting, link expiry, delivery retries |
| PKCE code exchange | Manual code ↔ session swap | `supabase.auth.exchangeCodeForSession(code)` | Handles PKCE verifier cookie matching; misimplementation leads to cross-browser session failure |
| Role self-escalation prevention | Client-side role validation | Database-level WITH CHECK in the UPDATE RLS policy | Client-side checks can be bypassed; RLS is enforced by Postgres |
| Session persistence across restarts | Manual cookie management | `@supabase/ssr` + `setAll` / `getAll` cookie pattern | Already implemented in `lib/supabase/server.ts` and `middleware.ts`; reuse verbatim |

---

## Common Pitfalls

### Pitfall 1: JWT Role Timing — Student Has Null `app_metadata.role` For Up To 1 Hour

**What goes wrong:** The `sync_role_to_app_metadata()` trigger fires on `profiles` INSERT/UPDATE. The JWT was already issued when `signInWithOtp` returned. The first JWT has `app_metadata.role = null`. Without the Custom Access Token Hook (D-06), all role-checking middleware and RLS fails for fresh students.

**How to avoid:** Implement the Custom Access Token Hook (Pattern 1 above). The hook reads `profiles.role` directly at JWT-signing time, guaranteeing the role is present in the very first token.

**Warning signs:** Student signs in, middleware reads role as null, redirects to `/register/student` in an infinite loop OR student lands on `/dashboard` because `role !== 'student'` check fails on null.

### Pitfall 2: Student Triggering the Coordinator Profile-Complete Gate

**What goes wrong:** `(dashboard)/layout.tsx` checks for `university_id && erasmus_code && full_name && contact_email`. A student authenticated but routed to `/dashboard` (before D-11 is in place) loops through `/onboarding` forever because student profiles never have `university_id`.

**How to avoid:** The D-11 middleware matrix and `(dashboard)/layout.tsx` role check redirect students away from `/dashboard` before the gate runs. But the ordering matters: the middleware change must be in place before student registration is enabled.

### Pitfall 3: `bips_insert_coordinator` Allows Any Authenticated User

**What goes wrong:** Current policy only checks `auth.uid() = created_by`. A student JWT can insert a BIP row via Supabase REST API.

**How to avoid:** Replace the policy in `00015_student_role.sql` with the role-checked version (Pattern 5 above). Also add application-layer role assertion in the coordinator BIP-submit Server Action (D-12).

**Timing note:** The role-checking RLS policy itself uses `app_metadata.role` from the JWT. Due to Pitfall 1, a brand-new coordinator's first JWT might also have a brief window where the role claim is null. For coordinators this was always true (v1.0 never checked role at insert). The belt-and-suspenders Server Action check (D-12) provides the synchronous guard until the JWT is refreshed.

### Pitfall 4: `supabase/config.toml` Hook Not Registered — Hook Function Created But Never Called

**What goes wrong:** The PL/pgSQL function `custom_access_token_hook` is created in the migration, grants are correct, but `supabase/config.toml` is not updated with `[auth.hook.custom_access_token]`. The hook silently never fires. Students still get null role in their first JWT.

**How to avoid:** The config.toml update must be in the same wave as the SQL function (Wave 0 or Wave 1). Local dev: `supabase db reset` or `supabase start` picks up the new config. Verify by checking `supabase status` and confirming the hook is listed as active. On Supabase hosted: use the Dashboard's Auth > Hooks section to register the hook URI.

**Warning signs:** After migration, a fresh magic-link session still shows `app_metadata.role = null` in `getClaims()` output.

### Pitfall 5: Existing `profiles_update_own_or_admin` WITH CHECK Does Not Prevent Role Self-Escalation

**What goes wrong:** The v1.0 policy's WITH CHECK is `(select auth.uid()) = id and id = (select auth.uid())` — this only enforces row identity, not column-level immutability of `role`. Any authenticated user can issue `UPDATE profiles SET role = 'admin'` via the Supabase REST API against their own row and it passes the WITH CHECK.

**How to avoid:** Replace the policy with the role-stable variant (Pattern 5 above) in `00015_student_role.sql`. [VERIFIED: reading `00006_rls_policies.sql` — the current WITH CHECK does NOT check role immutability]

### Pitfall 6: `signInWithOtp` With `options.data` Does Not Guarantee `profiles.role = 'student'` for Returning Users

**What goes wrong:** A returning student clicks the magic link. `signInWithOtp` is called with `data: { role: 'student' }`. For an **existing** user, `raw_user_meta_data` is NOT overwritten by subsequent `signInWithOtp` calls — `options.data` only applies at user creation. If the profile row already exists with `role = 'student'`, no problem. But if somehow the profile is deleted or the user exists in `auth.users` without a `profiles` row, re-creation via the DB trigger reads from `raw_user_meta_data` which was set at original creation time.

**How to avoid:** The Custom Access Token Hook reads `profiles.role` at JWT-signing time — not `raw_user_meta_data`. As long as the `profiles` row exists with the correct role, the hook injects correctly. The `options.data` in `signInWithOtp` is for the initial user creation only. The `handle_new_user` trigger (see Pattern 2 above) uses it to set the initial `profiles.role`. Subsequent sign-ins just use whatever is in `profiles.role`. This is the correct and intended behavior per D-07.

---

## Code Examples

### Verified: Custom Access Token Hook SQL + Grant Pattern

[CITED: https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/api/custom-claims-and-role-based-access-control-rbac.mdx]
[CITED: https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/auth/auth-hooks/custom-access-token-hook.mdx]

The minimal verified pattern for injecting `app_metadata.role` from a `profiles` table:

```sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims  jsonb;
  v_role  text;
begin
  select role into v_role
    from public.profiles
   where id = (event->>'user_id')::uuid;

  claims := event->'claims';

  if jsonb_typeof(claims->'app_metadata') is null then
    claims := jsonb_set(claims, '{app_metadata}', '{}');
  end if;

  if v_role is not null then
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(v_role));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from public, anon, authenticated;
grant select on table public.profiles to supabase_auth_admin;
```

### Verified: `signInWithOtp` with user metadata and redirect

[CITED: https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/auth/auth-email-passwordless.mdx]
[CITED: https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/auth/managing-user-data.mdx]

```typescript
const { error } = await supabase.auth.signInWithOtp({
  email: 'student@example.com',
  options: {
    shouldCreateUser: true,           // create if new, sign in if existing
    data: { role: 'student' },        // → raw_user_meta_data at creation time
    emailRedirectTo: `${SITE_URL}/auth/callback?type=magiclink`,
  },
})
```

### Verified: Input payload shape for the Custom Access Token Hook

[CITED: https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/auth/auth-hooks/custom-access-token-hook.mdx]

```json
{
  "user_id": "<uuid>",
  "claims": {
    "aud": "authenticated",
    "sub": "<uuid>",
    "email": "student@example.com",
    "app_metadata": {},
    "user_metadata": {},
    "role": "authenticated",
    "aal": "aal1",
    "amr": [{ "method": "magiclink", "timestamp": 1715686621 }],
    "session_id": "<uuid>"
  },
  "authentication_method": "magiclink"
}
```

Hook receives this, reads `profiles.role` for `user_id`, then returns the event with `claims.app_metadata.role` set.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Trigger-only role mirror (`sync_role_to_app_metadata`) | Trigger + Custom Access Token Hook | Supabase GA'd PL/pgSQL hooks late 2023 | Hook eliminates the 1-hour stale-JWT window for new signups |
| Edge Function for custom access token hook | PL/pgSQL (in-process) | Available from hook GA | No cold start; simpler deploy; no Deno |
| `framer-motion` | `motion` package (`motion/react`) | Package rename | Import from `motion/react`; wrap in `LazyMotion` |
| `createBrowserClient` re-initialized per render | `createClient` with stable cookie store | Established pattern | No change — already correct in project |

**Deprecated/outdated:**
- `getSession()` server-side: forbidden in this project (never validates JWT signature). Use `getClaims()` everywhere.
- `shouldCreateUser: false` in `signInWithOtp`: would block new student sign-ups. Must be `true`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The project does not currently have a `handle_new_user` trigger on `auth.users` for profile creation; profile INSERT happens via some other mechanism triggered by the signup flow | Pattern 2 | If a trigger already exists, the 00015 migration must update it rather than create a new one to avoid duplicate profile inserts |
| A2 | Keeping `sync_role_to_app_metadata()` trigger alongside the Custom Access Token Hook does not cause double-write issues | Pattern 1 | Both write to `app_metadata.role` — the hook at JWT issuance, the trigger at INSERT/UPDATE. They should be idempotent (writing same value); but if they diverge due to a bug, `app_metadata.role` in the DB could differ from the JWT claim. Low risk in practice. |
| A3 | The coordinator BIP-submit Server Action is in `lib/actions/` (not named explicitly in research) | Pattern 5 D-12 | Planner must locate the correct file before adding role assertion |
| A4 | `supabase/config.toml` `[auth.hook.custom_access_token]` with `uri = "pg-functions://postgres/public/custom_access_token_hook"` is the correct local dev registration format | Pattern 1 | If the postgres database name differs from "postgres" in the local setup, the URI must be adjusted. Standard Supabase local dev uses "postgres" as the DB name. |

---

## Open Questions

1. **Does a `handle_new_user` trigger on `auth.users` already exist?**
   - What we know: `signUpAction` in `lib/actions/auth.ts` calls `supabase.auth.signUp()` but does NOT insert into `profiles` explicitly. Profile rows must be created somewhere automatically.
   - What's unclear: Is there an undocumented trigger in an early migration, or does the coordinator signup flow create the profile row in a different action?
   - Recommendation: Planner should grep all migrations for `CREATE TRIGGER` on `auth.users` before writing `00015_student_role.sql`. If none found, add a `handle_new_user` trigger that reads `raw_user_meta_data ->> 'role'` and defaults to `'coordinator'` to preserve existing behavior.

2. **Should the matcher be changed to protect `/student-dashboard`?**
   - What we know: The existing matcher excludes `register|auth|login` but NOT `student-dashboard`. Requests to `/student-dashboard/*` do hit the middleware. The new `(3d)` guard in middleware handles protection.
   - What's unclear: D-13 says "flag this explicitly" — the planner should confirm no matcher change is needed and document the decision.
   - Recommendation: No matcher change is needed. The `(student)/layout.tsx` defense-in-depth plus the middleware `(3d)` guard are sufficient. Document this explicitly in the plan.

3. **Does `supabase_auth_admin` already have SELECT on `public.profiles`?**
   - What we know: The hook needs `grant select on table public.profiles to supabase_auth_admin`. If an earlier migration already granted this (e.g., for another hook), the grant is idempotent and safe to re-issue.
   - What's unclear: No earlier hook exists in the project, so this grant is likely new.
   - Recommendation: Issue the grant unconditionally in `00015_student_role.sql`; it is idempotent.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase local CLI | Migration + config.toml hook registration | ✓ | `supabase status` confirms 2.98.x | — |
| Supabase Auth Custom Access Token Hook | D-06 JWT role at issuance | ✓ | GA since late 2023; available in all Supabase plans including free | — |
| Supabase Inbucket (local email testing) | Testing magic-link email in local dev | ✓ | Enabled in `config.toml` line 100 | — |
| `@supabase/ssr` 0.5.2 | Auth cookie handling | ✓ | Pinned exact in package.json | — |
| shadcn `Card`, `Button`, `Input`, `Label`, `Alert`, `Form` | UI-SPEC components for Phase 5 surfaces | ✓ | Already installed per UI-SPEC checker sign-off | — |

**No missing dependencies.** All required capabilities are available in the current environment.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright (confirmed from `tests/e2e/*.spec.ts`) |
| Config file | `playwright.config.ts` (exists — referenced in auth.spec.ts) |
| Quick run command | `npx playwright test tests/e2e/auth.spec.ts` |
| Full suite command | `npx playwright test tests/e2e/` |

### Phase Requirements → Test Map

| Req ID | Behavior / Success Criterion | Test Type | Automated Command | File Exists? |
|--------|------------------------------|-----------|-------------------|-------------|
| STUD-01 / SC-1 | Student navigates to `/register/student`, submits email, receives magic link, lands on `/student-dashboard` | e2e | `npx playwright test tests/e2e/student-auth.spec.ts` | ❌ Wave 0 |
| STUD-01 / SC-2 | Expired magic link redirects to `/register/student?error=expired`; Alert renders; form is pre-focused | e2e | `npx playwright test tests/e2e/student-auth.spec.ts` | ❌ Wave 0 |
| STUD-02 / SC-3 | Session persists across browser restart (cookie-based) | e2e | `npx playwright test tests/e2e/student-auth.spec.ts --grep "session persistence"` | ❌ Wave 0 |
| STUD-03 / SC-4 | Authenticated student visiting `/dashboard` is redirected to `/student-dashboard` | e2e | `npx playwright test tests/e2e/student-auth.spec.ts --grep "role redirect"` | ❌ Wave 0 |
| FOUN-08 / SC-5 | Student JWT cannot insert a row into `bips` (RLS blocks with permission error) | e2e + RLS | `npx playwright test tests/e2e/student-auth.spec.ts --grep "bips insert blocked"` | ❌ Wave 0 |
| FOUN-07 | `profiles_update_own_or_admin` WITH CHECK prevents student from setting `role = 'coordinator'` via REST API | e2e (API level) | `npx playwright test tests/e2e/student-auth.spec.ts --grep "role self-escalation blocked"` | ❌ Wave 0 |
| D-11 matrix | Unauthenticated user visiting `/student-dashboard` redirects to `/register/student` | e2e | `npx playwright test tests/e2e/student-auth.spec.ts --grep "unauthenticated redirect"` | ❌ Wave 0 |
| D-15 | Student sign-out redirects to `/` not `/login` | e2e | `npx playwright test tests/e2e/student-auth.spec.ts --grep "sign out"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** Not applicable (Phase 5 is too integrated for per-commit partial suite runs until Wave 1 completes)
- **Per wave merge:** `npx playwright test tests/e2e/student-auth.spec.ts`
- **Phase gate:** Full suite green `npx playwright test tests/e2e/` before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/e2e/student-auth.spec.ts` — covers all success criteria + STUD-01/02/03 + FOUN-07/08
- [ ] Test fixture: student test user email (`e2e-student@biphub.test`) — add to `supabase/seed.e2e.sql`
- [ ] Test helper: auto-confirm magic-link via admin API (analogous to the coordinator auto-confirm pattern in `auth.spec.ts` lines 44-60)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth `signInWithOtp`; magic-link email delivery |
| V3 Session Management | yes | `@supabase/ssr` cookie-based session; `getClaims()` JWT validation |
| V4 Access Control | yes | Middleware D-11 matrix + layout guards + RLS |
| V5 Input Validation | yes | Zod `z.string().email()` on register form |
| V6 Cryptography | no direct impact | Supabase handles JWT signing; no hand-rolled crypto |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Student self-escalates role to coordinator via REST API | Elevation of Privilege | `profiles_update_own_or_admin` WITH CHECK role-stability clause (FOUN-07) |
| Student inserts BIP via Supabase REST API directly | Elevation of Privilege | `bips_insert_coordinator` role check in RLS + Server Action assertion (FOUN-08) |
| Student reaches `/dashboard` (coordinator area) by direct navigation | Information Disclosure | Middleware D-11 guard + `(dashboard)/layout.tsx` role check |
| Stale magic link reused after expiry | Spoofing | Supabase handles OTP expiry (1 hour, per `otp_expiry = 3600` in config.toml); callback error → `/register/student?error=expired` |
| PKCE code interception | Spoofing | Supabase PKCE exchange validates code_verifier cookie; cross-browser clicks fail safely |
| Open redirect via `emailRedirectTo` | Spoofing | `emailRedirectTo` constrained to `NEXT_PUBLIC_SITE_URL` (server-controlled env var) + `additional_redirect_urls` in config.toml allowlist |
| `createAdminClient` called outside confined path | Elevation of Privilege | ESLint `no-restricted-imports` rule (established in Plan 01-08) already enforces this |

---

## Sources

### Primary (HIGH confidence)

- Context7 `/supabase/supabase` — custom-access-token-hook.mdx, custom-claims-and-role-based-access-control-rbac.mdx, auth-email-passwordless.mdx, managing-user-data.mdx, auth-hooks.mdx
- Live codebase: `middleware.ts`, `lib/actions/auth.ts`, `app/auth/callback/route.ts`, `app/(dashboard)/layout.tsx`, `app/(admin)/layout.tsx`
- Live migrations: `00002_universities_profiles.sql`, `00006_rls_policies.sql`, `00008_app_metadata_role_mirror.sql`, `00009_profiles_erasmus_code.sql`
- `supabase/config.toml` — confirmed `[auth.hook.custom_access_token]` section (commented out, ready to enable)
- `.planning/phases/05-student-auth-role-model/05-CONTEXT.md` — locked decisions D-01..D-15
- `.planning/phases/05-student-auth-role-model/05-UI-SPEC.md` — component inventory and layout contract
- `.planning/research/PITFALLS.md` — Pitfalls 1, 2, 3 (JWT timing, profiles audit, middleware hardening)
- `.planning/research/ARCHITECTURE.md` — `app/(student)/` scope, `00015_student_role.sql` migration scope, RLS policy SQL examples

### Secondary (MEDIUM confidence)

- `.planning/research/SUMMARY.md` — Phase 1 (5) implications section; confirmed no new npm packages needed
- `.planning/REQUIREMENTS.md` — STUD-01..03, FOUN-07, FOUN-08 requirement definitions

### Tertiary (LOW confidence — verified by assumption tag)

- A1: `handle_new_user` trigger existence — inferred from absence of explicit profile INSERT in `signUpAction`
- A4: `pg-functions://postgres/public/custom_access_token_hook` URI format — inferred from config.toml example comment at line 281 and Context7 docs; should be verified on first `supabase start` after config change

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages confirmed in live codebase; no new packages
- Architecture: HIGH — patterns derived from live code + Context7-verified Supabase docs; two LOW-confidence assumptions flagged (A1 trigger, A4 URI)
- Pitfalls: HIGH — derived directly from existing PITFALLS.md (itself HIGH confidence) + live migration code verification
- Validation: HIGH — Playwright infra confirmed in `tests/e2e/`; test file list is accurate (checked via glob)

**Research date:** 2026-06-15
**Valid until:** 2026-07-15 (30 days — Supabase Auth hooks API is stable)
