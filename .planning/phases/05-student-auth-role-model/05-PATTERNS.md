# Phase 5: Student Auth + Role Model - Pattern Map

**Mapped:** 2026-06-15
**Files analyzed:** 10 new/modified files
**Analogs found:** 10 / 10

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/migrations/00015_student_role.sql` | migration | CRUD | `supabase/migrations/00006_rls_policies.sql` + `00002_universities_profiles.sql` + `00008_app_metadata_role_mirror.sql` | exact (same migration author patterns, same policy table) |
| `supabase/config.toml` | config | — | `supabase/config.toml` lines 279-281 (commented hook block) | exact (uncomment + fill) |
| `app/(student)/layout.tsx` | middleware/layout | request-response | `app/(admin)/layout.tsx` (role guard without profile-complete gate) | exact |
| `app/(student)/student-dashboard/page.tsx` | component (RSC page) | request-response | `app/(dashboard)/layout.tsx` (claims + profile read pattern) | role-match |
| `app/(auth)/register/student/page.tsx` | component (RSC page) | request-response | `app/(auth)/login/page.tsx` (searchParams → error state + form delegation) | exact |
| `lib/actions/auth.ts` | service | request-response | `lib/actions/auth.ts` itself — `signUpAction`, `signOutAction`, `resendVerificationAction` | exact (file modification) |
| `app/auth/callback/route.ts` | route | request-response | `app/auth/callback/route.ts` itself — existing `type` branch | exact (file modification) |
| `middleware.ts` | middleware | request-response | `middleware.ts` itself — existing admin guard block (lines 45-55) | exact (file modification) |
| `lib/actions/bip-submit.ts` | service | CRUD | `lib/actions/bip-submit.ts` itself — `getClaims()` + `userId` guard at top | exact (file modification) |
| `tests/e2e/student-auth.spec.ts` | test | request-response | `tests/e2e/auth.spec.ts` (auto-confirm helper, fixture email pattern, storage-state) | exact |
| `supabase/seed.e2e.sql` | config/fixture | CRUD | `supabase/seed.e2e.sql` itself — Step 1 auth.users insert + Step 2 profiles insert | exact (file modification) |

---

## Pattern Assignments

---

### `supabase/migrations/00015_student_role.sql` (migration, CRUD)

**Analogs:** `00002_universities_profiles.sql`, `00006_rls_policies.sql`, `00008_app_metadata_role_mirror.sql`

**Constraint extension pattern** (`00002_universities_profiles.sql` lines 30-32):
```sql
-- Current:
role text not null default 'coordinator'
  check (role in ('coordinator','admin')),

-- Phase 5 replacement — drop + re-add:
alter table public.profiles
  drop constraint profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('coordinator', 'admin', 'student'));
```

**Trigger function + security grant pattern** (`00002_universities_profiles.sql` lines 43-60, `00008_app_metadata_role_mirror.sql` lines 34-35):
```sql
-- Function creation idiom used throughout the project:
create or replace function public.<fn_name>()
returns <type>
language plpgsql
security definer
set search_path = public
as $$ ... $$;

-- Revoke from public/anon/authenticated (established in 00008):
revoke execute on function public.sync_role_to_app_metadata() from public, anon, authenticated;
```

**Custom Access Token Hook — new function pattern** (RESEARCH.md Pattern 1 / verified Supabase docs):
```sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims    jsonb;
  user_role text;
begin
  select role into user_role
    from public.profiles
   where id = (event->>'user_id')::uuid;

  claims := event->'claims';

  if jsonb_typeof(claims->'app_metadata') is null then
    claims := jsonb_set(claims, '{app_metadata}', '{}');
  end if;

  if user_role is not null then
    claims := jsonb_set(claims, '{app_metadata,role}', to_jsonb(user_role));
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Grants scoped to supabase_auth_admin (never public/anon/authenticated):
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from public, anon, authenticated;
grant select on table public.profiles to supabase_auth_admin;
```

**RLS policy drop-and-replace pattern** (`00006_rls_policies.sql` lines 68-91, 110-115):
```sql
-- Always drop before recreating (idempotent migration pattern):
drop policy if exists "bips_insert_coordinator" on public.bips;
drop policy if exists "profiles_update_own_or_admin" on public.profiles;

-- Tightened bips_insert_coordinator (add role check — D-12):
create policy "bips_insert_coordinator"
  on public.bips for insert
  to authenticated
  with check (
    (select auth.uid()) = created_by
    and (select auth.jwt() -> 'app_metadata' ->> 'role') in ('coordinator', 'admin')
  );

-- Role-stable profiles UPDATE — WITH CHECK prevents role self-escalation (D-09 / FOUN-07):
create policy "profiles_update_own_or_admin"
  on public.profiles for update
  to authenticated
  using (
    (select auth.uid()) = id
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    (
      (select auth.uid()) = id
      and role = (select role from public.profiles where id = (select auth.uid()))
    )
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
```

**JWT claim read pattern** used throughout `00006_rls_policies.sql` (lines 28, 38, 51, 142):
```sql
-- Consistent subquery form for performance (plan-cache friendly):
(select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
(select auth.uid()) = id
```

**handle_new_user trigger pattern** (needs verification per RESEARCH.md A1; if absent, create):
```sql
-- Reads raw_user_meta_data.role (set by signInWithOtp options.data) and defaults
-- to 'coordinator' if absent — preserves existing coordinator signup behavior (D-07):
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'coordinator')
  )
  on conflict (id) do nothing;  -- existing account via magic-link: never overwrite
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

---

### `supabase/config.toml` (config, —)

**Analog:** `supabase/config.toml` lines 278-281 (commented hook block)

**Existing commented block** (lines 278-281 — uncomment and fill):
```toml
# This hook runs before a token is issued and allows you to add additional claims
# based on the authentication method used.
# [auth.hook.custom_access_token]
# enabled = true
# uri = "pg-functions://<database>/<schema>/<hook_name>"
```

**Target replacement** (D-06 / RESEARCH.md Pattern 1 config.toml section):
```toml
[auth.hook.custom_access_token]
enabled = true
uri = "pg-functions://postgres/public/custom_access_token_hook"
```

Note: `postgres` is the standard Supabase local DB name (RESEARCH.md A4). Verify with `supabase status` after `supabase start`.

---

### `app/(student)/layout.tsx` (middleware/layout, request-response)

**Primary analog:** `app/(admin)/layout.tsx` (lines 1-86) — role guard without profile-complete gate.
**Secondary analog:** `app/(dashboard)/layout.tsx` (lines 1-92) — shows what NOT to include (profile-complete gate, onboarding redirect).

**Imports pattern** (`app/(admin)/layout.tsx` lines 1-4):
```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Toaster } from '@/components/ui/sonner'
// + StudentNav (new, mirrors AdminSidebar / DashboardNav structure)
```

**Auth guard + role guard pattern** (`app/(admin)/layout.tsx` lines 35-45):
```typescript
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // (1) Auth guard — defense-in-depth (middleware layer 1 already redirected unauthenticated)
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) redirect('/register/student')
  const claims = data.claims

  // (2) Role guard — mirrors admin layout pattern; defense-in-depth for layout layer
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role !== 'student') {
    redirect(role === 'admin' ? '/admin' : role === 'coordinator' ? '/dashboard' : '/register/student')
  }

  // NOTE: NO profile-complete gate here (D-08). Student profiles have university_id = NULL by design.
  // DO NOT query full_name / university_id / erasmus_code / contact_email for completeness.
```

**Layout chrome pattern** (`app/(admin)/layout.tsx` lines 67-86; EC disclaimer from both layouts):
```typescript
  return (
    <div className="min-h-screen bg-bg-soft">
      <StudentNav email={typeof claims.email === 'string' ? claims.email : ''} />
      <main className="mx-auto max-w-[1200px] px-4 md:px-6">{children}</main>
      {/* CLAUDE.md never-do: footer disclaimer on every page */}
      <p className="mx-auto max-w-[1200px] px-4 md:px-6 py-8 text-[11px] text-muted">
        Independent project — not affiliated with the European Commission
      </p>
      <Toaster position="bottom-right" richColors={false} closeButton />
    </div>
  )
}
```

---

### `app/(student)/student-dashboard/page.tsx` (RSC page, request-response)

**Analog:** `app/(dashboard)/layout.tsx` lines 66-85 (claims.email extraction pattern; Card/layout chrome).

**Claims email extraction pattern** (`app/(dashboard)/layout.tsx` lines 77-79):
```typescript
// email is on the JWT claims object — not a separate profile fetch:
const emailLocal =
  typeof claims.email === 'string' ? claims.email.split('@')[0] : null
```

**RSC page shell** (D-14 — real but minimal: greeting, Account card, Browse CTA):
```typescript
// This is a Server Component — no 'use client'. All data from getClaims() already
// resolved in the parent layout; pass via props or re-call createClient() if needed.
// Pattern: layout handles auth guard; page handles content only.
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function StudentDashboardPage() {
  // No getClaims() here — layout already validated; use layout-provided data via props
  // (or accept children pattern). Phase 5 shell is static content + CTA.
  return (
    <div className="py-24 space-y-6">
      {/* greeting header, Account card with email + sign-out form, Browse BIPs CTA */}
      {/* "Saved BIPs and alerts are coming soon" — one quiet line, no fake placeholders */}
    </div>
  )
}
```

---

### `app/(auth)/register/student/page.tsx` (RSC page, request-response)

**Primary analog:** `app/(auth)/login/page.tsx` (lines 1-33) — searchParams → error state → delegate to client form component.
**Secondary analog:** `app/(auth)/register/page.tsx` (lines 1-26) — LogoMark + form delegation pattern.

**searchParams + auth bounce pattern** (`app/(auth)/login/page.tsx` lines 5-14 + RESEARCH.md Pattern 8):
```typescript
export default async function StudentRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; step?: string }>
}) {
  const sp = await searchParams

  // Already-authenticated bounce (D-13): handled here NOT in middleware
  // (matcher excludes /register/* from middleware execution)
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (data?.claims) {
    const role = (data.claims as { app_metadata?: { role?: string } }).app_metadata?.role
    if (role === 'student') redirect('/student-dashboard')
    if (role === 'coordinator') redirect('/dashboard')
    if (role === 'admin') redirect('/admin')
  }

  // Map ?error=expired to the Alert shown in State C (UI-SPEC):
  const expiredError = sp.error === 'expired'
    ? 'Your magic link has expired. Enter your email to get a new one.'
    : undefined
```

**Section/card pattern** (`app/(auth)/register/page.tsx` lines 5-26):
```typescript
  return (
    <section className="bg-white rounded-md shadow-md p-10">
      <header className="flex flex-col items-center gap-3 mb-6">
        <LogoMark />
        <h1 className="text-[22px] font-semibold tracking-[-0.3px] text-ink">
          Sign in as a student
        </h1>
        <p className="text-center text-sm text-muted">
          Enter your email to receive a sign-in link.
        </p>
      </header>
      {/* StudentMagicLinkForm handles States A (email input), B (confirmation), C (expired Alert) */}
      <StudentMagicLinkForm expiredError={expiredError} />
    </section>
  )
}
```

---

### `lib/actions/auth.ts` (service, request-response) — MODIFY

**Analog:** existing file — `signUpAction` (lines 90-113), `signOutAction` (lines 150-155), `resendVerificationAction` (lines 128-146).

**New action: `signInWithOtpAction`** — copy shape from `signUpAction`/`resendVerificationAction`:

**File-level structure** (lines 1-27):
```typescript
'use server'
// ... existing imports unchanged ...
import { z } from 'zod'   // already imported via loginSchema etc.; no new package

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
// ^ already on line 27
```

**Zod email validation pattern** (`resendVerificationAction` lines 131-133):
```typescript
const email = String(formData.get('email') ?? '').trim().toLowerCase()
// resendVerificationAction uses a manual regex; use Zod instead (cleaner, consistent):
const result = z.string().email().safeParse(email)
if (!result.success) {
  return { error: 'Please enter a valid email address.' }
}
```

**Supabase call + error mapping pattern** (`signUpAction` lines 100-113):
```typescript
const supabase = await createClient()
const { error } = await supabase.auth.signInWithOtp({
  email: result.data,
  options: {
    shouldCreateUser: true,
    data: { role: 'student' },   // → raw_user_meta_data at creation; hook reads profiles.role
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
```

**New action: `signOutStudentAction`** — copy shape from `signOutAction` (lines 150-155), change redirect target:
```typescript
// signOutAction (lines 150-155) — existing:
export async function signOutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')              // ← coordinator lands on /login
}

// signOutStudentAction — student variant (D-15):
export async function signOutStudentAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')                   // ← student lands on home, not /login
}
```

---

### `app/auth/callback/route.ts` (route, request-response) — MODIFY

**Analog:** existing file (lines 1-53) — same PKCE exchange logic; add a `type=magiclink` branch.

**Existing structure** (lines 23-52 — copy verbatim, extend the `if (!code)` and `if (error)` blocks + destination switch):
```typescript
// Existing no-code guard (lines 28-31) — extend for student destination:
if (!code) {
  console.error('[auth/callback] no code in querystring')
  // NEW: student magic-link gets student-specific error page
  const errDest = type === 'magiclink'
    ? `${SITE_URL}/register/student?error=expired`
    : `${SITE_URL}/login?error=verification_failed&reason=no_code`
  return NextResponse.redirect(errDest)
}

// Existing error guard (lines 35-45) — extend:
if (error) {
  console.error('[auth/callback] exchangeCodeForSession failed:', { ... })
  const errDest = type === 'magiclink'
    ? `${SITE_URL}/register/student?error=expired`
    : `${SITE_URL}/login?error=verification_failed&reason=${reason}`
  return NextResponse.redirect(errDest)
}

// Existing destination switch (lines 48-52) — add magiclink branch:
const destination =
  type === 'recovery'    ? `${SITE_URL}/reset-password/update`
  : type === 'magiclink' ? `${SITE_URL}/student-dashboard`    // NEW (D-04)
                         : `${SITE_URL}/onboarding`
return NextResponse.redirect(destination)
```

---

### `middleware.ts` (middleware, request-response) — MODIFY

**Analog:** existing file (lines 21-80) — admin guard block (lines 45-55) is the exact structural template for the new student guard.

**Existing admin guard template** (lines 45-55):
```typescript
if (pathname.startsWith('/admin')) {
  if (!claims) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', '/admin')
    return NextResponse.redirect(loginUrl)
  }
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url))
  }
}
```

**Three changes required — insert after existing blocks, before `return response`:**

**(3a) Modify existing dashboard/onboarding guard** (lines 35-39 — add student redirect):
```typescript
if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
  if (!claims) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  // NEW: student hitting /dashboard → /student-dashboard (D-11)
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role === 'student') {
    return NextResponse.redirect(new URL('/student-dashboard', request.url))
  }
}
```

**(3d) NEW: student-dashboard guard** (insert after admin block, lines ~55):
```typescript
// (3d) Student-required: student route group.
// /student-dashboard/* IS reached by middleware (not excluded by matcher).
// Matcher comment "DO NOT modify" is preserved — no matcher change needed (D-13 / RESEARCH.md OQ-2).
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
  // role === 'student': allow through; layout.tsx provides defense-in-depth
}
```

**(3c) Modify already-authenticated bounce** (lines 61-63 — extend to route students correctly):
```typescript
if (claims && (pathname === '/login' || pathname === '/register')) {
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  return NextResponse.redirect(new URL(
    role === 'student' ? '/student-dashboard'
    : role === 'admin'  ? '/admin'
                        : '/dashboard',
    request.url
  ))
}
```

**Matcher** (line 78 — DO NOT TOUCH per in-code comment):
```typescript
// Existing matcher handles /student-dashboard/* correctly — it is NOT in the exclusion list.
// /register/student is excluded (matches 'register' in the negative lookahead).
// No matcher change required (RESEARCH.md OQ-2 confirmed).
```

---

### `lib/actions/bip-submit.ts` (service, CRUD) — MODIFY

**Analog:** existing file — `submitBipAction` lines 119-124 (getClaims + early return pattern).

**Existing auth guard at top of action** (lines 119-124 — copy, then insert role assertion immediately after):
```typescript
// Existing pattern (lines 119-124):
const supabase = await createClient()
const { data: claimsData, error: authError } = await supabase.auth.getClaims()
if (authError || !claimsData?.claims?.sub) {
  return { error: 'Your session has expired. Please sign in again.' }
}
const userId = claimsData.claims.sub

// ADD IMMEDIATELY AFTER (D-12 / FOUN-08 belt-and-suspenders):
const role = (claimsData.claims as { app_metadata?: { role?: string } })?.app_metadata?.role
if (role !== 'coordinator' && role !== 'admin') {
  return { error: 'Forbidden.' }
}
```

This mirrors the same `claimsData.claims` reference already in scope at line 124, so no additional auth call is needed.

---

### `tests/e2e/student-auth.spec.ts` (test, request-response) — NEW

**Primary analog:** `tests/e2e/auth.spec.ts` (lines 1-203) — auto-confirm helper, fixture email pattern, `request` API object, `page.goto` + role assertions.

**File header + import pattern** (`auth.spec.ts` lines 1-21):
```typescript
/**
 * Student auth golden-path spec — Phase 5 (STUD-01/02/03, FOUN-07/08).
 *
 * Covers:
 *   1. /register/student → submit email → auto-confirm OTP via admin API → /student-dashboard
 *   2. Expired magic link redirects to /register/student?error=expired; Alert renders
 *   3. Session persists across browser restart (cookie storage-state)
 *   4. Authenticated student visiting /dashboard is redirected to /student-dashboard
 *   5. Student JWT cannot insert a bips row (RLS blocks with permission error)
 *   6. profiles_update_own_or_admin WITH CHECK prevents student role self-escalation
 *   7. Unauthenticated user visiting /student-dashboard redirects to /register/student
 *   8. Student sign-out redirects to / (not /login)
 */
import { test, expect } from '@playwright/test'
```

**Auto-confirm via admin API** (`auth.spec.ts` lines 42-81 — copy verbatim, adapt for OTP magic-link):
```typescript
// Supabase admin API: find user by email, then confirm email_confirm:true
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing')
}

const userListResp = await request.get(
  `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
  { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
)
// ... (exact pattern from auth.spec.ts lines 52-81)
```

**Magic-link OTP confirm strategy:** Unlike password-based auth, magic-link OTP requires generating and following the actual link. For local Supabase, Inbucket is available (`config.toml` line 100 confirms enabled). The test can:
- Option A: Use Supabase admin API `generateLink` endpoint to get the OTP link directly (no email needed).
- Option B: Use Inbucket HTTP API to fetch the link from the local email inbox.
- Recommended: Admin API `generate_link` (`POST /auth/v1/admin/generate_link`) with `type: 'magiclink'` — follows the same admin-API pattern as `auth.spec.ts`'s user confirmation step.

**Fixture email constant pattern** (`auth.spec.ts` line 23):
```typescript
// auth.spec.ts uses: `e2e-throwaway-${Date.now()}@biphub.test` for ephemeral
// Student fixture uses a stable email from seed.e2e.sql:
const STUDENT_EMAIL = 'e2e-student@biphub.test'
```

**Role redirect assertion pattern** (`auth.spec.ts` lines 107-113):
```typescript
// Follow the page.waitForURL pattern established in auth.spec.ts:
await page.waitForURL(/\/student-dashboard/, { timeout: 10_000 })
await expect(page).toHaveURL(/student-dashboard/)
```

---

### `supabase/seed.e2e.sql` (config/fixture, CRUD) — MODIFY

**Analog:** existing file — Step 1 auth.users insert (lines 59-76), Step 2 profiles insert (lines 132-141).

**auth.users insert pattern** (`seed.e2e.sql` lines 60-76 — copy column list verbatim, change values):
```sql
-- User 4: e2e-student (verified, role=student in both app_metadata and profiles)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '44444444-4444-4444-4444-444444444444',
  'authenticated', 'authenticated',
  'e2e-student@biphub.test',
  crypt('Student!Test1', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"],"role":"student"}'::jsonb,  -- defense-in-depth
  '{"role":"student"}'::jsonb,  -- raw_user_meta_data.role used by handle_new_user trigger
  now(), now(), '', '', '', ''
);
```

**profiles insert pattern** (`seed.e2e.sql` lines 132-141 — students have university_id = NULL per D-08):
```sql
-- Student profile: university_id = NULL by design (D-08 / PITFALLS Pitfall 2)
insert into public.profiles (id, role)
values ('44444444-4444-4444-4444-444444444444', 'student');
-- Note: no university_id, no erasmus_code, no full_name required for student
-- profiles_sync_role trigger fires automatically → mirrors role into raw_app_meta_data
```

**Idempotent cleanup extension** (`seed.e2e.sql` lines 45-49 — already uses `email like '%@biphub.test'`, which covers `e2e-student@biphub.test`; no change needed to cleanup block):
```sql
-- Existing cleanup (lines 45-49) already handles all @biphub.test users:
delete from public.profiles where id in (
  select id from auth.users where email like '%@biphub.test'
);
delete from auth.users where email like '%@biphub.test';
```

---

## Shared Patterns

### Authentication: `getClaims()` — Never `getSession()`

**Source:** `middleware.ts` line 26, `app/(dashboard)/layout.tsx` line 41, `app/(admin)/layout.tsx` line 38, `lib/actions/auth.ts` line 66
**Apply to:** ALL new server-side files: `(student)/layout.tsx`, `register/student/page.tsx`, `signInWithOtpAction`

```typescript
// Correct pattern (every server context):
const { data, error } = await supabase.auth.getClaims()
if (error || !data?.claims?.sub) redirect('/register/student')
const claims = data.claims

// Extract role:
const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
```

### Supabase Client Factory: `await createClient()`

**Source:** `lib/actions/auth.ts` line 44, `app/(dashboard)/layout.tsx` line 38, `app/(admin)/layout.tsx` line 35
**Apply to:** All new Server Actions and RSC layouts

```typescript
// Must await — cookies() is async in Next.js 15 (CLAUDE.md never-do):
const supabase = await createClient()
```

### Error Handling: Return `{ error }` from Actions, Never Throw

**Source:** `lib/actions/auth.ts` lines 58-59, 112-113; `lib/actions/bip-submit.ts` lines 121-123
**Apply to:** `signInWithOtpAction`, `signOutStudentAction`

```typescript
// Success: return { success: true } or void (for redirecting actions)
// Failure: return { error: 'Human-readable message.' }
// Redirect: call redirect() directly — it throws internally, never returns
```

### RLS Policy Pattern: USING + WITH CHECK, Subquery Form

**Source:** `supabase/migrations/00006_rls_policies.sql` lines 31-91
**Apply to:** All new policies in `00015_student_role.sql`

```sql
-- Always use subquery form for performance (plan-cache friendly):
(select auth.uid()) = id
(select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'

-- Every UPDATE policy must have BOTH USING and WITH CHECK (CLAUDE.md never-do):
using ( ... )
with check ( ... )
```

### EC Footer Disclaimer: Every Layout

**Source:** `app/(dashboard)/layout.tsx` line 86, `app/(admin)/layout.tsx` line 79
**Apply to:** `app/(student)/layout.tsx`

```typescript
<p className="mx-auto max-w-[1200px] px-4 md:px-6 py-8 text-[11px] text-muted">
  Independent project — not affiliated with the European Commission
</p>
```

### SITE_URL for emailRedirectTo

**Source:** `lib/actions/auth.ts` line 27, `app/auth/callback/route.ts` line 21
**Apply to:** `signInWithOtpAction` in `lib/actions/auth.ts`

```typescript
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
// Already defined at module scope in lib/actions/auth.ts — do not redeclare; reuse.
```

---

## No Analog Found

All files have close analogs in the codebase. No file requires inventing patterns from scratch.

---

## Key Decisions Recorded for Planner

| Decision | File | Locked Invariant |
|---|---|---|
| Matcher NOT modified (D-13) | `middleware.ts` | `/register/student` excluded by existing `register` rule; `/student-dashboard` runs through middleware — new guard (3d) handles it |
| No profile-complete gate for students (D-08) | `(student)/layout.tsx` | Do NOT query university_id/erasmus_code/full_name; no onboarding redirect |
| `handle_new_user` trigger on `auth.users` | `00015_student_role.sql` | Must verify it doesn't already exist (RESEARCH.md OQ-1); if absent, create it; preserves coordinator default |
| Student sign-out → `/` not `/login` (D-15) | `lib/actions/auth.ts` | New export `signOutStudentAction` with `redirect('/')` |
| Hook function `stable` not `volatile` | `00015_student_role.sql` | `STABLE` is correct — function reads but does not modify the DB |

---

## Metadata

**Analog search scope:** `middleware.ts`, `lib/actions/`, `app/(auth)/`, `app/(dashboard)/`, `app/(admin)/`, `supabase/migrations/`, `supabase/seed.e2e.sql`, `supabase/config.toml`, `tests/e2e/`
**Files scanned:** 15 source files read
**Pattern extraction date:** 2026-06-15
