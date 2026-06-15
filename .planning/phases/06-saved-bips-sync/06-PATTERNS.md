# Phase 6: Saved BIPs Sync - Pattern Map

**Mapped:** 2026-06-15
**Files analyzed:** 13 new/modified files
**Analogs found:** 13 / 13

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `supabase/migrations/00016_saved_bips.sql` | migration | CRUD | `supabase/migrations/00015_student_role.sql` + `00002_universities_profiles.sql` | exact |
| `lib/actions/saved-bips.ts` | service (Server Actions) | request-response | `lib/actions/account.ts` | exact |
| `lib/queries/savedBips.ts` | utility (query layer) | CRUD | `lib/queries/bips.ts` | exact |
| `components/bip/SaveToggleIsland.tsx` | component (client island) | event-driven | `components/dashboard/DeleteAccountDialog.tsx` | role-match |
| `components/bip/BipCard.tsx` (modify) | component (RSC) | request-response | self (current: `components/bip/BipCard.tsx`) | exact |
| `components/bip/BipGrid.tsx` (modify) | component (RSC) | request-response | self (current: `components/bip/BipGrid.tsx`) | exact |
| `app/(student)/student-dashboard/saved/page.tsx` | controller (RSC page) | CRUD | `app/(student)/student-dashboard/page.tsx` | exact |
| `app/(student)/student-dashboard/page.tsx` (modify) | controller (RSC page) | CRUD | self (current: `app/(student)/student-dashboard/page.tsx`) | exact |
| `app/(public)/bips/page.tsx` (modify) | controller (RSC page) | CRUD | self (current: `app/(public)/bips/page.tsx`) | exact |
| `app/(public)/bip/[slug]/page.tsx` (modify) | controller (RSC page) | CRUD | self (current: `app/(public)/bip/[slug]/page.tsx`) | exact |
| `app/(public)/privacy/page.tsx` (modify) | controller (static RSC) | request-response | self (current: `app/(public)/privacy/page.tsx`) | exact |
| `tests/schemas/saved-bips.test.ts` | test (unit) | — | `tests/schemas/admin-bips.test.ts` | exact |
| `tests/e2e/saved-bips.spec.ts` | test (E2E) | — | `tests/e2e/student-auth.spec.ts` | exact |

---

## Pattern Assignments

### `supabase/migrations/00016_saved_bips.sql` (migration, CRUD)

**Primary analog:** `supabase/migrations/00002_universities_profiles.sql` (table + ON DELETE CASCADE FK + RLS enable)
**Secondary analog:** `supabase/migrations/00015_student_role.sql` (policy syntax with `(select auth.uid())` subquery form + role-based admin read)

**Table + FK + RLS-enable pattern** (`00002_universities_profiles.sql` lines 12–37):
```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  ...
);
alter table public.profiles enable row level security;
```

**Own-data policy pattern — `(select auth.uid())` subquery form** (`00006_rls_policies.sql` lines 62–66):
```sql
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);
```

**Admin-read policy pattern** (`00006_rls_policies.sql` lines 54–60):
```sql
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (
    (select auth.uid()) = id
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
```

**SECURITY DEFINER function pattern** (`00013_delete_my_account.sql` lines 25–30):
```sql
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
```

**Migration-specific notes for 00016:**
- The authoritative DDL is in `ARCHITECTURE.md` lines 166–204 (cited in RESEARCH.md). Copy verbatim.
- Must include `create index saved_bips_user_id_idx` and `saved_bips_bip_id_idx` in the same file (PITFALLS Pitfall 4).
- No UPDATE policy — save/unsave is insert/delete only (D-06).
- Use `(select auth.uid()) = user_id` (not role-check) for INSERT/SELECT/DELETE own-data policies (PITFALLS Pitfall 2 in RESEARCH.md).
- Admin SELECT policy uses `auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'` (same as existing policies).

---

### `lib/actions/saved-bips.ts` (service, request-response)

**Analog:** `lib/actions/account.ts` (lines 1–97 — full file; already read)

**File-level directive + imports pattern** (`account.ts` lines 1–20):
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
```

**`getClaims()` auth check pattern** (`account.ts` lines 45–51):
```typescript
const supabase = await createClient()
const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims()
if (claimsErr || !claimsData?.claims?.sub) {
  redirect('/login')
}
const claims = claimsData.claims
const userId = claims.sub
```

**Zod schema validation pattern** (`account.ts` lines 21–23 + `lib/schemas/admin-bips.ts` lines 12–14):
```typescript
// account.ts — email schema
const DeleteAccountSchema = z.object({
  typedEmail: z.string().email('Type your account email to confirm.'),
})

// admin-bips.ts — UUID schema (copy this for SaveBipSchema)
export const ApproveBipSchema = z.object({
  bipId: z.string().uuid({ message: 'Invalid BIP id.' }),
  note: z.string().max(500, 'Note must be at most 500 characters.').optional(),
})
```

**Supabase mutation + error return pattern** (`account.ts` lines 78–81):
```typescript
const { error: rpcErr } = await supabase.rpc('delete_my_account')
if (rpcErr) {
  throw new Error(`Account deletion failed: ${rpcErr.message}`)
}
```

**Action-specific notes for `saved-bips.ts`:**
- Three exports: `saveAction(bipId)`, `unsaveAction(bipId)`, `migrateLegacyBookmarksAction(ids[])`.
- `saveAction` uses `.upsert({ onConflict: 'user_id,bip_id', ignoreDuplicates: true })` (not `.insert()`) for double-click safety (RESEARCH.md Pattern 4).
- `unsaveAction` uses `.delete().eq('user_id', userId).eq('bip_id', bipId)`.
- `migrateLegacyBookmarksAction` validates each ID against `bips` table before upsert; uses `ON CONFLICT DO NOTHING`.
- Do NOT call `revalidatePath('/bips')` from save/unsave — ISR must not be busted per user save (RESEARCH.md Pitfall 4). Only call `revalidatePath('/student-dashboard/saved')` from unsaveAction if needed.
- Return type: `Promise<{ error?: string }>` (not `never` — no redirect on mutation).

---

### `lib/queries/savedBips.ts` (utility, CRUD)

**Analog:** `lib/queries/bips.ts` (lines 1–60) + `lib/queries/bipDetail.ts` (lines 1–60)

**Query file imports pattern** (`bips.ts` lines 1–4):
```typescript
import { createClient } from '@/lib/supabase/server'
import { applyFilters } from '@/lib/filters/buildSupabaseQuery'
import type { BipFilterState } from '@/lib/filters/parseSearchParams'
import type { Bip, BipWithRelations } from '@/lib/types/bip'
```

**Single-table select with filter pattern** (`bips.ts` lines 35–49):
```typescript
const supabase = await createClient()
const query = supabase
  .from('bips')
  .select(baseSelect, { count: 'exact' })
const { data, error, count } = await applyFilters(query, filters)
if (error) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[getBips] query failed, returning empty result:', error)
    return { rows: [], total: 0, totalCountries: 0 }
  }
  throw error
}
```

**Relational embed select pattern** (`bipDetail.ts` implicit from type shape — foreign-table join via PostgREST embedding):
```typescript
// Pattern for saved-list join: saved_bips → bips → host_university
const { data, error } = await supabase
  .from('saved_bips')
  .select(`
    saved_at,
    bips:bip_id (
      id, slug, title, ...,
      host_university:universities!host_university_id (id, name, country, city, erasmus_code)
    )
  `)
  .eq('user_id', userId)
  .order('saved_at', { ascending: false })
```

**Query file exports for `savedBips.ts`:**
- `getSavedBipIds(userId: string | null): Promise<Set<string>>` — batch fetch for `/bips` page; returns Set for O(1) lookup per card.
- `getSavedBips(userId: string): Promise<BipWithRelations[]>` — for saved list page; joins through `saved_bips → bips`; filters `status = 'approved'`; client-side null filter as fallback (RESEARCH.md Open Question 1).
- `getSavedBipsCount(userId: string): Promise<number>` — lightweight count for dashboard summary.
- `isBipSaved(userId: string, bipId: string): Promise<boolean>` — for `/bip/[slug]` detail page.

---

### `components/bip/SaveToggleIsland.tsx` (component, event-driven)

**Analog:** `components/dashboard/DeleteAccountDialog.tsx` (lines 1–121 — full file; already read)

**Client island directive + imports pattern** (`DeleteAccountDialog.tsx` lines 1–31):
```typescript
'use client'

import { useState, useTransition } from 'react'
import {
  Dialog, DialogContent, ...
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { deleteAccountAction } from '@/lib/actions/account'
```

**For `SaveToggleIsland.tsx`, the import block will be:**
```typescript
'use client'

import { useOptimistic, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { saveAction, unsaveAction } from '@/lib/actions/saved-bips'
import { cn } from '@/lib/utils/cn'
```

**`useTransition` + Server Action call + error toast pattern** (`DeleteAccountDialog.tsx` lines 40–58):
```typescript
const [isPending, startTransition] = useTransition()

async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault()
  const formData = new FormData(e.currentTarget)
  startTransition(async () => {
    try {
      await deleteAccountAction(formData)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Account deletion failed.',
      )
    }
  })
}
```

**`useOptimistic` adaptation** (React 19 built-in — no existing codebase example; use RESEARCH.md Pattern 2):
```typescript
const [optimisticSaved, setOptimisticSaved] = useOptimistic(initialSaved)

startTransition(async () => {
  const nextSaved = !optimisticSaved
  setOptimisticSaved(nextSaved)
  const result = nextSaved ? await saveAction(bipId) : await unsaveAction(bipId)
  if (result.error) {
    setOptimisticSaved(!nextSaved)  // revert
    toast.error(nextSaved
      ? 'Could not save this BIP. Please try again.'
      : 'Could not remove this BIP. Please try again.')
  }
})
```

**Static Tailwind class lookup pattern** (CLAUDE.md never-do: no template literals; use lookup objects):
```typescript
// Icon state classes — static strings only (CLAUDE.md constraint)
const ICON_CLASSES = {
  saved:   'fill-eu-blue text-eu-blue',
  unsaved: 'text-muted',
  pending: 'text-muted animate-pulse',
} as const
```

**Component-specific notes:**
- Props: `bipId: string`, `bipTitle: string`, `initialSaved: boolean`, `isStudent: boolean`, `displayStyle?: 'icon' | 'button'`, optional `className?: string`.
- Non-student click: `router.push('/register/student')` — no optimistic update.
- Use `lucide-react` `Heart` (not `@tabler/icons-react`) — `components.json` declares `iconLibrary: "lucide"` (UI-SPEC line 23).
- `aria-label`: "Save {bipTitle}" / "Unsave {bipTitle}"; `aria-pressed`: true/false.
- Minimum touch target: `min-h-[44px] min-w-[44px]` with flex centering (UI-SPEC line 47).

---

### `components/bip/BipCard.tsx` (component RSC — modify)

**Analog:** Self (`components/bip/BipCard.tsx` lines 1–196 — full file; already read)

**Current outer element** (`BipCard.tsx` lines 53–62):
```typescript
return (
  <Link
    href={`/bip/${bip.slug}`}
    className={cn(
      'group flex flex-col rounded-lg border border-border overflow-hidden bg-white',
      'transition-all duration-200 ease',
      'hover:border-eu-blue hover:-translate-y-0.5 hover:shadow-md',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eu-blue focus-visible:ring-offset-2',
    )}
  >
```

**Required refactor — outer `<div>`, `<Link>` as block child, `SaveToggleIsland` as sibling** (UI-SPEC lines 326–349):
```typescript
// After refactor:
<div className={cn(
  'group relative flex flex-col rounded-lg border border-border overflow-hidden bg-white',
  'transition-all duration-200 ease',
  'hover:border-eu-blue hover:-translate-y-0.5 hover:shadow-md',
)}>
  <Link
    href={`/bip/${bip.slug}`}
    className="flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-eu-blue focus-visible:ring-offset-2"
  >
    {/* header + body unchanged */}
  </Link>
  <SaveToggleIsland
    className="absolute bottom-3 right-3"
    bipId={bip.id}
    bipTitle={bip.title}
    initialSaved={initialSaved}
    isStudent={isStudent}
    displayStyle="icon"
  />
</div>
```

**Props change:** `BipCardProps` gains `initialSaved: boolean` and `isStudent: boolean`. Both are passed from the parent RSC (BipGrid / saved list page). `BipCard` itself stays a pure RSC — no `'use client'` directive.

**Gradient header** (`BipCard.tsx` line 64 — unchanged): `<div className={cn('relative h-[140px] flex-shrink-0', gradientClass)}>` — the `relative` class already exists; `SaveToggleIsland` at `absolute bottom-3 right-3` is positioned within this div.

---

### `components/bip/BipGrid.tsx` (component RSC — modify)

**Analog:** Self (`components/bip/BipGrid.tsx` lines 1–17 — full file; already read)

**Current signature** (lines 1–17):
```typescript
export function BipGrid({ bips }: { bips: BipWithRelations[] }) {
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="BIP search results">
      {bips.map((bip) => (
        <li key={bip.id}>
          <BipCard bip={bip} />
        </li>
      ))}
    </ul>
  )
}
```

**Required change:** Add `savedBipIds: Set<string>` and `isStudent: boolean` props; pass `initialSaved` and `isStudent` to each `BipCard`:
```typescript
export function BipGrid({
  bips,
  savedBipIds = new Set(),
  isStudent = false,
}: {
  bips: BipWithRelations[]
  savedBipIds?: Set<string>
  isStudent?: boolean
}) {
  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="BIP search results">
      {bips.map((bip) => (
        <li key={bip.id}>
          <BipCard bip={bip} initialSaved={savedBipIds.has(bip.id)} isStudent={isStudent} />
        </li>
      ))}
    </ul>
  )
}
```

---

### `app/(student)/student-dashboard/saved/page.tsx` (controller, CRUD)

**Analog:** `app/(student)/student-dashboard/page.tsx` (lines 1–97 — full file; already read)

**RSC page pattern — imports + metadata** (`student-dashboard/page.tsx` lines 1–25):
```typescript
import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Student dashboard · BipHub',
}
```

**getClaims + userId pattern** (`student-dashboard/page.tsx` lines 28–35):
```typescript
export default async function StudentDashboardPage() {
  const supabase = await createClient()
  const { data: claimsData } = await supabase.auth.getClaims()
  const claims = claimsData?.claims
  // ... use claims.sub for userId
}
```

**Card chrome pattern** (`student-dashboard/page.tsx` lines 64–75):
```typescript
<div className="rounded-lg border border-border bg-white shadow-sm p-6 flex flex-col gap-3">
  <h2 className="text-base font-semibold text-ink">Account</h2>
  ...
</div>
```

**Saved list page specifics:**
- Auth: `getClaims()` for userId; layout already guards role so this is a content read only (no redirect needed — mirrors dashboard pattern).
- Data: call `getSavedBips(userId)` from `lib/queries/savedBips.ts`.
- Grid: `<BipGrid bips={savedBips} savedBipIds={new Set(savedBips.map(b => b.id))} isStudent={true} />` — all cards start as saved.
- Empty state: `flex flex-col items-center gap-4 py-16 text-center` with 48px muted Heart icon, heading, body, CTA button (UI-SPEC Surface 3).
- h1: `text-[22px] font-semibold tracking-[-0.3px] text-ink` — same as dashboard shell h1.

---

### `app/(student)/student-dashboard/page.tsx` (controller, CRUD — modify)

**Analog:** Self (lines 1–97 — full file; already read)

**Sections to add:**

**Saved-BIPs summary card** (replaces lines 92–94 "coming soon" paragraph):
```typescript
{/* Saved BIPs summary — replaces lines 92-94 "coming soon" paragraph */}
<div className="rounded-lg border border-border bg-white shadow-sm p-6 flex flex-col gap-3">
  <div className="flex items-center justify-between">
    <h2 className="text-base font-semibold text-ink">Saved BIPs</h2>
    <Link href="/student-dashboard/saved" className="text-sm font-medium text-eu-blue hover:underline">
      View all →
    </Link>
  </div>
  <p className="text-sm text-muted">
    {savedCount === 0 ? 'No saved BIPs yet.' : `${savedCount} BIP${savedCount === 1 ? '' : 's'} saved`}
  </p>
</div>
```

**Account card delete control** (after the existing sign-out form, lines 67–75):
```typescript
{/* Divider + delete trigger */}
<div className="border-t border-border mt-3 pt-3">
  <DeleteAccountDialog accountEmail={email} />
</div>
```

**Data additions to the RSC:**
- Import `getSavedBipsCount` from `@/lib/queries/savedBips`.
- Import `DeleteAccountDialog` from `@/components/dashboard/DeleteAccountDialog`.
- Add `const savedCount = claims?.sub ? await getSavedBipsCount(claims.sub) : 0`.
- Add `LegacySweepIsland` import and render it as a null-UI child.

---

### `app/(public)/bips/page.tsx` (controller, CRUD — modify)

**Analog:** Self (lines 1–199 — full file; already read)

**ISR constraint** (line 56 — must be preserved): `export const revalidate = 3600`

**Batch query addition pattern** (after existing `getBips(filters)` call, around line 66):
```typescript
// Add after: const { rows, total, totalCountries } = await getBips(filters)
import { getSavedBipIds } from '@/lib/queries/savedBips'
// ... inside the page function:
const { data: claimsData } = await (await createClient()).auth.getClaims()
const userId = claimsData?.claims?.sub ?? null
const isStudent = claimsData?.claims?.app_metadata?.role === 'student'
const savedBipIds = await getSavedBipIds(userId)
```

**BipGrid call update** (current line 172: `<BipGrid bips={rows} />`):
```typescript
<BipGrid bips={rows} savedBipIds={savedBipIds} isStudent={isStudent} />
```

**ISR note:** `saveAction` must NOT call `revalidatePath('/bips')` — this page is ISR-cached and saved state is user-specific (RESEARCH.md Pitfall 4).

---

### `app/(public)/bip/[slug]/page.tsx` (controller, CRUD — modify)

**Analog:** Self (lines 1–80 already read; ISR pattern confirmed at lines 22 + 56)

**isBipSaved addition pattern:**
```typescript
// Add after getBipBySlug(slug):
import { isBipSaved } from '@/lib/queries/savedBips'
// Inside page function, after bip is resolved:
const { data: claimsData } = await (await createClient()).auth.getClaims()
const userId = claimsData?.claims?.sub ?? null
const isStudent = claimsData?.claims?.app_metadata?.role === 'student'
const initialSaved = userId && bip ? await isBipSaved(userId, bip.id) : false
```

**Pass to BipSidebar** (find where `<BipSidebar>` is rendered; add props):
```typescript
<BipSidebar ... initialSaved={initialSaved} isStudent={isStudent} bipId={bip.id} bipTitle={bip.title} />
```

---

### `app/(public)/privacy/page.tsx` (controller, static RSC — modify)

**Analog:** Self (lines 1–245 — full file; already read)

**`force-static` export** (line 26 — must be preserved):
```typescript
export const dynamic = 'force-static'
```

**Content paragraph pattern** (`privacy/page.tsx` lines 76–97 — existing `<p>` blocks with `<strong>` heading):
```typescript
<p>
  <strong className="text-ink">Saved BIPs.</strong>{' '}
  When a signed-in student saves a BIP, we store a{' '}
  <code>saved_bips</code> table row containing your user ID, the BIP&apos;s
  internal ID, and the timestamp of the save (<code>saved_at</code>). ...
</p>
```

**Replace stale biphub:bookmarks paragraph** (lines 89–97 — the existing localStorage paragraph mentions `biphub:bookmarks` as a live feature; update to "legacy sweep" framing per D-05):
```typescript
<p>
  <strong className="text-ink">Legacy bookmark sweep.</strong>{' '}
  On first sign-in, the app reads any <code>biphub:bookmarks</code> value
  previously stored in your browser&apos;s <code>localStorage</code> (from
  an earlier version of BipHub), migrates valid BIP IDs into your
  server-side saved list, then immediately clears the{' '}
  <code>localStorage</code> key. After this one-time sweep the key is not
  written again.
</p>
```

**Structural note:** The page uses `<section>` blocks with `<Eyebrow>` + `<h2>` + `<div className="mt-4 text-ink-2 leading-relaxed space-y-4">` wrapping `<p>` elements. The new paragraphs go inside the existing Section 2 "What we collect" `<div>`. No new imports, no new components — pure JSX content edit preserves `force-static`.

---

### `tests/schemas/saved-bips.test.ts` (test, unit)

**Analog:** `tests/schemas/admin-bips.test.ts` (lines 1–54 — full file; already read)

**Vitest test file structure** (`admin-bips.test.ts` lines 1–13):
```typescript
/**
 * [docblock describing what is tested and why]
 */
import { describe, it, expect } from 'vitest'
import { ApproveBipSchema, RejectBipSchema } from '@/lib/schemas/admin-bips'

const VALID_UUID = '11111111-2222-4333-8444-555555555555'
```

**`describe` + boundary test pattern** (`admin-bips.test.ts` lines 16–53):
```typescript
describe('ApproveBipSchema', () => {
  it('accepts a valid uuid + omitted note', () => {
    expect(ApproveBipSchema.parse({ bipId: VALID_UUID })).toEqual({ bipId: VALID_UUID })
  })
  it('rejects a non-uuid bipId', () => {
    expect(() => ApproveBipSchema.parse({ bipId: 'not-a-uuid' })).toThrow()
  })
})
```

**Tests to implement for STUD-06 acceptance** (RESEARCH.md Code Example — Vitest Unit Test Pattern):
- "validates bip IDs against the bips table — unknown slugs are skipped"
- "is idempotent — calling twice with same IDs produces one saved_bips row" (`ON CONFLICT DO NOTHING`)
- "no-ops when localStorage key is absent"
- "clears the localStorage key on success"

**Note:** The sweep logic under test is the pure validation path (slug → UUID filter) extracted as a testable function. The full Supabase upsert path is tested at E2E level (FOUN-09).

---

### `tests/e2e/saved-bips.spec.ts` (test, E2E)

**Analog:** `tests/e2e/student-auth.spec.ts` (lines 1–379 — full file; already read)

**E2E file structure** (`student-auth.spec.ts` lines 1–35):
```typescript
/**
 * [docblock with phase coverage, SC IDs, selector rationale]
 */
import { test, expect, type Page, type BrowserContext, type APIRequestContext } from '@playwright/test'

const STUDENT_EMAIL = 'e2e-student@biphub.test'
```

**`signInStudent` helper pattern** (`student-auth.spec.ts` lines 61–95) — reuse verbatim:
```typescript
async function signInStudent(page: Page): Promise<void> {
  // Step 1: obtain session via password auth (anon key, not service-role)
  // Step 2: encode in @supabase/ssr cookie format
  // Step 3: inject cookie
  // Step 4: navigate to /student-dashboard
}
```

**API-level RLS assertion pattern** (`student-auth.spec.ts` lines 273–299):
```typescript
test('bips insert blocked for student JWT', async ({ request }) => {
  const { accessToken, studentId, anonKey } = await getStudentSession(request)
  const insertResp = await request.post(`${supabaseUrl}/rest/v1/bips`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    data: { ... },
  })
  expect([401, 403]).toContain(insertResp.status())
})
```

**Tests to implement** (RESEARCH.md Validation Architecture):
- STUD-04: save persists after page reload (E2E, browser)
- STUD-04: unsave removes from saved list (E2E, browser)
- STUD-05: saved BIP appears after re-login (E2E, browser)
- STUD-07: `/student-dashboard/saved` shows saved BIPs (E2E, browser)
- FOUN-09: account deletion → no orphan rows in `saved_bips` (API assertion using service-role read after deletion)
- FOUN-10: `/privacy` page contains "Saved BIPs" text (E2E smoke)

**Playwright project extension:** Extend `playwright.config.ts` `student-authed` project `testMatch` to include `saved-bips.spec.ts`, or add a `student-saved` project reusing `storageState.student.json` (RESEARCH.md Open Question 3).

---

## Shared Patterns

### Authentication — `getClaims()` in Server Actions and RSC pages
**Source:** `lib/actions/account.ts` lines 45–51; `app/(student)/student-dashboard/page.tsx` lines 32–34
**Apply to:** `lib/actions/saved-bips.ts` (all three actions), `app/(student)/student-dashboard/saved/page.tsx`, `app/(public)/bips/page.tsx` (userId extraction), `app/(public)/bip/[slug]/page.tsx` (userId extraction)
```typescript
const supabase = await createClient()
const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims()
if (claimsErr || !claimsData?.claims?.sub) return { error: 'Not authenticated.' }
const userId = claimsData.claims.sub
```

### Supabase Client Factory — `await createClient()`
**Source:** `lib/supabase/server.ts` lines 17–40
**Apply to:** All new Server Actions and RSC data fetches
```typescript
// Must `await` — Next.js 15 cookies() is async (CLAUDE.md never-do: never sync cookies())
const supabase = await createClient()
```

### Error Handling — Server Action return type
**Source:** `lib/actions/account.ts` (throws on error + redirects); `components/dashboard/DeleteAccountDialog.tsx` (catches thrown error → toast)
**Apply to:** `saveAction`, `unsaveAction` — return `{ error?: string }` so the client island can toast without try/catch at the call site
```typescript
// Server Action: return error string, not throw
if (error) return { error: error.message }
return {}
// Client island: check result.error → toast.error(...)
```

### RLS Policy — `(select auth.uid())` subquery form
**Source:** `supabase/migrations/00006_rls_policies.sql` lines 54–66; `00015_student_role.sql` lines 132–140
**Apply to:** `supabase/migrations/00016_saved_bips.sql` all four policies
```sql
-- Subquery form (not direct auth.uid() call) for plan-cache performance
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id)
```

### Sonner Toast — error surface
**Source:** `components/dashboard/DeleteAccountDialog.tsx` lines 53–57
**Apply to:** `SaveToggleIsland.tsx` save/unsave error branch
```typescript
toast.error(
  err instanceof Error ? err.message : 'Could not save this BIP. Please try again.',
)
```

### Tailwind Static Class Lookup
**Source:** `BipCard.tsx` lines 27–31 (`GRADIENT_VARIANTS` as const array)
**Apply to:** `SaveToggleIsland.tsx` heart icon state classes
```typescript
const GRADIENT_VARIANTS = [
  'bg-[linear-gradient(135deg,#003399_0%,#1a4dab_100%)]',
  ...
] as const
// Pattern: static string arrays/objects, never template literals
```

### DeleteAccountDialog reuse
**Source:** `components/dashboard/DeleteAccountDialog.tsx` (full component — props: `accountEmail: string`)
**Apply to:** `app/(student)/student-dashboard/page.tsx` Account card (D-04)
```typescript
// Import and render verbatim — no prop changes
import { DeleteAccountDialog } from '@/components/dashboard/DeleteAccountDialog'
// In JSX:
<DeleteAccountDialog accountEmail={email} />
```

---

## No Analog Found

All files have close analogs. No new data flows or patterns not present in the codebase.

---

## Metadata

**Analog search scope:** `components/bip/`, `components/dashboard/`, `lib/actions/`, `lib/queries/`, `lib/schemas/`, `lib/supabase/`, `app/(student)/`, `app/(public)/`, `supabase/migrations/`, `tests/schemas/`, `tests/e2e/`
**Files scanned:** 23 (read in full or via targeted ranges)
**Pattern extraction date:** 2026-06-15
