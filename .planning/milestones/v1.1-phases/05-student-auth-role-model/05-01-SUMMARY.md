---
phase: 05-student-auth-role-model
plan: 01
subsystem: auth
tags: [jwt, postgres, rls, supabase, custom-access-token-hook, role-model]

requires:
  - phase: 01-discovery-foundation
    provides: profiles table, role model (coordinator/admin), bips RLS policies, app_metadata role mirror trigger
provides:
  - "profiles.role CHECK extended to ('coordinator','admin','student')"
  - "handle_new_user trigger materialising profiles row on auth.users INSERT (role whitelisted to coordinator/student)"
  - "Custom Access Token Hook (public.custom_access_token_hook) injecting role into JWT at issuance"
  - "Tightened bips_insert_coordinator RLS (role IN coordinator/admin) — FOUN-08"
  - "Role-stable profiles_update_own_or_admin RLS — FOUN-07"
  - "Belt-and-suspenders role assertion in submitBipAction"
  - "Migration 00015 applied to CLOUD project; database.types.ts regenerated from cloud"
affects: [05-02 middleware/callback, 05-03 student UI, 05-04 e2e tests, 06-saved-bips]

tech-stack:
  added: []
  patterns:
    - "Custom Access Token Hook for role-at-issuance (closes null-role JWT window)"
    - "Role whitelist in SECURITY DEFINER signup trigger (never trust client raw_user_meta_data for privileged roles)"
    - "Cloud-first schema apply: supabase db push + gen types --linked (replaces local docker workflow)"

key-files:
  created:
    - supabase/migrations/00015_student_role.sql
    - .planning/phases/05-student-auth-role-model/05-01-USER-SETUP.md
  modified:
    - supabase/config.toml
    - lib/actions/bip-submit.ts
    - lib/supabase/database.types.ts

key-decisions:
  - "Target CLOUD Supabase (zbvcpiwbopmfbjfhzprw), not local docker — per user direction mid-execution"
  - "handle_new_user role whitelisted to ('coordinator','student'); 'admin' can never be self-assigned at signup (security fix, T-05-06)"
  - "config.toml hook block configures LOCAL only; cloud requires Dashboard hook enablement (see USER-SETUP)"

patterns-established:
  - "Pattern: SECURITY DEFINER signup triggers must whitelist client-supplied role values, never coalesce them through"
  - "Pattern: schema changes apply to cloud via 'supabase db push'; types via 'supabase gen types --linked'"

requirements-completed: [FOUN-07, FOUN-08]

duration: ~30min
completed: 2026-06-15
---

# Phase 05 Plan 01: Student Role DB + Security Foundation Summary

**Student role added to the DB with a Custom Access Token Hook that mints the role into the first JWT, two RLS holes (self-escalation + BIP insert) closed, and a signup-trigger privilege-escalation hole fixed — applied to the cloud project.**

## Performance

- **Duration:** ~30 min (incl. mid-run redirect to cloud + security fix)
- **Completed:** 2026-06-15
- **Tasks:** 3 (+1 security deviation)
- **Files modified:** 5

## Accomplishments
- `00015_student_role.sql`: role CHECK → +student; `handle_new_user` trigger; `custom_access_token_hook`; tightened `bips_insert_coordinator` (FOUN-08); role-stable `profiles_update_own_or_admin` (FOUN-07).
- Custom Access Token Hook enabled in `config.toml` (local); belt-and-suspenders role assertion added to `submitBipAction`.
- Migration applied to the **cloud** project `zbvcpiwbopmfbjfhzprw` via `supabase db push`; `database.types.ts` regenerated from the cloud schema (`custom_access_token_hook` now in the Functions type surface).
- Closed a CRITICAL privilege-escalation hole the original trigger introduced (client-controlled `raw_user_meta_data.role` could mint an admin).

## Task Commits

1. **Task 1: Write migration 00015_student_role.sql** — `3fbf5c9` (feat)
2. **Task 2: Enable hook in config.toml + bip-submit role assertion** — `112f4ba` (feat)
3. **Security fix: whitelist self-serve roles in handle_new_user** — `0a08c2e` (fix)
4. **Task 3: Apply migration to cloud + regenerate types** — `4d9bcfb` (feat)

## Files Created/Modified
- `supabase/migrations/00015_student_role.sql` — full role-model + RLS migration (5 sections)
- `supabase/config.toml` — `[auth.hook.custom_access_token]` enabled (local config)
- `lib/actions/bip-submit.ts` — synchronous role assertion (D-12 belt-and-suspenders)
- `lib/supabase/database.types.ts` — regenerated from cloud schema
- `.planning/phases/05-student-auth-role-model/05-01-USER-SETUP.md` — cloud auth-hook enablement steps

## Decisions Made
- **Cloud target, not local docker.** The plan's Task 3 specified `supabase migration up --local` + docker exec verification. The repo is already linked to the cloud project (`supabase/.temp/project-ref`) and `.env.local` points the app at it, so per user direction the migration was pushed to cloud and types generated `--linked`.
- **Role whitelist (security).** See deviation below.

## Deviations from Plan

### Deviation 1 — Cloud apply instead of local docker (user-directed)
- **Found during:** Task 3.
- **Issue:** Plan Task 3 applied schema to local docker; user redirected to cloud Supabase.
- **Fix:** `supabase db push` (user ran it — entered DB password) applied 00015 to the linked cloud project; `supabase gen types typescript --linked` regenerated types. Docker verification (psql `\df`) was not run against cloud (no DB password in-session); existence is evidenced by a clean `db push` and the regenerated types containing `custom_access_token_hook`.
- **Impact:** Functionally equivalent outcome (live schema + types). Introduces a cloud-only manual step — see USER-SETUP.

### Deviation 2 — [Security/Critical] Role whitelist in handle_new_user
- **Found during:** Task 1 (flagged by automated commit security review).
- **Issue:** `coalesce(new.raw_user_meta_data ->> 'role', 'coordinator')` trusts client-controlled signup metadata — a signup with `data.role='admin'` would mint an admin account (privilege escalation, T-05-06).
- **Fix:** Whitelisted to `('coordinator','student')` via a `case` expression; any other value (incl. `admin`/garbage) falls through to the `coordinator` default. `admin` is grantable only via the `profiles_update_own_or_admin` admin branch (D-09).
- **Files modified:** `supabase/migrations/00015_student_role.sql`
- **Verification:** Migration applied to cloud cleanly; logic reviewed against threat T-05-06.
- **Committed in:** `0a08c2e`

---

**Total deviations:** 2 (1 user-directed redirect, 1 critical security auto-fix)
**Impact on plan:** Security fix is essential; cloud redirect changes the apply mechanism only. No scope creep.

## Issues Encountered
- `supabase`/`db push` cannot run non-interactively in-session (no cached access token / DB password). User ran `npx supabase db push` directly; type generation (`gen types --linked`) succeeded in-session.
- `npx tsc --noEmit` passes after type regeneration.

## User Setup Required

**The cloud Custom Access Token Hook must be enabled in the Supabase Dashboard.** The `[auth.hook.custom_access_token]` block in `config.toml` only configures *local* Supabase — `db push` creates the function but does not wire the hook on cloud. See [05-01-USER-SETUP.md](./05-01-USER-SETUP.md). Until enabled, new students' first JWT will not carry `app_metadata.role`.

## Next Phase Readiness
- Schema/types ready for 05-02 (middleware + callback read `app_metadata.role`).
- **Blocker for full runtime correctness:** cloud auth hook enablement (USER-SETUP) — required before student magic-link JWTs carry the role end-to-end.

---
*Phase: 05-student-auth-role-model*
*Completed: 2026-06-15*
