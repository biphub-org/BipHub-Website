# Phase 2: Coordinator Auth + Submission — Pattern Map

**Mapped:** 2026-05-09
**Files analyzed:** 28 new/modified files
**Analogs found:** 24 / 28

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/(auth)/layout.tsx` | layout | request-response | `app/(public)/layout.tsx` | role-match |
| `app/(auth)/login/page.tsx` | page (RSC shell) | request-response | `app/(public)/bip/[slug]/page.tsx` | role-match |
| `app/(auth)/register/page.tsx` | page (RSC shell) | request-response | `app/(public)/bip/[slug]/page.tsx` | role-match |
| `app/(auth)/verify-email/page.tsx` | page (RSC shell) | request-response | `app/(public)/bip/[slug]/page.tsx` | role-match |
| `app/auth/callback/route.ts` | route handler | request-response | `lib/supabase/server.ts` (client pattern) | partial |
| `app/(dashboard)/layout.tsx` | layout + auth guard | request-response | `app/(public)/layout.tsx` | role-match |
| `app/(dashboard)/onboarding/page.tsx` | page (RSC shell) | request-response | `app/(public)/bips/page.tsx` | role-match |
| `app/(dashboard)/dashboard/page.tsx` | page (RSC data-fetcher) | CRUD | `app/(public)/bips/page.tsx` | exact |
| `app/(dashboard)/bips/new/page.tsx` | page (RSC shell) | request-response | `app/(public)/bips/page.tsx` | role-match |
| `app/(dashboard)/bips/[id]/edit/page.tsx` | page (RSC shell) | CRUD | `app/(public)/bip/[slug]/page.tsx` | role-match |
| `components/auth/LoginForm.tsx` | component (form) | request-response | `components/bip/BipFiltersSidebar.tsx` | role-match |
| `components/auth/RegisterForm.tsx` | component (form) | request-response | `components/bip/BipFiltersSidebar.tsx` | role-match |
| `components/auth/PasswordResetForm.tsx` | component (form) | request-response | `components/bip/BipFiltersSidebar.tsx` | role-match |
| `components/dashboard/DashboardNav.tsx` | component (nav) | request-response | `components/home/StickyNav.tsx` | role-match |
| `components/dashboard/OnboardingForm.tsx` | component (form) | CRUD | `components/bip/BipFiltersSidebar.tsx` | role-match |
| `components/dashboard/UniversityCombobox.tsx` | component (combobox) | request-response | `components/bip/BipFiltersSidebar.tsx` | partial |
| `components/dashboard/DashboardBipList.tsx` | component (list + tabs) | CRUD | `components/bip/BipGrid.tsx` | role-match |
| `components/dashboard/DashboardBipCard.tsx` | component (card) | CRUD | `components/bip/BipCard.tsx` | exact |
| `components/forms/BipSubmissionWizard.tsx` | component (multi-step wizard) | CRUD | `components/bip/BipFiltersSidebar.tsx` | partial |
| `components/forms/steps/WizardStep*.tsx` (1–5) | component (form step) | CRUD | `components/bip/BipFiltersSidebar.tsx` | role-match |
| `lib/actions/auth.ts` | server action | request-response | `lib/supabase/server.ts` (client pattern) | partial |
| `lib/actions/bips.ts` | server action | CRUD | `lib/queries/bips.ts` | role-match |
| `lib/actions/profile.ts` | server action | CRUD | `lib/queries/bips.ts` | role-match |
| `lib/actions/universities.ts` | server action | request-response | `lib/queries/bips.ts` | role-match |
| `lib/store/bip-draft.ts` | store | event-driven | `lib/store/bookmarks.ts` | exact |
| `lib/schemas/auth.ts` | schema | transform | `lib/filters/parseSearchParams.ts` | role-match |
| `lib/schemas/profile.ts` | schema | transform | `lib/filters/parseSearchParams.ts` | role-match |
| `lib/schemas/bip-wizard.ts` | schema | transform | `lib/filters/parseSearchParams.ts` | role-match |
| `lib/utils/status.ts` | utility | transform | `lib/filters/parseSearchParams.ts` (lookup pattern) | role-match |
| `supabase/migrations/00009_profiles_erasmus_code.sql` | migration | — | `supabase/migrations/00006_rls_policies.sql` | exact |
| `middleware.ts` (modify) | middleware | request-response | `middleware.ts` | self |
| `components/home/StickyNav.tsx` (modify) | component (nav) | request-response | `components/home/StickyNav.tsx` | self |
| `app/(public)/layout.tsx` (modify) | layout | request-response | `app/(public)/layout.tsx` | self |

---

## Pattern Assignments

### `app/(auth)/layout.tsx` (layout, request-response)

**Analog:** `app/(public)/layout.tsx`

**Imports pattern** (`app/(public)/layout.tsx` lines 1–3):
```typescript
import { StickyNav } from '@/components/home/StickyNav'
import { Footer } from '@/components/home/Footer'
import { Toaster } from '@/components/ui/sonner'
```

**Core pattern** (`app/(public)/layout.tsx` lines 17–37):
```typescript
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">Skip to main content</a>
      <StickyNav />
      <main id="main" className="min-h-[calc(100vh-68px)]">
        {children}
      </main>
      <Footer />
      <Toaster position="bottom-right" richColors={false} closeButton />
    </>
  )
}
```

**Auth layout deviation — D-12 / D-13:** Replace with a centered-card shell. No `<StickyNav>` or `<Footer>`. Use `min-h-screen grid place-items-center bg-[#f7f8fc]`. Add the INFO-03 disclaimer as a `<p>` at the very bottom (since `<Footer>` is absent). Add the BipHub logo above the card.

**Disclaimer pattern** (`components/home/Footer.tsx` lines 77–79):
```typescript
<p className="text-xs text-white/60">
  Independent project — not affiliated with the European Commission
</p>
```

---

### `app/(auth)/login/page.tsx`, `register/page.tsx`, `verify-email/page.tsx` (RSC shells, request-response)

**Analog:** `app/(public)/bip/[slug]/page.tsx`

**RSC shell pattern** (`app/(public)/bip/[slug]/page.tsx` lines 106–145):
```typescript
export default async function BipDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const bip = await getBipBySlug(slug)
  if (!bip) { notFound() }
  return (
    <>
      {/* page body */}
    </>
  )
}
```

**Auth page deviation:** Pages are NOT async (no data-fetching needed). They are thin RSC wrappers that import and render their corresponding `'use client'` form component. Pattern: `export default function LoginPage() { return <LoginForm /> }`.

---

### `app/auth/callback/route.ts` (route handler, request-response)

**Analog:** `lib/supabase/server.ts` (client creation pattern)

**`createClient` pattern** (`lib/supabase/server.ts` lines 17–40):
```typescript
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
              cookieStore.set(name, value, options),
            )
          } catch { /* Server Components cannot write cookies directly */ }
        },
      },
    },
  )
}
```

**Route handler pattern (from RESEARCH.md Pattern 1):**
```typescript
// app/auth/callback/route.ts
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

**Critical notes:**
- `createClient()` must be `await`-ed — it calls `await cookies()` internally (`lib/supabase/server.ts` line 18).
- The route handler is a GET function, not a Server Action. No `'use server'` directive.
- No `NextRequest` needed — `Request` is sufficient because no custom headers are read.

---

### `app/(dashboard)/layout.tsx` (auth guard + profile gate, request-response)

**Analog:** `app/(public)/layout.tsx` (structural pattern) + `lib/supabase/server.ts` (auth pattern)

**Auth guard pattern using `getClaims()`** (`middleware.ts` lines 29–34):
```typescript
// CRITICAL: getClaims() validates the JWT signature on every request.
// NEVER use getSession() in server code (PITFALLS Pitfall 1).
await supabase.auth.getClaims()
```

**Supabase query pattern** (`lib/queries/bips.ts` lines 19–21):
```typescript
export async function getBips(filters: BipFilterState): Promise<BipsQueryResult> {
  const supabase = await createClient()
  // ...
}
```

**Dashboard layout core pattern (from RESEARCH.md Pattern 3):**
```typescript
// app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
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

  // D-06: /onboarding is inside (dashboard) group but exempt from profile gate.
  // x-pathname injected by middleware (Pitfall 2 prevention).
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''
  if (!isComplete && !pathname.startsWith('/onboarding')) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc]">
      <DashboardNav initials={...} fullName={profile?.full_name ?? ''} />
      <main>{children}</main>
    </div>
  )
}
```

**Pitfall 2 prevention — inject `x-pathname` in middleware** (`middleware.ts` — Phase 2 addition):
```typescript
// In middleware.ts, before `return response`:
response.headers.set('x-pathname', request.nextUrl.pathname)
```

---

### `app/(dashboard)/dashboard/page.tsx` (RSC data-fetcher, CRUD)

**Analog:** `app/(public)/bips/page.tsx`

**RSC data-fetch + render pattern** (`app/(public)/bips/page.tsx` lines 30–110):
```typescript
export default async function BipsPage(props: {
  searchParams: Promise<SearchParamsRaw>
}) {
  const sp = await props.searchParams
  const filters = parseSearchParams(sp)
  const { rows, total, totalCountries } = await getBips(filters)
  // ...render
}
```

**Dashboard page deviation:** Fetch coordinator's own BIPs using `created_by = auth.uid()` (RLS enforces this automatically for authenticated users via `bips_select_own_or_approved`). Pass BIPs to `<DashboardBipList>`. Accept `?status=` search param for tab pre-selection.

---

### `components/auth/LoginForm.tsx`, `RegisterForm.tsx`, `PasswordResetForm.tsx` (form components, request-response)

**Analog:** `components/bip/BipFiltersSidebar.tsx` (closest 'use client' form component)

**`'use client'` + `useRouter`/`useSearchParams` pattern** (`components/bip/BipFiltersSidebar.tsx` lines 1–36):
```typescript
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
// ...

export function BipFiltersSidebar({ filters }: { filters: BipFilterState }) {
  const router = useRouter()
  const params = useSearchParams()
  const [, startTransition] = useTransition()
  // ...
}
```

**Auth form deviation — RHF + Zod pattern:**
Auth forms use `react-hook-form` + `zodResolver` instead of manual state. Pattern:
```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signInAction } from '@/lib/actions/auth'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})
type LoginFormValues = z.infer<typeof loginSchema>

export function LoginForm() {
  const form = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) })
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(values: LoginFormValues) {
    const formData = new FormData()
    formData.set('email', values.email)
    formData.set('password', values.password)
    const result = await signInAction(formData)
    if (result?.error) setError(result.error)
  }

  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>
}
```

**Validation schema analog** (`lib/filters/parseSearchParams.ts` lines 1–70):
```typescript
import { z } from 'zod' // Zod v3 — see CLAUDE.md

export const BipFilterSchema = z.object({
  country: csvArray(countryIsos),
  field: csvArray(fieldIds),
  // ...
})
```

---

### `components/dashboard/DashboardNav.tsx` (nav component, request-response)

**Analog:** `components/home/StickyNav.tsx`

**Nav structure pattern** (`components/home/StickyNav.tsx` lines 38–135):
```typescript
export function StickyNav() {
  const pathname = usePathname()
  return (
    <header
      className="sticky top-0 z-50 h-[68px] w-full border-b border-border bg-white/85 backdrop-blur-md backdrop-saturate-150"
      role="navigation"
      aria-label="Primary"
    >
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-ink">
          <LogoMark />
          <span className="text-base">BipHub</span>
        </Link>
        {/* right side */}
        <div className="flex items-center gap-2">
          <Link href="/login" ...><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link href="/register"><Button variant="primary" size="sm">List your BIP</Button></Link>
        </div>
      </div>
    </header>
  )
}
```

**Logo import pattern** (`components/home/StickyNav.tsx` line 19):
```typescript
import { LogoMark } from './LogoMark'
```

**DashboardNav deviation — D-14:** RSC (no `usePathname` needed). Logo links to `/`. Right side: coordinator initials avatar + sign-out button (sign-out is a Server Action form). No Sheet drawer. Props: `{ initials: string; fullName: string }`.

---

### `components/dashboard/DashboardBipCard.tsx` (card component, CRUD)

**Analog:** `components/bip/BipCard.tsx` — exact role match

**Card structure pattern** (`components/bip/BipCard.tsx` lines 40–160):
```typescript
export function BipCard({ bip }: BipCardProps) {
  const gradientClass = GRADIENT_VARIANTS[hashId(bip.id) % 3]
  // ...
  return (
    <Link
      href={`/bip/${bip.slug}`}
      className={cn(
        'group flex flex-col rounded-lg border border-border overflow-hidden bg-white',
        'transition-all duration-200 ease',
        'hover:border-eu-blue hover:-translate-y-0.5 hover:shadow-md',
      )}
    >
      {/* Gradient header */}
      <div className={cn('relative h-[140px] flex-shrink-0', gradientClass)}>
        {/* pills */}
      </div>
      {/* Card body */}
      <div className="flex flex-1 flex-col p-5 pt-4">
        {/* field chip, title, university, meta row */}
      </div>
    </Link>
  )
}
```

**Status badge lookup pattern** (from RESEARCH.md, Tailwind v4 static class requirement):
```typescript
// lib/utils/status.ts
// NEVER use template literals — Tailwind v4 purges dynamic strings.
export const STATUS_BADGE_CLASSES: Record<string, string> = {
  draft:    'bg-status-draft-bg    text-status-draft    border-status-draft',
  pending:  'bg-status-pending-bg  text-status-pending  border-status-pending',
  approved: 'bg-status-approved-bg text-status-approved border-status-approved',
  rejected: 'bg-status-rejected-bg text-status-rejected border-status-rejected',
}
```

**DashboardBipCard deviation:** Replace `<Link>` wrapper with `<div>` (clicking card is not the primary action; action buttons are). Add status badge. Add per-status action buttons (Edit, Delete, Withdraw, View). Do NOT show `is_seed` Demo pill — coordinator cards show real data only (CONTEXT.md "Specifics"). Rejection reason rendered inline as a gold-left-border callout for `status === 'rejected'`.

**`cn` import** (`components/bip/BipCard.tsx` line 27):
```typescript
import { cn } from '@/lib/utils/cn'
```

---

### `components/dashboard/DashboardBipList.tsx` (list + tabs, CRUD)

**Analog:** `components/bip/BipGrid.tsx` (list-with-filtering pattern) + `BipFiltersSidebar.tsx` (URL param update pattern)

**URL param update pattern** (`components/bip/BipFiltersSidebar.tsx` lines 38–44):
```typescript
const update = (key: string, value: string | undefined) => {
  const next = new URLSearchParams(params)
  if (value === undefined || value === '') next.delete(key)
  else next.set(key, value)
  next.delete('page')
  startTransition(() => {
    router.push(next.toString() ? `/bips?${next}` : '/bips')
  })
}
```

**DashboardBipList pattern:** `'use client'`. Accepts `bips: BipWithRelations[]` from RSC parent. Reads `?status=` from `useSearchParams()`. Uses `shadcn Tabs` to filter client-side. Tab counts derived from `bips.filter(b => b.status === tab).length`.

---

### `components/forms/BipSubmissionWizard.tsx` (multi-step wizard, CRUD)

**Analog:** `components/bip/BipFiltersSidebar.tsx` (closest 'use client' stateful component)

**Core wizard pattern (from RESEARCH.md Code Examples):**
```typescript
'use client'

import { useEffect, useState } from 'react'
import { useBipDraft } from '@/lib/store/bip-draft'
import { useDebouncedCallback } from 'use-debounce'
import { saveDraftAction } from '@/lib/actions/bips'
import { createClient } from '@/lib/supabase/client'

export function BipSubmissionWizard({ initialBipId }: { initialBipId?: string }) {
  const {
    bipId, currentStep, draft, lastKnownUpdatedAt,
    hydrated, hydrate, setBipId, setCurrentStep, mergeDraft,
    setLastKnownUpdatedAt, setSaveStatus, persistToLocalStorage,
  } = useBipDraft()

  const [showConflictModal, setShowConflictModal] = useState(false)

  useEffect(() => { hydrate() }, [hydrate])  // localStorage hydration on mount

  // Session expiry listener (SUBM-07)
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        persistToLocalStorage()
        // toast + redirect
      }
    })
    return () => subscription.unsubscribe()
  }, [persistToLocalStorage])

  // Debounced auto-save (1.5s after field blur — D-02)
  const debouncedSave = useDebouncedCallback(async (stepData) => {
    setSaveStatus('saving')
    const result = await saveDraftAction(stepData, bipId, lastKnownUpdatedAt)
    if (result.error === 'conflict') { setShowConflictModal(true); setSaveStatus('failed'); return }
    if (result.error) { setSaveStatus('failed'); return }
    setBipId(result.bipId)
    setLastKnownUpdatedAt(result.updatedAt)
    setSaveStatus('idle')
  }, 1500)
}
```

**Browser client import** (`lib/supabase/client.ts` lines 1–15):
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

---

### `lib/store/bip-draft.ts` (Zustand store, event-driven)

**Analog:** `lib/store/bookmarks.ts` — exact match

**Complete bookmarks store pattern** (`lib/store/bookmarks.ts` lines 1–75):
```typescript
import { create } from 'zustand'

const STORAGE_KEY = 'biphub:bookmarks'

type BookmarksState = {
  slugs: Set<string>
  hydrated: boolean
  toggle: (slug: string) => void
  hydrate: () => void
}

export const useBookmarks = create<BookmarksState>((set, get) => ({
  slugs: new Set(),
  hydrated: false,

  hydrate: () => {
    if (typeof window === 'undefined') return
    if (get().hydrated) return  // only hydrate once
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) { set({ hydrated: true }); return }
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        set({ slugs: new Set(parsed.filter((x): x is string => typeof x === 'string')), hydrated: true })
      } else {
        set({ hydrated: true })  // corrupted — reset
      }
    } catch {
      set({ hydrated: true })  // JSON.parse error — best-effort
    }
  },

  toggle: (slug: string) => {
    const next = new Set(get().slugs)
    if (next.has(slug)) next.delete(slug); else next.add(slug)
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)))
      } catch { /* quota exceeded — best-effort */ }
    }
    set({ slugs: next })
  },
}))
```

**Key patterns to copy:**
- `typeof window === 'undefined'` guard before all localStorage access (SSR safety)
- `if (get().hydrated) return` — hydrate exactly once
- `try/catch` around `JSON.parse` and `localStorage.setItem`
- `create<StateType>((set, get) => ({...}))` — Zustand v5 pattern

**Draft store additions beyond bookmarks pattern:**
- `DRAFT_STORAGE_KEY = 'biphub:draft'`
- `bipId`, `currentStep`, `lastKnownUpdatedAt`, `saveStatus` state fields
- `mergeDraft(partial)` action: `set((s) => ({ draft: { ...s.draft, ...partial } }))`
- `persistToLocalStorage()` called explicitly on `SIGNED_OUT` (NOT auto-persisted on every change)
- `clearDraft()` removes localStorage entry and resets all state

---

### `lib/actions/auth.ts` (server actions, request-response)

**Analog:** `lib/queries/bips.ts` (Supabase client usage pattern)

**`createClient()` usage in data layer** (`lib/queries/bips.ts` lines 19–21):
```typescript
export async function getBips(filters: BipFilterState): Promise<BipsQueryResult> {
  const supabase = await createClient()
  // ...
}
```

**Server action pattern (from RESEARCH.md Pattern 2):**
```typescript
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function signInAction(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  if (error) return { error: error.message }
  redirect('/dashboard')
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
```

**Critical:** `'use server'` at the top of the file (not per-function). All functions in the file become server actions. `createClient()` must be `await`-ed on every call (not cached at module level).

---

### `lib/actions/bips.ts` (server actions, CRUD)

**Analog:** `lib/queries/bips.ts` (Supabase query pattern)

**getClaims + Supabase query pattern** (`lib/queries/bips.ts` lines 19–44):
```typescript
export async function getBips(filters: BipFilterState): Promise<BipsQueryResult> {
  const supabase = await createClient()
  const query = supabase
    .from('bips')
    .select(baseSelect, { count: 'exact' })
  const { data, error, count } = await applyFilters(query, filters)
  if (error) { throw error }
  // ...
}
```

**saveDraftAction core pattern (from RESEARCH.md Pattern 7):**
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'

export async function saveDraftAction(
  stepData: Partial<BipDraftData>,
  bipId: string | null,
  lastKnownUpdatedAt: string | null,
): Promise<SaveDraftResult> {
  const supabase = await createClient()
  const { data: { claims }, error: authError } = await supabase.auth.getClaims()
  if (authError || !claims) return { error: 'auth' }

  if (bipId && lastKnownUpdatedAt) {
    // UPDATE with optimistic locking (SUBM-06)
    const { data, error } = await supabase
      .from('bips')
      .update({ ...stepData, updated_at: new Date().toISOString() })
      .eq('id', bipId)
      .eq('created_by', claims.sub)
      .eq('updated_at', lastKnownUpdatedAt)  // the lock
      .select('id, updated_at')
      .single()
    if (error) return { error: 'unknown', message: error.message }
    if (!data) return { error: 'conflict' }  // 0 rows = stale timestamp
    return { success: true, bipId: data.id, updatedAt: data.updated_at }
  }

  // INSERT (no bipId yet)
  const { data, error } = await supabase
    .from('bips')
    .insert({ ...stepData, created_by: claims.sub, status: 'draft', slug: tempSlug })
    .select('id, updated_at')
    .single()
  if (error) return { error: 'unknown', message: error.message }
  return { success: true, bipId: data.id, updatedAt: data.updated_at }
}
```

**Slug pitfall (RESEARCH.md Pitfall 3):** `bips.slug` is NOT NULL. Generate `draft-${slugify(title ?? 'bip')}-${crypto.randomUUID().slice(0, 8)}` on first INSERT. Finalize slug in `submitBipAction`.

---

### `lib/actions/profile.ts` (server action, CRUD)

**Analog:** `lib/queries/bips.ts` (createClient + getClaims pattern — same as above)

**Profile upsert pattern:**
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function saveProfileAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { claims }, error: authError } = await supabase.auth.getClaims()
  if (authError || !claims) return { error: 'auth' }

  // RLS: profiles_insert_own (with check id = auth.uid()) + profiles_update_own_or_admin
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: claims.sub,  // CRITICAL: must match auth.uid() for RLS to pass
      full_name: formData.get('full_name') as string,
      contact_email: formData.get('contact_email') as string,
      university_id: formData.get('university_id') as string,
      erasmus_code: formData.get('erasmus_code') as string,
    })
  if (error) return { error: error.message }
  redirect('/dashboard')
}
```

**University insert:** Call `supabase.rpc('insert_university_if_not_exists', { p_name, p_country, p_erasmus_code })` using the anon-key client (not admin client). The SECURITY DEFINER function handles the RLS bypass server-side.

---

### `lib/actions/universities.ts` (server action, request-response)

**Analog:** `lib/queries/bips.ts` (Supabase query pattern)

**Pattern:**
```typescript
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

**Note:** `universities_select_public` RLS policy (migration `00006_rls_policies.sql` lines 18–21) allows anon + authenticated to read. No `getClaims()` required for search.

---

### `lib/schemas/auth.ts`, `lib/schemas/profile.ts`, `lib/schemas/bip-wizard.ts` (Zod schemas, transform)

**Analog:** `lib/filters/parseSearchParams.ts` — same Zod v3 pattern

**Zod v3 schema pattern** (`lib/filters/parseSearchParams.ts` lines 1–50):
```typescript
import { z } from 'zod' // Zod v3 — see CLAUDE.md

export const BipFilterSchema = z.object({
  country: csvArray(countryIsos),
  sort: z.enum(SORT_OPTIONS).default('deadline-soonest'),
  page: z.coerce.number().int().min(1).default(1),
})
export type BipFilterState = z.infer<typeof BipFilterSchema>
```

**Auth schema pattern:**
```typescript
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
export type LoginFormValues = z.infer<typeof loginSchema>

export const registerSchema = loginSchema.extend({
  password: z.string().min(8).max(72),  // bcrypt 72-char limit
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
```

**Critical:** Import `z` from `'zod'` — never from `'zod/v4'`. Zod v4 is NOT installed; `@hookform/resolvers` v3.x has TS overload failures with Zod 4 (CLAUDE.md locked decision).

---

### `supabase/migrations/00009_profiles_erasmus_code.sql` (migration)

**Analog:** `supabase/migrations/00006_rls_policies.sql` (migration structure)

**Migration header pattern** (`supabase/migrations/00006_rls_policies.sql` lines 1–9):
```sql
-- 00006_rls_policies.sql
-- Full RLS policy set for Phase 1. Every UPDATE policy MUST declare both
-- USING and WITH CHECK (PITFALLS Pitfall 5; CLAUDE.md critical never-do).
```

**`ADD COLUMN` pattern** (`supabase/migrations/00002_universities_profiles.sql` lines 12–34):
```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  -- ...
);
alter table public.profiles enable row level security;
```

**SECURITY DEFINER function pattern** (`supabase/migrations/00002_universities_profiles.sql` lines 43–60):
```sql
create or replace function public.sync_role_to_app_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                          || jsonb_build_object('role', new.role)
  where id = new.id;
  return new;
end;
$$;
```

**Migration 00009 content:**
```sql
-- 00009_profiles_erasmus_code.sql
-- Adds erasmus_code column to profiles (required for /onboarding form, D-05).
-- Also creates SECURITY DEFINER function for coordinator university inserts,
-- replacing the admin-only universities_insert_admin RLS policy for this path.

-- 1. Add missing column to profiles
alter table public.profiles add column if not exists erasmus_code text;

-- 2. SECURITY DEFINER function for coordinator university self-registration
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
declare v_id uuid;
begin
  -- Server-side validation (mirrors Zod schema)
  if length(trim(p_name)) < 2 then raise exception 'University name too short'; end if;
  -- Check existing (case-insensitive)
  select id into v_id from public.universities
  where lower(trim(name)) = lower(trim(p_name)) and country = p_country limit 1;
  if v_id is null then
    insert into public.universities(name, country, erasmus_code)
    values (trim(p_name), p_country, nullif(trim(coalesce(p_erasmus_code,'')),'' ))
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- Grant to authenticated only (not anon)
grant execute on function public.insert_university_if_not_exists(text, text, text) to authenticated;
```

---

### `middleware.ts` (modify existing, request-response)

**Self-analog:** `middleware.ts` lines 1–53

**Current middleware pattern** (`middleware.ts` lines 26–37):
```typescript
export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)

  // CRITICAL: getClaims() validates the JWT signature on every request.
  // NEVER use getSession() in server code (PITFALLS Pitfall 1).
  await supabase.auth.getClaims()

  return response
}
```

**Phase 2 additions (from RESEARCH.md Pattern 4 + Pitfall 2):**
```typescript
export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request)

  const { data: { claims } } = await supabase.auth.getClaims()

  const { pathname } = request.nextUrl

  // Inject x-pathname for RSC layout to read (Pitfall 2 prevention)
  response.headers.set('x-pathname', pathname)

  // Phase 2: guard /dashboard and /onboarding — redirect to /login if no session
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
// DO NOT change the matcher config
```

**Matcher is unchanged** (`middleware.ts` lines 42–53). The existing matcher already excludes `/login`, `/register`, `/auth`. No modification needed.

---

### `components/home/StickyNav.tsx` (modify existing, request-response)

**Self-analog:** `components/home/StickyNav.tsx` lines 1–135

**Current right-side CTA pattern** (`components/home/StickyNav.tsx` lines 75–82):
```typescript
<div className="flex items-center gap-2">
  <Link href="/login" className="hidden md:inline-flex">
    <Button variant="ghost" size="sm">Sign in</Button>
  </Link>
  <Link href="/register">
    <Button variant="primary" size="sm">List your BIP</Button>
  </Link>
  {/* Mobile Sheet */}
</div>
```

**Phase 2 addition — D-15 props (from RESEARCH.md Pattern 9):**
```typescript
interface StickyNavProps {
  hasClaims?: boolean
  initials?: string | null
}

export function StickyNav({ hasClaims = false, initials }: StickyNavProps) {
  // ...existing code...
  // Replace right-side div with:
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
      <Link href="/login" className="hidden md:inline-flex">
        <Button variant="ghost" size="sm">Sign in</Button>
      </Link>
      <Link href="/register">
        <Button variant="primary" size="sm">List your BIP</Button>
      </Link>
    </>
  )}
```

---

### `app/(public)/layout.tsx` (modify existing, request-response)

**Self-analog:** `app/(public)/layout.tsx` lines 1–37

**Current layout (no auth)** (`app/(public)/layout.tsx` lines 17–37):
```typescript
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">Skip to main content</a>
      <StickyNav />
      <main id="main" className="min-h-[calc(100vh-68px)]">{children}</main>
      <Footer />
      <Toaster position="bottom-right" richColors={false} closeButton />
    </>
  )
}
```

**Phase 2 addition — D-15 (from RESEARCH.md Pattern 9):**
```typescript
import { createClient } from '@/lib/supabase/server'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { claims } } = await supabase.auth.getClaims()
  const hasClaims = Boolean(claims)
  const initials = null  // Phase 2: derive from profile query if needed

  return (
    <>
      <a href="#main" className="skip-link">Skip to main content</a>
      <StickyNav hasClaims={hasClaims} initials={initials} />
      <main id="main" className="min-h-[calc(100vh-68px)]">{children}</main>
      <Footer />
      <Toaster position="bottom-right" richColors={false} closeButton />
    </>
  )
}
```

**Note:** `PublicLayout` becomes `async` (adds `getClaims()` call). `StickyNav` remains `'use client'` — it receives serializable props (`boolean`, `string | null`) from the RSC layout. This is the standard RSC-passes-data-to-client-component pattern (RESEARCH.md Pitfall 5).

---

## Shared Patterns

### Pattern A: `createClient()` + `getClaims()` — All Server Actions and RSC Layouts

**Source:** `lib/supabase/server.ts` lines 17–40 + `middleware.ts` lines 29–34

**Apply to:** `lib/actions/auth.ts`, `lib/actions/bips.ts`, `lib/actions/profile.ts`, `app/(dashboard)/layout.tsx`

```typescript
// At the top of every server action / RSC that gates access:
const supabase = await createClient()
const { data: { claims }, error } = await supabase.auth.getClaims()
if (error || !claims) return { error: 'auth' }  // or redirect('/login') in layouts
```

**Never:** `supabase.auth.getSession()` — does not validate JWT signature (CLAUDE.md critical never-do).

---

### Pattern B: Zod v3 Schema Definition

**Source:** `lib/filters/parseSearchParams.ts` lines 1–70

**Apply to:** `lib/schemas/auth.ts`, `lib/schemas/profile.ts`, `lib/schemas/bip-wizard.ts`

```typescript
import { z } from 'zod'  // Zod v3 — NEVER from 'zod/v4'

export const schema = z.object({ /* fields */ })
export type SchemaValues = z.infer<typeof schema>
```

**Never:** `import { z } from 'zod/v4'` or `z.string().email({ message: ... })` Zod v4 API.

---

### Pattern C: Zustand Manual Hydration

**Source:** `lib/store/bookmarks.ts` lines 29–75

**Apply to:** `lib/store/bip-draft.ts`

```typescript
// Hydration safety: call hydrate() in useEffect, NEVER in render
hydrate: () => {
  if (typeof window === 'undefined') return
  if (get().hydrated) return  // only once
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    // ... parse and set
  } catch {
    set({ hydrated: true })
  }
},
```

**In components:** `useEffect(() => { hydrate() }, [hydrate])` — never call `hydrate()` synchronously.

---

### Pattern D: Tailwind v4 Static Class Lookups

**Source:** `components/bip/BipCard.tsx` lines 30–34 (GRADIENT_VARIANTS), `lib/filters/parseSearchParams.ts` (STATUS_FILTER_OPTIONS const)

**Apply to:** `lib/utils/status.ts`, any component with dynamic status/variant classes

```typescript
// CORRECT — static strings, Tailwind v4 scanner finds these at build time
const STATUS_BADGE_CLASSES: Record<string, string> = {
  draft: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  // ...
}
const cls = STATUS_BADGE_CLASSES[bip.status] ?? ''

// WRONG — Tailwind v4 purges this in production
const cls = `bg-${status}-50 text-${status}-700`
```

---

### Pattern E: EU Brand CSS Classes

**Source:** `components/bip/BipCard.tsx` lines 60–67, `components/home/StickyNav.tsx` lines 42–47

**Apply to:** All Phase 2 components

```typescript
// Colors: bg-eu-blue, text-eu-blue, border-eu-blue, bg-eu-gold, text-eu-gold
// Background: bg-[#f7f8fc] (soft), bg-white (cards)
// Shadow: shadow-sm (cards), shadow-md (hover/elevated)
// Border radius: rounded-lg (cards), rounded-pill (chips/CTAs)
// Font: text-ink (primary), text-ink-2 (secondary), text-muted (tertiary)
// Focus: focus-visible:ring-2 focus-visible:ring-eu-blue focus-visible:ring-offset-2
```

---

### Pattern F: INFO-03 Disclaimer on Every Page

**Source:** `components/home/Footer.tsx` lines 77–79

**Apply to:** `app/(auth)/layout.tsx`, `app/(dashboard)/layout.tsx`

```typescript
// The public Footer renders the disclaimer for (public) pages.
// (auth) and (dashboard) pages do NOT use Footer — must render inline:
<p className="text-xs text-white/60">
  Independent project — not affiliated with the European Commission
</p>
```

---

### Pattern G: `motion/react` + `LazyMotion` for Animations

**Source:** CLAUDE.md (never-do: `framer-motion`) + RESEARCH.md

**Apply to:** `components/forms/BipSubmissionWizard.tsx` (step transitions), `components/dashboard/DashboardBipCard.tsx` (status chip animations)

```typescript
// NEVER: import { motion } from 'framer-motion'
// CORRECT:
import { LazyMotion, domAnimation, m } from 'motion/react'

// Wrap animated sections:
<LazyMotion features={domAnimation}>
  <m.div animate={{ opacity: 1 }} initial={{ opacity: 0 }}>
    {/* content */}
  </m.div>
</LazyMotion>
```

---

## No Analog Found

Files with no close match in the codebase (planner references RESEARCH.md patterns instead):

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `components/forms/SaveStatusIndicator.tsx` | component (status indicator) | event-driven | No existing save-state indicator component in codebase |
| `components/forms/TwoTabConflictDialog.tsx` | component (modal) | event-driven | No dialog components exist yet; uses new shadcn `dialog` component |
| `app/(auth)/reset-password/page.tsx` | page | request-response | Closely follows auth page pattern but no exact analog for password update flow |
| `components/bip/BookmarkHeartIsland.tsx` | — | — | Existing file — reviewed as context for island pattern; not a new file |

---

## Metadata

**Analog search scope:** `app/`, `components/`, `lib/`, `supabase/migrations/`
**Files scanned:** 42 existing source files
**Key decisions carried from RESEARCH.md into patterns:**
- University insert uses SECURITY DEFINER function via `supabase.rpc()` (not `createAdminClient`)
- `x-pathname` middleware header injection to prevent dashboard layout infinite redirect (Pitfall 2)
- `StickyNav` stays `'use client'`; `(public)/layout.tsx` becomes `async` RSC passing `hasClaims` prop
- `bip-draft.ts` store uses explicit `persistToLocalStorage()` (not auto-persist on every change)
- Slug generated as `draft-{slugify}-{uuid-prefix}` on first INSERT; finalized at `submitBipAction`
**Pattern extraction date:** 2026-05-09
