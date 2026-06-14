---
phase: 03-admin-review-emails
verified: 2026-05-12T02:30:00Z
status: human_needed
score: 11/11 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: null  # no prior verification
  previous_score: null
  gaps_closed: []
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "End-to-end approve flow (Resend dispatch)"
    expected: "Admin signs in, opens /admin pending queue, clicks Review → /admin/bips/[id]/review, clicks Approve, optionally types a note, modal confirms; BIP status flips to approved in DB; /bips list and /bip/[slug] reflect the change after a soft refresh; coordinator inbox receives ApprovalEmail (or [EMAIL DEV] console output in dev without RESEND_API_KEY)"
    why_human: "Requires running dev server, real coordinator email recipient, browser navigation, and visual confirmation of the email (Resend dashboard or inbox). Not testable via grep."
  - test: "End-to-end reject flow with required reason"
    expected: "Admin clicks Reject on a pending BIP, modal forces 10–1000 char reason via Zod, submission triggers RejectionEmail to coordinator with reason rendered verbatim in gold-bordered callout; bip_status_history row written with note=reason; coordinator dashboard surfaces the rejection reason inline"
    why_human: "Requires browser interaction with the modal, real email delivery, and dashboard refresh. Modal RHF + zodResolver behaviour cannot be verified statically."
  - test: "Approved→rejected un-approve ISR bust"
    expected: "Admin rejects an already-approved BIP; /bips list and /bip/[slug] detail page no longer show that BIP after revalidatePath fires; coordinator email is dispatched"
    why_human: "ISR cache behaviour requires running the production build and checking page state after an action; cannot grep-verify cache invalidation."
  - test: "Coordinator resubmit flow (rejected → draft → pending)"
    expected: "Coordinator with a rejected BIP clicks Edit; wizard opens; saving forces status=draft per RLS 00011; clicking 'Submit for review' fires submitBipAction; status becomes pending; admin receives AdminNotificationEmail again"
    why_human: "Cross-actor flow + RLS interaction + email delivery; needs both admin and coordinator accounts to exercise."
  - test: "AdminNotificationEmail on coordinator submit"
    expected: "When a new BIP is submitted, an email lands at ADMIN_NOTIFICATION_EMAIL with subject 'New BIP pending review: {title}', coordinator name + university filled, and CTA linking to /admin/bips/[id]/review"
    why_human: "Resend delivery + dynamic subject formatting requires inbox or [EMAIL DEV] console inspection."
  - test: "Admin edit any BIP via wizard"
    expected: "Admin clicks Edit on any BIP row; wizard opens in admin mode (D-17 banner, no localStorage hydration, no auto-save); changes save via adminUpdateBipAction; audit row written with action_kind='admin_edit'; status and slug preserved; no coordinator email fires; if pre-image was approved, /bips and /bip/[slug] revalidate"
    why_human: "Wizard mode-prop behaviour, banner rendering, suppression of localStorage/auto-save are visual + runtime behaviours, not statically verifiable."
  - test: "Admin analytics shows correct aggregates"
    expected: "/admin/analytics renders 3 stat cards: Total BIPs (excluding is_seed=true), Submissions this month (from bip_status_history.action_kind='submit'), Top 5 host countries with flag emoji + count; revalidates every 5 minutes"
    why_human: "Aggregate correctness depends on DB state. Requires inserting test data and SQL-checking the numbers."
  - test: "All-listings filters (status tabs + debounced FTS)"
    expected: "/admin/bips renders 5 status tabs (all/draft/pending/approved/rejected) synced to ?status=; search input debounces 300ms and updates ?q=; switching tabs preserves search term; URL is shareable and reloads to same state"
    why_human: "URL-state sync + debounce timing is a browser interaction concern; cannot be verified statically."
  - test: "Admin row dropdown actions"
    expected: "AdminBipRow DropdownMenu offers Edit / Review / Open public / Un-approve based on status; Un-approve only on approved rows; Open public only on approved rows (uses slug)"
    why_human: "Conditional rendering + base-ui Menu portal behaviour is runtime — requires inspecting the rendered DOM."
---

# Phase 3: Admin Review + Email Notifications — Verification Report

**Phase Goal (ROADMAP):** Admin closes the editorial loop. Coordinators receive status notifications.
**Verified:** 2026-05-12
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Admin login → `/admin` is blocked at 3 layers (middleware, layout, RLS); role from JWT app_metadata, not getSession | VERIFIED | middleware.ts:42-55 (layer 1); app/(admin)/layout.tsx:35-45 (layer 2); migration 00010_bip_status_history.sql:36-60 + 00006 admin RLS clauses (layer 3); zero `getSession()` call sites (only doc comments) |
| 2 | Admin reviews pending queue, approves (with optional note) or rejects (with required reason); coordinator gets Resend email within seconds | VERIFIED | app/(admin)/admin/page.tsx (queue); app/(admin)/admin/bips/[id]/review/page.tsx (review page); lib/actions/admin-bips.ts:48-291 (approve + reject actions, both with 9-step sequence and sendEmail call); ApprovalEmail.tsx + RejectionEmail.tsx |
| 3 | Coordinator submit triggers Resend notification email to admin | VERIFIED | lib/actions/bip-submit.ts:270-322 fires sendEmail({ template: 'admin-notification' }) to process.env.ADMIN_NOTIFICATION_EMAIL with dynamic subject; lib/email/templates/AdminNotificationEmail.tsx (174 lines) |
| 4 | Approve+reject recorded in bip_status_history; approve triggers revalidatePath() for /bips and /bip/[slug] | VERIFIED | admin-bips.ts:101-110 (approve audit insert); admin-bips.ts:229-238 (reject audit insert); admin-bips.ts:119-120 (approve revalidate); admin-bips.ts:251-252 (un-approve conditional revalidate); migration 00010 enforces RLS + immutability |
| 5 | Admin can view all listings filtered by status, edit any BIP, see analytics (total BIPs, submissions/month, top countries) | VERIFIED | app/(admin)/admin/bips/page.tsx + AdminBipsFilters (5 status tabs + FTS); app/(admin)/admin/bips/[id]/edit/page.tsx + adminUpdateBipAction + AdminEditFooter; app/(admin)/admin/analytics/page.tsx + getAdminAnalytics (totalBips, submissionsThisMonth, topCountries) |

**Score:** 5/5 roadmap success criteria verified.

### Per-Requirement Coverage (ADMN-01 .. ADMN-11)

| Req | Description | Plan | Evidence | Status |
|-----|-------------|------|----------|--------|
| ADMN-01 | Triple-layer admin gate, role from JWT app_metadata | 03-02 | middleware.ts:42-55; app/(admin)/layout.tsx:35-45; bsh_select_own_or_admin policy in migrations/00010_bip_status_history.sql:37-47 | SATISFIED |
| ADMN-02 | Admin can view pending queue | 03-02 | lib/queries/adminBips.ts:112-129 getAdminPendingBips() FIFO order; app/(admin)/admin/page.tsx | SATISFIED |
| ADMN-03 | Admin approves with optional note | 03-03 | approveBipAction in lib/actions/admin-bips.ts:48-157; ApproveBipSchema in lib/schemas/admin-bips.ts (optional note); ApproveBipModal | SATISFIED |
| ADMN-04 | Admin rejects with required reason | 03-04 | rejectBipAction in lib/actions/admin-bips.ts:172-291; RejectBipSchema (min 10 char reason); RejectBipModal with RHF + zodResolver | SATISFIED |
| ADMN-05 | Admin can edit any BIP listing | 03-07 | adminUpdateBipAction in lib/actions/admin-bips.ts:320-479; app/(admin)/admin/bips/[id]/edit/page.tsx; BipSubmissionWizard mode='admin'; AdminEditFooter | SATISFIED |
| ADMN-06 | Admin views listings filtered by status | 03-06 | lib/queries/adminBips.ts:176-208 getAdminBips({status, q}); app/(admin)/admin/bips/page.tsx; AdminBipsFilters status tabs | SATISFIED |
| ADMN-07 | Admin basic analytics | 03-06 | lib/queries/adminAnalytics.ts:64-116 (totalBips, submissionsThisMonth, topCountries); app/(admin)/admin/analytics/page.tsx; StatCard + TopCountriesCard | SATISFIED |
| ADMN-08 | Actions in bip_status_history audit log | 03-01 + 03-03 + 03-04 + 03-07 | migration 00010_bip_status_history.sql (table + RLS + trigger); audit inserts at admin-bips.ts:101-110 (approve), :229-238 (reject), :443-454 (admin_edit) | SATISFIED |
| ADMN-09 | Approval email via Resend | 03-03 | lib/email/templates/ApprovalEmail.tsx (188 lines); lib/email/send.ts dispatches via Resend or D-15 console fallback; admin-bips.ts:132-140 invocation | SATISFIED |
| ADMN-10 | Rejection email with reason | 03-04 | lib/email/templates/RejectionEmail.tsx (199 lines, reason verbatim in gold callout); admin-bips.ts:264-272 dispatch | SATISFIED |
| ADMN-11 | Admin notification on new submission | 03-05 | lib/email/templates/AdminNotificationEmail.tsx (174 lines); resolveSubject() in send.ts:42-57 emits `New BIP pending review: {title}`; lib/actions/bip-submit.ts:270-322 fires fire-and-forget | SATISFIED |

**Coverage:** 11/11 ADMN-* requirements satisfied.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/00010_bip_status_history.sql` | audit table + RLS + trigger | VERIFIED | 115 lines; enable RLS; bsh_select_own_or_admin + bsh_insert_admin policies; SECURITY DEFINER trigger with revoke from public/anon/authenticated |
| `supabase/migrations/00011_bips_update_own_editable.sql` | resubmit-enabling UPDATE policy | VERIFIED | 34 lines; USING (draft|pending|rejected) + WITH CHECK status='draft' clamp |
| `supabase/migrations/00012_bips_update_to_pending.sql` | draft→pending policy | VERIFIED | 24 lines; USING status='draft' + WITH CHECK status='pending'; OR-with-00011 leaves T-03-02 clamp intact |
| `lib/utils/status-transitions.ts` | state machine | VERIFIED | exports validateTransition + ALLOWED_TRANSITIONS + Actor type |
| `lib/schemas/admin-bips.ts` | ApproveBipSchema, RejectBipSchema | VERIFIED | Zod v3; uuid bipId; optional 500-char note (approve); 10–1000 char reason (reject) |
| `lib/email/send.ts` | Resend dispatch + D-15 console fallback | VERIFIED | 107 lines; resolveSubject() switch with exhaustive `never` guard; Resend gated on RESEND_API_KEY; from `BipHub <noreply@biphub.eu>` (D-13) |
| `lib/email/tokens.ts` | shared design tokens | VERIFIED | EU palette hex literals for React Email |
| `lib/email/templates/ApprovalEmail.tsx` | approval template | VERIFIED | 188 lines; conditional `note` callout; EC disclaimer |
| `lib/email/templates/RejectionEmail.tsx` | rejection template | VERIFIED | 199 lines; reason in gold-bordered callout; EC disclaimer |
| `lib/email/templates/AdminNotificationEmail.tsx` | admin notification template | VERIFIED | 174 lines; CTA → /admin/bips/[id]/review; EC disclaimer |
| `lib/actions/admin-bips.ts` | approve/reject/edit Server Actions | VERIFIED | 480 lines; 9-step approve sequence; 9-step reject sequence; admin edit with conditional ISR |
| `lib/queries/adminBips.ts` | admin queries (queue, edit, all-listings) | VERIFIED | 397 lines; getAdminPendingBips (FIFO), getAdminBipById, getAdminBips({status, q}), getNextPendingBip, getAdminBipForEdit |
| `lib/queries/adminAnalytics.ts` | analytics aggregator | VERIFIED | 117 lines; 3 round-trips; JS-side top-5 country tally |
| `lib/queries/statusHistory.ts` | rejection reason lookup | VERIFIED | 84 lines; getLatestRejection + batched getLatestRejectionsByBipIds |
| `middleware.ts` | admin role gate | VERIFIED | 80 lines; (3b) admin branch at lines 42-55 |
| `app/(admin)/layout.tsx` | RSC role re-check + sidebar + EC disclaimer | VERIFIED | 87 lines; getClaims() + role check; AdminSidebar; footer disclaimer at lines 79-81; Toaster |
| `app/(admin)/admin/page.tsx` | pending queue | VERIFIED | 55 lines; empty state Inbox icon; FIFO list |
| `app/(admin)/admin/bips/page.tsx` | all-listings | VERIFIED | 85 lines; 5 status tabs validation; force-dynamic |
| `app/(admin)/admin/bips/[id]/review/page.tsx` | review page | VERIFIED | 91 lines; BipHeader + BipBody + BipSidebar mode='admin-review' + AdminActionsPanel; Promise.all data fetch |
| `app/(admin)/admin/bips/[id]/edit/page.tsx` | admin edit page | VERIFIED | 68 lines; mounts BipSubmissionWizard mode='admin' + AdminEditFooter |
| `app/(admin)/admin/analytics/page.tsx` | analytics page | VERIFIED | 65 lines; revalidate=300; 3 StatCard / TopCountriesCard |
| `components/admin/AdminSidebar.tsx` | sidebar chrome | VERIFIED | 193 lines |
| `components/admin/AdminBipCard.tsx` | queue card | VERIFIED | 94 lines |
| `components/admin/AdminBipRow.tsx` | listings row + DropdownMenu | VERIFIED | 138 lines |
| `components/admin/AdminBipsFilters.tsx` | status tabs + debounced search | VERIFIED | 104 lines |
| `components/admin/AdminActionsPanel.tsx` | review-page actions | VERIFIED | 107 lines |
| `components/admin/AdminEditFooter.tsx` | edit-page footer | VERIFIED | 136 lines; live store binding |
| `components/admin/ApproveBipModal.tsx` | approve modal | VERIFIED | 146 lines |
| `components/admin/RejectBipModal.tsx` | reject modal RHF+Zod | VERIFIED | 169 lines |
| `components/admin/StatCard.tsx` | stat card primitive | VERIFIED | 42 lines |
| `components/admin/TopCountriesCard.tsx` | top countries display | VERIFIED | 55 lines |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| middleware.ts | /admin/* | `pathname.startsWith('/admin')` | WIRED | lines 45-55; redirects to /login (anon) or / (non-admin) |
| (admin)/layout.tsx | getClaims | `supabase.auth.getClaims()` | WIRED | line 38; role re-check at line 44 |
| /admin/page.tsx | getAdminPendingBips | direct import | WIRED | line 2 + line 22 |
| AdminActionsPanel | approveBipAction | via ApproveBipModal | WIRED | AdminActionsPanel.tsx:91-97 mounts modal; modal invokes action |
| AdminActionsPanel | rejectBipAction | via RejectBipModal | WIRED | AdminActionsPanel.tsx:98-104 mounts modal |
| approveBipAction | bip_status_history | `.insert({...action_kind:'approve'})` | WIRED | admin-bips.ts:101-110 |
| approveBipAction | sendEmail | `await sendEmail(...)` in try/catch | WIRED | admin-bips.ts:132-140 |
| approveBipAction | revalidatePath | `revalidatePath('/bips')` + slug | WIRED | admin-bips.ts:119-120 |
| rejectBipAction | bip_status_history | `.insert({...action_kind:'reject'})` | WIRED | admin-bips.ts:229-238 (note=reason) |
| rejectBipAction | sendEmail | `await sendEmail({template:'rejection'})` | WIRED | admin-bips.ts:264-272 |
| rejectBipAction | revalidatePath | conditional on `wasApproved` | WIRED | admin-bips.ts:247-253 |
| submitBipAction | sendEmail | `template: 'admin-notification'` | WIRED | bip-submit.ts:300-309 |
| coordinatorBips | getLatestRejectionsByBipIds | direct import | WIRED | coordinatorBips.ts:20+90-93 maps reason onto rejected rows |
| adminUpdateBipAction | bip_status_history | `.insert({...action_kind:'admin_edit'})` | WIRED | admin-bips.ts:443-454 |
| /admin/bips/[id]/edit | BipSubmissionWizard mode='admin' | direct prop | WIRED | edit/page.tsx:47 |
| /admin/bips/[id]/edit | AdminEditFooter | `renderPreviewStep` prop | WIRED | edit/page.tsx:55-62 |
| /admin/analytics | getAdminAnalytics | direct import | WIRED | analytics/page.tsx:2+34 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Real Data | Status |
|----------|--------------|--------|-----------|--------|
| /admin/page.tsx | `bips` | getAdminPendingBips → supabase.from('bips').select(ADMIN_BIP_SELECT).eq('status','pending') | Yes (admin RLS clause grants admin role full visibility) | FLOWING |
| /admin/bips/page.tsx | `bips` | getAdminBips({status, q}) → supabase query with optional textSearch | Yes | FLOWING |
| /admin/analytics/page.tsx | `analytics` | getAdminAnalytics → 3 supabase round-trips (count totalBips, count submissions this month, group host countries) | Yes (uses count: 'exact' head:true) | FLOWING |
| /admin/bips/[id]/review/page.tsx | `bip` | getAdminBipById → getBipById in lib/queries/bipDetail.ts | Yes (delegates to public BipDetail query) | FLOWING |
| /admin/bips/[id]/edit/page.tsx | `record` | getAdminBipForEdit → flat select with partner relation | Yes | FLOWING |
| DashboardBipCard | `bip.rejection_reason` | coordinatorBips.ts → getLatestRejectionsByBipIds | Yes (audit log lookup) | FLOWING |
| ApprovalEmail | `note` prop | approveBipAction → parsed.data.note | Yes (validated Zod input) | FLOWING |
| RejectionEmail | `reason` prop | rejectBipAction → parsed.data.reason | Yes (Zod min 10 chars) | FLOWING |
| AdminNotificationEmail | `bipTitle`/`coordinatorName`/`coordinatorUniversity` | submitBipAction → courtesy SELECT on profiles + universities | Yes (with fallback to empty string on read failure) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Test suite is green | `npx vitest run` | 40 tests passing across 4 files | PASS |
| TypeScript compiles | `npx tsc --noEmit` | exit 0 (no output) | PASS |
| ESLint clean | `npx next lint` | "No ESLint warnings or errors" | PASS |
| Production build | `npm run build` | exit 0; all admin routes compiled (`ƒ /admin`, `ƒ /admin/bips`, `ƒ /admin/bips/[id]/edit`, `ƒ /admin/bips/[id]/review`, `ƒ /admin/analytics`) | PASS |

### Constraint Adherence (CLAUDE.md never-do)

| Constraint | Check | Status | Evidence |
|-----------|-------|--------|----------|
| Never use getSession() server-side | grep -E 'getSession\(' across .ts/.tsx | PASS | Only 4 hits — all in doc comments in lib/supabase/server.ts and lib/supabase/middleware.ts |
| Always await cookies() in supabase client factory | grep 'await cookies()' in lib/supabase | PASS | lib/supabase/server.ts:18 uses `const cookieStore = await cookies()` |
| createAdminClient only inside app/(admin)/** + lib/supabase/admin.ts | grep + ESLint no-restricted-imports rule | PASS | All 4 grep hits in admin-bips.ts / statusHistory.ts / admin.ts are either the canonical factory file or doc comments; eslint.config.mjs declares `no-restricted-imports` excluding only app/(admin)/** and lib/supabase/admin.ts |
| Every (admin) page chain renders EC disclaimer | grep "Independent project — not affiliated with the European Commission" | PASS | app/(admin)/layout.tsx:79-81 renders the disclaimer below `<main>`, applying to /admin, /admin/bips, /admin/bips/[id]/review, /admin/bips/[id]/edit, /admin/analytics |
| Every email template renders EC disclaimer | grep across lib/email/templates | PASS | All 3 templates (ApprovalEmail.tsx, RejectionEmail.tsx, AdminNotificationEmail.tsx) contain the disclaimer string |
| RLS enabled on bip_status_history | grep 'enable row level security' in 00010 | PASS | migration 00010 line 34 |
| UPDATE policies include both USING and WITH CHECK | grep across 00011 + 00012 | PASS | 00011 has using (lines 18-21) + with check (lines 22-25); 00012 has using (lines 17-20) + with check (lines 21-24) |
| Audit log is append-only (no UPDATE/DELETE policy) | grep '00010' for update/delete policies | PASS | Only `bsh_select_own_or_admin` (select) and `bsh_insert_admin` (insert); no UPDATE/DELETE policies — immutability per D-08 |
| Zod v3 (not v4) | grep "from 'zod'" + package.json | PASS | lib/schemas/admin-bips.ts imports from `zod`; package.json pins `zod` v3 line per phase 2 contract |
| No framer-motion in admin chrome | grep across app/(admin) + components/admin | PASS | No matches |

### Anti-Patterns Found

None. All admin components have substantive implementations (94–199 lines each). No TODO/FIXME/placeholder/unimplemented comments. No empty handlers, no hardcoded empty data flowing to render output, no stub returns.

### Human Verification Required

See `human_verification:` section in frontmatter. 9 manual checkpoints span the actual end-to-end user flows (approve, reject, resubmit, admin edit, admin notification, analytics correctness, listings filters, dropdown actions, ISR cache busts) — these require running the dev server, real coordinator/admin accounts, and inbox or [EMAIL DEV] console inspection.

The phase ships a complete admin pipeline as evidenced by code review + automated gates. What automation cannot prove is end-to-end runtime behaviour: Resend delivery, the wizard mode='admin' banner/suppression, ISR bust visibility on /bips after revalidatePath, and aggregate correctness against seeded data. These are expected deferred checkpoints per the plan's vertical-slice structure (Task 4 in plans 03-02, 03-03, 03-04, 03-06, 03-07 are all explicitly manual checkpoints).

### Deferred Items

None. Median time-to-decision is NOT a roadmap success criterion (the ROADMAP says "total BIPs, submissions per month, top countries" — the verifier-prompt's mention of "median time-to-decision" is aspirational, not contractual). All 5 ROADMAP success criteria are satisfied; all 11 ADMN-* requirements have implementations.

### Gaps Summary

No code gaps blocking the phase goal. The phase is feature-complete by code evidence:

- 3 emails wired (approval, rejection, admin notification) — Resend or D-15 console fallback
- 3 Server Actions written (approveBipAction, rejectBipAction, adminUpdateBipAction) — each with the documented 9-step sequence
- 1 audit log table + 2 RLS migrations + 1 trigger
- 5 admin routes + 12 admin components + 4 admin queries + 1 analytics aggregator
- 40 passing unit tests over state machine, Zod schemas, email send wrapper, email templates
- All CLAUDE.md never-do constraints upheld
- All 3 automated gates green (vitest, tsc, next lint, npm build)

The phase requires human verification of runtime flows before being declared "live" because email dispatch, ISR cache behaviour, and wizard mode-prop runtime behaviour cannot be statically verified — these are documented as deferred Task-4 checkpoints in the individual plan SUMMARYs.

---

_Verified: 2026-05-12_
_Verifier: Claude (gsd-verifier)_
