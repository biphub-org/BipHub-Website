# Phase 2: Coordinator Auth + Submission — Research

**Researched:** 2026-05-09
**Domain:** Supabase Auth (PKCE email verification), Next.js 15 App Router route groups, Zustand draft store, multi-step wizard Server Actions, optimistic locking, university RLS policy decision
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 — Wizard step grouping (5 steps):** Step 1 Basic info, Step 2 Program details, Step 3 Partners, Step 4 Application info, Step 5 Preview.
- **D-02 — Auto-save strategy:** Save on step navigation + 1.5s debounce on field blur. Zustand store is source of truth during session. `Saving… / Saved` indicator in wizard header.
- **D-03 — Save failure UX:** Toast error + inline retry link. Draft data preserved in Zustand store — no input loss. Retry re-fires the Server Action.
- **D-04 — Two-tab conflict UX:** Non-destructive modal ("Draft updated in another tab — Reload to get latest, or Overwrite."). No silent data loss.
- **D-05 — Hard onboarding gate:** Profile-incomplete coordinators always redirected to `/onboarding`. Dashboard layout server component checks for complete profile row. Dashboard and wizard inaccessible until `full_name`, `university_id`, `contact_email` set.
- **D-06 — `/onboarding` route location:** Inside `(dashboard)` route group. Auth guard applies; profile-complete guard does not apply here.
- **D-07 — Post-verification redirect:** `auth/callback` exchanges PKCE code and redirects directly to `/onboarding`. No intermediate confirmation screen.
- **D-08 — University selector on `/onboarding`:** Searchable autocomplete against `universities` table. If not found, coordinator can add new row (name + country form inline — no modal, no route change).
- **D-09 — Status tabs:** All / Draft / Pending / Approved / Rejected. URL param `?status=` for shareability.
- **D-10 — Per-status card actions:** Draft: Edit + Delete. Pending: Edit + Withdraw. Approved: View public page. Rejected: View details + inline rejection reason callout.
- **D-11 — New BIP entry point:** Prominent gold `+ Submit a BIP` button in dashboard header, always visible.
- **D-12 — Auth page layout (Claude's call):** Minimal centered card layout — no StickyNav, no public Footer.
- **D-13 — Auth card background (Claude's call):** Soft `#f7f8fc` page background + white card with `shadow-md`.
- **D-14 — Coordinator dashboard nav:** Separate `<DashboardNav>` component. BipHub logo + Dashboard breadcrumb + Sign out.
- **D-15 — Public StickyNav session-aware:** RSC prop drilling from `(public)/layout.tsx` — `getClaims()` fetched server-side, `hasClaims` + `initials` passed as props to `<StickyNav>`.

### Claude's Discretion

- D-01 (wizard step grouping): defaulted to 5-step logical Erasmus+ field grouping.
- D-04 (two-tab conflict UX): defaulted to Reload/Overwrite modal — non-destructive, no silent data loss.
- D-12 (auth page layout): defaulted to minimal centered card, no public shell.
- D-13 (auth card background): defaulted to soft `#f7f8fc` + white card — consistent with Phase 1 card pattern.

### Deferred Ideas (OUT OF SCOPE)

- "Are you a coordinator? List a BIP" CTA on empty-state filter results — Phase 3 polish.
- Coordinator invite flow for unregistered partner universities (GROW-01) — v2.
- Admin "Request changes" action (GROW-03) — v2.
- Edit approved BIPs with re-review trigger (GROW-04) — v2.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Coordinator can register with institutional email and password | Supabase `signUp` with `emailRedirectTo` pointing to `/auth/callback` |
| AUTH-02 | Coordinator receives email verification link via Resend | Supabase custom SMTP using Resend credentials (smtp.resend.com:465) |
| AUTH-03 | Coordinator can log in with email and password | Supabase `signInWithPassword` Server Action + `getClaims()` guard |
| AUTH-04 | Coordinator can log out from any page | `signOut` Server Action + `revalidatePath('/','layout')` + `redirect('/login')` |
| AUTH-05 | Coordinator can reset password via email link | `resetPasswordForEmail` + `/auth/callback` with `type=recovery` |
| AUTH-06 | Session persists across browser refreshes | `@supabase/ssr` 0.5.2 cookie-based session; middleware refreshes on every request |
| AUTH-07 | Coordinator completes profile setup | `/onboarding` page with `saveProfileAction` Server Action; `profiles` table upsert |
| SUBM-01 | Multi-step wizard (not one giant form) | 5-step Zustand-backed wizard; RHF scoped per step; step state in `bipDraftStore` |
| SUBM-02 | Draft auto-saves between steps and on field blur | `saveDraftAction` on step nav + 1.5s `useDebouncedCallback` from `use-debounce` (already installed) |
| SUBM-03 | Preview step showing rendered BIP detail | Step 5 renders `<BipBody>` + `<BipSidebar>` from Phase 1 components using Zustand store data |
| SUBM-04 | All required Erasmus+ BIP fields captured | Full field set across steps 1–4; 30+ fields; see UI-SPEC wizard field contracts |
| SUBM-05 | Partner universities: free-text or registered | Multi-select `<UniversityCombobox>` with free-text fallback; unverified chip suffix applied by Server Action |
| SUBM-06 | Two-tab conflict protection via `updated_at` optimistic locking | `saveDraftAction` passes `lastKnownUpdatedAt`; Supabase `.update().eq('updated_at', lastKnown)` returns 0 rows on conflict |
| SUBM-07 | Session expiry protection via `onAuthStateChange` + localStorage | `createBrowserClient().auth.onAuthStateChange` in wizard `useEffect`; localStorage key `biphub:draft` |
| SUBM-08 | Submitted BIPs enter pending review queue with status `pending` | `submitBipAction` sets `status = 'pending'`; RLS `bips_update_own_draft_or_pending` allows this |
| DASH-01 | Coordinator dashboard at `/dashboard` | `(dashboard)/dashboard/page.tsx` RSC; auth guard in layout |
| DASH-02 | BIPs listed with status | `<DashboardBipList>` with shadcn Tabs; `<DashboardBipCard>` with status badge |
| DASH-03 | Edit BIPs in draft status | `Edit` button → `/dashboard/bips/[id]/edit`; wizard pre-populated from DB |
| DASH-04 | Edit BIPs in pending status | Same edit route; RLS `bips_update_own_draft_or_pending` covers pending too |
| DASH-05 | Rejection reason shown on rejected BIPs | `<DashboardBipCard>` renders rejection reason callout inline (gold left-border) |
| DASH-06 | Start new BIP submission from dashboard | `+ Submit a BIP` button → `/dashboard/bips/new` |

</phase_requirements>

---

## Summary

Phase 2 builds three interconnected surfaces: coordinator authentication (register/login/verify/reset), a profile onboarding gate, and the BIP submission pipeline (5-step wizard + auto-save + draft dashboard). All are self-contained within the Next.js 15 App Router route-group model established in Phase 1.

The auth flow uses Supabase's PKCE email verification, delivered via Resend configured as custom SMTP in the Supabase dashboard. The `/auth/callback` route handler exchanges the PKCE code, sets the session cookie, and redirects to `/onboarding`. The `(dashboard)` layout.tsx applies a two-gate server-side guard: unauthenticated users go to `/login`, profile-incomplete users go to `/onboarding`.

The wizard is a `'use client'` component backed by a Zustand store (`bipDraftStore`) modelled directly after the Phase 1 `bookmarks.ts` pattern. Auto-save uses the `use-debounce` package (already installed as `10.0.4`) via `useDebouncedCallback`. Optimistic locking uses a Supabase `.update()` with an `updated_at` equality filter — if the filter matches 0 rows, a conflict modal fires. Session expiry is handled by `onAuthStateChange` (`SIGNED_OUT` event) with localStorage backup at `biphub:draft`.

The critical open decision from CONTEXT.md — the `universities_insert_admin` RLS policy blocking coordinator self-registration — is resolved below: **use a service-role Server Action with server-side validation** rather than relaxing the policy to `authenticated`. This maintains tighter RLS posture and isolates the trust boundary to a single, auditable code path.

**Primary recommendation:** Implement Phase 2 in this layer order: (1) auth pages + middleware redirects, (2) `/onboarding` with the university insert service-role decision, (3) wizard with Zustand draft store, (4) dashboard with status tabs, (5) StickyNav session awareness.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auth session cookie refresh | Edge Middleware | — | Existing `createMiddlewareClient` in `lib/supabase/middleware.ts`; must run before any route logic |
| Auth route guards (`/dashboard → /login`) | Edge Middleware | Dashboard RSC layout (double-check) | Defense-in-depth per ARCHITECTURE.md; middleware is first, layout is second |
| PKCE code exchange | Route Handler (`app/auth/callback/route.ts`) | — | Must be a Route Handler (GET), not RSC — needs to set cookies and redirect |
| Auth mutations (signUp, signIn, signOut, resetPassword) | Server Actions (`lib/actions/auth.ts`) | — | No API routes; Server Actions for all mutations (locked decision from Phase 1) |
| Profile completeness gate | RSC Layout (`(dashboard)/layout.tsx`) | — | Server-side redirect before any dashboard content renders |
| University search autocomplete | Client Component (`UniversityCombobox`) | RSC parent passes initial list | shadcn Command + Popover; debounced server search via Route Handler or Server Action |
| University self-registration insert | Service-role Server Action (`saveProfileAction`) | — | Isolated bypass of `universities_insert_admin` with server-side validation |
| BIP wizard form state | Client Component (`BipSubmissionWizard`) + Zustand | localStorage backup | Zustand `bipDraftStore` per bookmarks.ts pattern |
| BIP draft persistence | Server Action (`saveDraftAction`) | — | Supabase `.upsert()` with `updated_at` guard |
| Session expiry detection | Client Component (`BipSubmissionWizard` useEffect) | — | `createBrowserClient().auth.onAuthStateChange` + localStorage |
| StickyNav session awareness | RSC Layout (`(public)/layout.tsx`) | — | `getClaims()` server-side; props drilled to `<StickyNav>` to avoid client flash |
| Dashboard BIP list | RSC page + Client Component for tabs | — | RSC fetches all coordinator BIPs; Tabs component filters client-side |

---

## Standard Stack

### Core (No New Installs)

Everything Phase 2 needs is already installed. Confirmed from `package.json`:

| Library | Version | Purpose | Phase 2 Role |
|---------|---------|---------|--------------|
| `@supabase/ssr` | `0.5.2` (exact pin) | SSR auth, cookie management | `auth/callback` PKCE exchange, `createClient()` in Server Actions |
| `@supabase/supabase-js` | `^2.105.4` | Supabase JS client | `createBrowserClient()` for `onAuthStateChange` in wizard |
| `react-hook-form` | `^7.75.0` | Form state per wizard step | RHF `useForm` scoped to each step schema |
| `zod` | `^3.25.76` | Validation schemas | Step schemas, auth schemas, profile schema |
| `@hookform/resolvers` | `^3.10.0` | RHF + Zod bridge | `zodResolver()` in all form components |
| `zustand` | `^5.0.13` | Draft store | `bipDraftStore` for wizard state; already used for bookmarks |
| `use-debounce` | `10.0.4` | Auto-save debounce | `useDebouncedCallback` for 1.5s field-blur auto-save trigger |
| `sonner` | `^2.0.7` | Toast notifications | Save failure, post-submit, session expiry toasts |
| `motion` | `^12.38.0` | Animations | Step transitions, conditional field reveal, chip animations |
| `lucide-react` | `^1.14.0` | Icons | Loader2 spinner, eye/eye-off password toggle, x dismiss |

[VERIFIED: `package.json` in project root — all packages listed above are installed]

### New shadcn Components to Install

The following shadcn components are **not yet installed** (confirmed by reading `components/ui/`):

| Component | `npx shadcn add` | Phase 2 Usage |
|-----------|-----------------|---------------|
| `input` | `npx shadcn add input` | All text fields across auth + wizard |
| `textarea` | `npx shadcn add textarea` | Description, learning outcomes, eligibility notes |
| `form` | `npx shadcn add form` | RHF wrapper (FormField, FormItem, FormLabel, FormMessage) |
| `label` | `npx shadcn add label` | Standalone labels where shadcn Form is not used |
| `checkbox` | `npx shadcn add checkbox` | Study levels (wizard step 2) |
| `switch` | `npx shadcn add switch` | Green travel + inclusion support toggles (step 4) |
| `tabs` | `npx shadcn add tabs` | Dashboard status tabs |
| `badge` | `npx shadcn add badge` | Status badges on `DashboardBipCard`, count badges on tabs |
| `dialog` | `npx shadcn add dialog` | Two-tab conflict modal, delete/withdraw confirmations |
| `popover` | `npx shadcn add popover` | University combobox dropdown anchor |
| `command` | `npx shadcn add command` | University search list inside Popover |
| `separator` | `npx shadcn add separator` | Visual dividers in forms and cards |
| `alert` | `npx shadcn add alert` | Inline form-level error and save-failure state |
| `progress` | optional — omit per UI-SPEC open issue 3 | Step dots preferred over progress bar |
| `tooltip` | optional — only if field labels need help text | Skip for now |

**Already installed:** `accordion`, `button`, `calendar`, `drawer`, `select`, `sheet`, `skeleton`, `slider`, `sonner`

[VERIFIED: `components/ui/` directory listing — only the components listed above are installed]

**Install command:**
```bash
npx shadcn add input textarea form label checkbox switch tabs badge dialog popover command separator alert
```

### New Combobox API (shadcn CLI v4)

The shadcn CLI v4 (installed as `shadcn@^4.7.0`) ships a new `Combobox` component built on Base UI (not old CMDK). The university search combobox uses these sub-components:

```tsx
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  // For multi-select (wizard step 3):
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxValue,
} from "@/components/ui/combobox"
```

Multi-select variant uses `multiple` prop + `value: string[]` + `onValueChange`.

[CITED: ui.shadcn.com/docs/components/combobox — Combobox and multi-select examples verified]

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (coordinator)
    │
    ├── GET /login, /register         ── (auth) layout.tsx ── centered card, no chrome
    │       │
    │       └── <LoginForm> / <RegisterForm>  ['use client']
    │               │ Server Action
    │               ▼
    │           lib/actions/auth.ts
    │           signIn / signUp / resetPasswordForEmail
    │               │ Supabase Auth
    │               ▼
    │           Supabase Auth + Resend SMTP
    │               │ verification email
    │               ▼
    │           /auth/callback?code=xxx  [Route Handler — GET]
    │               │ exchangeCodeForSession → set cookie
    │               ▼
    │           redirect → /onboarding
    │
    ├── GET /onboarding               ── (dashboard) layout.tsx (auth guard only)
    │       │
    │       └── <OnboardingForm> ['use client']
    │               │ Server Action
    │               ▼
    │           lib/actions/profile.ts
    │           saveProfileAction
    │               ├── createClient() [RLS respecting] — profile upsert
    │               └── createAdminClient() [service-role] — university insert (if new)
    │               │
    │               ▼
    │           redirect → /dashboard
    │
    ├── GET /dashboard                ── (dashboard) layout.tsx (auth + profile guard)
    │       │
    │       ├── <DashboardNav> RSC — getClaims() for initials
    │       │
    │       └── (dashboard)/dashboard/page.tsx RSC
    │               │ createServerClient().from('bips').select(...)
    │               │ → filter by created_by = auth.uid()
    │               ▼
    │           <DashboardBipList> ['use client']
    │               │ shadcn Tabs — ?status= URL param
    │               ▼
    │           <DashboardBipCard>[] — per-status action buttons
    │                   │ Server Actions on click
    │                   ▼
    │               deleteDraftAction / withdrawBipAction
    │
    └── GET /dashboard/bips/new       ── RSC shell — fetches universities list
            │
            └── <BipSubmissionWizard> ['use client']
                    │ Zustand bipDraftStore
                    │ RHF per step (Zod v3 schemas)
                    │
                    ├── onFieldBlur (1.5s debounce via useDebouncedCallback)
                    │       │ saveDraftAction (Server Action)
                    │       ▼  updated_at guard → conflict modal if 0 rows updated
                    │   Supabase bips table (INSERT or UPDATE)
                    │
                    ├── onAuthStateChange SIGNED_OUT
                    │       │ save Zustand → localStorage["biphub:draft"]
                    │       └── redirect /login?redirect=/dashboard/bips/new
                    │
                    └── Step 5 Preview — reads Zustand store
                            │ submitBipAction (status → 'pending')
                            └── redirect /dashboard?submitted=true

(public)/layout.tsx  RSC
    │ getClaims() → hasClaims, initials
    ▼
<StickyNav hasClaims={true} initials="JS"> — conditional Dashboard link + avatar
```

### Recommended Project Structure (Phase 2 additions only)

```
app/
├── (auth)/
│   ├── layout.tsx                    ← RSC. min-h-screen grid place-items-center bg-bg-soft. Legal line at bottom.
│   ├── login/page.tsx                ← RSC shell → <LoginForm>
│   ├── register/page.tsx             ← RSC shell → <RegisterForm>
│   ├── verify-email/page.tsx         ← RSC. Static confirmation only. No redirect logic here.
│   └── reset-password/page.tsx       ← RSC shell → <PasswordResetForm>
├── auth/
│   └── callback/route.ts             ← Route Handler (GET). PKCE exchange → redirect /onboarding
├── (dashboard)/
│   ├── layout.tsx                    ← RSC. Auth guard + profile-complete guard.
│   ├── onboarding/page.tsx           ← RSC shell → <OnboardingForm>. Auth guard: yes. Profile gate: no.
│   └── dashboard/
│       ├── page.tsx                  ← RSC. Fetches coordinator BIPs.
│       └── bips/
│           ├── new/page.tsx          ← RSC shell. Fetches university list for combobox.
│           └── [id]/edit/page.tsx    ← RSC. Fetches existing BIP (RLS enforces ownership).

components/
├── auth/
│   ├── LoginForm.tsx                 ← 'use client'. RHF + Zod loginSchema. signIn Server Action.
│   ├── RegisterForm.tsx              ← 'use client'. RHF + Zod registerSchema. signUp Server Action.
│   └── PasswordResetForm.tsx         ← 'use client'. resetPasswordForEmail Server Action.
├── dashboard/
│   ├── DashboardNav.tsx              ← RSC (sign-out is Server Action form). Logo + breadcrumb + initials + sign out.
│   ├── OnboardingForm.tsx            ← 'use client'. RHF + Zod profileSchema. saveProfileAction.
│   ├── UniversityCombobox.tsx        ← 'use client'. shadcn Combobox + Popover. Debounced search. Inline "add new".
│   ├── DashboardBipList.tsx          ← 'use client'. shadcn Tabs. URL param ?status= for filter.
│   └── DashboardBipCard.tsx          ← 'use client'. Status badge. Per-status action buttons.
├── forms/
│   ├── BipSubmissionWizard.tsx       ← 'use client'. Zustand bipDraftStore. Step navigation.
│   ├── SaveStatusIndicator.tsx       ← 'use client'. Reads save state from Zustand.
│   ├── TwoTabConflictDialog.tsx      ← 'use client'. shadcn Dialog. No Escape close.
│   └── steps/
│       ├── WizardStep1BasicInfo.tsx
│       ├── WizardStep2ProgramDetails.tsx
│       ├── WizardStep3Partners.tsx
│       ├── WizardStep4ApplicationInfo.tsx
│       └── WizardStep5Preview.tsx    ← Renders BipBody + BipSidebar from Zustand data

lib/
├── actions/
│   ├── auth.ts                       ← signIn, signUp, signOut, resetPasswordForEmail, updatePassword
│   ├── profile.ts                    ← saveProfileAction (profile upsert + university insert)
│   ├── bips.ts                       ← saveDraftAction, submitBipAction, deleteDraftAction, withdrawBipAction
│   └── universities.ts              ← searchUniversitiesAction (for combobox server-side filter)
├── schemas/
│   ├── auth.ts                       ← loginSchema, registerSchema, resetPasswordSchema (Zod v3)
│   ├── profile.ts                    ← profileSchema (Zod v3) — full_name, contact_email, university_id, country, erasmus_code
│   └── bip-wizard.ts                 ← step1Schema…step4Schema + fullBipSchema (Zod v3)
├── store/
│   └── bip-draft.ts                  ← bipDraftStore (Zustand). Manual localStorage hydration pattern from bookmarks.ts.
└── utils/
    └── status.ts                     ← Status badge class lookup object (complete strings — Tailwind v4 static scanner)
```

---

## Pattern 1: PKCE Auth Callback Route Handler

**What:** Exchange the PKCE code from the email verification link for a session cookie, then redirect to `/onboarding`.

**Decision from CONTEXT.md D-07:** Redirect directly to `/onboarding` — no intermediate confirmation screen.

```typescript
// app/auth/callback/route.ts
// Source: Supabase auth/server-side guide + ARCHITECTURE.md lines 534-555
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')  // 'signup' | 'recovery' | 'invite'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // D-07: After email verification, always redirect to /onboarding.
      // After password reset, redirect to /reset-password/update.
      const redirectTo = type === 'recovery'
        ? `${origin}/reset-password/update`
        : `${origin}/onboarding`
      return NextResponse.redirect(redirectTo)
    }
  }
  // Exchange failed — redirect to login with error hint
  return NextResponse.redirect(`${origin}/login?error=verification_failed`)
}
```

**Key points:**
- Uses `createClient()` from `lib/supabase/server.ts` — `await cookies()` pattern already correct.
- PKCE code validity: 5 minutes, single use. [CITED: supabase.com/docs/reference/javascript/auth-exchangecodeforsession]
- The `auth/callback` route is already excluded from the middleware matcher (line 51 in `middleware.ts`).
- For password recovery: `type=recovery` is appended by Supabase to the callback URL automatically.

---

## Pattern 2: Auth Server Actions

**What:** `signUp`, `signIn`, `signOut`, `resetPasswordForEmail` as `'use server'` functions.

```typescript
// lib/actions/auth.ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function signUpAction(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // D-07: callback always lands at /onboarding after verification
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  })

  if (error) return { error: error.message }
  redirect('/verify-email')
}

export async function signInAction(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }
  // Middleware will handle redirect to /dashboard if claims are valid.
  // Explicit redirect here for reliability.
  redirect('/dashboard')
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function resetPasswordAction(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(
    formData.get('email') as string,
    { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=recovery` },
  )
  if (error) return { error: error.message }
  return { success: true }
}
```

[VERIFIED: signUp, signInWithPassword, resetPasswordForEmail API patterns — supabase.com/docs/guides/auth/passwords]
[VERIFIED: signOut + revalidatePath + redirect pattern — confirmed via web search against community examples]

---

## Pattern 3: Dashboard Layout Auth + Profile Guard

**What:** Server-side double-check after middleware. Redirect unauthenticated users to `/login`. Redirect profile-incomplete users to `/onboarding` (except when they are already at `/onboarding`).

```typescript
// app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { DashboardNav } from '@/components/dashboard/DashboardNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // CRITICAL: getClaims() — NEVER getSession() (PITFALLS Pitfall 1)
  const { data: { claims }, error } = await supabase.auth.getClaims()
  if (error || !claims) redirect('/login')

  // Profile completeness gate (D-05)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, university_id, contact_email')
    .eq('id', claims.sub)
    .single()

  const isComplete = Boolean(
    profile?.full_name && profile?.university_id && profile?.contact_email
  )

  // D-06: /onboarding is inside (dashboard) group but exempt from profile gate
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''
  const isOnboarding = pathname === '/onboarding' || pathname.startsWith('/onboarding')

  if (!isComplete && !isOnboarding) {
    redirect('/onboarding')
  }

  // Derive initials for DashboardNav avatar
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : claims.email?.slice(0, 2).toUpperCase() ?? '??'

  return (
    <div className="min-h-screen bg-bg-soft">
      <DashboardNav initials={initials} fullName={profile?.full_name ?? ''} />
      <main>{children}</main>
    </div>
  )
}
```

**Note on `x-pathname`:** Next.js does not expose `pathname` in RSC headers by default. The standard pattern is to read the Next.js internal header or use a middleware-injected custom header. Alternatively, pass the current path via `useSelectedLayoutSegments()` (client-side only). **Recommended simpler approach:** Check the `referer` pattern or inject `x-pathname` via middleware. See Anti-Patterns section.

[ASSUMED] The exact mechanism for reading the current pathname inside a RSC layout to distinguish `/onboarding` from other dashboard routes may require middleware to inject `x-next-url` or a custom header. This needs verification against Next.js 15.5 docs.

---

## Pattern 4: Middleware Phase 2 Redirect Branches

**What:** Add the two redirect branches that are pre-documented in `middleware.ts` comments (lines 13-18).

```typescript
// middleware.ts — Phase 2 additions to the existing middleware
// The existing getClaims() call already validates JWT. Phase 2 uses the result.
export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)

  // CRITICAL: getClaims() validates JWT signature. NEVER getSession().
  const { data: { claims } } = await supabase.auth.getClaims()

  const { pathname } = request.nextUrl

  // Phase 2: guard /dashboard (and all sub-paths)
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
    if (!claims) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Phase 2: redirect logged-in users away from auth pages
  if (claims && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}
// matcher is unchanged — /login, /register, /auth are already excluded
```

**Do NOT change the matcher.** The existing matcher in `middleware.ts` already excludes `/login`, `/register`, `/auth` (line 51). Adding redirect logic requires no matcher change. [VERIFIED: middleware.ts lines 40-52 in project codebase]

---

## Pattern 5: University Insert — Service-Role Server Action Decision

**Decision: Use `createAdminClient` (service-role) in `saveProfileAction` for university INSERT, with server-side validation.**

**Why NOT relaxing to `authenticated`:**
The `universities` table is shared infrastructure. Relaxing to `authenticated` would allow any verified coordinator to insert universities with any data (including malformed Erasmus codes, duplicate names, or adversarial content). The universities table is displayed publicly in search and on BIP detail pages, so data quality matters.

**Why service-role Server Action is correct:**
- The `createAdminClient` import is already restricted by ESLint `no-restricted-imports` to `app/(admin)/` and `lib/supabase/admin.ts` [VERIFIED: `lib/supabase/admin.ts` comment block].
- But `lib/actions/profile.ts` is not in `app/(admin)/` — this means the ESLint rule would flag it.
- **Solution:** Create a SECURITY DEFINER Postgres function restricted to the `public` schema for the university insert, callable by authenticated users only after server validation. This keeps RLS intact without service-role exposure.

**Recommended approach (SECURITY DEFINER function):**

```sql
-- Migration: 00009_insert_university_authenticated.sql
create or replace function public.insert_university_if_not_exists(
  p_name text,
  p_country text,
  p_erasmus_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- Validate inputs (server-side; replicates what application Zod does)
  if length(trim(p_name)) < 2 then
    raise exception 'University name too short';
  end if;
  if p_country not in ('AT','BE','BG','CY','CZ','DE','DK','EE','EL','ES','FI','FR','HR','HU','IE','IS','IT','LI','LT','LU','LV','MT','NL','NO','PL','PT','RO','RS','SE','SI','SK','TR') then
    raise exception 'Country must be a valid Erasmus+ programme country code';
  end if;
  -- Check for existing (case-insensitive name + country)
  select id into v_id
  from public.universities
  where lower(trim(name)) = lower(trim(p_name))
    and country = p_country
  limit 1;
  if v_id is null then
    insert into public.universities(name, country, erasmus_code)
    values (trim(p_name), p_country, nullif(trim(coalesce(p_erasmus_code,'')),'' ))
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- Grant execute to authenticated users only
grant execute on function public.insert_university_if_not_exists(text, text, text) to authenticated;
```

The Server Action calls `supabase.rpc('insert_university_if_not_exists', {...})` using the **anon-key** client (not admin client). SECURITY DEFINER ensures the function runs with the postgres role's permissions, bypassing the `universities_insert_admin` RLS policy, while the `grant execute` clause ensures only authenticated users can call it.

**Advantages over service-role bypass:**
- No `createAdminClient` import outside `(admin)/`
- ESLint rule remains clean
- All validation happens inside Postgres (cannot be bypassed from client)
- Audit trail: function is versioned in migrations

[CITED: Supabase RLS docs — SECURITY DEFINER functions as RLS bypass pattern]
[ASSUMED] The Erasmus+ programme country code list above covers the standard 33 countries as of 2024. Verify the exact list against `lib/countries.ts` before finalizing the migration.

---

## Pattern 6: Zustand `bipDraftStore`

**What:** Wizard in-memory state store, modelled after `lib/store/bookmarks.ts`.

```typescript
// lib/store/bip-draft.ts
// Source: Phase 1 lib/store/bookmarks.ts pattern (manual hydration, no SSR mismatch)
import { create } from 'zustand'

const DRAFT_STORAGE_KEY = 'biphub:draft'

export type BipDraftData = {
  // Step 1
  title?: string
  isced_f_code?: string
  description?: string
  learning_outcomes?: string
  // Step 2
  virtual_component_description?: string
  virtual_timing?: string
  host_city?: string
  physical_start_date?: string
  physical_end_date?: string
  application_deadline?: string
  ects_credits?: number
  max_participants?: number
  study_levels?: string[]
  language_of_instruction?: string
  language_level_min?: string
  // Step 3
  host_university_id?: string  // read-only from profile
  partner_universities?: Array<{ id?: string; name: string; isVerified: boolean }>
  // Step 4
  green_travel?: boolean
  inclusion_support?: boolean
  eligibility_notes?: string
  how_to_apply_type?: 'url' | 'contact'
  how_to_apply_value?: string
  contact_name?: string
  contact_email?: string
}

type SaveStatus = 'idle' | 'saving' | 'failed'

type BipDraftStore = {
  bipId: string | null
  currentStep: number
  draft: BipDraftData
  lastKnownUpdatedAt: string | null  // for optimistic locking (SUBM-06)
  saveStatus: SaveStatus
  hydrated: boolean
  // Actions
  setBipId: (id: string) => void
  setCurrentStep: (step: number) => void
  mergeDraft: (partial: Partial<BipDraftData>) => void
  setLastKnownUpdatedAt: (ts: string) => void
  setSaveStatus: (status: SaveStatus) => void
  hydrate: () => void
  persistToLocalStorage: () => void
  clearDraft: () => void
}

export const useBipDraft = create<BipDraftStore>((set, get) => ({
  bipId: null,
  currentStep: 1,
  draft: {},
  lastKnownUpdatedAt: null,
  saveStatus: 'idle',
  hydrated: false,

  setBipId: (id) => set({ bipId: id }),
  setCurrentStep: (step) => set({ currentStep: step }),
  mergeDraft: (partial) => set((s) => ({ draft: { ...s.draft, ...partial } })),
  setLastKnownUpdatedAt: (ts) => set({ lastKnownUpdatedAt: ts }),
  setSaveStatus: (status) => set({ saveStatus: status }),

  hydrate: () => {
    if (typeof window === 'undefined') return
    if (get().hydrated) return
    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        set({ draft: parsed.draft ?? {}, bipId: parsed.bipId ?? null, hydrated: true })
      } else {
        set({ hydrated: true })
      }
    } catch {
      set({ hydrated: true })
    }
  },

  persistToLocalStorage: () => {
    if (typeof window === 'undefined') return
    const { draft, bipId } = get()
    try {
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ draft, bipId }))
    } catch { /* quota exceeded — best effort */ }
  },

  clearDraft: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY)
    }
    set({ bipId: null, currentStep: 1, draft: {}, lastKnownUpdatedAt: null, saveStatus: 'idle' })
  },
}))
```

**Key design decisions:**
- Manual `hydrate()` called in `useEffect` on wizard mount — avoids SSR/client hydration mismatch (identical to `bookmarks.ts` pattern). [VERIFIED: `lib/store/bookmarks.ts`]
- `persistToLocalStorage()` called explicitly on `SIGNED_OUT` event (SUBM-07). NOT auto-persisted on every change — auto-persist would slow down the debounce path.
- `lastKnownUpdatedAt` tracks the DB-returned `updated_at` after each successful save, used in the optimistic locking guard.

---

## Pattern 7: `saveDraftAction` with Optimistic Locking

**What:** Server Action for auto-save and step navigation save. Implements `updated_at` conflict detection (SUBM-06).

```typescript
// lib/actions/bips.ts — saveDraftAction
'use server'

import { createClient } from '@/lib/supabase/server'
import { generateSlug } from '@/lib/utils/slug'

type SaveDraftResult =
  | { success: true; bipId: string; updatedAt: string }
  | { error: 'conflict' }
  | { error: 'auth' }
  | { error: 'validation'; message: string }
  | { error: 'unknown'; message: string }

export async function saveDraftAction(
  stepData: Partial<BipDraftData>,
  bipId: string | null,
  lastKnownUpdatedAt: string | null,
): Promise<SaveDraftResult> {
  const supabase = await createClient()
  const { data: { claims }, error: authError } = await supabase.auth.getClaims()
  if (authError || !claims) return { error: 'auth' }

  if (bipId && lastKnownUpdatedAt) {
    // UPDATE with optimistic locking: only succeeds if updated_at matches
    const { data, error } = await supabase
      .from('bips')
      .update({ ...stepData, updated_at: new Date().toISOString() })
      .eq('id', bipId)
      .eq('created_by', claims.sub)
      .eq('updated_at', lastKnownUpdatedAt)  // the lock
      .select('id, updated_at')
      .single()

    if (error) return { error: 'unknown', message: error.message }
    if (!data) return { error: 'conflict' }  // 0 rows updated = conflict

    return { success: true, bipId: data.id, updatedAt: data.updated_at }
  }

  // INSERT new draft (no bipId yet)
  const slug = generateSlug(stepData.title ?? 'untitled', claims.sub)
  const { data, error } = await supabase
    .from('bips')
    .insert({
      ...stepData,
      created_by: claims.sub,
      status: 'draft',
      slug,
      title: stepData.title ?? 'Untitled BIP',
    })
    .select('id, updated_at')
    .single()

  if (error) return { error: 'unknown', message: error.message }
  return { success: true, bipId: data.id, updatedAt: data.updated_at }
}
```

**Conflict detection:** If `.eq('updated_at', lastKnownUpdatedAt)` finds no matching row (another tab saved a newer version), the query returns `null` data. The action returns `{ error: 'conflict' }`. The wizard surfaces `<TwoTabConflictDialog>`. [VERIFIED: Supabase upsert/update `.eq()` filter behavior documented in supabase-js]

**Note on slug generation:** `bips.slug` is `NOT NULL` (confirmed in `database.types.ts` Insert: `slug: string`). New inserts must generate a slug. Use `slugify` (already installed). The slug can be temp (`draft-{uuid-prefix}`) on first insert and finalized on submission. [VERIFIED: `database.types.ts`]

---

## Pattern 8: `onAuthStateChange` + localStorage Session Recovery

**What:** SUBM-07 — detect session expiry mid-form, save draft to localStorage, redirect to login.

```typescript
// Inside <BipSubmissionWizard> useEffect
// Source: PITFALLS Pitfall 16 + Supabase auth-onauthstatechange
import { createClient } from '@/lib/supabase/client'

useEffect(() => {
  const supabase = createClient()  // browser client singleton

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      if (event === 'SIGNED_OUT') {
        // Persist draft to localStorage before redirect
        persistToLocalStorage()
        toast.warning('Your session has expired. Your draft has been saved locally — sign in again to continue.', {
          duration: 5000,
        })
        // Redirect after brief toast display
        setTimeout(() => {
          window.location.href = `/login?redirect=${encodeURIComponent('/dashboard/bips/new')}`
        }, 2000)
      }
    }
  )

  return () => subscription.unsubscribe()
}, [persistToLocalStorage])
```

**Draft restore on return:** In wizard `useEffect` on mount, after `hydrate()`:

```typescript
useEffect(() => {
  hydrate()
  // If localStorage has draft data after hydration, show restore banner
  if (hydrated && bipId === null && Object.keys(draft).length > 0) {
    setShowRestoreBanner(true)
  }
}, [hydrate, hydrated, bipId, draft])
```

[CITED: supabase.com/docs/reference/javascript/auth-onauthstatechange — onAuthStateChange event types]
[VERIFIED: `lib/supabase/client.ts` — `createBrowserClient` singleton available]

---

## Pattern 9: StickyNav Session Awareness (D-15)

**What:** The `(public)/layout.tsx` RSC fetches `getClaims()` server-side and passes `hasClaims` + `initials` as props to `<StickyNav>`. No client-side flash.

The existing `StickyNav` is `'use client'` and accepts no auth props. Phase 2 adds props:

```typescript
// components/home/StickyNav.tsx — additional props
interface StickyNavProps {
  hasClaims?: boolean
  initials?: string | null
}

export function StickyNav({ hasClaims = false, initials }: StickyNavProps) {
  // ... existing code ...
  // Right side: conditional on hasClaims
  {hasClaims ? (
    <>
      <Link href="/dashboard" className="hidden md:inline text-sm font-semibold text-ink hover:text-eu-blue">
        Dashboard
      </Link>
      <span className="w-8 h-8 rounded-full bg-eu-blue-50 text-eu-blue text-sm font-semibold flex items-center justify-center">
        {initials}
      </span>
    </>
  ) : (
    <>
      <Link href="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
      <Link href="/register"><Button variant="primary" size="sm">List your BIP</Button></Link>
    </>
  )}
}
```

```typescript
// app/(public)/layout.tsx — add getClaims()
import { createClient } from '@/lib/supabase/server'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { claims } } = await supabase.auth.getClaims()
  const initials = null // derive from profile if needed — Phase 2 adds profile query here
  const hasClaims = Boolean(claims)

  return (
    <>
      <a href="#main" className="skip-link">Skip to main content</a>
      <StickyNav hasClaims={hasClaims} initials={initials} />
      ...
    </>
  )
}
```

**Performance consideration:** Adding `getClaims()` to the public layout adds a Supabase Auth server call on every public page render. This is a JWT validation (local cryptographic check), not a database query — latency is negligible. [CITED: supabase.com/docs/guides/auth/server-side/nextjs — getClaims validates JWT locally]

---

## Schema Gap: `profiles` Missing `erasmus_code`

**Critical finding from codebase analysis:**

The UI-SPEC `/onboarding` page requires coordinators to enter their `Erasmus code`. The `profiles` table schema (migration `00002_universities_profiles.sql`, confirmed in `database.types.ts`) does NOT have an `erasmus_code` column:

```typescript
// database.types.ts — profiles Row
profiles: {
  Row: {
    contact_email: string | null
    created_at: string
    full_name: string | null
    id: string
    role: string
    university_id: string | null  // no erasmus_code column
    updated_at: string
  }
}
```

Phase 2 requires a migration to add `erasmus_code` to `profiles`:

```sql
-- 00009_profiles_erasmus_code.sql (or combined with university function migration)
alter table public.profiles add column erasmus_code text;
```

After the migration, regenerate types: `npm run db:types`.

[VERIFIED: `lib/supabase/database.types.ts` — profiles Row confirmed no erasmus_code]
[VERIFIED: `supabase/migrations/00002_universities_profiles.sql` — profiles table DDL]
[VERIFIED: `02-UI-SPEC.md` line 213 — onboarding form requires `Erasmus code` field]

---

## Pattern 10: Resend as Supabase Custom SMTP

**Configuration (Supabase Dashboard — no code changes needed):**

| Setting | Value |
|---------|-------|
| SMTP Host | `smtp.resend.com` |
| SMTP Port | `465` |
| SMTP Username | `resend` |
| SMTP Password | Your Resend API key |
| Sender name | `BipHub` |
| Sender email | `noreply@biphub.eu` (must be a verified Resend domain) |

**Setup path:** Supabase Dashboard → Authentication → Email → SMTP Settings

**Environment variables:** None required in Next.js. The SMTP credentials are stored in Supabase's backend. The only required env var for verification emails is:

```bash
NEXT_PUBLIC_SITE_URL=https://biphub.eu  # used in emailRedirectTo
```

**Local dev:** In `supabase/config.toml`, Supabase local uses Inbucket (mail capture at `localhost:54324`) by default — no Resend setup needed for local development. Only production Supabase project needs Resend SMTP.

[CITED: resend.com/docs/send-with-supabase-smtp — SMTP credentials confirmed]

---

## Architectural Responsibility Map (Detailed: University Combobox)

The `<UniversityCombobox>` component needs server-side search for large university lists. Two options:

**Option A (Recommended): Server Action for search**

```typescript
// lib/actions/universities.ts
'use server'

import { createClient } from '@/lib/supabase/server'

export async function searchUniversitiesAction(query: string) {
  if (query.length < 2) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('universities')
    .select('id, name, country, erasmus_code')
    .ilike('name', `%${query}%`)
    .limit(10)
  return data ?? []
}
```

**Option B:** Pass full universities list as RSC prop (simpler for small table, but universities table will grow as coordinators add their institutions).

**Recommendation:** Option A (Server Action search). The universities table starts seeded but grows as coordinators self-register. Server-side filtering prevents loading 1000+ rows to the client.

[ASSUMED] The initial universities table size from Phase 1 seed data is likely < 50 rows. At launch, Option B (RSC prop) is viable. But Option A scales better and is worth implementing from the start.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation functions | Zod v3 + RHF `zodResolver` | Already installed; step schemas follow `lib/schemas/bip-filters.ts` pattern |
| Toast notifications | Custom toast component | shadcn Sonner (`sonner@^2.0.7`) | Already installed; already used in Phase 1 |
| Session cookie management | Custom cookie parsing | `@supabase/ssr` 0.5.2 `createServerClient` | Already implemented correctly in `lib/supabase/server.ts` |
| Debounce | `setTimeout` + `clearTimeout` | `use-debounce` `useDebouncedCallback` | Already installed (`use-debounce@10.0.4`) |
| Combobox | Custom autocomplete dropdown | shadcn `command` + `popover` | Radix primitives handle ARIA, keyboard nav, focus management |
| Modals | Custom dialog overlay | shadcn `dialog` | Focus trap, Escape key, aria-modal are non-trivial to implement correctly |
| Animation | CSS transitions only | `motion/react` + `LazyMotion` | Reduced-motion support, step transitions, chip animations already handled by motion |
| Status badge classes | Dynamic Tailwind template literals | Static class lookup in `lib/utils/status.ts` | Tailwind v4 static scanner; template literals are purged in production build |

---

## Common Pitfalls

### Pitfall 1: Middleware Matcher Includes `/onboarding`

**What goes wrong:** Phase 2 adds `/onboarding` to the dashboard auth guard. If the middleware matcher does NOT include `/onboarding`, the middleware guard never fires and anyone can access `/onboarding` without a session.

**Why it happens:** The existing matcher excludes `/login`, `/register`, `/auth`. It does NOT currently exclude `/onboarding` — so middleware WILL run on it. But the Phase 2 redirect logic must explicitly handle `/onboarding` (redirect to `/login` if not authenticated, NOT redirect to `/onboarding` if profile incomplete — that would cause a loop).

**How to avoid:** In middleware, include `/onboarding` in the `startsWith('/dashboard') || startsWith('/onboarding')` check so unauthenticated users are redirected to `/login`. Profile-completeness check only happens in `(dashboard)/layout.tsx` (server component), never in middleware.

**Warning signs:** Unauthenticated users can reach `/onboarding` by typing the URL directly.

[VERIFIED: `middleware.ts` — current matcher and existing code confirmed]

---

### Pitfall 2: Profile-Complete Gate Infinite Redirect

**What goes wrong:** The `(dashboard)/layout.tsx` redirects profile-incomplete users to `/onboarding`. But `/onboarding` is inside the `(dashboard)` route group, so the layout runs again, detects profile incomplete again, and redirects to `/onboarding` → infinite loop.

**Why it happens:** The guard logic doesn't distinguish between "user is on /onboarding" and "user is on /dashboard".

**How to avoid:** The guard must check if the current path is `/onboarding` before redirecting. Use `headers()` to read the request URL (Next.js injects `x-invoke-path` or parse the `referer`). **Simplest pattern:** Inject a custom middleware header `x-pathname` into every request so RSC layouts can read it without ambiguity.

```typescript
// middleware.ts addition
response.headers.set('x-pathname', request.nextUrl.pathname)
```

Then in `(dashboard)/layout.tsx`:
```typescript
const headersList = await headers()
const pathname = headersList.get('x-pathname') ?? ''
if (!isComplete && !pathname.startsWith('/onboarding')) redirect('/onboarding')
```

[CITED: Next.js community pattern — middleware-injected x-pathname header for RSC route awareness]

---

### Pitfall 3: Slug NOT NULL Constraint on Draft BIP Insert

**What goes wrong:** `saveDraftAction` inserts a new `bips` row without a slug. The `slug` column is `NOT NULL` in the schema (confirmed in `database.types.ts` Insert type: `slug: string`). The insert fails with a Postgres constraint error.

**Why it happens:** Wizard step 1 only captures the title. At first auto-save (before step navigation), the title may be partially typed.

**How to avoid:** Generate a temporary draft slug on insert: `draft-${slugify(title ?? 'bip')}-${crypto.randomUUID().slice(0, 8)}`. On `submitBipAction`, finalize the slug to `${slugify(title)}-${erasmusCode.toLowerCase()}-${year}`. The slug can be updated at submit time since it's not used publicly until status = `approved`.

[VERIFIED: `database.types.ts` — `bips.Insert.slug: string` (NOT NULL)]

---

### Pitfall 4: `BipBody` / `BipSidebar` Expect `BipDetail` Type — Wizard Preview Needs Adapter

**What goes wrong:** `<WizardStep5Preview>` renders `<BipBody>` and `<BipSidebar>` using Zustand store data. But these components accept `bip: BipDetail` (from `lib/queries/bipDetail.ts`) — a specific query result type with nested relations (host_university name + country, partners array with university FK). The Zustand store uses flat field names.

**Why it happens:** The BIP detail components were built for the public page query shape, not the coordinator's flat form data.

**How to avoid:** Create an adapter function in the wizard that maps Zustand `BipDraftData` → a `BipDetail`-compatible shape. Host university name can be fetched once (from the coordinator's profile, passed as a prop to the wizard). Partner names come from the draft store's `partner_universities` array.

[VERIFIED: `components/bip/BipBody.tsx` — takes `bip: BipDetail`; `lib/queries/bipDetail.ts` — defines the nested type]

---

### Pitfall 5: `StickyNav` Becomes RSC — Breaks `usePathname`

**What goes wrong:** Phase 2 adds `getClaims()` to `(public)/layout.tsx`, which makes the layout async. If `<StickyNav>` is passed `hasClaims` as a prop, it must remain `'use client'` because it uses `usePathname`. The layout remains a server component that renders a client component — this is fine and the correct pattern.

**What would break it:** Trying to make `StickyNav` a server component to avoid prop drilling, but then it cannot use `usePathname` for active link detection.

**How to avoid:** Keep `StickyNav` as `'use client'`. The `(public)/layout.tsx` calls `getClaims()` server-side, extracts `hasClaims` and `initials`, and passes them as serializable props to the `'use client'` `StickyNav`. This is the standard RSC-passes-data-to-client-component pattern.

[VERIFIED: `components/home/StickyNav.tsx` — currently `'use client'` with `usePathname`]

---

### Pitfall 6: `switch` vs `checkbox` for Green Travel + Inclusion

**UI-SPEC Open Issue 2 — resolved here:** Use `switch` (shadcn Switch) for green travel and inclusion support toggles. Switch provides a larger mobile tap target (toggle pattern) and the shadcn `Switch` component has proper `role="switch"` and `aria-checked` attributes.

If switch feels unconventional in a form context, wrap it in a `<FormField>` with a visible label and the UI-SPEC caption — the caption explains what the toggle means, reducing ambiguity.

[CITED: 02-UI-SPEC.md open issue 2 — planner should choose switch]

---

### Pitfall 7: Wizard Step Progress — Step Dots vs Progress Bar

**UI-SPEC Open Issue 3 — resolved here:** Use step indicator **dots** (5 circles in wizard header) and omit the `progress` bar component. The dots align with the UI-SPEC contract (wizard header section), are simpler to implement, and provide direct step navigation (clicking completed step jumps to it).

---

## Code Examples

### `auth/callback/route.ts` Full Implementation

```typescript
// app/auth/callback/route.ts
// Source: ARCHITECTURE.md lines 534-555 (adapted for D-07 redirect to /onboarding)
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const destination = type === 'recovery'
        ? `${siteUrl}/reset-password/update`
        : `${siteUrl}/onboarding`
      return NextResponse.redirect(destination)
    }
  }

  return NextResponse.redirect(`${siteUrl}/login?error=verification_failed`)
}
```

### Zustand `bipDraftStore` Usage in Wizard

```typescript
// components/forms/BipSubmissionWizard.tsx (sketch)
'use client'

import { useEffect, useState } from 'react'
import { useBipDraft } from '@/lib/store/bip-draft'
import { useDebouncedCallback } from 'use-debounce'
import { saveDraftAction } from '@/lib/actions/bips'
import { createClient } from '@/lib/supabase/client'

export function BipSubmissionWizard({ initialBipId }: { initialBipId?: string }) {
  const {
    bipId, currentStep, draft, lastKnownUpdatedAt, saveStatus,
    hydrated, hydrate, setBipId, setCurrentStep, mergeDraft,
    setLastKnownUpdatedAt, setSaveStatus, persistToLocalStorage, clearDraft,
  } = useBipDraft()

  const [showConflictModal, setShowConflictModal] = useState(false)

  // Hydrate from localStorage on mount
  useEffect(() => { hydrate() }, [hydrate])

  // Session expiry listener
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        persistToLocalStorage()
        // toast + redirect handled here
      }
    })
    return () => subscription.unsubscribe()
  }, [persistToLocalStorage])

  // Debounced auto-save (1.5s after field blur)
  const debouncedSave = useDebouncedCallback(async (stepData: Partial<typeof draft>) => {
    setSaveStatus('saving')
    const result = await saveDraftAction(stepData, bipId, lastKnownUpdatedAt)
    if (result.error === 'conflict') { setShowConflictModal(true); setSaveStatus('failed'); return }
    if (result.error) { setSaveStatus('failed'); return }
    setBipId(result.bipId)
    setLastKnownUpdatedAt(result.updatedAt)
    setSaveStatus('idle')
  }, 1500)

  // ... step rendering, navigation, etc.
}
```

### Status Badge Lookup Object (Tailwind v4 static classes)

```typescript
// lib/utils/status.ts
// NEVER use template literals for status classes — Tailwind v4 purges dynamic strings.
// Source: PITFALLS Pitfall 13 + 02-UI-SPEC.md status color tokens

export const STATUS_BADGE_CLASSES: Record<string, string> = {
  draft:    'bg-status-draft-bg    text-status-draft    border-status-draft',
  pending:  'bg-status-pending-bg  text-status-pending  border-status-pending',
  approved: 'bg-status-approved-bg text-status-approved border-status-approved',
  rejected: 'bg-status-rejected-bg text-status-rejected border-status-rejected',
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `framer-motion` package | `motion` package, import from `motion/react` | `framer-motion` is deprecated alias — must use `motion` |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` 0.5.2 | Auth helpers deprecated; `@supabase/ssr` is the official package |
| `getSession()` server-side | `getClaims()` server-side | `getSession()` does not validate JWT; `getClaims()` does |
| Synchronous `cookies()` (Next.js < 15) | `await cookies()` | Next.js 15 made Dynamic APIs async; sync usage silently breaks auth |
| CMDK-based shadcn combobox | shadcn CLI v4 Combobox (Base UI) | CLI v4 ships new Combobox component with `ComboboxChips` for multi-select |
| `cookies()` sync in server client | `const cookieStore = await cookies()` | Already correctly implemented in `lib/supabase/server.ts` |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The exact mechanism for reading pathname in `(dashboard)/layout.tsx` RSC requires middleware to inject `x-pathname` header | Pattern 3, Pitfall 2 | If Next.js 15.5 exposes pathname natively in RSC via another API, the x-pathname pattern is unnecessary overhead |
| A2 | The SECURITY DEFINER function approach is supported and callable via `supabase.rpc()` with the anon-key client | Pattern 5 | If `grant execute to authenticated` doesn't propagate correctly in Supabase's managed environment, university insert fails silently |
| A3 | The Erasmus+ programme country code list in the SECURITY DEFINER function covers all 33 countries | Pattern 5 | If `lib/countries.ts` has a different or extended list, the validation rejects valid countries |
| A4 | `onAuthStateChange` `SIGNED_OUT` event fires correctly when a Supabase session expires in Next.js 15 App Router | Pattern 8 | Known GitHub issue (#1618 supabase-js) — `onAuthStateChange` may not fire when sign-out occurs via Server Action. For session expiry (token expire), it should fire via the browser client refresh cycle. |
| A5 | `use-debounce` package's `useDebouncedCallback` is compatible with the Zustand store update pattern | Pattern 6 | If `useDebouncedCallback` captures stale closure state, the debounced save sends stale draft data |
| A6 | The new shadcn CLI v4 `Combobox` component (with `ComboboxChips`, `ComboboxChipsInput`) is available via `npx shadcn add combobox` | Standard Stack | If the CLI v4 combobox is not yet published or has API differences, the multi-select university combobox needs a different implementation |

---

## Open Questions

1. **RSC pathname detection in `(dashboard)/layout.tsx`**
   - What we know: Next.js App Router RSC layouts do not expose `usePathname()` (client-only). Middleware can inject headers.
   - What's unclear: Is there a cleaner Next.js 15 API for this than the `x-pathname` middleware header pattern?
   - Recommendation: Implement the `x-pathname` middleware header injection. It is a documented community pattern and adds < 1ms overhead. If Next.js adds native RSC pathname access in a future minor, migrate then.

2. **`onAuthStateChange` reliability when session expires (not server-action sign-out)**
   - What we know: There is a known issue (#1618) where `SIGNED_OUT` does not fire on server-action sign-out. Session expiry (JWT expiry while browser is active) is a different code path — the browser client refresh cycle should detect and emit `TOKEN_REFRESHED` or `SIGNED_OUT`.
   - What's unclear: In practice, does the wizard's `onAuthStateChange` reliably fire on token expiry with `@supabase/ssr` 0.5.2 + Next.js 15?
   - Recommendation: Implement `onAuthStateChange` as specified. As a belt-and-suspenders, also handle `error: 'auth'` returns from `saveDraftAction` — show a visible "Session expired" banner even if the event doesn't fire.

3. **SECURITY DEFINER function vs service-role for university insert**
   - What we know: Both approaches work technically. SECURITY DEFINER keeps ESLint rules clean.
   - What's unclear: Whether the Supabase managed environment correctly routes `rpc()` calls through the function's SECURITY DEFINER context.
   - Recommendation: Test the SECURITY DEFINER approach in local Supabase first. If it fails, fall back to a dedicated `lib/actions/universities.ts` that calls `createAdminClient()` with an explicit ESLint disable comment and documented justification.

---

## Environment Availability

All required tools for Phase 2 are already available — Phase 2 is purely code/config changes plus Supabase dashboard configuration (Resend SMTP). No new CLI tools, runtimes, or databases are needed.

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| `@supabase/ssr` 0.5.2 | Auth callback, server client | ✓ | Pinned exact version in package.json |
| `use-debounce` 10.0.4 | Auto-save debounce | ✓ | Already installed |
| `zustand` ^5.0.13 | Draft store | ✓ | Already installed; bookmarks store pattern available |
| `sonner` ^2.0.7 | Toasts | ✓ | Already installed; Toaster in public layout |
| `lucide-react` ^1.14.0 | Icons (Loader2, Eye, etc.) | ✓ | Already installed |
| shadcn CLI v4 | New component installs | ✓ | `shadcn@^4.7.0` in devDependencies |
| Resend account (production) | Email verification | External | Configure in Supabase dashboard; local dev uses Inbucket |
| Supabase local stack | Local dev | ✓ | `supabase start` pattern from Phase 1 |

---

## Validation Architecture

Phase 2 has no Vitest test infrastructure yet. The following wave 0 gaps exist:

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None configured — not in `.planning/config.json` |
| Config file | None |
| Quick run | N/A |
| Full suite | N/A |

Given the interactive nature of auth flows and wizard forms, Phase 2 testing is primarily manual verification (matching Phase 1 pattern). Unit tests for Zod schemas and the `saveDraftAction` Server Action logic are appropriate but not yet scaffolded.

### Phase Requirements → Verification Map

| Req ID | Behavior | Verification Type | Approach |
|--------|----------|-------------------|----------|
| AUTH-01 | Register with email + password | Manual | Register form submission; check Supabase auth.users |
| AUTH-02 | Resend verification email | Manual | Check email delivery; verify Inbucket in local dev |
| AUTH-03 | Sign in | Manual | Login form; verify redirect to /dashboard |
| AUTH-04 | Sign out | Manual | Sign out button; verify redirect to /login; cookie cleared |
| AUTH-05 | Password reset | Manual | Reset link → callback → update password |
| AUTH-06 | Session persistence | Manual | Sign in; close tab; reopen; verify still logged in |
| AUTH-07 | Onboarding profile completion | Manual | Fill form; verify profile row in DB; redirect to /dashboard |
| SUBM-01 | Multi-step wizard navigation | Manual | Navigate all 5 steps; verify Back/Next |
| SUBM-02 | Auto-save | Manual | Fill field; blur; wait 1.5s; verify Supabase bips row |
| SUBM-06 | Two-tab conflict | Manual | Open same BIP in 2 tabs; save from tab A; save from tab B |
| SUBM-07 | Session expiry recovery | Manual | Expire session via Supabase; verify localStorage + redirect |
| SUBM-08 | Submit → pending status | Manual | Click Submit; verify bips.status = 'pending' in DB |
| DASH-01..06 | Dashboard BIP list + actions | Manual | Dashboard with BIPs in all 4 statuses |

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Supabase Auth (signUp/signInWithPassword); getClaims() JWT validation |
| V3 Session Management | Yes | `@supabase/ssr` cookie-based session; middleware refresh on every request |
| V4 Access Control | Yes | RLS policies (bips, profiles, universities); dashboard layout auth gate |
| V5 Input Validation | Yes | Zod v3 schemas server-side in all Server Actions |
| V6 Cryptography | No | Supabase Auth handles hashing; no custom crypto |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| JWT spoofing | Spoofing | `getClaims()` validates JWT signature — never `getSession()` |
| Session cookie theft | Spoofing | httpOnly cookies via `@supabase/ssr`; sameSite=lax default |
| Unauthorized BIP access | Elevation of Privilege | RLS `bips_select_own_or_approved`; `bips_update_own_draft_or_pending` |
| Coordinator self-approving BIP | Elevation of Privilege | `bips_update_own_draft_or_pending` WITH CHECK blocks status = 'approved' |
| Ownership reassignment | Tampering | All UPDATE policies include `WITH CHECK (created_by = auth.uid())` |
| University spam insert | Tampering | SECURITY DEFINER function with server-side validation (name length, country code whitelist) |
| `createAdminClient` misuse | Elevation of Privilege | ESLint `no-restricted-imports` rule; SECURITY DEFINER function avoids need in Phase 2 |
| XSS via free-text partner names | Tampering | React JSX escapes output; `partner_name_raw` rendered as text content, not innerHTML |

---

## Project Constraints (from CLAUDE.md)

All of the following CLAUDE.md directives are active in Phase 2:

| Directive | Phase 2 Application |
|-----------|---------------------|
| Next.js 15.5.x LTS (NOT 16) | All Next.js patterns in this research use App Router 15.5 APIs |
| `motion` package, import from `motion/react`, wrap in `LazyMotion` | All wizard animations (step transition, chip add/remove, conditional field reveal) |
| Zod v3 (NOT v4) | All auth, profile, and wizard step schemas |
| `@hookform/resolvers` v3.x | `zodResolver()` in all form components |
| `@supabase/ssr` exact 0.5.2 | Already pinned in package.json |
| `getClaims()` everywhere server-side — NEVER `getSession()` | Dashboard layout, Server Actions, auth callback |
| `await cookies()` in every Supabase server client factory | Already implemented in `lib/supabase/server.ts` |
| Server Actions for ALL mutations | signUp, signIn, signOut, saveProfileAction, saveDraftAction, submitBipAction |
| Tailwind v4 — no dynamic class names | `lib/utils/status.ts` lookup object for status badge classes |
| Never `createAdminClient` outside `app/(admin)/` and `lib/supabase/admin.ts` | Phase 2 uses SECURITY DEFINER function instead |
| Never create table without RLS | Migration `00009_profiles_erasmus_code.sql` does not create new tables |
| Never write UPDATE policy without both USING and WITH CHECK | No new RLS policies needed in Phase 2 (existing policies cover all cases) |
| EU palette: `#003399` blue, `#FFCC00` gold, `#0a1735` ink | All coordinator surfaces follow UI-SPEC color contract |
| Inter font via `next/font` | Inherited from root layout — no changes needed |
| Footer disclaimer on every page | Auth pages: legal line at page bottom per UI-SPEC. Dashboard: not using public footer — but `DashboardNav` or page footer must include the disclaimer |

**Footer disclaimer gap on dashboard pages:** The `(dashboard)` route group does not use the public `Footer` component. Each dashboard page or the `(dashboard)/layout.tsx` must render the disclaimer inline. This is not yet addressed in the UI-SPEC.

---

## Sources

### Primary (HIGH confidence)
- `lib/supabase/server.ts` — existing `createClient()` with `await cookies()` pattern [VERIFIED: codebase]
- `middleware.ts` — existing Phase 2 comment scaffold + matcher [VERIFIED: codebase]
- `supabase/migrations/00006_rls_policies.sql` — existing RLS policies [VERIFIED: codebase]
- `supabase/migrations/00002_universities_profiles.sql` — profiles schema (no erasmus_code) [VERIFIED: codebase]
- `lib/supabase/database.types.ts` — confirmed bips.slug is NOT NULL, profiles has no erasmus_code [VERIFIED: codebase]
- `lib/store/bookmarks.ts` — Zustand manual hydration pattern for draft store [VERIFIED: codebase]
- `components/ui/` directory — confirmed which shadcn components are NOT yet installed [VERIFIED: codebase]
- `package.json` — all dependency versions confirmed [VERIFIED: codebase]

### Secondary (MEDIUM confidence)
- [resend.com/docs/send-with-supabase-smtp](https://resend.com/docs/send-with-supabase-smtp) — SMTP credentials (smtp.resend.com:465, user=resend, pass=API key)
- [supabase.com/docs/guides/auth/passwords](https://supabase.com/docs/guides/auth/passwords) — signUp emailRedirectTo, signInWithPassword, resetPasswordForEmail
- [ui.shadcn.com/docs/components/combobox](https://ui.shadcn.com/docs/components/combobox) — new CLI v4 Combobox API with ComboboxChips

### Tertiary (LOW confidence — flagged as ASSUMED)
- `onAuthStateChange` SIGNED_OUT reliability with server-action sign-out — GitHub issue #1618 cited but not directly verified against `@supabase/ssr` 0.5.2
- SECURITY DEFINER function via `supabase.rpc()` with anon key behavior — standard Postgres/Supabase pattern but not tested in this project's local environment

---

## Metadata

**Confidence breakdown:**
- Auth flow patterns: HIGH — existing `lib/supabase/server.ts`, `middleware.ts`, `lib/supabase/middleware.ts` verified; official Supabase signUp/signInWithPassword API confirmed
- Zustand draft store: HIGH — directly modelled on Phase 1 `lib/store/bookmarks.ts` (verified); `use-debounce` already installed
- University RLS decision: HIGH (analysis) / MEDIUM (SECURITY DEFINER execution) — policy decision is well-reasoned; function approach needs local testing
- Combobox: MEDIUM — shadcn CLI v4 API confirmed from docs; exact installation behavior not tested
- `onAuthStateChange` reliability: LOW — GitHub issue shadows reliability for server-action sign-out; session expiry path should work

**Research date:** 2026-05-09
**Valid until:** 2026-06-09 (30 days — stable stack, no fast-moving dependencies)
