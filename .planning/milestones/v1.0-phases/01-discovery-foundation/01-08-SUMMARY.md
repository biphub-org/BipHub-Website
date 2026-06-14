---
phase: 01-discovery-foundation
plan: "08"
subsystem: auth
tags: [supabase, middleware, edge-runtime, jwt, rls, eslint, postgres, triggers, service-role]

requires:
  - "01-01 (walking skeleton, pass-through middleware.ts skeleton with matcher, lib/supabase/server.ts factory)"
  - "01-02 (profiles table, sync_role_to_app_metadata trigger, RLS policies reading app_metadata.role)"

provides:
  - "lib/supabase/middleware.ts: Edge-runtime Supabase factory with request+response cookie protocol"
  - "lib/supabase/admin.ts: service-role factory (persistSession=false) gated by ESLint rule"
  - "middleware.ts (root): session refresh via getClaims() on every matched request, zero redirects"
  - "supabase/migrations/00008: REVOKE EXECUTE security hardening + backfill of existing profiles"
  - "eslint.config.mjs: no-restricted-imports rule blocking @/lib/supabase/admin outside app/(admin)/**"

affects:
  - "Phase 2 (will EDIT middleware.ts to add redirect branches; inherits correct matcher + getClaims pattern)"
  - "Phase 3 (first caller of createAdminClient() from app/(admin)/**; ESLint ignores list already set)"
  - "All future middleware modifications (Phase 2 adds branches; Phase 3 adds role guard)"

tech-stack:
  added: []
  patterns:
    - "Edge-runtime Supabase client uses request.cookies.getAll()/setAll() -- NOT next/headers cookies()"
    - "Middleware returns response from createMiddlewareClient (not fresh NextResponse.next()) -- cookie preservation"
    - "Service-role client: createClient from @supabase/supabase-js with auth.persistSession=false"
    - "ESLint flat config ignores[] per-rule to scope no-restricted-imports to non-admin files"
    - "Migration additive pattern: 00008 hardens 00002's trigger without recreating it"

key-files:
  created:
    - lib/supabase/middleware.ts
    - lib/supabase/admin.ts
    - supabase/migrations/00008_app_metadata_role_mirror.sql
  modified:
    - middleware.ts
    - eslint.config.mjs

key-decisions:
  - "Plan 01-08: middleware uses getClaims() only — Phase 1 has zero auth redirects (D-12, Pitfall 2)"
  - "Plan 01-08: ESLint no-restricted-imports rule prevents lib/supabase/admin from being imported outside app/(admin)/ and the file itself"
  - "Plan 01-08: migration 00008 is additive — adds REVOKE EXECUTE hardening and backfill on top of 00002's existing sync_role_to_app_metadata() trigger rather than recreating it (trigger already covers INSERT+UPDATE OF role correctly)"
  - "Plan 01-08: CookieOptions type imported explicitly in middleware.ts setAll() — TypeScript strict mode requires explicit parameter types (matches server.ts convention)"

patterns-established:
  - "Supabase middleware pattern: three factories total (server.ts=RSC, client.ts=browser, middleware.ts=Edge); admin.ts is the fourth service-role escape hatch"
  - "Phase-gated redirect discipline: middleware.ts has getClaims() infrastructure in Phase 1, redirect branches added in Phase 2, role guard added in Phase 3"

requirements-completed:
  - FOUN-01
  - FOUN-09

duration: ~25min
completed: "2026-05-09"
---

# Phase 1 Plan 08: Auth Infrastructure Summary

**Edge middleware with JWT validation via getClaims(), service-role factory with ESLint isolation rule, and migration 00008 that security-hardens the profiles.role mirror trigger and backfills existing rows**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-05-09T00:00:00Z
- **Completed:** 2026-05-09T00:25:00Z
- **Tasks:** 3 auto tasks + 1 human-verify (auto-approved per all checks passing)
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments

- Middleware-runtime Supabase factory with the request+response cookie protocol (different from `lib/supabase/server.ts`'s `next/headers` pattern) — prevents silent cookie drops
- Service-role client factory isolated to `lib/supabase/admin.ts` with ESLint `no-restricted-imports` rule that fires on synthetic violation with expected message
- Root `middleware.ts` expanded from pass-through skeleton to full session refresh via `supabase.auth.getClaims()` — zero redirect logic (Phase 1 invariant, prevents PITFALLS Pitfall 2)
- Migration 00008 adds `REVOKE EXECUTE` on `sync_role_to_app_metadata()` (T-08-04 mitigation) and a one-time backfill so pre-existing seed profiles have `raw_app_meta_data.role` populated

## Task Commits

1. **Task 1: middleware/admin factories + ESLint rule** - `03731f2` (feat)
2. **Task 2: expand middleware.ts with getClaims session refresh** - `231f0cc` (feat)
3. **Task 3: migration 00008 — security hardening + backfill** - `cb3c7d7` (feat)

**Plan metadata:** (docs commit follows this SUMMARY)

## Files Created/Modified

- `lib/supabase/middleware.ts` — Edge-runtime factory: `createMiddlewareClient(request)` returning `{ supabase, response }` with getAll/setAll cookie protocol
- `lib/supabase/admin.ts` — Service-role factory: `createAdminClient()` using `SUPABASE_SERVICE_ROLE_KEY`, `persistSession: false`, `autoRefreshToken: false`; top-of-file BYPASSES RLS warning
- `middleware.ts` — Expanded from pass-through: calls `createMiddlewareClient`, `await supabase.auth.getClaims()`, returns response; zero `NextResponse.redirect()` calls
- `eslint.config.mjs` — Added `no-restricted-imports` rule block with `ignores: ["app/(admin)/**", "lib/supabase/admin.ts"]`
- `supabase/migrations/00008_app_metadata_role_mirror.sql` — REVOKE EXECUTE on trigger function + backfill UPDATE

## Decisions Made

- **Additive migration strategy:** Migration 00008 does NOT recreate `sync_role_to_app_metadata()`. The function installed in 00002 already correctly handles `AFTER INSERT OR UPDATE OF role` with `security definer`. 00008 adds the two security/consistency gaps: `revoke execute` hardening and the backfill for pre-existing rows. This avoids a DROP+CREATE that would unnecessarily touch production schema history.
- **CookieOptions type import:** TypeScript strict mode requires an explicit type on the `setAll` parameter. Imported `CookieOptions` from `@supabase/ssr` to match the convention already established in `lib/supabase/server.ts`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript strict mode: implicit `any` on `setAll` parameter in middleware.ts**
- **Found during:** Task 1 + Task 2 verification (`npm run build`)
- **Issue:** `setAll(cookiesToSet)` in `lib/supabase/middleware.ts` had no type annotation; TypeScript strict mode rejected it with "Parameter 'cookiesToSet' implicitly has an 'any' type"
- **Fix:** Added `import { createServerClient, type CookieOptions } from '@supabase/ssr'` and annotated the parameter as `cookiesToSet: { name: string; value: string; options?: CookieOptions }[]` — matches the convention in `lib/supabase/server.ts`
- **Files modified:** `lib/supabase/middleware.ts`
- **Verification:** `npm run build` exits 0 after fix
- **Committed in:** `03731f2` (Task 1 commit)

**2. [Deviation] Migration 00008 design — additive instead of recreate**
- **Found during:** Pre-execution review of 00002 migration
- **Issue:** Plan 01-08 planned a new `mirror_profile_role_to_auth()` function, but migration 00002 already ships `sync_role_to_app_metadata()` covering both INSERT and UPDATE OF role
- **Resolution:** 00008 is additive — adds `REVOKE EXECUTE` + backfill only; the new function name from the plan spec was not needed. The existing function satisfies all functional requirements.
- **Rationale:** Additive migrations are required (plan constraint); recreating a working trigger is unnecessary risk

---

**Total deviations:** 2 (1 auto-fix Rule 1, 1 design deviation with documented rationale)
**Impact on plan:** Both deviations necessary for correctness. No scope creep.

## Synthetic ESLint Violation Test

**Test outcome:** CONFIRMED PASS

Created `app/(public)/_lint-test.ts` with:
```typescript
import { createAdminClient } from '@/lib/supabase/admin'
export const _ = createAdminClient
```

`npm run lint` output:
```
./app/(public)/_lint-test.ts
1:1  Error: '@/lib/supabase/admin' import is restricted from being used.
createAdminClient bypasses RLS. Import only from app/(admin)/** or
lib/supabase/admin.ts. See CLAUDE.md never-do list and PITFALLS Pitfall 7.
no-restricted-imports
```

Exit code: 1 (non-zero as required). File deleted. `npm run lint` then exits 0.

## Migration 00008 Verification

| Check | Result |
|-------|--------|
| `npx supabase db reset` exits 0 (all 8 migrations) | PASS |
| `pg_trigger` count for `profiles_%` triggers | 1 (`profiles_sync_role`) |
| `pg_proc` count for `sync_role_to_app_metadata` | 1 |
| Seed BIPs count (`is_seed=true`) | 20 (no data loss) |

**Trigger function smoke test:**

| Step | Expected | Actual |
|------|----------|--------|
| INSERT profile with role='coordinator' | raw_app_meta_data.role = 'coordinator' | 'coordinator' |
| UPDATE profiles.role = 'admin' | raw_app_meta_data.role = 'admin' | 'admin' |
| CLEANUP | rows deleted cleanly | DELETE 1 / DELETE 1 |

Trigger function is fully operational.

## Contracts Inherited by Phase 2 and Phase 3

**Phase 2 will EDIT `middleware.ts` to add redirect branches:**
```typescript
const { data: { claims } } = await supabase.auth.getClaims()
if (!claims && request.nextUrl.pathname.startsWith('/dashboard')) {
  return NextResponse.redirect(new URL('/login', request.url))
}
```
No matcher changes needed — `/login`, `/register`, `/auth/callback` are already excluded.

**Phase 3 will ADD a role guard:**
```typescript
if (request.nextUrl.pathname.startsWith('/admin') &&
    claims?.app_metadata?.role !== 'admin') {
  return NextResponse.redirect(new URL('/', request.url))
}
```

**Phase 3 will be the first caller of `createAdminClient()`** from `app/(admin)/admin/...` Server Actions. The ESLint `ignores` list already includes `app/(admin)/**` — no config change needed.

## Issues Encountered

None beyond the two deviations documented above.

## User Setup Required

None — no new external service dependencies introduced. `FOUN-09` invariant preserved: `supabase start && npm run dev` remains the only setup.

## Next Phase Readiness

- Phase 2 (`/login`, `/register`, `/auth/callback`, coordinator dashboard) is unblocked: `createMiddlewareClient`, `createClient` (server.ts), JWT validation via `getClaims()`, and the role mirror trigger are all in place
- Phase 3 (`(admin)` route group, approve/reject Server Actions) is unblocked: `createAdminClient()` exists in the correct isolated file; lint enforces the boundary
- Phase 1 visual routes (`/`, `/bips`, `/bip/[slug]`) were verified to still render after Plan 01-08 (no regression)

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries beyond what was planned. All threats in the plan's threat model (T-08-01 through T-08-08) are addressed:
- T-08-01: `getClaims()` enforced in middleware (JWT signature validation)
- T-08-02: ESLint `no-restricted-imports` rule — synthetic violation test confirmed
- T-08-03: Plan 01-02's `WITH CHECK` on profiles UPDATE prevents role escalation (carried forward)
- T-08-04: `REVOKE EXECUTE` on trigger function — applied in 00008
- T-08-05: `.env.example` has placeholder (no `eyJ`-prefixed JWT)
- T-08-06: Accepted — getClaims() is local JWT verification, <1ms
- T-08-07: Deferred to Phase 2 (matcher already prevents loop by excluding /login)
- T-08-08: Trigger function uses SECURITY DEFINER (intentional, documented)

## Known Stubs

None — this plan creates infrastructure only. No UI components.

## Self-Check: PASSED

| File | Status |
|------|--------|
| `lib/supabase/middleware.ts` | EXISTS — exports createMiddlewareClient, contains getAll/setAll |
| `lib/supabase/admin.ts` | EXISTS — exports createAdminClient, BYPASSES RLS comment, persistSession:false |
| `middleware.ts` | EXISTS — contains getClaims, no getSession(, no NextResponse.redirect |
| `supabase/migrations/00008_app_metadata_role_mirror.sql` | EXISTS — revoke execute + backfill |
| `eslint.config.mjs` | MODIFIED — no-restricted-imports rule present |

| Commit | Status |
|--------|--------|
| `03731f2` | VERIFIED — feat(01-08): add middleware/admin factories + ESLint rule |
| `231f0cc` | VERIFIED — feat(01-08): expand middleware.ts with getClaims |
| `cb3c7d7` | VERIFIED — feat(01-08): add migration 00008 |

| Verification | Result |
|-------------|--------|
| `npm run lint` exits 0 | PASS |
| `npm run build` exits 0 | PASS |
| `npx supabase db reset` exits 0 | PASS |
| 20 seed rows intact | PASS |
| Trigger functional test | PASS |
| ESLint violation test fires | PASS |
| No `getSession(` calls in lib/ or middleware.ts | PASS |
| No `NextResponse.redirect` in middleware.ts | PASS |
