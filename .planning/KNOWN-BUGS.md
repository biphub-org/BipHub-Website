# Known Bugs

Tracked defects awaiting a dedicated fix. Each entry: symptom → root cause (with
evidence) → proposed fix → affected tests.

---

## BUG-001 — Coordinator cannot submit an edit for an approved BIP (edit wizard trapped on Step 1)

**Status:** resolved · **Severity:** high (core Phase 8 feature non-functional) · **Found:** 2026-07-17 · **Resolved:** 2026-07-17

### Symptom
A coordinator opening `/dashboard/bips/[id]/edit` for one of their **approved**
(live) BIPs lands on Step 1 of the edit wizard (State A, "Submit Edit for
Review"). Clicking **"Save & continue →"** opens the two-tab **conflict dialog**
and a failed-save indicator; the wizard does **not** advance. Because the
"Submit Edit for Review" button lives on **Step 5** and the step-nav dots only
allow jumping *backward* to already-reached steps, the coordinator can never
reach Step 5 — the edit can never be submitted.

### Root cause (confirmed empirically)
`BipSubmissionWizard`'s `saveAndContinue` (coordinator mode) calls
`performSave` → `saveDraftAction`, which does an `UPDATE` on the live `bips`
row. The RLS policy `bips_update_own_editable`
(`supabase/migrations/00011_bips_update_own_editable.sql`) permits owner updates
only for `status in ('draft','pending','rejected')` — **not `approved`**. No
Phase 8 migration adds `approved`. So the UPDATE matches 0 rows, which
`saveDraftAction` returns as `{ error: 'conflict' }`; the wizard opens the
conflict dialog and refuses to advance.

Verified 2026-07-17 by driving the real coordinator flow against the cloud test
project: after "Save & continue" the conflict/reload dialog and the failed-save
indicator were both visible; the step did not advance.

Note the submit itself is fine: `submitEditAction(bipId, draft, partners)` reads
the **client-side Zustand draft** and inserts a `bip_edits` row — it does not
depend on the per-step saves. The bug is purely that forward navigation is
gated on a save that RLS forbids for approved BIPs.

### Why it wasn't caught
Phase 8 shipped "complete **pending** manual UAT" (see
`08-edit-approved-request-changes/08-UAT.md`); the UAT that would have exercised
this was deferred, and the `bip-edits` E2E spec was written Wave-0/TDD-style and
never ran green.

### Proposed fix (app change — do not just widen RLS)
Do **not** add `approved` to `bips_update_own_editable` — that would let
coordinators mutate the live public BIP directly, defeating the edit-review
model. Instead, for approved / changes_requested edits the wizard should
**suppress per-step `saveDraftAction`** and advance on the Zustand draft alone,
exactly as `mode='admin'` already does (`saveAndContinue` early-returns without
`performSave` when `mode==='admin'`). The edit page
(`app/(dashboard)/dashboard/bips/[id]/edit/page.tsx`) should pass a flag (a new
mode, or reuse the admin no-save path) so the approved-edit wizard advances
without touching the live row; the proposed content is written only by
`submitEditAction` on Step 5.

Check the sibling paths for the same wall while fixing: State C
(`resubmitEditAction`) and D-06a (`resubmitPendingBipAction`) — a
`changes_requested` BIP *is* in the editable policy, so State C/D-06a may
navigate fine, but confirm.

### Affected tests
`tests/e2e/bip-edits.spec.ts` — the entire serial `bip edit flow` describe is
marked `test.describe.fixme` pending this fix. The fixtures are ready:
`supabase/seed.e2e.sql` seeds the approved edit-target BIP owned by the
coordinator with **no** pre-seeded pending edit (so EDIT-01 starts in State A and
creates the edit itself). Once the feature is fixed, rewrite EDIT-01 to drive the
wizard Step 1 → Step 5 ("Save & continue" ×4, then "Submit Edit for Review") and
un-fixme the describe.

> **Update 2026-07-17:** resolved in `9bcccc7` (added `editMode` prop to
> `BipSubmissionWizard`; bip-edits describe un-fixme'd). See BUG-002 below — the
> revival surfaced a pre-existing shared-state fragility in the e2e suite.

---

## BUG-002 — E2E suite: withdraw test eats a seeded admin BIP when the submission wizard flakes (cascade)

**Status:** resolved · **Severity:** high (blocks green CI; 4 failures from 1 trigger) · **Found:** 2026-07-17 · **Resolved:** 2026-07-17

### Symptom
On the post-merge CI run for `9bcccc7`, `npx playwright test` reports **4
failures** (32 passed, 2 skipped, 2 did not run):

1. `submission.spec.ts:30` — *coordinator submits a BIP through the 5-step wizard*
   → 30s timeout at line 109 waiting for the Step-4 **"Save & continue"** button.
2. `admin-review.spec.ts:78` — *admin rejects a pending BIP* → 30s timeout; the
   **"Data Ethics in Practice"** card is not on `/admin`.
3. `admin-review.spec.ts:110` — *coordinator sees rejection reason* → assertion
   fails; the rejection reason text never appears (depends on #2).
4. `bip-edits.spec.ts:399` — *admin requests changes on new submission* → 30s
   timeout; no non-edit pending card remains on `/admin`.

The author's pre-merge run against the **stateful cloud test project** was green,
because that DB had accumulated favorable state; CI seeds a **fresh** local
Supabase once, which exposes the fragility.

### Root cause (one trigger + a cascade through shared DB state)
CI seeds the DB **once** (`.github/workflows/e2e.yml:66-68`, `psql -f
seed.e2e.sql`), runs serially (`workers: 1`, `retries: 0`), and never reseeds
between tests. The `coordinator-authed` project runs **before** `admin-authed`.

The seeded pending BIPs that `admin-review.spec.ts` consumes — "E2E Pending:
Machine Learning Foundations" and "E2E Pending: Data Ethics in Practice" — are
both `created_by = 11111111-…-111111111111` = **the coordinator**
(`seed.e2e.sql:221` and `:254`). So they appear on the coordinator's own
`/dashboard?status=pending`.

Cascade:
- **Failure #1 (trigger):** `submission.spec.ts` test 1 flakes at Step 4 — the
  "Save & continue" button (`BipSubmissionWizard.tsx:449-457`, rendered only when
  `currentStep < 5`, never disabled) isn't found. The wizard never completes, so
  **no throwaway pending BIP is created.** (Mechanism unconfirmed — needs a CI
  trace; likely the per-step `saveDraftAction` / `motion` step-transition race.
  It is a *flake*, not deterministic: the author's run passed it.)
- `submission.spec.ts` test 3 (`withdraws pending BIP`, line 140-151) then does
  `getByRole('button', { name: /withdraw/i }).first()` on
  `/dashboard?status=pending` — it **withdraws whatever pending BIP is first.**
  The coordinator "my BIPs" list orders `updated_at` descending
  (`lib/queries/adminBips.ts:187`); "Data Ethics" was seeded after "ML" (higher
  `updated_at`) so it sorts first. **Test 3 withdraws the seeded "Data Ethics"
  BIP.** When test 1 succeeds, its just-created throwaway BIP is newest and gets
  withdrawn instead — a *shield*. Test 1 flaking removes the shield.
- **Failure #2:** `admin-review.spec.ts` "reject Data Ethics" → that BIP is no
  longer pending → card missing.
- **Failure #3:** "coordinator sees rejection reason" depends on #2.
- **Failure #4:** `bip-edits.spec.ts` "request changes new submission" (revived
  from `fixme` by `9bcccc7`) scavenges *any leftover* non-edit pending card
  (`bip-edits.spec.ts:406-410`). With ML approved and Data Ethics withdrawn, none
  remain.

`9bcccc7`'s `BipSubmissionWizard` change does **not** cause #1 — every new branch
is guarded by `mode === 'admin' || editMode`, both false on the normal coordinator
submit path. What the commit *did* add is #4's fragility (un-fixme'ing bip-edits)
and it exposed the latent withdraw coupling.

### Proposed fix
- **A (breaks the cascade — highest leverage):** make `submission.spec.ts`'s
  withdraw test self-contained so it can never touch a seeded admin-owned BIP.
  Seed a dedicated disposable pending BIP owned by the coordinator (e.g.
  `e2e-withdraw-target`, title "E2E Withdraw Target") and scope the withdraw to
  *that card's* article, not `.first()`. This makes admin-review immune to the
  wizard flake — #2/#3 can no longer be collateral damage.
- **B (fix #4's fragility):** seed a dedicated pending non-edit BIP for the
  bip-edits "request changes new submission" test and target it by title, instead
  of scavenging leftovers. (With A in place, extra coordinator-owned pending BIPs
  are safe from the withdraw test.)
- **C (the actual flake, #1):** investigate the Step-4 "Save & continue"
  stall with a CI trace/screenshot (`playwright-report` artifact). Until fixed,
  A+B contain the blast radius to a single isolated failure instead of four.

### Affected tests
`tests/e2e/submission.spec.ts` (#1 trigger, #3 shield-provider),
`tests/e2e/admin-review.spec.ts` (#2, #3 collateral),
`tests/e2e/bip-edits.spec.ts` (#4). Seed changes in `supabase/seed.e2e.sql`.

### Cannot verify locally
Diagnosed statically — this machine has no `docker`/`supabase`/`psql` (can't run
the `supabase start` + seed CI flow) and no `gh` (can't pull the CI trace). The
cascade (#2–#4) is well-grounded in code/seed; the Step-4 flake mechanism (#1) is
inferred. Fixes A/B need a CI push to confirm green.

### Resolution (2026-07-17)
- **A + B** shipped in `cb96157` (dedicated `e2e-withdraw-target` /
  `e2e-request-changes-target` fixtures) and merged to `main` via PR #1
  (`4adf687`), together with `e649c1c` which synced the cloud seed
  (`scripts/seed-cloud-e2e.mjs`) to `supabase/seed.e2e.sql` — the two seed files
  had drifted, so a fresh cloud re-seed was dropping the student, approved-edit,
  and BUG-002 fixtures. CI green: **38 passed / 2 skipped**.
- **C (the flake itself)** had **two** distinct causes, both fixed in
  `submission.spec.ts` (no app code changed):
  1. *First-navigation hydration race* — the `/dashboard` → `/dashboard/bips/new`
     `<Link>` click was swallowed during hydration (the client router
     intercepts + preventDefaults the anchor before `router.push` is wired), so
     the click succeeded but the URL never changed. Fixed with `clickUntil()`,
     which retries the **idempotent** navigation click until the URL changes
     (`toPass`) — an in-test resilience pattern, not a global `retries` bump
     (respects D-16).
  2. *Step-4 conflict-dialog block (root cause found via the CI trace)* — the
     "Save & continue" button triggers an optimistic-concurrency draft save, and
     a **1.5s debounced auto-save** (`BipSubmissionWizard`) fires on the same
     draft. When they overlap, the second save sends a stale `updated_at` and the
     wizard raises its **"Draft updated in another tab"** dialog, which overlays
     the step and blocks the next `.fill()` (30s timeout). The `advance()` helper
     now clicks the save button **exactly once** (retry-clicking it self-trips
     the guard) and, if the dialog appears, clicks "Overwrite with this version"
     and re-submits — our in-memory draft is authoritative in a single-user test.
  Verified against the cloud test project: submission spec 6/6, golden path 9/9
  across `--repeat-each 6`. The non-idempotent final title assertion was also
  hardened with `.first()`.
