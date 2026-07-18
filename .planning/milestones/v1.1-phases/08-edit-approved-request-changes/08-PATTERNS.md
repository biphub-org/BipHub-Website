# Phase 8: Edit-Approved + Request-Changes — Pattern Map

**Mapped:** 2026-06-26
**Files analyzed:** 26 (14 new, 12 modified)
**Analogs found:** 24 / 26

---

## File Classification

| New / Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------------|------|-----------|----------------|---------------|
| `supabase/migrations/00017_bip_edits.sql` | migration | CRUD | `supabase/migrations/00016_saved_bips.sql` | exact |
| `supabase/migrations/00018_bips_changes_requested.sql` | migration | CRUD | `supabase/migrations/00011_bips_update_own_editable.sql` + `00012_bips_update_to_pending.sql` | exact |
| `supabase/migrations/00019_bip_status_history_edit_kinds.sql` | migration | CRUD | `supabase/migrations/00010_bip_status_history.sql` | exact |
| `lib/actions/bip-edits.ts` | server-action | CRUD | `lib/actions/bip-revise.ts` (resubmit) + `lib/actions/bip-submit.ts` (submit) | role-match |
| `lib/actions/admin-edit-bips.ts` | server-action | CRUD | `lib/actions/admin-bips.ts` | exact |
| `lib/queries/bipEdits.ts` | query | CRUD | `lib/queries/adminBips.ts` | role-match |
| `lib/schemas/bip-edits.ts` | schema | request-response | `lib/schemas/admin-bips.ts` | exact |
| `lib/email/templates/EditApprovalEmail.tsx` | email-template | request-response | `lib/email/templates/ApprovalEmail.tsx` | exact |
| `lib/email/templates/EditRejectionEmail.tsx` | email-template | request-response | `lib/email/templates/RejectionEmail.tsx` | exact |
| `lib/email/templates/EditChangesRequestedEmail.tsx` | email-template | request-response | `lib/email/templates/RejectionEmail.tsx` | exact |
| `components/admin/BipEditDiffView.tsx` | component | transform | _(no analog)_ | none |
| `components/admin/RequestChangesBipModal.tsx` | component | request-response | `components/admin/RejectBipModal.tsx` | exact |
| `components/dashboard/EditStatusCallout.tsx` | component | request-response | `components/dashboard/DashboardBipCard.tsx` (lines 79-100) | partial |
| `app/(admin)/admin/bip-edits/[editId]/review/page.tsx` | page/route | request-response | `app/(admin)/admin/bips/[id]/review/page.tsx` | exact |
| `tests/e2e/bip-edits.spec.ts` | test | request-response | `tests/e2e/admin-review.spec.ts` | exact |
| `lib/utils/status.ts` _(modify)_ | utility | transform | itself | — |
| `lib/utils/status-transitions.ts` _(modify)_ | utility | transform | itself | — |
| `lib/email/send.ts` _(modify)_ | utility | request-response | itself | — |
| `lib/queries/adminBips.ts` _(modify)_ | query | CRUD | itself | — |
| `lib/queries/coordinatorBipById.ts` _(modify)_ | query | CRUD | itself | — |
| `app/(admin)/admin/page.tsx` _(modify)_ | page/route | request-response | itself | — |
| `app/(admin)/admin/bips/[id]/review/page.tsx` _(modify)_ | page/route | request-response | itself | — |
| `app/(dashboard)/dashboard/bips/[id]/edit/page.tsx` _(modify)_ | page/route | request-response | itself | — |
| `components/admin/AdminActionsPanel.tsx` _(modify)_ | component | request-response | itself | — |
| `components/admin/AdminBipCard.tsx` _(modify)_ | component | request-response | itself | — |
| `components/admin/AdminBipRow.tsx` _(modify)_ | component | request-response | itself | — |

---

## Pattern Assignments

### `supabase/migrations/00017_bip_edits.sql` (migration, CRUD)

**Analog:** `supabase/migrations/00016_saved_bips.sql`

**File header comment pattern** (lines 1-18):
```sql
-- 00017_bip_edits.sql
-- Phase 8 (Edit-Approved + Request-Changes). Stores proposed-content edits for
-- already-approved BIPs pending admin re-review (EDIT-01/EDIT-02/D-01).
--
-- Decisions:
--   D-01/D-02 bip_edits table model; full proposed content; slug excluded (D-10).
--   D-03   Partial unique index: at most one open edit per BIP.
--   D-04   admin_note on same row; no separate reviews table.
--   D-14   ENABLE ROW LEVEL SECURITY; coordinator self-CRUD; admin select/update;
--          UPDATE policies with both USING and WITH CHECK (CLAUDE.md never-do).
--   FOUN-09 created_by references auth.users(id) ON DELETE CASCADE — GDPR/orphan-free.
```

**Table creation pattern** (from analog lines 19-24):
```sql
create table public.bip_edits (
  id           uuid primary key default gen_random_uuid(),
  bip_id       uuid not null references public.bips(id) on delete cascade,
  created_by   uuid references auth.users(id) on delete cascade,  -- FOUN-09; NOT profiles
  ...
);
```

Key difference from `saved_bips`: `created_by` intentionally references `auth.users` (not `profiles`) for direct GDPR cascade on `delete_my_account()`. See 08-RESEARCH.md Pitfall 11.

**RLS enable pattern** (analog line 27):
```sql
alter table public.bip_edits enable row level security;
```

**Own-data select policy pattern** (analog lines 32-35):
```sql
create policy "bip_edits_select_own"
  on public.bip_edits for select
  to authenticated
  using ((select auth.uid()) = created_by);
```

**Own-data insert policy pattern** (analog lines 37-40):
```sql
create policy "bip_edits_insert_own"
  on public.bip_edits for insert
  to authenticated
  with check (
    (select auth.uid()) = created_by
    and status = 'pending'   -- coordinator cannot self-approve (D-14 / T-03-02 analog)
  );
```

**Admin select policy pattern** (analog lines 47-50):
```sql
create policy "bip_edits_select_admin"
  on public.bip_edits for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
```

**UPDATE with both USING and WITH CHECK — coordinator resubmit** (08-RESEARCH.md DDL, derived from `00011_bips_update_own_editable.sql` lines 15-25):
```sql
-- CLAUDE.md never-do: UPDATE policies MUST have both USING and WITH CHECK.
create policy "bip_edits_update_own_resubmit"
  on public.bip_edits for update
  to authenticated
  using (
    (select auth.uid()) = created_by
    and status = 'changes_requested'   -- only editable in this state (USING = pre-image)
  )
  with check (
    (select auth.uid()) = created_by
    and status = 'pending'             -- post-image must be pending; blocks self-approve
  );
```

**Partial unique index for one-open-edit constraint** (D-03):
```sql
create unique index bip_edits_one_open_per_bip
  on public.bip_edits (bip_id)
  where status in ('pending', 'changes_requested');
```

**Performance indexes pattern** (analog lines 29-30):
```sql
create index bip_edits_bip_id_idx on public.bip_edits (bip_id);
create index bip_edits_created_by_idx on public.bip_edits (created_by);
create index bip_edits_status_created_at_idx on public.bip_edits (status, created_at);
```

---

### `supabase/migrations/00018_bips_changes_requested.sql` (migration, CRUD)

**Analog:** `supabase/migrations/00011_bips_update_own_editable.sql` + `00012_bips_update_to_pending.sql`

**Split-policy pattern for `changes_requested → pending`** (mirrors `00012` lines 1-24):
```sql
-- 00018_bips_changes_requested.sql
-- Extends bips.status CHECK with 'changes_requested' (D-06a) and adds
-- coordinator policy for the changes_requested → pending resubmit transition.
-- Mirrors the bips_update_own_to_pending pattern from 00012.
--
-- Also extends the log_bip_status_change() trigger to handle the new
-- pending → changes_requested transition (admin-initiated; trigger returns
-- early per Option B — Server Action writes the explicit audit row with note).

-- Step 1: extend bips.status CHECK
-- (Must add 'changes_requested' to the existing constraint in 00001.)
alter table public.bips
  drop constraint if exists bips_status_check,
  add constraint bips_status_check
    check (status in ('draft', 'pending', 'approved', 'rejected', 'changes_requested'));

-- Step 2: coordinator policy for changes_requested → pending (D-06a resubmit)
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

**Trigger extension pattern** (mirrors existing `if/elsif` chain in `00010` lines 82-95):
```sql
-- Step 3: extend log_bip_status_change() for new bips transitions
create or replace function public.log_bip_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action_kind text;
begin
  if (tg_op = 'INSERT' and new.status is not null) then
    ...  -- existing unchanged
  elsif (tg_op = 'UPDATE' and old.status is distinct from new.status) then
    if (old.status = 'draft' and new.status = 'pending') then
      v_action_kind := 'submit';
    elsif (old.status = 'rejected' and new.status = 'draft') then
      v_action_kind := 'resubmit';
    elsif (old.status = 'pending' and new.status = 'draft') then
      v_action_kind := 'withdraw';
    -- Phase 8 additions:
    elsif (old.status = 'pending' and new.status = 'changes_requested') then
      return new;  -- Option B: Server Action writes explicit audit row with note
    elsif (old.status = 'changes_requested' and new.status = 'pending') then
      v_action_kind := 'resubmit';  -- coordinator resubmit after changes requested
    else
      return new;  -- admin transitions logged by Server Action
    end if;
  else
    return new;
  end if;
  insert into public.bip_status_history
    (bip_id, from_status, to_status, actor_id, action_kind)
  values
    (new.id, old.status, new.status, (select auth.uid()), v_action_kind);
  return new;
end;
$$;
```

---

### `supabase/migrations/00019_bip_status_history_edit_kinds.sql` (migration, schema extension)

**Analog:** `supabase/migrations/00010_bip_status_history.sql` (lines 22-26, action_kind CHECK)

**Current CHECK** (analog lines 22-26):
```sql
action_kind text not null check (
  action_kind in ('submit','approve','reject','resubmit','admin_edit','withdraw')
),
```

**Extended CHECK** (08-RESEARCH.md §2, with exact names from D-12):
```sql
-- 00019_bip_status_history_edit_kinds.sql
-- Extends bip_status_history.action_kind CHECK with Phase 8 edit kinds (D-12).
alter table public.bip_status_history
  drop constraint if exists bip_status_history_action_kind_check,
  add constraint bip_status_history_action_kind_check
    check (action_kind in (
      'submit', 'approve', 'reject', 'resubmit', 'admin_edit', 'withdraw',
      -- Phase 8:
      'submit_edit',     -- coordinator submits edit for approved BIP
      'resubmit_edit',   -- coordinator resubmits after changes_requested on bip_edits
      'approve_edit',    -- admin approves edit (merge occurs)
      'reject_edit',     -- admin rejects edit
      'request_changes'  -- admin requests changes on new submission OR edit
    ));
```

**SECURITY DEFINER trigger for `bip_edits`** (mirrors `log_bip_status_change` pattern from analog lines 66-111):
```sql
-- Separate trigger for bip_edits coordinator transitions (Pitfall 7 / Option A).
-- Handles 'submit_edit' and 'resubmit_edit'; admin transitions logged explicitly
-- by Server Actions (same split as the bips trigger).
create or replace function public.log_bip_edit_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action_kind text;
begin
  if (tg_op = 'INSERT' and new.status = 'pending') then
    v_action_kind := 'submit_edit';
  elsif (tg_op = 'UPDATE' and old.status is distinct from new.status) then
    if (old.status = 'changes_requested' and new.status = 'pending') then
      v_action_kind := 'resubmit_edit';
    else
      return new;  -- admin transitions logged by Server Action
    end if;
  else
    return new;
  end if;
  insert into public.bip_status_history
    (bip_id, from_status, to_status, actor_id, action_kind)
  values
    (new.bip_id,
     case when tg_op = 'UPDATE' then old.status else null end,
     new.status,
     (select auth.uid()),
     v_action_kind);
  return new;
end;
$$;

create trigger bip_edits_status_change_audit
  after insert or update of status on public.bip_edits
  for each row
  execute function public.log_bip_edit_status_change();

revoke execute on function public.log_bip_edit_status_change() from public, anon, authenticated;
```

---

### `lib/actions/bip-edits.ts` (server-action, coordinator, CRUD)

**Analog:** `lib/actions/bip-revise.ts` (resubmit pattern) + `lib/actions/bip-submit.ts` (submit + partner reconciliation)

**File header** (mirrors analog `bip-revise.ts` lines 1-27):
```typescript
'use server'

/**
 * Coordinator BIP-edit Server Actions (Phase 8 EDIT-01).
 *
 *   - submitEditAction(bipId, draft, partners) — create bip_edits row
 *   - resubmitEditAction(editId, draft, partners) — update existing bip_edits row
 *
 * Authorization: getClaims() + ownership check + BIP must be 'approved' (D-09).
 * No revalidatePath — the public page is deliberately untouched (D-01/EDIT-02).
 *
 * Auth: getClaims() — NEVER getSession (CLAUDE.md never-do).
 * Client: createClient (anon-key + coordinator JWT) — never createAdminClient.
 */
```

**Auth guard pattern** (mirrors `bip-revise.ts` lines 38-43):
```typescript
const supabase = await createClient()
const { data: claimsData, error: authError } = await supabase.auth.getClaims()
if (authError || !claimsData?.claims?.sub) {
  return { error: 'Your session has expired. Please sign in again.' }
}
const userId = claimsData.claims.sub
```

**Defense-in-depth read-back + ownership check** (mirrors `bip-revise.ts` lines 46-55):
```typescript
const { data: bip } = await supabase
  .from('bips')
  .select('id, status, created_by, slug')
  .eq('id', bipId)
  .maybeSingle()
if (!bip) return { error: 'BIP not found.' }
if (bip.created_by !== userId) return { error: 'You do not have permission to edit this BIP.' }
if (bip.status !== 'approved') return { error: 'Only approved BIPs can have edits submitted.' }
```

**One-open-edit guard** (D-03, application-layer, from 08-RESEARCH.md §submitEditAction):
```typescript
const { data: existingEdit } = await supabase
  .from('bip_edits')
  .select('id, status')
  .eq('bip_id', bipId)
  .in('status', ['pending', 'changes_requested'])
  .maybeSingle()
if (existingEdit?.status === 'pending') {
  return { error: 'An edit is already under review.' }
}
```

**INSERT pattern — no redirect on success** (coordinator action returns `{ success: true }` not `redirect()`; mirrors result type from `bip-revise.ts` line 32):
```typescript
export type EditActionResult = { success: true; editId: string } | { error: string }
```

**Partner reconciliation for resubmit** (mirrors `admin-bips.ts` lines 402-437 — delete-then-insert):
```typescript
// For resubmitEditAction: update bip_edits content fields + clear and re-insert
// partner_institutions JSONB (bip_edits stores partners as JSONB, not a join table).
await supabase
  .from('bip_edits')
  .update({
    status: 'pending',
    ...contentFields,  // all editable fields except slug (D-10)
    partner_institutions: JSON.stringify(partners),
    updated_at: new Date().toISOString(),
  })
  .eq('id', editId)
  .eq('created_by', userId)
  .eq('status', 'changes_requested')  // idempotency guard
```

---

### `lib/actions/admin-edit-bips.ts` (server-action, admin, CRUD)

**Analog:** `lib/actions/admin-bips.ts` — exact mirror of the 9-step pattern

**File header** (mirrors analog lines 1-25):
```typescript
'use server'

/**
 * Admin BIP-edit Server Actions (Phase 8 EDIT-03/04/05/06).
 *
 *   - approveEditAction(editId)            — merge bip_edits → bips + revalidatePath
 *   - rejectEditAction(editId, note)       — mark edit rejected; bips unchanged
 *   - requestChangesEditAction(editId, note) — mark edit changes_requested + admin_note
 *
 * 9-step sequence (mirrors admin-bips.ts D-11):
 *   1. getClaims() + role=admin check
 *   2. Zod safeParse
 *   3. Read existing bip_edits row (+ parent bips row for slug/coordinator)
 *   4. Inline transition check (validateEditTransition)
 *   5. UPDATE bip_edits (+ UPDATE bips for approve-edit only)
 *   6. INSERT bip_status_history (explicit — trigger won't fire for admin transitions)
 *   7. revalidatePath (approveEditAction only — D-13)
 *   8. sendEmail (fire-and-forget try/catch)
 *   9. redirect to next pending or /admin
 */
```

**Steps 1-4 boilerplate** (copy from `admin-bips.ts` lines 52-85):
```typescript
// 1. Auth + role guard
const supabase = await createClient()
const { data: authData, error: authError } = await supabase.auth.getClaims()
const claims = authData?.claims ?? null
if (authError || !claims?.sub) {
  return { error: 'Your session has expired. Please sign in again.' }
}
const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
if (role !== 'admin') return { error: 'Forbidden.' }

// 2. Zod validate
const parsed = ApproveEditSchema.safeParse({ editId })
if (!parsed.success) {
  return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
}

// 3. Read bip_edits + parent bips row (needed for coordinator email + slug + ISR)
const { data: editRow } = await supabase
  .from('bip_edits')
  .select('id, bip_id, status, created_by, ...all content fields...')
  .eq('id', parsed.data.editId)
  .maybeSingle()
if (!editRow) return { error: 'Edit not found.' }

const { data: bip } = await supabase
  .from('bips')
  .select('id, slug, title, status, profiles!created_by ( contact_email, full_name )')
  .eq('id', editRow.bip_id)
  .maybeSingle()
if (!bip) return { error: 'Parent BIP not found.' }

// 4. Inline transition check
if (editRow.status !== 'pending') {
  return { error: `Cannot approve from status ${editRow.status}.` }
}
```

**Step 6 — Audit log insert** (copy from `admin-bips.ts` lines 101-116, changing action_kind):
```typescript
// 6. Audit log — explicit insert (trigger does NOT fire for admin transitions)
const { error: auditError } = await supabase
  .from('bip_status_history')
  .insert({
    bip_id: editRow.bip_id,
    from_status: editRow.status,
    to_status: 'approved',      // or 'rejected' / 'changes_requested'
    actor_id: claims.sub,
    note: null,                 // or parsed.data.note for request_changes / reject_edit
    action_kind: 'approve_edit', // or 'reject_edit' / 'request_changes'
  })
if (auditError) {
  console.error('[approveEditAction] audit insert failed:', auditError.message)
}
```

**Step 7 — ISR bust for approve-edit** (D-13; extends `admin-bips.ts` lines 118-121):
```typescript
// 7. ISR cache bust (approve-edit only; reject-edit/request-changes skip this)
revalidatePath(`/bip/${bip.slug}`)
revalidatePath('/bips')
revalidatePath('/admin')
```

**Step 8 — Fire-and-forget email** (copy from `admin-bips.ts` lines 124-148):
```typescript
// 8. Email send (fire-and-forget per D-11)
const profilesRaw = (bip as { profiles?: unknown }).profiles
const profiles = Array.isArray(profilesRaw)
  ? (profilesRaw[0] as { contact_email?: string | null; full_name?: string | null } | undefined)
  : (profilesRaw as { contact_email?: string | null; full_name?: string | null } | undefined)
const coordinatorEmail = profiles?.contact_email ?? null
if (coordinatorEmail) {
  try {
    await sendEmail(coordinatorEmail, {
      template: 'edit-approved',  // or 'edit-rejected' / 'edit-changes-requested'
      props: {
        bipTitle: bip.title,
        bipSlug: bip.slug,
        coordinatorName: profiles?.full_name ?? '',
        // adminNote: parsed.data.note,  // for reject_edit + request_changes only
      },
    })
  } catch (err) {
    console.error('[approveEditAction] email send failed (non-blocking):', err)
  }
}
```

**Step 9 — Auto-advance** (copy from `admin-bips.ts` lines 151-156):
```typescript
// 9. Auto-advance to next pending item (D-05 equivalent)
const next = await getNextPendingBip(bip.id)   // may need new getNextPendingItem() that covers bip_edits too
if (next) redirect(`/admin/bips/${next.id}/review`)
redirect('/admin')
```

**Merge payload construction** (from `adminUpdateBipAction` lines 357-385, slug intentionally omitted):
```typescript
// approveEditAction step 5: copy all bip_edits content fields → bips
const mergePayload = {
  title: editRow.title,
  isced_f_code: editRow.isced_f_code,
  description: editRow.description,
  learning_outcomes: editRow.learning_outcomes,
  virtual_component_description: editRow.virtual_component_description,
  virtual_timing: editRow.virtual_timing,
  host_city: editRow.host_city,
  physical_start_date: editRow.physical_start_date,
  physical_end_date: editRow.physical_end_date,
  application_deadline: editRow.application_deadline,
  ects_credits: editRow.ects_credits,
  max_participants: editRow.max_participants,
  study_levels: editRow.study_levels,
  language_of_instruction: editRow.language_of_instruction,
  language_level_min: editRow.language_level_min,
  green_travel: editRow.green_travel,
  inclusion_support: editRow.inclusion_support,
  eligibility_notes: editRow.eligibility_notes,
  how_to_apply_type: editRow.how_to_apply_type,
  how_to_apply_value: editRow.how_to_apply_value,
  contact_name: editRow.contact_name,
  contact_email: editRow.contact_email,
  updated_at: new Date().toISOString(),
  // NOTE: slug intentionally omitted (D-10 / EDIT-09)
  // NOTE: status intentionally omitted — bips.status stays 'approved'
}
```

---

### `lib/queries/bipEdits.ts` (query, CRUD)

**Analog:** `lib/queries/adminBips.ts`

**Auth guard pattern** (analog lines 112-116):
```typescript
export async function getOpenEditForBip(bipId: string): Promise<BipEditRow | null> {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getClaims()
  const claims = authData?.claims ?? null
  if (authError || !claims?.sub) return null
  ...
}
```

**Role guard pattern** (analog lines 150-157):
```typescript
const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
if (role !== 'admin') return null
```

**Union query shape** (from 08-RESEARCH.md §8):
```typescript
export type AdminQueueItem =
  | { kind: 'submission'; bip: AdminBip }
  | { kind: 'edit'; edit: AdminBipEditItem; bip: AdminBip }

export async function getAdminPendingSubmissions(): Promise<AdminBip[]>
export async function getAdminPendingEdits(): Promise<AdminBipEditItem[]>
```

**Pending submissions query** (mirrors `getAdminPendingBips` analog lines 112-129, extended to include `changes_requested`):
```typescript
export async function getAdminPendingSubmissions(): Promise<AdminBip[]> {
  ...
  const { data, error } = await supabase
    .from('bips')
    .select(ADMIN_BIP_SELECT)
    .in('status', ['pending', 'changes_requested'])  // Phase 8: adds changes_requested
    .order('created_at', { ascending: true })
  ...
}
```

**`getCoordinatorBipById` extended return type** (from 08-RESEARCH.md §9 — extend analog `coordinatorBipById.ts` lines 30-36):
```typescript
export type CoordinatorBipForEdit = {
  id: string
  data: BipDraftData
  updatedAt: string
  hostUniversity: { id: string; name: string; country: string } | null
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'changes_requested'
  openEdit?: {
    id: string
    status: 'pending' | 'changes_requested'
    admin_note: string | null
    data: BipDraftData   // proposed content — pre-fills the edit form
  } | null
} | null
```

**Status whitelist extension** (modify `coordinatorBipById.ts` line 71):
```typescript
// Before (line 71):
if (data.status !== 'draft' && data.status !== 'pending') return null

// After (Phase 8):
if (!['draft', 'pending', 'approved', 'changes_requested'].includes(data.status)) return null
```

---

### `lib/schemas/bip-edits.ts` (schema, request-response)

**Analog:** `lib/schemas/admin-bips.ts`

**File structure pattern** (analog lines 1-25):
```typescript
/**
 * Zod v3 schemas for Phase 8 bip-edits Server Action inputs.
 * Used for both client-side RHF validation (via zodResolver) and
 * server-side re-validation inside the edit Server Actions.
 * Source: 08-CONTEXT.md D-03, D-04, D-10.
 */
import { z } from 'zod'  // Zod v3 — see CLAUDE.md (locked stack)

export const ApproveEditSchema = z.object({
  editId: z.string().uuid({ message: 'Invalid edit id.' }),
})
export type ApproveEditInput = z.infer<typeof ApproveEditSchema>

export const RejectEditSchema = z.object({
  editId: z.string().uuid({ message: 'Invalid edit id.' }),
  note: z.string()
    .min(10, 'Note must be at least 10 characters.')
    .max(1000, 'Note must be at most 1000 characters.'),
})
export type RejectEditInput = z.infer<typeof RejectEditSchema>

export const RequestChangesEditSchema = z.object({
  editId: z.string().uuid({ message: 'Invalid edit id.' }),
  note: z.string()
    .min(10, 'Note must be at least 10 characters.')
    .max(1000, 'Note must be at most 1000 characters.'),
})
export type RequestChangesEditInput = z.infer<typeof RequestChangesEditSchema>
```

**New-submission request-changes schema** (mirrors `RejectBipSchema` analog lines 18-25 with `bipId` + `note`):
```typescript
// For requestChangesBipAction (new-submission path — D-06a)
export const RequestChangesBipSchema = z.object({
  bipId: z.string().uuid({ message: 'Invalid BIP id.' }),
  note: z.string()
    .min(10, 'Note must be at least 10 characters.')
    .max(1000, 'Note must be at most 1000 characters.'),
})
export type RequestChangesBipInput = z.infer<typeof RequestChangesBipSchema>
```

---

### `lib/email/templates/EditApprovalEmail.tsx` (email-template, request-response)

**Analog:** `lib/email/templates/ApprovalEmail.tsx`

**Imports block** (analog lines 12-23):
```typescript
import {
  Html, Head, Body, Container, Section, Text, Heading, Button, Hr, Preview,
} from '@react-email/components'
import { EMAIL_TOKENS as T } from '../tokens'
```

**Props interface** (mirrors `ApprovalEmailProps` analog lines 25-31, adjusted copy):
```typescript
export interface EditApprovalEmailProps {
  bipTitle: string
  bipSlug: string        // for the "View your BIP" CTA
  coordinatorName: string
  /** Overrideable for tests; defaults to https://biphub.eu */
  siteOrigin?: string
}
```

**Preview text** (different from base approval; signals it's an edit being live):
```typescript
<Preview>Your BIP edit is live on BipHub</Preview>
```

**H1 copy** (different body copy from `ApprovalEmail`):
```typescript
Your BIP edit is live on BipHub
```

**Body copy** (mirrors structure at analog lines 100-113):
```typescript
Your edit to <strong>&ldquo;{bipTitle}&rdquo;</strong> has been approved and the updated version is now live.
```

**No optional note block** — `EditApprovalEmail` has no optional note (unlike `ApprovalEmail`). The approval is clean/final.

**EC disclaimer footer** (MANDATORY — analog lines 181-183):
```typescript
<Text style={{ fontSize: '12px', color: T.muted, margin: 0 }}>
  Independent project — not affiliated with the European Commission
</Text>
```

---

### `lib/email/templates/EditRejectionEmail.tsx` (email-template, request-response)

**Analog:** `lib/email/templates/RejectionEmail.tsx`

**Props interface** (extends analog `RejectionEmailProps` lines 26-38 with `adminNote` instead of `reason`):
```typescript
export interface EditRejectionEmailProps {
  bipTitle: string
  bipSlug: string        // for "view dashboard" CTA — approved BIP stays live
  coordinatorName: string
  adminNote: string      // D-11: embed verbatim; whiteSpace: 'pre-wrap' (T-03-06)
  siteOrigin?: string
}
```

**Required note callout** (copy from analog `RejectionEmail.tsx` lines 123-155, relabeled):
```typescript
{/* Admin note callout — gold left border per UI-SPEC; renders verbatim */}
<Section style={{
  borderLeft: `4px solid ${T.euGold}`,
  paddingLeft: '12px',
  margin: `${T.gap} 0`,
  backgroundColor: T.bgSoft,
  padding: '12px 16px',
  borderRadius: '0 6px 6px 0',
}}>
  <Text style={{ fontSize: T.smallSize, fontWeight: T.semiboldWeight, color: T.ink2, margin: 0 }}>
    Reviewer feedback
  </Text>
  <Text style={{
    fontSize: T.bodySize, color: T.ink, lineHeight: T.bodyLineHeight,
    marginTop: '4px', whiteSpace: 'pre-wrap',
  }}>
    {adminNote}
  </Text>
</Section>
```

**CTA URL** — links to `/dashboard/bips/${bipSlug}/edit` (the approved BIP stays live; coordinator can review the rejection note on the edit form):
```typescript
const dashboardUrl = `${siteOrigin}/dashboard/bips/${bipSlug}/edit`
```

---

### `lib/email/templates/EditChangesRequestedEmail.tsx` (email-template, request-response)

**Analog:** `lib/email/templates/RejectionEmail.tsx` — structurally identical with amber/amber messaging

**Props interface** (mirrors `EditRejectionEmailProps` with amber framing):
```typescript
export interface EditChangesRequestedEmailProps {
  bipTitle: string
  bipSlug: string
  coordinatorName: string
  adminNote: string      // D-11: embed verbatim; same callout as rejection
  siteOrigin?: string
}
```

**Key difference from `EditRejectionEmail`:**
- H1: `"Changes requested on your BIP edit"`
- Body: `"Your edit to &ldquo;{bipTitle}&rdquo; requires changes before it can go live."`
- CTA label: `"Review and resubmit →"`
- CTA URL: same as rejection — `/dashboard/bips/${bipSlug}/edit`
- Note callout label: `"Changes requested"` (instead of `"Reviewer feedback"`)

All structural patterns (note callout, footer disclaimer, token usage) copy directly from `RejectionEmail.tsx`.

---

### `components/admin/RequestChangesBipModal.tsx` (component, request-response)

**Analog:** `components/admin/RejectBipModal.tsx`

**Directive + imports block** (analog lines 1-41 — copy all imports, swap action import):
```typescript
'use client'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter,
         DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
// Swap: import the appropriate schema (RequestChangesEditSchema or RequestChangesBipSchema)
// and the appropriate Server Action (requestChangesEditAction or requestChangesBipAction).
```

**Props interface** (extend analog lines 42-48 — same fields, rename `reason` → `note`):
```typescript
interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  bipId: string        // or editId depending on context
  bipTitle: string
  coordinatorName: string
  isEdit?: boolean     // false → new submission path; true → bip_edits path
}
```

**Form setup** (analog lines 59-65 — copy, swap schema):
```typescript
const form = useForm<RequestChangesEditInput>({
  resolver: zodResolver(RequestChangesEditSchema),
  mode: 'onChange',
  defaultValues: { editId, note: '' },  // or bipId for new-submission path
})
const noteValue = form.watch('note') ?? ''
```

**handleConfirm pattern** (analog lines 68-83 — copy, swap action call):
```typescript
function handleConfirm(data: RequestChangesEditInput) {
  setServerError(null)
  startTransition(async () => {
    const result = await requestChangesEditAction(data.editId, data.note)
    // requestChangesEditAction redirects on success; only reach here on { error }
    if (result?.error) {
      setServerError(result.error)
      return
    }
    toast.success(`Changes requested. ${coordinatorName || 'Coordinator'} will be notified.`)
    onOpenChange(false)
  })
}
```

**Dialog title + BIP callout** (analog lines 88-100 — amber styling difference per UI-SPEC Surface 5):
```typescript
<DialogTitle className="text-[22px] font-semibold text-ink">
  Request Changes
</DialogTitle>
<DialogDescription className="text-sm text-muted">
  You&apos;re about to request changes to:
</DialogDescription>
...
{/* BIP callout: gold border instead of red (amber framing) */}
<div className="bg-bg-soft border-l-4 border-eu-gold rounded-r px-4 py-3 mb-4">
  <p className="text-sm font-semibold text-ink">{bipTitle || 'Untitled BIP'}</p>
</div>
```

**Textarea** (analog lines 114-121 — same structure, different placeholder):
```typescript
<Textarea
  id="request-changes-note"
  rows={4}
  maxLength={1000}
  {...form.register('note')}
  placeholder="Explain clearly what needs to change. The coordinator will see this note on their dashboard and in their email — be specific about what to revise."
  aria-invalid={!!noteError}
/>
```

**Confirm button** (analog lines 152-163 — amber instead of red per UI-SPEC Surface 5):
```typescript
<Button
  type="submit"
  disabled={isPending || !form.formState.isValid}
  className="bg-status-pending text-white hover:bg-amber-700 rounded-pill px-5 py-2 font-semibold"
>
  {isPending ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
      Requesting…
    </>
  ) : 'Request Changes'}
</Button>
```

**Context line below note** (additional vs. RejectBipModal):
```typescript
<p className="text-sm text-muted">
  This note will appear on the coordinator&apos;s dashboard and in the notification email.
</p>
```

---

### `components/dashboard/EditStatusCallout.tsx` (component, request-response)

**Analog:** `components/dashboard/DashboardBipCard.tsx` (lines 79-100 — rejected reason callout)

**Analog callout pattern** (`DashboardBipCard.tsx` lines 79-100):
```typescript
{bip.status === 'rejected' && (
  <div className="mt-3 border-l-4 border-eu-gold bg-eu-gold/5 rounded-r px-3 py-2">
    ...rejected reason content...
  </div>
)}
```

**Component shape** (`'use client'` per UI-SPEC Component Inventory):
```typescript
'use client'
interface Props {
  status: 'approved' | 'pending' | 'changes_requested'  // the openEdit status or BIP status
  adminNote?: string | null   // for changes_requested state
}
export function EditStatusCallout({ status, adminNote }: Props)
```

**State A — `approved`, no open edit** (UI-SPEC Surface 1 State A):
```typescript
// Blue border callout — no left-border-4; uses border + bg-eu-blue-50
<div className="rounded-md border border-eu-blue-100 bg-eu-blue-50 px-4 py-3 mb-6 flex items-start gap-2">
  <CheckCircle2 size={16} className="text-status-approved mt-0.5 flex-shrink-0" aria-hidden />
  <p className="text-sm text-ink">
    This BIP is live. Submit an edit to propose changes — the public page stays unchanged until an admin approves.
  </p>
</div>
```

**State B — open edit in `pending`** (UI-SPEC Surface 1 State B):
```typescript
// Amber border callout
<div className="rounded-md border border-status-pending bg-status-pending-bg px-4 py-3 mb-6 flex items-start gap-2">
  <Clock size={16} className="text-status-pending mt-0.5 flex-shrink-0" aria-hidden />
  <p className="text-sm text-ink">
    Your edit is under review. You can update fields below, but resubmission isn&apos;t available until the admin responds.
  </p>
</div>
```

**State C — open edit in `changes_requested`** (mirrors analog DashboardBipCard gold left-border pattern):
```typescript
// Gold left-border callout (matches rejected-reason callout visual language per UI-SPEC)
<div className="rounded-r border-l-4 border-eu-gold bg-eu-gold/5 px-4 py-3 mb-6">
  <p className="text-sm font-semibold text-ink mb-1">Changes requested</p>
  <p className="text-sm text-ink-2 mb-2">{adminNote}</p>
  <p className="text-xs text-muted">Update your submission below, then resubmit for review.</p>
</div>
```

---

### `app/(admin)/admin/bip-edits/[editId]/review/page.tsx` (page/route, request-response)

**Analog:** `app/(admin)/admin/bips/[id]/review/page.tsx`

**File structure** (copy analog lines 1-90 verbatim, replacing bip-specific calls):
```typescript
export const dynamic = 'force-dynamic'   // analog line 28

// RSC data fetching pattern (analog lines 47-55):
export default async function ReviewBipEditPage(props: {
  params: Promise<{ editId: string }>
}) {
  const { editId } = await props.params
  const [editRow, bip, coordinator] = await Promise.all([
    getBipEditById(editId),          // new query — analog: getAdminBipById
    ...
  ])
  if (!editRow) notFound()
```

**Two-column layout** (copy analog lines 61-88):
```typescript
<div className="max-w-[1200px] mx-auto px-6 py-6">
  {/* Breadcrumb row — analog lines 63-69 */}
  <div className="bg-white border border-border rounded-md px-4 py-3 mb-4 flex items-center justify-between">
    <Link href="/admin" className="text-sm text-eu-blue hover:underline">
      ← Back to queue
    </Link>
  </div>

  <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-x-8">
    <div>
      {/* Phase 8 addition: BipEditDiffView renders above BipBody */}
      <BipEditDiffView liveBip={bip} proposedEdit={editRow} />
      <BipHeader bip={bip} />
      <BipBody bip={bip} />
    </div>
    <div className="flex flex-col gap-4">
      <BipSidebar bip={bip} mode="admin-review" />
      <AdminActionsPanel
        bipId={bip.id}
        bipTitle={bip.title}
        coordinatorName={coordinatorName}
        currentStatus={bip.status as BipStatus}
        nextPendingId={null}
        isEdit={true}       // Phase 8 addition
        editId={editRow.id} // Phase 8 addition
      />
    </div>
  </div>
</div>
```

---

### `tests/e2e/bip-edits.spec.ts` (test, request-response)

**Analog:** `tests/e2e/admin-review.spec.ts`

**File header + multi-context pattern** (analog lines 1-27):
```typescript
/**
 * BIP-edit golden-path spec — Phase 8 EDIT-01 through EDIT-09.
 *
 * Two authed contexts:
 *   - coordinator-authed: submit edit, resubmit edit, public-page-unchanged
 *   - admin-authed: diff view, approve/reject/request-changes edit
 *
 * D-15 assertion: console-log fallback + outcome assertion pattern
 * (same as admin-review.spec.ts — Server Action logs go to server stdout).
 */
import { test, expect } from '@playwright/test'
```

**Console log capture + outcome assertion** (analog lines 29-75 — copy the pattern):
```typescript
test('coordinator submits edit for approved BIP', async ({ page }) => {
  const consoleMessages: string[] = []
  page.on('console', (msg) => consoleMessages.push(msg.text()))

  await page.goto('/dashboard/bips/[pre-seeded-approved-bip-id]/edit')
  // Assert "Submit Edit for Review" button is present (State A)
  await expect(page.getByRole('button', { name: /submit edit for review/i })).toBeVisible()
  // Fill a field, click CTA
  // Assert toast: "Edit submitted for review..."
  // Assert form transitions to State B (disabled "Edit in review" button)
})
```

**Admin approve-edit test** (mirrors analog lines 29-76):
```typescript
test('admin approves edit; merged content live on public page', async ({ page }) => {
  await page.goto('/admin')
  // Find the "Edit" badged card (bip_edits item)
  const editCard = page.locator('article', { hasText: /Edit/i })
  await editCard.getByRole('link', { name: /review/i }).click()
  await expect(page).toHaveURL(/\/admin\/bip-edits\/.+\/review/)
  // Assert diff view is visible
  await expect(page.getByText('Field Comparison')).toBeVisible()
  // Click "Approve Edit"
  await page.getByRole('button', { name: /^approve edit$/i }).click()
  // Confirm in modal
  await page.getByRole('button', { name: /^approve edit$/i }).last().click()
  await page.waitForURL(/\/admin/)
  // Outcome: merged content appears on public page
})
```

---

## Existing Files — Modification Patterns

### `lib/email/send.ts` — extend `EmailPayload` union

**Current union** (lines 33-36):
```typescript
export type EmailPayload =
  | { template: 'approval'; props: ApprovalEmailProps }
  | { template: 'rejection'; props: RejectionEmailProps }
  | { template: 'admin-notification'; props: AdminNotificationEmailProps }
```

**Extended union** (add 3 variants — exhaustive-switch enforces compile-time coverage):
```typescript
export type EmailPayload =
  | { template: 'approval'; props: ApprovalEmailProps }
  | { template: 'rejection'; props: RejectionEmailProps }
  | { template: 'admin-notification'; props: AdminNotificationEmailProps }
  | { template: 'edit-approved'; props: EditApprovalEmailProps }
  | { template: 'edit-rejected'; props: EditRejectionEmailProps }
  | { template: 'edit-changes-requested'; props: EditChangesRequestedEmailProps }
```

**Both `resolveSubject()` switch (lines 42-56) AND `sendEmail()` switch (lines 66-83) must gain 3 new cases.** The exhaustive `never` check (lines 50-53 / 78-81) produces a TypeScript error until all 6 cases are handled — this is the compile-time coverage guard.

### `lib/utils/status.ts` — extend `BipStatus` + lookup maps

**Current type** (line 15):
```typescript
export type BipStatus = 'draft' | 'pending' | 'approved' | 'rejected'
```

**Extended type** (line 15 after Phase 8):
```typescript
export type BipStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'changes_requested'
```

**Add to `STATUS_BADGE_CLASSES`** (after line 22 — MUST be a complete literal string, no template literals; Tailwind v4 CLAUDE.md never-do):
```typescript
changes_requested: 'bg-status-changes-requested-bg text-status-changes-requested border-status-changes-requested',
```

**Add to `STATUS_LABELS`** (after line 28):
```typescript
changes_requested: 'Changes Requested',
```

### `lib/utils/status-transitions.ts` — extend `ALLOWED_TRANSITIONS`

**Current array** (lines 24-32):
```typescript
export const ALLOWED_TRANSITIONS: ReadonlyArray<{...}> = [
  { from: null,       to: 'draft',    actor: 'coordinator' },
  { from: 'draft',    to: 'pending',  actor: 'coordinator' },
  { from: 'pending',  to: 'approved', actor: 'admin' },
  { from: 'pending',  to: 'rejected', actor: 'admin' },
  { from: 'rejected', to: 'draft',    actor: 'coordinator' },
  { from: 'approved', to: 'rejected', actor: 'admin' },
  { from: 'pending',  to: 'draft',    actor: 'coordinator' },
] as const
```

**Add 4 entries** for new-submission `changes_requested` loop:
```typescript
{ from: 'pending',           to: 'changes_requested', actor: 'admin' },
{ from: 'changes_requested', to: 'pending',           actor: 'coordinator' },
{ from: 'changes_requested', to: 'approved',          actor: 'admin' },
{ from: 'changes_requested', to: 'rejected',          actor: 'admin' },
```

Note: `bip_edits` transitions are validated inline in Server Actions (not via `validateTransition`) since they operate on a different table. A `validateEditTransition()` parallel function may be added if needed.

### `components/admin/AdminActionsPanel.tsx` — add third button + `isEdit`/`editId` props

**Current props** (lines 20-25):
```typescript
interface Props {
  bipId: string
  bipTitle: string
  coordinatorName: string
  currentStatus: BipStatus
  nextPendingId?: string | null
}
```

**Extended props** (Phase 8):
```typescript
interface Props {
  bipId: string
  bipTitle: string
  coordinatorName: string
  currentStatus: BipStatus
  nextPendingId?: string | null
  isEdit?: boolean       // true → shows "Approve Edit" / "Reject Edit" labels
  editId?: string        // the bip_edits.id for edit-path actions
}
```

**Current enabled logic** (lines 37-39):
```typescript
const canApprove = currentStatus === 'pending'
const canReject = currentStatus === 'pending' || currentStatus === 'approved'
```

**Extended enabled logic** (per UI-SPEC Surface 4):
```typescript
const canApprove = currentStatus === 'pending'  // same; bip_edits.status='pending'
const canRequestChanges = currentStatus === 'pending' || currentStatus === 'changes_requested'
const canReject = currentStatus === 'pending' || currentStatus === 'approved'
```

**New third button** (insert between Approve and Reject — `MessageSquare` icon; amber styling):
```typescript
import { Check, MessageSquare, X } from 'lucide-react'
...
<Button
  variant="outline"
  className="w-full border-status-pending text-status-pending bg-white hover:bg-status-pending-bg rounded-pill"
  onClick={() => setRequestChangesOpen(true)}
  disabled={!canRequestChanges}
>
  <MessageSquare size={16} className="mr-2" aria-hidden />
  Request Changes
</Button>
```

### `components/admin/AdminBipCard.tsx` + `AdminBipRow.tsx` — type badge slot

**Type badge** (insert after status pill at analog line 78-83):
```typescript
{/* Type badge: only for bip_edits items (D-08) */}
{bip.kind === 'edit' && (
  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-eu-blue-50 text-eu-blue border-eu-blue-light">
    Edit
  </span>
)}
```

Note: `AdminBip` type must gain an optional `kind?: 'submission' | 'edit'` discriminator, or the badge prop must be passed separately from the queue RSC.

The `changes_requested` status now automatically renders the amber badge via `STATUS_BADGE_CLASSES` once `lib/utils/status.ts` is extended — no additional JSX changes in the card.

### `app/(admin)/admin/page.tsx` — sub-line copy extension

**Current sub-line** (lines 30-32):
```typescript
{count === 0
  ? "You're all caught up"
  : `${count} BIP${count === 1 ? '' : 's'} awaiting review`}
```

**Extended sub-line** (per UI-SPEC Surface 2):
```typescript
{count === 0
  ? "You're all caught up. New submissions and edits will appear here automatically."
  : hasEdits
    ? `${count} items awaiting review · includes new submissions and edits`
    : `${count} BIP${count === 1 ? '' : 's'} awaiting review`}
```

Where `hasEdits` is derived from the union query results: `editItems.length > 0`.

---

## Shared Patterns

### Authentication Guard
**Source:** `lib/actions/admin-bips.ts` (lines 52-60)
**Apply to:** All 5 new Server Actions (`submitEditAction`, `resubmitEditAction`, `approveEditAction`, `rejectEditAction`, `requestChangesEditAction`, `requestChangesBipAction`)
```typescript
const supabase = await createClient()
const { data: authData, error: authError } = await supabase.auth.getClaims()
const claims = authData?.claims ?? null
if (authError || !claims?.sub) {
  return { error: 'Your session has expired. Please sign in again.' }
}
const role = (claims as { app_metadata?: { role?: string } }).app_metadata?.role
if (role !== 'admin') return { error: 'Forbidden.' }  // or !== 'coordinator' for coord actions
```

### Fire-and-Forget Email
**Source:** `lib/actions/admin-bips.ts` (lines 124-148)
**Apply to:** `approveEditAction`, `rejectEditAction`, `requestChangesEditAction`, `requestChangesBipAction`
```typescript
// D-11: Resend outage must NOT roll back the DB writes.
try {
  await sendEmail(coordinatorEmail, { template: '...', props: { ... } })
} catch (err) {
  console.error('[actionName] email send failed (non-blocking):', err)
}
```

### Audit Log Insert
**Source:** `lib/actions/admin-bips.ts` (lines 100-116)
**Apply to:** All admin edit Server Actions (admin transitions; coordinator transitions handled by trigger)
```typescript
const { error: auditError } = await supabase
  .from('bip_status_history')
  .insert({
    bip_id: ...,
    from_status: ...,
    to_status: ...,
    actor_id: claims.sub,
    note: ...,    // required for reject_edit / request_changes; null for approve_edit
    action_kind: 'approve_edit',  // or 'reject_edit' / 'request_changes'
  })
if (auditError) {
  console.error('[actionName] audit insert failed:', auditError.message)
  // Continue — DB write already succeeded; audit is non-fatal (D-11 analog)
}
```

### RLS UPDATE Policy (USING + WITH CHECK)
**Source:** `supabase/migrations/00011_bips_update_own_editable.sql` (lines 15-25)
**Apply to:** Every UPDATE policy on `bip_edits` and the new `bips` policy
```sql
create policy "policy_name"
  on public.table_name for update
  to authenticated
  using (
    -- pre-image predicate (USING)
    (select auth.uid()) = created_by
    and status = 'source_status'
  )
  with check (
    -- post-image predicate (WITH CHECK)
    (select auth.uid()) = created_by
    and status = 'target_status'
  );
```

### STATUS_BADGE_CLASSES Literal Lookup (Tailwind v4 compliance)
**Source:** `lib/utils/status.ts` (lines 17-22)
**Apply to:** Any new status value addition (`changes_requested`), any new badge variant (`Edit` type badge)
```typescript
// MUST be complete literal class strings — NEVER template literals (CLAUDE.md never-do)
changes_requested: 'bg-status-changes-requested-bg text-status-changes-requested border-status-changes-requested',
```

### PostgREST Embedded-Relation Normalization
**Source:** `lib/actions/admin-bips.ts` (lines 124-129)
**Apply to:** Any Server Action or query that JOINs `profiles!created_by` for coordinator email/name
```typescript
const profilesRaw = (existing as { profiles?: unknown }).profiles
const profiles = Array.isArray(profilesRaw)
  ? (profilesRaw[0] as { contact_email?: string | null; full_name?: string | null } | undefined)
  : (profilesRaw as { contact_email?: string | null; full_name?: string | null } | undefined)
const coordinatorEmail = profiles?.contact_email ?? null
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `components/admin/BipEditDiffView.tsx` | component | transform | No side-by-side diff view exists in the codebase. Pattern is pure: accept `liveBip: BipDetail` + `proposedEdit: BipEditContent` as props; compute changed fields via `JSON.stringify` comparison; render a grid layout with field label / live value / proposed value columns. Use RESEARCH.md §"Diff View Implementation" and UI-SPEC Surface 3 as the sole source of truth. The `@react-email` `whiteSpace: 'pre-wrap'` XSS mitigation applies to admin note display (T-03-06). |

---

## Metadata

**Analog search scope:** `supabase/migrations/`, `lib/actions/`, `lib/queries/`, `lib/schemas/`, `lib/email/`, `lib/utils/`, `components/admin/`, `components/dashboard/`, `app/(admin)/`, `app/(dashboard)/`, `tests/e2e/`
**Files scanned:** 38
**Pattern extraction date:** 2026-06-26
