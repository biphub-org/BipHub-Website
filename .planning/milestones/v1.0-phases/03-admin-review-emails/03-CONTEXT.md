# Phase 3: Admin Review + Email Notifications - Context

**Gathered:** 2026-05-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 closes the editorial loop. An admin logs in (role enforced at three layers: middleware, layout, RLS — read from JWT `app_metadata`, never `getSession()`) and works `/admin`: a FIFO queue of pending BIPs displayed as cards. Clicking through opens `/admin/bips/[id]/review` — full BIP detail reusing the Phase 1 `BipBody` + `BipSidebar`, with an "Admin actions" panel that triggers an approve or reject confirmation modal (approve has an optional note; reject requires a reason ≥ 10 chars). On confirm, the action commits the status change, writes a row to a new `bip_status_history` audit table, calls `revalidatePath('/bips')` + `revalidatePath('/bip/[slug]')`, fires the appropriate Resend email via the Node SDK directly inside the Server Action, then auto-advances to the next pending BIP (or returns to an empty-state queue). Coordinators receive Resend approval / rejection emails; admin receives a Resend new-submission email when a coordinator submits. Coordinators can resubmit rejected BIPs (edit → status flips to `draft` → resubmit → `pending`). Admins can un-approve a live BIP (`approved → rejected` with required reason). Admin can edit any BIP's fields via the reused `BipSubmissionWizard`; editing an approved BIP does NOT trigger re-review — admin edits are trusted, the audit log records them, and `revalidatePath()` fires. A dedicated `/admin/bips` all-listings view with status filter + search satisfies ADMN-05/06; analytics is three stat cards (Total BIPs, Submissions this month, Top 5 countries) per ADMN-07. The `(admin)` route group uses a left sidebar nav (Queue / All BIPs / Analytics) distinct from the coordinator dashboard. n8n is explicitly out-of-scope for v1 (single external integration doesn't justify the operational cost); GDPR consent, `/what-is-a-bip`, Playwright E2E, and Lighthouse hardening belong to Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Admin Review Flow + Queue UX

- **D-01: Pending queue layout** (Claude's call): Card list using a new `AdminBipCard` variant — locked by CLAUDE.md "Cards everywhere, no tables." Each card shows title, coordinator name + university, submitted date, host city, physical dates, status pill, and a `Review →` link. Distinct from `BipCard` (public) and `DashboardBipCard` (coordinator) — admin-specific affordances (coordinator-identifying info, "submitted X days ago").
- **D-02: Queue sort** (Claude's call): Oldest pending first (FIFO). Keeps coordinators from waiting too long. Deadlines are visible inside each card for secondary triage. No sort control in v1.
- **D-03: Review actions location** (Claude's call): Dedicated `/admin/bips/[id]/review` page (per ROADMAP route naming). Reuses Phase 1 `BipBody` + `BipSidebar` for content display; admin-actions panel pinned to the right column. No inline-queue approve/reject — forces the admin to see content before deciding.
- **D-04: Confirmation modals** (Claude's call):
  - **Approve modal:** shows BIP title verbatim (per ROADMAP). Optional `note` textarea (admin internal note, NOT shown to coordinator but available in the approval email if set). Single confirm button "Approve BIP".
  - **Reject modal:** shows BIP title verbatim. **Required** `reason` textarea with min 10 chars validation. The reason is shown to the coordinator on their dashboard card AND included verbatim in the rejection email. Single confirm button "Reject BIP".
- **D-05: Post-action navigation:** **Auto-advance to next pending BIP** in queue (oldest-first). When queue is empty, redirect to `/admin` with an empty-state ("No pending BIPs — you're all caught up"). Optimizes for batch-review sessions.

### State Machine + Audit Log

- **D-06: Allowed status transitions** (the complete v1 state machine):
  | From | To | Actor | Action |
  |---|---|---|---|
  | (nil) | draft | coordinator | Create new BIP (wizard step 1) |
  | draft | pending | coordinator | Submit wizard step 5 |
  | pending | approved | admin | approveBipAction |
  | pending | rejected | admin | rejectBipAction (reason required) |
  | rejected | draft | coordinator | Open in wizard + save (any edit transitions back to draft) |
  | draft | pending | coordinator | Resubmit after rejection (same submitBipAction path) |
  | approved | rejected | admin | rejectBipAction on a live BIP (reason required) |
  | pending | draft | coordinator | Withdraw (already locked Phase 2 D-10) |
  | (any) | (deleted) | admin | hard delete (audit history is preserved by ON DELETE SET NULL on bip_id) |
- **D-07: `bip_status_history` schema (minimal):**
  ```sql
  create table public.bip_status_history (
    id uuid primary key default gen_random_uuid(),
    bip_id uuid references public.bips(id) on delete set null,
    from_status text,                  -- nullable; null on initial create
    to_status text not null,
    actor_id uuid references public.profiles(id) on delete set null,
    note text,                         -- approval note, rejection reason, or admin_edit summary
    action_kind text not null,         -- 'submit' | 'approve' | 'reject' | 'resubmit' | 'admin_edit' | 'withdraw'
    created_at timestamptz not null default now()
  );
  ```
  - `bip_id` is nullable on delete to preserve audit trail even if a BIP is hard-deleted.
  - `actor_id` is nullable on delete for the same reason.
  - `action_kind` discriminates between status-only transitions and admin field-edits.
  - No `update`/`delete` allowed (audit immutability).
- **D-08: `bip_status_history` RLS:**
  - SELECT: coordinator sees rows where `bip_id` matches their own BIPs; admin sees all.
  - INSERT: only admins via Server Action (Server Action uses regular createServerClient — RLS enforces this; the action does NOT need `createAdminClient`).
  - UPDATE, DELETE: no policy → denied for everyone.
- **D-09: Rejection reason surface to coordinator:** Dashboard card shows the rejection reason inline (already locked in Phase 2 D-10). The data source is the LATEST `bip_status_history` row where `to_status = 'rejected'` for that BIP. A `getLatestRejection(bipId)` query lives in `lib/queries/`.
- **D-10: RLS extension for coordinator resubmit:** The existing `bips_update_own_draft_or_pending` policy (migration 00006) only allows `status in ('draft','pending')` as the source state. Phase 3 must extend it to allow `rejected` as the source state, with `WITH CHECK` clamping the post-image status to `draft` (no direct `rejected → pending` jump). New migration replaces the policy:
  ```sql
  drop policy bips_update_own_draft_or_pending on public.bips;
  create policy "bips_update_own_editable"
    on public.bips for update
    to authenticated
    using (
      (select auth.uid()) = created_by
      and status in ('draft','pending','rejected')
    )
    with check (
      (select auth.uid()) = created_by
      and status = 'draft'                          -- forced back to draft on any coordinator edit
    );
  ```
  Resubmit path: coordinator edits a rejected BIP → save flips status to `draft` (RLS-enforced) → `submitBipAction` fires the `draft → pending` transition explicitly with full re-validation.

### Email Design + Delivery

- **D-11: Email transport** (user-chosen): **Resend Node SDK called directly inside Server Actions** (`approveBipAction`, `rejectBipAction`, `submitBipAction`). Pattern: DB transaction first → audit log insert → status update → `revalidatePath()` → `await resend.emails.send(...)` → return. Email send failures are caught and logged but do NOT roll back the DB transaction (a successful approve must not be reverted by a Resend hiccup; the audit log has the record).
- **D-12: Template approach** (Claude's call): **React Email** components in `lib/email/templates/*.tsx`. Typed props, preview-able locally via `npx email dev`, recommended path for Resend, integrates with our existing Tailwind tooling. Templates: `ApprovalEmail.tsx`, `RejectionEmail.tsx`, `AdminNotificationEmail.tsx`.
- **D-13: Sender identity** (Claude's call): `BipHub <noreply@biphub.eu>` — single verified Resend sender. Same domain as Phase 2 Supabase Auth SMTP setup. Reply-To header set to a configured `ADMIN_REPLY_TO_EMAIL` env var for coordinator replies (defaults to `noreply@biphub.eu` if unset).
- **D-14: Email content (locked):**
  - **`ApprovalEmail`** subject `Your BIP is live on BipHub`. Body: title, "Your BIP has been approved and is now live", public `/bip/[slug]` link as primary CTA, dashboard link, admin's optional note rendered as a "Note from the BipHub team" block (only if note set).
  - **`RejectionEmail`** subject `Update needed on your BIP submission`. Body: title, "Your submission needs changes before it can go live", rejection reason verbatim in a callout, `/dashboard/bips/[id]/edit` link as primary CTA, "you can revise and resubmit at any time" guidance line.
  - **`AdminNotificationEmail`** subject `New BIP pending review: {title}`. Body: title, coordinator name + university, submission timestamp, `/admin/bips/[id]/review` link as primary CTA. Recipient = `ADMIN_NOTIFICATION_EMAIL` env var.
- **D-15: Local dev email handling:** Resend production key is gated by `RESEND_API_KEY` env var. In local dev (when unset), `lib/email/send.ts` logs the rendered HTML + recipient + subject to console instead of calling Resend. Supabase Inbucket is auth-only; transactional emails do NOT route through it.

### Admin Section Chrome + Reuse Patterns

- **D-16: `(admin)` route group nav** (user-chosen): Left sidebar nav distinct from coordinator dashboard. Sections: `Queue` (`/admin`), `All BIPs` (`/admin/bips`), `Analytics` (`/admin/analytics`). Includes BipHub logo (links to `/`), the admin's name/avatar, and a `Sign out` button at the bottom. No public `StickyNav`; no coordinator `DashboardNav`.
- **D-17: Admin edit pattern:** Reuse `BipSubmissionWizard` (per ROADMAP). Same 5 steps, same Zustand draft store, same Zod schemas. Admin context displays:
  - A persistent banner: `"Editing as admin — coordinator will not be notified."`
  - The admin-actions panel (approve/reject/save) replaces the coordinator's "Submit" CTA on Step 5.
  - On save, `adminUpdateBipAction` writes a `bip_status_history` row with `action_kind = 'admin_edit'` and a short diff summary in `note`.
- **D-18: Admin edit does NOT change status** (user-chosen): Admin edits trust the admin role. An approved BIP stays approved; a pending BIP stays pending; a rejected BIP stays rejected. `revalidatePath()` fires for approved BIPs so public pages reflect the edit. No coordinator email is sent for admin edits.
- **D-19: All-listings view (`/admin/bips`):** Dedicated admin page — NOT a fork of `/bips`. Reuses query patterns from `lib/queries/bips.ts` but applies the admin RLS context (`bips_select_own_or_approved` returns all rows for admins). Includes a status filter (`All / Draft / Pending / Approved / Rejected`) and a search input (reusing the FTS setup from Phase 1 Plan 01-06). Each row links to `/admin/bips/[id]/edit` (wizard) and shows quick-actions for the BIP's current status.
- **D-20: Analytics (`/admin/analytics`):** Three stat cards verbatim per ADMN-07:
  - **Total BIPs:** count of `bips` rows where `is_seed = false` (seeded demo BIPs excluded).
  - **Submissions this month:** count of `bip_status_history` rows where `action_kind = 'submit'` AND `created_at >= date_trunc('month', now())`.
  - **Top 5 countries:** group by `host_country`, count distinct `bip.id`, order desc, limit 5.
  
  No charts in v1. Cards are RSC-rendered with a 5-minute ISR-equivalent revalidate (`export const revalidate = 300`). v2 may add sparklines + recharts.

### Claude's Discretion
The user delegated the following implementation calls (recorded in DISCUSSION-LOG.md):
- D-01 (queue layout): defaulted to AdminBipCard variant — required by CLAUDE.md "Cards everywhere."
- D-02 (queue sort): defaulted to FIFO oldest-first — keeps coordinator wait times bounded.
- D-03 (review actions location): defaulted to dedicated `/admin/bips/[id]/review` page — matches ROADMAP naming.
- D-04 (modal content): defaulted to title-verbatim modals with optional note (approve) and required reason min 10 chars (reject).
- D-07 (audit schema): defaulted to minimal schema with `action_kind` discriminator (not field-diff JSONB — that's overkill for v1).
- D-12 (template approach): defaulted to React Email — Resend-recommended, typed, preview-able.
- D-13 (sender identity): defaulted to single `noreply@biphub.eu` sender + configurable reply-to env var.
- D-14 (email content): drafted all three email bodies; planner can refine copy.
- D-17 (admin edit pattern): defaulted to wizard reuse per ROADMAP wording.
- D-19 (all-listings): defaulted to dedicated `/admin/bips` page, NOT forking `/bips`.
- D-20 (analytics): defaulted to 3 stat cards verbatim per ADMN-07, no charts.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project-level (always relevant)
- `CLAUDE.md` — locked stack; never-do list (incl. `getSession()` ban, `await cookies()`, `createAdminClient` isolation); visual + brand constraints; n8n out-of-scope verdict.
- `CONTEXT.md` (repo root) — original founder brief; visual direction.
- `.planning/PROJECT.md` — synthesized context; out-of-scope (now incl. n8n entry); key decisions table.
- `.planning/REQUIREMENTS.md` — Phase 3 requirements: ADMN-01..11 (11 requirements).
- `.planning/ROADMAP.md` §"Phase 3: Admin Review + Email Notifications" — goal, success criteria, key deliverables.
- `.planning/STATE.md` — current blockers; Deferred Items now includes "Evaluate n8n for v2 outreach automation".

### Phase 1 research outputs (still authoritative)
- `.planning/research/ARCHITECTURE.md` — route group layout; RLS roles via `app_metadata`; RSC-as-data-fetcher; server-action-only mutations; `getClaims()` vs `getSession()`.
- `.planning/research/PITFALLS.md` — auth pitfalls; **Pitfall 5: WITH CHECK on UPDATE policies** (relevant to D-10 RLS extension); `createAdminClient` isolation.
- `.planning/research/STACK.md` — locked dep versions: Zod v3, `@hookform/resolvers` v3.x, `@supabase/ssr` exact 0.5.2, Next.js 15.5.x LTS.

### Phase 1 + Phase 2 context (prior decisions that carry forward)
- `.planning/phases/01-discovery-foundation/01-CONTEXT.md` — auth/RLS patterns; Zustand+localStorage pattern; revalidate=3600 + dynamicParams=true on `/bip/[slug]` (Phase 3 calls `revalidatePath()` to bust this cache).
- `.planning/phases/02-coordinator-auth-submission/02-CONTEXT.md` — wizard architecture (D-01..04, reused by D-17); coordinator dashboard structure (D-10 rejection reason inline — fed by `bip_status_history`); `(dashboard)` layout auth guard pattern (mirrored in `(admin)` layout); Resend-as-Supabase-SMTP (Phase 2 Pattern 10 — separate path from Phase 3's direct SDK use).
- `.planning/phases/02-coordinator-auth-submission/02-RESEARCH.md` §Pattern 10 — Resend SMTP setup for Supabase Auth. Phase 3 uses the Resend Node SDK directly (separate code path) but the same Resend account + verified `biphub.eu` domain.

### Existing Phase 1 + Phase 2 code (planner must read before implementing)
- `middleware.ts` — Phase 3 adds an admin redirect branch (`!claims || claims.role !== 'admin' && /admin → /` or `/login`). Matcher unchanged.
- `lib/supabase/middleware.ts` — existing `createMiddlewareClient` factory.
- `lib/supabase/server.ts` — `createServerClient` with `await cookies()`. Used by admin Server Actions; RLS enforces admin-only paths.
- `lib/supabase/admin.ts` — `createAdminClient` with service-role key + ESLint isolation. **Phase 3 should NOT need this** — admin Server Actions run as the admin user; RLS already permits via `bips_update_admin` + `bip_partners_admin_all`. Only use `createAdminClient` if a specific operation provably needs RLS bypass (none identified yet).
- `supabase/migrations/00001_skeleton_bips_table.sql` — `status` CHECK constraint `('draft','pending','approved','rejected')` locks the enum.
- `supabase/migrations/00006_rls_policies.sql` — `bips_update_admin`, `bips_update_own_draft_or_pending` (to be replaced per D-10), `bips_select_own_or_approved` (already admin-aware).
- `supabase/migrations/00008_app_metadata_role_mirror.sql` — role mirror trigger. Phase 3 admin promotion (setting `profiles.role = 'admin'`) auto-syncs to `app_metadata.role` via this trigger.
- `lib/queries/bips.ts` + `lib/queries/coordinatorBips.ts` — existing query patterns; Phase 3 adds `lib/queries/adminBips.ts` (all-listings + pending queue) following the same shape.
- `components/dashboard/DashboardBipCard.tsx` — closest analog for `AdminBipCard`; the planner will likely abstract a shared `BipCardBase` or create `AdminBipCard` as a new component.
- `app/(dashboard)/layout.tsx` — Phase 2 dashboard layout with auth + profile-complete gate. `(admin)/layout.tsx` mirrors this structure adding an `app_metadata.role === 'admin'` gate.
- `lib/utils/status.ts` — `STATUS_BADGE_CLASSES` lookup; reused by `AdminBipCard` + admin all-listings view.
- `components/wizard/BipSubmissionWizard.tsx` + step components — reused by admin edit (D-17). Wizard needs a `mode: 'coordinator' | 'admin'` prop to render the admin banner + replace the Submit CTA with the admin actions panel.
- `lib/store/bip-draft.ts` — Zustand draft store. Admin edit reuses this; needs to avoid leaking coordinator-mode auto-save behavior into admin context (planner decides: separate store instance or conditional keys).

### No SPEC.md
This phase has no `/gsd-spec-phase`-generated SPEC.md. Requirements are captured in REQUIREMENTS.md (ADMN-01..11) and bounded in ROADMAP.md "Phase 3" section.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`BipBody` + `BipSidebar`** (Phase 1 Plan 01-07): the public BIP detail layout. `/admin/bips/[id]/review` reuses these directly — admin-actions panel slots in as a sibling, NOT a replacement.
- **`BipSubmissionWizard`** (Phase 2 Plan 02-06/07): reused for admin edit (D-17). Wizard accepts a new `mode` prop; Step 5 swaps the Submit CTA for the admin-actions panel.
- **`STATUS_BADGE_CLASSES` lookup** (`lib/utils/status.ts` from Plan 02-01): reused by `AdminBipCard`, all-listings view, status history rendering.
- **`createServerClient`** (`lib/supabase/server.ts`): used by admin Server Actions; RLS policies (`bips_update_admin`, `bips_select_own_or_approved`) enforce admin scope. No `createAdminClient` use expected in Phase 3.
- **`DashboardBipCard`** (`components/dashboard/DashboardBipCard.tsx`): closest analog for `AdminBipCard`. Planner decides whether to abstract a shared base or build a fresh component.
- **`getCoordinatorBipById`** (`lib/queries/coordinatorBipById.ts`): query shape mirrored by `getAdminBipById` (no `created_by` filter, admin-context).
- **FTS infrastructure** (Plan 01-06): `search_vector` GIN index + `unaccent` extension. Admin all-listings search reuses this directly via `.textSearch()`.
- **shadcn/ui primitives** (installed in Phase 1 + 2): `Dialog`, `Textarea`, `Button`, `Tabs`, `Card`, `Form`, `Input`. Admin confirmation modals use `Dialog`; admin nav sidebar uses unstyled primitives + Tailwind. Check `components/ui/` before adding new shadcn components.

### Established Patterns
- **`getClaims()` everywhere server-side:** never `getSession()`. Applies to `(admin)/layout.tsx`, Server Actions, middleware.
- **`await cookies()` in every Supabase server client factory:** mandatory for Next.js 15.
- **Server Actions for all mutations:** `approveBipAction`, `rejectBipAction`, `adminUpdateBipAction`. Pattern: validate → DB write → audit log insert → `revalidatePath()` → email send (best-effort) → redirect.
- **`revalidatePath()` for ISR cache busting:** approve, un-approve (`approved → rejected`), and admin-edit of approved BIPs all call `revalidatePath('/bips')` + `revalidatePath('/bip/[slug]')`.
- **Tailwind v4 static class names:** no template literals — use complete strings in lookup objects.
- **`motion` from `motion/react`, wrapped in `LazyMotion`:** any animated admin transitions (e.g., card hover, modal mount) follow this pattern.
- **Zod v3 + `@hookform/resolvers` v3.x:** all admin form validation. `RejectBipSchema` enforces `reason: z.string().min(10)`.
- **RSC as data fetcher, Server Actions as mutator:** `(admin)/page.tsx` is an RSC that fetches the pending queue; the modal's confirm button calls a Server Action.

### Integration Points
- **`middleware.ts`:** Phase 3 adds an admin gate — when path starts with `/admin` AND `claims?.app_metadata?.role !== 'admin'`, redirect to `/login?next=/admin` (or to `/` if logged in but not admin). Matcher unchanged.
- **`(admin)/layout.tsx`:** Server-side double-gate — checks `getClaims()` and `claims.app_metadata.role === 'admin'`; non-admin gets `redirect('/')`. This is the second layer of the triple-layer guard (ADMN-01).
- **`bips_update_own_draft_or_pending` (migration 00006):** must be replaced by `bips_update_own_editable` per D-10 to support coordinator resubmit. New migration.
- **`bip_status_history` table:** new in Phase 3 (migration 00010 or next). Includes RLS per D-08.
- **`profiles.role` → `app_metadata.role` mirror trigger** (migration 00008): admin-promotion path. v1 may bootstrap one admin via a manual SQL `update profiles set role = 'admin' where email = '...'` documented in CONTRIBUTING.md (Phase 4 task) — no `/admin/users` page in v1.
- **`revalidatePath()` call surface:** `approveBipAction`, `rejectBipAction` (when source was `approved`), `adminUpdateBipAction` (when status is `approved`). All call BOTH `revalidatePath('/bips')` AND `revalidatePath('/bip/[slug]')`.
- **Resend Node SDK install:** Phase 3 adds `resend` to dependencies (NOT the alpha `@react-email/resend` wrapper). Also adds `react-email` + `@react-email/components` for templates.

</code_context>

<specifics>
## Specific Ideas

- **Bootstrapping the first admin in v1:** No `/admin/users` UI in Phase 3. The first admin is promoted by running `update profiles set role = 'admin' where email = 'team@hexonasystems.com'` directly against the local/prod DB (the `00008` mirror trigger handles `app_metadata.role` sync). Document this in CONTRIBUTING.md (Phase 4 deliverable).
- **`is_seed` BIPs in admin views:** The seeded demo BIPs (`is_seed = true`) ARE visible in `/admin/bips` (status = approved). They should NOT count in Analytics `Total BIPs` or `Submissions this month` (D-20 filters them out). Planner should add `is_seed = false` to analytics queries explicitly.
- **Email send timing — fire-and-forget vs await:** Server Actions should `await resend.emails.send()` but catch+log errors without re-throwing. Reasoning: latency budget for admin approve is ~300ms; Resend typically responds in 100-200ms; awaiting gives correct error attribution. If Resend latency becomes a problem, switch to `after()` from `next/server` (deferred work primitive).
- **`bip_status_history.note` length:** No SQL-level length limit, but the Server Action validates: approve note ≤ 500 chars (UI hint); reject reason 10..1000 chars (UI enforced).
- **Resend webhook for delivery status:** Not in v1 scope. v2 can subscribe to Resend events to surface "email bounced" status to admin if needed.
- **Admin sidebar layout viewport:** Sidebar fixed at 240px desktop; collapses to a top burger menu below `md` (60rem per Plan 01-04 theme override). Use Tailwind responsive utility classes only — no JS for the breakpoint switch.
- **Auto-advance edge cases:** When the just-actioned BIP is the only pending one, `getNextPendingBip()` returns null → redirect to `/admin` with the empty-state component. When `getNextPendingBip()` excludes the just-actioned one (filtered by `id != currentId`), it correctly grabs the next oldest.
- **`AdminNotificationEmail` recipient resolution:** `ADMIN_NOTIFICATION_EMAIL` env var. In v1 with one admin, this is `team@hexonasystems.com`. v2 may query `profiles` for all admins and BCC them.
- **Coordinator email "edit and resubmit" link target:** `/dashboard/bips/[id]/edit` — already exists from Phase 2 Plan 02-07. Opens the wizard at last completed step; coordinator edits, saves (RLS flips to draft per D-10), clicks resubmit.

</specifics>

<deferred>
## Deferred Ideas

- **n8n / workflow automation:** Deferred to v2. Single external integration (Resend) doesn't justify operational overhead in v1. Revisit when integration count grows to 3+ (Slack/Discord digests, AI moderation, coordinator outreach automation). See STATE.md Deferred Items + PROJECT.md Out of Scope.
- **Resend webhook integration for delivery status** — surface bounced/spam-flagged emails to admin. v2.
- **Multi-admin support + `/admin/users` page** — v1 ships with single-admin (bootstrapped via SQL). v2 adds an admin-promotion UI.
- **"Request changes" action (GROW-03)** — soft-rejection that keeps the BIP in `pending` with a note. v2 — Phase 3 only ships approve/reject.
- **Analytics charts (sparklines, country bar chart)** — v2 enhancement. v1 ships 3 stat cards verbatim per ADMN-07.
- **Audit log timeline view for coordinators** — full `/dashboard/bips/[id]/history` page showing all transitions. v1 surfaces only the latest rejection reason on the dashboard card.
- **Admin BCC on coordinator status emails** — useful for audit but adds noise. v2 if requested.
- **Field-diff JSONB snapshots in `bip_status_history`** — richer audit. v1 ships with `action_kind` + `note` only.
- **Email bounce / unsubscribe handling** — not v1 scope; transactional emails are mandatory.

</deferred>

---

*Phase: 3-Admin-Review-Emails*
*Context gathered: 2026-05-11*
