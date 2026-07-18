---
phase: 06-saved-bips-sync
reviewed: 2026-06-15T00:00:00Z
depth: deep
files_reviewed: 21
files_reviewed_list:
  - supabase/migrations/00016_saved_bips.sql
  - lib/actions/saved-bips.ts
  - lib/queries/savedBips.ts
  - lib/schemas/saved-bips.ts
  - lib/legacy-bookmarks.ts
  - components/bip/SaveToggleIsland.tsx
  - components/bip/BipSaveButton.tsx
  - components/bip/BipCard.tsx
  - components/bip/BipGrid.tsx
  - components/bip/BipMobileApplyBar.tsx
  - components/bip/BipSidebar.tsx
  - components/home/RecentBips.tsx
  - components/student/LegacySweepIsland.tsx
  - app/(public)/bips/page.tsx
  - app/(public)/bip/[slug]/page.tsx
  - app/(public)/privacy/page.tsx
  - app/(student)/student-dashboard/page.tsx
  - app/(student)/student-dashboard/saved/page.tsx
  - lib/supabase/database.types.ts
  - tests/e2e/saved-bips.spec.ts
  - tests/schemas/saved-bips.test.ts
findings:
  critical: 1
  warning: 3
  info: 1
  total: 5
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-06-15
**Depth:** deep
**Files Reviewed:** 21
**Status:** issues_found

## Summary

Phase 6 implements server-side saved BIPs (STUD-04/05/06/07/08), a legacy localStorage sweep, and privacy-policy updates. The core security invariants from CLAUDE.md are all respected: `getClaims()` is used throughout, `await cookies()` flows through the existing `createClient()` factory, no admin client appears outside allowed paths, and `revalidatePath('/bips')` is deliberately absent from save/unsave actions. RLS is correctly enabled with own-only insert/select/delete policies and an intentionally absent UPDATE policy.

Four findings require attention before ship. The most urgent is a logic inversion in `getSavedBips` that silently hides query failures in development (where developers would catch them) while surfacing unhandled thrown errors in production (where they crash the saved page). The remaining three are a missing localStorage clear on migration failure, a dual-policy SELECT conflict that lets an admin's own rows match both policies (harmless but unnecessary surface), and a `migrated` count that over-reports when the upsert ignores already-saved rows.

---

## Critical Issues

### CR-01: getSavedBips error handling is inverted — crashes the saved page in production, silent in dev

**File:** `lib/queries/savedBips.ts:83-88`

**Issue:** The error branch reads:

```typescript
if (process.env.NODE_ENV !== 'production') {
  console.error('[getSavedBips] query failed, returning empty:', error)
  return []
}
throw error
```

The condition is backwards. In development (`NODE_ENV !== 'production'` is true) the function swallows the error and returns `[]`, hiding broken queries from developers who would most benefit from seeing them. In production (`NODE_ENV !== 'production'` is false) it throws, crashing `/student-dashboard/saved` with an unhandled RSC error because the caller in `saved/page.tsx` does not wrap the call in try/catch and there is no error boundary declared on that route segment. A transient Supabase outage or a broken join in the query would produce a full 500 for every student on the saved page.

The intended convention for dev-only noise suppression should be the reverse: swallow and log in production, throw in development so tests catch it.

**Fix:**
```typescript
if (error) {
  if (process.env.NODE_ENV === 'production') {
    // Transient DB error in production: return empty rather than crash the page.
    console.error('[getSavedBips] query failed, returning empty:', error.message)
    return []
  }
  throw error  // Surface immediately in development/CI
}
```

---

## Warnings

### WR-01: LegacySweepIsland clears localStorage before confirming migration success

**File:** `components/student/LegacySweepIsland.tsx:22-27`

**Issue:**
```typescript
migrateLegacyBookmarksAction(raw)
  .then(() => localStorage.removeItem(LEGACY_KEY))
  .catch(() => { /* best-effort: silent */ })
```

`migrateLegacyBookmarksAction` always resolves (it never rejects — all error paths return `{ migrated: 0, error: string }`), so the `.then()` fires even when the action returns `{ migrated: 0, error: 'Not authenticated.' }` or when the upsert fails. The legacy key is erased on any server response, including complete failures. If the user is momentarily unauthenticated (e.g., their session expired between page load and the effect running) the bookmarks are silently lost.

The action's return type carries an `error` field precisely so the caller can inspect it. The island should only clear the key when `result.error` is absent.

**Fix:**
```typescript
migrateLegacyBookmarksAction(raw)
  .then((result) => {
    if (!result.error) {
      localStorage.removeItem(LEGACY_KEY)
    }
  })
  .catch(() => { /* best-effort: silent */ })
```

### WR-02: migrateLegacyBookmarksAction returns an inflated migrated count on re-runs

**File:** `lib/actions/saved-bips.ts:122`

**Issue:** The function upserts with `ignoreDuplicates: true`, meaning rows that already exist are silently skipped. The function then returns `{ migrated: rows.length }` where `rows.length` is the number of IDs that passed UUID validation and exist in the `bips` table — not the number actually inserted. On a second call (e.g., if WR-01 were fixed but the sweep ran again for another reason), the count would still report the full batch size even though zero rows were written.

This is partly a spec question (D-02 says the sweep is best-effort), but it creates a misleading log/return value that could mask a re-entry bug. The upsert response does not expose an inserted count with `ignoreDuplicates`, so the correct return is either the batch size with a clear name like `attempted`, or — if callers ever use this value to gate further logic — a count that reflects actual inserts.

**Fix (minimal):** Rename the field to `attempted` in the return type and update the comment, so it is explicit that this is the number of valid IDs submitted, not necessarily new rows:
```typescript
return { migrated: rows.length }  // rows submitted to upsert; some may already exist
```
Or, if true insert count is needed, use `{ count: 'exact' }` in a post-insert select. For the current best-effort use case, renaming is sufficient.

### WR-03: Dual SELECT policies on saved_bips create an overlapping admin/own-row match for admin users who save BIPs

**File:** `supabase/migrations/00016_saved_bips.sql:32-51`

**Issue:** `saved_bips_select_own` allows any authenticated user whose `auth.uid()` matches `user_id`. `saved_bips_select_admin` allows any user whose JWT carries `app_metadata.role = 'admin'`. An admin who saves a BIP will match both policies simultaneously. This is not a security hole (Postgres OR-combines SELECT policies, so the result is still just their own rows), but it means the admin policy is partially redundant for admin users who are also the row owner.

The real concern is intent: if the admin SELECT policy is meant to let admins read *any* user's saved rows for support/audit purposes, the current predicate does allow that correctly. If it is only meant to let admins see their *own* saves (same as any user), then the admin policy is entirely redundant. The migration comment says "admin read" without clarifying scope. An unintended side-effect: coordinators and future roles that gain `app_metadata.role` values other than `admin` or `student` have no select policy and cannot read their own saved rows even if they save via the UI (the insert policy allows any authenticated user, but select falls through only to `saved_bips_select_own`, which does apply — so this is actually fine for the current role set, but fragile if a new role is added with a different `app_metadata.role` value).

**Fix:** Confirm the intended admin scope in a comment. If admins should be able to read all rows (e.g., for support), the policy is correct. If only own-rows, drop `saved_bips_select_admin` since `saved_bips_select_own` already covers it. At minimum add a clarifying comment in the SQL:
```sql
-- Allows admins to read ANY user's saved_bips row (support / audit use only).
-- Own-data access for admins is already covered by saved_bips_select_own above.
create policy "saved_bips_select_admin" ...
```

---

## Info

### IN-01: getSavedBips filters non-approved BIPs client-side after fetching them from the database

**File:** `lib/queries/savedBips.ts:94-104`

**Issue:** The PostgREST query fetches all `saved_bips` rows for the user (including the joined BIP rows), then discards non-approved BIPs in TypeScript after the round-trip. For a user with many saved BIPs that got de-approved, this wastes bandwidth and inflates the in-memory working set. Additionally, the `status` field is fetched as part of the BIP select but is not surfaced in `BipWithRelations`, requiring the `as { status?: string }` type cast in two places — a sign the type contract is leaking a DB concern.

The comment correctly notes this is intentional (D-03a / RESEARCH OQ1), so this is not a bug. But if the saved BIP count grows, adding `.eq('bips.status', 'approved')` as a PostgREST embedded filter would push the filter to the DB. Flagged for awareness, not immediate action.

---

_Reviewed: 2026-06-15_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
