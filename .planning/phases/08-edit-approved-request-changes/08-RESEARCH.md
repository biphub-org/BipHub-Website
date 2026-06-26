# Phase 8: Edit-Approved + Request-Changes — Research

**Researched:** 2026-06-26
**Domain:** Supabase RLS / Next.js 15 Server Actions / coordinator–admin review loop
**Confidence:** HIGH — all findings verified against the actual codebase

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01/D-01a** — Pending edits live in a separate `bip_edits` table. `bips` row stays `approved` and untouched until merge. NO `published_snapshot` column, NO `pending_edit` status on `bips`, no change to `bips_select_approved_public`.
- **D-02** — `bip_edits` stores the full proposed content (all editable fields, slug excluded).
- **D-03** — Partial unique index: at most one open edit per BIP (`status IN ('pending','changes_requested')`).
- **D-04** — Third verdict + admin note live on the relevant row. For `bip_edits` rows: `status` enum is `pending | approved | rejected | changes_requested` + `admin_note text` column on the same row. No separate reviews table.
- **D-05** — Resubmit reuses the same `bip_edits` row: `changes_requested → pending`.
- **D-06/D-06a** — "Request changes" applies to both new submissions AND approved-BIP edits. For new submissions: `changes_requested` is a new `bips.status` value (extend 00001 CHECK). For approved-BIP edits: lives on `bip_edits` row. Two code paths.
- **D-07** — All-fields side-by-side diff (live | proposed), changed fields highlighted.
- **D-08** — One unified admin review queue. "Edit" badge on edit items.
- **D-09** — Coordinator initiates edits via the existing dashboard edit form; "Submit Edit for Review" CTA replaces the normal Submit button when BIP is `approved`.
- **D-10** — Slug immutability dual-guarded: form omits slug field; merge Server Action ignores any incoming slug.
- **D-11** — 3 outcome notification emails (`edit-approved`, `edit-rejected`, `edit-changes-requested`) added as new variants on `lib/email/send.ts` `EmailPayload` union. Rejected and changes-requested emails embed the admin note.
- **D-12** — Extend `bip_status_history.action_kind` CHECK with new edit kinds (exact names: planner's call). Every edit/re-review action MUST be logged per EDIT-08.
- **D-13** — On approve-edit: copy `bip_edits` → `bips`, set edit row `approved`, `revalidatePath('/bip/${slug}')` + `revalidatePath('/bips')` + `revalidatePath('/admin')`. On reject-edit: `bips` unchanged, edit row `rejected`.
- **D-14** — `bip_edits` RLS: ENABLE RLS; coordinator self-CRUD on own rows in editable states; admin select/update; UPDATE WITH BOTH `USING` AND `WITH CHECK`; FK cascades to `bips` and `auth.users`.

### Claude's Discretion

- D-06a: new-submission admin note storage (column on `bips` vs `bip_status_history.note` field) — delegated to planner.
- D-12: exact `action_kind` names for edit/re-review — delegated to planner.
- D-14: precise RLS predicates on `bip_edits` — delegated to planner.
- Materialization details throughout — planner/researcher may refine these.

### Deferred Ideas (OUT OF SCOPE)

- Phase 7: Alert Subscriptions + Email Pipeline — deferred, independent of Phase 8.
- Multi-coordinator collaboration on a single edit.
- Versioned edit history UI beyond the audit log.
- alert subscriptions / digest email pipeline.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EDIT-01 | Coordinator can submit an edit to an already-approved BIP for admin re-review | `submitEditAction` pattern → create `bip_edits` row |
| EDIT-02 | Approved BIP stays publicly visible (showing live approved version) while edit is under re-review | `bips.status` stays `approved`; `bip_edits` row holds proposed content; `bips_select_approved_public` untouched |
| EDIT-03 | Admin can view the proposed edit as a diff against the live BIP | `BipEditDiffView` component; compare `bip_edits` row vs `bips` row at render |
| EDIT-04 | Admin can approve an edit, merging it into the live BIP and refreshing the public page | `approveEditAction`: copy `bip_edits` → `bips`, `revalidatePath` |
| EDIT-05 | Admin can reject an edit, leaving the live BIP unchanged | `rejectEditAction`: set edit row `rejected`, `bips` untouched |
| EDIT-06 | Admin can "request changes" on a pending submission (third state) with a note | `requestChangesBipAction` (new submissions) + `requestChangesEditAction` (edit rows); D-06a asymmetry |
| EDIT-07 | Coordinator emailed on each outcome (approved / rejected / changes-requested) | 3 new `EmailPayload` variants; embed admin note in rejected + changes-requested |
| EDIT-08 | Every edit and re-review action recorded in `bip_status_history` audit log | Extend `action_kind` CHECK; explicit inserts in Server Actions |
| EDIT-09 | BIP slug cannot be changed through the edit flow | Edit form omits slug field; merge action ignores slug; dual guard |
</phase_requirements>

---

## Summary

Phase 8 is a surgical extension of the existing Phase 3 (Admin Review) infrastructure. The core pattern — Server Action → DB write → audit log → `revalidatePath` → fire-and-forget email — is already established and proven. This phase adds one new table (`bip_edits`), extends the `bips.status` CHECK constraint, extends the `bip_status_history.action_kind` CHECK, adds 3 email variants, adds 3 new UI components, and extends multiple existing components and queries.

The key complexity is the **D-06a asymmetry**: "request changes" applies to two completely different objects — a `bips` row (new-submission path, extending the existing moderaton state machine) and a `bip_edits` row (approved-BIP edit path). These require separate Server Actions with separate audit-log entries but deliver the same coordinator UX (a note + ability to revise and resubmit). The admin queue must surface both cases under a unified surface.

The admin queue also becomes a **union of two data sources** (`bips` with status `pending|changes_requested` and `bip_edits` with status `pending|changes_requested`), which is the most structurally novel change from a data-layer perspective.

**Primary recommendation:** Plan around three migration files (bip_edits table + RLS, bips status extension, action_kind extension) → two new coordinator Server Actions → three new admin Server Actions → three new email templates → three new UI components → extended existing components and queries.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `bip_edits` DDL + RLS | Database | — | Schema + security enforcement |
| Submit edit (create `bip_edits` row) | API/Backend (Server Action) | Browser (form state) | Coordinator-owned write; RLS enforces ownership |
| Load open edit for form pre-fill | API/Backend (Server Action / query) | — | Coordinator-owned read; defense-in-depth ownership check |
| Admin queue union (bips + bip_edits) | API/Backend (query) | Frontend Server (RSC) | Data aggregation stays in query layer |
| Diff view (compare live vs proposed) | Browser (RSC render) | — | Pure derivation at render time from both rows |
| Approve-edit merge | API/Backend (Server Action) | CDN / Static (revalidatePath) | Content write + ISR bust |
| Reject-edit | API/Backend (Server Action) | — | Edit row update; bips untouched |
| Request-changes (edit row) | API/Backend (Server Action) | — | Edit row status + admin_note update |
| Request-changes (new submission) | API/Backend (Server Action) | — | `bips.status` → `changes_requested` + audit note |
| Resubmit edit | API/Backend (Server Action) | — | Edit row status reset |
| Coordinator edit form CTA switching | Frontend Server (RSC page) | Browser (client component state) | Page fetches BIP + open edit; client component renders conditional CTA |
| Admin type badge | Browser (client component) | — | Presentational; no server involvement |
| Outcome emails | API/Backend (Server Action) | External (Resend) | Fire-and-forget; already established pattern |
| ISR cache bust | CDN / Static | — | `revalidatePath` called from Server Actions |

---

## Standard Stack

No new libraries are required. Phase 8 reuses the entire locked stack.

### Core (existing, unchanged)
| Library | Version | Purpose |
|---------|---------|---------|
| `@supabase/ssr` | `0.5.2` (exact pin) | Supabase server client factory — `createClient` |
| `zod` | `^3.x` | Schema validation (NOT v4 — locked) |
| `@hookform/resolvers` | `^3.x` | Zod resolver for RHF (incompatible with Zod v4) |
| `react-hook-form` | existing | Modal form validation (same pattern as `RejectBipModal`) |
| `next/cache` | built-in | `revalidatePath` for ISR cache bust |
| `resend` | existing | Transactional email (fire-and-forget) |
| `@react-email/components` | existing | Email template rendering |
| `sonner` | existing | Toast notifications |
| `lucide-react` | existing | Icons (`MessageSquare` for request-changes button) |
| `motion` | existing | Not directly needed; existing animations |

**Installation:** None required.

---

## Architecture Patterns

### System Architecture Diagram

```
Coordinator (browser)
  └─ /dashboard/bips/[id]/edit (RSC page)
       ├─ getCoordinatorBipById(id)  ← extended: allows approved status + fetches open edit
       └─ [renders form + EditStatusCallout + conditional CTA]
            │
            ├─ CTA "Submit Edit for Review" → submitEditAction(bipId, draftData)
            │    ├─ getClaims() + ownership check
            │    ├─ one-open-edit guard (query bip_edits WHERE bip_id=X AND status IN ...)
            │    ├─ INSERT bip_edits row (status='pending')
            │    ├─ INSERT bip_status_history (action_kind='submit_edit')
            │    └─ (no revalidatePath — public page untouched)
            │
            └─ CTA "Resubmit Edit" → resubmitEditAction(editId, updatedData)
                 ├─ getClaims() + ownership check
                 ├─ UPDATE bip_edits SET status='pending', fields=... WHERE id=editId
                 ├─ INSERT bip_status_history (action_kind='resubmit_edit')
                 └─ (no revalidatePath — public page untouched)

Admin (browser)
  └─ /admin (RSC page)
       └─ getAdminPendingItems()  ← NEW: union query (bips pending/changes_requested + bip_edits pending/changes_requested)
            └─ AdminBipCard (type badge: "Edit" or none)

  └─ /admin/bips/[id]/review (RSC page — extended for new-submission changes_requested)
       └─ AdminActionsPanel (extended: 3 buttons; conditional labels)
            ├─ approveBipAction (existing, unchanged)
            ├─ rejectBipAction (existing, unchanged)
            └─ requestChangesBipAction (NEW — new submission path)
                 ├─ UPDATE bips SET status='changes_requested'
                 ├─ INSERT bip_status_history (action_kind='request_changes', note=adminNote)
                 └─ sendEmail('edit-changes-requested', ...)

  └─ /admin/bip-edits/[editId]/review (NEW RSC route — edit review path)
       ├─ getBipEditById(editId)  ← NEW query
       ├─ BipEditDiffView (live bips row vs bip_edits row)
       └─ AdminActionsPanel (isEdit=true → "Approve Edit" / "Request Changes" / "Reject Edit")
            ├─ approveEditAction(editId)
            │    ├─ copy bip_edits fields → UPDATE bips
            │    ├─ UPDATE bip_edits SET status='approved'
            │    ├─ INSERT bip_status_history (action_kind='approve_edit')
            │    ├─ revalidatePath('/bip/${slug}') + '/bips' + '/admin'
            │    └─ sendEmail('edit-approved', ...)
            ├─ rejectEditAction(editId)
            │    ├─ UPDATE bip_edits SET status='rejected'
            │    ├─ INSERT bip_status_history (action_kind='reject_edit')
            │    └─ sendEmail('edit-rejected', ...)
            └─ requestChangesEditAction(editId, adminNote)
                 ├─ UPDATE bip_edits SET status='changes_requested', admin_note=adminNote
                 ├─ INSERT bip_status_history (action_kind='request_changes')
                 └─ sendEmail('edit-changes-requested', ...)
```

### Recommended Project Structure (new files only)

```
supabase/migrations/
├── 00017_bip_edits.sql            # bip_edits table + RLS + partial unique index
├── 00018_bips_changes_requested.sql  # extend bips.status CHECK + log_bip_status_change trigger
└── 00019_bip_status_history_edit_kinds.sql  # extend action_kind CHECK

lib/
├── actions/
│   ├── bip-edits.ts               # submitEditAction, resubmitEditAction (coordinator)
│   └── admin-edit-bips.ts         # approveEditAction, rejectEditAction, requestChangesEditAction
├── queries/
│   └── bipEdits.ts                # getOpenEditForBip, getBipEditById, getAdminPendingItems
├── schemas/
│   └── bip-edits.ts               # SubmitEditSchema, RequestChangesSchema, RejectEditSchema etc.
└── email/templates/
    ├── EditApprovalEmail.tsx
    ├── EditRejectionEmail.tsx
    └── EditChangesRequestedEmail.tsx

components/
├── admin/
│   ├── BipEditDiffView.tsx         # all-fields side-by-side diff
│   └── RequestChangesBipModal.tsx  # amber modal (mirrors RejectBipModal)
└── dashboard/
    └── EditStatusCallout.tsx       # coordinator status banner for open edit

app/
└── (admin)/admin/bip-edits/[editId]/review/
    └── page.tsx                    # NEW review page for edit items
```

---

## Existing Code to Extend

### 1. `supabase/migrations/00001_skeleton_bips_table.sql`
[VERIFIED: codebase read]

Current `bips.status` CHECK:
```sql
check (status in ('draft', 'pending', 'approved', 'rejected'))
```

**Phase 8 extends this to:**
```sql
check (status in ('draft', 'pending', 'approved', 'rejected', 'changes_requested'))
```

`bips_select_approved_public` (the public read policy) must remain:
```sql
using (status = 'approved')
```
Do NOT change it. The `changes_requested` status on a new submission means the BIP is NOT publicly visible (same as `pending`), which is correct — only approved BIPs are public.

### 2. `supabase/migrations/00010_bip_status_history.sql`
[VERIFIED: codebase read]

Current `action_kind` CHECK (6 values):
```sql
check (action_kind in ('submit','approve','reject','resubmit','admin_edit','withdraw'))
```

**Phase 8 adds:**
- `submit_edit` — coordinator submits an edit for an approved BIP
- `resubmit_edit` — coordinator resubmits after `changes_requested`
- `approve_edit` — admin approves an edit (merge occurs)
- `reject_edit` — admin rejects an edit
- `request_changes` — admin requests changes on either a new submission or an edit

The trigger `log_bip_status_change()` currently handles `draft→pending`, `rejected→draft`, `pending→draft`. For Phase 8:
- The trigger must also log `pending → changes_requested` on `bips` (new-submission request-changes path) → `action_kind = 'request_changes'`
- The trigger should NOT handle `bip_edits` transitions (different table, different trigger)
- Admin transitions on `bip_edits` are logged explicitly in Server Actions (same pattern as `approveBipAction`/`rejectBipAction` today)

**Trigger extension for `bips`:**
```sql
elsif (old.status = 'pending' and new.status = 'changes_requested') then
  -- NOTE: admin's note is passed separately by the Server Action; trigger
  -- logs the transition without the note (Server Action inserts its own
  -- audit row with the note). To avoid double-logging, consider:
  -- Option A: Trigger handles this case AND Server Action skips its own insert.
  -- Option B: Skip trigger for this case; Server Action does the explicit insert.
  -- Recommendation: Option B (same pattern as existing approve/reject).
  return new; -- let Server Action do the explicit audit insert with the note
```

The SECURITY DEFINER trigger runs as `postgres` so it can insert into `bip_status_history` despite the admin-only INSERT RLS policy. The `bsh_insert_admin` policy checks `app_metadata.role = 'admin'`, which the trigger bypasses. This is correct behavior.

### 3. `lib/utils/status.ts`
[VERIFIED: codebase read]

Current:
```typescript
export type BipStatus = 'draft' | 'pending' | 'approved' | 'rejected'
```

**Phase 8 extends:**
```typescript
export type BipStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'changes_requested'
```

Add to `STATUS_BADGE_CLASSES`:
```typescript
changes_requested: 'bg-status-changes-requested-bg text-status-changes-requested border-status-changes-requested',
```

Add to `STATUS_LABELS`:
```typescript
changes_requested: 'Changes Requested',
```

Add to `app/globals.css` (inside `@theme inline` block):
```css
--color-status-changes-requested: #b45309;
--color-status-changes-requested-bg: #fffbeb;
```

See UI-SPEC Color section for the complete CSS comment with Tailwind v4 safelist.

### 4. `lib/utils/status-transitions.ts`
[VERIFIED: codebase read]

Current `ALLOWED_TRANSITIONS` array (7 entries). Phase 8 adds new `bips` transitions:

```typescript
// New-submission request-changes loop
{ from: 'pending',            to: 'changes_requested', actor: 'admin' },
{ from: 'changes_requested',  to: 'pending',           actor: 'coordinator' }, // resubmit
{ from: 'changes_requested',  to: 'approved',          actor: 'admin' },
{ from: 'changes_requested',  to: 'rejected',          actor: 'admin' },
```

`bip_edits` status transitions should be validated in the `bip-edits` Server Actions directly (separate from `validateTransition` which handles `bips`), or a parallel `validateEditTransition` function should be created.

### 5. `lib/actions/admin-bips.ts`
[VERIFIED: codebase read]

The approved pattern (all 9 steps) to mirror for new edit Server Actions:
```typescript
// 1. const supabase = await createClient()
// 2. const { data: authData } = await supabase.auth.getClaims()
// 3. role === 'admin' check
// 4. Zod safeParse
// 5. Read existing row (defense-in-depth)
// 6. validateTransition (or inline check for bip_edits)
// 7. UPDATE bips / bip_edits
// 8. INSERT bip_status_history (explicit — trigger won't fire for admin transitions)
// 9. revalidatePath (conditional on what changed publicly)
// 10. sendEmail (try/catch fire-and-forget)
// 11. redirect (or return { success: true } for non-navigating actions)
```

**Key detail:** `approveBipAction` calls `redirect()` on success. For `approveEditAction`, the same pattern applies. For `requestChangesEditAction` and `rejectEditAction`, the admin stays on the review page (no redirect needed after a non-terminal action like request-changes), or redirects to `/admin` if desired.

### 6. `lib/email/send.ts`
[VERIFIED: codebase read]

The `EmailPayload` discriminated union exhaustive-switch pattern forces compile-time template coverage. Add 3 new variants:

```typescript
export type EmailPayload =
  | { template: 'approval'; props: ApprovalEmailProps }
  | { template: 'rejection'; props: RejectionEmailProps }
  | { template: 'admin-notification'; props: AdminNotificationEmailProps }
  // Phase 8 — new:
  | { template: 'edit-approved'; props: EditApprovalEmailProps }
  | { template: 'edit-rejected'; props: EditRejectionEmailProps }
  | { template: 'edit-changes-requested'; props: EditChangesRequestedEmailProps }
```

`EditRejectionEmailProps` and `EditChangesRequestedEmailProps` MUST include `adminNote: string` (D-11).
`EditApprovalEmailProps` mirrors `ApprovalEmailProps` but with different copy ("your edit is live").

The existing `resolveSubject()` switch must be extended (the exhaustive-check enforces this at compile time — missing cases produce a TypeScript error).

### 7. `lib/schemas/admin-bips.ts`
[VERIFIED: codebase read]

Add new schemas following the existing pattern:
```typescript
export const RequestChangesBipSchema = z.object({
  bipId: z.string().uuid({ message: 'Invalid BIP id.' }),
  note: z.string()
    .min(10, 'Note must be at least 10 characters.')
    .max(1000, 'Note must be at most 1000 characters.'),
})
export type RequestChangesBipInput = z.infer<typeof RequestChangesBipSchema>

// For bip_edits operations:
export const ApproveEditSchema = z.object({ editId: z.string().uuid() })
export const RejectEditSchema = z.object({
  editId: z.string().uuid(),
  note: z.string().min(10).max(1000),
})
export const RequestChangesEditSchema = z.object({
  editId: z.string().uuid(),
  note: z.string().min(10).max(1000),
})
```

### 8. `lib/queries/adminBips.ts` — `getAdminPendingBips`
[VERIFIED: codebase read]

Currently: `query.eq('status', 'pending')` on `bips` only.

Phase 8 needs a new `getAdminPendingItems()` function that returns a unified list. The admin queue must show:
- `bips` with `status IN ('pending', 'changes_requested')` (new-submission items)
- `bip_edits` with `status IN ('pending', 'changes_requested')` joined with their parent `bips` row

These are from two different tables and need separate queries merged in the RSC. Recommended approach:

```typescript
// Two separate queries, merged in RSC:
export type AdminQueueItem =
  | { kind: 'submission'; bip: AdminBip }
  | { kind: 'edit'; edit: AdminBipEdit; bip: AdminBip }

export async function getAdminPendingSubmissions(): Promise<AdminBip[]>
export async function getAdminPendingEdits(): Promise<AdminBipEditItem[]>
// RSC merges and sorts by created_at
```

The `AdminBipEdit` shape needs: `id` (bip_edits.id), `bip_id`, `status`, `created_at`, `admin_note` plus the parent `bip` fields for display (title, coordinator, dates, etc.).

The review link for submission items: `/admin/bips/[bip.id]/review` (existing route).
The review link for edit items: `/admin/bip-edits/[edit.id]/review` (NEW route).

### 9. `lib/queries/coordinatorBipById.ts`
[VERIFIED: codebase read]

Currently returns `null` for `approved` status:
```typescript
if (data.status !== 'draft' && data.status !== 'pending') return null
```

Phase 8 must extend this to:
1. Accept `approved` and `changes_requested` status values (for the edit flow).
2. When status is `approved`, also fetch the open `bip_edits` row if one exists.
3. Return the open edit's data so the coordinator form can pre-fill from `bip_edits.{content fields}` instead of `bips.{content fields}` when an edit is already in progress.

Extended return type:
```typescript
export type CoordinatorBipForEdit = {
  id: string
  data: BipDraftData          // live bips content (for diff reference)
  updatedAt: string
  hostUniversity: { id: string; name: string; country: string } | null
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'changes_requested'
  openEdit?: {                 // the open bip_edits row, if any
    id: string
    status: 'pending' | 'changes_requested'
    admin_note: string | null
    data: BipDraftData        // proposed content (pre-fills the edit form)
  } | null
} | null
```

### 10. `components/admin/AdminActionsPanel.tsx`
[VERIFIED: codebase read]

Current props: `{ bipId, bipTitle, coordinatorName, currentStatus: BipStatus, nextPendingId }`.

Phase 8 additions:
- `isEdit?: boolean` — when true, shows "Approve Edit" / "Reject Edit" labels
- `editId?: string` — the `bip_edits.id` for edit-path actions
- Third "Request Changes" button (amber outline, see UI-SPEC Surface 4)
- Enabled logic per UI-SPEC (see Surface 4 table)

### 11. `app/(dashboard)/dashboard/bips/[id]/edit/page.tsx`
[VERIFIED: codebase read]

Currently: calls `getCoordinatorBipById(id)` and 404s on null (which includes approved BIPs). Phase 8 must:
1. Return the page (not 404) for approved BIPs.
2. Determine which of the 3 states (A/B/C from UI-SPEC) to render.
3. Mount `EditStatusCallout` above the wizard fields.
4. Replace the normal "Submit" CTA with the appropriate CTA (State A: "Submit Edit for Review", State B: disabled, State C: "Resubmit Edit").
5. Omit the slug field entirely from the wizard when BIP status is `approved` (D-10).

### 12. `app/(admin)/admin/bips/[id]/review/page.tsx`
[VERIFIED: codebase read]

This page handles new-submission reviews. Phase 8 extends it to also handle the `changes_requested` status for new submissions (which now appear in the admin queue). The `AdminActionsPanel` needs to show the "Request Changes" button on this page.

No diff view here (diff view is only for edit items on the NEW `/admin/bip-edits/[editId]/review` route).

### 13. `app/(admin)/admin/page.tsx`
[VERIFIED: codebase read]

Extend sub-line copy per UI-SPEC Surface 2:
```typescript
// from:
`${count} BIP${count === 1 ? '' : 's'} awaiting review`
// to (when edits are present):
`${totalCount} items awaiting review · includes new submissions and edits`
```

---

## `bip_edits` Table DDL (Derived from D-01 through D-14)

[VERIFIED: design derived from locked decisions + schema analysis]

```sql
-- 00017_bip_edits.sql

create table public.bip_edits (
  id           uuid primary key default gen_random_uuid(),
  bip_id       uuid not null references public.bips(id) on delete cascade,
  created_by   uuid references auth.users(id) on delete cascade,  -- FOUN-09
  status       text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'changes_requested')),
  admin_note   text,  -- D-04: note from admin for rejected/changes_requested

  -- Full proposed content (D-02) — all editable BIP fields, slug excluded (D-10)
  title                       text,
  isced_f_code                text,
  description                 text,
  learning_outcomes           text,
  virtual_component_description text,
  virtual_timing              text,
  host_city                   text,
  physical_start_date         date,
  physical_end_date           date,
  application_deadline        date,
  ects_credits                integer,
  max_participants            integer,
  study_levels                text[],
  language_of_instruction     text,
  language_level_min          text,
  green_travel                boolean,
  inclusion_support           boolean,
  eligibility_notes           text,
  how_to_apply_type           text,
  how_to_apply_value          text,
  contact_name                text,
  contact_email               text,
  -- Partner institutions as JSONB (avoids a bip_edit_partner_universities join table)
  -- Shape: [{ university_id: string|null, name: string, country: string, isVerified: boolean }]
  partner_institutions        jsonb not null default '[]'::jsonb,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- FOUN-09 / GDPR: user_id ON DELETE CASCADE means delete_my_account() RPC
-- removes bip_edits rows automatically via auth.users FK cascade.

-- D-03: at most one open edit per BIP
create unique index bip_edits_one_open_per_bip
  on public.bip_edits (bip_id)
  where status in ('pending', 'changes_requested');

-- Performance indexes
create index bip_edits_bip_id_idx on public.bip_edits (bip_id);
create index bip_edits_created_by_idx on public.bip_edits (created_by);
create index bip_edits_status_created_at_idx on public.bip_edits (status, created_at);

alter table public.bip_edits enable row level security;

-- Coordinator: select own edits (any status)
create policy "bip_edits_select_own"
  on public.bip_edits for select
  to authenticated
  using ((select auth.uid()) = created_by);

-- Coordinator: insert new edits
create policy "bip_edits_insert_own"
  on public.bip_edits for insert
  to authenticated
  with check (
    (select auth.uid()) = created_by
    -- Coordinator cannot self-approve; post-image status must be 'pending'
    and status = 'pending'
  );

-- Coordinator: update own edit (resubmit: changes_requested → pending, + content update)
-- CLAUDE.md: UPDATE policies MUST have both USING and WITH CHECK.
create policy "bip_edits_update_own_resubmit"
  on public.bip_edits for update
  to authenticated
  using (
    (select auth.uid()) = created_by
    and status = 'changes_requested'  -- only editable in this state
  )
  with check (
    (select auth.uid()) = created_by
    and status = 'pending'            -- post-image must be pending (T-03-02 analog)
    -- Note: admin_note is set by admin; coordinator update must not modify it.
    -- Enforced application-side (Server Action ignores admin_note).
  );

-- Admin: select all bip_edits
create policy "bip_edits_select_admin"
  on public.bip_edits for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Admin: update (approve/reject/request_changes)
-- CLAUDE.md: UPDATE policies MUST have both USING and WITH CHECK.
create policy "bip_edits_update_admin"
  on public.bip_edits for update
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
```

**Partner institutions storage note:** JSONB in `bip_edits.partner_institutions` is preferred over a separate join table to avoid creating `bip_edit_partner_universities` (an additional table with its own RLS, delete-then-insert patterns, and FK management). The diff view renders partners as a newline-separated list regardless of storage mechanism. The merge action copies the JSONB array and re-creates `bip_partner_universities` rows in the same transaction (delete-then-insert pattern, mirrors `submitBipAction`).

---

## D-06a Asymmetry: New-Submission `changes_requested`

[VERIFIED: CONTEXT.md D-06a]

The planner must implement two completely separate code paths for the "Request Changes" verdict:

### Path 1 — New submission (no `bip_edits` row)
- Target row: `bips`
- Status change: `pending → changes_requested` (new `bips.status` value)
- Admin note storage: **Decision delegated to planner.** Two options:
  - **Option A (recommended for consistency):** Store note in `bip_status_history.note` where `action_kind = 'request_changes'`. Coordinator dashboard queries the latest `request_changes` history row to retrieve the note. Mirrors how rejection reason is stored (`bip_status_history.note` with `action_kind = 'reject'`).
  - **Option B:** Add `admin_note text` column to `bips`. Simpler single-row query. Downside: schema change to `bips`, awkward for multi-round history.
- Server Action: `requestChangesBipAction(bipId, note)` in `lib/actions/admin-bips.ts` (or a new file)
- Resubmit path: coordinator opens the existing wizard (already works since `changes_requested` is a `bips` status the edit form now accepts), submits → `submitBipAction` or a new `resubmitPendingBipAction`

### Path 2 — Approved-BIP edit (has `bip_edits` row)
- Target row: `bip_edits`
- Status change: `pending → changes_requested` (on `bip_edits.status`)
- Admin note storage: `bip_edits.admin_note` column (D-04 — already in the DDL above)
- Server Action: `requestChangesEditAction(editId, note)` in `lib/actions/admin-edit-bips.ts`
- Resubmit path: coordinator updates `bip_edits` row and calls `resubmitEditAction(editId, updatedData)`

**Both paths** send the `edit-changes-requested` email with the admin note embedded.

---

## Merge-on-Approve Transaction

[VERIFIED: design derived from D-13 + adminUpdateBipAction pattern]

`approveEditAction` must be atomic-enough: the merge copies content from `bip_edits` to `bips`, then marks the edit as `approved`. There is no native transaction primitive in the Supabase JS client, so this is two sequential DB writes. The failure window between them is acceptable (same risk acceptance as `submitBipAction`'s delete-then-insert).

```typescript
export async function approveEditAction(editId: string): Promise<ActionResult> {
  // 1. getClaims() + role=admin check
  // 2. Read bip_edits row (including bip_id, all content fields, created_by)
  // 3. Read bips row (for slug, validateTransition, coordinator email)
  // 4. Validate: editRow.status must be 'pending' or 'changes_requested'
  // 5. UPDATE bips SET (all content fields from edit row) WHERE id=bip_id
  //    IMPORTANT: slug is NOT in the update payload (D-10 / EDIT-09)
  //    partner_institutions handled separately (delete-then-insert)
  // 6. UPDATE bip_edits SET status='approved' WHERE id=editId
  // 7. Reconcile bip_partner_universities (delete existing for bip_id, insert from edit's JSONB)
  // 8. INSERT bip_status_history (action_kind='approve_edit', bip_id=bip_id)
  // 9. revalidatePath('/bip/${slug}') + '/bips' + '/admin'
  // 10. sendEmail('edit-approved', ...) — try/catch fire-and-forget
  // 11. redirect to next pending item or /admin
}
```

**Slug immutability enforcement:** The `updatePayload` built in step 5 MUST NOT include `slug` — same as `adminUpdateBipAction` which explicitly omits it. This is the server-side guard (D-10, EDIT-09).

---

## Diff View Implementation

[VERIFIED: UI-SPEC Surface 3]

`BipEditDiffView` is a `'use client'` RSC component that receives both `liveBip: BipDetail` and `proposedEdit: BipEditContent` as props from the RSC page. All diff computation is pure derivation at render time — no additional fetches.

The 16-field display order from UI-SPEC is:
1. Title (`bips.title`)
2. Short description (`bips.description`)
3. Field of study (`bips.isced_f_code`)
4. Language(s) (`bips.language_of_instruction`)
5. ECTS credits (`bips.ects_credits`)
6. Level (`bips.study_levels`)
7. Host city (`bips.host_city`)
8. Physical start date (`bips.physical_start_date`)
9. Physical end date (`bips.physical_end_date`)
10. Virtual start date — **⚠ SCHEMA DISCREPANCY (see Open Questions)**
11. Virtual end date — **⚠ SCHEMA DISCREPANCY (see Open Questions)**
12. Application deadline (`bips.application_deadline`)
13. How to apply (`bips.how_to_apply_type` + `bips.how_to_apply_value`)
14. Partner institutions (`bip_partner_universities` / `bip_edits.partner_institutions` JSONB)
15. Green travel (`bips.green_travel`)
16. Description / additional info (`bips.virtual_component_description`)

A field is "changed" if `JSON.stringify(live.field) !== JSON.stringify(proposed.field)`. Changed fields get the gold highlight row style.

---

## New-Submission `changes_requested` State Machine

[VERIFIED: status-transitions.ts + migrations 00011/00012]

Phase 8 extends the existing `bips` state machine. The complete set of coordinator-relevant `bips` transitions after Phase 8:

```
draft          → pending           (coordinator — submitBipAction)
pending        → draft             (coordinator — withdrawBipAction)
rejected       → draft             (coordinator — reviseRejectedBipAction)
changes_requested → pending        (coordinator — resubmitPendingBipAction, NEW)

null           → draft             (coordinator — create)
pending        → approved          (admin — approveBipAction)
pending        → rejected          (admin — rejectBipAction)
pending        → changes_requested (admin — requestChangesBipAction, NEW)
changes_requested → approved       (admin)
changes_requested → rejected       (admin)
approved       → rejected          (admin — un-approve, existing)
```

The `changes_requested → pending` coordinator resubmit is analogous to the existing `rejected → draft` pattern in `reviseRejectedBipAction`: the coordinator gets a "revise" CTA, makes changes in the wizard, and transitions back to `pending` by resubmitting. Unlike `rejected → draft`, `changes_requested → pending` is a direct in-place transition (no intermediate `draft` step needed since the BIP was `pending` before).

RLS for `changes_requested → pending` transition needs a new policy or extension:
- The existing `bips_update_own_editable` (migration 00011) has USING clause: `status in ('draft', 'pending', 'rejected')` — does NOT include `changes_requested`. Must be extended.
- The WITH CHECK allows `status = 'draft'` only — must be extended to also allow `status = 'pending'` for this transition.
- Alternative: add a new policy `bips_update_own_to_pending_from_changes_requested` (mirrors the existing `bips_update_own_to_pending` pattern from migration 00012).

**Recommended:** Add a new migration that creates a parallel policy:
```sql
create policy "bips_update_own_changes_requested_to_pending"
  on public.bips for update
  to authenticated
  using (
    (select auth.uid()) = created_by
    and status = 'changes_requested'
  )
  with check (
    (select auth.uid()) = created_by
    and status = 'pending'
  );
```

---

## Common Pitfalls

### Pitfall 1: `getCoordinatorBipById` still 404s on approved BIPs
**What goes wrong:** The coordinator navigates to `/dashboard/bips/[id]/edit` for an approved BIP and gets a 404 because the query's status whitelist excludes `approved`.
**Why it happens:** The original whitelist was `draft | pending` only. Phase 8 needs it to include `approved` and `changes_requested`.
**How to avoid:** Extend the whitelist in `getCoordinatorBipById`. Return the `openEdit` sub-object populated from `bip_edits`.

### Pitfall 2: Partial unique index violation on resubmit
**What goes wrong:** `resubmitEditAction` calls `UPDATE bip_edits SET status='pending'` on a row that is `changes_requested`. The partial unique index is on `(bip_id) WHERE status IN ('pending','changes_requested')`. During the UPDATE, if the row is transitioning from `changes_requested` to `pending`, both states are covered by the index — but since it's the SAME row being updated (same `bip_id`, same row), there is no unique violation. The index constraint is per `bip_id`, and the row count remains 1.
**Resolution:** No issue — same row update keeps the index consistent.

### Pitfall 3: Slug included in the `bip_edits` content payload
**What goes wrong:** Developer includes `slug` in `bip_edits.{columns}` or in the merge payload, violating D-10/EDIT-09.
**How to avoid:** The `bip_edits` DDL does NOT have a `slug` column. The merge action's `updatePayload` must explicitly exclude `slug` (same defense pattern as `adminUpdateBipAction`). The edit form must not render the slug field when `bip.status === 'approved'`.

### Pitfall 4: `bip_edits` UPDATE policy allows coordinator to self-approve
**What goes wrong:** A coordinator calls the resubmit action and passes `status = 'approved'` directly.
**Why it happens:** Without a strict WITH CHECK, the RLS post-image doesn't constrain the destination status.
**How to avoid:** `bip_edits_update_own_resubmit` WITH CHECK must constrain `status = 'pending'` (no other value). This mirrors the existing Pitfall 5 / T-03-02 mitigation pattern.

### Pitfall 5: Tailwind v4 dynamic class names for `changes_requested` status
**What goes wrong:** Developer writes `bg-status-${status}-bg` template literal — Tailwind v4 static scanner cannot resolve it.
**How to avoid:** Only add `'changes_requested'` to the literal `STATUS_BADGE_CLASSES` lookup object in `lib/utils/status.ts`. The full class strings must appear as complete literals (CLAUDE.md never-do; PITFALLS Pitfall 13).

### Pitfall 6: Admin queue `getAdminPendingBips` not extended for `bip_edits`
**What goes wrong:** Admin queue only shows `bips` with `status='pending'`, missing `bip_edits` items and `changes_requested` items.
**How to avoid:** Replace `getAdminPendingBips` with `getAdminPendingItems` that runs two queries and merges results, or create separate helper functions called from the RSC.

### Pitfall 7: `bip_status_history` INSERT blocked by `bsh_insert_admin` RLS when coordinator resubmits
**What goes wrong:** `resubmitEditAction` is a coordinator-invoked Server Action that needs to insert into `bip_status_history`. The policy `bsh_insert_admin` only allows inserts when `app_metadata.role = 'admin'`. Coordinator's JWT has `role = 'coordinator'`.
**Why it happens:** The existing pattern for coordinator-initiated audit writes uses the SECURITY DEFINER trigger on `bips`. But for `bip_edits` transitions, the trigger is on a different table.
**How to avoid:** Two options:
  - **Option A:** Add a SECURITY DEFINER trigger `log_bip_edit_status_change()` on `bip_edits` (analogous to the existing `bips` trigger) to handle coordinator-initiated transitions.
  - **Option B:** Add a SECURITY DEFINER RPC `log_edit_audit(...)` that coordinators can call. Coordinator-role invocation bypasses the `bsh_insert_admin` RLS check because the function runs as `postgres`.
  - **Recommended:** Option A — mirrors the existing pattern perfectly. The trigger handles `pending → changes_requested → pending` transitions for coordinator actions; admin transitions are still logged explicitly by Server Actions.

### Pitfall 8: Double-audit-row for `bip_edits` transitions
**What goes wrong:** Both the trigger AND the Server Action insert into `bip_status_history`, creating duplicate rows.
**How to avoid:** Mirror the existing pattern: trigger handles ONLY coordinator-initiated transitions (`submit_edit`, `resubmit_edit`). Admin transitions (`approve_edit`, `reject_edit`, `request_changes`) are logged exclusively by the Server Action and the trigger's else-branch returns new without inserting.

### Pitfall 9: `revalidatePath` not called after approve-edit
**What goes wrong:** Admin approves an edit, the `bips` row is updated, but the public cache still serves the old content.
**Why it happens:** The ISR cache for `/bip/[slug]` has a 3600s TTL. Without `revalidatePath`, the update isn't visible until cache expiry.
**How to avoid:** `approveEditAction` MUST call `revalidatePath('/bip/${slug}')`, `revalidatePath('/bips')`, `revalidatePath('/admin')` after a successful merge. Read the `bips.slug` from the pre-fetched row (step 3 in the action) to construct the correct path.

### Pitfall 10: `bips_update_admin` policy doesn't cover `bip_edits` table
**What goes wrong:** Admin calls `approveEditAction` which UPDATEs `bips`. The existing `bips_update_admin` policy covers this. But it also needs to UPDATE `bip_edits`. Without the `bip_edits_update_admin` policy, the second UPDATE fails.
**How to avoid:** Ensure `bip_edits_update_admin` policy is included in migration 00017.

### Pitfall 11: GDPR cascade only works if FK is to `auth.users`, not `profiles`
**What goes wrong:** If `bip_edits.created_by` references `public.profiles(id)` instead of `auth.users(id)`, the `delete_my_account()` RPC deletes from `auth.users` but `profiles` rows have `ON DELETE CASCADE` from users. The chain is: `auth.users` DELETE → `profiles` CASCADE → `bip_edits` CASCADE. If `bip_edits.created_by` references `auth.users` directly, the cascade is direct and more reliable.
**How to avoid:** Use `references auth.users(id) on delete cascade` (same pattern as `saved_bips` in migration 00016, NOT the `bips` table which uses `set null`). For `bip_edits`, cascade (not set null) is correct per FOUN-09 — orphaned edits from deleted accounts should be removed.

### Pitfall 12: `bips_select_own_or_approved` exposes the approved status to coordinator
**What goes wrong:** Coordinator queries `bips` for their own approved BIP via the edit form. The policy `bips_select_own_or_approved` already allows coordinators to read their own BIPs at any status. No issue — the query adds `eq('created_by', claims.sub)`.

### Pitfall 13: Admin queue sub-line count is off when edits are included
**What goes wrong:** `app/(admin)/admin/page.tsx` currently counts only `bips` items. After the union query, the sub-line copy must reflect the total (submissions + edits).
**How to avoid:** Pass `totalCount` (sum of submission + edit counts) to the heading. Track separately which count includes edits to trigger the different sub-line copy format.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Form validation (request-changes note) | Custom validation logic | Zod v3 + RHF + `zodResolver` (same as `RejectBipModal`) |
| Audit trail | Custom logging middleware | `bip_status_history` table + existing `bsh_insert_admin` RLS + SECURITY DEFINER trigger pattern |
| Email template rendering | Custom HTML string builder | `@react-email/components` + `render()` (same pattern as `ApprovalEmail`) |
| Modal state management | Custom modal context | React `useState` + Dialog primitive (same pattern as existing modals) |
| Field diff computation | Diff library (e.g., `diff`) | Pure object comparison: `JSON.stringify(live.field) !== JSON.stringify(proposed.field)` — fields are scalar or small arrays |
| ISR revalidation | Webhooks / cron | `revalidatePath()` in Server Actions (locked stack) |

---

## Code Examples

### Extending `log_bip_status_change()` for `changes_requested`

[VERIFIED: migration 00010 codebase read]

```sql
-- In the trigger function's elsif chain (migration 00018 or 00017):
elsif (old.status = 'pending' and new.status = 'changes_requested') then
  -- Admin-initiated; Server Action writes its own explicit audit row with the note.
  -- Trigger returns early without double-logging.
  return new;
elsif (old.status = 'changes_requested' and new.status = 'pending') then
  v_action_kind := 'resubmit';  -- coordinator resubmit after changes requested
  -- Falls through to the INSERT below
```

### `submitEditAction` outline

[VERIFIED: design from approveBipAction pattern]

```typescript
'use server'
export async function submitEditAction(
  bipId: string,
  draft: BipDraftData,
  partners: Step3PartnerDraft[],
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (!claims?.sub) return { error: 'Session expired.' }
  const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
  if (role !== 'coordinator' && role !== 'admin') return { error: 'Forbidden.' }

  // Defense-in-depth: confirm bip is approved and owned by this coordinator
  const { data: bip } = await supabase
    .from('bips')
    .select('id, status, created_by, slug')
    .eq('id', bipId)
    .maybeSingle()
  if (!bip || bip.created_by !== claims.sub) return { error: 'BIP not found.' }
  if (bip.status !== 'approved') return { error: 'Only approved BIPs can have edits submitted.' }

  // D-03: one-open-edit guard
  const { data: existingEdit } = await supabase
    .from('bip_edits')
    .select('id, status')
    .eq('bip_id', bipId)
    .in('status', ['pending', 'changes_requested'])
    .maybeSingle()
  if (existingEdit?.status === 'pending') {
    return { error: 'An edit is already under review.' }
  }

  // Validate draft fields (reuse/adapt submitSchema from bip-submit.ts)
  // ...

  // INSERT bip_edits row (slug excluded per D-10)
  const { error: insertError } = await supabase
    .from('bip_edits')
    .insert({
      bip_id: bipId,
      created_by: claims.sub,
      status: 'pending',
      title: parsed.data.title,
      // ... all editable fields
      partner_institutions: JSON.stringify(partners),
    })
  // ...
  return { success: true }
}
```

### `approveEditAction` key merge step

[VERIFIED: design from adminUpdateBipAction pattern]

```typescript
// Step 5: copy bip_edits content → bips (slug excluded)
const mergePayload = {
  title: edit.title,
  isced_f_code: edit.isced_f_code,
  description: edit.description,
  // ... all columns from bip_edits (no slug — D-10)
  updated_at: new Date().toISOString(),
  // NOTE: status stays 'approved' — no status change on bips row
}
const { error: updateError } = await supabase
  .from('bips')
  .update(mergePayload)
  .eq('id', edit.bip_id)

// Step 6: mark edit as approved
const { error: editUpdateError } = await supabase
  .from('bip_edits')
  .update({ status: 'approved' })
  .eq('id', editId)

// Step 7: reconcile partners
await supabase.from('bip_partner_universities').delete().eq('bip_id', edit.bip_id)
// ... insert from edit.partner_institutions JSONB

// Step 9: ISR bust (D-13)
revalidatePath(`/bip/${bip.slug}`)
revalidatePath('/bips')
revalidatePath('/admin')
```

### Extending `EmailPayload` exhaustive union

[VERIFIED: lib/email/send.ts codebase read]

```typescript
export type EmailPayload =
  | { template: 'approval'; props: ApprovalEmailProps }
  | { template: 'rejection'; props: RejectionEmailProps }
  | { template: 'admin-notification'; props: AdminNotificationEmailProps }
  | { template: 'edit-approved'; props: EditApprovalEmailProps }
  | { template: 'edit-rejected'; props: EditRejectionEmailProps }
  | { template: 'edit-changes-requested'; props: EditChangesRequestedEmailProps }

export interface EditRejectionEmailProps {
  bipTitle: string
  bipSlug: string         // for dashboard link
  coordinatorName: string
  adminNote: string       // D-11: embed verbatim in email
  siteOrigin?: string
}

export interface EditChangesRequestedEmailProps {
  bipTitle: string
  bipSlug: string
  coordinatorName: string
  adminNote: string       // D-11: embed verbatim in email
  siteOrigin?: string
}
```

The exhaustive `never` check in `resolveSubject()` and the switch in `sendEmail()` will produce TypeScript compile errors until all 6 cases are handled, which ensures compile-time coverage of all email templates.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| ARCHITECTURE.md `published_snapshot` JSONB + `pending_edit` status | `bip_edits` separate table (D-01a) | `bips_select_approved_public` unchanged; no public read complexity; cleaner cascade |
| Single `bips` status machine | Dual status machines (`bips` + `bip_edits`) | Coordinator path and edit path are independent; approved BIP never goes offline |
| Admin approve/reject only (2 verdicts) | Admin approve/reject/request-changes (3 verdicts) | Third state requires `changes_requested` in both `bips` and `bip_edits` status CHECK |

---

## Open Questions

1. **Virtual start/end date in the diff view (UI-SPEC items 10 and 11)**
   - What we know: the `bips` schema (migration 00003) has NO `virtual_start_date` or `virtual_end_date` columns. The virtual component has `virtual_component_description`, `virtual_timing`, `virtual_sessions_count`, `virtual_duration_notes`.
   - What's unclear: the UI-SPEC Surface 3 lists "Virtual start date" (row 10) and "Virtual end date" (row 11) as diff fields.
   - Recommendation: Treat this as a UI-SPEC authoring error. Replace "Virtual start date" and "Virtual end date" with `virtual_timing` (timing relative to physical component) in the diff view. Alternatively, raise with user to confirm. The planner should confirm this before implementing `BipEditDiffView`.

2. **New-submission admin note storage (D-06a — explicitly delegated)**
   - What we know: CONTEXT.md D-06a explicitly delegates this to the planner.
   - Recommendation: Store in `bip_status_history.note` (consistent with existing rejection reason pattern). The coordinator dashboard queries `getLatestChangesRequest(bipId)` the same way it already queries `getLatestRejection(bipId)`.

3. **Admin edit-review URL structure**
   - What we know: D-08 specifies a unified queue with Edit badges. The review link from each card must go somewhere.
   - Recommendation: New route `/admin/bip-edits/[editId]/review` for edit items (separate from `/admin/bips/[id]/review` which handles new submissions). Clean separation, easier to pass edit-specific props to the review page.

4. **`bip_edits` audit trigger vs explicit Server Action inserts**
   - What we know: the existing pattern is trigger for coordinator transitions, Server Action for admin transitions. Pitfall 7 above identifies that coordinator `bip_edits` transitions (submit_edit, resubmit_edit) need a write path that bypasses the admin-only `bsh_insert_admin` RLS.
   - Recommendation: Add a SECURITY DEFINER trigger `log_bip_edit_status_change()` on `bip_edits` for coordinator transitions, mirroring the existing `bips` trigger. This is the safest and most consistent approach.

---

## Environment Availability

Step 2.6: SKIPPED for tool/library dependencies — no new external services or CLIs. All external dependencies (Supabase cloud, Resend) are already in use and confirmed available from prior phases. The `supabase db push --linked` + `supabase gen types --linked` workflow is established per project memory.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright (`@playwright/test`) — existing |
| Config file | `playwright.config.ts` |
| Quick run | `npx playwright test tests/e2e/bip-edits.spec.ts` |
| Full suite | `npm run build && npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EDIT-01 | Coordinator submits edit; `bip_edits` row created; public page unchanged | E2E (coordinator-authed) | `npx playwright test tests/e2e/bip-edits.spec.ts -g "submit edit"` | ❌ Wave 0 |
| EDIT-02 | `/bip/[slug]` serves original content while edit is pending | E2E (public) | `npx playwright test tests/e2e/bip-edits.spec.ts -g "public page unchanged"` | ❌ Wave 0 |
| EDIT-03 | Admin sees diff view with "Edit" badge and field comparison | E2E (admin-authed) | `npx playwright test tests/e2e/bip-edits.spec.ts -g "diff view"` | ❌ Wave 0 |
| EDIT-04 | Admin approves; merged content live on public page within seconds | E2E (admin-authed) | `npx playwright test tests/e2e/bip-edits.spec.ts -g "approve edit"` | ❌ Wave 0 |
| EDIT-05 | Admin rejects; live BIP unchanged | E2E (admin-authed) | `npx playwright test tests/e2e/bip-edits.spec.ts -g "reject edit"` | ❌ Wave 0 |
| EDIT-06 | Admin requests changes on pending BIP submission | E2E (admin-authed) | `npx playwright test tests/e2e/bip-edits.spec.ts -g "request changes new submission"` | ❌ Wave 0 |
| EDIT-06 | Admin requests changes on approved-BIP edit | E2E (admin-authed) | `npx playwright test tests/e2e/bip-edits.spec.ts -g "request changes edit"` | ❌ Wave 0 |
| EDIT-07 | Email D-15 console fallback fires for each outcome | E2E outcome-based (console log) | included in bip-edits.spec.ts tests | ❌ Wave 0 |
| EDIT-08 | `bip_status_history` gains correct action_kind row | E2E + DB assertion via service-role | included in bip-edits.spec.ts tests | ❌ Wave 0 |
| EDIT-09 | Slug unchanged after edit + approve; edit form omits slug field | E2E | `npx playwright test tests/e2e/bip-edits.spec.ts -g "slug immutable"` | ❌ Wave 0 |

### Playwright Project Wiring

The new `tests/e2e/bip-edits.spec.ts` spec needs two authed contexts:
- **coordinator-authed** project (existing) — for `submit edit`, `resubmit edit`, `public page unchanged`
- **admin-authed** project (existing) — for `diff view`, `approve edit`, `reject edit`, `request changes`

`playwright.config.ts` must extend the existing project `testMatch` patterns:
```typescript
// coordinator-authed:
testMatch: /(submission|resubmit|bip-edits)\.spec\.ts$/,
// admin-authed:
testMatch: /(admin-review|bip-edits)\.spec\.ts$/,
```

Since `bip-edits.spec.ts` needs both coordinator and admin contexts, it will need the multi-context pattern from `admin-review.spec.ts` test 3 (spawning a new browser context with a different `storageState`).

### Seed Data for E2E

`supabase/seed.e2e.sql` must gain:
- 1 approved BIP owned by `e2e-coordinator@biphub.test` (for the "submit edit" flow). Cannot reuse the existing seeded BIPs because the approve test in `admin-review.spec.ts` consumes "Machine Learning Foundations" (approved by that test, leaving the queue empty). The new BIP must be pre-seeded as `status='approved'`.
- Optionally: 1 pre-seeded `bip_edits` row in `status='pending'` linked to the approved BIP (so the "diff view" and "approve/reject edit" tests don't depend on the submit test running first).

### Wave 0 Gaps

- [ ] `tests/e2e/bip-edits.spec.ts` — covers EDIT-01 through EDIT-09
- [ ] Extend `playwright.config.ts` testMatch patterns to include `bip-edits.spec.ts`
- [ ] Extend `supabase/seed.e2e.sql` with approved BIP + optional pre-seeded `bip_edits` row
- [ ] Existing `tests/e2e/admin-review.spec.ts` may need the "Request Changes" button added to the existing review flow tests (EDIT-06 new-submission path)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | YES | RLS `USING` + `WITH CHECK`; coordinator cannot self-approve (`WITH CHECK status='pending'` on insert); admin-only verdicts |
| V5 Input Validation | YES | Zod v3 schemas; server-side safeParse on all Server Action inputs |
| V2 Authentication | YES (existing) | `getClaims()` (never `getSession()`); admin role check in every admin Server Action |
| V3 Session Management | YES (existing) | `await cookies()` in all Supabase server client factories |
| V6 Cryptography | NO | No new crypto surfaces |

### Threat Model for New Surfaces

| Threat | STRIDE | Mitigation |
|--------|--------|-----------|
| Coordinator self-approves own edit via direct RPC | EoP | `bip_edits_insert_own` WITH CHECK `status='pending'`; `bip_edits_update_own_resubmit` WITH CHECK `status='pending'` — cannot reach `approved` via coordinator policy |
| Coordinator submits edit for BIP they don't own | Spoofing | `bip_edits_insert_own` WITH CHECK `created_by = auth.uid()`; defense-in-depth read in `submitEditAction` |
| Coordinator injects `slug` in edit payload to change URL | Tampering | `bip_edits` has no `slug` column (EDIT-09 / D-10); merge action's `updatePayload` omits `slug` |
| Coordinator submits second concurrent edit (violates D-03) | Tampering | Partial unique index + application-layer guard in `submitEditAction` returns early if open edit exists |
| Admin note injection (XSS via email) | Information Disclosure | `@react-email` renders note as text content (not dangerouslySetInnerHTML); no HTML injection vector |
| Admin updates `bip_edits.created_by` to steal ownership | Tampering | `bip_edits_update_admin` WITH CHECK `role='admin'` only — admin cannot inject a non-admin `created_by` because the check is on role, not on the `created_by` field. Application-layer: admin Server Actions never write `created_by`. |
| Orphaned `bip_edits` rows after account deletion | Repudiation | FK `created_by references auth.users(id) on delete cascade` + `bip_id references bips(id) on delete cascade` |
| `requestChangesBipAction` called on non-pending BIP | Tampering | `validateTransition('pending', 'changes_requested', 'admin')` + RLS admin-only |

---

## Project Constraints (from CLAUDE.md)

| Constraint | Impact on Phase 8 |
|------------|------------------|
| `getClaims()` never `getSession()` server-side | All 5 new Server Actions must use `await supabase.auth.getClaims()` |
| `await cookies()` in all Supabase server client factories | No change — `createClient()` already handles this |
| Every new table `ENABLE ROW LEVEL SECURITY` | `bip_edits` must have RLS enabled (already in DDL above) |
| UPDATE policies need both `USING` and `WITH CHECK` | `bip_edits_update_own_resubmit` and `bip_edits_update_admin` must both have USING + WITH CHECK |
| `createAdminClient` only under `app/(admin)/` + `lib/supabase/admin.ts` | All new Server Actions in `lib/actions/` use `createClient` (anon key + JWT) — no service-role client needed |
| `revalidatePath()` in approve/reject (not webhooks) | `approveEditAction` must call revalidatePath for all 3 public paths |
| Never dynamic Tailwind class names | `changes_requested` badge class must be a literal string in `STATUS_BADGE_CLASSES` |
| `db push` to linked cloud project + `gen types --linked` | Each new migration applied via `npx supabase db push --linked`; types regenerated after |
| Zod v3 (NOT v4) | All new schemas use `z.object({...})` from `zod` v3 |
| `motion` from `motion/react` (NOT `framer-motion`) | Not directly relevant; no new animations in Phase 8 |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | UI-SPEC "Virtual start date" and "Virtual end date" are authoring errors — no such columns exist in the `bips` schema | Open Questions #1 | Planner builds diff rows for non-existent columns; runtime error or blank rows |
| A2 | `bip_status_history` INSERT by a coordinator in the edit flow is blocked by `bsh_insert_admin` RLS and needs a SECURITY DEFINER trigger or RPC | Architecture Patterns / Pitfall 7 | Edit audit rows silently fail to insert; EDIT-08 not satisfied |

---

## Sources

### Primary (HIGH confidence — verified against codebase)
- `supabase/migrations/00001_skeleton_bips_table.sql` — `bips.status` CHECK + `bips_select_approved_public` policy
- `supabase/migrations/00010_bip_status_history.sql` — `action_kind` CHECK + `log_bip_status_change()` trigger implementation
- `supabase/migrations/00011_bips_update_own_editable.sql` — coordinator UPDATE policy USING/WITH CHECK
- `supabase/migrations/00012_bips_update_to_pending.sql` — split-policy pattern for state transitions
- `supabase/migrations/00016_saved_bips.sql` — GDPR cascade FK pattern for new tables
- `lib/actions/admin-bips.ts` — complete 9-step Server Action pattern (getClaims → audit → revalidatePath → email → redirect)
- `lib/actions/bip-submit.ts` — coordinator submit pattern (defense-in-depth, partner reconciliation)
- `lib/actions/bip-revise.ts` — revise-rejected pattern (application-layer state guard)
- `lib/email/send.ts` — `EmailPayload` discriminated union + exhaustive-switch pattern
- `lib/utils/status.ts` — `BipStatus` type + `STATUS_BADGE_CLASSES` literal lookup
- `lib/utils/status-transitions.ts` — `ALLOWED_TRANSITIONS` + `validateTransition`
- `lib/queries/adminBips.ts` — `getAdminPendingBips` + `AdminBip` type
- `lib/queries/coordinatorBipById.ts` — `getCoordinatorBipById` status whitelist
- `components/admin/AdminActionsPanel.tsx` — existing 2-button panel props + structure
- `components/admin/RejectBipModal.tsx` — modal pattern (Zod/RHF, char counter, error Alert, confirm disabled until valid)
- `components/dashboard/DashboardBipCard.tsx` — gold left-border callout pattern for rejection reason
- `app/(admin)/admin/bips/[id]/review/page.tsx` — review page layout (2-column, RSC data fetching)
- `app/(admin)/admin/page.tsx` — queue page structure + empty state
- `playwright.config.ts` — Playwright project structure + testMatch patterns
- `.planning/config.json` — `nyquist_validation: true`

### Secondary (HIGH confidence — CONTEXT.md locked decisions)
- `08-CONTEXT.md` (D-01 through D-14) — all storage/behavior decisions
- `08-UI-SPEC.md` — Surface contracts, component inventory, copywriting

---

## Metadata

**Confidence breakdown:**
- `bip_edits` DDL: HIGH — derived directly from locked decisions + existing schema patterns
- RLS policies: HIGH — mirrors existing policies with established USING/WITH CHECK discipline
- Server Action patterns: HIGH — direct code inspection of existing actions
- Admin queue union query: HIGH — two separate queries merged in RSC (established Next.js 15 pattern)
- Email variants: HIGH — existing `send.ts` pattern is clear and extensible
- Diff view implementation: HIGH — pure render-time comparison, no new infra
- UI-SPEC virtual date discrepancy: MEDIUM — flagged as open question for user confirmation

**Research date:** 2026-06-26
**Valid until:** 2026-07-26 (stable stack; 30-day window)
