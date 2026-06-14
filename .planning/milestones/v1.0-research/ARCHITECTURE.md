# Architecture Research

**Domain:** Full-stack web application — public BIP discovery + university coordinator dashboard + admin panel
**Researched:** 2026-05-08
**Confidence:** HIGH (Next.js 15 App Router + Supabase SSR patterns verified against official docs and Context7)

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                        VERCEL EDGE / CDN                              │
│  Static assets, ISR-cached pages, middleware execution                │
├──────────────────────────────────────────────────────────────────────┤
│                      NEXT.JS 15 APP ROUTER                            │
│                                                                       │
│  ┌───────────────┐  ┌──────────────┐  ┌───────────┐  ┌───────────┐  │
│  │  (public)     │  │   (auth)     │  │(dashboard)│  │  (admin)  │  │
│  │ RSC pages     │  │ RSC pages    │  │ RSC pages │  │ RSC pages │  │
│  │ SSG/ISR       │  │ no layout    │  │ auth guard│  │ role guard│  │
│  └───────┬───────┘  └──────┬───────┘  └─────┬─────┘  └─────┬─────┘  │
│          │                 │                 │               │        │
│  ┌───────┴─────────────────┴─────────────────┴───────────────┴──────┐ │
│  │               middleware.ts (edge)                                │ │
│  │  Cookie refresh · Session validation · Route guard               │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                    Server Actions (app/actions/)                │  │
│  │  saveBipDraft · submitBip · approveBip · rejectBip             │  │
│  └────────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────┤
│                         SUPABASE                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐  │
│  │  Postgres DB │  │  Auth        │  │  Storage   │  │  RLS      │  │
│  │  bips        │  │  email+verify│  │  (v2 only) │  │  policies │  │
│  │  universities│  │  JWT claims  │  │            │  │           │  │
│  │  profiles    │  │  app_metadata│  │            │  │           │  │
│  └──────────────┘  └──────────────┘  └────────────┘  └───────────┘  │
├──────────────────────────────────────────────────────────────────────┤
│                    EXTERNAL SERVICES                                  │
│  ┌──────────────┐                                                     │
│  │    Resend    │  Transactional email: verification, approval, etc.  │
│  └──────────────┘                                                     │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `middleware.ts` | Refresh Supabase auth token on every request, protect `/dashboard` and `/admin` routes | `createServerClient` with cookie read/write, `supabase.auth.getClaims()` |
| RSC page components | Data fetching from Supabase server-side, pass props to client components | `async function Page()` with `createServerClient` |
| Client components | Interactivity, map rendering, form wizard UI state, Framer Motion animations | `'use client'`, `createBrowserClient` |
| Server Actions | Mutations: draft save, form submit, approve/reject | `'use server'` functions calling `createServerClient` |
| `lib/supabase/server.ts` | Factory for server-side Supabase client (RSC + Actions + Route Handlers) | `createServerClient` with `cookies()` from `next/headers` |
| `lib/supabase/client.ts` | Factory for browser Supabase client (Client Components) | `createBrowserClient` singleton |
| `lib/supabase/middleware.ts` | Factory for middleware Supabase client | `createServerClient` with `request`/`response` cookies |

---

## Route Group Structure

### Canonical Layout Hierarchy

The proposed four-group structure from CONTEXT.md is correct and validated. Use a **single shared root layout** at `app/layout.tsx` — do not use multiple root layouts (that would cause full page reloads on navigation between groups). Each group gets its own nested layout only for group-specific chrome.

```
app/
├── layout.tsx                        ← Root layout: <html>, <body>, global fonts, Tailwind base
│                                       RSC. No auth check here.
│
├── (public)/
│   ├── layout.tsx                    ← Public layout: StickyNav + Footer
│   │                                   RSC. Fetches stat counts (BIPs, universities, countries)
│   │                                   for nav/footer if needed — cache with React.cache()
│   ├── page.tsx                      ← Homepage. RSC. Fetches: recent BIPs, stats, category counts.
│   │                                   Passes bip counts per country to <EuropeMap /> as props.
│   ├── bips/
│   │   └── page.tsx                  ← BIP listing. RSC shell + URL-driven searchParams.
│   │                                   Passes initial data; client handles filter UI state.
│   ├── bip/
│   │   └── [slug]/
│   │       └── page.tsx              ← BIP detail. RSC. generateMetadata + generateStaticParams.
│   └── what-is-a-bip/
│       └── page.tsx                  ← Static explainer. RSC. generateStaticParams at build.
│
├── (auth)/
│   ├── layout.tsx                    ← Auth layout: centered card, no nav/footer
│   │                                   RSC. Minimal chrome — just wraps children in a centered div.
│   ├── login/
│   │   └── page.tsx                  ← RSC shell. Form is 'use client' component.
│   ├── register/
│   │   └── page.tsx                  ← RSC shell. Form is 'use client' component.
│   └── verify-email/
│       └── page.tsx                  ← RSC. Handles Supabase email verification callback.
│
├── (dashboard)/
│   ├── layout.tsx                    ← Dashboard layout: sidebar nav + top bar
│   │                                   RSC. Fetches current user profile (cached). Auth guard:
│   │                                   redirect to /login if no session.
│   └── dashboard/
│       ├── page.tsx                  ← Coordinator overview. RSC. Fetches own BIPs list.
│       └── bips/
│           ├── new/
│           │   └── page.tsx          ← RSC shell. Wizard is 'use client' with Server Actions.
│           └── [id]/
│               └── edit/
│                   └── page.tsx      ← RSC. Fetches BIP by id (owns check in RLS). Wizard reuse.
│
└── (admin)/
    ├── layout.tsx                    ← Admin layout: admin sidebar, role guard
    │                                   RSC. Fetches user profile, checks role === 'admin',
    │                                   redirects to / if not admin. Separate from dashboard layout.
    └── admin/
        ├── page.tsx                  ← Review queue. RSC. Fetches pending BIPs.
        └── bips/
            └── [id]/
                └── review/
                    └── page.tsx      ← RSC. Fetches single BIP. Approve/reject via Server Actions.
```

### Layout Inheritance Rules

- `app/layout.tsx` — owns `<html lang="en">`, `<body>`, Inter font import, global Tailwind. No auth check. No nav.
- `(public)/layout.tsx` — wraps children with `<StickyNav>` + `<Footer>`. StickyNav is a Client Component (needs `usePathname` for active state, `useState` for scroll effect).
- `(auth)/layout.tsx` — minimal: `<main className="min-h-screen grid place-items-center">`. No nav.
- `(dashboard)/layout.tsx` — auth guard (server-side redirect), dashboard chrome, user context passed via props.
- `(admin)/layout.tsx` — auth guard + role guard (both server-side), admin chrome.

**Why one root layout, not four:** Navigating between multiple root layouts in Next.js causes a full page reload (Next.js 16.x docs confirmed this caveat). A single `app/layout.tsx` with group-specific nested layouts avoids this at zero cost.

---

## Supabase RLS Policies

### Policy Design Principles

- Use `auth.uid()` for user identity checks (subquery form `(select auth.uid())` for performance).
- Use `app_metadata` — not `user_metadata` — for the `admin` role flag. `app_metadata` cannot be self-modified by users.
- Store role in the `profiles.role` column AND mirror it in `app_metadata.role` via a Postgres trigger so RLS can read it from the JWT without a DB roundtrip.
- Enable RLS on all tables. Default deny (no policy = no access).

### `universities` Table

```sql
-- Anyone can read universities (used in search, partner list display)
create policy "universities_select_public"
  on universities for select
  to anon, authenticated
  using (true);

-- Only admins can insert/update/delete universities directly
-- Coordinators get a university associated via profile on registration
create policy "universities_insert_admin"
  on universities for insert
  to authenticated
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "universities_update_admin"
  on universities for update
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

create policy "universities_delete_admin"
  on universities for delete
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
```

### `profiles` Table

```sql
-- Users can read their own profile; admins read all
create policy "profiles_select_own_or_admin"
  on profiles for select
  to authenticated
  using (
    (select auth.uid()) = id
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Users insert their own profile only (created on signup via trigger ideally)
create policy "profiles_insert_own"
  on profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

-- Users update their own profile; admins update any
create policy "profiles_update_own_or_admin"
  on profiles for update
  to authenticated
  using (
    (select auth.uid()) = id
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    (select auth.uid()) = id
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- No profile deletion in v1 (admin can via service role if needed)
```

### `bips` Table

```sql
-- Public (anon + authenticated) can only read approved BIPs
create policy "bips_select_approved_public"
  on bips for select
  to anon
  using (status = 'approved');

-- Authenticated users: see approved BIPs + their own BIPs (any status)
create policy "bips_select_own_or_approved"
  on bips for select
  to authenticated
  using (
    status = 'approved'
    or (select auth.uid()) = created_by
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Coordinators can insert BIPs assigned to themselves
create policy "bips_insert_coordinator"
  on bips for insert
  to authenticated
  with check (
    (select auth.uid()) = created_by
    and (select auth.jwt() -> 'app_metadata' ->> 'role') != 'admin'
  );

-- Coordinators can update their own BIPs only if draft or pending
-- (not approved/rejected — must go through admin to re-open)
create policy "bips_update_own_draft_or_pending"
  on bips for update
  to authenticated
  using (
    (select auth.uid()) = created_by
    and status in ('draft', 'pending')
  )
  with check (
    (select auth.uid()) = created_by
    -- Coordinators cannot self-approve: block status elevation beyond 'pending'
    and status in ('draft', 'pending')
  );

-- Admins can update any BIP (approve, reject, edit)
create policy "bips_update_admin"
  on bips for update
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Coordinators can delete their own drafts only
create policy "bips_delete_own_draft"
  on bips for delete
  to authenticated
  using (
    (select auth.uid()) = created_by
    and status = 'draft'
  );

-- Admins can delete any BIP
create policy "bips_delete_admin"
  on bips for delete
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
```

### `bip_partner_universities` Table

```sql
-- Anyone can read partner associations (used in BIP detail page)
create policy "bip_partners_select_public"
  on bip_partner_universities for select
  to anon, authenticated
  using (
    exists (
      select 1 from bips
      where bips.id = bip_partner_universities.bip_id
      and bips.status = 'approved'
    )
  );

-- Coordinators can read their own BIP's partners regardless of status
create policy "bip_partners_select_own"
  on bip_partner_universities for select
  to authenticated
  using (
    exists (
      select 1 from bips
      where bips.id = bip_partner_universities.bip_id
      and (
        bips.created_by = (select auth.uid())
        or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      )
    )
  );

-- Coordinators can insert partners for their own BIPs
create policy "bip_partners_insert_own"
  on bip_partner_universities for insert
  to authenticated
  with check (
    exists (
      select 1 from bips
      where bips.id = bip_partner_universities.bip_id
      and bips.created_by = (select auth.uid())
    )
  );

-- Coordinators can delete partners from their own BIPs
create policy "bip_partners_delete_own"
  on bip_partner_universities for delete
  to authenticated
  using (
    exists (
      select 1 from bips
      where bips.id = bip_partner_universities.bip_id
      and bips.created_by = (select auth.uid())
    )
  );

-- Admins can manage all partner associations
create policy "bip_partners_admin"
  on bip_partner_universities for all
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
```

### RLS Role Implementation Note

Set `app_metadata.role` when promoting a user to admin using the Supabase service role client (never the anon client). The JWT is stale until the user refreshes their token (next session or forced refresh). In Server Actions that check admin status, also query the `profiles` table as a fallback — belt-and-suspenders for the JWT staleness window.

---

## Server vs. Client Boundary — Per Page

| Page / Component | RSC or Client | Data Source | Notes |
|---|---|---|---|
| `(public)/page.tsx` (Homepage) | **RSC** | `createServerClient` → Supabase | Fetches: recent 3 BIPs, BIP count by country, category counts, stat totals. Passes as props. |
| `<StickyNav>` | **Client** | Props from RSC parent | Needs `useState` (scroll class), `usePathname` (active links). |
| `<EuropeMap>` | **Client** | Props: `countsByCountry: Record<string, number>` passed from Homepage RSC | react-simple-maps requires browser SVG; Framer Motion for hover. RSC parent pre-computes the counts. |
| `<CategoriesBar>` | **Client** | Props from Homepage RSC | Interactive hover states; Framer Motion. Data (counts per category) passed from RSC. |
| `<StatsSection>` | **Client** | Props from Homepage RSC | Needs Intersection Observer for count-up animation. Framer Motion. |
| `<RecentBips>` | **RSC** | Rendered in RSC parent, passed as JSX | Static cards at render time; no interactivity needed in this section. |
| `<Footer>` | **RSC** | Static | No interactivity. |
| `(public)/bips/page.tsx` | **RSC shell** | `createServerClient` for initial data | Reads `searchParams` for initial filter state. Passes initial BIP list as props. |
| `<BipFilters>` | **Client** | URL via `useSearchParams` + `useRouter` | Filter state lives in URL. Client component manages the URL updates. |
| `<BipGrid>` | **Client** (in filter context) | Client-fetches on filter change via Supabase browser client | After initial RSC render, subsequent filter changes fetch client-side for instant feedback. No Server Action needed — read-only. |
| `(public)/bip/[slug]/page.tsx` | **RSC** | `createServerClient`, `generateStaticParams` | Full BIP + host + partners query. `generateMetadata` for SEO. ISR: `revalidate = 3600` or on-demand. |
| `(public)/what-is-a-bip/page.tsx` | **RSC** | Static content | `export const dynamic = 'force-static'` — never needs DB. |
| `(auth)/login/page.tsx` | **RSC shell** | — | Shell only. |
| `<LoginForm>` | **Client** | Server Action: `signIn(formData)` | React Hook Form + Zod client validation. Server Action handles Supabase `signInWithPassword`. |
| `(auth)/register/page.tsx` | **RSC shell** | — | Shell only. |
| `<RegisterForm>` | **Client** | Server Action: `signUp(formData)` | Multi-field form. Server Action creates Supabase user + profile row. |
| `(auth)/verify-email/page.tsx` | **RSC** | URL hash handled by Supabase JS | Supabase sends user to this page after email click. RSC reads the token, exchanges it. Redirect to dashboard. |
| `(dashboard)/dashboard/page.tsx` | **RSC** | `createServerClient` | Fetches coordinator's BIPs list. Auth guard in `(dashboard)/layout.tsx`. |
| `(dashboard)/dashboard/bips/new/page.tsx` | **RSC shell** | — | Shell fetches university list for autocomplete. Passes as props to wizard. |
| `<BipSubmissionWizard>` | **Client** | Server Actions for mutations | See Submission Wizard section below. |
| `(dashboard)/dashboard/bips/[id]/edit/page.tsx` | **RSC** | `createServerClient` | Fetches existing BIP (RLS enforces ownership). Passes draft data to wizard. |
| `(admin)/admin/page.tsx` | **RSC** | `createServerClient` | Fetches pending BIPs. Role guard in `(admin)/layout.tsx`. |
| `(admin)/admin/bips/[id]/review/page.tsx` | **RSC** | `createServerClient` | Fetches full BIP detail. Approve/reject buttons call Server Actions. |

---

## Auth Flow: Email Signup + Verification

### Middleware Pattern (`middleware.ts`)

```typescript
// middleware.ts — runs at Edge on every request
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          // Write to both request (for Server Components this request)
          // and response (for browser on next request)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // CRITICAL: Always use getClaims(), never getSession(), in middleware.
  // getClaims() validates the JWT signature; getSession() trusts cookies blindly.
  const { data: { user } } = await supabase.auth.getClaims()

  const { pathname } = request.nextUrl

  // Route guard: dashboard requires auth
  if (pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Route guard: admin requires auth + admin role
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const role = user.app_metadata?.role
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Redirect logged-in users away from auth pages
  if ((pathname.startsWith('/login') || pathname.startsWith('/register')) && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Run middleware on all paths except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Server Client Factory (`lib/supabase/server.ts`)

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components cannot write cookies directly.
            // Middleware handles the actual cookie writes on the next request.
          }
        },
      },
    }
  )
}
```

### Browser Client Factory (`lib/supabase/client.ts`)

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // createBrowserClient is a singleton — safe to call multiple times
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Auth Flow Sequence

```
[User: /register]
  → <RegisterForm> (Client) validates with Zod
  → calls Server Action: signUp(formData)
  → Server Action: createServerClient().auth.signUp({ email, password })
  → Supabase sends verification email via Resend SMTP integration
  → Server Action also inserts profile row (or use DB trigger on auth.users insert)
  → redirect('/verify-email?pending=true')

[User: clicks email link]
  → Supabase redirects to /auth/callback?code=xxx
  → Route Handler: app/auth/callback/route.ts exchanges code for session
  → Sets session cookie
  → redirect('/dashboard')

[User: /login]
  → <LoginForm> (Client) calls Server Action: signIn(formData)
  → Server Action: createServerClient().auth.signInWithPassword()
  → On success: redirect('/dashboard')
  → middleware.ts refreshes token on subsequent requests

[Protected page: /dashboard]
  → middleware.ts: getClaims() → no user → redirect('/login')
  → middleware.ts: getClaims() → user exists → pass through
  → (dashboard)/layout.tsx: server-side double-check with createServerClient().auth.getClaims()
```

### Email Verification Callback Route

```typescript
// app/auth/callback/route.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(/* ... */)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }
  return NextResponse.redirect(new URL('/login?error=verification_failed', request.url))
}
```

---

## Europe Map Component

### Decision: `react-simple-maps` over raw D3

Use `react-simple-maps`. Rationale: declarative React API, works with GeoJSON directly, ships smaller than full D3 for this use case, has built-in SVG rendering with d3-geo projections under the hood. Raw D3 requires manual DOM manipulation that fights React's reconciler — avoid.

### Data Flow

```
(public)/page.tsx  [RSC — server]
  ↓ queries Supabase:
    SELECT country, count(*) FROM bips
    WHERE status = 'approved'
    GROUP BY country
  ↓ produces: countsByCountry = { "DE": 12, "FR": 8, "IT": 5, ... }
  ↓ passes as prop to:

<EuropeMap countsByCountry={countsByCountry} />  ['use client']
  ↓ uses react-simple-maps <ComposableMap> + <Geographies>
  ↓ maps EU GeoJSON (public/eu-countries.geojson)
  ↓ color intensity computed client-side from countsByCountry
  ↓ hover state: useState for tooltip position + hovered country
  ↓ click: router.push('/bips?country=' + countryCode)
  ↓ Framer Motion: hover fill transition
```

### Hydration Strategy

`<EuropeMap>` is a Client Component with `'use client'`. It receives all data it needs as props from the RSC parent — no client-side fetch required. This means:

- The map SVG renders on the server (SSR) using the static prop data.
- React hydrates it in the browser with the same data.
- No hydration mismatch because the data (BIP counts) is the same on both sides.
- Tooltip and hover state initialise as empty — those only exist client-side after hydration.

**Do not** fetch BIP counts client-side inside `<EuropeMap>`. That would cause a loading flash and duplicate the query.

### Accessibility Fallback

Render a visually-hidden `<ul>` with countries and BIP counts alongside the SVG map. Screen readers get the list; sighted users get the map. The `<ComposableMap>` SVG gets `role="img"` and an `aria-label`.

---

## Submission Wizard

### Architecture Decision: Server Actions for All Mutations

Use Server Actions (not direct Supabase browser client) for the wizard's save and submit operations. Rationale:

- Server Actions run with `createServerClient` → session is validated server-side → RLS applies.
- Zod validation happens server-side — cannot be bypassed by client manipulation.
- No API route to maintain.
- `useActionState` (React 19 / Next.js 15) gives built-in pending + error state.

Direct Supabase browser client mutations would bypass server-side Zod validation and would require the anon key to have write access — a worse security posture than Server Actions.

### Wizard State Architecture

```
<BipSubmissionWizard> [Client Component]
  ↓ uses:
    - useState for currentStep (1–5)
    - Zustand store (bipDraftStore) for accumulated form data across steps
    - React Hook Form per step for field-level validation + UX

  Step navigation:
    "Save & Continue" → calls saveDraftAction(stepData)
    "Submit for Review" → calls submitBipAction(fullData)
    "Back" → step-- (no server call, data already in Zustand)

Server Actions:
  saveDraftAction(data: Partial<BipFormData>): upserts to bips table
    - status remains 'draft'
    - Returns { bipId } so wizard knows the DB row ID for subsequent upserts
    - Uses ON CONFLICT (id) DO UPDATE for idempotent auto-save

  submitBipAction(bipId: string): sets status = 'pending'
    - Validates all required fields are present
    - Returns { success } or { error }
    - Triggers Resend email to admin: "New BIP pending review"
```

### Debounced Auto-Save Pattern

```typescript
// In wizard client component — auto-save on field blur, not on every keystroke
const debouncedSave = useDebouncedCallback(async (stepData) => {
  const result = await saveDraftAction(stepData)
  if (result.bipId) setBipId(result.bipId)  // persist returned ID in Zustand
}, 1000)

// Attach to React Hook Form's watch or onBlur
```

### Preview Step

Step 5 (Preview) renders `<BipCard>` and `<BipDetailPreview>` using data from the Zustand store — no DB fetch needed for preview since data is in client state.

---

## Admin Panel: Same App vs. Separate App

### Decision: Same Next.js app, `(admin)` route group

**Recommendation: Keep admin in the same app as a route group.**

Rationale:

| Criterion | Same App `(admin)` | Separate App |
|---|---|---|
| Code sharing (components, types, lib) | Free — import directly | Requires monorepo or npm package |
| Deployment complexity | Zero extra config | Second Vercel project, second env config |
| Auth/session sharing | Same Supabase project, same cookies | Needs CORS config or shared session strategy |
| Latency to admin actions | Zero — same Next.js process | Extra network hop |
| Security isolation | Route group + middleware role check + RLS | Stronger isolation but overkill for v1 |
| Maintenance burden | Low — one codebase | High — two codebases to keep in sync |

The security argument for a separate app (isolation from a breach) does not apply at this scale. The `(admin)` route group is protected at three layers: middleware (Edge, before any code runs), layout.tsx server-side role check, and Supabase RLS (admin role required for mutations). That is sufficient for v1.

A separate admin app becomes worth considering if: admin functionality grows large enough to warrant independent deployment, or a security audit explicitly recommends it. Defer.

---

## Data Flow Patterns

### Read Flow (Public BIP Browse)

```
Browser GET /bips?country=de&field=engineering
  → middleware.ts: no auth required, pass through + refresh token if present
  → (public)/bips/page.tsx [RSC]:
      const supabase = await createClient()  // server client
      const { data: bips } = await supabase
        .from('bips')
        .select('id, slug, title, ..., universities(name, country)')
        .eq('status', 'approved')
        .eq('country', searchParams.country)   // initial filter from URL
        .order('created_at', { ascending: false })
        .limit(24)
      // Render <BipGrid initialData={bips} /> as Client Component
      // <BipFilters /> as Client Component reads/writes URL
  → <BipGrid> [Client]:
      // Subsequent filter changes use createBrowserClient() + .from('bips').select()
      // RLS enforces status = 'approved' on anon reads automatically
```

### Write Flow (Coordinator Submits BIP)

```
<BipSubmissionWizard> [Client] → saveDraftAction(stepData) [Server Action]
  → Server Action:
      const supabase = await createClient()  // server client — session from cookies
      const { data: { user } } = await supabase.auth.getClaims()
      if (!user) throw new Error('Unauthorized')
      
      const validated = BipStepSchema.safeParse(stepData)
      if (!validated.success) return { error: validated.error }
      
      const { data, error } = await supabase
        .from('bips')
        .upsert({
          id: bipId ?? undefined,  // undefined = insert new
          ...validated.data,
          created_by: user.id,
          status: 'draft',
        })
        .select('id')
        .single()
      
      return { bipId: data.id }
  → RLS: bips_insert_coordinator / bips_update_own_draft_or_pending enforce ownership
```

### Admin Approve Flow

```
<ApproveButton> [Client] onClick → approveBipAction(bipId) [Server Action]
  → Server Action:
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getClaims()
      if (user?.app_metadata?.role !== 'admin') throw new Error('Forbidden')
      
      await supabase
        .from('bips')
        .update({ status: 'approved', published_at: new Date().toISOString() })
        .eq('id', bipId)
      
      // Trigger Resend email to coordinator: "Your BIP has been approved"
      await sendApprovalEmail(coordinatorEmail, bipTitle)
      
      revalidatePath('/admin')
      revalidatePath('/bips')                  // bust ISR cache for listing
      revalidatePath(`/bip/${bipSlug}`)        // bust ISR cache for detail page
  → RLS: bips_update_admin enforces this only works for admins
```

---

## ISR Strategy

Use ISR for public BIP pages, not SSG-at-build-time (too slow when BIP count grows):

| Page | Strategy | Revalidation |
|---|---|---|
| `/` (Homepage) | ISR | `revalidate = 3600` (1hr) + on-demand after BIP approval |
| `/bips` | ISR | `revalidate = 1800` (30min) + on-demand after BIP approval |
| `/bip/[slug]` | ISR | `revalidate = 3600` + on-demand after BIP update/approval |
| `/what-is-a-bip` | Static | `force-static` — never changes |

On-demand revalidation: `revalidatePath()` called inside the `approveBipAction` and `rejectBipAction` Server Actions. No webhook needed — Server Actions are the write path and can call `revalidatePath` directly.

---

## Phase 1 Vertical MVP — Minimum Architecture to Ship

Phase 1 should deliver one complete user flow end-to-end. The minimum viable architecture slice:

### What Phase 1 Builds

**The student-facing BIP discovery experience:**

1. DB schema: `universities`, `bips`, `bip_partner_universities` tables with migrations
2. RLS policies for all four tables (all of them — do not defer security)
3. Supabase local dev setup (`supabase start`)
4. Auth infrastructure: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `middleware.ts`
5. Root layout + `(public)` layout (StickyNav + Footer)
6. Homepage RSC: fetches real data; EuropeMap, CategoriesBar, StatsSection as Client Components
7. `/bips` page: RSC shell + Client filter components + URL-driven filter state
8. `/bip/[slug]` page: RSC, full detail, generateMetadata, ISR

**Seed data:** 5–10 manually inserted approved BIPs so the discovery flow is testable end-to-end.

### What Phase 1 Defers

- Auth UI (`/login`, `/register`) — deferred to Phase 2
- Coordinator dashboard — deferred to Phase 2
- Submission wizard — deferred to Phase 3
- Admin panel — deferred to Phase 4

### Why This Ordering

Students are the primary users. The public discovery flow validates the core value proposition (can students find BIPs?) before building the university-facing flows. The auth + dashboard work in Phase 2 has no value without BIPs to manage; Phase 1 makes them valuable.

Auth infrastructure (middleware, supabase lib factories) is built in Phase 1 even though auth UI comes in Phase 2. This avoids retrofitting session handling into pages built without it.

---

## Recommended Project Structure

```
app/
├── layout.tsx                        ← Root layout (RSC)
├── (public)/
│   ├── layout.tsx                    ← Public chrome: StickyNav + Footer
│   ├── page.tsx                      ← Homepage (RSC)
│   ├── bips/page.tsx                 ← BIP listing (RSC shell)
│   ├── bip/[slug]/page.tsx           ← BIP detail (RSC, ISR)
│   └── what-is-a-bip/page.tsx       ← Explainer (static RSC)
├── (auth)/
│   ├── layout.tsx                    ← Centered auth shell
│   ├── login/page.tsx
│   ├── register/page.tsx
│   └── verify-email/page.tsx
├── auth/
│   └── callback/route.ts             ← Code exchange Route Handler
├── (dashboard)/
│   ├── layout.tsx                    ← Auth guard + dashboard chrome
│   └── dashboard/
│       ├── page.tsx
│       └── bips/
│           ├── new/page.tsx
│           └── [id]/edit/page.tsx
└── (admin)/
    ├── layout.tsx                    ← Role guard + admin chrome
    └── admin/
        ├── page.tsx
        └── bips/[id]/review/page.tsx

components/
├── home/
│   ├── StickyNav.tsx                 ← 'use client' (scroll, pathname)
│   ├── Hero.tsx                      ← RSC (static)
│   ├── EuropeMap.tsx                 ← 'use client' (react-simple-maps)
│   ├── CategoriesBar.tsx             ← 'use client' (hover animations)
│   ├── StatsSection.tsx              ← 'use client' (Intersection Observer)
│   ├── RecentBips.tsx                ← RSC (data passed from page)
│   ├── HowItWorks.tsx                ← RSC (static)
│   └── Footer.tsx                    ← RSC (static)
├── bip/
│   ├── BipCard.tsx                   ← RSC (renders from props)
│   ├── BipGrid.tsx                   ← 'use client' (filter refetch)
│   ├── BipFilters.tsx                ← 'use client' (URL state)
│   └── BipDetail.tsx                 ← RSC (renders from props)
├── forms/
│   ├── BipSubmissionWizard.tsx       ← 'use client' (multi-step, Zustand)
│   ├── steps/
│   │   ├── Step1BasicInfo.tsx        ← 'use client' (React Hook Form)
│   │   ├── Step2Dates.tsx
│   │   ├── Step3Partners.tsx
│   │   ├── Step4Application.tsx
│   │   └── Step5Preview.tsx
│   ├── LoginForm.tsx                 ← 'use client'
│   └── RegisterForm.tsx              ← 'use client'
├── admin/
│   ├── ReviewQueue.tsx               ← RSC (data from page)
│   └── BipReviewPanel.tsx            ← 'use client' (approve/reject buttons)
└── ui/                               ← shadcn/ui components

lib/
├── supabase/
│   ├── server.ts                     ← createServerClient factory (RSC + Actions)
│   ├── client.ts                     ← createBrowserClient factory
│   └── middleware.ts                 ← createServerClient factory (middleware)
├── actions/
│   ├── auth.ts                       ← signIn, signUp, signOut Server Actions
│   ├── bips.ts                       ← saveDraftAction, submitBipAction
│   └── admin.ts                      ← approveBipAction, rejectBipAction
├── validations/
│   ├── bip.ts                        ← Zod schemas for BIP form steps
│   └── auth.ts                       ← Zod schemas for login/register
└── utils/
    ├── slug.ts                       ← BIP slug generation
    └── countries.ts                  ← Erasmus+ country list + codes

supabase/
├── migrations/
│   ├── 001_create_tables.sql
│   ├── 002_rls_policies.sql
│   └── 003_seed_universities.sql
└── seed.sql                          ← Dev seed data

public/
└── eu-countries.geojson              ← Erasmus+ 29 countries GeoJSON
```

---

## Architectural Patterns

### Pattern 1: RSC Passes Props to Client Components — Never Fetch in Client What RSC Can Provide

**What:** RSC fetches data server-side and passes it to Client Components as props. Client Components do not re-fetch data that RSC already has.

**When to use:** Map component, stats, recent BIPs, category counts — anything on the homepage.

**Trade-offs:** Eliminates client-side loading states for initial render. Client components feel hydrated instantly. The cost is that RSC must know what data clients need at render time.

```typescript
// CORRECT
// page.tsx [RSC]
const countsByCountry = await getApprovedBipCountsByCountry()
return <EuropeMap countsByCountry={countsByCountry} />

// WRONG
// EuropeMap.tsx ['use client']
// const [counts, setCounts] = useState({})
// useEffect(() => { supabase.from('bips')... }, [])  ← unnecessary loading flash
```

### Pattern 2: URL as Filter State for BIP Listing

**What:** BIP filters (country, field, language, dates) live in the URL via `searchParams`. The RSC page reads them for the initial render. The Client Component `<BipFilters>` uses `useRouter().push()` to update them. `<BipGrid>` re-fetches on URL change using `useSearchParams()`.

**When to use:** Any page with shareable, bookmarkable filter state.

**Trade-offs:** Shareable URLs are a product feature, not just a technical choice. The tradeoff is that `useSearchParams()` requires a Suspense boundary — wrap `<BipFilters>` in `<Suspense>`.

### Pattern 3: Server Action for All Mutations

**What:** All write operations (create, update, delete, approve) go through `'use server'` functions in `lib/actions/`. Client Components call these directly — no API routes, no fetch calls to `/api/`.

**When to use:** Everywhere a coordinator or admin writes data.

**Trade-offs:** Simpler than API routes. Server-side Zod validation cannot be bypassed. Works with progressive enhancement (forms work without JS). The cost: cannot be called from outside the Next.js app (but v1 has no public API requirement).

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Reading Session in Layouts from `getSession()`

**What people do:** Call `supabase.auth.getSession()` in layout.tsx to check if user is logged in.

**Why it's wrong:** `getSession()` reads the session from cookies without cryptographic validation. It can be spoofed. Official Supabase docs explicitly state: "Never rely on `getSession()` in server code."

**Do this instead:** Always use `supabase.auth.getClaims()` (or `getUser()` in older SDK versions) in server-side code. It validates the JWT signature.

### Anti-Pattern 2: Duplicate Root Layouts Across Route Groups

**What people do:** Create `app/(public)/layout.tsx`, `app/(auth)/layout.tsx` etc. all with `<html>` and `<body>` tags (multiple root layouts).

**Why it's wrong:** Navigating between multiple root layouts triggers a full page reload in Next.js, destroying the SPA navigation experience.

**Do this instead:** Single `app/layout.tsx` with the `<html>` and `<body>` tags. Group-level layouts only add group-specific chrome (nav, sidebar) on top.

### Anti-Pattern 3: Checking Role in Client Components for Access Control

**What people do:** `if (user.role !== 'admin') return null` in a Client Component to hide the admin panel.

**Why it's wrong:** Client Component logic is visible in the browser and can be bypassed by anyone who modifies the JS bundle. This is UI-only protection, not security.

**Do this instead:** Role check in middleware.ts (edge), in layout.tsx (server-side), and enforce with RLS policies. Client-side role checks are only for UX (hiding buttons), never for security.

### Anti-Pattern 4: Putting Supabase Service Role Key in Client Code

**What people do:** Import the service role key in a `'use client'` component or expose it as `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`.

**Why it's wrong:** The service role key bypasses all RLS. Exposing it publicly gives anyone full database access.

**Do this instead:** Service role key stays server-only (no `NEXT_PUBLIC_` prefix). Used only in trusted Server Actions or Route Handlers that require admin-level operations (e.g., promoting a user to admin).

### Anti-Pattern 5: Fetching All BIPs and Filtering Client-Side

**What people do:** `supabase.from('bips').select('*')` with no `.eq()` filters, then `Array.filter()` in JavaScript.

**Why it's wrong:** When there are 500+ BIPs, this sends a large payload over the wire and wastes compute. Supabase's Postgres is better at filtering than JavaScript arrays.

**Do this instead:** Push all filters into the Supabase query (`.eq()`, `.ilike()`, `.gte()`, `.lte()`). Only fetch the columns needed. Use pagination (`.range()`).

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|---|---|
| 0–500 BIPs (launch) | Current architecture handles comfortably. Supabase free tier is fine. ISR caches listing pages. |
| 500–5,000 BIPs | Add Postgres full-text search index on `bips(title, description)` using `tsvector`. Consider `pg_trgm` for fuzzy search. Still one Supabase instance. |
| 5,000–50,000 BIPs | Add Supabase read replica. Consider moving full-text search to Typesense or Algolia (Postgres FTS degrades at this scale). ISR stays viable. |
| 50,000+ BIPs | Unlikely for this domain (there are only ~200 active BIPs in all of Europe currently). Not worth planning for. |

### Scaling Priority Order

1. **First bottleneck:** Supabase query performance on the `/bips` page as BIP count grows. Fix: composite index on `(status, subject_area, country, application_deadline)`, tsvector index for search.
2. **Second bottleneck:** ISR revalidation storm if many BIPs are approved simultaneously. Fix: stagger `revalidatePath` calls or use background queue (Vercel Queue v2).
3. **Third bottleneck:** react-simple-maps GeoJSON load time on slow connections. Fix: serve GeoJSON from Vercel CDN (already in `/public`), consider TopoJSON (smaller file) for production.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth | `createServerClient` in middleware + RSC; `createBrowserClient` in Client Components | Token refresh handled by middleware on every request |
| Supabase Postgres | Direct SDK calls via typed client (`supabase-js` with TypeScript types generated by Supabase CLI) | Generate types with `supabase gen types typescript` |
| Resend | Server-side only — called from Server Actions (approval/rejection emails, signup verification) | Never call Resend from Client Components; API key is server-secret |
| Vercel | No special integration needed beyond `next.config.ts`. ISR works automatically. | Enable Fluid compute for Server Action latency on Vercel Pro if needed |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| RSC → Client Components | Props at render time | No context providers needed for data; use Zustand only for wizard state |
| Client Components → Server | Server Actions (mutations), Supabase browser client (reads after hydration) | Never use fetch('/api/...') when Server Actions exist |
| Server Actions → Supabase | `createServerClient` with cookie-based session | Always validate with `getClaims()` before any write |
| Middleware → Supabase | `createServerClient` with request/response cookies | Dedicated middleware factory in `lib/supabase/middleware.ts` |

---

## Sources

- [Next.js Route Groups — Official Docs (v16.2.6)](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups)
- [Next.js layout.js API Reference (v16.2.6)](https://nextjs.org/docs/app/api-reference/file-conventions/layout)
- [Supabase SSR: Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Row Level Security Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase SSR: Creating a Client](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [react-simple-maps](https://www.react-simple-maps.io/)
- Supabase community: [Role-based routing in Next.js App Router](https://github.com/vercel/next.js/discussions/81357)
- Supabase community: [Using Service Role in Next.js](https://github.com/orgs/supabase/discussions/30739)

---
*Architecture research for: BipHub — Next.js 15 + Supabase full-stack web application*
*Researched: 2026-05-08*
