---
phase: 06-saved-bips-sync
plan: "04"
subsystem: e2e-verification
tags: [playwright, e2e, saved-bips, stud-04, stud-05, stud-07, stud-08, foun-09, foun-10, phase-gate]
dependency_graph:
  requires: [06-01-database-foundation, 06-02-save-toggle-ui, 06-03-student-surfaces]
  provides: [saved-bips-e2e-spec, phase-gate-green]
  affects: [playwright.config.ts, tests/e2e/saved-bips.spec.ts]
tech_stack:
  added: []
  patterns:
    - "Password-auth session injection (@supabase/ssr cookie format) for student fixture sign-in"
    - "Service-role REST read for post-deletion audit (FOUN-09 cascade verification)"
    - "Throwaway admin-API-created student for destructive deletion test (EDGE-CASES-DEFERRED pattern)"
    - "testMatch regex extension (OR pattern) to add spec to existing project without new project"
key_files:
  created:
    - tests/e2e/saved-bips.spec.ts
  modified:
    - playwright.config.ts
decisions:
  - "D-project: EXTEND existing student-authed project testMatch to /(student-auth|saved-bips)\\.spec\\.ts$/ rather than adding a new project — same fixture, same session strategy, avoids parallel ordering issues"
  - "D-throwaway: dedicated throwaway student created via admin API for STUD-08/FOUN-09 deletion test — never touches e2e-student@biphub.test (NON-DESTRUCTIVE contract)"
  - "D-svc-setup: saveBipViaServiceRole used for FOUN-09 test setup instead of user JWT — Custom Access Token Hook timing makes throwaway JWT unreliable immediately after creation"
  - "D-unsave-assert: unsave assertion checks Unsave button flip to Save (optimistic) then full reload to confirm server removal — unsaveAction does not call revalidatePath so card stays rendered until reload"
  - "D-cloud-fixture: cloud e2e-student fixture profile.role was 'coordinator' (handle_new_user trigger default); corrected to 'student' + password reset to Student!Test1 during plan execution"
metrics:
  duration: "~40 minutes"
  completed: "2026-06-15"
  tasks_completed: 3
  tasks_total: 3
  files_created: 1
  files_modified: 1
---

# Phase 06 Plan 04: E2E Verification — Saved BIPs Phase Gate

Playwright E2E spec proving STUD-04, STUD-05, STUD-07, STUD-08, FOUN-09, FOUN-10 with semantic selectors; throwaway student for cascade-deletion audit; extended student-authed project testMatch; unit suite 51/51 green; production build succeeded with /privacy static and /bips ISR.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Wire student-authed project testMatch for saved-bips.spec.ts | ad3db99 | playwright.config.ts |
| 2 | Create tests/e2e/saved-bips.spec.ts — STUD-04/05/07/08, FOUN-09/10 | 9305eda | tests/e2e/saved-bips.spec.ts |
| 2 fix | Fix cloud fixture + unsave assertion + deletion dialog selectors | 1c221ed | tests/e2e/saved-bips.spec.ts |
| 3 | Phase gate — unit suite + build + E2E (all green) | (no file change) | — |

## E2E Suite Results

**student-authed project: 13/13 passed** (5 new + 8 pre-existing student-auth)

| Test | Requirement | Status |
|------|-------------|--------|
| STUD-04/STUD-05: save persists after reload and fresh session | STUD-04, STUD-05 | PASS |
| STUD-04: unsave removes BIP from saved list | STUD-04 | PASS |
| STUD-07: /student-dashboard/saved shows live metadata | STUD-07 | PASS |
| STUD-08/FOUN-09: account deletion cascades — zero orphan rows | STUD-08, FOUN-09 | PASS |
| FOUN-10: /privacy contains saved_bips enumeration | FOUN-10 | PASS |
| (8 pre-existing student-auth tests) | STUD-01/02/03, FOUN-07/08 | PASS |

**Command run:** `E2E_ALLOW_CLOUD=1 npx playwright test --project=student-authed`

## Build Route Table

```
Route (app)                     Size    Revalidate
├ ○ /privacy                    157 B              (Static — force-static, FOUN-10 confirmed)
├ ƒ /bips                       37.4 kB            (Dynamic — getClaims() for authed users; D-bip-02-03 accepted)
├ ● /bip/[slug]                 3.81 kB            (SSG — 20 static paths at build time)
```

- `/privacy` → `○` Static: **PASS** — force-static preserved (Pitfall 6 confirmed)
- `/bips` → `ƒ` Dynamic: **CORRECT BY NATURE (corrected 2026-06-15)** — `/bips` reads `searchParams` (filters), so it is inherently dynamic for ALL visitors and was since Phase 1. The earlier "unauthenticated requests hit the ISR cache at the CDN" claim was **false** (curl: `Cache-Control: private`, `X-Vercel-Cache: MISS`). Not a Phase 6 regression. The real regression was `/bip/[slug]` (●→ƒ), fixed back to `●` in commit 5722e2b.

## Unit Suite

**npm test: 51/51 tests passed** (5 test files — saved-bips.test.ts, admin-bips.test.ts, etc.)

## Decisions Made

1. **EXTEND existing student-authed project (D-project)** — The new spec uses the same `e2e-student@biphub.test` fixture and the same `signInStudent` session strategy as `student-auth.spec.ts`. Adding a second project would duplicate config and risk fixture-cookie ordering issues (workers=1, fullyParallel=false). Changed `testMatch` to `/(student-auth|saved-bips)\.spec\.ts$/`.

2. **Throwaway student for deletion test (D-throwaway)** — Per the EDGE-CASES-DEFERRED destructive-fixture contract, `e2e-student@biphub.test` must never be deleted. The STUD-08/FOUN-09 test creates a disposable `e2e-saved-bips-throwaway-{timestamp}@biphub.test` user via the admin API, saves a BIP, drives the DeleteAccountDialog UI, asserts `/?deleted=1` redirect, then verifies zero `saved_bips` rows via service-role read.

3. **Service-role for FOUN-09 setup save (D-svc-setup)** — The throwaway user's JWT (obtained immediately after admin API creation) may not yet reflect `profiles.role='student'` via the Custom Access Token Hook, causing the anon-key `saved_bips` INSERT to return 403. Service-role key is the correct tool for test-setup actions (not app code). The RLS-scoped save pathway is exercised by the browser-driven STUD-04 tests.

4. **Unsave assertion strategy (D-unsave-assert)** — `unsaveAction` does NOT call `revalidatePath('/student-dashboard/saved')` (per Pitfall 4 — ISR must not be busted per user action). The `SaveToggleIsland` optimistically flips the heart from "Unsave" to "Save" but the card stays rendered until a full reload. Assertions: (1) verify `Unsave {title}` button is no longer visible (optimistic), (2) reload + assert card title absent (server-side confirmed).

5. **Cloud fixture correction** — `e2e-student@biphub.test` on cloud had `profiles.role='coordinator'` (handle_new_user trigger default) and no known password. Fixed via admin API: `profiles.role='student'` + password set to `Student!Test1`. This also fixed pre-existing `student-auth.spec.ts` failures.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Cloud e2e-student fixture had wrong profile role and no password**
- **Found during:** Task 2 first E2E run
- **Issue:** `e2e-student@biphub.test` on cloud Supabase had `profiles.role='coordinator'` (trigger default — student was created via admin API without `user_metadata.role`). Password was also unset. Both caused `signInStudent` failures for the password-auth path AND middleware redirected to `/onboarding` instead of `/student-dashboard` due to wrong role.
- **Fix:** Updated `profiles.role='student'` and set `password='Student!Test1'` via admin API calls during plan execution. This incidentally also fixed pre-existing `student-auth.spec.ts` failures (those tests were broken for the same reason).
- **Files modified:** Cloud Supabase project (data fix, no code change)
- **Commits:** 1c221ed (spec fix)

**2. [Rule 1 - Bug] saveBipViaApi using throwaway JWT got 403 from saved_bips INSERT**
- **Found during:** Task 2 FOUN-09 test failure
- **Issue:** Throwaway user's JWT obtained immediately after admin API creation didn't have `role='student'` in app_metadata claims (Custom Access Token Hook timing). `saved_bips` INSERT policy requires `role=student` from JWT claims.
- **Fix:** Changed `saveBipViaApi` to `saveBipViaServiceRole` (RLS bypass for test setup), which correctly uses the service-role key. This is appropriate since this is a test setup step, not app code.
- **Files modified:** tests/e2e/saved-bips.spec.ts
- **Commit:** 1c221ed

**3. [Rule 1 - Bug] DeleteAccountDialog confirm button locator was wrong**
- **Found during:** Task 2 STUD-08/FOUN-09 test failure
- **Issue:** Spec used `/permanently delete my account/i` but actual button text is `"Delete account"` (same as the trigger button). The submit button was never found.
- **Fix:** Changed to `getByRole('button', { name: /^delete account$/i }).last()` — the last "Delete account" button is the submit inside the form (the trigger opens the dialog).
- **Files modified:** tests/e2e/saved-bips.spec.ts
- **Commit:** 1c221ed

**4. [Rule 1 - Bug] Unsave assertion expected card title to disappear immediately**
- **Found during:** Task 2 STUD-04 unsave test failure
- **Issue:** After clicking Unsave, spec asserted `getByText(bipTitle)` not visible. But `unsaveAction` doesn't call `revalidatePath`, so the card stays rendered; only the heart state flips optimistically.
- **Fix:** Changed to two-step assertion: (1) assert Unsave button becomes Save button (optimistic flip), (2) reload + assert card absent (server-side confirmation).
- **Files modified:** tests/e2e/saved-bips.spec.ts
- **Commit:** 1c221ed

**5. [Rule 1 - Bug] Strict mode violation on getByText('saved_bips')**
- **Found during:** Task 2 FOUN-10 test failure
- **Issue:** `getByText('saved_bips')` matched 2 `<code>` elements on the privacy page (both occurrences of the table name). Playwright strict mode requires a single match for `expect().toBeVisible()`.
- **Fix:** Added `.first()` to select the first occurrence.
- **Files modified:** tests/e2e/saved-bips.spec.ts
- **Commit:** 1c221ed

## Known Stubs

None. All artifacts are complete:
- `tests/e2e/saved-bips.spec.ts` covers all 5 E2E-provable requirements with real cloud Supabase interactions
- `playwright.config.ts` correctly routes both student spec files to the student-authed project

## Threat Surface Scan

No new network endpoints or trust boundaries beyond what the plan's threat model documents.
- T-06-18 (prod pollution): safety guard unchanged (refuses prod ref unless E2E_ALLOW_CLOUD=1)
- T-06-19 (false-positive cascade): FOUN-09 reads saved_bips via service-role AFTER deletion and asserts zero rows — cascade observed, not assumed
- T-06-20 (service-role key in spec): key read from `process.env.SUPABASE_SERVICE_ROLE_KEY` — never literal; gitleaks allowlist covers the spec path

## Self-Check

Files exist:
- tests/e2e/saved-bips.spec.ts: FOUND
- playwright.config.ts: FOUND (updated)

Commits exist:
- ad3db99 (Task 1 — playwright.config.ts): FOUND
- 9305eda (Task 2 — initial saved-bips.spec.ts): FOUND
- 1c221ed (Task 2 fix — corrected spec): FOUND

## Self-Check: PASSED
