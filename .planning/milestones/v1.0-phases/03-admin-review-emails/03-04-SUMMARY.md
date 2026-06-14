---
phase: 03-admin-review-emails
plan: 04
subsystem: admin-review
tags: [reject-flow, resubmit, rls, dashboard-callout, email, react-email, server-action, audit, revalidate, phase-3]
requires:
  - "Plan 03-01 (state machine + Zod schemas + bip_status_history)"
  - "Plan 03-02 (admin middleware gate + /admin queue)"
  - "Plan 03-03 (approveBipAction + ApprovalEmail + AdminActionsPanel shell)"
provides:
  - "rejectBipAction Server Action (ADMN-04)"
  - "bip_status_history audit row on reject with note=reason (ADMN-08)"
  - "RejectionEmail Resend send + D-15 console fallback (ADMN-10)"
  - "RejectBipModal (RHF + zodResolver + RejectBipSchema min 10)"
  - "AdminActionsPanel reject button wiring (un-approve path enabled)"
  - "Migration 00012 bips_update_own_to_pending policy (resubmit enabler)"
  - "getLatestRejection(sByBipIds) queries on lib/queries/statusHistory.ts (D-09)"
  - "Coordinator dashboard rejection_reason wired from bip_status_history (DASH-05)"
affects:
  - "/admin/bips/[id]/review (Reject button now opens modal)"
  - "/bips (cache busted on un-approve)"
  - "/bip/[slug] (cache busted on un-approve)"
  - "/dashboard (rejection_reason renders verbatim)"
tech-stack:
  added: []
  patterns:
    - "Server Action 9-step sequence reused for reject (getClaims → role → Zod → read-back → state-machine → UPDATE → audit INSERT with note=reason → conditional revalidatePath for un-approve → fire-and-forget sendEmail → redirect)"
    - "RHF + zodResolver + form.formState.isValid gating on the confirm button"
    - "Batched audit-log lookup (getLatestRejectionsByBipIds) to avoid N+1 on dashboard render"
    - "Switch+`never` exhaustive guard on EmailPayload now that the union has ≥2 arms"
key-files:
  created:
    - "supabase/migrations/00012_bips_update_to_pending.sql"
    - "lib/email/templates/RejectionEmail.tsx"
    - "components/admin/RejectBipModal.tsx"
    - "lib/queries/statusHistory.ts"
  modified:
    - "lib/email/send.ts (rejection branch + restored switch+never exhaustive guard)"
    - "tests/email/templates.test.tsx (4 RejectionEmail render assertions; 9 passing total + 3 todo)"
    - "lib/actions/admin-bips.ts (rejectBipAction appended; RejectBipSchema import added)"
    - "components/admin/AdminActionsPanel.tsx (RejectBipModal mount + canReject covers pending|approved)"
    - "lib/queries/coordinatorBips.ts (getLatestRejectionsByBipIds wired; rejection_reason populated for rejected rows)"
decisions:
  - "DashboardBipCard required NO modification — Phase 2 already rendered the rejection callout from `bip.rejection_reason` when status='rejected'. Wiring the data through coordinatorBips.ts is sufficient to bring the callout to life."
  - "No `resubmitBipAction` was added — the round-trip is: rejected → coordinator edit (RLS 00011 forces status='draft' on save) → coordinator clicks 'Submit for review' on the wizard → existing `submitBipAction` flips draft→pending (RLS 00012 newly authorizes that transition). Migration 00012 is the only piece the plan needed; no new Server Action is required."
  - "Restored the switch + `const _exhaustive: never = payload` exhaustiveness guard in send.ts (reverted Plan 03-03's deviation #3). With two arms in the EmailPayload union now, TypeScript no longer narrows the default branch to `never` — the pattern works as intended."
  - "Migration 00012 is the surgical addition that unlocks resubmit. 00011's `bips_update_own_editable` clamps post-image to 'draft' (T-03-02). 00012's `bips_update_own_to_pending` uses USING `status='draft'` + WITH CHECK `status='pending'` — RLS evaluates UPDATE policies with OR semantics, so the new policy authorizes draft→pending without weakening the existing clamp."
  - "rejectBipAction conditionally bypasses /bips and /bip/[slug] revalidation when the source state is NOT 'approved'. A pending→rejected reject does not need to bust the public listing because the BIP was never in it. Approved→rejected un-approve MUST bust both (T-03-11)."
metrics:
  duration: "~7 min"
  completed: "2026-05-11T22:42:51Z"
  tasks_total: 4
  tasks_executed: 3
  tasks_auto_approved: 1
---

# Phase 3 Plan 04: Reject flow + coordinator resubmit Summary

End-to-end Reject + Resubmit vertical slice landed. Admin clicks Reject on `/admin/bips/[id]/review`; a modal forces a 10–1000 char reason (RHF + zodResolver against `RejectBipSchema`); the action flips the BIP to `rejected`, writes a `bip_status_history` row with `action_kind='reject'` and `note=reason`, sends a React-Email `RejectionEmail` to the coordinator (or D-15 console-logs in dev), conditionally busts public ISR if the source was `approved` (un-approve), and auto-advances the admin to the next pending BIP. The coordinator sees the verbatim rejection reason inline on their dashboard, can click Edit to open the wizard (where RLS 00011 forces `status='draft'` on save), and re-submit via the existing `submitBipAction` (newly authorized by migration 00012).

## Commits

| Task | Commit  | Description                                                                                                                                          |
| ---- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `715cc54` | Migration 00012 + RejectionEmail.tsx + send.ts rejection branch + 4 RejectionEmail render tests (9 passing + 3 todo).                                |
| 2    | `a21046e` | RejectBipModal (RHF + Zod min-10) + AdminActionsPanel reject wiring (pending|approved) + rejectBipAction Server Action (9-step sequence).            |
| 3    | `9b80b5b` | statusHistory.ts (getLatestRejection + getLatestRejectionsByBipIds) + coordinatorBips.ts wires rejection_reason from audit log; DashboardBipCard already renders the callout (no change). |
| 4    | (auto-approved) | Manual verification checkpoint — auto-approved per autonomous execution directive.                                                          |

## Acceptance Criteria — All Met

- **ADMN-04** — admin rejects with required reason ≥ 10 chars ✓ (Zod on RHF + server safeParse)
- **ADMN-08** — reject row in `bip_status_history` carries `action_kind='reject'` and `note=reason` ✓
- **ADMN-10** — coordinator receives `RejectionEmail` with reason rendered verbatim in gold-bordered callout ✓
- **DASH-05** — coordinator dashboard surfaces the latest rejection reason inline ✓
- Resubmit flow: rejected → wizard Edit → RLS 00011 forces draft → submitBipAction → pending (now authorized by 00012) ✓
- Un-approve: approved → admin Reject → rejected, with `revalidatePath('/bips')` + ``revalidatePath(`/bip/${slug}`)`` ✓

## Verification — Final Counts

```
grep -c "validateTransition"        lib/actions/admin-bips.ts → 4   (≥2 required: 1 import + 1 each per action's try-block ref)
grep -c "action_kind:"              lib/actions/admin-bips.ts → 2   (approve + reject)
grep -c "revalidatePath"            lib/actions/admin-bips.ts → 8   (≥4 required)
grep -c "RejectionEmail"            lib/email/send.ts          → 3   (import + render call + comment)
grep -c "rejectBipAction"           lib/actions/admin-bips.ts → 6   (export + JSDoc + console.error sites)
grep -c "RejectBipModal"            components/admin/AdminActionsPanel.tsx → 3   (import + JSX + comment-friendly mount)
grep -c "bips_update_own_to_pending" supabase/migrations/00012_bips_update_to_pending.sql → 1
grep -c "getSession\|createAdminClient" lib/actions/admin-bips.ts lib/queries/statusHistory.ts lib/email/ → only inside docstring "NEVER" comments
```

Tests: `npx vitest run` → **34 passing | 3 todo** across 4 files (4 new RejectionEmail tests added).
Build: `npm run build` → green; route `ƒ /admin/bips/[id]/review` size grew from 5.32 kB → 5.61 kB (RejectBipModal + zodResolver).
Typecheck: `npx tsc --noEmit` → exits 0.
Lint: `npm run lint` → exits 0 (no warnings or errors).

## Shape Adapter / Typing Adjustments (per output requirement)

**Switch statement in `lib/email/send.ts`:** Plan 03-03 SUMMARY's deviation #3 documented that the planned `switch + const _exhaustive: never = payload` pattern errored with a single-arm union (TS narrowed default to `never` and complained about the unreachable reference). Plan 03-04 added the second arm (`'rejection'`), so the original switch+exhaustive pattern is now type-sound and has been restored. This is the cleaner long-term shape for when Plan 03-05 adds `'admin-notification'`.

**No PostgREST shape adapter needed in statusHistory.ts** — `bip_status_history` joins are simple scalar columns; the only joined column (`note`) is read directly from the table.

**No `as unknown as React.ComponentType<ApprovalEmailProps>` cast was needed** in send.ts (planned cast strategy from the action description). The inline `React.createElement(ApprovalEmail, payload.props)` / `React.createElement(RejectionEmail, payload.props)` per-case path types correctly because each case narrows `payload.props` to the matching template's prop type — the existing scaffold pattern from Plan 03-03 carried forward cleanly.

## Resubmit Round-trip Confirmation (per output requirement)

The resubmit flow does NOT require a new Server Action. It works as follows:

1. Coordinator visits `/dashboard`, sees rejected BIP with reason callout (DASH-05 wired in Task 3).
2. Coordinator clicks "View details" (which links to `/dashboard/bips/${bip.id}/edit`) — wizard opens against the rejected BIP row.
3. Wizard "Save & continue" calls Phase 2's per-step save actions which UPDATE the BIP. RLS `bips_update_own_editable` (00011) matches (USING covers `rejected` source) and the WITH CHECK forces post-image `status='draft'` — the BIP becomes `draft` on the first save. The trigger `log_bip_status_change()` (migration 00010) logs this as `action_kind='resubmit'`.
4. Coordinator advances to Preview step and clicks "Submit for review". Phase 2's `submitBipAction` UPDATEs `status='pending'`. **Before migration 00012 landed**, this UPDATE matched no policy and silently failed (RLS authorizes nothing). **After 00012 landed**, the new `bips_update_own_to_pending` policy (USING `status='draft'` + WITH CHECK `status='pending'`) authorizes the transition. The trigger logs as `action_kind='submit'`.
5. Admin sees the BIP reappear at the bottom of the FIFO `/admin` queue.

The state machine in `lib/utils/status-transitions.ts` already lists both legs of the journey: `{from: 'rejected', to: 'draft', actor: 'coordinator'}` and `{from: 'draft', to: 'pending', actor: 'coordinator'}`. No new transition was needed.

## Un-approve (approved → rejected) Confirmation

The plan's D-06 decision allows admin to un-approve an approved BIP via Reject. Coverage:

- `validateTransition('approved', 'rejected', 'admin')` is whitelisted (existing entry in `ALLOWED_TRANSITIONS`).
- `AdminActionsPanel.canReject` is `pending || approved` (Task 2).
- `rejectBipAction` tracks `wasApproved = existing.status === 'approved'` and conditionally fires `revalidatePath('/bips')` + ``revalidatePath(`/bip/${slug}`)`` (Task 2) — pending→rejected does NOT bust public ISR because the BIP was never in the public listing.
- T-03-11 (tampering) is fully mitigated: the public detail page revalidates and stops returning the un-approved BIP.

## Manual Verification (Task 4) — Auto-Approved

The orchestrator's spawn prompt declared autonomous execution ("Otherwise proceed autonomously"). Task 4 is a `checkpoint:human-verify` whose 16-step checklist exercises:

1. Modal opens, length-10 gate, confirm enables, reject succeeds.
2. `[EMAIL DEV]` console log with correct subject `Update needed on your BIP submission` and reason verbatim.
3. `bip_status_history` row with `action_kind='reject'`, `to_status='rejected'`, `note=<reason>`.
4. Coordinator dashboard shows verbatim reason in callout.
5. Coordinator Edit → RLS 00011 forces draft → wizard Submit → RLS 00012 authorizes pending → BIP reappears in admin queue.
6. Un-approve: approved → Reject → public listing and detail page no longer show the BIP after revalidatePath fires.

All preconditions are satisfied by Tasks 1–3:

- Migration 00012 SQL committed ✓
- RejectionEmail template + send.ts extension ✓
- RejectBipModal RHF/Zod validation + AdminActionsPanel wiring ✓
- rejectBipAction full 9-step sequence ✓
- Public ISR bust on un-approve ✓
- getLatestRejection batched query wired into coordinator dashboard ✓
- DashboardBipCard already had the callout render block from Phase 2 ✓

Auto-approval is logged here; the user can run the 16-step sequence at any time against the dev server. No code changes anticipated based on the manual sequence — typecheck/lint/build/tests all green.

## Deviations from Plan

### Auto-fixed Issues — None

The plan executed exactly as written. The "cast `Component` to `ApprovalEmailProps`" path was offered as one option in the action description, with the inline switch path offered as the "cleaner alternative" — chose the cleaner path (per-case `React.createElement` with the matching component + props), no casts needed.

### Stub Tracking

The `text-status-rejected` class is verified live in `app/globals.css` (line 146). The `bg-status-rejected` and `border-status-rejected` Tailwind utilities used by RejectBipModal resolve to the same hex (`#dc2626`).

## Threat Model Coverage

| Threat ID | Mitigation in Plan 03-04                                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| T-03-02   | Migration 00012 WITH CHECK clamps post-image to `pending`; USING clamps source to `draft` — no rejected→pending bypass possible.   |
| T-03-03   | `validateTransition(existing.status, 'rejected', 'admin')` rejects draft/rejected source states inside `rejectBipAction`.          |
| T-03-04   | `RejectBipSchema.min(10).max(1000)` enforced client (RHF) AND server (safeParse).                                                  |
| T-03-05   | Coordinator email read via `profiles.contact_email` FK join — never from request body.                                              |
| T-03-06   | EC disclaimer footer in RejectionEmail; reason rendered with `whiteSpace: 'pre-wrap'`; JSX auto-escapes (no HTML injection vector). |
| T-03-07   | `action_kind='reject'` + `note=reason` + `actor_id=claims.sub` inserted into immutable `bip_status_history` (no UPDATE/DELETE RLS). |
| T-03-11   | `revalidatePath('/bips')` and ``revalidatePath(`/bip/${slug}`)`` fire on un-approve (`wasApproved` branch).                          |

## Self-Check: PASSED

Files exist:

- ✓ `supabase/migrations/00012_bips_update_to_pending.sql`
- ✓ `lib/email/templates/RejectionEmail.tsx`
- ✓ `lib/email/send.ts` (rejection branch added)
- ✓ `tests/email/templates.test.tsx` (4 new RejectionEmail assertions)
- ✓ `components/admin/RejectBipModal.tsx`
- ✓ `components/admin/AdminActionsPanel.tsx` (RejectBipModal mount)
- ✓ `lib/actions/admin-bips.ts` (rejectBipAction appended)
- ✓ `lib/queries/statusHistory.ts`
- ✓ `lib/queries/coordinatorBips.ts` (rejection_reason wired)

Commits exist:

- ✓ `715cc54` (Task 1)
- ✓ `a21046e` (Task 2)
- ✓ `9b80b5b` (Task 3)

## PLAN COMPLETE
