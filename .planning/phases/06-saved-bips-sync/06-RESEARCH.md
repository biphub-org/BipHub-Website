# Phase 6: Saved BIPs Sync - Research

**Researched:** 2026-06-15
**Domain:** Supabase RLS + Next.js 15 Server Actions + React 19 useOptimistic + GDPR cascade
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 (user-locked):** Save/unsave is signed-in students only. Heart toggle on `BipCard` and `/bip/[slug]`. Saves are always server-side (`saved_bips` table). Signed-out or non-student click → route to `/register/student`, no modal. `BipCard` must remain RSC-based; toggle is a small additive client island.
- **D-01a:** The v1.0 Zustand `useBookmarkStore` / `localStorage['biphub:bookmarks']` write path was NEVER shipped. `ARCHITECTURE.md:164,255` is overridden. There is no anonymous localStorage fallback. The `saved_bips` DDL/RLS in `ARCHITECTURE.md` lines 166–204 remains authoritative.
- **D-06 (schema, locked by research):** Migration `00016_saved_bips.sql` follows `ARCHITECTURE.md` lines 166–204 verbatim. `saved_bips(id, user_id → auth.users ON DELETE CASCADE, bip_id → bips ON DELETE CASCADE, saved_at, unique(user_id, bip_id))`. RLS: `saved_bips_select_own`, `saved_bips_insert_own`, `saved_bips_delete_own`, `saved_bips_select_admin`. No UPDATE policy. Apply via `db push` to linked cloud project, then `gen types --linked`.

### Claude's Discretion

- **D-02:** STUD-06 localStorage migration is a best-effort, idempotent, one-time legacy sweep only. Client island reads `localStorage['biphub:bookmarks']` on first authenticated dashboard load, sends slugs/ids to a Server Action that upserts valid ones (`ON CONFLICT DO NOTHING`) into `saved_bips`, then clears the key. Silent no-op if key is absent (the expected case).
- **D-02a:** Because no v1.0 localStorage bookmark feature ever shipped, STUD-06 has no real data to migrate. Acceptance = idempotent sweep test with seeded fake key; NOT an E2E against a non-existent v1.0 UI.
- **D-03:** Saved list reuses the existing `BipCard` grid, sorted `saved_at desc`. Each card gets unsave affordance (filled heart → remove). Metadata is read live from `bips` at render.
- **D-03a:** Saved BIPs whose source row is not `status = 'approved'` are silently excluded from the rendered list. The `saved_bips` row is retained.
- **D-03b:** Empty state = friendly message + "Browse BIPs →" CTA. No pagination (students realistically save < 100). Dashboard "coming soon" paragraph (lines 92–94 in `page.tsx`) is replaced with Saved-BIPs summary section.
- **D-04:** "Delete my account" control added to the student dashboard Account card. Reuse `components/dashboard/DeleteAccountDialog.tsx` verbatim. Planner decides whether to adjust modal body copy for student context (no approved BIPs to anonymize).
- **D-04a:** Cascade is FK-driven. `saved_bips.user_id references auth.users(id) on delete cascade` means `delete_my_account()` already removes all `saved_bips` rows. Do NOT add `saved_bips` deletion logic to the RPC.
- **D-05:** Add `saved_bips` paragraph to `/privacy` (`app/(public)/privacy/page.tsx`). Reconcile the stale `biphub:bookmarks` localStorage mention: replace with a one-line "read once on sign-in, then cleared" note (since the legacy sweep island does touch the key on D-02).

### Deferred Ideas (OUT OF SCOPE)

- Anonymous / signed-out localStorage save (server-sync-on-login) — explicitly rejected by D-01.
- Alert subscriptions + `bip_subscriptions` table + digest email — Phase 7.
- Saved-search persistence — Phase 7 (`bip_subscriptions`).
- Coordinator/admin "save BIP" UI — not built this phase.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STUD-04 | A student can save a BIP to their account and remove it | Server Actions `saveAction`/`unsaveAction` in `lib/actions/saved-bips.ts`; RLS insert/delete policies; `useOptimistic` toggle island |
| STUD-05 | A student's saved BIPs are stored server-side and sync across devices | `saved_bips` table (migration 00016); Server Actions read from `auth.uid()` not localStorage |
| STUD-06 | A student's existing localStorage bookmarks migrate to their account on first sign-in | Best-effort sweep island: `useEffect` reads `localStorage['biphub:bookmarks']`, calls `migrateLegacyBookmarksAction`, clears key; test with fake seed value |
| STUD-07 | A student can view all of their saved BIPs in one place on their dashboard | `app/(student)/student-dashboard/saved/page.tsx` RSC; reuses `BipCard` grid; `/student-dashboard` summary section replaces "coming soon" paragraph |
| STUD-08 | A student can delete their own account and all associated data | `DeleteAccountDialog` reuse; `deleteAccountAction` already calls `delete_my_account()` RPC; FK cascade on `saved_bips.user_id` removes rows automatically |
| FOUN-09 | Account erasure cascades all new v1.1 PII (saved BIPs) | `saved_bips.user_id references auth.users(id) on delete cascade` — zero RPC changes needed; verify with SQL no-orphan-rows check |
| FOUN-10 | The `/privacy` page enumerates every new v1.1 data surface | Add `saved_bips` paragraph + update `biphub:bookmarks` mention in `app/(public)/privacy/page.tsx` |
</phase_requirements>

---

## Summary

Phase 6 is a well-bounded feature addition to an existing, fully-operational Phase 5 system. All architectural groundwork — student role, RLS patterns, `deleteAccountAction`, `BipCard`, the `(student)` route group layout, and the Supabase server client factory — is already in place. The phase has three distinct workstreams: (1) database layer (migration 00016), (2) save/unsave UI + Server Actions, and (3) privacy/GDPR surface updates.

The most technically interesting work is the `BipCard` HTML refactor: the card is currently a `<Link>` wrapping the entire card, and nesting a `<button>` (the save toggle) inside a `<Link>` is invalid HTML. The UI-SPEC resolves this by restructuring the card — a `<div>` outer wrapper with a `<Link>` covering the body and the `SaveToggleIsland` as an absolutely-positioned sibling. This refactor touches a component rendered on two routes (`/bips` and `/student-dashboard/saved`).

The `delete_my_account()` RPC (migration 00013) requires zero changes: the FK `saved_bips.user_id → auth.users(id) ON DELETE CASCADE` means the existing `DELETE FROM auth.users` already cascades to `saved_bips`. The research confirms this is structurally correct (PITFALLS.md Pitfall 14 explicitly documents this pattern). The planner's only task is to verify the FK is wired correctly in the migration DDL and include a SQL assertion in the verification plan.

The `localStorage` migration (STUD-06) has no real source data (D-02a). The implementation is a null-returning client island that defensively sweeps, validates slugs/ids against `bips`, upserts via `ON CONFLICT DO NOTHING`, and clears the key — proven by a Vitest unit test that seeds a fake `localStorage['biphub:bookmarks']` value, not an E2E spec.

**Primary recommendation:** Ship migration 00016 first (verified via `db push` + `gen types --linked`), then build the Server Actions, then the UI islands in dependency order: `SaveToggleIsland` → `BipCard` refactor → `/bips` save state fetch → saved list page → dashboard summary → legacy sweep island → privacy update.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `saved_bips` table + RLS + indexes | Database | — | Ownership/cascade logic is DB-level; RLS guards the data boundary |
| Save / unsave mutation | API / Backend (Server Actions) | Browser (optimistic UI) | Mutations are Server Actions; browser handles `useOptimistic` pending state only |
| Saved BIPs list query | API / Backend (RSC) | — | The `/student-dashboard/saved` page fetches via RSC + Supabase; no client fetching |
| Heart toggle visual state on `/bips` | Browser (client island) | Frontend Server (RSC passes `initialSaved`) | `isStudent` and `initialSaved` are passed as props from RSC batch query; island is pure UI |
| Legacy localStorage sweep | Browser (client island) | API / Backend (Server Action validates + upserts) | `useEffect` on mount reads localStorage; Server Action handles DB write |
| Account deletion cascade | Database (FK) | API / Backend (RPC + Server Action) | FK handles the data removal; Server Action fires the RPC and handles signout/redirect |
| `/privacy` enumeration | Frontend Server (static RSC) | — | Pure content update to a `force-static` page |
| Dashboard saved-BIPs summary count | API / Backend (RSC) | — | One lightweight `count(*)` query at RSC render time |

---

## Standard Stack

All packages are already installed. Phase 6 introduces zero new npm dependencies.

### Core (already installed — no `npm install` needed)

| Library | Version | Purpose | Why Used |
|---------|---------|---------|----------|
| `react` | 19.2.6 | `useOptimistic` hook for toggle state | Built-in React 19; no external dep |
| `next` | 15.5.18 | Server Actions, `revalidatePath`, RSC | Locked stack |
| `@supabase/ssr` | 0.5.2 (pinned exact) | `createServerClient` factory, `getClaims()` | Locked stack |
| `lucide-react` | (already installed) | `Heart` icon for save toggle | `components.json` iconLibrary: "lucide" |
| `sonner` | (already installed) | Toast error on save/unsave failure | Phase 4 established pattern |

[VERIFIED: package.json in repo — all packages present at stated versions]

### Existing Patterns (reuse without modification)

| Pattern | File | How Phase 6 Reuses It |
|---------|------|----------------------|
| `createClient()` server factory | `lib/supabase/server.ts` | Verbatim in new Server Actions and saved-list RSC |
| `getClaims()` auth check | `(student)/layout.tsx`, `student-dashboard/page.tsx` | Verbatim in `saveAction`/`unsaveAction` |
| `deleteAccountAction` | `lib/actions/account.ts` | Reused as-is for student account deletion |
| `DeleteAccountDialog` | `components/dashboard/DeleteAccountDialog.tsx` | Reused verbatim; planner may adjust modal body copy |
| Zod schema validation | `lib/schemas/admin-bips.ts` (pattern) | New `SaveBipSchema` validates `bipId` as UUID |
| Vitest unit test | `tests/schemas/admin-bips.test.ts` (pattern) | New `tests/schemas/saved-bips.test.ts` for sweep validation |

---

## Architecture Patterns

### System Architecture Diagram

```
Browser
  │
  ├─ /bips RSC page
  │    ├─ getBips() query → Supabase (bips + host_university)
  │    ├─ getSavedBipIds(userId) → Supabase (saved_bips WHERE user_id = $uid)  [NEW]
  │    └─ BipCard (RSC, props: bip, initialSaved, isStudent)
  │         └─ SaveToggleIsland (client island)  [NEW]
  │              ├─ [unsaved] click → saveAction(bipId) → saved_bips INSERT
  │              ├─ [saved]   click → unsaveAction(bipId) → saved_bips DELETE
  │              └─ [non-student] click → router.push('/register/student')
  │
  ├─ /bip/[slug] RSC page
  │    ├─ getBipBySlug(slug) → Supabase
  │    ├─ isBipSaved(userId, bipId) → Supabase (saved_bips WHERE ...)  [NEW]
  │    └─ BipSidebar (client) → SaveToggleIsland (displayStyle="button")  [NEW]
  │
  ├─ /student-dashboard RSC page
  │    ├─ getSavedBipsCount(userId) → Supabase count(*)  [NEW]
  │    ├─ Saved-BIPs summary card (replaces "coming soon")  [NEW]
  │    ├─ Account card + DeleteAccountDialog (reused + new trigger)  [NEW]
  │    └─ LegacySweepIsland (client, null UI)  [NEW]
  │         └─ useEffect → migrateLegacyBookmarksAction(slugs[]) → saved_bips UPSERT
  │
  └─ /student-dashboard/saved RSC page  [NEW]
       ├─ getSavedBips(userId) → Supabase (saved_bips JOIN bips WHERE status='approved')
       └─ BipGrid (reused) → BipCard (refactored, initialSaved=true)
            └─ SaveToggleIsland (on unsave: opacity-50 → remove from list)

Server Actions (lib/actions/saved-bips.ts)  [NEW]
  ├─ saveAction(bipId)           → getClaims() → INSERT INTO saved_bips ON CONFLICT DO NOTHING
  ├─ unsaveAction(bipId)         → getClaims() → DELETE FROM saved_bips WHERE user_id=$uid AND bip_id=$id
  └─ migrateLegacyBookmarksAction(slugs[]) → validate against bips → UPSERT → return

Database (Supabase cloud)
  ├─ saved_bips table (migration 00016)  [NEW]
  │    ├─ user_id → auth.users ON DELETE CASCADE
  │    ├─ bip_id  → bips ON DELETE CASCADE
  │    ├─ unique(user_id, bip_id)
  │    └─ RLS: select_own / insert_own / delete_own / select_admin
  └─ delete_my_account() RPC (00013) — unchanged
       └─ DELETE FROM auth.users → FK cascade → saved_bips rows removed
```

### Recommended Project Structure (new files only)

```
supabase/migrations/
└── 00016_saved_bips.sql          ← table + RLS + indexes (PITFALL 4)

lib/actions/
└── saved-bips.ts                 ← saveAction, unsaveAction, migrateLegacyBookmarksAction

lib/queries/
└── savedBips.ts                  ← getSavedBipIds, getSavedBips, getSavedBipsCount, isBipSaved

components/bip/
└── SaveToggleIsland.tsx          ← 'use client'; useOptimistic; displayStyle prop

app/(student)/student-dashboard/
└── saved/
    └── page.tsx                  ← RSC; saved BIPs list

tests/
└── schemas/
    └── saved-bips.test.ts        ← Vitest; sweep validation (idempotency, unknown slug filter)
```

Modified files:

```
components/bip/BipCard.tsx        ← RSC refactor: <Link> → <div> outer + sibling island
components/bip/BipGrid.tsx        ← Pass initialSaved + isStudent props through to BipCard
app/(public)/bips/page.tsx        ← Batch query savedBipIds; pass to BipGrid
app/(public)/bip/[slug]/page.tsx  ← isBipSaved query; pass to BipSidebar
app/(student)/student-dashboard/page.tsx ← Replace "coming soon" + add Account delete
app/(public)/privacy/page.tsx     ← Add saved_bips paragraph; update biphub:bookmarks
```

### Pattern 1: saveAction / unsaveAction Server Actions

**What:** Server Actions in `lib/actions/saved-bips.ts`. Auth via `getClaims()`. Supabase client via `await createClient()`. No `createAdminClient`.
**When to use:** Called from `SaveToggleIsland` client island. `saveAction` inserts with `ON CONFLICT DO NOTHING` (double-click safe). `unsaveAction` deletes by `(user_id, bip_id)`.

```typescript
// Source: ARCHITECTURE.md lines 183-204 (policy shapes); server.ts factory pattern
'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const SaveBipSchema = z.object({ bipId: z.string().uuid() })

export async function saveAction(bipId: string): Promise<{ error?: string }> {
  const parsed = SaveBipSchema.safeParse({ bipId })
  if (!parsed.success) return { error: 'Invalid BIP ID.' }

  const supabase = await createClient()
  const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims()
  if (claimsErr || !claimsData?.claims?.sub) return { error: 'Not authenticated.' }

  const userId = claimsData.claims.sub

  const { error } = await supabase
    .from('saved_bips')
    .insert({ user_id: userId, bip_id: parsed.data.bipId })
    // ON CONFLICT DO NOTHING — unique(user_id, bip_id) constraint; double-click safe
  // PostgREST with onConflict: 'user_id,bip_id' + ignoreDuplicates: true
  if (error) return { error: error.message }
  return {}
}

export async function unsaveAction(bipId: string): Promise<{ error?: string }> {
  const parsed = SaveBipSchema.safeParse({ bipId })
  if (!parsed.success) return { error: 'Invalid BIP ID.' }

  const supabase = await createClient()
  const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims()
  if (claimsErr || !claimsData?.claims?.sub) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('saved_bips')
    .delete()
    .eq('user_id', claimsData.claims.sub)
    .eq('bip_id', parsed.data.bipId)

  if (error) return { error: error.message }
  return {}
}
```

[VERIFIED: `await createClient()` factory pattern confirmed in `lib/supabase/server.ts`; `getClaims()` pattern confirmed in `lib/actions/account.ts` and `app/(student)/layout.tsx`]

### Pattern 2: useOptimistic Toggle Island

**What:** `SaveToggleIsland` client component (`'use client'`) uses `useOptimistic` (React 19 built-in) to immediately flip the heart visual while the Server Action is in-flight.
**When to use:** On BipCard (icon mode) and `/bip/[slug]` (button mode). Receives `bipId`, `bipTitle`, `initialSaved`, `isStudent`, `displayStyle` props from parent RSC.

```typescript
// Source: Context7 docs /vercel/next.js — "Implement Optimistic UI Updates with useOptimistic"
// Source: CONTEXT.md D-01, 06-UI-SPEC.md Surface 1 interaction contract
'use client'

import { useOptimistic, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { saveAction, unsaveAction } from '@/lib/actions/saved-bips'

interface SaveToggleIslandProps {
  bipId: string
  bipTitle: string
  initialSaved: boolean
  isStudent: boolean
  displayStyle?: 'icon' | 'button'
}

export function SaveToggleIsland({
  bipId, bipTitle, initialSaved, isStudent, displayStyle = 'icon'
}: SaveToggleIslandProps) {
  const router = useRouter()
  const [optimisticSaved, setOptimisticSaved] = useOptimistic(initialSaved)
  const [isPending, startTransition] = useTransition()

  async function handleClick() {
    if (!isStudent) {
      router.push('/register/student')
      return
    }
    startTransition(async () => {
      const nextSaved = !optimisticSaved
      setOptimisticSaved(nextSaved)
      const result = nextSaved
        ? await saveAction(bipId)
        : await unsaveAction(bipId)
      if (result.error) {
        setOptimisticSaved(!nextSaved)  // revert
        toast.error(nextSaved
          ? 'Could not save this BIP. Please try again.'
          : 'Could not remove this BIP. Please try again.')
      }
    })
  }

  // Icon mode (BipCard) or button mode (detail page) — see UI-SPEC
  // ...
}
```

[VERIFIED: `useOptimistic` available in React 19.2.6 (confirmed package.json); Context7 `/vercel/next.js` confirmed the pattern]

### Pattern 3: Batch saved-BIPs query on /bips RSC

**What:** The `/bips` page RSC performs one batch query to get all saved BIP IDs for the current user, then passes `initialSaved` as a prop to each `BipCard`. This avoids N+1 queries (one per card).
**When to use:** On `/bips` page and `/student-dashboard/saved` page RSC.

```typescript
// lib/queries/savedBips.ts (new file)
import { createClient } from '@/lib/supabase/server'

export async function getSavedBipIds(userId: string | null): Promise<Set<string>> {
  if (!userId) return new Set()
  const supabase = await createClient()
  const { data } = await supabase
    .from('saved_bips')
    .select('bip_id')
    .eq('user_id', userId)
  return new Set((data ?? []).map(r => r.bip_id))
}
```

[ASSUMED: The pattern of a batch-set query on the list page is derived from established PITFALLS guidance on avoiding N+1 queries; not directly sourced from an official doc, but follows Supabase/PostgREST best practice for RLS-scoped ownership reads]

### Pattern 4: ON CONFLICT DO NOTHING via Supabase client

**What:** Supabase JS client supports conflict-ignore for upsert behavior via `.upsert()` with `ignoreDuplicates: true`.
**When to use:** `saveAction` (double-click safe), `migrateLegacyBookmarksAction` (idempotent sweep).

```typescript
// Source: Supabase PostgREST convention; confirmed in ARCHITECTURE.md DDL (unique constraint)
const { error } = await supabase
  .from('saved_bips')
  .upsert(
    { user_id: userId, bip_id: bipId },
    { onConflict: 'user_id,bip_id', ignoreDuplicates: true }
  )
```

[VERIFIED: `unique(user_id, bip_id)` constraint is in authoritative DDL at ARCHITECTURE.md line 174]

### Pattern 5: BipCard HTML Refactor (nested interactive prevention)

**What:** Current `BipCard` outer element is `<Link>`. The save toggle `<button>` cannot be a descendant of `<Link>` (invalid HTML per spec; also WCAG 4.1.3). The card is restructured: `<div>` outer (carries hover classes, `group`), `<Link>` covers the full card body as a block-level child, `SaveToggleIsland` is a sibling of `<Link>` absolutely positioned over the header.
**When to use:** Required for all Phase 6 BipCard renders.

```tsx
// Source: 06-UI-SPEC.md — Structural Note — BipCard RSC Refactor
// Before: <Link className="group flex flex-col ...">...</Link>
// After:
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

[VERIFIED: Current `BipCard.tsx` outer element confirmed as `<Link>` at line 54; UI-SPEC explicitly documents this refactor requirement]

### Anti-Patterns to Avoid

- **Using `app_metadata.role = 'student'` as the RLS guard for `saved_bips` INSERT:** Pitfall 1 in PITFALLS.md — silently blocks all student saves for up to 1 hour after new registration (Custom Access Token Hook in 00015 fixes this at JWT issuance time, but `auth.uid() = user_id` is still the correct predicate for saved_bips INSERT, NOT a role check).
- **Nesting `<button>` inside `<Link>`:** Invalid HTML. Will cause browser auto-correction that breaks the click handler on the inner button. The BipCard refactor (Pattern 5) is the required fix.
- **Calling `revalidatePath('/student-dashboard/saved')` from `saveAction`:** Revalidation causes unnecessary full-page re-fetch on every save. Use optimistic UI via `useOptimistic` + allow Next.js to revalidate on navigation instead. Reserve `revalidatePath` for the saved list's unsave action (to remove card from DOM on success).
- **Using `createAdminClient` in save/unsave Server Actions:** Saves are user-owned data. Server Actions use `createClient()` (anon key + RLS) — the user's JWT is the authorization boundary. `createAdminClient` is confined to `app/(admin)/` and `lib/supabase/admin.ts`.
- **Using `getSession()` instead of `getClaims()`:** CLAUDE.md never-do. `getSession()` trusts cookies without JWT signature validation; `getClaims()` validates the signature.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Conflict-safe insert | Custom "check-then-insert" logic | `.upsert({ onConflict, ignoreDuplicates: true })` | Race condition between check + insert; DB constraint + upsert is atomic |
| Optimistic toggle | `useState(saved)` + manual rollback | `useOptimistic` (React 19 built-in) | Handles concurrent action calls; built-in rollback semantics |
| Account deletion cascade | Explicit `DELETE FROM saved_bips` in RPC | FK `ON DELETE CASCADE` | FK cascade is atomic with the `auth.users` delete; no extra code or migration needed |
| JWT validation | `getSession()` | `getClaims()` | `getSession()` does not validate JWT signature; CLAUDE.md never-do |
| Save/unsave Server Action auth guard | Manual session cookie parsing | `supabase.auth.getClaims()` | Validates signature, extracts `sub`, handles expiry |

**Key insight:** The entire cascade chain (account deletion → `saved_bips` removal) is already implemented by the existing FK definition in the DDL. The planner should resist the temptation to add explicit `DELETE FROM saved_bips` to the RPC — it is unnecessary and would break the "atomic: any failure mid-flight rolls back the entire chain" property.

---

## Runtime State Inventory

> Phase 6 is a new-feature phase (not a rename/refactor), so this section documents the specific runtime state that must exist or be created before the phase can run.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | No `saved_bips` table exists yet (migration 00016 is new) | Apply migration via `npx supabase db push` against linked cloud project |
| Stored data | `localStorage['biphub:bookmarks']` — no writes ever existed in the codebase (confirmed: `BipCard.tsx` has no localStorage write; Privacy page mentions it only in copy) | Best-effort sweep island reads + clears; safe to implement |
| Live service config | No Supabase Edge Functions or cron jobs required for Phase 6 (alert pipeline is Phase 7) | None |
| OS-registered state | None | None — verified by codebase scan |
| Secrets/env vars | No new env vars needed. All auth uses existing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | None |
| Build artifacts | `lib/supabase/database.types.ts` will be stale until `npx supabase gen types --linked` is run after migration 00016 | Run after `db push` |

**`localStorage['biphub:bookmarks']` is documented in `/privacy` copy but was never written by any component.** The Privacy page will be corrected to show the "legacy sweep" framing per D-05.

---

## Common Pitfalls

### Pitfall 1: BipCard Link-Button Nesting (CRITICAL — blocks implementation)

**What goes wrong:** Wrapping a `<button>` inside a `<Link>` (which renders as `<a>`) is invalid HTML. Browsers auto-correct by extracting the button from the anchor, causing click events to bubble incorrectly — the outer card navigation fires instead of the save toggle.
**Why it happens:** BipCard is currently a top-level `<Link>`; adding a button island naively as a child would create this structure.
**How to avoid:** The BipCard refactor (Pattern 5) must happen before or in the same wave as the SaveToggleIsland. The `<div>` outer wrapper replicates all existing hover/focus classes; the `<Link>` becomes a block-level child; the island is a sibling, absolutely positioned.
**Warning signs:** Save toggle click navigates to BIP detail page instead of toggling; DOM inspector shows `<button>` is outside `<a>`.

[VERIFIED: `BipCard.tsx` line 54 confirms current outer element is `<Link>`; 06-UI-SPEC.md explicitly flags this as a structural requirement]

### Pitfall 2: RLS Policy — Do NOT Gate `saved_bips` INSERT on `app_metadata.role = 'student'`

**What goes wrong:** If the INSERT policy requires `app_metadata.role = 'student'`, a freshly-registered student's first save attempt fails silently (policy returns empty; no error surfaced to the UI). Their JWT was issued by the Custom Access Token Hook with the correct role, so this is resolved for Phase 6. But the authoritative DDL (ARCHITECTURE.md lines 183–195) already uses `auth.uid() = user_id` without a role check — follow it exactly.
**Why it happens:** Copying the `bips_insert_coordinator` role-check pattern onto student-owned tables. Student tables are scoped by `user_id`, not by role.
**How to avoid:** Use `(select auth.uid()) = user_id` as the sole predicate for `saved_bips_insert_own`. The Custom Access Token Hook (00015) guarantees the role is in the JWT at issuance, but the correct guard for a user's own data is `auth.uid()`, not role.
**Warning signs:** First-save after fresh registration fails; save works after sign-out and back in.

[VERIFIED: PITFALLS.md Pitfall 1 (lines 22–58) documents this exact failure mode; the authoritative DDL at ARCHITECTURE.md lines 183–204 uses `auth.uid()` correctly]

### Pitfall 3: Missing Indexes on `saved_bips` (PERFORMANCE — PITFALLS.md Pitfall 4)

**What goes wrong:** RLS SELECT policy evaluates `user_id = auth.uid()` for every row in `saved_bips`. Without a `user_id` index, this is a full table scan. At 10,000+ rows across all users, response times exceed 500ms.
**Why it happens:** Migration creates the table; the index step is easy to forget.
**How to avoid:** Include in migration 00016, same file as the `CREATE TABLE`:

```sql
create index saved_bips_user_id_idx on public.saved_bips (user_id);
create index saved_bips_bip_id_idx on public.saved_bips (bip_id);
```

**Warning signs:** `EXPLAIN (ANALYZE)` on `SELECT * FROM saved_bips WHERE user_id = $1` shows `Seq Scan`; query time > 50ms with < 200 rows.

[VERIFIED: PITFALLS.md Pitfall 4 (lines 122–148) documents this with identical index names; confirmed as a required addition to the DDL]

### Pitfall 4: `revalidatePath` Scope on Save/Unsave

**What goes wrong:** Calling `revalidatePath('/bips')` from `saveAction` forces a full regeneration of the public BIP directory on every save — expensive and unnecessary, since saved state is user-specific (RLS-scoped) and not visible to other users' ISR-cached pages.
**Why it happens:** Copying the `revalidatePath` pattern from coordinator approve/reject actions, which affect the public directory.
**How to avoid:** `saveAction` and `unsaveAction` should NOT call `revalidatePath`. The optimistic UI update (`useOptimistic`) handles the immediate visual change. On the `/student-dashboard/saved` page, an unsave can either filter client-side or call `revalidatePath('/student-dashboard/saved')` — but this path is behind the auth wall and is not cached by ISR, so a targeted revalidation is fine.
**Warning signs:** Every save triggers a Vercel ISR rebuild of `/bips`.

[VERIFIED: `revalidate = 3600` on `/bips` page confirmed at `app/(public)/bips/page.tsx` line 56; ISR behavior documented in STATE.md]

### Pitfall 5: `DeleteAccountDialog` Modal Body Copy — BIP Anonymization Bullets Are Inaccurate for Students

**What goes wrong:** The existing `DeleteAccountDialog` body copy reads "Draft, pending, and rejected BIP submissions will be deleted" and "Approved BIPs you submitted remain published, anonymized." Students have no BIP submissions, so these bullets are misleading.
**Why it happens:** The dialog was written for coordinators; verbatim reuse without reviewing the copy creates a confusing UX.
**How to avoid:** The planner must decide: (a) accept the verbatim copy (no BIP anonymization bullets appear because students have 0 approved BIPs — they see the bullets but the consequence never fires), or (b) pass a `userType="student"` prop to `DeleteAccountDialog` to render student-appropriate copy ("Your saved BIPs and account data are permanently deleted"). The UI-SPEC delegates this decision to the planner.
**Warning signs:** A student reads "Approved BIPs you submitted remain published, anonymized" — technically false for a student.

[VERIFIED: `components/dashboard/DeleteAccountDialog.tsx` lines 72–80 confirm the coordinator-specific copy; CONTEXT.md D-04 explicitly flags this for the planner]

### Pitfall 6: `force-static` on `/privacy` Must Be Preserved

**What goes wrong:** `/privacy` exports `export const dynamic = 'force-static'`. Adding an import that causes dynamic behavior (e.g., a `createClient()` call, `cookies()` dependency, or a client component without Suspense) removes the `force-static` behavior, turning the page dynamic and missing a build-time prerender.
**Why it happens:** Content-only additions usually don't introduce dynamic behavior, but accidentally importing a shared component that pulls in `createClient` can trigger it.
**How to avoid:** Keep the `/privacy` update as pure JSX content changes with no new imports or client-side logic. The existing `force-static` export must remain.
**Warning signs:** `next build` output shows `/privacy` as `ƒ` (dynamic) instead of `○` (static).

[VERIFIED: `app/(public)/privacy/page.tsx` line 26 confirms `export const dynamic = 'force-static'`]

### Pitfall 7: The `/bips` Page is ISR — BipCard Refactor Must Not Break Public Caching

**What goes wrong:** `/bips` has `export const revalidate = 3600`. The BipCard refactor changes the HTML structure of every card on this ISR page. If the refactor introduces a client component that reads cookies (e.g., `useRouter` or `usePathname` without proper boundaries), it could silently switch `/bips` from static ISR to dynamic SSR.
**Why it happens:** The `SaveToggleIsland` is a client island. It can use `useRouter` safely because it's a leaf client component; it does NOT call `cookies()` or `createClient()`. The issue arises if the RSC parent (`BipCard`) were mistakenly changed to `'use client'`.
**How to avoid:** `BipCard` remains a pure RSC (no `'use client'` directive). `SaveToggleIsland` is a separate file with `'use client'`. The RSC passes `isStudent` and `initialSaved` as primitive props (booleans/strings) — no function props from RSC to client component.
**Warning signs:** `next build` shows `/bips` as `ƒ` instead of ISR-eligible; middleware latency increases.

[VERIFIED: `app/(public)/bips/page.tsx` confirms `export const revalidate = 3600`; `BipCard.tsx` has no `'use client'` directive]

---

## Code Examples

### Migration 00016 (authoritative DDL)

```sql
-- Source: ARCHITECTURE.md lines 166–204 (verbatim)
create table public.saved_bips (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  bip_id     uuid not null references public.bips(id) on delete cascade,
  saved_at   timestamptz not null default now(),
  unique (user_id, bip_id)
);

alter table public.saved_bips enable row level security;

-- Indexes: PITFALLS.md Pitfall 4 — required, same migration file
create index saved_bips_user_id_idx on public.saved_bips (user_id);
create index saved_bips_bip_id_idx on public.saved_bips (bip_id);

-- Students (and any authenticated user) can read their own saved BIPs
create policy "saved_bips_select_own"
  on public.saved_bips for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Any authenticated user can save BIPs for themselves only
create policy "saved_bips_insert_own"
  on public.saved_bips for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Any authenticated user can unsave BIPs they saved
create policy "saved_bips_delete_own"
  on public.saved_bips for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Admins can read all saved BIPs (for moderation/analytics)
create policy "saved_bips_select_admin"
  on public.saved_bips for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
```

[VERIFIED: ARCHITECTURE.md lines 166–204 confirmed; no UPDATE policy — correct per D-06]

### Saved BIPs Query (getSavedBips for the saved list page)

```typescript
// lib/queries/savedBips.ts (new)
// Source: Supabase PostgREST pattern; JOIN through saved_bips to bips
import { createClient } from '@/lib/supabase/server'
import type { BipWithRelations } from '@/lib/types/bip'

export async function getSavedBips(userId: string): Promise<BipWithRelations[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('saved_bips')
    .select(`
      saved_at,
      bips:bip_id (
        id, slug, title, application_deadline, ects_credits,
        language_of_instruction, physical_start_date, physical_end_date,
        host_city, study_levels, green_travel, inclusion_support, is_seed,
        status, created_at, subject_area,
        host_university:universities!host_university_id (id, name, country, city, erasmus_code)
      )
    `)
    .eq('user_id', userId)
    .eq('bips.status', 'approved')  // D-03a: silently exclude non-approved
    .order('saved_at', { ascending: false })  // D-03: most-recently-saved first

  if (error) throw error
  // Filter out null bips (D-03a: unapproved BIPs return null from the join filter)
  return (data ?? [])
    .map(row => row.bips)
    .filter((bip): bip is BipWithRelations => bip !== null)
}
```

[ASSUMED: The PostgREST embedded filter syntax `.eq('bips.status', 'approved')` on a foreign-table join is the standard pattern; verify against Supabase docs if the filter syntax behaves differently with 1-to-many joins. Alternative: fetch saved_bips rows, then filter status client-side, or use a DB view]

### Legacy Sweep Island

```typescript
// Inline in app/(student)/student-dashboard/page.tsx or layout.tsx
// Source: CONTEXT.md D-02; 06-UI-SPEC.md Surface 6
'use client'

import { useEffect } from 'react'
import { migrateLegacyBookmarksAction } from '@/lib/actions/saved-bips'

export function LegacySweepIsland() {
  useEffect(() => {
    const raw = localStorage.getItem('biphub:bookmarks')
    if (!raw) return  // expected case — silent no-op (D-02)
    try {
      const ids: string[] = JSON.parse(raw)
      if (!Array.isArray(ids) || ids.length === 0) {
        localStorage.removeItem('biphub:bookmarks')
        return
      }
      // Fire-and-forget — best-effort (D-02: silent fail on error)
      migrateLegacyBookmarksAction(ids).then(() => {
        localStorage.removeItem('biphub:bookmarks')
      }).catch(() => {
        // Silent fail — best-effort sweep
      })
    } catch {
      localStorage.removeItem('biphub:bookmarks')
    }
  }, [])  // [] — runs once on mount

  return null  // Zero visible UI (UI-SPEC Surface 6)
}
```

[VERIFIED: D-02 specifies best-effort, silent fail; UI-SPEC Surface 6 specifies null-return component]

### Vitest Unit Test Pattern for Sweep Validation (STUD-06 acceptance criterion)

```typescript
// tests/schemas/saved-bips.test.ts (new)
// Source: tests/schemas/admin-bips.test.ts (pattern); D-02a (acceptance criterion)
import { describe, it, expect, vi, beforeEach } from 'vitest'

// The sweep logic extracted to a pure function (or tested via the action's slug-validation path)
describe('migrateLegacyBookmarksAction — sweep validation', () => {
  it('validates bip IDs against the bips table — unknown slugs are skipped', () => {
    // Test the slug-validation branch: provide unknown + known IDs;
    // assert only known IDs are upserted
  })
  it('is idempotent — calling twice with same IDs produces one saved_bips row', () => {
    // Assert ON CONFLICT DO NOTHING semantics
  })
  it('no-ops when localStorage key is absent', () => {
    // Assert silent return when biphub:bookmarks is null
  })
  it('clears the localStorage key on success', () => {
    // Assert removeItem called after successful upsert
  })
})
```

[VERIFIED: Vitest infrastructure confirmed at `vitest.config.ts`; test files at `tests/**/*.test.ts` pattern; existing pattern at `tests/schemas/admin-bips.test.ts`]

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `localStorage` bookmark store (v1.0 plan, never shipped) | Server-side `saved_bips` table, students only | Phase 6 (v1.1) | Syncs across devices; GDPR-compliant cascade; no anon fallback |
| `useOptimistic` not available | `useOptimistic` built into React 19 | React 19 GA | No external library needed for optimistic UI |
| `getSession()` for auth | `getClaims()` everywhere | v1.0 locked decision | JWT signature validation; CLAUDE.md never-do |
| Coordinator-only account deletion | Students also get `DeleteAccountDialog` | Phase 6 | Reuse of Phase 4 component with zero changes to the component |

**Deprecated/outdated in this phase:**
- The "Saved BIPs coming soon" paragraph at `student-dashboard/page.tsx:92-94` — replaced with a real Saved-BIPs summary section.
- The `biphub:bookmarks` Privacy page entry as a live feature — replaced with a "legacy sweep, read-once-then-cleared" note.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | PostgREST embedded filter `.eq('bips.status', 'approved')` on a many-to-one join (saved_bips → bips) filters out null rows cleanly | Code Examples — getSavedBips | Unapproved BIPs may appear in the saved list or cause null pointer errors; mitigation: client-side filter by status |
| A2 | `SaveToggleIsland` using `useRouter` from `next/navigation` does not break ISR caching on `/bips` when used as a leaf client component | Pitfall 7 | `/bips` switches from ISR to dynamic SSR; verify with `next build` output |
| A3 | The `storageState.student.json` fixture file exists and the `student-authed` Playwright project in `playwright.config.ts` can be extended for Phase 6 E2E tests | Validation Architecture | E2E tests for save toggle need a fresh student fixture setup; existing student fixture `e2e-student@biphub.test` can be reused |

**If table is empty:** All other claims in this research were verified against code files, migration files, or official Context7 docs.

---

## Open Questions

1. **PostgREST embedded filter on saved_bips → bips join (D-03a)**
   - What we know: The saved list should silently exclude non-approved BIPs (D-03a). PostgREST supports embedded filters on 1-to-1 FK joins.
   - What's unclear: A `saved_bips` row joins to exactly one `bips` row (many-to-one). PostgREST's `.eq('bips.status', 'approved')` on an embedded FK should work, but filtering on an embedded FK that doesn't match nullifies the parent row — we need the `saved_bips` row retained in the DB, just not rendered. If PostgREST returns `bips: null` for non-approved rows, the query response includes them as `{ saved_at: ..., bips: null }` — client-side null filtering resolves this.
   - Recommendation: Implement with client-side null filter as the fallback (`.filter(row => row.bips !== null)`). This is always safe regardless of PostgREST embedded filter behavior.

2. **Unsave from saved list — client-side filter vs revalidatePath**
   - What we know: When a student unsaves a BIP from `/student-dashboard/saved`, the card should disappear from the list. Two approaches: (a) `useOptimistic` client-side filter (remove the card's ID from a local set), or (b) `revalidatePath('/student-dashboard/saved')` after the Server Action (triggers RSC re-fetch).
   - What's unclear: The `/student-dashboard/saved` page is not ISR (it's behind auth, dynamic by default in Next.js 15 App Router when cookies are read). `revalidatePath` on a dynamic route is a no-op — it busts ISR cache, which doesn't exist here.
   - Recommendation: Use `useOptimistic` with a client-side set of saved IDs. On successful unsave, remove the `bipId` from the set. This gives instant UI feedback without a server round-trip for re-render.

3. **Student fixture for E2E save/unsave test**
   - What we know: `tests/e2e/fixtures/storageState.student.json` exists (confirmed in `e2e/fixtures` directory listing). The `student-authed` project in `playwright.config.ts` uses `testMatch: /student-auth\.spec\.ts$/` — narrow to a single file.
   - What's unclear: The E2E spec for Phase 6 (`saved-bips.spec.ts`) would need to add to the `student-authed` project match pattern, or create a new project.
   - Recommendation: Extend the `student-authed` project `testMatch` pattern to include `saved-bips.spec.ts`, or add a new Playwright project `student-saved` that reuses `storageState.student.json`.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build, tests, scripts | ✓ | 22.18.0 | — |
| npm | Package scripts | ✓ | 11.7.0 | — |
| Supabase CLI | `db push`, `gen types --linked` | ✓ (via npx) | 2.98.2 | `npx supabase` |
| Supabase cloud project | All DB operations | ✓ (linked) | — | — |
| Playwright | E2E tests | ✓ (already used) | (in devDeps) | — |
| Vitest | Unit tests | ✓ (already used) | (in devDeps) | — |

**All dependencies available.** No blocking gaps.

**Note on Supabase CLI:** The CLI is not in `$PATH` directly but available via `npx supabase@2.98.2`. The `db:types` script in `package.json` uses `--local` (for local Docker); for Phase 6, migration application and type generation must use `--linked` (cloud project), not `--local`. Verify: `npx supabase db push` (not `db reset`) and `npx supabase gen types typescript --linked > lib/supabase/database.types.ts`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (unit) + Playwright (e2e) |
| Vitest config | `vitest.config.ts` (jsdom environment, setupFiles: `./tests/setup.ts`) |
| Playwright config | `playwright.config.ts` (chromium only, 1 worker, `tests/e2e/`) |
| Quick run command (unit) | `npm test` (= `vitest run`) |
| Full suite command (e2e) | `npm run test:e2e` (= `playwright test`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STUD-04 | Save a BIP persists after page reload | E2E | `npx playwright test tests/e2e/saved-bips.spec.ts` | ❌ Wave 0 |
| STUD-04 | Unsave a BIP removes it from saved list | E2E | `npx playwright test tests/e2e/saved-bips.spec.ts` | ❌ Wave 0 |
| STUD-05 | Saved BIP appears after re-login (server-side persistence) | E2E | included in saved-bips.spec.ts | ❌ Wave 0 |
| STUD-06 | Legacy sweep: fake biphub:bookmarks → upsert + clear | Unit | `npm test tests/schemas/saved-bips.test.ts` | ❌ Wave 0 |
| STUD-06 | Legacy sweep is idempotent (call twice → one row) | Unit | `npm test tests/schemas/saved-bips.test.ts` | ❌ Wave 0 |
| STUD-07 | `/student-dashboard/saved` shows all saved BIPs | E2E | included in saved-bips.spec.ts | ❌ Wave 0 |
| STUD-08 | Student delete account → `/?deleted=1` redirect | E2E (extend student-auth.spec.ts or new spec) | `npx playwright test` | ❌ Wave 0 |
| FOUN-09 | Account deletion → no orphan rows in saved_bips | E2E (SQL assertion) | Direct Supabase API call in test | ❌ Wave 0 |
| FOUN-10 | `/privacy` page enumerates saved_bips | E2E smoke | `npx playwright test tests/e2e/saved-bips.spec.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test` (Vitest unit suite, fast)
- **Per wave merge:** `npm run test:e2e` (Playwright, requires running Next.js server)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/schemas/saved-bips.test.ts` — covers STUD-06 sweep validation (unit, no Supabase needed)
- [ ] `tests/e2e/saved-bips.spec.ts` — covers STUD-04, STUD-05, STUD-07, FOUN-09, FOUN-10
- [ ] Extend `playwright.config.ts` `student-authed` project `testMatch` to include `saved-bips.spec.ts`, OR add a new `student-saved` project
- [ ] `supabase/seed.e2e.sql` — may need a pre-seeded `saved_bips` row for the student fixture to test the saved list view (or the spec saves a BIP as part of the test flow)

**Existing infrastructure covers all requirements once gap files are created.** No framework install needed.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `getClaims()` in every Server Action (CLAUDE.md never-do: never `getSession()`) |
| V3 Session Management | yes | `await cookies()` in `createClient()` factory (CLAUDE.md never-do: never sync `cookies()`) |
| V4 Access Control | yes | RLS own-only policies (`auth.uid() = user_id`); no role required for own-data tables |
| V5 Input Validation | yes | Zod `z.string().uuid()` on `bipId` in all Server Actions |
| V6 Cryptography | no | No new crypto in Phase 6 (account deletion uses existing RPC; no tokens) |

### Known Threat Patterns for This Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Student saves another user's bookmark row (cross-user insert) | Tampering | RLS `saved_bips_insert_own`: `WITH CHECK ((select auth.uid()) = user_id)` — structurally impossible to insert for another user |
| Student deletes another user's saved BIP | Tampering | RLS `saved_bips_delete_own`: `USING ((select auth.uid()) = user_id)` |
| Non-student (coordinator) calls saveAction via DevTools | Tampering | Server Action calls `getClaims()` — role is not restricted at the action layer (coordinators CAN save BIPs by design per ARCHITECTURE.md); RLS allows any authenticated user. The UI simply doesn't show the toggle to non-students. |
| Stale `bipId` in saveAction (deleted BIP) | Tampering | `bip_id → bips ON DELETE CASCADE` FK; insert into `saved_bips` with a non-existent `bip_id` is rejected by the FK constraint |
| Account deletion leaves orphan `saved_bips` rows | GDPR / Spoofing | FK `ON DELETE CASCADE` on `user_id → auth.users`; verified by SQL no-orphan assertion in FOUN-09 E2E test |
| `createAdminClient` used outside admin scope | Elevation of Privilege | CLAUDE.md never-do; no admin client in save/unsave Server Actions |

**RLS UPDATE policy note:** No UPDATE policy is needed for `saved_bips` (save/unsave is insert/delete only, per D-06). The CLAUDE.md "never-do" about UPDATE policies requiring both USING and WITH CHECK is N/A for this table.

---

## Project Constraints (from CLAUDE.md)

All CLAUDE.md directives that apply to Phase 6:

| Directive | How It Applies |
|-----------|---------------|
| Never use `getSession()` — use `getClaims()` | All new Server Actions and RSC data fetches must use `getClaims()` for auth |
| Never call `cookies()` synchronously — must `await cookies()` | `createClient()` factory already `await cookies()`; no changes needed; new code must not bypass factory |
| Never import GeoJSON as static module | Not applicable to Phase 6 |
| Never use `framer-motion` — use `motion/react` | Not applicable to Phase 6 (no animation in save toggle; use `animate-pulse` Tailwind class for pending state per UI-SPEC) |
| Never use dynamic Tailwind class names | `SaveToggleIsland` must use static class strings in lookup objects; no template literals for icon color states |
| Never use `createAdminClient` outside `app/(admin)/` and `lib/supabase/admin.ts` | Save/unsave Server Actions use `createClient()` only |
| Never create a table without `ENABLE ROW LEVEL SECURITY` | Migration 00016 must include `alter table public.saved_bips enable row level security` |
| Never write UPDATE policy without USING and WITH CHECK | N/A — no UPDATE policy on `saved_bips` |
| Footer disclaimer on every page | `/student-dashboard/saved` is under `(student)/layout.tsx` which already renders the EC disclaimer |
| Inter font via `next/font` | Not a new surface; inherited from existing layout |
| EC disclaimer on every page | Confirmed: `(student)/layout.tsx` renders the disclaimer for all student routes including the new `/saved` subroute |
| Use `motion` package (NOT `framer-motion`) | Not applicable to Phase 6 |
| Zod v3 | New `SaveBipSchema` uses Zod v3 (`z.string().uuid()`) |
| `@supabase/ssr` pinned to 0.5.2 exact | No version change; `package.json` already pinned |
| Never use Next.js 16 | Already on 15.5.18 |
| Supabase is CLOUD (linked), NOT local docker | `db push --linked` and `gen types --linked`; NOT `db reset` or local-only commands |

---

## Sources

### Primary (HIGH confidence)

- `components/bip/BipCard.tsx` — current card structure (RSC, `<Link>` outer, no client islands) — verified by direct file read
- `app/(student)/student-dashboard/page.tsx` — "coming soon" paragraph at lines 92–94; dashboard card pattern; `createClient()` + `getClaims()` usage — verified by direct file read
- `app/(student)/layout.tsx` — auth+role guard pattern; EC disclaimer in student layout — verified by direct file read
- `lib/actions/account.ts` — `deleteAccountAction` flow: getClaims → slug collection → RPC → signOut → revalidatePath → redirect — verified by direct file read
- `lib/supabase/server.ts` — `await cookies()` factory contract — verified by direct file read
- `supabase/migrations/00013_delete_my_account.sql` — SECURITY DEFINER RPC; `delete from auth.users` as the cascade trigger; no saved_bips mention (confirming FK handles it) — verified by direct file read
- `supabase/migrations/00015_student_role.sql` — Custom Access Token Hook guarantees role in JWT at issuance; `handle_new_user` trigger — verified by direct file read
- `components/dashboard/DeleteAccountDialog.tsx` — component API, trigger render pattern (`DialogTrigger render={...}`), coordinator-specific copy — verified by direct file read
- `.planning/research/ARCHITECTURE.md` lines 166–204 — authoritative `saved_bips` DDL + 4 RLS policies — verified by direct file read
- `.planning/research/PITFALLS.md` — Pitfall 1 (role JWT timing), Pitfall 4 (missing indexes), Pitfall 14 (account erasure cascade) — verified by direct file read
- `playwright.config.ts` — `student-authed` project, `tests/e2e/` dir, `storageState.student.json` fixture confirmed — verified by direct file read
- `vitest.config.ts` — `tests/**/*.test.ts` pattern; jsdom environment — verified by direct file read
- `app/(public)/privacy/page.tsx` — `force-static`, storage-surface enumeration pattern, `biphub:bookmarks` mention — verified by direct file read
- `app/(public)/bips/page.tsx` — `revalidate = 3600` (ISR), `BipGrid` import pattern — verified by direct file read
- `.planning/phases/06-saved-bips-sync/06-CONTEXT.md` — all locked decisions D-01 through D-06 — verified by direct file read
- `.planning/phases/06-saved-bips-sync/06-UI-SPEC.md` — all surface contracts, icon states, BipCard refactor spec — verified by direct file read

### Secondary (MEDIUM confidence)

- Context7 `/vercel/next.js` — `useOptimistic` pattern with Server Actions (verified via npx ctx7 CLI fetch, source URL: `https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/forms.mdx`)
- Context7 `/vercel/next.js` — `revalidatePath` usage after mutation (source: `https://github.com/vercel/next.js/blob/canary/docs/01-app/01-getting-started/07-mutating-data.mdx`)

### Tertiary (LOW confidence — see Assumptions Log)

- PostgREST embedded filter behavior on many-to-one joins for non-approved BIP exclusion (A1) — standard convention; client-side fallback documented
- `useRouter` in leaf client component not affecting ISR (A2) — standard Next.js behavior; flag for build verification

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all packages verified in `package.json`; no new deps needed
- Schema design: HIGH — authoritative DDL at ARCHITECTURE.md lines 166–204 confirmed by reading
- Architecture (BipCard refactor): HIGH — UI-SPEC explicitly documents the structural change; current card confirmed as `<Link>` outer
- Cascade deletion: HIGH — FK wiring confirmed in ARCHITECTURE.md DDL; RPC confirmed at migration 00013
- Pitfalls: HIGH — all 7 pitfalls verified against live code files
- Embedded filter for non-approved exclusion: MEDIUM/LOW — confirmed pattern in principle; test in implementation (see A1)

**Research date:** 2026-06-15
**Valid until:** 2026-07-15 (30 days; stable stack, no fast-moving dependencies)
