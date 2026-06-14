# Phase 3: Admin Review + Email Notifications — Pattern Map

**Mapped:** 2026-05-12
**Files analyzed:** 22 new/modified files
**Analogs found:** 21 / 22

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app/(admin)/layout.tsx` | layout | request-response | `app/(dashboard)/layout.tsx` | exact |
| `app/(admin)/admin/page.tsx` | page (RSC) | CRUD | `app/(dashboard)/dashboard/page.tsx` | role-match |
| `app/(admin)/admin/bips/[id]/review/page.tsx` | page (RSC) | CRUD | `app/(public)/bip/[slug]/page.tsx` | role-match |
| `app/(admin)/admin/bips/page.tsx` | page (RSC) | CRUD | `app/(public)/bips/page.tsx` | role-match |
| `app/(admin)/admin/bips/[id]/edit/page.tsx` | page (RSC shell) | CRUD | `app/(dashboard)/bips/[id]/edit/page.tsx` | exact |
| `app/(admin)/admin/analytics/page.tsx` | page (RSC) | CRUD | `app/(dashboard)/dashboard/page.tsx` | role-match |
| `components/admin/AdminBipCard.tsx` | component | request-response | `components/dashboard/DashboardBipCard.tsx` | role-match |
| `components/admin/AdminSidebar.tsx` | component | request-response | `components/dashboard/DashboardNav.tsx` | role-match |
| `components/admin/ApproveBipModal.tsx` | component | request-response | `components/dashboard/DeleteDraftDialog.tsx` | exact |
| `components/admin/RejectBipModal.tsx` | component | request-response | `components/dashboard/WithdrawBipDialog.tsx` | exact |
| `components/admin/AdminActionsPanel.tsx` | component | request-response | `components/dashboard/DashboardBipCard.tsx` | partial |
| `lib/actions/admin-bips.ts` | server action | CRUD | `lib/actions/bip-status.ts` | role-match |
| `lib/queries/adminBips.ts` | query | CRUD | `lib/queries/coordinatorBips.ts` | exact |
| `lib/queries/adminAnalytics.ts` | query | CRUD | `lib/queries/bips.ts` | role-match |
| `lib/queries/statusHistory.ts` | query | CRUD | `lib/queries/coordinatorBipById.ts` | role-match |
| `lib/email/send.ts` | utility | request-response | (none — new pattern) | no-analog |
| `lib/email/templates/ApprovalEmail.tsx` | template | transform | (none — new pattern) | no-analog |
| `lib/email/templates/RejectionEmail.tsx` | template | transform | (none — new pattern) | no-analog |
| `lib/email/templates/AdminNotificationEmail.tsx` | template | transform | (none — new pattern) | no-analog |
| `lib/utils/status-transitions.ts` | utility | transform | `lib/utils/status.ts` | role-match |
| `lib/schemas/admin-bips.ts` | schema | transform | `lib/schemas/auth.ts` | role-match |
| `middleware.ts` (modify) | middleware | request-response | `middleware.ts` | exact |
| `supabase/migrations/00010_bip_status_history.sql` | migration | CRUD | `supabase/migrations/00006_rls_policies.sql` | role-match |
| `supabase/migrations/00011_bips_update_own_editable.sql` | migration | CRUD | `supabase/migrations/00006_rls_policies.sql` | exact |
| `components/forms/BipSubmissionWizard.tsx` (modify) | component | CRUD | `components/forms/BipSubmissionWizard.tsx` | self |

---

## Pattern Assignments

### `app/(admin)/layout.tsx` (layout, request-response)

**Analog:** `app/(dashboard)/layout.tsx`

**Read first:** `app/(dashboard)/layout.tsx` lines 1–92 (full file, ≤ 2000 lines)

**Imports pattern** (lines 1–5):
```typescript
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { Toaster } from '@/components/ui/sonner'
import { DashboardNav } from '@/components/dashboard/DashboardNav'
```
Replace `DashboardNav` import with `AdminSidebar` from `@/components/admin/AdminSidebar`.

**Auth guard pattern** (lines 40–43):
```typescript
const supabase = await createClient()
const { data, error } = await supabase.auth.getClaims()
if (error || !data?.claims?.sub) redirect('/login')
const claims = data.claims
```

**Admin-specific role check (Phase 3 addition — after line 43):**
```typescript
const role = claims.app_metadata?.role
if (role !== 'admin') redirect('/')
```
Note: `app_metadata.role` is populated by the trigger in migration 00008. Never use `getSession()` — only `getClaims()`.

**Profile query pattern** (lines 50–54 — admin version fetches name for sidebar):
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('full_name, contact_email')
  .eq('id', claims.sub)
  .maybeSingle()
```

**Initials derivation** (lines 68–80 — copy verbatim):
```typescript
const fromName = profile?.full_name
  ? profile.full_name.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
  : null
const emailLocal = typeof claims.email === 'string' ? claims.email.split('@')[0] : null
const fromEmail = emailLocal ? emailLocal.slice(0, 2).toUpperCase() : null
const initials = fromName || fromEmail || '··'
```

**Layout shell** (lines 82–91 — replace DashboardNav with AdminSidebar, change flex direction):
```tsx
return (
  <div className="min-h-screen bg-bg-soft flex">
    <AdminSidebar initials={initials} fullName={profile?.full_name ?? ''} email={profile?.contact_email ?? ''} />
    <div className="flex-1 flex flex-col min-w-0">
      <main className="flex-1">{children}</main>
      <p className="px-6 py-4 text-[11px] text-muted">
        Independent project — not affiliated with the European Commission
      </p>
    </div>
    <Toaster position="bottom-right" richColors={false} closeButton />
  </div>
)
```

No profile-complete gate in admin layout (admin accounts are bootstrapped via SQL — CONTEXT.md Specifics).

---

### `app/(admin)/admin/page.tsx` (page RSC, CRUD)

**Analog:** `app/(dashboard)/dashboard/page.tsx`

**Read first:** `app/(dashboard)/dashboard/page.tsx` lines 1–49 (full file)

**Imports pattern** (lines 1–4):
```typescript
import { Button } from '@/components/ui/button'
import { DashboardBipList } from '@/components/dashboard/DashboardBipList'
import { getCoordinatorBips } from '@/lib/queries/coordinatorBips'
```
Replace with `AdminBipCard` and `getAdminPendingBips` from `@/lib/queries/adminBips`.

**Page header pattern** (lines 24–32 — copy structure, change content):
```tsx
<div className="flex items-center justify-between border-b border-border bg-white px-6 py-5 -mx-4 md:-mx-6">
  <div>
    <h1 className="text-[22px] font-semibold text-ink">Pending review</h1>
    <p className="text-sm text-muted">
      {bips.length === 0 ? "You're all caught up" : `${bips.length} BIP${bips.length === 1 ? '' : 's'} awaiting review`}
    </p>
  </div>
  {/* No right-side CTA on queue page — no sort control in v1 */}
</div>
```

**Data fetch pattern** (line 21):
```typescript
const bips = await getAdminPendingBips()
```

**Empty state pattern** (D-16 from CONTEXT.md — Inbox icon, no CTA):
```tsx
{bips.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-24 px-8">
    <div className="flex items-center justify-center w-24 h-24 rounded-full bg-bg-soft mb-6">
      <Inbox className="w-12 h-12 text-muted" />
    </div>
    <h2 className="text-[22px] font-semibold text-ink">No pending BIPs</h2>
    <p className="mt-2 text-base text-muted max-w-md text-center">
      You're all caught up. New submissions will appear here automatically.
    </p>
  </div>
) : (
  <div className="max-w-[1200px] mx-auto px-6 py-6 flex flex-col gap-4">
    {bips.map((bip) => <AdminBipCard key={bip.id} bip={bip} />)}
  </div>
)}
```

---

### `app/(admin)/admin/bips/[id]/review/page.tsx` (page RSC, CRUD)

**Analog:** `app/(public)/bip/[slug]/page.tsx`

**Read first:** `app/(public)/bip/[slug]/page.tsx` lines 106–145

**Params pattern** (lines 106–112 — async params, Next.js 15):
```typescript
export default async function ReviewBipPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const bip = await getAdminBipById(id)
  if (!bip) notFound()
```

**Two-column layout** (lines 119–136 — copy, adjust cols to add 340px actions panel):
```tsx
<div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-x-8">
  <div>
    <BipHeader bip={bip} />
    <BipBody bip={bip} />
  </div>
  <div className="flex flex-col gap-4">
    <BipSidebar bip={bip} mode="admin-review" />
    <AdminActionsPanel bipId={bip.id} bipTitle={bip.title} currentStatus={bip.status} nextPendingId={nextPendingId} />
  </div>
</div>
```

**BipSidebar mode prop** — Phase 3 adds `mode?: 'admin-review'` to `BipSidebar` to suppress the Apply CTA. When `mode === 'admin-review'` do not render `<BipApplyCta>`.

**Back link + next-pending indicator** (above grid, UI-SPEC contract):
```tsx
<div className="flex items-center justify-between h-8 mb-4">
  <Link href="/admin" className="text-sm text-eu-blue hover:underline">← Back to queue</Link>
  <span className="text-sm text-muted">
    {nextPendingId ? `Next pending: ${nextPendingBip?.title}` : 'No more pending after this one'}
  </span>
</div>
```

---

### `app/(admin)/admin/bips/page.tsx` (page RSC, CRUD)

**Analog:** `app/(public)/bips/page.tsx`

**Read first:** `app/(public)/bips/page.tsx` lines 1–110 (full file)

**searchParams pattern** (lines 30–36 — async, Next.js 15):
```typescript
export default async function AdminBipsPage(props: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const sp = await props.searchParams
  const bips = await getAdminBips({ status: sp.status, q: sp.q })
```

**FTS reuse** — `getAdminBips` uses `.textSearch('search_vector', q, { type: 'websearch' })` exactly as in `lib/queries/bips.ts` `applyFilters`, but without the `status='approved'` constraint (admin sees all statuses). See `lib/filters/buildSupabaseQuery.ts` for the `.textSearch()` call pattern.

**Status filter tabs pattern** (from `components/dashboard/DashboardBipList.tsx` — uses shadcn `Tabs`):
Tabs values: `all | draft | pending | approved | rejected`. Read `components/dashboard/DashboardBipList.tsx` for the tab-to-URL-param wiring.

---

### `app/(admin)/admin/bips/[id]/edit/page.tsx` (page RSC shell, CRUD)

**Analog:** `app/(dashboard)/bips/[id]/edit/page.tsx`

**Read first:** `app/(dashboard)/bips/[id]/edit/page.tsx` lines 1–50 (full file)

**Pattern to copy verbatim** (lines 25–50) with two changes:
1. Replace `getCoordinatorBipById` with `getAdminBipById` (no `created_by` filter, no status whitelist — admin can edit any BIP).
2. Pass `mode="admin"` to `<BipSubmissionWizard>`:
```tsx
<BipSubmissionWizard
  initialBip={{ id: record.id, data: record.data, updatedAt: record.updatedAt }}
  hostUniversity={host}
  initialUniversities={initialUniversities}
  mode="admin"
  renderPreviewStep={() => <AdminActionsPanel bipId={record.id} bipTitle={record.data.title ?? ''} currentStatus={record.status} />}
  renderConflictDialog={(props) => <TwoTabConflictDialog {...props} />}
/>
```

---

### `app/(admin)/admin/analytics/page.tsx` (page RSC, CRUD)

**Analog:** `app/(dashboard)/dashboard/page.tsx` (structure), `lib/queries/homepage.ts` (aggregate queries)

**Read first:** `lib/queries/homepage.ts` lines 1–50

**ISR revalidate pattern** (from `app/(public)/bips/page.tsx` line 26 — same mechanism):
```typescript
export const revalidate = 300  // 5 minutes per D-20
```

**Stat card grid layout** (UI-SPEC — 3 cards, gap-6 desktop, gap-4 mobile):
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 max-w-[1200px] mx-auto px-6 py-6">
  <StatCard label="Total BIPs" value={analytics.totalBips} icon={Database} />
  <StatCard label="Submissions this month" value={analytics.submissionsThisMonth} icon={TrendingUp} />
  <StatCard label="Top 5 countries" value={analytics.topCountries} icon={Globe} variant="list" />
</div>
```

Data fetch: `const analytics = await getAdminAnalytics()` — single function returning all three values.

---

### `components/admin/AdminBipCard.tsx` (component, request-response)

**Analog:** `components/dashboard/DashboardBipCard.tsx`

**Read first:** `components/dashboard/DashboardBipCard.tsx` lines 1–156 (full file)

**Client directive + imports pattern** (lines 1–23):
```typescript
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from '@/lib/utils/status'
import { cn } from '@/lib/utils/cn'
```
AdminBipCard does NOT import `DeleteDraftDialog` or `WithdrawBipDialog`. It does NOT use `useState` for modal state — it has no inline action dialogs, just a `Review →` link button.

**Status badge pattern** (lines 73–80 — copy verbatim, always shows 'pending' in queue but same component used in all-listings too):
```tsx
<span
  className={cn(
    'inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold',
    STATUS_BADGE_CLASSES[bip.status],
  )}
>
  {STATUS_LABELS[bip.status]}
</span>
```

**Card container** (line 49 — copy, no change needed):
```tsx
<article className="rounded-md border border-border bg-white shadow-sm p-5">
```

**Admin-specific 3-column layout** (replaces DashboardBipCard's 2-column):
```tsx
<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
  {/* Column 1: title + coordinator info + meta row */}
  <div className="flex-1 min-w-0">
    <h3 className="text-base font-semibold text-ink truncate">{bip.title || 'Untitled BIP'}</h3>
    <p className="mt-1 text-sm text-muted truncate">
      {bip.coordinator_name} · {bip.host_university?.name}
    </p>
    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
      <span>{bip.host_city}</span>
      <span>·</span>
      <span>{bip.physical_start_date} – {bip.physical_end_date}</span>
      <span>·</span>
      <span>Submitted {submittedAgo} days ago</span>
    </div>
  </div>
  {/* Column 2: status pill */}
  {/* Column 3: Review → button */}
  <Link href={`/admin/bips/${bip.id}/review`}>
    <Button variant="default" size="sm" className="rounded-pill">Review →</Button>
  </Link>
</div>
```

**Type definition** — AdminBipCard needs coordinator-identifying fields not on `CoordinatorBip`:
```typescript
export type AdminBip = {
  id: string
  title: string
  status: BipStatus
  host_city: string | null
  physical_start_date: string | null
  physical_end_date: string | null
  created_at: string
  host_university: { id: string; name: string } | null
  coordinator_name: string | null
  coordinator_university: string | null
}
```

---

### `components/admin/AdminSidebar.tsx` (component, request-response)

**Analog:** `components/dashboard/DashboardNav.tsx`

**Read first:** `components/dashboard/DashboardNav.tsx` lines 1–59 (full file)

**signOutAction form pattern** (lines 50–53 — copy verbatim, Server Action stays server-only):
```tsx
<form action={signOutAction}>
  <button type="submit" className="text-sm text-muted hover:text-ink">
    Sign out
  </button>
</form>
```

**LogoMark import** (line 2 — copy verbatim):
```typescript
import { LogoMark } from '@/components/home/LogoMark'
```

**Admin sidebar needs `'use client'`** (unlike DashboardNav which is RSC) because it renders a shadcn `Sheet` drawer on mobile (Sheet requires useState/event handlers). Mark the component file with `'use client'`.

**Desktop layout pattern** (UI-SPEC D-16):
```tsx
<aside className="hidden md:flex md:flex-col w-[240px] min-h-screen border-r border-border bg-white sticky top-0 h-screen px-4 py-6">
  {/* 1. Logo block */}
  <Link href="/" className="flex items-center gap-2 mb-6">
    <LogoMark size={32} />
    <span className="text-base font-bold text-ink">BipHub</span>
    <span className="text-xs text-muted ml-1">Admin</span>
  </Link>
  {/* 2. Nav items */}
  <nav className="flex flex-col gap-1">
    {NAV_ITEMS.map((item) => (
      <AdminNavItem key={item.href} {...item} />
    ))}
  </nav>
  {/* 3. Spacer */}
  <div className="flex-1" />
  {/* 4. Admin identity block */}
  <div className="flex items-center gap-2 mb-3">
    <Avatar>{/* initials */}</Avatar>
    <div className="min-w-0">
      <p className="text-sm text-ink truncate">{fullName}</p>
      <p className="text-xs text-muted truncate">{email}</p>
    </div>
  </div>
  {/* 5. Sign out */}
  <form action={signOutAction}>
    <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted hover:text-ink hover:bg-bg-soft">
      <LogOut size={16} /> Sign out
    </button>
  </form>
</aside>
```

**Mobile top bar + Sheet drawer** — follows same `<Sheet>` pattern as `components/ui/sheet.tsx`. Read `components/ui/sheet.tsx` for Sheet/SheetTrigger/SheetContent import names.

---

### `components/admin/ApproveBipModal.tsx` (component, request-response)

**Analog:** `components/dashboard/DeleteDraftDialog.tsx`

**Read first:** `components/dashboard/DeleteDraftDialog.tsx` lines 1–75 (full file)

**Client directive + useTransition pattern** (lines 1–12 — copy verbatim):
```typescript
'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
```

**useTransition Server Action call pattern** (lines 34–44 — copy structure):
```typescript
const [isPending, startTransition] = useTransition()

function handleConfirm() {
  startTransition(async () => {
    const result = await approveBipAction(bipId, note)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success(`BIP approved. Email sent to ${coordinatorName}.`)
    onOpenChange(false)
    // Navigation handled inside Server Action via redirect()
  })
}
```

**Additional state** (not in DeleteDraftDialog — Approve modal adds):
```typescript
const [note, setNote] = useState('')    // optional note textarea
const [serverError, setServerError] = useState<string | null>(null)
```

**Loading state button pattern** (lines 63–70 — copy, swap delete styling for gold):
```tsx
<Button
  onClick={handleConfirm}
  disabled={isPending}
  className="bg-eu-gold text-ink hover:bg-eu-gold/90 rounded-pill"
>
  {isPending ? (
    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Approving…</>
  ) : 'Approve BIP'}
</Button>
```

**BIP title verbatim block** (UI-SPEC D-04 — gold left border):
```tsx
<div className="bg-bg-soft border-l-4 border-eu-blue rounded-r px-4 py-3 mb-4">
  <p className="text-base font-semibold text-ink">{bipTitle}</p>
</div>
```

**Note textarea with char counter**:
```tsx
<div>
  <Label htmlFor="approve-note">Note for the coordinator (optional)</Label>
  <Textarea
    id="approve-note"
    rows={3}
    maxLength={500}
    value={note}
    onChange={(e) => setNote(e.target.value)}
    placeholder="Add a short congratulatory note..."
  />
  <p className="text-xs text-muted text-right mt-1">{note.length}/500 characters</p>
</div>
```

---

### `components/admin/RejectBipModal.tsx` (component, request-response)

**Analog:** `components/dashboard/WithdrawBipDialog.tsx`

**Read first:** `components/dashboard/WithdrawBipDialog.tsx` lines 1–75 (full file)

**Pattern delta from WithdrawBipDialog:** The core `useTransition` + Dialog structure is identical. Three additions:
1. Zod client-side validation (`reason.length >= 10`) gating the confirm button
2. Required textarea with char counter and validation message
3. Red-fill confirm button (`bg-status-rejected text-white`) instead of amber

**Required reason textarea with RHF + Zod** (Zod v3 — use `@hookform/resolvers` v3.x pattern from `components/auth/LoginForm.tsx`):
```typescript
const RejectBipSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters.').max(1000),
})
```
Use `useForm` + `zodResolver` for the textarea; the confirm button is `disabled` when `!form.formState.isValid`.

**BIP title verbatim block** (red left border for reject vs gold for approve):
```tsx
<div className="bg-bg-soft border-l-4 border-status-rejected rounded-r px-4 py-3 mb-4">
  <p className="text-base font-semibold text-ink">{bipTitle}</p>
</div>
```

**Confirm button with disable guard** (lines 64–70 of WithdrawBipDialog — adapt):
```tsx
<Button
  onClick={handleConfirm}
  disabled={isPending || !form.formState.isValid}
  className="bg-status-rejected text-white hover:bg-red-700 rounded-pill"
>
  {isPending ? (
    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Rejecting…</>
  ) : 'Reject BIP'}
</Button>
```

---

### `components/admin/AdminActionsPanel.tsx` (component, request-response)

**Analog:** `components/dashboard/DashboardBipCard.tsx` (action button placement) + `components/dashboard/DeleteDraftDialog.tsx` (modal pattern)

**Read first:** `components/dashboard/DashboardBipCard.tsx` lines 86–140

**Client directive** — `'use client'` (manages modal open state)

**Panel container** (UI-SPEC sticky pattern):
```tsx
<div className="bg-white border border-border rounded-md p-6 shadow-sm sticky top-20">
  <h2 className="text-[22px] font-semibold text-ink mb-4">Admin actions</h2>
  <div className="flex flex-col gap-3">
    <Button
      className="w-full bg-eu-gold text-ink hover:bg-eu-gold/90 rounded-pill"
      onClick={() => setApproveOpen(true)}
    >
      <Check size={16} className="mr-2" /> Approve BIP
    </Button>
    <Button
      variant="outline"
      className="w-full border-status-rejected text-status-rejected bg-white hover:bg-red-50 rounded-pill"
      onClick={() => setRejectOpen(true)}
    >
      <X size={16} className="mr-2" /> Reject BIP
    </Button>
  </div>
  {/* Helper text */}
  <div className="mt-4 bg-bg-soft rounded-sm px-3 py-2">
    <p className="text-sm text-muted">
      Approving publishes the BIP. Rejecting returns it to the coordinator with your feedback.
    </p>
  </div>
  {nextPendingId && (
    <p className="mt-3 text-xs text-muted">After this action you'll be taken to the next pending BIP.</p>
  )}

  <ApproveBipModal open={approveOpen} onOpenChange={setApproveOpen} bipId={bipId} bipTitle={bipTitle} coordinatorName={coordinatorName} />
  <RejectBipModal open={rejectOpen} onOpenChange={setRejectOpen} bipId={bipId} bipTitle={bipTitle} coordinatorName={coordinatorName} />
</div>
```

---

### `lib/actions/admin-bips.ts` (server action, CRUD)

**Analog:** `lib/actions/bip-status.ts`

**Read first:** `lib/actions/bip-status.ts` lines 1–93 (full file)

**Server directive + createClient pattern** (lines 1–21 — copy verbatim):
```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
```

**Auth + role guard pattern** (lines 30–34 of `bip-status.ts` — extend with role check):
```typescript
const supabase = await createClient()
const { data: claimsData, error: authError } = await supabase.auth.getClaims()
const claims = claimsData?.claims ?? null
if (authError || !claims?.sub) return { error: 'Your session has expired.' }
// Phase 3 addition — admin-only guard:
if (claims.app_metadata?.role !== 'admin') return { error: 'Forbidden.' }
```

**Defense-in-depth read-back pattern** (lines 37–41 — copy structure):
```typescript
const { data: existing, error: readError } = await supabase
  .from('bips')
  .select('id, slug, status, created_by, profiles!created_by(contact_email, full_name)')
  .eq('id', bipId)
  .maybeSingle()
if (readError || !existing) return { error: 'BIP not found.' }
```

**Server Action sequence** (D-11 order — validate → DB write → audit log → revalidatePath → email → redirect):
```typescript
// 1. State machine validation
validateTransition(existing.status, 'approved', 'admin')

// 2. DB write
const { error: updateError } = await supabase
  .from('bips')
  .update({ status: 'approved', updated_at: new Date().toISOString() })
  .eq('id', bipId)
if (updateError) { console.error(...); return { error: 'Failed to approve.' } }

// 3. Audit log INSERT (same createServerClient — admin RLS INSERT policy allows)
await supabase.from('bip_status_history').insert({
  bip_id: bipId,
  from_status: existing.status,
  to_status: 'approved',
  actor_id: claims.sub,
  note: note ?? null,
  action_kind: 'approve',
})

// 4. revalidatePath (BOTH paths)
revalidatePath('/bips')
revalidatePath(`/bip/${existing.slug}`)

// 5. Email — fire-and-forget (catch does NOT re-throw)
try {
  await sendEmail(coordinatorEmail, { template: 'approval', props: { ... } })
} catch (err) {
  console.error('[approveBipAction] email failed:', err)
}

// 6. Auto-advance
const next = await getNextPendingBip(bipId)
redirect(next ? `/admin/bips/${next.id}/review` : '/admin')
```

**rejectBipAction follows same shape** — `to_status: 'rejected'`, `action_kind: 'reject'`, `reason` goes into `note` field, calls `sendEmail` with `template: 'rejection'`.

**adminUpdateBipAction** — similar to `submitBipAction` in `lib/actions/bip-submit.ts` but:
- No status change (D-18)
- audit log INSERT with `action_kind: 'admin_edit'`
- `revalidatePath()` only when status is `'approved'`
- No email send

---

### `lib/queries/adminBips.ts` (query, CRUD)

**Analog:** `lib/queries/coordinatorBips.ts`

**Read first:** `lib/queries/coordinatorBips.ts` lines 1–81 (full file)

**File structure pattern** (lines 1–35 — copy header/type definition pattern):
```typescript
/**
 * Admin BIP queries. No `created_by` filter — admin RLS `bips_select_own_or_approved`
 * returns all rows for admin role.
 * Auth: getClaims() (CLAUDE.md compliance). Never createAdminClient.
 */
import { createClient } from '@/lib/supabase/server'

export type AdminBip = {
  id: string
  slug: string
  title: string
  status: BipStatus
  host_city: string | null
  physical_start_date: string | null
  physical_end_date: string | null
  created_at: string
  updated_at: string
  host_university: { id: string; name: string; country: string } | null
  coordinator_name: string | null     // from profiles join
  coordinator_university: string | null
}
```

**Query function pattern** (lines 35–56 — copy getClaims guard, remove `.eq('created_by', claims.sub)`):
```typescript
export async function getAdminPendingBips(): Promise<AdminBip[]> {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) return []

  const { data, error } = await supabase
    .from('bips')
    .select(`
      id, slug, title, status, host_city,
      physical_start_date, physical_end_date, created_at, updated_at,
      host_university:host_university_id ( id, name, country ),
      coordinator:created_by ( full_name, contact_email,
        university:university_id ( name ) )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })  // FIFO D-02

  if (error) {
    console.error('[getAdminPendingBips] supabase error:', error.message)
    return []
  }
  // ... normalize PostgREST embedded relation same as coordinatorBips.ts lines 57-79
}
```

**Relation normalization pattern** (lines 57–79 of coordinatorBips.ts — copy defensively):
```typescript
const hostUniversity = Array.isArray(row.host_university)
  ? (row.host_university[0] ?? null)
  : (row.host_university ?? null)
```

**`getNextPendingBip(excludeId: string)`** — same query as `getAdminPendingBips` but adds `.neq('id', excludeId).limit(1)`.

**`getAdminBips(filters)`** — same shape as `getBips` in `lib/queries/bips.ts` but removes `status='approved'` filter. Accepts `{ status?: string; q?: string }` and applies `.eq('status', status)` when status is not `'all'`, and `.textSearch('search_vector', q, { type: 'websearch' })` when q is non-empty.

---

### `lib/queries/adminAnalytics.ts` (query, CRUD)

**Analog:** `lib/queries/bips.ts` (aggregate patterns)

**Read first:** `lib/queries/bips.ts` lines 1–76 (full file); `lib/queries/homepage.ts` lines 1–50

**Three queries in one file** (returning a single object per D-20):
```typescript
export type AdminAnalytics = {
  totalBips: number
  submissionsThisMonth: number
  topCountries: Array<{ country: string; count: number }>
}

export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  const supabase = await createClient()

  // 1. Total BIPs excluding seeds (D-20)
  const { count: totalBips } = await supabase
    .from('bips')
    .select('id', { count: 'exact', head: true })
    .eq('is_seed', false)

  // 2. Submissions this month — from bip_status_history
  const startOfMonth = new Date()
  startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0)
  const { count: submissionsThisMonth } = await supabase
    .from('bip_status_history')
    .select('id', { count: 'exact', head: true })
    .eq('action_kind', 'submit')
    .gte('created_at', startOfMonth.toISOString())

  // 3. Top 5 countries — Postgres aggregate via RPC or manual group-by
  // Use a supabase.rpc() call to a simple function, or do it in JS from a full select.
  // Simplest: fetch all bips host_country and group in JS (acceptable for <500 BIPs).
  const { data: countryRows } = await supabase
    .from('bips')
    .select('host_university:host_university_id ( country )')
    .eq('is_seed', false)
    .eq('status', 'approved')

  return { totalBips: totalBips ?? 0, submissionsThisMonth: submissionsThisMonth ?? 0, topCountries }
}
```

**countBips pattern** (lines 70–76 of bips.ts — copy `{ count: 'exact', head: true }` pattern):
```typescript
const { count, error } = await supabase
  .from('bips')
  .select('id', { count: 'exact', head: true })
  .eq('is_seed', false)
if (error) throw error
return count ?? 0
```

---

### `lib/queries/statusHistory.ts` (query, CRUD)

**Analog:** `lib/queries/coordinatorBipById.ts`

**Read first:** `lib/queries/coordinatorBipById.ts` lines 1–45

**getClaims guard pattern** (lines 38–45 — copy verbatim):
```typescript
const supabase = await createClient()
const { data: authData, error: authError } = await supabase.auth.getClaims()
const claims = authData?.claims ?? null
if (authError || !claims?.sub) return null
```

**`getLatestRejection(bipId)` pattern:**
```typescript
export type LatestRejection = { reason: string | null; created_at: string } | null

export async function getLatestRejection(bipId: string): Promise<LatestRejection> {
  const supabase = await createClient()
  // No auth guard needed for coordinator dashboard — RLS bsh_select_own_or_admin
  // enforces: coordinator can only see their own BIP's history

  const { data, error } = await supabase
    .from('bip_status_history')
    .select('note, created_at')
    .eq('bip_id', bipId)
    .eq('to_status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[getLatestRejection] supabase error:', error.message)
    return null
  }
  return data ? { reason: data.note, created_at: data.created_at } : null
}
```

**Integration with DashboardBipCard** — Phase 3 modifies `getCoordinatorBips()` to join `bip_status_history` for the latest rejection reason, or `DashboardBipCard` calls `getLatestRejection` directly in an RSC parent and passes `rejection_reason` as a prop. Prefer the query-level join to avoid N+1 — add a subquery or lateral join in `getCoordinatorBips`.

---

### `lib/email/send.ts` (utility, request-response)

**No analog in codebase** — new external integration pattern.

**Pattern from 03-RESEARCH.md Pattern 5:**
```typescript
// lib/email/send.ts
import { Resend } from 'resend'
import { render } from '@react-email/components'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null  // D-15: dev fallback — log to console when key unset

export async function sendEmail(to: string, payload: EmailPayload): Promise<void> {
  const html = await render(<Component {...payload.props} />)

  if (!resend) {
    console.log('[EMAIL DEV]', { to, subject, html })
    return
  }
  await resend.emails.send({
    from: 'BipHub <noreply@biphub.eu>',  // D-13
    to,
    replyTo: process.env.ADMIN_REPLY_TO_EMAIL ?? 'noreply@biphub.eu',
    subject,
    html,
  })
}
```

**Error handling contract** — callers MUST wrap `sendEmail()` in try/catch. The function does NOT throw on Resend errors. A Resend outage must not reverse a committed DB transaction (D-11).

---

### `lib/email/templates/ApprovalEmail.tsx`, `RejectionEmail.tsx`, `AdminNotificationEmail.tsx` (templates, transform)

**No analog in codebase** — React Email is new in Phase 3.

**@react-email/components import pattern** (from 03-RESEARCH.md Pattern 6):
```tsx
import { Html, Head, Body, Container, Text, Button, Hr, Section } from '@react-email/components'
```

**All styles are inline** — no Tailwind classes (React Email renders outside Next.js; Tailwind is not available). Use EU hex literals: `#003399` (blue), `#FFCC00` (gold), `#0a1735` (ink), `#f7f8fc` (bg-soft).

**EC disclaimer** — every template must include at the bottom:
```tsx
<Text style={{ fontSize: '12px', color: '#6b7280' }}>
  Independent project — not affiliated with the European Commission
</Text>
```

**ApprovalEmail props interface**:
```typescript
export interface ApprovalEmailProps {
  bipTitle: string
  bipSlug: string
  note?: string          // optional admin note (D-14: shown only if set)
  coordinatorName: string
}
```

**RejectionEmail props interface**:
```typescript
export interface RejectionEmailProps {
  bipTitle: string
  bipId: string          // for edit link: /dashboard/bips/{id}/edit
  reason: string         // verbatim rejection reason shown in callout
  coordinatorName: string
}
```
Rejection reason callout: `border-left: 4px solid #FFCC00` (gold, not red — UI-SPEC §Color note).

**AdminNotificationEmail props interface**:
```typescript
export interface AdminNotificationEmailProps {
  bipTitle: string
  bipId: string          // for review link: /admin/bips/{id}/review
  coordinatorName: string
  coordinatorUniversity: string
  submittedAt: string    // ISO timestamp
}
```

---

### `lib/utils/status-transitions.ts` (utility, transform)

**Analog:** `lib/utils/status.ts`

**Read first:** `lib/utils/status.ts` lines 1–29 (full file)

**Static lookup pattern** (same never-use-template-literals discipline as STATUS_BADGE_CLASSES):
```typescript
// lib/utils/status-transitions.ts
// Source: D-06 state machine table in 03-CONTEXT.md

type Actor = 'coordinator' | 'admin'
type BipStatus = 'draft' | 'pending' | 'approved' | 'rejected'

const ALLOWED_TRANSITIONS: Array<{ from: BipStatus | null; to: BipStatus; actor: Actor }> = [
  { from: null,       to: 'draft',    actor: 'coordinator' },
  { from: 'draft',    to: 'pending',  actor: 'coordinator' },
  { from: 'pending',  to: 'approved', actor: 'admin' },
  { from: 'pending',  to: 'rejected', actor: 'admin' },
  { from: 'rejected', to: 'draft',    actor: 'coordinator' },
  { from: 'approved', to: 'rejected', actor: 'admin' },
  { from: 'pending',  to: 'draft',    actor: 'coordinator' },
]

export function validateTransition(from: BipStatus | null, to: BipStatus, actor: Actor): void {
  const valid = ALLOWED_TRANSITIONS.some(t => t.from === from && t.to === to && t.actor === actor)
  if (!valid) throw new Error(`Invalid status transition: ${String(from)} → ${to} by ${actor}`)
}
```

---

### `lib/schemas/admin-bips.ts` (schema, transform)

**Analog:** `lib/schemas/auth.ts`

**Read first:** `lib/schemas/auth.ts` lines 1–47 (full file)

**Zod v3 schema pattern** (lines 1–2 — copy comment):
```typescript
import { z } from 'zod' // Zod v3 — see CLAUDE.md (locked stack)
```

**Schemas**:
```typescript
export const ApproveBipSchema = z.object({
  bipId: z.string().uuid(),
  note: z.string().max(500).optional(),
})
export type ApproveBipInput = z.infer<typeof ApproveBipSchema>

export const RejectBipSchema = z.object({
  bipId: z.string().uuid(),
  reason: z.string().min(10, 'Reason must be at least 10 characters.').max(1000),
})
export type RejectBipInput = z.infer<typeof RejectBipSchema>
```

These are used for both client-side RHF validation (via `zodResolver`) and server-side Server Action re-validation. Same dual-use pattern as `registerSchema` in auth.ts.

---

### `middleware.ts` (modify existing, request-response)

**Analog:** `middleware.ts` (self — add admin branch)

**Read first:** `middleware.ts` lines 1–64 (full file)

**Add admin branch AFTER the existing dashboard/onboarding branch** (after line 39, before line 43):
```typescript
// (3b) Admin-required: admin route group.
// Phase 3 addition: admin gate (triple-layer guard layer 1).
if (pathname.startsWith('/admin')) {
  if (!claims) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', '/admin')
    return NextResponse.redirect(loginUrl)
  }
  const role = claims?.app_metadata?.role
  if (role !== 'admin') {
    // Logged in but not admin: bounce to home (not login — avoids redirect loop)
    return NextResponse.redirect(new URL('/', request.url))
  }
}
```

**`claims.app_metadata` is typed** — `claims` is `data?.claims ?? null` (line 27). Access as `claims?.app_metadata?.role`. The `app_metadata` shape comes from migration 00008 which writes `{ role: 'admin' | 'coordinator' }` into `auth.users.raw_app_meta_data`.

**Matcher unchanged** — comment on line 52 explicitly states "DO NOT modify". The existing regex already passes `/admin/*` paths through since they don't match the exclusion list.

---

### `supabase/migrations/00010_bip_status_history.sql` (migration, CRUD)

**Analog:** `supabase/migrations/00006_rls_policies.sql`

**Read first:** `supabase/migrations/00006_rls_policies.sql` lines 1–50 (header + first table block)

**Header comment convention** (lines 1–9 of 00006 — copy format):
```sql
-- 00010_bip_status_history.sql
-- New append-only audit log for BIP status transitions (Phase 3 ADMN-08).
-- PITFALLS Pitfall 5 does not apply to INSERT-only policies but is noted for
-- completeness. UPDATE and DELETE have NO policies — denied for everyone (D-08).
```

**ENABLE ROW LEVEL SECURITY pattern** (CLAUDE.md never-do: every new table needs this):
```sql
alter table public.bip_status_history enable row level security;
```

**Admin role check in RLS** (lines 27–29 of 00006 — copy pattern exactly):
```sql
(select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
```

**`ON DELETE SET NULL` on both FKs** (D-07 — preserves audit trail after hard-delete):
```sql
bip_id   uuid references public.bips(id) on delete set null,
actor_id uuid references public.profiles(id) on delete set null,
```

**action_kind CHECK constraint** (D-07):
```sql
action_kind text not null check (action_kind in ('submit','approve','reject','resubmit','admin_edit','withdraw')),
```

**SELECT policy** (lines 97–107 of 00006 — same `OR` pattern for admin + own):
```sql
create policy "bsh_select_own_or_admin"
  on public.bip_status_history for select
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or exists (
      select 1 from public.bips
      where bips.id = bip_status_history.bip_id
        and bips.created_by = (select auth.uid())
    )
  );
```

---

### `supabase/migrations/00011_bips_update_own_editable.sql` (migration, CRUD)

**Analog:** `supabase/migrations/00006_rls_policies.sql` lines 117–134

**Read first:** `supabase/migrations/00006_rls_policies.sql` lines 117–134

**Drop-then-replace pattern** (D-10 — see 03-CONTEXT.md exact SQL):
```sql
-- 00011_rls_coordinator_editable.sql
-- Replace bips_update_own_draft_or_pending (00006) with bips_update_own_editable.
-- Extends USING to include 'rejected' source state; WITH CHECK forces post-image to 'draft'.
-- PITFALLS Pitfall 5: BOTH using AND with check required on UPDATE.

drop policy if exists "bips_update_own_draft_or_pending" on public.bips;

create policy "bips_update_own_editable"
  on public.bips for update
  to authenticated
  using (
    (select auth.uid()) = created_by
    and status in ('draft', 'pending', 'rejected')
  )
  with check (
    (select auth.uid()) = created_by
    and status = 'draft'  -- post-image MUST be draft; no direct rejected→pending
  );
```

**WITH CHECK constraint rationale** (from 00006 lines 120–123 comment pattern):
A coordinator who sends `status='pending'` on a rejected BIP has the WITH CHECK fail (post-image is `'pending'`, not `'draft'`). The only valid path to `'pending'` is `submitBipAction` which writes `status='pending'` as a separate, explicitly-validated operation.

---

### `components/forms/BipSubmissionWizard.tsx` (modify existing, CRUD)

**Analog:** self

**Read first:** `components/forms/BipSubmissionWizard.tsx` lines 1–80 (Props interface + STEPS constant)

**Props interface change** (lines 51–68 — add `mode` prop):
```typescript
interface Props {
  initialBip?: { id: string; data: BipDraftData; updatedAt: string }
  hostUniversity: { id: string; name: string; country: string }
  initialUniversities: UniversitySearchResult[]
  renderPreviewStep?: (props: { onSubmitConfirmed: () => void; isSubmitting: boolean }) => React.ReactNode
  renderConflictDialog?: (props: { open: boolean; onReload: () => void; onOverwrite: () => void }) => React.ReactNode
  mode?: 'coordinator' | 'admin'  // Phase 3 addition — defaults to 'coordinator'
}
```

**Admin banner** (insert before step content render, inside JSX — after STEPS header, before step body):
```tsx
{mode === 'admin' && (
  <div className="bg-status-pending-bg border border-status-pending rounded-md px-4 py-2 text-sm text-ink-2 mb-4">
    Editing as admin — coordinator will not be notified.
  </div>
)}
```

**Suppress localStorage in admin mode** — in the `useEffect` that calls `hydrate()`, add:
```typescript
useEffect(() => {
  if (mode === 'admin') return  // admin uses hydrateFromServer, not localStorage
  hydrate()
}, [hydrate, mode])
```

**Suppress auto-save in admin mode** — the `useDebouncedCallback` that calls `saveDraftAction` should check:
```typescript
const debouncedAutoSave = useDebouncedCallback(async (data: BipDraftData) => {
  if (mode === 'admin') return  // admin saves explicitly via adminUpdateBipAction
  await saveDraftAction(bipId, data)
}, 1500)
```

---

## Shared Patterns

### Authentication + Role Guard
**Source:** `app/(dashboard)/layout.tsx` lines 40–43 + Phase 3 role addition
**Apply to:** `app/(admin)/layout.tsx`, all files in `lib/actions/admin-bips.ts`
```typescript
const supabase = await createClient()  // MUST await — Next.js 15 (lib/supabase/server.ts)
const { data, error } = await supabase.auth.getClaims()
if (error || !data?.claims?.sub) redirect('/login')  // or return { error }
const claims = data.claims
// Phase 3 admin check:
if (claims.app_metadata?.role !== 'admin') redirect('/')  // or return { error: 'Forbidden.' }
```
NEVER use `getSession()` — it does not validate JWT signatures (CLAUDE.md critical never-do).

### Supabase Client Factory
**Source:** `lib/supabase/server.ts` lines 17–40 (full factory)
**Apply to:** All Server Actions and RSC queries
```typescript
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()  // await is mandatory — Next.js 15
```

### RLS Admin Role Pattern
**Source:** `supabase/migrations/00006_rls_policies.sql` lines 27–29
**Apply to:** All new RLS policies in 00010 and 00011
```sql
(select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
```
Use the subquery form `(select ...)` for plan cache friendliness (ARCHITECTURE.md).

### revalidatePath for Cache Busting
**Source:** `lib/actions/bip-submit.ts` line 258
**Apply to:** `approveBipAction`, `rejectBipAction`, `adminUpdateBipAction` (when approved BIP)
```typescript
revalidatePath('/bips')
revalidatePath(`/bip/${bip.slug}`)  // exact slug path for ISR bust
revalidatePath('/admin')             // admin queue
```

### Dialog + useTransition Pattern
**Source:** `components/dashboard/DeleteDraftDialog.tsx` lines 11–75 (full file)
**Apply to:** `ApproveBipModal`, `RejectBipModal`
```typescript
const [isPending, startTransition] = useTransition()
function handleConfirm() {
  startTransition(async () => {
    const result = await serverAction(...)
    if (result.error) { toast.error(result.error); return }
    toast.success('...')
    onOpenChange(false)
  })
}
```

### STATUS_BADGE_CLASSES Reuse
**Source:** `lib/utils/status.ts` lines 17–29
**Apply to:** `AdminBipCard`, all-listings rows, status filter tabs
```typescript
import { STATUS_BADGE_CLASSES, STATUS_LABELS } from '@/lib/utils/status'
// Then: STATUS_BADGE_CLASSES[bip.status] — NEVER template literals (Tailwind v4)
```

### Server Action Error Return Shape
**Source:** `lib/actions/bip-status.ts` lines 24, 29
**Apply to:** `approveBipAction`, `rejectBipAction`, `adminUpdateBipAction`
```typescript
type ActionResult = { error?: string; success?: true }
// Return early on error: return { error: '...' }
// Return on success: return { success: true }
```

### PostgREST Embedded Relation Normalization
**Source:** `lib/queries/coordinatorBips.ts` lines 57–62
**Apply to:** All new queries with embedded relations (adminBips.ts, statusHistory.ts)
```typescript
const hostUniversity = Array.isArray(row.host_university)
  ? (row.host_university[0] ?? null)
  : (row.host_university ?? null)
```

### EC Disclaimer (mandatory on every page)
**Source:** `app/(dashboard)/layout.tsx` line 86–88
**Apply to:** `app/(admin)/layout.tsx` shell, all email templates
```tsx
<p className="px-6 py-4 text-[11px] text-muted">
  Independent project — not affiliated with the European Commission
</p>
```

### motion/react + LazyMotion Import
**Source:** `components/forms/BipSubmissionWizard.tsx` line 38
**Apply to:** Any animated admin transitions (modal mount, card hover)
```typescript
import { LazyMotion, domAnimation, m } from 'motion/react'
// Wrap animated sections in <LazyMotion features={domAnimation}>
// NEVER import from 'framer-motion' (CLAUDE.md critical never-do)
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `lib/email/send.ts` | utility | request-response | No email send wrapper exists; Resend SDK is a new dependency |
| `lib/email/templates/ApprovalEmail.tsx` | template | transform | React Email is new in Phase 3; no existing email templates |
| `lib/email/templates/RejectionEmail.tsx` | template | transform | Same — React Email new dependency |
| `lib/email/templates/AdminNotificationEmail.tsx` | template | transform | Same — React Email new dependency |

For these files, use the code skeletons in 03-RESEARCH.md Pattern 5 and Pattern 6 as the primary reference. Key rules: inline styles only (no Tailwind), EU hex literals, `@react-email/components` primitives, mandatory EC disclaimer footer.

---

## Metadata

**Analog search scope:** `app/`, `components/`, `lib/`, `supabase/migrations/`
**Files scanned:** 25 source files + 9 migration files
**Pattern extraction date:** 2026-05-12
