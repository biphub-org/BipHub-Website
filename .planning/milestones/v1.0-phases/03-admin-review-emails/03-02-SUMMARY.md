---
phase: 03-admin-review-emails
plan: 02
subsystem: admin-chrome
tags: [admin-chrome, middleware, layout, queue, phase-3]
requires:
  - 00-vitest installed (03-00)
  - 00010 / 00011 migrations applied + status-transitions helpers (03-01)
  - middleware.ts + dashboard layout patterns (Phase 2)
  - sonner Toaster + signOutAction + LogoMark (Phase 1/2)
provides:
  - app/(admin)/layout.tsx with role-gate
  - components/admin/AdminSidebar (desktop + Sheet drawer)
  - components/admin/AdminBipCard (queue row variant)
  - lib/queries/adminBips.ts (getAdminPendingBips, getNextPendingBip, AdminBip)
  - /admin pending queue route (FIFO)
affects:
  - middleware.ts (added /admin gate branch)
tech-stack:
  added:
    - "@base-ui/react avatar (shadcn install) — admin initials chip"
  patterns:
    - "Triple-layer admin guard (middleware → RSC layout → RLS) per 03-RESEARCH Pattern 1"
    - "Static Tailwind lookup objects (Tailwind v4 never-do compliance)"
    - "FIFO via .order('created_at', { ascending: true })"
key-files:
  created:
    - app/(admin)/layout.tsx
    - app/(admin)/admin/page.tsx
    - components/admin/AdminSidebar.tsx
    - components/admin/AdminBipCard.tsx
    - lib/queries/adminBips.ts
    - components/ui/avatar.tsx
  modified:
    - middleware.ts
decisions:
  - "Use anon-key createClient (NOT service-role) in lib/queries/adminBips.ts — admin RLS clause already returns all rows when JWT app_metadata.role = 'admin'; service-role client is restricted to app/(admin)/ + lib/supabase/admin.ts per CLAUDE.md"
  - "AdminSidebar marked 'use client' (Sheet drawer + usePathname require it); signOut remains a Server Action invoked via <form action={signOutAction}> — works inside client components"
  - "LogoMark used without a size prop (component is fixed 32×32 with optional className); plan example showed <LogoMark size={32} /> which the actual component signature does not accept"
  - "Admin layout omits the profile-complete gate — admin accounts are bootstrapped via SQL per 03-CONTEXT.md Specifics, not via the coordinator onboarding wizard"
metrics:
  duration: ~25 min
  completed: 2026-05-11
---

# Phase 3 Plan 02: Admin Auth + FIFO Pending Queue Summary

Admin login → /admin → FIFO pending queue → click "Review →" → 404 (Plan 03-03 seam). Triple-layer admin guard (middleware + RSC layout + pre-existing RLS) in place; AdminSidebar chrome with EU palette; AdminBipCard surfaces coordinator-identifying info for triage.

## One-liner

Admin chrome + FIFO pending queue: edge-middleware role gate, RSC layer re-verify, sticky 240px sidebar with Sheet-drawer mobile fallback, queue page sorted by `created_at` asc.

## What shipped

**`middleware.ts`** (modified): New `(3b) Admin-required` branch after the dashboard branch and before the auth-bounce branch. Anon users hitting `/admin/*` are redirected to `/login?next=/admin`; authenticated users without `app_metadata.role === 'admin'` are sent to `/` (avoiding the dashboard's profile-complete loop). Existing matcher untouched.

**`app/(admin)/layout.tsx`**: Two server-side checks via `getClaims()` — auth + role. Loads `profiles.full_name` and `profiles.contact_email` for the sidebar avatar/email; computes 2-letter initials from full name → email local-part → `··` sentinel. Renders `<AdminSidebar>` on the left, `<main>` filling the rest, and the EC disclaimer footer below `<main>`. Toaster scoped to this route group.

**`components/admin/AdminSidebar.tsx`**: Marked `'use client'` (Sheet + `usePathname`). Three nav items in a typed lookup array (`Queue` → `/admin`, `All BIPs` → `/admin/bips`, `Analytics` → `/admin/analytics`); `matchExact` is only `true` for `/admin` itself. Active/resting class names live in `NAV_ITEM_ACTIVE` / `NAV_ITEM_RESTING` constants — no template-literal Tailwind classes. Desktop: 240px sticky `<aside>`. Mobile (< md / 60rem per Plan 01-04): 56px fixed top bar with burger → `<Sheet side="left" />` drawer reusing `<SidebarBody>`. Sign-out is a `<form action={signOutAction}>`.

**`lib/queries/adminBips.ts`**:
- `getAdminPendingBips(): Promise<AdminBip[]>` — `.from('bips').select(...).eq('status','pending').order('created_at',{ ascending: true })`.
- `getNextPendingBip(excludeId): Promise<{ id, title } | null>` — for Plan 03-03/03-04 auto-advance.
- `AdminBip` type + `RawAdminBipRow` PostgREST relation normalization (handles single-object and single-element-array shapes).
- Auth via `getClaims()`; empty array on auth failure (defensive — non-admin reaching this code path also gets an empty queue via RLS).

**`components/admin/AdminBipCard.tsx`** (`'use client'` for parity with `DashboardBipCard`): 3-column layout — title + coordinator/university + meta row on the left; status pill + "Review →" pill button on the right. Date range formatted as `DD Mon YYYY – DD Mon YYYY` via `Intl.DateTimeFormat('en-GB')`. "Submitted N day(s) ago" with `today` special-case. Status pill uses `STATUS_BADGE_CLASSES` lookup. Review link → `/admin/bips/${bip.id}/review`.

**`app/(admin)/admin/page.tsx`**: RSC. Page header with pluralization-aware copy (`"You're all caught up"` / `"N BIP[s] awaiting review"`). Empty state: Inbox icon in a `w-24 h-24` `bg-bg-soft` circle + `No pending BIPs` heading. Non-empty: vertical stack of `<AdminBipCard>` rows inside a max-w-1200 container.

**`components/ui/avatar.tsx`** (shadcn install): Avatar + AvatarFallback used by sidebar for the admin-initials chip.

## Verification outcomes

| Check | Result |
|-------|--------|
| `grep -c "pathname.startsWith('/admin')" middleware.ts` | 1 |
| `grep -c "redirect('/')" "app/(admin)/layout.tsx"` | 1 |
| `grep -r "getSession" middleware.ts "app/(admin)/" lib/queries/adminBips.ts` | (nothing) |
| `grep -r "createAdminClient" "app/(admin)/" lib/queries/adminBips.ts components/admin/` | (nothing) |
| `grep -r "framer-motion" "app/(admin)/" components/admin/` | (nothing) |
| `npm run lint` | exit 0 — No ESLint warnings or errors |
| `npx tsc --noEmit` | exit 0 — clean |
| `npm run build` | exit 0 — /admin route compiled (3.12 kB, ƒ dynamic) |

## shadcn components installed

- `avatar` — yes (this plan; required by AdminSidebar admin-initials chip).
- `dropdown-menu` — **NOT** installed in this plan. The plan's pre-flight check noted it could be batched here for Plan 03-06, but no AdminSidebar/AdminBipCard surface in 03-02 actually uses it. Plan 03-06 should install it when needed.

## Bootstrap SQL (for manual verification)

The test admin account is promoted via the migration 00008 trigger that mirrors `profiles.role` → `auth.users.app_metadata.role`. Connect to the local Supabase Postgres and run:

```sql
update profiles set role = 'admin' where contact_email = '<your-test-admin-email>';
```

Then sign out + sign back in to refresh the JWT (so `getClaims()` sees the new claim).

## Auto-mode checkpoint disposition

The plan defines Task 4 as `checkpoint:human-verify` requiring a running dev server, a local Supabase, and three browser sessions (anonymous, coordinator, admin). The executor is running autonomously in the GSD orchestrator pipeline, so the checkpoint is **auto-approved per executor auto-mode policy** and the manual verification is deferred to the user once master integrates this plan. All static verification (lint + typecheck + build + all `grep` acceptance checks) passed.

Once the user runs the plan locally, the 9-step verification flow in `03-02-PLAN.md` Task 4 covers:

1. Anon → `/admin` redirects to `/login?next=/admin`.
2. Coordinator JWT → `/admin` redirects to `/`.
3. Admin JWT → `/admin` renders the sidebar + page header.
4. New pending BIP appears at the bottom of the queue (FIFO).
5. EC disclaimer footer present.
6. "Review →" link → 404 (Plan 03-03 seam).
7. Mobile breakpoint < 960px: burger → Sheet drawer renders nav.

## Deviations from Plan

### [Rule 3 — blocking-issue] LogoMark `size` prop does not exist

- **Found during:** Tasks 1, 2 reading
- **Issue:** Plan example and 03-PATTERNS.md both call `<LogoMark size={32} />`, but the actual `components/home/LogoMark.tsx` exports `LogoMark({ className }: { className?: string })`. The component is hardcoded to 32×32 width/height. Passing `size` is a TS error.
- **Fix:** Used `<LogoMark />` with no props (matches existing `DashboardNav` usage).
- **Files modified:** `components/admin/AdminSidebar.tsx` (two call sites).
- **Commit:** 4edb868 (Task 2)

### [Rule 3 — blocking-issue] SheetTrigger `asChild` prop does not exist on base-ui Dialog

- **Found during:** Task 2 implementation
- **Issue:** Plan example uses `<SheetTrigger asChild><Button …/></SheetTrigger>`, but `components/ui/sheet.tsx` wraps `@base-ui/react/dialog` whose Trigger uses the `render` prop pattern, not Radix-style `asChild`.
- **Fix:** Used `<SheetTrigger render={<Button … />} />` per base-ui's documented composition pattern.
- **Files modified:** `components/admin/AdminSidebar.tsx`
- **Commit:** 4edb868 (Task 2)

### [Rule 3 — blocking-issue] Button `variant="default"` does not exist

- **Found during:** Task 3 implementation
- **Issue:** Plan example passes `variant="default"` to `<Button>`, but `components/ui/button.tsx` defines variants as `primary | gold | ghost | outline | secondary | destructive | link` with a default of `primary` (no `'default'` literal).
- **Fix:** Used `variant="primary"` explicitly on the Review button. Also dropped `className="rounded-pill"` because the Button base class already applies `rounded-pill`.
- **Files modified:** `components/admin/AdminBipCard.tsx`
- **Commit:** 308181d (Task 3)

### [Rule 2 — auto-add-missing] Strip "getSession" / "createAdminClient" string tokens even inside comments

- **Found during:** Task 1 + Task 3 self-check
- **Issue:** Initial drafts had cautionary comments containing the bare tokens `getSession` and `createAdminClient`. The plan's acceptance criteria say "contains zero occurrences" — strict.
- **Fix:** Rephrased the documentation comments to describe the same constraint without using the forbidden tokens verbatim.
- **Files modified:** `app/(admin)/layout.tsx`, `lib/queries/adminBips.ts`
- **Commits:** ce14e09 (Task 1), 308181d (Task 3)

## Commits

| Task | Description | Commit |
|------|-------------|--------|
| pre  | install shadcn avatar | da5b42b |
| 1    | middleware admin gate + (admin)/layout.tsx | ce14e09 |
| 2    | AdminSidebar (desktop + Sheet drawer) | 4edb868 |
| 3    | adminBips query + AdminBipCard + queue page | 308181d |

## Files

**Created**
- `app/(admin)/layout.tsx`
- `app/(admin)/admin/page.tsx`
- `components/admin/AdminSidebar.tsx`
- `components/admin/AdminBipCard.tsx`
- `lib/queries/adminBips.ts`
- `components/ui/avatar.tsx`

**Modified**
- `middleware.ts`
- `package-lock.json`

## Requirements satisfied

- **ADMN-01** — Admin route gating: middleware (layer 1) + RSC layout (layer 2) in place. Layer 3 RLS already live from Plan 03-01.
- **ADMN-02** — Pending queue (FIFO): `.order('created_at', { ascending: true })` confirmed in query and asserted by Task 3 grep.

## Self-Check: PASSED

Files verified present:
- FOUND: app/(admin)/layout.tsx
- FOUND: app/(admin)/admin/page.tsx
- FOUND: components/admin/AdminSidebar.tsx
- FOUND: components/admin/AdminBipCard.tsx
- FOUND: lib/queries/adminBips.ts
- FOUND: components/ui/avatar.tsx

Commits verified in git log:
- FOUND: da5b42b
- FOUND: ce14e09
- FOUND: 4edb868
- FOUND: 308181d

## PLAN COMPLETE
