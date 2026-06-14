---
phase: 03-admin-review-emails
plan: 00
subsystem: testing
tags: [vitest, jsdom, vite-tsconfig-paths, testing-library, phase-3-infra]

# Dependency graph
requires:
  - phase: 02-coordinator-auth-submission
    provides: package.json baseline + tsconfig path alias `@/*`
provides:
  - Vitest 4.1.6 test runner installed as devDependency
  - vitest.config.ts with jsdom environment + tsconfigPaths plugin
  - tests/setup.ts shared mock/env reset
  - 4 test stub files covering state machine, admin Zod schemas, email send wrapper, and email templates
  - npm scripts: `test` (vitest run), `test:watch` (vitest)
  - 37 it.todo placeholders ready for downstream plans to fill in
affects: [03-01-state-machine, 03-03-approval-flow, 03-04-rejection-flow, 03-05-admin-notifications, all Phase 3 plans]

# Tech tracking
tech-stack:
  added:
    - vitest@4.1.6
    - "@vitejs/plugin-react@4.7.0"
    - "@testing-library/react@16.3.2"
    - jsdom@25.0.1
    - vite-tsconfig-paths@5.1.4
  patterns:
    - "Vitest config at project root (CJS-friendly default; no need for vitest.workspace.ts at this scale)"
    - "Shared tests/setup.ts wires vi.resetAllMocks + vi.unstubAllEnvs in afterEach (T-03-W0-01 mitigation)"
    - "it.todo for placeholder tests — keeps suite green while signalling intent; downstream plans replace with real assertions"
    - "Exact-pin versions for test deps (no ^) — mirrors @supabase/ssr beta pin pattern in CLAUDE.md"

key-files:
  created:
    - vitest.config.ts
    - tests/setup.ts
    - tests/utils/status-transitions.test.ts
    - tests/schemas/admin-bips.test.ts
    - tests/email/send.test.ts
    - tests/email/templates.test.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Pinned Vitest test deps to exact versions (no ^) to mirror @supabase/ssr beta pin pattern from CLAUDE.md — prevents silent minor-version drift in a still-young Vitest 4.x line"
  - "Used it.todo placeholders (not it.skip or empty describe blocks) — produces explicit `□ pending` output rows in vitest reporter, making the Phase 3 backlog visible at every test run"
  - "Did NOT wire @testing-library/jest-dom matchers in tests/setup.ts — Wave 0 stubs only need pure-function + Node-render assertions; downstream plans add matchers when DOM assertions are actually needed (avoids importing 50+ matchers eagerly)"
  - "Did NOT add a `typecheck` npm script even though plan <verification> listed `npm run typecheck` — project has no such script pre-existing; verified instead via `npx tsc --noEmit` (exit 0). Logged as Issue not Deviation since not introduced by this plan."

patterns-established:
  - "Test layout: tests/{utils,schemas,email}/*.test.ts mirroring lib/{utils,schemas,email}/ source tree"
  - "Test file header comment block documents: requirement IDs, threat IDs, mitigation, source doc references, which downstream plan fills it in"
  - "Wave 0 scaffolds the Nyquist-validation harness; subsequent plans only edit existing test files (no new test files in this phase)"

requirements-completed: []  # Wave 0 infrastructure plan — no functional ADMN-* requirements completed

# Metrics
duration: 6 min
completed: 2026-05-11
---

# Phase 03 Plan 00: Phase 3 test scaffolding Summary

**Vitest 4.1.6 + jsdom + tsconfigPaths installed; 4 test stub files (37 it.todo) scaffolded at canonical paths so downstream Phase 3 plans can attach `<automated>` verify commands per 03-VALIDATION.md.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-05-11T21:47:01Z
- **Completed:** 2026-05-11T21:53:22Z
- **Tasks:** 3 / 3
- **Files modified:** 8 (2 modified, 6 created)

## Accomplishments

- Vitest 4.1.6 installed as devDependency with `npm run test` script wired up
- `vitest.config.ts` resolves `@/*` aliases via `vite-tsconfig-paths` plugin and runs in jsdom environment
- 4 stub files (status-transitions, admin-bips schemas, email send, email templates) committed with exact `it.todo` counts matching plan acceptance criteria (10, 10, 5, 12 — total 37)
- `npx vitest run` exits 0 with `4 skipped (4)` files / `37 todo (37)` tests — Wave 0 gate cleared, downstream plans unblocked
- Test deps exact-pinned (no `^`) mirroring `@supabase/ssr` beta pin convention

## Task Commits

Each task was committed atomically on `worktree-agent-af76bdecfd8c8b9a9` branch:

1. **Task 1: Install Vitest + supporting devDependencies** — `6c094dd` (chore)
2. **Task 2: vitest.config.ts + tests/setup.ts** — `b44d058` (feat)
3. **Task 3: 4 test stub files for ADMN requirements** — `88b67fa` (test)

**Plan metadata:** (this SUMMARY commit — applied at the end of execution)

## Files Created/Modified

- `vitest.config.ts` (created) — jsdom env, globals, tsconfigPaths plugin, restricted include glob
- `tests/setup.ts` (created) — afterEach: `vi.resetAllMocks() + vi.unstubAllEnvs()`
- `tests/utils/status-transitions.test.ts` (created) — 10 `it.todo` for D-06 state machine (ADMN-03/04/08, T-03-03)
- `tests/schemas/admin-bips.test.ts` (created) — 10 `it.todo` for ApproveBipSchema + RejectBipSchema (ADMN-04, T-03-04)
- `tests/email/send.test.ts` (created) — 5 `it.todo` for sendEmail + D-15 console fallback (ADMN-09/10, T-03-05)
- `tests/email/templates.test.ts` (created) — 12 `it.todo` across ApprovalEmail/RejectionEmail/AdminNotificationEmail (ADMN-09, T-03-06)
- `package.json` (modified) — added 5 devDependencies (exact-pinned) + `test`/`test:watch` scripts
- `package-lock.json` (modified) — npm regenerated for 825 new transitive packages

## Decisions Made

1. **Exact-version pin for test deps** (no `^`) — rationale: Vitest 4.x is fresh (4.1.6 is < 60 days old) and `@vitejs/plugin-react`/`vite-tsconfig-paths` interplay with Vite 5/6 is still settling. Matches the CLAUDE.md `@supabase/ssr` beta pin convention.
2. **`it.todo` over `it.skip` or empty `describe`** — rationale: produces explicit `□ pending` rows in the reporter, making the Phase 3 backlog visible at every CI run; `it.skip` silently disappears.
3. **No `@testing-library/jest-dom` in setup.ts** — rationale: Wave 0 stubs target pure functions + Node-side `render()`; eager-importing 50+ matchers when none are used wastes ~50ms per test file boot. Downstream plans can add `import '@testing-library/jest-dom/vitest'` to `tests/setup.ts` (or a per-file setup) when DOM assertions are actually needed.
4. **No `typecheck` npm script added** — rationale: plan `<verification>` listed `npm run typecheck` but the project never had such a script. Adding it now would scope-creep into project tooling. Verified instead via `npx tsc --noEmit` (exit 0). Future infra task can add the script.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Pinned test deps to exact versions instead of `^`**
- **Found during:** Task 1 (after `npm install`)
- **Issue:** The plan's Task 1 action specifies `npm install -D vitest@^4 ...` (caret ranges), but the orchestrator-side execute-phase prompt mandated exact-version pins for Phase 3 test deps to mirror the CLAUDE.md `@supabase/ssr` pattern. `^` would allow silent minor drift in Vitest 4.x.
- **Fix:** Edited `package.json` `devDependencies` post-install to strip the `^` prefix from all 5 test deps (vitest, @vitejs/plugin-react, @testing-library/react, jsdom, vite-tsconfig-paths). Lockfile already pins exact resolved versions, so this is a manifest-only change.
- **Files modified:** package.json (devDependencies block)
- **Verification:** `node -e "JSON.parse(require('fs').readFileSync('package.json')).devDependencies.vitest"` returns `4.1.6` (no `^`).
- **Committed in:** `6c094dd` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical / convention compliance)
**Impact on plan:** Strictly tightening; no scope creep. The pin change is invisible to downstream plans and matches a CLAUDE.md project-wide convention.

## Issues Encountered

**1. Worktree absolute-path drift during first Edit/Write attempts**
- **Symptom:** My first round of `Edit` calls used the absolute path `C:\dev\Antigravity\BIP_project\package.json` (main repo) when I should have used the worktree absolute path `C:\dev\Antigravity\BIP_project\.claude\worktrees\agent-af76bdecfd8c8b9a9\package.json`. This is the exact #3099 worktree absolute-path drift scenario.
- **Detection:** `git diff` in the main repo showed my package.json edits had landed there instead of the worktree.
- **Recovery:** Ran `git checkout -- package.json` in the main repo to restore it; re-applied edits using the worktree absolute path. Verified main-repo `git status` shows no package.json changes (only the orchestrator-owned `.planning/STATE.md` edit, which is expected).
- **Impact on plan output:** Zero. All 3 task commits landed on the correct worktree branch; the main repo was left clean.
- **Future prevention:** When the agent runs inside a worktree, derive absolute paths from `git rev-parse --show-toplevel` rather than using project-root paths from CLAUDE.md.

**2. `npm run typecheck` does not exist**
- **Symptom:** Plan `<verification>` lists `npm run typecheck` but project has no such script.
- **Resolution:** Ran `npx tsc --noEmit` directly (exit 0). Decision logged in "Decisions Made" item #4 — not adding the script is scope-correct for this plan.

## User Setup Required

None — no external service configuration required for test infrastructure.

## Next Phase Readiness

**Ready for Plan 03-01 (state machine + admin Zod schemas):**
- `tests/utils/status-transitions.test.ts` exists with 10 `it.todo` slots — Plan 03-01 fills in real assertions when it creates `lib/utils/status-transitions.ts`.
- `tests/schemas/admin-bips.test.ts` exists with 10 `it.todo` slots — Plan 03-01 fills in when it creates `lib/schemas/admin-bips.ts`.
- `npx vitest run tests/utils/status-transitions.test.ts tests/schemas/admin-bips.test.ts` is the canonical `<automated>` command Plan 03-01 tasks will reference (per 03-VALIDATION.md row 03-01-T1).

**Ready for Plans 03-03 / 03-04 / 03-05 (email surfaces):**
- `tests/email/send.test.ts` + `tests/email/templates.test.ts` exist with 17 `it.todo` slots.

**No blockers.** The hard Wave 0 gate (`npx vitest run` exits 0) is cleared; Phase 3 can proceed.

## Verification Snapshot

| Check | Command | Result |
|-------|---------|--------|
| Vitest installed | `npx vitest --version` | `vitest/4.1.6 win32-x64 node-v22.18.0` |
| Suite exits 0 | `npx vitest run` | EXIT=0, `4 skipped (4)` files, `37 todo (37)` |
| `it.todo` counts | `grep -c it.todo tests/{utils,schemas,email}/*.test.ts` | 10 / 10 / 5 / 12 (total 37) |
| ESLint clean | `npm run lint` | exit 0, `✔ No ESLint warnings or errors` |
| TypeScript clean | `npx tsc --noEmit` | exit 0 |
| Config has jsdom | `grep "environment: 'jsdom'" vitest.config.ts` | match |
| Config has tsconfigPaths | `grep "tsconfigPaths()" vitest.config.ts` | match |

---
*Phase: 03-admin-review-emails*
*Plan: 00*
*Completed: 2026-05-11*

## Self-Check: PASSED

- [x] `vitest.config.ts` exists on disk (verified via `ls -la`)
- [x] `tests/setup.ts` exists on disk
- [x] `tests/utils/status-transitions.test.ts` exists with 10 `it.todo` lines
- [x] `tests/schemas/admin-bips.test.ts` exists with 10 `it.todo` lines
- [x] `tests/email/send.test.ts` exists with 5 `it.todo` lines
- [x] `tests/email/templates.test.ts` exists with 12 `it.todo` lines
- [x] Commit `6c094dd` (chore: install vitest) exists in `git log`
- [x] Commit `b44d058` (feat: scaffold vitest config) exists in `git log`
- [x] Commit `88b67fa` (test: scaffold 4 stub files) exists in `git log`
- [x] `npx vitest run` exits 0 (plan-level hard-blocker gate cleared)
- [x] `npm run lint` exits 0
- [x] `npx tsc --noEmit` exits 0
