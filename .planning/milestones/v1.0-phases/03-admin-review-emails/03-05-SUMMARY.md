---
phase: 03-admin-review-emails
plan: 05
subsystem: email
tags: [admin-notification, email, submit-action, phase-3, ADMN-11]
requires:
  - 03-03 (lib/email/send.ts + ApprovalEmail template + EMAIL_TOKENS)
  - 03-04 (RejectionEmail template — extends EmailPayload union to 3rd variant)
  - Phase 2 (submitBipAction — extended at its success-path tail, transaction order untouched)
provides:
  - "AdminNotificationEmail React Email template (D-14)"
  - "admin-notification variant on EmailPayload discriminated union with dynamic subject `New BIP pending review: {title}`"
  - "submitBipAction admin notification trigger (D-11 fire-and-forget)"
  - "ADMIN_NOTIFICATION_EMAIL env var contract"
affects:
  - lib/email/templates/AdminNotificationEmail.tsx (new)
  - lib/email/send.ts (extended — resolveSubject + admin-notification branch)
  - lib/actions/bip-submit.ts (extended — email send at success path)
  - tests/email/templates.test.tsx (4 new tests)
  - tests/email/send.test.ts (2 new tests)
  - .env.example (ADMIN_NOTIFICATION_EMAIL added)
tech-stack:
  added: []
  patterns:
    - "Discriminated union per-call subject resolver (resolveSubject) replaces static lookup so different templates can carry static or dynamic subjects under the same EmailPayload contract"
    - "Fire-and-forget email send after revalidatePath (D-11): try/catch wraps sendEmail; failure logs but never returns error to coordinator"
    - "Courtesy SELECT for email-body PII (profile.full_name + university.name) is OUTSIDE the validated submit transaction — read failure falls back to empty strings, template renders 'Unknown (Unaffiliated)'"
key-files:
  created:
    - lib/email/templates/AdminNotificationEmail.tsx
  modified:
    - lib/email/send.ts
    - lib/actions/bip-submit.ts
    - tests/email/templates.test.tsx
    - tests/email/send.test.ts
    - .env.example
decisions:
  - "PostgREST FK join `university:university_id (name)` on profiles instead of separate universities SELECT — single round-trip; defensive code handles both array and object cardinality shapes returned by Supabase JS"
  - "Email send is the LAST step in submitBipAction (after revalidatePath) so a transient sendEmail throw cannot prevent dashboard cache invalidation; D-11 fire-and-forget wraps the call regardless"
  - "Profile/university lookup is INSIDE the try block — a profiles read failure becomes part of the non-blocking fallback (template renders 'Unknown (Unaffiliated)'); the email still ships if env var is set"
metrics:
  duration_seconds: 503
  duration_human: "8m 23s"
  tasks_completed: 3
  files_created: 1
  files_modified: 5
  tests_added: 6
  tests_total_passing: 40
  completed_date: 2026-05-12
---

# Phase 03 Plan 05: AdminNotificationEmail on Coordinator Submit — Summary

Closes ADMN-11. Coordinator clicks "Submit for review →" in the wizard's Step 5; submitBipAction's success path now fires `sendEmail(template: 'admin-notification', …)` to `process.env.ADMIN_NOTIFICATION_EMAIL` with the BIP title, coordinator name + university, and a CTA linking to `/admin/bips/[id]/review`. D-11 fire-and-forget contract preserved: a Resend outage or missing env var only logs — it never rolls back the submission.

## What was built

| Component | Type | Lines |
|-----------|------|-------|
| `lib/email/templates/AdminNotificationEmail.tsx` | React Email template (D-14) | 175 |
| `lib/email/send.ts` (extended) | `resolveSubject()` + admin-notification branch | +52 / -12 |
| `lib/actions/bip-submit.ts` (extended) | Email trigger + courtesy profile fetch | +72 |
| `tests/email/templates.test.tsx` (extended) | 4 AdminNotificationEmail render tests | +44 |
| `tests/email/send.test.ts` (extended) | 2 subject-resolution tests | +47 |
| `.env.example` (extended) | `ADMIN_NOTIFICATION_EMAIL=` block | +6 |

### Variables bound to email props inside submitBipAction

| Email prop | Source in submitBipAction | Notes |
|------------|---------------------------|-------|
| `bipTitle` | `parsed.data.title` | Already validated by submitSchema (Phase 2) |
| `bipId` | `bipId` (function param) | Same id used in CTA href to `/admin/bips/[id]/review` |
| `coordinatorName` | `profileRow.full_name ?? ''` | Read from `profiles.full_name` via a separate maybeSingle SELECT after the commit |
| `coordinatorUniversity` | `profileRow.university?.name ?? ''` | Read from `universities.name` via PostgREST FK join `university:university_id (name)` (handles both object + array shapes) |
| `submittedAt` | `new Date().toISOString()` | Generated at send time (close enough to the DB commit timestamp for the email body) |

### Did the existing submitBipAction SELECT clause need extending?

**No.** The existing read-back SELECT (`bips.id, status, created_by, slug`) is used for the defense-in-depth ownership check BEFORE the UPDATE — it cannot carry the email body data because:
1. The ownership check fires for ALL submissions including failure paths, so adding joins there would pay PostgREST cost on rejected/unauthorized requests.
2. The email body needs `profiles.full_name` + `universities.name` — both off the `bips` table, requiring a join through `profiles.id = bips.created_by` and `profiles.university_id = universities.id`.

Cleaner: a **second SELECT inside the email try block** that's scoped to `profiles` directly using `userId`. This isolates the lookup to the email courtesy path — a read failure becomes part of D-11 fire-and-forget (template renders 'Unknown (Unaffiliated)'), not a new failure mode for the submission itself.

## Commits

| Type | Hash | Message |
|------|------|---------|
| test | `879ea8e` | test(03-05): add failing tests for AdminNotificationEmail + dynamic subject |
| feat | `826bae3` | feat(03-05): implement AdminNotificationEmail template + dynamic subject in send.ts |
| feat | `93943ad` | feat(03-05): wire AdminNotificationEmail into submitBipAction + document env var |

TDD gate compliance: RED (test) → GREEN (feat) → second feat builds on the same green base. No refactor commit needed — the resolveSubject extraction was done in the GREEN commit itself because it's structurally inseparable from supporting the dynamic admin-notification subject.

## Verification

| Check | Result |
|-------|--------|
| `npx vitest run tests/email/` | 20 passed (12 templates + 8 send) |
| `npm test` (full suite) | 40 passed across 4 files |
| `npx tsc --noEmit` | clean |
| `npm run lint` | clean |
| `npm run build` | succeeded (15 routes generated) |
| `grep -c "admin-notification" lib/email/send.ts` | 5 |
| `grep -c "admin-notification" lib/actions/bip-submit.ts` | 1 |
| `grep -c "ADMIN_NOTIFICATION_EMAIL" lib/actions/bip-submit.ts` | 3 |
| `grep -c "ADMIN_NOTIFICATION_EMAIL" .env.example` | 1 |
| `grep -cE "fire-and-forget\|non-blocking" lib/actions/bip-submit.ts` | 3 |

Note: 20 email tests pass (vs the plan's stated 19). Added an extra `'renders BIP title verbatim'` test on AdminNotificationEmail for symmetry with ApprovalEmail's title-rendering test; this is additive coverage, not a deviation from acceptance criteria.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] File-path mismatch: plan referenced `tests/email/templates.test.ts` but Plan 03-03 renamed it to `.tsx` for JSX support**
- **Found during:** Task 1 prep
- **Issue:** Plan frontmatter and `<files>` blocks list `.ts`; spawning agent explicitly noted to use the existing `.tsx`
- **Fix:** Applied all template tests to the existing `tests/email/templates.test.tsx` file; no duplicate `.ts` file created
- **Files modified:** `tests/email/templates.test.tsx`
- **Commit:** `879ea8e`

**2. [Rule 1 — Bug] Initial Edit calls applied to main-repo path instead of worktree path**
- **Found during:** Task 1 RED — vitest run showed only 14 tests + 3 todos (new tests didn't load), revealing the worktree file was unchanged while the main repo had the edits
- **Issue:** Spawn-time absolute paths in Edit calls bypassed the worktree containment check (the worktree's `git rev-parse --show-toplevel` was different from the spawn context's pwd path)
- **Fix:** Reverted main-repo edits with `git checkout -- tests/email/*`, then re-applied edits against the worktree-relative absolute paths under `.claude/worktrees/agent-a98514aa0b859d4f1/`
- **Files affected:** Main repo `tests/email/send.test.ts` + `tests/email/templates.test.tsx` reverted (intentional revert acknowledged by system); worktree counterparts now carry the changes
- **No commit impact** — the spurious main-repo edits were never staged

### Auth gates

None. AdminNotificationEmail is fire-and-forget; the Task 3 checkpoint is functional-verify (not auth gate).

## Task 3 Checkpoint Outcome

**Type:** `checkpoint:human-verify`
**Resolution:** Auto-approved (autonomous executor; orchestrator passed `Proceed autonomously` directive). Logged as:

> ⚡ Auto-approved: AdminNotificationEmail template + send.ts admin-notification branch + submitBipAction wiring + .env.example documentation.

**What auto-approval relies on for confidence:**
- 20 unit tests cover template render output (coordinator name, university, CTA href, EC disclaimer, BIP title) and send.ts subject resolution (dynamic for admin-notification, static for approval/rejection).
- TypeScript strict typecheck passes — the EmailPayload discriminated union is exhaustive.
- Next.js build passes — no Server Action regressions, no chunk-graph issues from the new email import.
- Manual D-15 dev-mode walkthrough (the 8-step checkpoint procedure) is preserved verbatim in the plan for the user/team to run when running `supabase start && npm run dev` locally.

**What is NOT verified by auto-approval (suggested next manual checks):**
- That `[EMAIL DEV]` console line appears with the actual coordinator/university values in a real wizard submit. The unit tests use mock props directly; a real run exercises the new `profiles` SELECT inside submitBipAction.
- That the PostgREST FK join `university:university_id (name)` returns the shape this code expects (handled both array + object shapes defensively, but live confirmation would be useful).
- That the email is suppressed cleanly when `ADMIN_NOTIFICATION_EMAIL` is unset (Step 7–8 of the checkpoint).

## Known Stubs

None. The email contents are fully wired to runtime data:
- `bipTitle` → validated submit payload
- `bipId` → action param
- `coordinatorName` + `coordinatorUniversity` → live `profiles` SELECT with university FK join
- `submittedAt` → server clock at send time

The only `??` fallbacks are `''` strings on profile read failure, which render to safe `"Unknown"` / `"Unaffiliated"` labels in the template — these are not stubs but explicit graceful-degradation paths under D-11 fire-and-forget.

## Threat Surface Scan

No new attack surface introduced beyond the threat model already in the plan. The `profiles` SELECT inside submitBipAction is authenticated (uses the `supabase` client created from `getClaims()`) and scoped by `eq('id', userId)`, so RLS on `profiles` enforces row visibility. The `universities` join inherits PostgREST's RLS evaluation.

No threat flags raised.

## Self-Check: PASSED

**Files created exist:**
- FOUND: `lib/email/templates/AdminNotificationEmail.tsx`

**Files modified exist:**
- FOUND: `lib/email/send.ts`
- FOUND: `lib/actions/bip-submit.ts`
- FOUND: `tests/email/templates.test.tsx`
- FOUND: `tests/email/send.test.ts`
- FOUND: `.env.example`

**Commits exist (git log --oneline contains):**
- FOUND: `879ea8e` (RED)
- FOUND: `826bae3` (GREEN — template + send.ts)
- FOUND: `93943ad` (Task 2 — submitBipAction + .env.example)
