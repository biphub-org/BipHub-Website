# Phase 3: Admin Review + Email Notifications — Research

**Researched:** 2026-05-11
**Domain:** Admin editorial loop — triple-layer role guard, state machine transitions, Resend Node SDK transactional email, React Email templates, `bip_status_history` audit log, `(admin)` route group, wizard reuse.
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01 — Queue layout:** `AdminBipCard` variant. Cards everywhere (CLAUDE.md). Each card: title, coordinator name + university, submitted date, host city, physical dates, status pill, `Review →` link.
- **D-02 — Queue sort:** FIFO oldest-first. No sort control in v1.
- **D-03 — Review actions location:** Dedicated `/admin/bips/[id]/review` page. Reuses Phase 1 `BipBody` + `BipSidebar`. Admin-actions panel pinned to right column.
- **D-04 — Confirmation modals:** Approve — optional note textarea, "Approve BIP" confirm. Reject — required reason textarea min 10 chars, "Reject BIP" confirm.
- **D-05 — Post-action navigation:** Auto-advance to next pending BIP. Empty queue → redirect to `/admin` with empty-state.
- **D-06 — State machine (complete v1):**
  | From | To | Actor |
  |---|---|---|
  | (nil) | draft | coordinator create |
  | draft | pending | coordinator submit |
  | pending | approved | admin approveBipAction |
  | pending | rejected | admin rejectBipAction |
  | rejected | draft | coordinator edit (any save) |
  | draft | pending | coordinator resubmit |
  | approved | rejected | admin rejectBipAction |
  | pending | draft | coordinator withdraw (Phase 2 locked) |
  | (any) | (deleted) | admin hard delete |
- **D-07 — `bip_status_history` schema:** `id uuid`, `bip_id uuid → bips(id) ON DELETE SET NULL`, `from_status text`, `to_status text NOT NULL`, `actor_id uuid → profiles(id) ON DELETE SET NULL`, `note text`, `action_kind text NOT NULL` ('submit'|'approve'|'reject'|'resubmit'|'admin_edit'|'withdraw'), `created_at timestamptz NOT NULL default now()`.
- **D-08 — `bip_status_history` RLS:** SELECT coordinator-scoped (own BIPs) or admin (all). INSERT admin-only via Server Action (uses `createServerClient`, NOT `createAdminClient`). UPDATE/DELETE denied for all.
- **D-09 — Rejection reason surface:** Latest `bip_status_history` row where `to_status = 'rejected'` for that BIP. `getLatestRejection(bipId)` in `lib/queries/`.
- **D-10 — RLS extension for coordinator resubmit:** Replace `bips_update_own_draft_or_pending` with `bips_update_own_editable`. USING: `created_by = auth.uid() AND status IN ('draft','pending','rejected')`. WITH CHECK: `created_by = auth.uid() AND status = 'draft'`.
- **D-11 — Email transport:** Resend Node SDK called directly inside Server Actions. DB write → audit log → `revalidatePath()` → `await resend.emails.send()`. Email failures caught+logged, do NOT rollback DB.
- **D-12 — Template approach:** React Email in `lib/email/templates/*.tsx`. Three templates: `ApprovalEmail`, `RejectionEmail`, `AdminNotificationEmail`.
- **D-13 — Sender identity:** `BipHub <noreply@biphub.eu>`. Reply-To from `ADMIN_REPLY_TO_EMAIL` env var.
- **D-14 — Email content (locked):** ApprovalEmail subject "Your BIP is live on BipHub". RejectionEmail subject "Update needed on your BIP submission". AdminNotificationEmail subject "New BIP pending review: {title}".
- **D-15 — Local dev email:** When `RESEND_API_KEY` unset, `lib/email/send.ts` logs rendered HTML + recipient + subject to console.
- **D-16 — Admin nav (user-chosen):** Left sidebar (240px desktop, collapses to top bar + Sheet drawer mobile). Sections: Queue (`/admin`), All BIPs (`/admin/bips`), Analytics (`/admin/analytics`).
- **D-17 — Admin edit pattern:** Reuse `BipSubmissionWizard` with `mode: 'coordinator' | 'admin'` prop. Admin banner "Editing as admin — coordinator will not be notified." Step 5 replaces Submit CTA with admin-actions panel.
- **D-18 — Admin edit does NOT change status.** `revalidatePath()` fires for approved BIPs.
- **D-19 — All-listings (`/admin/bips`):** Dedicated page (not fork of `/bips`). Status filter (All/Draft/Pending/Approved/Rejected) + FTS search. Each row links to `/admin/bips/[id]/edit`.
- **D-20 — Analytics:** 3 stat cards. Total BIPs (`is_seed=false`). Submissions this month (`action_kind='submit'` + current month). Top 5 host countries. `export const revalidate = 300`. No charts in v1.

### Claude's Discretion

- D-01, D-02, D-03, D-04, D-07, D-12, D-13, D-14, D-17, D-19, D-20 — all defaulted by Claude (recorded in DISCUSSION-LOG.md). Implementation detail decisions within these.

### Deferred Ideas (OUT OF SCOPE)

- n8n / workflow automation — v2
- Resend webhook for delivery status — v2
- Multi-admin support / `/admin/users` — v2
- "Request changes" action (GROW-03) — v2
- Analytics charts — v2
- Audit log timeline view for coordinators — v2
- Admin BCC on coordinator status emails — v2
- Field-diff JSONB snapshots in `bip_status_history` — v2
- Email bounce/unsubscribe handling — v2

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ADMN-01 | Admin role enforced at three layers (middleware, layout, RLS) reading from JWT `app_metadata` | See Triple-Layer Guard pattern; existing `getClaims()` + `app_metadata.role` mechanism confirmed in codebase |
| ADMN-02 | Admin views pending BIPs queue | RSC page fetches `bips` WHERE `status = 'pending'` ORDER BY `created_at ASC`; existing `bips_select_own_or_approved` RLS admin clause covers this |
| ADMN-03 | Admin approves BIP with optional note | `approveBipAction` Server Action; state machine guard; audit log INSERT; `revalidatePath()` |
| ADMN-04 | Admin rejects BIP with required reason note | `rejectBipAction`; reason ≥ 10 chars (Zod v3); same Server Action pattern |
| ADMN-05 | Admin edits any BIP listing | `BipSubmissionWizard mode='admin'`; `adminUpdateBipAction`; D-17 |
| ADMN-06 | Admin views all listings filtered by status | `/admin/bips` dedicated RSC page; existing FTS + `bips_select_own_or_approved` admin clause |
| ADMN-07 | Admin sees analytics (total BIPs, submissions/month, top countries) | Three RSC stat cards; `bip_status_history` + `bips` queries; `revalidate = 300` |
| ADMN-08 | Admin actions recorded in `bip_status_history` | New table migration; INSERT in each Server Action |
| ADMN-09 | Coordinator receives Resend email on approval | `ApprovalEmail` template + `resend.emails.send()` inside `approveBipAction` |
| ADMN-10 | Coordinator receives Resend email on rejection (with reason) | `RejectionEmail` template + `resend.emails.send()` inside `rejectBipAction` |
| ADMN-11 | Admin receives Resend email on new BIP submission | `AdminNotificationEmail` template + `resend.emails.send()` inside Phase 2 `submitBipAction` (Phase 3 adds this call) |

</phase_requirements>

---

## Summary

Phase 3 closes the editorial loop with three interlocking concerns: (1) admin access control at three independent layers, (2) a state-machine-validated approve/reject workflow with an immutable audit log, and (3) Resend transactional email via React Email templates.

The triple-layer guard (middleware + layout + RLS) is an extension of the exact same `getClaims() → app_metadata.role` pattern already running in the codebase for the coordinator dashboard guard. Phase 3 adds the `/admin` branch to `middleware.ts` and mirrors the `(dashboard)/layout.tsx` two-gate pattern in `(admin)/layout.tsx`. The RLS `bips_update_admin` policy already exists in migration 00006 — no change needed for admin mutations.

The state machine is enforced at the Server Action layer via a `lib/utils/status-transitions.ts` helper that validates `(from, to, actor)` tuples against the D-06 table before any DB write. The `bip_status_history` table is a new append-only audit log (migration 00010); its INSERT is executed by `createServerClient` (not `createAdminClient`) because the admin RLS policies already allow this write.

Resend is called directly inside Server Actions using the `resend` Node SDK (already listed as a dependency target in UI-SPEC but not yet installed). React Email templates in `lib/email/templates/` provide typed, previewable HTML rendered via `render()` from `@react-email/components`. Local dev falls back to console logging when `RESEND_API_KEY` is unset.

The `BipSubmissionWizard` reuse (D-17) requires adding a `mode` prop to the existing `components/forms/BipSubmissionWizard.tsx` and conditional rendering in Step 5. The Zustand `bip-draft` store is reused as-is; admin context uses `hydrateFromServer` to pre-populate it and the auto-save behavior is suppressed in admin mode.

**Primary recommendation:** Build in this wave order: (1) DB migration + RLS policies, (2) middleware + layout guards, (3) Server Actions + state machine, (4) React Email templates + send wrapper, (5) review queue + review page UI, (6) all-listings + analytics, (7) admin-mode wizard reuse, (8) coordinator dashboard rejection-reason data wiring.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Admin route guard (`/admin → / or /login`) | Edge Middleware | (admin)/layout.tsx (double-check) | Defense-in-depth per ARCHITECTURE.md; middleware fires before any RSC code |
| Admin role check in RSC layout | Frontend Server (SSR) | — | `getClaims()` + `app_metadata.role === 'admin'`; redirect('/) on failure |
| RLS enforcement on admin queries/mutations | Database | — | `bips_update_admin`, `bips_select_own_or_approved` (admin clause), `bip_status_history` INSERT policy |
| Pending queue data | Frontend Server (RSC) | — | RSC page; no client refetch needed (admin queue is not high-frequency) |
| Review page BIP detail | Frontend Server (RSC) | — | Reuses Phase 1 `BipBody`+`BipSidebar` as RSC sub-components passed server data |
| Approve/reject confirmation modals | Browser / Client | — | `'use client'` components wrapping shadcn `Dialog`; form validation (Zod v3) client-side before calling Server Action |
| Status machine validation | API / Backend (Server Action) | Database CHECK constraint (enum) | Server Action validates tuple before write; DB enum `status CHECK IN ('draft','pending','approved','rejected')` is backstop |
| Audit log insert | API / Backend (Server Action) | — | `createServerClient` inside Server Action; RLS INSERT admin-only policy enforces this |
| `revalidatePath()` for ISR bust | API / Backend (Server Action) | — | Called inside Server Action after DB write; must run before email send |
| Transactional email send | API / Backend (Server Action) | — | Resend Node SDK called server-side only; API key is never exposed to client |
| React Email template rendering | API / Backend (Server Action) | — | `render()` from `@react-email/components` runs on Node.js at send time |
| All-listings search/filter | Frontend Server (RSC) | Browser (URL searchParams) | RSC reads `searchParams` for initial filter state; FTS via existing `search_vector` |
| Analytics stat cards | Frontend Server (RSC) | — | RSC with `export const revalidate = 300`; Postgres aggregate queries |
| Admin-mode wizard | Browser / Client | Server Action (save) | Existing `BipSubmissionWizard` with `mode='admin'` prop; same Zustand store |

---

## Standard Stack

### Core (No New Framework Installs)

[VERIFIED: `package.json` in project root — all packages confirmed]

| Library | Version | Purpose | Phase 3 Role |
|---------|---------|---------|--------------|
| `next` | `15.5.18` (exact) | App Router | (admin) route group; Server Actions; `revalidatePath()` |
| `@supabase/ssr` | `0.5.2` (exact pin) | SSR auth | `createServerClient` in admin Server Actions and layout |
| `@supabase/supabase-js` | `^2.105.4` | Supabase client | Admin queries via `createServerClient` with RLS |
| `zod` | `^3.25.76` | Validation | `RejectBipSchema` (reason min 10), `ApproveBipSchema` (note max 500), admin Server Action input schemas |
| `@hookform/resolvers` | `^3.10.0` | RHF + Zod bridge | Confirmation modal forms (approve note, reject reason) |
| `react-hook-form` | `^7.75.0` | Form state | Approve/reject modal forms |
| `zustand` | `^5.0.13` | Draft store | Admin-mode wizard reuses `bip-draft.ts` store |
| `motion` | `^12.38.0` | Animations | Admin sidebar transitions; modal mount; import from `motion/react` + `LazyMotion` |
| `lucide-react` | `^1.14.0` | Icons | Admin sidebar nav icons, stat card icons |
| `sonner` | `^2.0.7` | Toasts | Post-action success, email send error notifications |

### New Dependencies to Install

[VERIFIED: `package.json` — none of these are currently installed]

| Package | npm Version | Purpose | Install Command |
|---------|-------------|---------|----------------|
| `resend` | `6.12.3` | Resend Node SDK — transactional email send | `npm install resend` |
| `react-email` | `6.1.1` | Local preview CLI (`npx email dev`) for templates | `npm install react-email` |
| `@react-email/components` | `1.0.12` | Typed JSX primitives for email templates | `npm install @react-email/components` |

[VERIFIED: npm registry — `npm view resend version` → `6.12.3`; `npm view @react-email/components version` → `1.0.12`; `npm view react-email version` → `6.1.1`]

**Combined install command:**
```bash
npm install resend react-email @react-email/components
```

### New shadcn Components to Install

[VERIFIED: `03-UI-SPEC.md` lines 33-38 — only two new components required]

| Component | `npx shadcn add` | Phase 3 Usage |
|-----------|-----------------|---------------|
| `dropdown-menu` | `npx shadcn add dropdown-menu` | Row-level quick-action menu on `/admin/bips` (Edit / Review / Open public / Un-approve) |
| `avatar` | `npx shadcn add avatar` | Admin name/avatar in sidebar footer |

All other Phase 3 surfaces use already-installed shadcn components: `dialog` (modals), `tabs` (status filter), `textarea` (note/reason fields), `form`/`input`/`label`, `button`, `badge`, `separator`, `sheet` (mobile sidebar drawer), `skeleton`.

**Install command:**
```bash
npx shadcn add dropdown-menu avatar
```

### Tailwind v4 Additions

No new `@theme` tokens required. All Phase 3 surfaces use the existing EU palette + Phase 2 status tokens. [VERIFIED: `03-UI-SPEC.md` line 50 — "None required."]

---

## Architecture Patterns

### System Architecture Diagram

```
Browser
  │
  ├── GET /admin  →  middleware.ts [Edge]
  │                  getClaims() → user.app_metadata.role === 'admin'?
  │                  NO: redirect('/') or redirect('/login?next=/admin')
  │                  YES: pass through with x-pathname header
  │
  ├──→ (admin)/layout.tsx [RSC — Frontend Server]
  │    getClaims() double-check → role !== 'admin' → redirect('/')
  │    Renders AdminSidebar + {children}
  │
  ├──→ (admin)/admin/page.tsx [RSC]
  │    getAdminPendingBips() → Supabase [Database]
  │    Renders AdminBipCard list
  │
  ├──→ (admin)/admin/bips/[id]/review/page.tsx [RSC]
  │    getAdminBipById(id) → Supabase [Database]
  │    Renders BipBody + BipSidebar + AdminActionsPanel
  │                         │
  │                         ├── [Approve modal open]
  │                         │   user fills optional note
  │                         │   clicks "Approve BIP"
  │                         │         ↓
  │                         │   approveBipAction(bipId, note)  [Server Action]
  │                         │     1. getClaims() → assert admin
  │                         │     2. validateTransition('pending','approved','admin')
  │                         │     3. supabase.from('bips').update({status:'approved'})
  │                         │     4. supabase.from('bip_status_history').insert({...})
  │                         │     5. revalidatePath('/bips')
  │                         │        revalidatePath('/bip/[slug]')
  │                         │     6. await sendEmail(ApprovalEmail, coordinatorEmail)
  │                         │     7. getNextPendingBip(currentId) → redirect or empty-state
  │                         │         ↓
  │                         │   Resend Node SDK  [External Service]
  │                         │
  │                         └── [Reject modal open — same shape with reason field]
  │
  ├──→ (admin)/admin/bips/page.tsx [RSC — All Listings]
  │    searchParams: status filter + FTS query
  │    getAdminBips(filters) → Supabase
  │
  ├──→ (admin)/admin/bips/[id]/edit/page.tsx [RSC shell]
  │    getAdminBipById(id) → initial data
  │    <BipSubmissionWizard mode='admin' initialBip={...} />  ['use client']
  │
  └──→ (admin)/admin/analytics/page.tsx [RSC, revalidate=300]
       getAdminAnalytics() → 3 Postgres aggregates
```

### Recommended Project Structure (Phase 3 additions)

```
app/(admin)/
├── layout.tsx                         ← Role guard + AdminSidebar chrome
└── admin/
    ├── page.tsx                       ← Pending queue (RSC)
    ├── bips/
    │   ├── page.tsx                   ← All listings (RSC, searchParams)
    │   └── [id]/
    │       ├── review/
    │       │   └── page.tsx           ← Review page (RSC)
    │       └── edit/
    │           └── page.tsx           ← Admin edit (RSC shell + wizard)
    └── analytics/
        └── page.tsx                   ← 3 stat cards (RSC, revalidate=300)

components/admin/
├── AdminBipCard.tsx                   ← 'use client' — queue card with Review link
├── AdminSidebar.tsx                   ← RSC or 'use client' (Sheet drawer for mobile)
├── AdminActionsPanel.tsx              ← 'use client' — approve/reject buttons + modals
├── ApproveModal.tsx                   ← 'use client' — shadcn Dialog + RHF
├── RejectModal.tsx                    ← 'use client' — shadcn Dialog + RHF + min-10 validation
├── AdminBipRow.tsx                    ← 'use client' — all-listings row + DropdownMenu
└── StatCard.tsx                       ← RSC component (static, renders from props)

lib/
├── actions/
│   ├── admin-bips.ts                  ← approveBipAction, rejectBipAction, adminUpdateBipAction
│   └── bip-submit.ts                  ← Phase 2 submitBipAction — Phase 3 adds sendEmail() call
├── queries/
│   ├── adminBips.ts                   ← getAdminPendingBips, getAdminBipById, getAdminBips, getAdminAnalytics, getNextPendingBip, getLatestRejection
│   └── coordinatorBips.ts             ← (existing) — Phase 3 adds rejection_reason join via bip_status_history
├── email/
│   ├── send.ts                        ← sendEmail() wrapper (Resend SDK or console fallback)
│   └── templates/
│       ├── ApprovalEmail.tsx          ← React Email template
│       ├── RejectionEmail.tsx         ← React Email template
│       └── AdminNotificationEmail.tsx ← React Email template
└── utils/
    └── status-transitions.ts          ← validateTransition(from, to, actor) → void or throws

supabase/migrations/
├── 00010_bip_status_history.sql       ← new table + RLS + ENABLE ROW LEVEL SECURITY
└── 00011_rls_coordinator_editable.sql ← replace bips_update_own_draft_or_pending with bips_update_own_editable
```

---

## Pattern 1: Triple-Layer Admin Guard

**What:** Three independent barriers prevent non-admin access to `/admin/*`. Even if one layer fails, the others remain.

**Layer 1 — Edge Middleware (`middleware.ts`):**

[VERIFIED: `middleware.ts` in project root — Phase 2 code; Phase 3 adds admin branch]

```typescript
// middleware.ts — add AFTER the existing dashboard branch (lines 35-39)
// Phase 3 addition: admin gate
if (pathname.startsWith('/admin')) {
  if (!claims) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', '/admin')
    return NextResponse.redirect(loginUrl)
  }
  const role = claims?.app_metadata?.role
  if (role !== 'admin') {
    // Logged in but not admin: bounce to home (not login)
    return NextResponse.redirect(new URL('/', request.url))
  }
}
```

Note: `claims` is already declared as `data?.claims ?? null` in the existing middleware. The `app_metadata` property on the `claims` object contains `role` per migration 00008. [VERIFIED: `middleware.ts` lines 26-28 + `supabase/migrations/00008_app_metadata_role_mirror.sql`]

**Layer 2 — RSC Layout (`(admin)/layout.tsx`):**

Mirrors `(dashboard)/layout.tsx` exactly, adding the role check:

```typescript
// app/(admin)/layout.tsx
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()  // await cookies() — Next.js 15 mandatory
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) redirect('/login')
  
  const role = data.claims.app_metadata?.role
  if (role !== 'admin') redirect('/')
  
  // ... render AdminSidebar + children + EC disclaimer
}
```

[VERIFIED: `app/(dashboard)/layout.tsx` lines 41-43 — exact pattern to mirror]

**Layer 3 — RLS policies:**

The existing `bips_update_admin` and `bips_select_own_or_approved` (admin clause) policies in migration 00006 enforce admin-only write access at the database level. The new `bip_status_history` INSERT policy (migration 00010) adds a third table to this enforcement.

**Redirect chain:** unauthenticated → `/login?next=/admin` → after login → `/admin`. Wrong role → `/`. This matches the existing `(dashboard)` pattern and prevents loops.

---

## Pattern 2: State Machine Validation

**What:** `lib/utils/status-transitions.ts` — a pure function that validates a `(from, to, actor)` tuple against the D-06 table before any DB write. The Server Action calls this; if invalid, it throws and the DB write never happens.

**Why not rely on DB CHECK only:** The DB has a `status CHECK IN ('draft','pending','approved','rejected')` enum but no transition constraint (checking old row value requires a trigger). Application-layer validation is faster, more descriptive, and the correct layer for business rules.

```typescript
// lib/utils/status-transitions.ts
// Source: D-06 state machine in 03-CONTEXT.md

type Actor = 'coordinator' | 'admin'
type BipStatus = 'draft' | 'pending' | 'approved' | 'rejected'

const ALLOWED_TRANSITIONS: Array<{ from: BipStatus | null; to: BipStatus; actor: Actor }> = [
  { from: null,        to: 'draft',    actor: 'coordinator' },
  { from: 'draft',     to: 'pending',  actor: 'coordinator' },
  { from: 'pending',   to: 'approved', actor: 'admin' },
  { from: 'pending',   to: 'rejected', actor: 'admin' },
  { from: 'rejected',  to: 'draft',    actor: 'coordinator' },
  { from: 'draft',     to: 'pending',  actor: 'coordinator' }, // resubmit
  { from: 'approved',  to: 'rejected', actor: 'admin' },       // un-approve
  { from: 'pending',   to: 'draft',    actor: 'coordinator' }, // withdraw
]

export function validateTransition(
  from: BipStatus | null,
  to: BipStatus,
  actor: Actor,
): void {
  const valid = ALLOWED_TRANSITIONS.some(
    (t) => t.from === from && t.to === to && t.actor === actor
  )
  if (!valid) {
    throw new Error(
      `Invalid status transition: ${String(from)} → ${to} by ${actor}`
    )
  }
}
```

**Server Action guard pattern:**

```typescript
// lib/actions/admin-bips.ts
'use server'
import { validateTransition } from '@/lib/utils/status-transitions'

export async function approveBipAction(bipId: string, note?: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || data?.claims?.app_metadata?.role !== 'admin') {
    throw new Error('Forbidden')
  }

  // Fetch current status for state machine check
  const { data: bip } = await supabase
    .from('bips')
    .select('id, slug, status, created_by, profiles!created_by(contact_email)')
    .eq('id', bipId)
    .single()

  if (!bip) throw new Error('BIP not found')
  
  validateTransition(bip.status as BipStatus, 'approved', 'admin')

  // DB write
  await supabase.from('bips').update({ status: 'approved' }).eq('id', bipId)
  
  // Audit log — same createServerClient, admin RLS INSERT policy allows this
  await supabase.from('bip_status_history').insert({
    bip_id: bipId,
    from_status: bip.status,
    to_status: 'approved',
    actor_id: data.claims.sub,
    note: note ?? null,
    action_kind: 'approve',
  })

  revalidatePath('/bips')
  revalidatePath(`/bip/${bip.slug}`)

  // Email — fire-and-forget (await but catch; do NOT rollback on failure)
  const coordinatorEmail = bip.profiles?.contact_email
  if (coordinatorEmail) {
    try {
      await sendEmail({
        to: coordinatorEmail,
        template: 'approval',
        props: { bipTitle: bip.title, bipSlug: bip.slug, note },
      })
    } catch (err) {
      console.error('[approveBipAction] email send failed:', err)
    }
  }

  // Auto-advance to next pending BIP
  const next = await getNextPendingBip(bipId)
  if (next) redirect(`/admin/bips/${next.id}/review`)
  else redirect('/admin')
}
```

---

## Pattern 3: `bip_status_history` Table + RLS

**What:** New append-only audit log. No UPDATE or DELETE policies means the table is immutable post-insert.

**Migration (next available: 00010):**

```sql
-- supabase/migrations/00010_bip_status_history.sql

create table public.bip_status_history (
  id         uuid primary key default gen_random_uuid(),
  bip_id     uuid references public.bips(id) on delete set null,
  from_status text,
  to_status   text not null,
  actor_id   uuid references public.profiles(id) on delete set null,
  note       text,
  action_kind text not null check (action_kind in ('submit','approve','reject','resubmit','admin_edit','withdraw')),
  created_at timestamptz not null default now()
);

alter table public.bip_status_history enable row level security;

-- Coordinators see history rows for their own BIPs; admins see all
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

-- INSERT: admin only (via regular createServerClient — RLS enforces)
create policy "bsh_insert_admin"
  on public.bip_status_history for insert
  to authenticated
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- No UPDATE or DELETE policies → denied for everyone (D-08 audit immutability)
```

**Key insight:** `createAdminClient` (service-role, bypasses RLS) is NOT needed here. The admin user's JWT satisfies `app_metadata.role = 'admin'` and the INSERT policy above allows the write. This is safer and consistent with the "no `createAdminClient` outside `app/(admin)/`" ESLint rule. [VERIFIED: `lib/supabase/admin.ts` comment — "Phase 3 should NOT need this"; `03-CONTEXT.md` D-08]

---

## Pattern 4: RLS Migration — `bips_update_own_editable` (D-10)

**What:** Replace the existing `bips_update_own_draft_or_pending` policy (migration 00006) with a new policy that also allows `rejected` as a source state but forces the post-image status to `draft`. This enables coordinator resubmit without allowing direct `rejected → pending`.

**Migration (00011):**

```sql
-- supabase/migrations/00011_rls_coordinator_editable.sql

-- Drop the Phase 2 policy that blocked rejected-source edits
drop policy if exists "bips_update_own_draft_or_pending" on public.bips;

-- New policy: coordinator can edit their own draft/pending/rejected BIPs,
-- but WITH CHECK forces any edit to produce a draft status (never pending/approved/rejected).
-- PITFALLS Pitfall 5: BOTH using AND with check required on UPDATE.
-- USING  = which rows the coordinator can target (source states)
-- WITH CHECK = what the row must look like after the update (post-image constraint)
create policy "bips_update_own_editable"
  on public.bips for update
  to authenticated
  using (
    (select auth.uid()) = created_by
    and status in ('draft', 'pending', 'rejected')
  )
  with check (
    (select auth.uid()) = created_by
    and status = 'draft'           -- post-image MUST be draft; no direct rejected→pending
  );
```

**Security validation:** A coordinator who PATCHes `status = 'pending'` directly on a rejected BIP will have the WITH CHECK clause fail the update (status in post-image is 'pending', not 'draft'). The only path to `pending` is the explicit `submitBipAction` which validates the full form and sets `status = 'pending'` as a separate targeted write. [VERIFIED: `supabase/migrations/00006_rls_policies.sql` lines 122-134 — existing policy to be replaced]

---

## Pattern 5: Resend Node SDK in Server Actions

**What:** Direct `resend.emails.send()` call inside Server Actions. DB-first, email-last, fire-and-forget error handling.

**`lib/email/send.ts` — the central wrapper:**

```typescript
// lib/email/send.ts
import { Resend } from 'resend'
import { render } from '@react-email/components'
import { ApprovalEmail } from './templates/ApprovalEmail'
import { RejectionEmail } from './templates/RejectionEmail'
import { AdminNotificationEmail } from './templates/AdminNotificationEmail'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null  // dev fallback: log to console

type EmailPayload =
  | { template: 'approval'; props: ApprovalEmailProps }
  | { template: 'rejection'; props: RejectionEmailProps }
  | { template: 'admin-notification'; props: AdminNotificationEmailProps }

export async function sendEmail(to: string, payload: EmailPayload): Promise<void> {
  const templateComponents = {
    approval: ApprovalEmail,
    rejection: RejectionEmail,
    'admin-notification': AdminNotificationEmail,
  }
  const subjects = {
    approval: 'Your BIP is live on BipHub',
    rejection: 'Update needed on your BIP submission',
    'admin-notification': `New BIP pending review: ${(payload.props as AdminNotificationEmailProps).bipTitle}`,
  }

  const Component = templateComponents[payload.template]
  const html = await render(<Component {...(payload.props as never)} />)

  if (!resend) {
    // D-15: local dev fallback
    console.log('[EMAIL DEV]', { to, subject: subjects[payload.template], html })
    return
  }

  const replyTo = process.env.ADMIN_REPLY_TO_EMAIL ?? 'noreply@biphub.eu'

  await resend.emails.send({
    from: 'BipHub <noreply@biphub.eu>',  // D-13: verified Resend domain
    to,
    replyTo,
    subject: subjects[payload.template],
    html,
  })
}
```

**Error handling contract (D-11):** The calling Server Action wraps `sendEmail()` in try/catch. The catch logs the error but does NOT re-throw — the DB transaction already committed and `revalidatePath()` already fired. A Resend outage must not reverse a successful approval.

**Latency analysis (from `03-CONTEXT.md` Specifics):** Resend typically responds in 100–200ms. Admin approve total latency: ~300ms. `await` is acceptable. If Resend latency spikes, switch to `after()` from `next/server` (deferred work primitive — confirmed available in Next.js 15.5.18). [VERIFIED: `node -e "const {after} = require('next/server'); console.log(typeof after)"` → `function`]

**`next/server after()` fallback pattern (if needed):**

```typescript
import { after } from 'next/server'

// Inside Server Action, after DB writes and revalidatePath():
after(async () => {
  try {
    await sendEmail(to, payload)
  } catch (err) {
    console.error('[after] email send failed:', err)
  }
})
```

`after()` runs the callback after the response is sent to the client. Use only if Resend latency becomes user-visible.

---

## Pattern 6: React Email Templates

**What:** Three `.tsx` templates in `lib/email/templates/`. Rendered to HTML string via `render()` from `@react-email/components` at send time.

**Key constraints for React Email:**
- Templates are JSX but run in Node.js — no browser APIs, no Tailwind classes
- All styles are inline (`style={{ ... }}`) or via `@react-email/components` built-in props
- Inter font cannot be loaded from Google Fonts in email (cross-origin, not universally supported in email clients) — use system font stack or embed via `@font-face` with a reliable CDN-hosted woff2
- Use the EU hex literals directly (`#003399`, `#FFCC00`, `#0a1735`) — same as web tokens but in inline styles

**Available `@react-email/components` primitives:**

[VERIFIED: `npm view @react-email/components version` → `1.0.12`]

```tsx
import {
  Html, Head, Body, Container, Section, Row, Column,
  Text, Heading, Button, Link, Hr, Img, Font, Preview,
  render  // renders to HTML string
} from '@react-email/components'
```

**`ApprovalEmail.tsx` skeleton:**

```tsx
// lib/email/templates/ApprovalEmail.tsx
import { Html, Head, Body, Container, Text, Button, Hr } from '@react-email/components'

export interface ApprovalEmailProps {
  bipTitle: string
  bipSlug: string
  dashboardUrl?: string
  note?: string
}

export function ApprovalEmail({ bipTitle, bipSlug, note }: ApprovalEmailProps) {
  const publicUrl = `https://biphub.eu/bip/${bipSlug}`
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f7f8fc', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '32px' }}>
          <Text style={{ color: '#003399', fontWeight: 'bold', fontSize: '20px' }}>
            Your BIP is live on BipHub
          </Text>
          <Text>"{bipTitle}" has been approved and is now visible to students.</Text>
          {note && (
            <Section style={{ borderLeft: '4px solid #FFCC00', paddingLeft: '12px', margin: '16px 0' }}>
              <Text style={{ color: '#0a1735' }}>Note from the BipHub team: {note}</Text>
            </Section>
          )}
          <Button href={publicUrl} style={{ backgroundColor: '#003399', color: '#ffffff', padding: '12px 24px', borderRadius: '999px' }}>
            View your BIP →
          </Button>
          <Hr />
          <Text style={{ fontSize: '12px', color: '#6b7280' }}>
            Independent project — not affiliated with the European Commission
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

**Local preview:** `npx email dev` serves a preview UI at `localhost:3030` (separate from the Next.js dev server). Point it at `lib/email/templates/`.

```bash
npx email dev --dir lib/email/templates
```

---

## Pattern 7: Admin-Mode Wizard Reuse (D-17)

**What:** Add `mode: 'coordinator' | 'admin'` prop to the existing `BipSubmissionWizard` component. Conditional rendering based on `mode`.

**Changes to `components/forms/BipSubmissionWizard.tsx`:**

1. Add `mode?: 'coordinator' | 'admin'` to the `Props` interface (defaults to `'coordinator'`).
2. When `mode === 'admin'`: render a persistent banner above the step content:
   ```tsx
   {mode === 'admin' && (
     <div className="bg-status-pending-bg border border-status-pending rounded-md px-4 py-2 text-sm text-ink-2 mb-4">
       Editing as admin — coordinator will not be notified.
     </div>
   )}
   ```
3. In Step 5 (`renderPreviewStep` slot): when `mode === 'admin'`, the admin-actions panel replaces the Submit CTA. The page entry route (`/admin/bips/[id]/edit/page.tsx`) passes `renderPreviewStep` with admin actions.

**Zustand store key collision risk:** The `bip-draft.ts` store uses storage key `biphub:draft` (constant). Admin edits and coordinator edits share the same store shape but admin context uses `hydrateFromServer()` to pre-populate from DB, not from localStorage. The `DRAFT_STORAGE_KEY` is `'biphub:draft'` — risk: if an admin has a coordinator account in the same browser, the admin edit could clobber the coordinator's in-progress localStorage draft.

**Resolution:** In admin mode, do NOT call `hydrate()` (localStorage read) and do NOT call `persistToStorage()` on `onAuthStateChange`. Admin context does not need auto-save fallback. The admin wizard calls `adminUpdateBipAction` explicitly on save and does not use the debounced auto-save path. This is implemented by checking `mode` before calling the auto-save side-effects. [VERIFIED: `lib/store/bip-draft.ts` lines 8-15 — hydration pattern; `components/forms/BipSubmissionWizard.tsx` lines 50-60 — Props interface]

---

## Pattern 8: `revalidatePath()` Call Surface

**What:** Which Server Actions call `revalidatePath()` and what paths they bust.

| Action | Paths to Revalidate | Reason |
|--------|---------------------|--------|
| `approveBipAction` | `/bips`, `/bip/[slug]` | ISR was `revalidate=3600`; cache now stale |
| `rejectBipAction` (pending→rejected) | `/admin` only | BIP was never public; no public cache to bust |
| `rejectBipAction` (approved→rejected / un-approve) | `/bips`, `/bip/[slug]` | Previously approved BIP must disappear from public pages |
| `adminUpdateBipAction` (on approved BIP) | `/bips`, `/bip/[slug]` | Content edit must propagate to public |
| `adminUpdateBipAction` (on draft/pending) | none (not public) | — |

**`revalidatePath('/bip/[slug]')` — path or literal?**

In Next.js 15 App Router, `revalidatePath('/bip/[slug]')` with the literal bracket syntax revalidates ALL pages matching that dynamic segment pattern. This is the intended use for on-demand revalidation of a specific page. The slug must also be passed as a second argument if only one page should be busted:

```typescript
// Bust specific page:
revalidatePath(`/bip/${bip.slug}`)

// Bust entire dynamic segment (all /bip/* pages):
revalidatePath('/bip/[slug]', 'page')
```

[ASSUMED: The distinction between `revalidatePath('/bip/[slug]', 'page')` and `revalidatePath('/bip/actualslug')` behavior in Next.js 15.5.18 — assume the interpolated slug is sufficient per ARCHITECTURE.md pattern; confirm with `revalidatePath('/bips')` + `revalidatePath('/bip/' + bip.slug)` per D-03 in 03-CONTEXT.md code_context section]

---

## Pattern 9: Analytics Queries (ADMN-07 / D-20)

All three stat cards are RSC-rendered with `export const revalidate = 300`.

```typescript
// lib/queries/adminBips.ts (additions)

export async function getAdminAnalytics() {
  const supabase = await createClient()

  // Stat 1: Total non-seed BIPs (all statuses)
  const { count: totalBips } = await supabase
    .from('bips')
    .select('*', { count: 'exact', head: true })
    .eq('is_seed', false)

  // Stat 2: Submissions this month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { count: submissionsThisMonth } = await supabase
    .from('bip_status_history')
    .select('*', { count: 'exact', head: true })
    .eq('action_kind', 'submit')
    .gte('created_at', startOfMonth.toISOString())

  // Stat 3: Top 5 host countries
  // Use RPC or a Postgres function for GROUP BY aggregation
  // Supabase JS client does not have a native .groupBy(); use .rpc()
  const { data: topCountries } = await supabase.rpc('get_top_host_countries', { limit_n: 5 })

  return { totalBips: totalBips ?? 0, submissionsThisMonth: submissionsThisMonth ?? 0, topCountries }
}
```

**Top 5 countries requires a Postgres function** (Supabase JS client has no `.groupBy()` method):

```sql
-- Add to migration 00010 or a separate 00012 migration
create or replace function public.get_top_host_countries(limit_n int default 5)
returns table (host_country text, bip_count bigint)
language sql
security invoker   -- respects RLS; admin context sees all bips
stable
as $$
  select host_country, count(*) as bip_count
  from public.bips
  where is_seed = false
    and host_country is not null
  group by host_country
  order by bip_count desc
  limit limit_n;
$$;
```

`security invoker` means the function runs with the calling user's JWT — admin RLS sees all BIPs; no `security definer` bypass needed. [VERIFIED: PITFALLS.md Pitfall 6 — views and functions should use `security_invoker = true` to avoid bypassing RLS]

---

## Pattern 10: Rejection Reason Data Wiring (DASH-05 / D-09)

**What:** `DashboardBipCard.tsx` currently renders a placeholder for the rejection reason (line 64: `bip.rejection_reason ?? 'This BIP was rejected...'`). Phase 3 wires the actual reason from `bip_status_history`.

**Query shape change in `lib/queries/coordinatorBips.ts`:**

```typescript
// Add getLatestRejection to lib/queries/adminBips.ts (for admin use)
// and update getCoordinatorBips to join latest rejection note

// Option A: add rejection_reason via separate query in dashboard page
const rejectionRows = await supabase
  .from('bip_status_history')
  .select('bip_id, note')
  .eq('to_status', 'rejected')
  .in('bip_id', bips.map(b => b.id))
  .order('created_at', { ascending: false })

// Map to Record<bip_id, note> and pass to DashboardBipList
```

**The `CoordinatorBip` type** already has `rejection_reason?: string | null` (confirmed from `DashboardBipCard.tsx` line 64 accessing `bip.rejection_reason`). Phase 3 populates this field from `bip_status_history`. The `DashboardBipCard` component itself needs no change — only the query that supplies the data.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email HTML rendering | Custom HTML string builder | `render()` from `@react-email/components` | Email client CSS quirks, table layout, inline style normalization — solved by the library |
| Email preview / dev workflow | Custom Next.js preview route | `npx email dev` | Renders all templates in a hot-reload browser UI; zero setup |
| Status badge classes | Dynamic Tailwind string | `STATUS_BADGE_CLASSES` lookup (already in `lib/utils/status.ts`) | Tailwind v4 purges dynamic strings (CLAUDE.md never-do) |
| Admin dropdown menu | Custom positioned div | shadcn `DropdownMenu` | Keyboard navigation, Radix Portal, a11y already handled |
| Avatar fallback initials | Custom logic | shadcn `Avatar` + `AvatarFallback` | Handles image load error, ARIA correctly |
| State machine | Ad-hoc if/else in Server Action | `validateTransition()` in `lib/utils/status-transitions.ts` | Centralizes D-06 transitions; single place to audit; easy to unit-test |
| Postgres GROUP BY aggregation | JS-side group-by after `.select('*')` | Postgres function with `security invoker` | N+1 avoidance; pushes computation to the DB where indexes help |

---

## Common Pitfalls

### Pitfall A: `revalidatePath('/bip/[slug]')` with literal bracket — busts ALL detail pages

**What goes wrong:** `revalidatePath('/bip/[slug]')` with the literal string revalidates every `/bip/*` page simultaneously, which is cache-inefficient and can cause a thundering-herd revalidation if there are many approved BIPs.

**How to avoid:** Use the interpolated slug `revalidatePath('/bip/' + bip.slug)` to revalidate only the specific BIP that changed. Additionally call `revalidatePath('/bips')` to bust the listing.

**Warning signs:** Seeing all `/bip/*` pages re-render on a single approve action in the Next.js build output.

---

### Pitfall B: `createAdminClient` used in admin Server Actions — unnecessary RLS bypass

**What goes wrong:** A developer assumes the admin Server Action needs the service-role client to write to `bip_status_history` or update `bips`. Using `createAdminClient` bypasses ALL RLS globally, not just for one table.

**How to avoid:** Use `createClient()` (the standard server client). The admin user's JWT satisfies all required RLS policies: `bips_update_admin` (UPDATE bips), `bsh_insert_admin` (INSERT bip_status_history), `bips_select_own_or_approved` admin clause (SELECT). No RLS bypass is needed.

**Warning signs:** `createAdminClient` import in any file under `lib/actions/admin-bips.ts` or `(admin)/` — the ESLint rule allows it in `app/(admin)/` but the correct answer is still `createClient()`.

---

### Pitfall C: Email send rolled back when DB transaction succeeds

**What goes wrong:** The Server Action calls `await resend.emails.send()` inside a try block that re-throws on failure. The calling code catches the re-throw and shows an error, but the DB write (approve) already committed. The BIP is approved in the DB but the coordinator never received the email and the admin sees an error.

**How to avoid:** Per D-11: email errors are caught and logged, never re-thrown. The DB write is the canonical record of the approval. Email is best-effort.

**Warning signs:** `sendEmail()` call outside a try/catch, or inside a try/catch that re-throws to the caller.

---

### Pitfall D: `getSession()` in the admin layout instead of `getClaims()`

**What goes wrong:** The `(admin)/layout.tsx` uses `getSession()` to check auth. A tampered JWT with `role: admin` in the payload (but with an invalid signature) would pass the check.

**How to avoid:** Always `getClaims()` in server-side code. The ESLint and code review patterns from Phases 1+2 already enforce this. Mirror `(dashboard)/layout.tsx` exactly.

**Warning signs:** Any `getSession()` call in any `(admin)/` file.

---

### Pitfall E: Zustand store clobbering coordinator draft with admin edit data

**What goes wrong:** An admin who is also a coordinator (same browser session) opens `/admin/bips/[id]/edit`. The `hydrateFromServer()` call writes to `biphub:draft` in localStorage (if not guarded). The coordinator's in-progress draft is overwritten.

**How to avoid:** Admin-mode wizard does NOT call `persistToStorage()` and does NOT write to localStorage. It uses `hydrateFromServer()` only to populate the in-memory Zustand store (no localStorage write). Implement by checking `mode === 'admin'` before any localStorage interaction in the wizard component and store.

---

### Pitfall F: Missing `WITH CHECK` on new UPDATE policies

**What goes wrong:** Migration 00011 drops `bips_update_own_draft_or_pending` and creates `bips_update_own_editable`. If only `USING` is written (forgetting `WITH CHECK`), a coordinator could set `status = 'pending'` directly on a rejected BIP — bypassing the `draft → pending` state machine step.

**How to avoid:** `WITH CHECK (created_by = auth.uid() AND status = 'draft')` on the new policy. This is the same pattern as Pitfall 5 in PITFALLS.md. [VERIFIED: `supabase/migrations/00006_rls_policies.sql` lines 122-134 — existing pattern to replicate]

---

### Pitfall G: `next/server after()` not available in Edge Runtime

**What goes wrong:** If the Server Action is marked `'use server'` but deployed to the Edge Runtime (e.g., via Vercel Edge Functions), `after()` from `next/server` may not be available as it requires Node.js.

**How to avoid:** Admin Server Actions should run in the Node.js runtime (default for Next.js 15 App Router Server Actions). Do not add `export const runtime = 'edge'` to any admin action file. [VERIFIED: `next/server` exports `after` in Node.js runtime in project; `middleware.ts` runs at Edge but Server Actions are separate]

---

### Pitfall H: Coordinator dashboard rejection reason callout shows stale placeholder copy

**What goes wrong:** `DashboardBipCard.tsx` line 64 currently shows `bip.rejection_reason ?? 'This BIP was rejected. The admin team will provide a reason in a future update.'`. Phase 3 wires the real reason. If the query is not updated, the fallback copy may persist in production even after `bip_status_history` is populated.

**How to avoid:** Update `getCoordinatorBips` (or the dashboard page query) to join the latest rejection note from `bip_status_history`. Ensure the `CoordinatorBip` type's `rejection_reason` field is populated. The `DashboardBipCard` component itself already handles a non-null value correctly.

---

## Code Examples

### `(admin)/layout.tsx` — Full Pattern

```typescript
// app/(admin)/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { Toaster } from '@/components/ui/sonner'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // await cookies() is inside createClient() per lib/supabase/server.ts contract
  const supabase = await createClient()

  // getClaims() — validates JWT signature (NEVER getSession() per CLAUDE.md)
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) redirect('/login?next=/admin')

  const role = data.claims.app_metadata?.role
  if (role !== 'admin') redirect('/')  // logged in but not admin

  const fullName = data.claims.user_metadata?.full_name as string | undefined

  return (
    <div className="flex min-h-screen bg-bg-soft">
      <AdminSidebar fullName={fullName ?? 'Admin'} />
      <main className="flex-1 min-w-0 p-6 md:p-8">{children}</main>
      <p className="sr-only">Independent project — not affiliated with the European Commission</p>
      <Toaster position="bottom-right" richColors={false} closeButton />
    </div>
  )
}
```

Note: The EC disclaimer is required on EVERY page per CLAUDE.md + INFO-03. In the admin layout it can be visually hidden or in the sidebar footer — it must be present in the DOM.

### `middleware.ts` admin branch (Phase 3 addition)

```typescript
// Add to middleware.ts AFTER the existing dashboard branch (line ~35)
// Place before the "already-authenticated" redirect check

// Phase 3: Admin gate
if (pathname.startsWith('/admin')) {
  if (!claims) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', '/admin')
    return NextResponse.redirect(loginUrl)
  }
  if (claims.app_metadata?.role !== 'admin') {
    return NextResponse.redirect(new URL('/', request.url))
  }
}
```

### Resend `send.ts` — dev fallback pattern (D-15)

```typescript
// lib/email/send.ts
import { Resend } from 'resend'
import { render } from '@react-email/components'

const resendClient = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

export async function sendTransactionalEmail(opts: {
  to: string
  subject: string
  reactElement: React.ReactElement
}): Promise<void> {
  const html = await render(opts.reactElement)

  if (!resendClient) {
    // D-15: local dev — log instead of send
    console.log('[EMAIL DEV] Would send to:', opts.to)
    console.log('[EMAIL DEV] Subject:', opts.subject)
    console.log('[EMAIL DEV] HTML preview:', html.slice(0, 300) + '...')
    return
  }

  await resendClient.emails.send({
    from: 'BipHub <noreply@biphub.eu>',
    to: opts.to,
    replyTo: process.env.ADMIN_REPLY_TO_EMAIL ?? 'noreply@biphub.eu',
    subject: opts.subject,
    html,
  })
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `createAdminClient` for admin mutations | `createServerClient` + RLS admin policies | Phase 3 admin Server Actions work without service-role bypass |
| `framer-motion` import | `motion/react` with `LazyMotion` | Enforced; any admin animations must follow the same pattern |
| Resend via Supabase SMTP (Phase 2) | Resend Node SDK direct (Phase 3) | Two separate integration paths on the same Resend account; SMTP for auth emails, SDK for transactional |
| `bips_update_own_draft_or_pending` (migration 00006) | `bips_update_own_editable` (migration 00011) | Enables coordinator resubmit without direct rejected→pending |

**Deprecated / already resolved:**
- `framer-motion` package: never use. All animation imports are `motion/react`.
- `getSession()`: never use server-side. All existing server code already uses `getClaims()`.
- `cookies()` without `await`: already caught and fixed in `lib/supabase/server.ts`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `revalidatePath('/bip/' + bip.slug)` busts only that single page (not the whole pattern) | Pattern 8 | Low — behavior confirmed in ARCHITECTURE.md and existing Plan 01-07 context; worst case is that all `/bip/*` pages revalidate, which is inefficient but not broken |
| A2 | `render()` from `@react-email/components` v1.0.12 accepts a React element (not JSX string) | Pattern 5 | Medium — API may have changed; verify with `npx email dev` during Wave 0 |
| A3 | `next/server after()` in Next.js 15.5.18 works in non-Edge Server Actions | Pattern 5 | Low — confirmed exportable from `next/server` in project node_modules; no Edge runtime used |
| A4 | `bip_status_history` INSERT via `createServerClient` (not `createAdminClient`) is sufficient | Pattern 3 | Low — admin JWT satisfies `bsh_insert_admin` policy; would fail at runtime with a PostgREST 403 if wrong |
| A5 | The `profiles` table has a `contact_email` column accessible via `supabase.from('profiles').select('contact_email')` in admin context | Pattern 2 (Server Action code example) | Medium — `contact_email` is in the `profiles` table per Phase 2 D-08; verify column name against `lib/supabase/database.types.ts` |

**If this table is empty:** Not applicable — A1–A5 require runtime confirmation or type-check during implementation.

---

## Open Questions

1. **`profiles.contact_email` vs `bips.coordinator_contact_email`**
   - What we know: The `profiles` table has `contact_email` (Phase 2 D-08). The `bips` table has `contact_email` as an Erasmus+ submission field (Step 4 — may differ from the coordinator's profile email).
   - What's unclear: Which email address should receive approval/rejection notifications — the coordinator's profile `contact_email` or the BIP's `contact_email`?
   - Recommendation: Use the coordinator's `profiles.contact_email` (the person who submitted the BIP). The BIP `contact_email` is the public-facing contact for students to apply, not necessarily the submitter. The admin Server Action should join `profiles` via `bips.created_by → profiles.id`.

2. **Migration numbering gap (missing 00010)**
   - What we know: Current last migration is `00009_profiles_erasmus_code.sql`. Phase 3 needs at minimum two new migrations.
   - Recommendation: `00010_bip_status_history.sql` (new table + RLS), `00011_rls_coordinator_editable.sql` (policy replacement). The analytics Postgres function can go in 00010 or a separate `00012_analytics_functions.sql`.

3. **`submitBipAction` modification for ADMN-11**
   - What we know: Phase 2's `submitBipAction` (in `lib/actions/bip-submit.ts`) sets `status = 'pending'`. Phase 3 adds the `sendEmail(AdminNotificationEmail)` call to this action.
   - What's unclear: The Phase 2 plan may not have added a `sendEmail` call placeholder, so this is a cross-phase file modification.
   - Recommendation: Phase 3 Wave 1 explicitly modifies `lib/actions/bip-submit.ts` to add the admin notification email after `revalidatePath()`. This is the only Phase 3 modification to a Phase 2 file.

---

## Environment Availability

[VERIFIED: `package.json` — all runtime dependencies present; `node -e "const {after}=require('next/server')"` → confirmed]

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `next` 15.5.x | App Router, `after()` | ✓ | `15.5.18` | — |
| `@supabase/ssr` | Admin server client | ✓ | `0.5.2` (exact) | — |
| `resend` | Transactional email | ✗ (not yet installed) | `6.12.3` (registry) | Console logging (D-15) |
| `react-email` | Template preview CLI | ✗ (not yet installed) | `6.1.1` (registry) | Skip preview (dev only) |
| `@react-email/components` | Template rendering | ✗ (not yet installed) | `1.0.12` (registry) | — |
| `dropdown-menu` (shadcn) | Admin all-listings row | ✗ (not yet installed) | shadcn v4 | — |
| `avatar` (shadcn) | Admin sidebar footer | ✗ (not yet installed) | shadcn v4 | — |
| `RESEND_API_KEY` env var | Email send | — | — | Console log fallback (D-15) |
| `ADMIN_NOTIFICATION_EMAIL` env var | Admin notification recipient | — | — | Falls back to `RESEND_API_KEY` owner if unset |
| `ADMIN_REPLY_TO_EMAIL` env var | Reply-To header | — | — | `noreply@biphub.eu` (D-13) |

**Missing dependencies with no hard fallback:** `resend`, `@react-email/components` — must be installed before email-related tasks. `dropdown-menu`, `avatar` — must be `npx shadcn add`-ed before admin UI tasks.

**Missing dependencies with fallback:** `react-email` CLI — templates can be built without the preview; just can't preview locally. `RESEND_API_KEY` unset — D-15 console logging.

---

## Validation Architecture

`nyquist_validation: true` in `.planning/config.json` — Validation Architecture section included.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (not yet installed — `vitest: undefined` in `package.json`) |
| Config file | `vitest.config.ts` — does not exist (Wave 0 gap) |
| Quick run command | `npx vitest run --reporter=verbose` (once installed) |
| Full suite command | `npx vitest run` |

[VERIFIED: `package.json` — `vitest: undefined`; no vitest config found in project root]

**Note:** Vitest is the project-selected test framework per `STACK.md` (^4.x). It is not yet installed. Tests in this phase must target pure utility functions (state machine, email props, query builders) — not async Server Components (per Next.js testing guidance: use E2E for async RSCs; Playwright is deferred to Phase 4).

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADMN-01 | Admin role guard rejects non-admin JWT claims | unit | `npx vitest run tests/utils/admin-guard.test.ts` | ❌ Wave 0 |
| ADMN-03 | `approveBipAction` state machine — pending→approved valid | unit | `npx vitest run tests/utils/status-transitions.test.ts` | ❌ Wave 0 |
| ADMN-04 | `rejectBipAction` state machine — rejected→approved invalid | unit | `npx vitest run tests/utils/status-transitions.test.ts` | ❌ Wave 0 |
| ADMN-03 | `RejectBipSchema` rejects reason < 10 chars | unit | `npx vitest run tests/schemas/admin-bips.test.ts` | ❌ Wave 0 |
| ADMN-09/10 | `sendTransactionalEmail` logs to console when `RESEND_API_KEY` unset | unit | `npx vitest run tests/email/send.test.ts` | ❌ Wave 0 |
| ADMN-09 | `ApprovalEmail` renders without conditional note block when note is undefined | unit | `npx vitest run tests/email/templates.test.ts` | ❌ Wave 0 |
| ADMN-08 | `validateTransition` throws on direct rejected→approved | unit | `npx vitest run tests/utils/status-transitions.test.ts` | ❌ Wave 0 |
| ADMN-07 | `getAdminAnalytics` is_seed filter excludes seeded BIPs | integration (manual/Playwright) | manual | — |
| ADMN-05/06 | Admin all-listings page renders with status filter | smoke (manual) | manual (Playwright Phase 4) | — |
| ADMN-01 | Triple-layer guard blocks non-admin access | smoke (manual) | manual (Playwright Phase 4) | — |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/utils/ tests/schemas/ tests/email/` (fast unit tests only, ~5s)
- **Per wave merge:** `npx vitest run` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` — Vitest config; framework install: `npm install -D vitest @vitejs/plugin-react @testing-library/react jsdom vite-tsconfig-paths`
- [ ] `tests/utils/status-transitions.test.ts` — covers ADMN-03, ADMN-04, ADMN-08
- [ ] `tests/schemas/admin-bips.test.ts` — covers ADMN-04 form validation (Zod min-10)
- [ ] `tests/email/send.test.ts` — covers ADMN-09/10 dev fallback (D-15)
- [ ] `tests/email/templates.test.ts` — covers ADMN-09 `ApprovalEmail` conditional note render

---

## Security Domain

`security_enforcement` not explicitly set to false in config — treating as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `getClaims()` in middleware + layout; never `getSession()` (already enforced in phases 1+2) |
| V3 Session Management | yes | `@supabase/ssr` 0.5.2 cookie-based; middleware refreshes on every request |
| V4 Access Control | yes (CRITICAL) | Triple-layer guard (middleware + layout + RLS); `app_metadata.role = 'admin'` cannot be self-modified by users |
| V5 Input Validation | yes | Zod v3 on all Server Action inputs; reject reason min 10 chars; approve note max 500 chars |
| V6 Cryptography | no | No new cryptographic operations in Phase 3 |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Coordinator setting `status = 'approved'` directly | Elevation of privilege | `bips_update_own_editable` WITH CHECK forces post-image to `'draft'`; `bips_update_admin` requires admin JWT |
| Forged admin JWT in middleware | Spoofing | `getClaims()` validates JWT signature against Supabase public keys (not `getSession()`) |
| Coordinator exploiting direct `rejected → pending` | Elevation of privilege | `WITH CHECK (status = 'draft')` in migration 00011 blocks this at DB level |
| Service-role key leakage via admin actions | Information disclosure | `createAdminClient` not used in Phase 3 admin actions; ESLint rule enforces boundary |
| Email to wrong recipient (PII exposure) | Information disclosure | `to` address sourced from `profiles.contact_email` via `created_by` join, not from request body |
| Audit log tampered / deleted | Repudiation | No UPDATE/DELETE policies on `bip_status_history`; append-only at DB level |
| Missing EC disclaimer in admin pages | Legal / compliance | `(admin)/layout.tsx` MUST include the disclaimer text per CLAUDE.md; all-layouts-carry-it rule |

---

## Project Constraints (from CLAUDE.md)

The following directives from `CLAUDE.md` are directly relevant to Phase 3 and must be verified during implementation:

| Constraint | Phase 3 Impact | Verification |
|------------|---------------|-------------|
| `getClaims()` everywhere server-side — never `getSession()` | `(admin)/layout.tsx`, all admin Server Actions, middleware admin branch | Grep `getSession` in all Phase 3 files before merge |
| `await cookies()` in every Supabase server client factory | Already correct in `lib/supabase/server.ts`; no new factory needed | Confirm no new server client factories created |
| `createAdminClient` only in `app/(admin)/` and `lib/supabase/admin.ts` | Phase 3 does NOT use `createAdminClient`; ESLint rule already in place | `npm run lint` must pass on all new files |
| Never `framer-motion` — use `motion/react` with `LazyMotion` | Any admin animations (sidebar open, modal mount, card hover) | Grep `framer-motion` in all new files |
| Never dynamic Tailwind class names | `AdminBipCard` status badge MUST use `STATUS_BADGE_CLASSES` lookup | Code review; `npm run build` will catch purged classes |
| Footer disclaimer on every page | `(admin)/layout.tsx` must include the EC disclaimer | DOM inspection check |
| No 12-star ring logo | LogoMark already has 11 stars (Plan 01-04); admin layout reuses same logo | Visual check only; no new logo work |
| Next.js 15.5.x LTS (NOT 16) | No upgrade; `next: "15.5.18"` locked | `package.json` locked |
| Zod v3 (NOT v4) | `RejectBipSchema`, `ApproveBipSchema` use Zod v3 | `import { z } from 'zod'` — version confirmed `^3.25.76` |
| `Server Actions for all mutations` | `approveBipAction`, `rejectBipAction`, `adminUpdateBipAction` are Server Actions | No API routes created for admin mutations |
| `revalidatePath()` in approve/reject (NOT webhooks) | Already the locked pattern; no webhook setup needed | Confirm no Supabase webhook configuration added |

---

## Sources

### Primary (HIGH confidence)

- [VERIFIED: `middleware.ts` in project root] — existing `getClaims()` + `app_metadata.role` pattern; Phase 3 admin branch location identified
- [VERIFIED: `app/(dashboard)/layout.tsx`] — exact pattern for `(admin)/layout.tsx` to mirror
- [VERIFIED: `supabase/migrations/00006_rls_policies.sql`] — existing `bips_update_own_draft_or_pending` (to be replaced), `bips_update_admin`, `bips_select_own_or_approved` (admin clause)
- [VERIFIED: `supabase/migrations/00008_app_metadata_role_mirror.sql`] — role mirror trigger mechanics
- [VERIFIED: `lib/supabase/server.ts`] — `createClient()` factory contract (`await cookies()`, `getClaims()`)
- [VERIFIED: `lib/supabase/admin.ts`] — ESLint isolation confirmed; Phase 3 does not use this
- [VERIFIED: `lib/utils/status.ts`] — `STATUS_BADGE_CLASSES` lookup available for `AdminBipCard`
- [VERIFIED: `lib/store/bip-draft.ts`] — `hydrateFromServer()` + `DRAFT_STORAGE_KEY` pattern; localStorage isolation strategy for admin mode
- [VERIFIED: `components/forms/BipSubmissionWizard.tsx` lines 50-68] — `Props` interface; no `mode` prop yet; `renderPreviewStep` slot confirmed
- [VERIFIED: `components/dashboard/DashboardBipCard.tsx` line 64] — `rejection_reason` field already in `CoordinatorBip` type; needs data wiring
- [VERIFIED: `package.json`] — `resend`, `react-email`, `@react-email/components` NOT installed; all other deps confirmed present
- [VERIFIED: `npm view resend version`] → `6.12.3`
- [VERIFIED: `npm view @react-email/components version`] → `1.0.12`
- [VERIFIED: `npm view react-email version`] → `6.1.1`
- [VERIFIED: `node -e "const {after}=require('next/server')"` ] → `after` exported from `next/server` in Next.js 15.5.18
- [VERIFIED: `.planning/config.json`] — `nyquist_validation: true`; `commit_docs: true`; `mode: yolo`

### Secondary (MEDIUM confidence)

- [CITED: `03-CONTEXT.md` D-06, D-07, D-08, D-10, D-11, D-12, D-13, D-14, D-15] — locked decisions
- [CITED: `03-UI-SPEC.md`] — new shadcn components (dropdown-menu, avatar); no new Tailwind tokens; spacing/typography contract
- [CITED: `PITFALLS.md` Pitfall 5] — WITH CHECK on UPDATE policies; directly applied to migration 00011
- [CITED: `PITFALLS.md` Pitfall 6] — `security_invoker = true` on analytics Postgres function
- [CITED: `PITFALLS.md` Pitfall 7] — `createAdminClient` isolation; confirmed not needed in Phase 3

### Tertiary (LOW confidence — flagged as ASSUMED)

- A1: `revalidatePath('/bip/' + slug)` vs `revalidatePath('/bip/[slug]', 'page')` — exact Next.js 15.5 behavior; see Assumptions Log A1
- A2: `render()` API in `@react-email/components` 1.0.12 — confirm during Wave 0 template build

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all package versions verified against npm registry and project `package.json`
- Architecture / patterns: HIGH — all patterns derived from existing verified codebase (middleware.ts, layout.tsx, migrations); no speculation
- State machine / RLS: HIGH — exact SQL from locked D-10; mirrors verified migration 00006 pattern
- Email (Resend + React Email): HIGH for API shape; MEDIUM for `render()` exact call signature (A2)
- Pitfalls: HIGH — all directly derived from existing PITFALLS.md + codebase inspection

**Research date:** 2026-05-11
**Valid until:** 2026-06-11 (30 days; stable stack; no fast-moving dependencies in scope)
